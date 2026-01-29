import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAIChat } from '../api/useAIChat';
import { Send, X, Copy, RefreshCw, Sparkles } from 'lucide-react';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
  section?: 'notes' | 'tasks'; // To customize prompts
  contentPreview?: string; // Preview of current note/task content
}

export function AIChat({ isOpen, onClose, context, section = 'notes', contentPreview }: AIChatProps) {
  const { isDarkMode } = useTheme();
  const { messages, loading, error, sendMessage, generateSuggestions, generateIdeas, clearMessages, clearError } =
    useAIChat();
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const message = input;
    setInput('');
    await sendMessage(message, context);
  };

  const handleQuickSuggestion = async () => {
    if (!contentPreview) return;

    if (section === 'notes') {
      await generateSuggestions(contentPreview);
    } else if (section === 'tasks') {
      await generateIdeas(contentPreview);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-black/50' : 'bg-black/30'}`}
      onClick={onClose}
    >
      <div
        className={`fixed bottom-0 right-0 h-[600px] w-[450px] rounded-t-2xl shadow-2xl flex flex-col ${
          isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        } border`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
          } rounded-t-2xl`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              AI Assistant
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg hover:bg-opacity-20 ${
              isDarkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-300 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div
          className={`flex-1 overflow-y-auto p-4 space-y-4 ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}
        >
          {messages.length === 0 && (
            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <Sparkles className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <p className="text-sm mb-4">
                {section === 'notes'
                  ? 'Ask me for suggestions to improve your notes or brainstorm ideas!'
                  : 'Ask me to help organize tasks or generate new ideas!'}
              </p>
              {contentPreview && (
                <button
                  onClick={handleQuickSuggestion}
                  disabled={loading}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                      : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {section === 'notes' ? 'Get Suggestions' : 'Generate Ideas'}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-100'
                      : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(msg.content, idx)}
                    className={`mt-2 text-xs px-2 py-1 rounded opacity-70 hover:opacity-100 transition-opacity ${
                      isDarkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-200'
                    }`}
                  >
                    {copiedIndex === idx ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div
                className={`px-4 py-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}
              >
                <div className="flex gap-2">
                  <div
                    className={`w-2 h-2 rounded-full animate-bounce ${
                      isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
                    }`}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full animate-bounce delay-100 ${
                      isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
                    }`}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full animate-bounce delay-200 ${
                      isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
                    }`}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div
                className={`px-4 py-3 rounded-lg text-sm ${
                  isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                }`}
              >
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className={`border-t p-4 ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={loading}
              className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 resize-none ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 placeholder-gray-500'
              }`}
              rows={2}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
