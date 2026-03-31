'use client';

import { useState, useCallback } from 'react';
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

  const setError = (error: string | null) =>
    setState((s) => ({ ...s, error, isLoading: false }));

  // Returns opening text for TTS
  const startSession = useCallback(async (scenarioType: string): Promise<string | null> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await sessionsApi.start(scenarioType);
      const { session, opening } = res.data;

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

  // Returns AI response text for TTS
  const sendTurn = useCallback(async (transcribedText: string): Promise<string | null> => {
    if (!state.sessionId) return null;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await sessionsApi.sendTextTurn(state.sessionId, transcribedText);
      const { user_message, ai_response, turn } = res.data;

      const userMsg: Message = {
        id: `user-${turn}`,
        session_id: state.sessionId,
        role: 'user',
        content: user_message,
        turn_number: turn,
        created_at: new Date().toISOString(),
      };

      const aiMsg: Message = {
        id: `ai-${turn + 1}`,
        session_id: state.sessionId,
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
  }, [state.sessionId]);

  const sendAudioTurn = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    if (!state.sessionId) return null;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await sessionsApi.sendAudioTurn(state.sessionId, audioBlob);
      const { user_message, ai_response, turn } = res.data;

      const userMsg: Message = {
        id: `user-${turn}`,
        session_id: state.sessionId,
        role: 'user',
        content: user_message,
        turn_number: turn,
        created_at: new Date().toISOString(),
      };

      const aiMsg: Message = {
        id: `ai-${turn + 1}`,
        session_id: state.sessionId,
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
      setError(err.response?.data?.error || 'Failed to process audio turn');
      return null;
    }
  }, [state.sessionId]);

  const completeSession = useCallback(async (): Promise<Evaluation | null> => {
    if (!state.sessionId) return null;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await sessionsApi.complete(state.sessionId);
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
  }, [state.sessionId]);

  const reset = useCallback(() => {
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
