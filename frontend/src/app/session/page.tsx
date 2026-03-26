'use client';

import { useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useAudio } from '@/hooks/useAudio';
import { ConversationPanel } from '@/components/session/ConversationPanel';
import { VoiceRecorder } from '@/components/session/VoiceRecorder';
import { ScoreCard } from '@/components/session/ScoreCard';
import Button from '@/components/ui/Button';
import { ArrowLeft, StopCircle, Volume2, Brain } from 'lucide-react';

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioType = searchParams.get('scenario') || 'cold_call';

  const session = useSession();
  const audio = useAudio();

  const handleStart = useCallback(async () => {
    const openingText = await session.startSession(scenarioType);
    if (openingText) await audio.speakText(openingText);
  }, [session, audio, scenarioType]);

  // Full turn: listen → browser STT → send text → Claude → speak
  const handleStartListening = useCallback(async () => {
    try {
      const transcript = await audio.startListening();
      if (!transcript) return;

      const aiText = await session.sendTurn(transcript);
      if (aiText) await audio.speakText(aiText);
    } catch (err: any) {
      // error already set in audio hook
    }
  }, [audio, session]);

  const handleEndSession = useCallback(async () => {
    audio.stopListening();
    audio.stopSpeaking();
    await session.completeSession();
  }, [audio, session]);

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
            scenarioType={scenarioType}
          />
        </main>
      </div>
    );
  }

  const isBusy = audio.isProcessing || session.isLoading || audio.isSpeaking;

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
          <p className="text-white font-semibold capitalize">
            {scenarioType.replace(/_/g, ' ')}
          </p>
          <p className="text-gray-400 text-xs">{session.messages.length} turns</p>
        </div>

        {session.status === 'in_progress' ? (
          <Button size="sm" variant="danger" onClick={handleEndSession} loading={session.isLoading && !isBusy}>
            <StopCircle className="h-4 w-4 mr-1" /> End & Score
          </Button>
        ) : (
          <div className="w-24" />
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
        {session.status === 'idle' ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="p-8 bg-gray-800 rounded-2xl max-w-sm w-full text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Train?</h2>
              <p className="text-gray-400 mb-2 text-sm">
                Speak naturally with your AI prospect.
              </p>
              <p className="text-gray-500 text-xs mb-6">
                Uses your browser&apos;s built-in speech recognition — works best in Chrome or Edge.
              </p>
              <Button size="lg" className="w-full" onClick={handleStart} loading={session.isLoading}>
                Start Session
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation */}
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
            <div className="mb-3 h-6 flex items-center justify-center">
              {audio.isSpeaking && (
                <span className="flex items-center gap-1.5 text-sm text-blue-300 animate-pulse">
                  <Volume2 className="h-4 w-4" /> Prospect speaking...
                </span>
              )}
              {session.isLoading && !audio.isSpeaking && (
                <span className="flex items-center gap-1.5 text-sm text-yellow-300 animate-pulse">
                  <Brain className="h-4 w-4" /> AI thinking...
                </span>
              )}
              {audio.isListening && (
                <span className="text-sm text-green-300">Listening to you...</span>
              )}
            </div>

            {/* Recorder */}
            <div className="flex justify-center">
              <VoiceRecorder
                listenState={audio.listenState}
                onStart={handleStartListening}
                onStop={audio.stopListening}
                disabled={session.status !== 'in_progress' || isBusy}
              />
            </div>
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
