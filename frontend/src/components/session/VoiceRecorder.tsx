'use client';

import { clsx } from 'clsx';
import { Mic, Square, Loader2 } from 'lucide-react';
import { ListenState } from '@/hooks/useAudio';

interface VoiceRecorderProps {
  listenState: ListenState;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

const WaveBar = ({ delay }: { delay: number }) => (
  <span
    className="inline-block w-1 bg-white rounded-full"
    style={{
      height: '20px',
      animation: 'wave 0.8s ease-in-out infinite',
      animationDelay: `${delay}s`,
    }}
  />
);

export const VoiceRecorder = ({ listenState, onStart, onStop, disabled }: VoiceRecorderProps) => {
  const isListening = listenState === 'listening';
  const isProcessing = listenState === 'processing';

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={isListening ? onStop : onStart}
        disabled={disabled || isProcessing}
        className={clsx(
          'relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4',
          {
            'bg-red-500 hover:bg-red-600 focus:ring-red-300 scale-110': isListening,
            'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300': !isListening && !isProcessing,
            'bg-gray-500 cursor-not-allowed': disabled || isProcessing,
          }
        )}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
        )}
        {isProcessing ? (
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        ) : isListening ? (
          <Square className="h-8 w-8 text-white" />
        ) : (
          <Mic className="h-8 w-8 text-white" />
        )}
      </button>

      {isListening && (
        <div className="flex items-end gap-0.5 h-8">
          {[0, 0.1, 0.2, 0.3, 0.4].map((d, i) => (
            <WaveBar key={i} delay={d} />
          ))}
        </div>
      )}

      <p className="text-sm font-medium text-gray-400">
        {isProcessing
          ? 'Processing your speech...'
          : isListening
          ? 'Listening — click to stop'
          : 'Click mic to speak'}
      </p>
    </div>
  );
};
