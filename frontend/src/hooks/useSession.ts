'use client';

import { useState, useRef, useCallback } from 'react';
import { sessionsApi } from '@/lib/api';
import { Message, Evaluation } from '@/types';

interface SessionState {
  sessionId: string | null;
  messages: Message[];
  evaluation: Evaluation | null;
  isLoading: boolean;
  error: string | null;
  status: 'idle' | 'in_progress' | 'completed';
}

export const useSession = () => {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    messages: [],
    evaluation: null,
    isLoading: false,
    error: null,
    status: 'idle',
  });

  // Keep a ref so async callbacks always have the latest sessionId
  const sessionIdRef = useRef<string | null>(null);

  const setError = (error: string | null) =>
    setState((s) => ({ ...s, error, isLoading: false }));

  /** Start a session with a given topic_id. Returns opening text for TTS. */
  const startSession = useCallback(async (topicId: string): Promise<string | null> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await sessionsApi.start(topicId);
      const { session, opening } = res.data;

      sessionIdRef.current = session.id;

      const openingMsg: Message = {
        id: 'opening',
        session_id: session.id,
        role: 'assistant',
        content: opening.text,
        turn_number: 1,
        created_at: new Date().toISOString(),
      };

      setState((s) => ({
        ...s,
        sessionId: session.id,
        messages: [openingMsg],
        status: 'in_progress',
        isLoading: false,
      }));

      return opening.text;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start session');
      return null;
    }
  }, []);

  /** Send a pre-transcribed text turn (browser STT fallback). Returns AI response text. */
  const sendTurn = useCallback(async (transcribedText: string): Promise<string | null> => {
    const id = sessionIdRef.current;
    if (!id) return null;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await sessionsApi.sendTextTurn(id, transcribedText);
      const { user_message, ai_response, turn } = res.data;

      const userMsg: Message = {
        id: `user-${turn}`,
        session_id: id,
        role: 'user',
        content: user_message,
        turn_number: turn,
        created_at: new Date().toISOString(),
      };

      const aiMsg: Message = {
        id: `ai-${turn + 1}`,
        session_id: id,
        role: 'assistant',
        content: ai_response.text,
        turn_number: turn + 1,
        created_at: new Date().toISOString(),
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, userMsg, aiMsg],
        isLoading: false,
      }));

      return ai_response.text;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process turn');
      return null;
    }
  }, []);

  /** Send a recorded audio Blob. Whisper transcribes it server-side. Returns AI response + embedded audio. */
  const sendAudioTurn = useCallback(async (audioBlob: Blob): Promise<{
    text: string;
    audioBase64: string | null;
    audioMime: string;
  } | null> => {
    const id = sessionIdRef.current;
    if (!id) {
      console.error('Session: sendAudioTurn called with no active sessionId');
      return null;
    }
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await sessionsApi.sendAudioTurn(id, audioBlob);
      const { user_message, ai_response, turn, audio_base64, audio_mime } = res.data;

      const userMsg: Message = {
        id: `user-${turn}`,
        session_id: id,
        role: 'user',
        content: user_message,
        turn_number: turn,
        created_at: new Date().toISOString(),
      };

      const aiMsg: Message = {
        id: `ai-${turn + 1}`,
        session_id: id,
        role: 'assistant',
        content: ai_response.text,
        turn_number: turn + 1,
        created_at: new Date().toISOString(),
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, userMsg, aiMsg],
        isLoading: false,
      }));

      return {
        text: ai_response.text,
        audioBase64: audio_base64 || null,
        audioMime: audio_mime || 'audio/mpeg',
      };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process audio turn');
      return null;
    }
  }, []);

  /** End the session and trigger AI evaluation. */
  const completeSession = useCallback(async (): Promise<Evaluation | null> => {
    const id = sessionIdRef.current;
    if (!id) return null;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await sessionsApi.complete(id);
      const { evaluation } = res.data;

      setState((s) => ({
        ...s,
        evaluation,
        status: 'completed',
        isLoading: false,
      }));

      return evaluation;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete session');
      return null;
    }
  }, []);

  /** Reset to initial idle state. */
  const reset = useCallback(() => {
    sessionIdRef.current = null;
    setState({
      sessionId: null,
      messages: [],
      evaluation: null,
      isLoading: false,
      error: null,
      status: 'idle',
    });
  }, []);

  return { ...state, startSession, sendTurn, sendAudioTurn, completeSession, reset };
};
