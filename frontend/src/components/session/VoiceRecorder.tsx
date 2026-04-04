'use client';

import React, { useState, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import Button from '../ui/Button';

interface VoiceRecorderProps {
  listenState: 'idle' | 'listening' | 'processing';
  volume: () => number;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

const WaveBar = ({ scale }: { scale: number }) => {
  return (
    <span
      className="inline-block w-1.5 bg-blue-400 rounded-full transition-all duration-75"
      style={{
        height: `${Math.max(8, 48 * scale)}px`,
        opacity: 0.3 + (0.7 * scale),
        filter: `drop-shadow(0 0 8px rgba(96, 165, 250, ${0.4 * scale}))`,
      }}
    />
  );
};

export const VoiceRecorder = ({ 
  listenState, 
  volume, 
  onStart, 
  onStop, 
  disabled 
}: VoiceRecorderProps) => {
  const isListening = listenState === 'listening';
  const isProcessing = listenState === 'processing';
  const [localVol, setLocalVol] = useState(0);

  // Poll volume only when listening to avoid high-frequency parent re-renders
  useEffect(() => {
    if (!isListening) {
      setLocalVol(0);
      return;
    }

    let frameId: number;
    const poll = () => {
      setLocalVol(volume());
      frameId = requestAnimationFrame(poll);
    };
    frameId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frameId);
  }, [isListening, volume]);

  const bars = [0, 1, 2, 3, 4];
  const getScale = (index: number) => {
    const base = 0.2;
    // localVol is 0-255. Normalize to 0-1 range for the visualizer.
    const factor = (localVol / 255) * 1.5;
    const stagger = [0.4, 0.7, 1, 0.7, 0.4][index];
    return Math.max(base, factor * stagger);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Wave Visualizer */}
      <div className="h-16 flex items-center justify-center gap-1.5">
        {isListening ? (
          bars.map((i) => (
            <WaveBar key={i} scale={getScale(i)} />
          ))
        ) : (
          <div className="text-gray-500 text-sm font-medium animate-pulse">
            {isProcessing ? 'AI is processing...' : 'Say something naturally'}
          </div>
        )}
      </div>

      <div className="relative">
        {/* Pulsing ring when listening */}
        {isListening && (
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
        )}

        <Button
          size="lg"
          onClick={isListening ? onStop : onStart}
          disabled={disabled || isProcessing}
          className={`h-16 w-16 rounded-full shadow-2xl transition-all duration-300 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-500/20 scale-110' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : isListening ? (
            <Square className="h-8 w-8 text-white fill-current" />
          ) : (
            <Mic className="h-8 w-8 text-white" />
          )}
        </Button>
      </div>
    </div>
  );
};
