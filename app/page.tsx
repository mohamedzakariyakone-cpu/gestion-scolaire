"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (username.trim().toLowerCase() === 'administrateur' && password === 'oursins2026') {
      try { localStorage.setItem('isAuth', '1'); } catch (e) {}
      router.push('/dashboard');
    } else {
      setError('Identifiants invalides.');
    }
  };

  // Si déjà authentifié, redirige vers dashboard
  useEffect(() => {
    try {
      if (localStorage.getItem('isAuth') === '1') router.push('/dashboard');
    } catch (e) {}
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl">
        <h1 className="text-2xl font-black mb-2">Connexion</h1>
        <p className="text-sm text-slate-500 mb-6">Entrez les identifiants administrateur pour accéder au tableau de bord.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Utilisateur</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full mt-2 p-3 rounded-xl border border-slate-100 outline-none" placeholder="administrateur" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-2 p-3 rounded-xl border border-slate-100 outline-none" placeholder="••••••••" />
          </div>

          {error && <div className="text-rose-600 text-sm font-bold">{error}</div>}

          <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black">Se connecter</button>
        </form>
      </div>
    </div>
  );
}