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
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const volRef = useRef(0);

  /**
   * One-time initialization of audio graph components
   */
  const getAudioTools = useCallback(() => {
    if (!audioContextRef.current) {
      console.log('Audio: Initializing new AudioContext and Analyser...');
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }
    
    return {
      ctx: audioContextRef.current,
      analyser: analyserRef.current!,
      dataArray: dataArrayRef.current!
    };
  }, []);

  /**
   * Start recording microphone
   */
  const startListening = useCallback((autoStopEnabled = false): Promise<Blob | null> => {
    return new Promise(async (resolve) => {
      let sourceNode: MediaStreamAudioSourceNode | null = null;
      let tickId: number | null = null;

      try {
        setError(null);
        setListenState('idle'); // Safety reset
        volRef.current = 0;

        const { ctx, analyser, dataArray } = getAudioTools();
        if (ctx.state === 'suspended') await ctx.resume();

        console.log('Audio: Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Connect the new stream to our persistent analyser
        sourceNode = ctx.createMediaStreamSource(stream);
        sourceNode.connect(analyser);

        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        const audioChunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        const cleanup = () => {
          console.log('Audio: Cleaning up turn resources...');
          if (tickId) cancelAnimationFrame(tickId);
          if (sourceNode) {
            sourceNode.disconnect();
            sourceNode = null;
          }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          volRef.current = 0;
        };

        mediaRecorder.onstop = () => {
          console.log('Audio: MediaRecorder onstop fired. Chunks:', audioChunks.length);
          cleanup();
          setListenState('idle');
          
          if (audioChunks.length === 0) {
            console.warn('Audio: No chunks captured.');
            resolve(null);
          } else {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            resolve(blob);
          }
        };

        let silenceStart = Date.now();
        let hasSpoken = false;
        let startTime = Date.now();

        const tick = () => {
          if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

          analyser.getByteFrequencyData(dataArray);
          
          // Calculate peak for visualizer
          let peak = 0;
          for (let i = 0; i < dataArray.length; i++) {
              if (dataArray[i] > peak) peak = dataArray[i];
          }
          volRef.current = peak;
          
          // Calculate speech volume (approx 800Hz - 5kHz)
          let speechVol = 0;
          for (let i = 10; i < 60; i++) {
            if (dataArray[i] > speechVol) speechVol = dataArray[i];
          }

          if (autoStopEnabled) {
            const THRESHOLD = 35; // Back to 35, now that UI is optimized
            if (speechVol > THRESHOLD) { 
              if (!hasSpoken) console.log('Audio: Speech detected at vol:', speechVol);
              hasSpoken = true;
              silenceStart = Date.now();
            }

            const silenceDuration = Date.now() - silenceStart;
            const captureDuration = Date.now() - startTime;

            // Stop if silence after speaking OR global timeout (30s)
            if (hasSpoken && silenceDuration > 1500) {
              console.log('Audio: Auto-stop (silence)');
              mediaRecorder.stop();
            } else if (!hasSpoken && captureDuration > 15000) { 
              console.log('Audio: Auto-stop (timeout)');
              mediaRecorder.stop();
            } else {
              tickId = requestAnimationFrame(tick);
            }
          } else {
            tickId = requestAnimationFrame(tick);
          }
        };

        tickId = requestAnimationFrame(tick);
        mediaRecorder.start();
        setListenState('listening');
        console.log('Audio: Recording started.');
      } catch (err: any) {
        console.error('Audio: startListening error:', err);
        setListenState('idle');
        setError(`Microphone error: ${err.message}`);
        resolve(null);
      }
    });
  }, [getAudioTools]);

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
      let errorMessage = 'Failed to load HQ audio response.';

      // Attempt to extract more specific error from response
      if (err.response?.data) {
        try {
          if (err.response.data instanceof Blob && err.response.data.type === 'application/json') {
            const errorText = await err.response.data.text();
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) errorMessage = `HQ Audio: ${errorJson.error}`;
          } else if (err.response.data.error) {
            errorMessage = `HQ Audio: ${err.response.data.error}`;
          }
        } catch (e) {
          console.error('Error parsing TTS failure:', e);
        }
      } else if (err.message) {
        errorMessage = `HQ Audio: ${err.message}`;
      }

      setError(errorMessage);
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
    volume: () => volRef.current,
    isListening: listenState === 'listening',
    isProcessing: listenState === 'processing',
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  };
};
