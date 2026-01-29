import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface TestLoginProps {
  onLoginSuccess: (token: string) => void;
}

export const TestLogin: React.FC<TestLoginProps> = ({ onLoginSuccess }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Only show in development
    if (!import.meta.env.DEV) return;

    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/debug/users`);
      const { users } = await res.json();
      setUsers(users);
    } catch (err) {
      console.error('Failed to fetch test users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (clerkId: string) => {
    localStorage.setItem('vention_test_token', clerkId);
    onLoginSuccess(clerkId);
    window.location.reload();
  };

  if (!import.meta.env.DEV || loading) return null;

  return (
    <div className={`p-4 rounded-lg border-2 border-dashed ${
      theme === 'dark'
        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'
        : 'bg-yellow-50 border-yellow-300 text-yellow-800'
    }`}>
      <p className="text-xs font-bold mb-3 uppercase tracking-wide">⚙️ Dev Test Login</p>
      <div className="space-y-2">
        {users.map(user => (
          <button
            key={user._id}
            onClick={() => handleLogin(user.clerkId)}
            className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-100'
                : 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900'
            }`}
          >
            Login as {user.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TestLogin;
