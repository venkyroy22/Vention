import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Copy, RefreshCw } from 'lucide-react';

interface E2ESetupModalProps {
  isOpen: boolean;
  onInitialize: (key: string) => Promise<void>;
  onClose: () => void;
  generatedKey?: string;
}

export function E2ESetupModal({ isOpen, onInitialize, onClose, generatedKey }: E2ESetupModalProps) {
  const { isDarkMode } = useTheme();
  const [mode, setMode] = useState<'generate' | 'paste'>('generate');
  const [key, setKey] = useState(generatedKey || '');
  const [pastedKey, setPastedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInitialize = async () => {
    try {
      setLoading(true);
      setError(null);

      const keyToUse = mode === 'generate' ? key : pastedKey;
      if (!keyToUse.trim()) {
        setError('Please enter or generate an encryption key');
        return;
      }

      await onInitialize(keyToUse);
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize encryption';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isDarkMode ? 'bg-black/50' : 'bg-black/30'}`}>
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6 ${
          isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
      >
        <div className="space-y-2">
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            End-to-End Encryption
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Set up encryption for your private chats. This key is never sent to the server.
          </p>
        </div>

        {/* Mode Selection */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('generate')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'generate'
                ? isDarkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : isDarkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Generate New Key
          </button>
          <button
            onClick={() => setMode('paste')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'paste'
                ? isDarkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : isDarkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Use Existing Key
          </button>
        </div>

        {mode === 'generate' ? (
          <div className="space-y-3">
            <div
              className={`p-4 rounded-lg font-mono text-sm break-all ${
                isDarkMode ? 'bg-gray-800 border border-gray-700 text-gray-300' : 'bg-gray-100 border border-gray-300 text-gray-900'
              }`}
            >
              {key || 'Click "Generate" to create a new key'}
            </div>
            {key && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopyKey}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy Key'}
                </button>
              </div>
            )}
            <button
              onClick={() => setKey(generateKey())}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isDarkMode
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Generate New Key
            </button>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              Share this key securely with the person you want to chat with. They'll need it to decrypt messages.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={pastedKey}
              onChange={(e) => setPastedKey(e.target.value)}
              placeholder="Paste the encryption key here..."
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 resize-none font-mono text-sm ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500 placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 placeholder-gray-500'
              }`}
              rows={4}
            />
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              Enter the encryption key that was shared with you. Make sure it's exactly correct.
            </p>
          </div>
        )}

        {error && (
          <div
            className={`p-3 rounded-lg text-sm ${
              isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
            }`}
          >
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Skip for Now
          </button>
          <button
            onClick={handleInitialize}
            disabled={loading || !key && mode === 'generate' || !pastedKey && mode === 'paste'}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50'
            }`}
          >
            {loading ? 'Setting up...' : 'Enable Encryption'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate a secure random key for encryption
 */
function generateKey(): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._';
  let result = '';
  const values = crypto.getRandomValues(new Uint8Array(32));

  for (let i = 0; i < 32; i++) {
    result += charset[values[i] % charset.length];
  }

  return result;
}
