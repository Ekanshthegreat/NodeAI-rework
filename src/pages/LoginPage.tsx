import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../store/useAppStore';
import { supabase, isUsingMockClient } from '../lib/supabase';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('demo@nodeai.com');
  const [password, setPassword] = useState('demo123');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isUsingMockClient) {
        // Mock authentication for demo
        const mockUser = {
          id: 'demo-user',
          email: email,
          user_metadata: { name: 'Demo User' },
        };
        setUser(mockUser as any);
        toast.success('Logged in successfully (Demo Mode)');
        navigate('/app');
        return;
      }

      // For demo accounts, try to create user first, then sign in
      if (email === 'demo@nodeai.com') {
        try {
          // Try to sign up first (in case user doesn't exist)
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: undefined, // Disable email confirmation
            },
          });

          // If signup succeeds or user already exists, proceed to sign in
          if (!signUpError || signUpError.message.includes('already registered')) {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (signInError) throw signInError;

            setUser(data.user);
            toast.success(signUpError ? 'Logged in successfully' : 'Demo account created and logged in');
            navigate('/app');
          } else {
            throw signUpError;
          }
        } catch (error: any) {
          // If both signup and signin fail, show error
          console.error('Login error:', error.message);
          toast.error(error.message || 'Login failed');
        }
      } else {
        // Regular user login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setUser(data.user);
        toast.success('Logged in successfully');
        navigate('/app');
      }
    } catch (error: any) {
      console.error('Login error:', error.message);
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">NodeAI</h1>
            <p className="text-slate-400">Robot Mission Orchestration</p>
          </div>

          {/* Demo Notice */}
          <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm text-center">
              🚀 Demo Mode - Use the pre-filled credentials or create your own account
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-500 disabled:to-blue-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              New to NodeAI?{' '}
              <button
                onClick={() => {
                  setEmail('');
                  setPassword('');
                  toast.info('Enter your details to create a new account');
                }}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Create Account
              </button>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-slate-600 text-xs">
            Secure authentication powered by Supabase
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;