import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
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
          id: 'mock-user-id',
          email: email,
          user_metadata: {},
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        };
        setUser(mockUser as any);
        toast.success('Logged in with mock authentication');
        navigate('/app');
        return;
      }

      console.log('Attempting login for:', email);

      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInData.user) {
        console.log('Login successful');
        setUser(signInData.user);
        toast.success('Logged in successfully');
        navigate('/app');
        return;
      }

      // If login failed and it's a demo account, try to create it
      if (signInError && email === 'demo@nodeai.com') {
        console.log('Demo login failed, attempting to create account...');
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: undefined, // Disable email confirmation
          },
        });

        if (signUpData.user) {
          console.log('Demo account created successfully');
          setUser(signUpData.user);
          toast.success('Demo account created and logged in');
          navigate('/app');
          return;
        }

        // If signup also failed, try one more login attempt
        if (signUpError?.message?.includes('already registered')) {
          console.log('Account exists, retrying login...');
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (retryData.user) {
            setUser(retryData.user);
            toast.success('Logged in successfully');
            navigate('/app');
            return;
          }
        }
      }

      // If we get here, all attempts failed
      throw signInError || new Error('Login failed');

    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Bot className="w-12 h-12 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">NodeAI</h1>
            <p className="text-slate-400">Robot Mission Orchestration</p>
          </div>

          {isUsingMockClient && (
            <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Demo Mode</span>
              </div>
              <p className="text-green-300 text-xs mt-1">
                Running with mock authentication
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
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
              <LogIn className="w-5 h-5" />
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Demo Credentials</h3>
            <div className="text-xs text-slate-400 space-y-1">
              <div><strong>Email:</strong> demo@nodeai.com</div>
              <div><strong>Password:</strong> demo123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;