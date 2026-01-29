import { useState, useCallback, useEffect } from 'react';
import { encryptMessage, decryptMessage, generateConversationKey } from './encryption.ts';

export interface EncryptedChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  encryptedContent: string; // JSON string of encrypted message
  decryptedContent?: string; // Cached decrypted content
  timestamp: number;
  isEncrypted: boolean;
}

interface UseE2EChatReturn {
  messages: EncryptedChatMessage[];
  encryptionKey: string | null;
  isKeySet: boolean;
  loading: boolean;
  error: string | null;
  initializeEncryption: (key?: string) => Promise<string>; // Returns the key if generated
  decryptMessageContent: (encrypted: EncryptedChatMessage) => Promise<string>;
  encryptAndAddMessage: (content: string, senderId: string, senderName: string) => Promise<void>;
  addDecryptedMessage: (message: EncryptedChatMessage) => void;
  clearMessages: () => void;
  clearError: () => void;
  getDecryptedMessages: () => Promise<EncryptedChatMessage[]>;
}

/**
 * Hook for end-to-end encrypted chat
 * Each conversation uses its own encryption key
 * Messages are encrypted before transmission and decrypted on receipt
 */
export function useE2EChat(): UseE2EChatReturn {
  const [messages, setMessages] = useState<EncryptedChatMessage[]>([]);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [isKeySet, setIsKeySet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Try to load encryption key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('e2e_chat_key');
    if (savedKey) {
      setEncryptionKey(savedKey);
      setIsKeySet(true);
    }
  }, []);

  const initializeEncryption = useCallback(
    async (key?: string): Promise<string> => {
      try {
        setLoading(true);
        setError(null);

        let finalKey = key;
        if (!finalKey) {
          // Generate a new key for this conversation
          finalKey = generateConversationKey(32);
        }

        // Save to localStorage for persistence in this conversation
        localStorage.setItem('e2e_chat_key', finalKey);
        setEncryptionKey(finalKey);
        setIsKeySet(true);

        return finalKey;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize encryption';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const decryptMessageContent = useCallback(
    async (encrypted: EncryptedChatMessage): Promise<string> => {
      if (!encryptionKey) {
        throw new Error('Encryption key not set');
      }

      // Return cached decrypted content if available
      if (encrypted.decryptedContent) {
        return encrypted.decryptedContent;
      }

      try {
        const encryptedData = JSON.parse(encrypted.encryptedContent);
        const decrypted = await decryptMessage(encryptedData, encryptionKey);
        
        // Update message with decrypted content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === encrypted.id ? { ...msg, decryptedContent: decrypted } : msg
          )
        );

        return decrypted;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to decrypt message';
        console.error('Decryption Error:', err);
        throw new Error(errorMessage);
      }
    },
    [encryptionKey]
  );

  const encryptAndAddMessage = useCallback(
    async (content: string, senderId: string, senderName: string) => {
      if (!encryptionKey) {
        throw new Error('Encryption key not set');
      }

      try {
        setLoading(true);
        setError(null);

        // Encrypt the message
        const encrypted = await encryptMessage(content, encryptionKey);

        // Create new message
        const newMessage: EncryptedChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          senderId,
          senderName,
          encryptedContent: JSON.stringify(encrypted),
          decryptedContent: content, // Cache the decrypted content
          timestamp: Date.now(),
          isEncrypted: true,
        };

        setMessages((prev) => [...prev, newMessage]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to encrypt message';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [encryptionKey]
  );

  const addDecryptedMessage = useCallback((message: EncryptedChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const getDecryptedMessages = useCallback(async (): Promise<EncryptedChatMessage[]> => {
    const decrypted: EncryptedChatMessage[] = [];

    for (const msg of messages) {
      try {
        const content = await decryptMessageContent(msg);
        decrypted.push({ ...msg, decryptedContent: content });
      } catch (err) {
        console.error('Failed to decrypt message:', err);
        decrypted.push(msg); // Include the message even if decryption fails
      }
    }

    return decrypted;
  }, [messages, decryptMessageContent]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    encryptionKey,
    isKeySet,
    loading,
    error,
    initializeEncryption,
    decryptMessageContent,
    encryptAndAddMessage,
    addDecryptedMessage,
    clearMessages,
    clearError,
    getDecryptedMessages,
  };
}
