'use client';

import { useCallback, useRef, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useAudio } from '@/hooks/useAudio';
import { ConversationPanel } from '@/components/session/ConversationPanel';
import { VoiceRecorder } from '@/components/session/VoiceRecorder';
import { ScoreCard } from '@/components/session/ScoreCard';
import Button from '@/components/ui/Button';
import { ArrowLeft, StopCircle, Volume2, Brain, Repeat, Clock, Mic, AlertCircle } from 'lucide-react';

const DELAY_OPTIONS = [
  { label: 'Instant',   value: 0 },
  { label: '2 seconds', value: 2 },
  { label: '5 seconds', value: 5 },
];

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

// ─────────────────────────────────────────────────────────────────────────────
function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topic_id') || '';

  const session = useSession();
  const audio = useAudio();

  // ── Settings ──────────────────────────────────────────────────────────────
  const [responseDelay, setResponseDelay] = useState(0);
  const [autoListen, setAutoListen] = useState(true);

  // Refs so async callbacks always see the latest value (no stale closures)
  const autoListenRef = useRef(true);
  const stopLoopRef   = useRef(false);
  const turnInProgressRef = useRef(false);

  const syncAutoListen = (val: boolean) => {
    setAutoListen(val);
    autoListenRef.current = val;
    if (!val) stopLoopRef.current = true;   // signal the running loop to stop
  };

  // ── Countdown display ─────────────────────────────────────────────────────
  const [countdown, setCountdown] = useState(0);
  const countdownActiveRef = useRef(false);

  const runCountdown = async (seconds: number) => {
    countdownActiveRef.current = true;
    for (let i = seconds; i > 0; i--) {
      if (stopLoopRef.current) break;
      setCountdown(i);
      await sleep(1000);
    }
    setCountdown(0);
    countdownActiveRef.current = false;
  };

  // ── Core turn handler ─────────────────────────────────────────────────────
  const doTurn = useCallback(async () => {
    if (stopLoopRef.current || turnInProgressRef.current) return;

    turnInProgressRef.current = true;
    console.log('[Turn] Starting…');

    try {
      // --- 1. Record audio ---
      const audioBlob = await audio.startListening(autoListenRef.current);

      if (!audioBlob) {
        console.log('[Turn] No audio blob returned (mic error or empty).');
        return;
      }
      if (stopLoopRef.current) {
        console.log('[Turn] Stop requested after recording.');
        return;
      }

      // listenState is now 'processing' — audio is sending to Whisper
      console.log('[Turn] Sending audio to backend…');
      const result = await session.sendAudioTurn(audioBlob);

      // Transition audio hook back to idle now that Whisper processing is done
      audio.setIdle();

      if (!result || stopLoopRef.current) return;

      // Apply optional response delay
      if (responseDelay > 0 && !stopLoopRef.current) {
        await runCountdown(responseDelay);
      }
      if (stopLoopRef.current) return;

      console.log('[Turn] Playing AI response...');
      if (result.audioBase64) {
        // ⚡ Fast path: audio was embedded in the turn response — play immediately,
        // no extra /tts HTTP round trip needed.
        await audio.playBase64Audio(result.audioBase64, result.audioMime);
      } else {
        // Fallback: fetch TTS separately (e.g. if inline TTS generation failed)
        await audio.speakText(result.text);
      }
      console.log('[Turn] AI finished speaking.');

    } catch (e) {
      console.error('[Turn] Unexpected error:', e);
      audio.setIdle();
    } finally {
      turnInProgressRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio, session, responseDelay]);

  // ── Auto-listen effect ────────────────────────────────────────────────────
  // "isBusy" now correctly includes isProcessing (Whisper roundtrip)
  const isBusy =
    audio.isListening ||
    audio.isProcessing ||
    audio.isSpeaking ||
    session.isLoading ||
    turnInProgressRef.current ||
    countdownActiveRef.current;

  useEffect(() => {
    if (
      autoListen &&
      !isBusy &&
      countdown === 0 &&
      session.status === 'in_progress' &&
      !audio.isListening
    ) {
      const timer = setTimeout(() => {
        // Double-check refs at execution time (guards against stale captures)
        if (
          autoListenRef.current &&
          !stopLoopRef.current &&
          !turnInProgressRef.current
        ) {
          doTurn();
        }
      }, 300); // 300ms handoff — tight but gives React time to flush
      return () => clearTimeout(timer);
    }
  }, [autoListen, isBusy, countdown, session.status, audio.isListening, doTurn]);

  // ── Start session ─────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    stopLoopRef.current = false;
    const openingText = await session.startSession(topicId);
    if (openingText) {
      if (responseDelay > 0) await runCountdown(responseDelay);
      await audio.speakText(openingText);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, audio, topicId, responseDelay]);

  // ── Manual listen ─────────────────────────────────────────────────────────
  const handleManualListen = useCallback(() => {
    if (turnInProgressRef.current) return;
    stopLoopRef.current = false;
    doTurn();
  }, [doTurn]);

  // ── End session ───────────────────────────────────────────────────────────
  const handleEndSession = useCallback(async () => {
    stopLoopRef.current = true;
    autoListenRef.current = false;
    setAutoListen(false);
    audio.stopListening();
    audio.stopSpeaking();
    audio.setIdle();
    await session.completeSession();
  }, [audio, session]);

  // ── Completed view ────────────────────────────────────────────────────────
  if (session.status === 'completed' && session.evaluation) {
    return (
      <div className="min-h-screen bg-gray-950">
        <nav className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-white/5 px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
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

  // ── Active session view ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <Button
          variant="ghost" size="sm"
          className="text-gray-300 hover:text-white"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Exit
        </Button>

        <div className="text-center">
          <p className="text-white font-semibold capitalize">Custom Session</p>
          <p className="text-gray-400 text-xs">{session.messages.length} turns</p>
        </div>

        <div className="w-24" />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6">

        {session.status === 'idle' ? (

          /* ── Start / Settings screen ──────────────────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <div className="p-8 bg-gray-800 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Train?</h2>
              <p className="text-gray-400 mb-2 text-sm">Speak naturally with your AI prospect.</p>
              <p className="text-gray-500 text-xs mb-6">
                High-quality voice powered by Whisper + ElevenLabs.
              </p>

              {/* Response delay */}
              <div className="mb-5 text-left">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  <Clock className="h-3.5 w-3.5" /> AI Response Delay
                </label>
                <div className="flex gap-2">
                  {DELAY_OPTIONS.map((opt) => (
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
                    : `AI waits ${responseDelay}s before replying.`}
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

          /* ── Active session ────────────────────────────────────────────── */
          <>
            <div className="flex-1 bg-gray-800 rounded-xl p-4 mb-4 overflow-hidden" style={{ height: '400px' }}>
              <ConversationPanel messages={session.messages} />
            </div>

            {/* Errors */}
            {(session.error || audio.error) && (
              <div className="mb-3 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{session.error || audio.error}</span>
              </div>
            )}

            {/* Status bar */}
            <div className="mb-3 h-7 flex items-center justify-center gap-4">
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
              {audio.isProcessing && !audio.isSpeaking && (
                <span className="flex items-center gap-1.5 text-sm text-purple-300 animate-pulse">
                  <Brain className="h-4 w-4" /> Transcribing…
                </span>
              )}
              {session.isLoading && !audio.isSpeaking && !audio.isProcessing && countdown === 0 && (
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

            {/* Controls */}
            <div className="flex flex-col items-center gap-4 mt-2">

              {/* Manual mic button — dimmed/disabled in auto mode */}
              <div
                className={`transition-all duration-300 ${
                  autoListen ? 'opacity-30 scale-95 pointer-events-none' : 'opacity-100'
                }`}
              >
                <VoiceRecorder
                  listenState={audio.listenState}
                  volume={audio.volume}
                  onStart={handleManualListen}
                  onStop={audio.stopListening}
                  disabled={session.status !== 'in_progress' || isBusy || autoListen}
                />
              </div>

              {/* Toolbar */}
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

                  {/* Manual mic button in toolbar (when in manual mode only) */}
                  {!autoListen && (
                    <>
                      <button
                        onClick={audio.isListening ? audio.stopListening : handleManualListen}
                        disabled={isBusy && !audio.isListening}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                          audio.isListening
                            ? 'bg-red-500/20 border-red-500/50 text-red-400'
                            : 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-600/40 disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        <Mic className="h-4 w-4" />
                        <span>{audio.isListening ? 'Stop' : 'Speak'}</span>
                      </button>

                      <div className="w-px h-6 bg-gray-700/50" />
                    </>
                  )}

                  {/* End Session */}
                  <button
                    onClick={handleEndSession}
                    disabled={session.isLoading && !isBusy}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 disabled:opacity-40"
                  >
                    {session.isLoading && !audio.isListening && !audio.isProcessing ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <StopCircle className="h-4 w-4" />
                    )}
                    <span>End &amp; Score</span>
                  </button>
                </div>
              )}

            </div>

            {autoListen && (
              <p className="text-center text-xs text-emerald-400 mt-3">
                Hands-free mode — mic activates automatically after each response
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}
