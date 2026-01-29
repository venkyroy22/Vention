import { useState, useCallback } from 'react';
import {
  sendAIMessage,
  generateNoteSuggestions,
  generateTaskIdeas,
  suggestTaskImprovements,
  brainstormWithAI,
  AIMessage,
  AIResponse,
} from '../api/gemini';

export interface UseAIChatReturn {
  messages: AIMessage[];
  response: AIResponse | null;
  loading: boolean;
  error: string | null;
  sendMessage: (message: string, context?: string) => Promise<void>;
  generateSuggestions: (noteContent: string, noteTitle?: string) => Promise<void>;
  generateIdeas: (context: string) => Promise<void>;
  suggestImprovements: (taskTitle: string, description?: string, status?: string) => Promise<void>;
  brainstorm: (topic: string, context?: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

/**
 * Hook for AI chat interactions
 * Used in Notes and Tasks sections
 * Maintains conversation history for context
 */
export function useAIChat(): UseAIChatReturn {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (message: string, context?: string) => {
      setLoading(true);
      setError(null);

      try {
        // Add user message to history
        const userMsg: AIMessage = {
          role: 'user',
          content: message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);

        // Get AI response
        const aiResponse = await sendAIMessage(message, context, messages);

        // Add AI response to history
        const aiMsg: AIMessage = {
          role: 'assistant',
          content: aiResponse.content,
          timestamp: aiResponse.timestamp,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setResponse(aiResponse);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('AI Chat Error:', err);
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  const generateSuggestions = useCallback(
    async (noteContent: string, noteTitle?: string) => {
      setLoading(true);
      setError(null);

      try {
        const aiResponse = await generateNoteSuggestions(noteContent, noteTitle);
        const aiMsg: AIMessage = {
          role: 'assistant',
          content: aiResponse.content,
          timestamp: aiResponse.timestamp,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setResponse(aiResponse);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate suggestions';
        setError(errorMessage);
        console.error('Suggestion Error:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const generateIdeas = useCallback(async (context: string) => {
    setLoading(true);
    setError(null);

    try {
      const aiResponse = await generateTaskIdeas(context);
      const aiMsg: AIMessage = {
        role: 'assistant',
        content: aiResponse.content,
        timestamp: aiResponse.timestamp,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setResponse(aiResponse);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate ideas';
      setError(errorMessage);
      console.error('Idea Generation Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const suggestImprovements = useCallback(
    async (taskTitle: string, description?: string, status?: string) => {
      setLoading(true);
      setError(null);

      try {
        const aiResponse = await suggestTaskImprovements(taskTitle, description, status);
        const aiMsg: AIMessage = {
          role: 'assistant',
          content: aiResponse.content,
          timestamp: aiResponse.timestamp,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setResponse(aiResponse);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get suggestions';
        setError(errorMessage);
        console.error('Improvement Suggestion Error:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const brainstorm = useCallback(async (topic: string, context?: string) => {
    setLoading(true);
    setError(null);

    try {
      const aiResponse = await brainstormWithAI(topic, context);
      const aiMsg: AIMessage = {
        role: 'assistant',
        content: aiResponse.content,
        timestamp: aiResponse.timestamp,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setResponse(aiResponse);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to brainstorm';
      setError(errorMessage);
      console.error('Brainstorm Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setResponse(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    response,
    loading,
    error,
    sendMessage,
    generateSuggestions,
    generateIdeas,
    suggestImprovements,
    brainstorm,
    clearMessages,
    clearError,
  };
}
