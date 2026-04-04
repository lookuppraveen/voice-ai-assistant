'use client';

import { useCallback, useRef, useState, useEffect, Suspense } from 'react';
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
  const [autoListen,    setAutoListen]    = useState(true);

  // Use a ref so the async loop always reads the latest value, not a stale closure
  const autoListenRef = useRef(true);
  const stopLoopRef   = useRef(false);          // set to true to break the auto loop

  const syncAutoListen = (val: boolean) => {
    setAutoListen(val);
    autoListenRef.current = val;
    if (!val) stopLoopRef.current = true;       // signal the running loop to stop
  };

  // ── Countdown display ────────────────────────────────────────────────────────
  const [countdown, setCountdown] = useState(0);
  const turnInProgressRef = useRef(false);
  const [isTurnActive, setIsTurnActive] = useState(false); // Used for UI only

  const runCountdown = async (seconds: number) => {
    for (let i = seconds; i > 0; i--) {
      setCountdown(i);
      await sleep(1000);
    }
    setCountdown(0);
  };

  // ── Core turn handler ────────────────────────────────────────────────────────
  const doTurn = useCallback(async () => {
    if (stopLoopRef.current || turnInProgressRef.current) return;
    
    turnInProgressRef.current = true;
    setIsTurnActive(true);
    console.log('Turn: Starting turn...');
    try {
      const audioBlob = await audio.startListening(autoListenRef.current);
      if (!audioBlob || stopLoopRef.current) {
        console.log('Turn: No audio captured or turn stopped.');
        return;
      }

      console.log('Turn: Sending audio to AI...');
      const aiText = await session.sendAudioTurn(audioBlob);
      if (!aiText || stopLoopRef.current) return;

      // Apply response delay with countdown (respected after backend returns)
      if (responseDelay > 0 && !stopLoopRef.current) {
        await runCountdown(responseDelay);
      }

      if (stopLoopRef.current) return;

      console.log('Turn: AI speaking...');
      await audio.speakText(aiText);
      console.log('Turn: AI finished speaking.');
    } catch (e) {
      console.error('Turn error:', e);
    } finally {
      setIsTurnActive(false);
      turnInProgressRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio, session, responseDelay]);

  // ── Auto-listen Loop (The "React Way") ──────────────────────────────────────
  const isBusy = audio.isProcessing || session.isLoading || audio.isSpeaking || isTurnActive;

  useEffect(() => {
    // Only trigger if we are in auto-conversation mode and not currently busy
    if (autoListen && !isBusy && countdown === 0 && session.status === 'in_progress' && !audio.isListening) {
      const timer = setTimeout(() => {
        if (autoListenRef.current && !stopLoopRef.current && !turnInProgressRef.current) {
          doTurn();
        }
      }, 500); // Super-fast (0.5s) hand-off
      return () => clearTimeout(timer);
    }
  }, [autoListen, isBusy, countdown, session.status, audio.isListening, doTurn]);

  // ── Start session ────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    stopLoopRef.current = false;
    const openingText = await session.startSession(topicId);
    if (openingText) {
      if (responseDelay > 0) await runCountdown(responseDelay);
      await audio.speakText(openingText);
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

        <div className="w-24" />
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

            {/* Bottom Controls Area */}
            <div className="flex flex-col items-center gap-6 mt-2">
              {/* Recorder — hidden/dimmed in auto-listen mode */}
              <div className={`transition-all duration-300 ${autoListen ? 'opacity-30 scale-95 pointer-events-none' : 'opacity-100'}`}>
                <VoiceRecorder
                  listenState={audio.listenState}
                  volume={audio.volume}
                  onStart={handleManualListen}
                  onStop={audio.stopListening}
                  disabled={session.status !== 'in_progress' || isBusy || autoListen}
                />
              </div>

              {/* Action Buttons Toolbar */}
              {session.status === 'in_progress' && (
                <div className="flex items-center gap-4 bg-gray-800/50 p-2 rounded-2xl border border-gray-700/50 backdrop-blur-sm shadow-xl">
                  {/* Auto-listen toggle */}
                  <button
                    onClick={() => syncAutoListen(!autoListen)}
                    title={autoListen ? 'Auto-listen ON — click to disable' : 'Auto-listen OFF — click to enable'}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                      autoListen
                        ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'bg-gray-700/50 border-gray-600/50 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Repeat className={`h-4 w-4 ${autoListen ? 'animate-spin-slow' : ''}`} />
                    <span>{autoListen ? 'Auto: ON' : 'Auto: OFF'}</span>
                  </button>

                  <div className="w-px h-6 bg-gray-700/50" />

                  {/* End Session Button */}
                  <button
                    onClick={handleEndSession}
                    disabled={session.isLoading && !isBusy}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200"
                  >
                    {session.isLoading && !isBusy ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <StopCircle className="h-4 w-4" />
                    )}
                    <span>End & Score</span>
                  </button>
                </div>
              )}
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
