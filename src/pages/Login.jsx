import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Lock, User, Mail } from 'lucide-react'; // Added Mail
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

// --- Firebase Auth Imports ---
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';

// The 'auth' prop is passed down from App.jsx
const Login = ({ auth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => e.preventDefault(); // Prevent default form submission

  // --- Firebase Login ---
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // No need to call onLogin()!
      // The onAuthStateChanged listener in App.jsx
      // will automatically detect the login and navigate.
      toast({
        title: "Login Successful! 🎉",
        description: `Welcome back!`,
      });
    } catch (err) {
      toast({
        title: "Login Failed",
        description: err.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  // --- Firebase Registration ---
  const handleRegister = async () => {
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Registration Successful! 🎉",
        description: "Welcome to Field ERP!",
      });
      // Again, onAuthStateChanged in App.jsx handles the rest.
    } catch (err) {
      toast({
        title: "Registration Failed",
        description: err.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 opacity-50"></div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-panel neon-border rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="inline-block"
            >
              <Settings className="w-16 h-16 text-indigo-400 mx-auto" />
            </motion.div>
            <h1 className="text-4xl font-bold neon-text">FIELD ERP</h1>
            <p className="text-gray-400">Enterprise Resource Planning</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-indigo-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-indigo-500/30 focus:border-pink-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-indigo-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-indigo-500/30 focus:border-pink-500"
                  placeholder="Enter password (min 6 chars)"
                  required
                />
              </div>
            </div>

            <Button 
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white font-bold py-3 pulse-glow"
            >
              {isLoading ? "Loading..." : "LOGIN"}
            </Button>
            <Button 
              type="button"
              variant="outline"
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full bg-transparent text-indigo-300 border-indigo-500 hover:bg-indigo-900/30 hover:text-indigo-200"
            >
              {isLoading ? "Loading..." : "REGISTER"}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-400 space-y-1">
            <p>Register a new account or use a demo account.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

