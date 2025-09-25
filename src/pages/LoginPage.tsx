import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Bot } from 'lucide-react';
import { supabase, isUsingMockClient } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('demo@nodeai.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Handle demo account or mock client
      if (isUsingMockClient || email === 'demo@nodeai.com') {
        if (email === 'demo@nodeai.com' && password === 'demo123') {
          // Create mock user for demo
          const mockUser = {
            id: 'demo-user-id',
            email: 'demo@nodeai.com',
            user_metadata: { name: 'Demo User' },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          setUser(mockUser);
          navigate('/app');
          return;
        } else {
          throw new Error('Invalid demo credentials. Use demo@nodeai.com / demo123');
        }
      }

      // Real Supabase authentication
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!data.user) throw new Error('No user returned from authentication');

      setUser(data.user);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">NodeAI</h1>
          <p className="text-slate-300">Autonomous Robot Fleet Management</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Account Info */}
          <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <h3 className="text-sm font-medium text-blue-200 mb-2">Demo Account</h3>
            <div className="text-xs text-blue-300 space-y-1">
              <p><strong>Email:</strong> demo@nodeai.com</p>
              <p><strong>Password:</strong> demo123</p>
            </div>
            {isUsingMockClient && (
              <p className="text-xs text-yellow-300 mt-2">
                ⚠️ Running in demo mode (no Supabase connection)
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-400 text-sm">
          <p>© 2025 NodeAI. Advanced robotics fleet management platform.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;