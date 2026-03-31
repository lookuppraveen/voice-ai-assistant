'use client';

import { useState, useRef, useCallback } from 'react';
import { sessionsApi } from '@/lib/api';

export type ListenState = 'idle' | 'listening' | 'processing';

export const useAudio = () => {
  const [listenState, setListenState] = useState<ListenState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Start recording microphone
   */
  const startListening = useCallback((autoStopEnabled = false): Promise<Blob | null> => {
    return new Promise(async (resolve) => {
      try {
        setError(null);
        setListenState('idle');

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        const audioChunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        const cleanup = () => {
          if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
          }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        };

        mediaRecorder.onstop = () => {
          cleanup();
          setListenState('processing');
          if (audioChunks.length === 0) {
            setListenState('idle');
            resolve(null);
            return;
          }
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          resolve(audioBlob);
        };

        if (autoStopEnabled) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContext();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let silenceStart = Date.now();
          let hasSpoken = false;

          const tick = () => {
            if (mediaRecorder.state !== 'recording') return;

            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;

            if (avg > 15) { // Active speaking threshold
              hasSpoken = true;
              silenceStart = Date.now();
            }

            if (hasSpoken && Date.now() - silenceStart > 1500) {
              mediaRecorder.stop();
            } else if (!hasSpoken && Date.now() - silenceStart > 10000) { // Timeout if no one speaks
              mediaRecorder.stop();
            } else {
              requestAnimationFrame(tick);
            }
          };

          requestAnimationFrame(tick);
        }

        mediaRecorder.start();
        setListenState('listening');
      } catch (err: any) {
        setListenState('idle');
        setError(`Microphone error: ${err.message}`);
        resolve(null);
      }
    });
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /**
   * Fetch TTS from backend and play it natively
   */
  const speakText = useCallback(async (text: string): Promise<void> => {
    if (!text || !text.trim()) return;

    try {
      setIsSpeaking(true);
      setError(null);

      const res = await sessionsApi.getTTSAudio(text);
      const url = URL.createObjectURL(res.data);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      return new Promise((resolve) => {
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          resolve();
        };
        audio.play().catch((err) => {
          setError(`Audio play failed: ${err.message}`);
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          resolve();
        });
      });
    } catch (err: any) {
      setError('Failed to load HQ audio response.');
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
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
