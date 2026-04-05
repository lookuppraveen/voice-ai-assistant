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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataArrayRef = useRef<Uint8Array<any> | null>(null);
  const volRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognitionRef = useRef<any>(null);

  // Tracks whether a stop was explicitly requested (manual stop)
  const manualStopRef = useRef(false);

  /**
   * Initialize AudioContext and Analyser once (lazy)
   */
  const getAudioTools = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<any>;
    }
    return {
      ctx: audioContextRef.current!,
      analyser: analyserRef.current!,
      dataArray: dataArrayRef.current!,
    };
  }, []);

  /**
   * Start recording microphone.
   * autoStopEnabled = true  → auto-detect silence and stop
   * autoStopEnabled = false → only stop when stopListening() is called manually
   * 
   * Returns a Promise<Blob | null>. Resolves when recording stops.
   */
  const startListening = useCallback(
    (autoStopEnabled = false): Promise<Blob | null> => {
      return new Promise(async (resolve) => {
        let sourceNode: MediaStreamAudioSourceNode | null = null;
        let tickId: number | null = null;
        manualStopRef.current = false;

        try {
          setError(null);
          setListenState('idle'); // safety reset
          volRef.current = 0;

          const { ctx, analyser, dataArray } = getAudioTools();
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          console.log('Audio: Requesting microphone...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;

          sourceNode = ctx.createMediaStreamSource(stream);
          sourceNode.connect(analyser);

          // Prefer webm/opus; fall back gracefully
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : '';

          const recorderOptions = mimeType ? { mimeType } : {};
          const mediaRecorder = new MediaRecorder(stream, recorderOptions);
          mediaRecorderRef.current = mediaRecorder;

          const audioChunks: BlobPart[] = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
          };

          const cleanup = () => {
            console.log('Audio: Cleaning up recording resources...');
            if (tickId !== null) cancelAnimationFrame(tickId);
            tickId = null;
            if (sourceNode) {
              try { sourceNode.disconnect(); } catch (_) {}
              sourceNode = null;
            }
            if (streamRef.current) {
              streamRef.current.getTracks().forEach((t) => t.stop());
              streamRef.current = null;
            }
            volRef.current = 0;
          };

          mediaRecorder.onstop = () => {
            console.log('Audio: MediaRecorder stopped. Chunks:', audioChunks.length);
            cleanup();
            // Transition to 'processing' so the UI and isBusy reflect it
            setListenState('processing');

            if (audioChunks.length === 0) {
              console.warn('Audio: No audio chunks captured.');
              setListenState('idle');
              resolve(null);
            } else {
              const blob = new Blob(audioChunks, { type: mimeType || 'audio/webm' });
              resolve(blob);
            }
          };

          let silenceStart = Date.now();
          let hasSpoken = false;
          const startTime = Date.now();

          const tick = () => {
            // Guard: if recorder is no longer recording, stop ticking
            if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

            analyser.getByteFrequencyData(dataArray);

            // Peak for visualiser
            let peak = 0;
            for (let i = 0; i < dataArray.length; i++) {
              if (dataArray[i] > peak) peak = dataArray[i];
            }
            volRef.current = peak;

            // Speech band ~300Hz–5kHz (bins 4–60 for fftSize=512 at 44.1kHz)
            let speechVol = 0;
            for (let i = 4; i < 60; i++) {
              if (dataArray[i] > speechVol) speechVol = dataArray[i];
            }

            if (autoStopEnabled) {
              const THRESHOLD = 25;
              const now = Date.now();
              const captureDuration = now - startTime;

              if (speechVol > THRESHOLD) {
                if (!hasSpoken) console.log('Audio: Speech detected, vol=', speechVol);
                hasSpoken = true;
                silenceStart = now;
              }

              const silenceDuration = now - silenceStart;

              if (captureDuration > 30000) {
                console.log('Audio: Auto-stop (30s hard limit)');
                mediaRecorder.stop();
              } else if (hasSpoken && silenceDuration > 1000) {
                // 1.0s silence after speech — user confirmed
                console.log('Audio: Auto-stop (1.0s silence after speech)');
                mediaRecorder.stop();
              } else if (!hasSpoken && captureDuration > 10000) {
                // 10s timeout if user never speaks
                console.log('Audio: Auto-stop (no speech in 10s)');
                mediaRecorder.stop();
              } else {
                tickId = requestAnimationFrame(tick);
              }
            } else {
              tickId = requestAnimationFrame(tick);
            }
          };

          // Collect data every 250ms so we don't miss audio at stop()
          mediaRecorder.start(250);
          tickId = requestAnimationFrame(tick);
          setListenState('listening');
          console.log('Audio: Recording started (autoStop=', autoStopEnabled, ')');
        } catch (err: any) {
          console.error('Audio: startListening error:', err);
          setListenState('idle');
          const msg =
            err.name === 'NotAllowedError'
              ? 'Microphone access denied. Please allow microphone in browser settings.'
              : err.name === 'NotFoundError'
              ? 'No microphone found. Please connect a microphone and try again.'
              : `Microphone error: ${err.message}`;
          setError(msg);
          resolve(null);
        }
      });
    },
    [getAudioTools]
  );

  /**
   * Stop recording manually (in manual mode).
   */
  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    // Also stop any active browser STT session
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
  }, []);

  /**
   * Signal that we finished processing (called by page after sendAudioTurn resolves).
   * Resets 'processing' state back to 'idle'.
   */
  const setIdle = useCallback(() => {
    setListenState('idle');
  }, []);

  /**
   * Check whether the browser supports the Web Speech API.
   */
  const isBrowserSTTSupported = (): boolean => {
    return typeof window !== 'undefined' &&
      !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  };

  /**
   * Use the browser's built-in SpeechRecognition API for near-instant transcription.
   * ~100-200ms latency vs ~1500ms for Whisper cloud API.
   * Returns the transcribed text, or null if unsupported / failed (caller falls back to Whisper).
   */
  const startBrowserSTT = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const SpeechRec =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRec) {
        console.log('Browser STT: not supported, will use Whisper.');
        resolve(null);
        return;
      }

      setError(null);
      setListenState('listening');
      volRef.current = 0;

      const recognition = new SpeechRec() as any;
      recognition.lang = 'en-US';
      recognition.continuous = false;      // Stop after first complete utterance
      recognition.interimResults = false;  // Only final results (faster)
      recognition.maxAlternatives = 1;

      speechRecognitionRef.current = recognition;

      let resolved = false;
      const done = (text: string | null) => {
        if (resolved) return;
        resolved = true;
        speechRecognitionRef.current = null;
        setListenState(text ? 'processing' : 'idle');
        resolve(text);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        const confidence = event.results[0]?.[0]?.confidence;
        console.log(`Browser STT: "${transcript}" (confidence: ${confidence?.toFixed(2)})`);
        done(transcript || null);
      };

      recognition.onnomatch = () => {
        console.log('Browser STT: no match, falling back to Whisper.');
        done(null);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
          // No speech / user cancelled — resolve null so turn skips cleanly
          console.log('Browser STT: no speech detected.');
          done(null);
        } else {
          console.warn('Browser STT error:', event.error, '— falling back to Whisper.');
          done(null); // Null triggers Whisper fallback in doTurn
        }
      };

      recognition.onend = () => {
        // If onresult didn't fire, resolve as null
        done(null);
      };

      recognition.start();
      console.log('Browser STT: listening...');
    });
  }, []);

  /**
   * Fetch TTS audio from backend and play it.
   * Waits until audio has fully finished playing before resolving.
   */
  const speakText = useCallback(async (text: string): Promise<void> => {
    if (!text || !text.trim()) return;

    // Stop any previous playback
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    try {
      setIsSpeaking(true);
      setError(null);

      const res = await sessionsApi.getTTSAudio(text);
      if (!(res.data instanceof Blob)) {
        throw new Error('Invalid audio data received from TTS server');
      }

      const url = URL.createObjectURL(res.data);
      const audioEl = new Audio(url);
      audioEl.autoplay = false;
      audioEl.preload = 'auto';
      currentAudioRef.current = audioEl;

      return new Promise((resolve) => {
        const done = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          if (currentAudioRef.current === audioEl) {
            currentAudioRef.current = null;
          }
          resolve();
        };

        audioEl.oncanplaythrough = () => {
          audioEl.play().catch((playErr) => {
            console.error('Audio: play() error:', playErr);
            setError(`Playback failed: ${playErr.message}`);
            done();
          });
        };

        audioEl.onended = () => {
          console.log('Audio: TTS playback complete.');
          done();
        };

        audioEl.onerror = (e) => {
          console.error('Audio: element error:', e);
          done();
        };

        // Fallback: if canplaythrough never fires (already loaded)
        if (audioEl.readyState >= 3) {
          audioEl.play().catch((playErr) => {
            console.error('Audio: play() fallback error:', playErr);
            setError(`Playback failed: ${playErr.message}`);
            done();
          });
        }
      });
    } catch (err: any) {
      let errorMessage = 'Failed to load audio response.';

      if (err.response?.data) {
        try {
          if (err.response.data instanceof Blob && err.response.data.type === 'application/json') {
            const txt = await err.response.data.text();
            const json = JSON.parse(txt);
            if (json.error) errorMessage = `TTS Error: ${json.error}`;
          } else if (err.response.data.error) {
            errorMessage = `TTS Error: ${err.response.data.error}`;
          }
        } catch (_) {}
      } else if (err.message) {
        errorMessage = `TTS Error: ${err.message}`;
      }

      console.error('Audio: speakText error:', errorMessage);
      setError(errorMessage);
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Play audio from a base64 string (embedded directly in turn API response).
   * This avoids a separate /tts HTTP round trip entirely.
   */
  const playBase64Audio = useCallback(async (base64: string, mime = 'audio/mpeg'): Promise<void> => {
    if (!base64) return;

    // Stop any prior playback
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    try {
      setIsSpeaking(true);
      setError(null);

      // Decode base64 → Uint8Array → Blob → Object URL
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);

      const audioEl = new Audio(url);
      audioEl.autoplay = false;
      audioEl.preload = 'auto';
      currentAudioRef.current = audioEl;

      return new Promise((resolve) => {
        const done = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          if (currentAudioRef.current === audioEl) currentAudioRef.current = null;
          resolve();
        };

        audioEl.oncanplaythrough = () => {
          audioEl.play().catch((e) => { console.error('Base64 play error:', e); done(); });
        };
        audioEl.onended = () => { console.log('Audio: inline audio complete.'); done(); };
        audioEl.onerror = () => done();

        // If already buffered
        if (audioEl.readyState >= 3) {
          audioEl.play().catch((e) => { console.error('Base64 play fallback error:', e); done(); });
        }
      });
    } catch (err: any) {
      console.error('Audio: playBase64Audio error:', err.message);
      setError(`Playback error: ${err.message}`);
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Immediately stop TTS playback.
   */
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
    setIdle,
    startBrowserSTT,
    isBrowserSTTSupported,
    speakText,
    playBase64Audio,
    stopSpeaking,
  };
};
