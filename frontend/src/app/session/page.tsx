'use client';

import { useCallback, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useAudio } from '@/hooks/useAudio';
import { ConversationPanel } from '@/components/session/ConversationPanel';
import { VoiceRecorder } from '@/components/session/VoiceRecorder';
import { ScoreCard } from '@/components/session/ScoreCard';
import Button from '@/components/ui/Button';
import { ArrowLeft, StopCircle, Volume2, Brain, Repeat, Clock, Mic } from 'lucide-react';

const DELAY_OPTIONS = [
  { label: 'Instant',    value: 0 },
  { label: '2 seconds',  value: 2 },
  { label: '5 seconds',  value: 5 },
];

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topic_id') || '';

  const session = useSession();
  const audio   = useAudio();

  // ── Settings (chosen before start) ──────────────────────────────────────────
  const [responseDelay, setResponseDelay] = useState(0);
  const [autoListen,    setAutoListen]    = useState(false);

  // Use a ref so the async loop always reads the latest value, not a stale closure
  const autoListenRef = useRef(false);
  const stopLoopRef   = useRef(false);          // set to true to break the auto loop

  const syncAutoListen = (val: boolean) => {
    setAutoListen(val);
    autoListenRef.current = val;
    if (!val) stopLoopRef.current = true;       // signal the running loop to stop
  };

  // ── Countdown display ────────────────────────────────────────────────────────
  const [countdown, setCountdown] = useState(0);

  const runCountdown = async (seconds: number) => {
    for (let i = seconds; i > 0; i--) {
      setCountdown(i);
      await sleep(1000);
    }
    setCountdown(0);
  };

  // ── Core turn handler ────────────────────────────────────────────────────────
  const doTurn = useCallback(async () => {
    try {
      const audioBlob = await audio.startListening(autoListenRef.current);
      if (!audioBlob) {
        // If the mic stopped because of no-speech timeout but Auto-listen is still ON,
        // we restart the listener. We must wait at least 1500ms, otherwise Chrome thinks we are
        // abusing the microphone API and will completely lock it silently.
        if (autoListenRef.current && !stopLoopRef.current) {
          setTimeout(doTurn, 1500);
        }
        return;
      }

      const aiText = await session.sendAudioTurn(audioBlob);
      if (!aiText) {
        if (autoListenRef.current && !stopLoopRef.current) {
          setTimeout(doTurn, 3000);
        }
        return;
      }

      // Apply response delay with countdown
      if (responseDelay > 0) await runCountdown(responseDelay);

      await audio.speakText(aiText);

      // Auto-listen loop: keep going until toggled off or session ends
      if (autoListenRef.current && !stopLoopRef.current) {
        doTurn();
      }
    } catch (e) {
      // If a mic error happens, try to gracefully recover so auto-listen doesn't die forever
      if (autoListenRef.current && !stopLoopRef.current) {
        setTimeout(doTurn, 1000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio, session, responseDelay]);

  // ── Start session ────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    stopLoopRef.current = false;
    const openingText = await session.startSession(topicId);
    if (openingText) {
      if (responseDelay > 0) await runCountdown(responseDelay);
      await audio.speakText(openingText);
      // Kick off auto-listen right after opening if enabled
      if (autoListenRef.current) doTurn();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, audio, topicId, responseDelay]);

  const handleManualListen = useCallback(() => {
    stopLoopRef.current = false;
    doTurn();
  }, [doTurn]);

  const handleEndSession = useCallback(async () => {
    stopLoopRef.current = true;
    autoListenRef.current = false;
    setAutoListen(false);
    audio.stopListening();
    audio.stopSpeaking();
    await session.completeSession();
  }, [audio, session]);

  // ── Completed ────────────────────────────────────────────────────────────────
  if (session.status === 'completed' && session.evaluation) {
    return (
      <div className="min-h-screen bg-gray-950">
        <nav className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-white/5 px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </button>
            <span className="text-white font-semibold text-sm">Session Complete</span>
            <Button size="sm" variant="secondary" onClick={() => session.reset()}>
              Try Again
            </Button>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
            <ScoreCard
              evaluation={session.evaluation}
              messages={session.messages}
              scenarioType="Custom Topic"
            />
        </main>
      </div>
    );
  }

  const isBusy = audio.isProcessing || session.isLoading || audio.isSpeaking;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <Button
          variant="ghost" size="sm"
          className="text-gray-300 hover:text-white"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Exit
        </Button>

        <div className="text-center">
          <p className="text-white font-semibold capitalize">
            Custom Session
          </p>
          <p className="text-gray-400 text-xs">{session.messages.length} turns</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-listen toggle (only visible during session) */}
          {session.status === 'in_progress' && (
            <button
              onClick={() => syncAutoListen(!autoListen)}
              title={autoListen ? 'Auto-listen ON — click to disable' : 'Auto-listen OFF — click to enable'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                autoListen
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{autoListen ? 'Auto: ON' : 'Auto: OFF'}</span>
            </button>
          )}

          {session.status === 'in_progress' ? (
            <Button size="sm" variant="danger" onClick={handleEndSession} loading={session.isLoading && !isBusy}>
              <StopCircle className="h-4 w-4 mr-1" /> End & Score
            </Button>
          ) : (
            <div className="w-24" />
          )}
        </div>
      </div>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6">

        {session.status === 'idle' ? (

          /* ── Start / Settings screen ──────────────────────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center gap-5">

            <div className="p-8 bg-gray-800 rounded-2xl max-w-sm w-full text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Train?</h2>
              <p className="text-gray-400 mb-2 text-sm">Speak naturally with your AI prospect.</p>
              <p className="text-gray-500 text-xs mb-6">
                Uses your browser&apos;s built-in speech recognition — works best in Chrome or Edge.
              </p>

              {/* Response delay */}
              <div className="mb-5 text-left">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  <Clock className="h-3.5 w-3.5" /> AI Response Delay
                </label>
                <div className="flex gap-2">
                  {DELAY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setResponseDelay(opt.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                        responseDelay === opt.value
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-gray-500 text-xs mt-1.5">
                  {responseDelay === 0
                    ? 'AI replies immediately after you speak.'
                    : `AI waits ${responseDelay}s before replying — simulates realistic pacing.`}
                </p>
              </div>

              {/* Auto-listen toggle */}
              <div className="mb-6 text-left">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  <Mic className="h-3.5 w-3.5" /> Conversation Mode
                </label>
                <button
                  onClick={() => syncAutoListen(!autoListen)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                    autoListen
                      ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {autoListen ? 'Auto-listen enabled' : 'Manual (press button each turn)'}
                  </span>
                  <div className={`relative h-5 w-9 rounded-full transition-colors ${autoListen ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${autoListen ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </button>
                <p className="text-gray-500 text-xs mt-1.5">
                  {autoListen
                    ? 'Hands-free — mic activates automatically after each AI response.'
                    : 'Press the mic button to speak each turn.'}
                </p>
              </div>

              <Button size="lg" className="w-full" onClick={handleStart} loading={session.isLoading}>
                Start Session
              </Button>
            </div>
          </div>

        ) : (

          /* ── Active session ───────────────────────────────────────────────── */
          <>
            <div className="flex-1 bg-gray-800 rounded-xl p-4 mb-4 overflow-hidden" style={{ height: '400px' }}>
              <ConversationPanel messages={session.messages} />
            </div>

            {/* Errors */}
            {(session.error || audio.error) && (
              <div className="mb-3 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">
                {session.error || audio.error}
              </div>
            )}

            {/* Status bar */}
            <div className="mb-3 h-6 flex items-center justify-center gap-4">
              {countdown > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-orange-300 font-semibold">
                  <Clock className="h-4 w-4" /> AI responding in {countdown}s…
                </span>
              )}
              {audio.isSpeaking && countdown === 0 && (
                <span className="flex items-center gap-1.5 text-sm text-blue-300 animate-pulse">
                  <Volume2 className="h-4 w-4" /> Prospect speaking...
                </span>
              )}
              {session.isLoading && !audio.isSpeaking && countdown === 0 && (
                <span className="flex items-center gap-1.5 text-sm text-yellow-300 animate-pulse">
                  <Brain className="h-4 w-4" /> AI thinking...
                </span>
              )}
              {audio.isListening && (
                <span className="flex items-center gap-1.5 text-sm text-green-300">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  Listening…
                </span>
              )}
              {autoListen && !isBusy && !audio.isListening && countdown === 0 && session.status === 'in_progress' && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <Repeat className="h-3.5 w-3.5" /> Auto-listen active
                </span>
              )}
            </div>

            {/* Recorder — hidden in auto-listen mode but still rendered */}
            <div className={`flex justify-center transition-opacity ${autoListen ? 'opacity-40 pointer-events-none' : ''}`}>
              <VoiceRecorder
                listenState={audio.listenState}
                onStart={handleManualListen}
                onStop={audio.stopListening}
                disabled={session.status !== 'in_progress' || isBusy || autoListen}
              />
            </div>

            {autoListen && (
              <p className="text-center text-xs text-emerald-400 mt-2">
                Hands-free mode — mic activates automatically
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
