"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { userService } from '@/services/firebase';
import { collection, getFirestore, query, where, getDocs } from 'firebase/firestore';
import app from '@/services/firebase';

const db = getFirestore(app);

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Login the user using Firebase Auth
      const userCredential = await userService.loginUser(email, password);
      const user = userCredential.user;

      // Check if user is an admin by querying the admins collection
      const adminRef = collection(db, 'admins');
      const q = query(adminRef, where("uid", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      const isAdmin = !querySnapshot.empty;

      // Redirect based on user role
      if (isAdmin) {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
      
    } catch (error) {
      console.error("Login error:", error);
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-md p-8 space-y-8">
        <div className="flex justify-center">
          <Image 
            src="/assets/logoKontia.png" 
            alt="Kontia Logo" 
            width={180} 
            height={60} 
            priority
          />
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
          
          <div className="text-sm text-right">
            <div className="flex justify-center">
              <a href="#" className="font-medium text-violet-600 hover:text-violet-500">
              ¿Olvidaste tu contraseña?
              </a>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 border border-transparent rounded-md text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>
        </form>
        
        <div className="text-sm text-center mt-6">
          <span className="text-gray-600">¿No tienes cuenta?</span>{' '}
          <a href="#" className="font-medium text-violet-600 hover:text-violet-500">
            Regístrate
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
