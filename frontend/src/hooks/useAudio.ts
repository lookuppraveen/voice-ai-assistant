'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type ListenState = 'idle' | 'listening' | 'processing';

export const useAudio = () => {
  const [listenState, setListenState] = useState<ListenState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const resolveRef = useRef<((text: string) => void) | null>(null);
  const rejectRef = useRef<((e: Error) => void) | null>(null);

  // Preload voices on mount (Chrome lazy-loads them)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', () => {});
    }
  }, []);

  /**
   * Start listening — returns a Promise that resolves with the transcribed text
   * when the user stops speaking.
   */
  const startListening = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      setError(null);

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        const msg = 'Speech recognition is not supported in this browser. Please use Chrome or Edge.';
        setError(msg);
        reject(new Error(msg));
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      resolveRef.current = resolve;
      rejectRef.current = reject;

      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => setListenState('listening');

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        setListenState('processing');
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        setListenState('idle');
        const msg =
          event.error === 'not-allowed'
            ? 'Microphone permission denied. Please allow access in your browser.'
            : event.error === 'no-speech'
            ? 'No speech detected. Please try speaking again.'
            : `Speech recognition error: ${event.error}`;
        setError(msg);
        reject(new Error(msg));
      };

      recognition.onend = () => {
        setListenState('idle');
      };

      recognition.start();
    });
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListenState('idle');
  }, []);

  /** Browser TTS via Web Speech API — free, no API key needed */
  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.name === 'Google US English') ||
        voices.find((v) => v.name.includes('Google') && v.lang === 'en-US') ||
        voices.find((v) => v.name.includes('Microsoft') && v.lang === 'en-US') ||
        voices.find((v) => v.lang === 'en-US');
      if (preferred) utterance.voice = preferred;

      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    listenState,
    isSpeaking,
    error,
    isListening: listenState === 'listening',
    isProcessing: listenState === 'processing',
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  };
};
