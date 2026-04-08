"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Wallet, Users, School, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Banknote, Clock 
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalCollected: 0,
    totalExpected: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: students, error: studentsError } = await supabase.from('students').select('annual_fee');
      if (studentsError) throw studentsError;
      const { count: classCount, error: classesError } = await supabase.from('classes').select('*', { count: 'exact', head: true });
      if (classesError) throw classesError;
      const { data: payments, error: paymentsError } = await supabase.from('payments').select('amount');
      if (paymentsError) throw paymentsError;

      const expected = students?.reduce((acc: number, s: any) => acc + Number(s.annual_fee || 0), 0) || 0;
      const collected = payments?.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) || 0;

      setStats({
        totalStudents: students?.length || 0,
        totalClasses: classCount || 0,
        totalCollected: collected,
        totalExpected: expected,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const remaining = stats.totalExpected - stats.totalCollected;
  const recoveryRate = stats.totalExpected > 0 ? Math.round((stats.totalCollected / stats.totalExpected) * 100) : 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Tableau de Bord</h1>
        <p className="text-slate-500 font-medium">Rapport global de l'établissement au {new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Élèves Inscrits" value={stats.totalStudents} icon={<Users />} color="bg-green-600" />
        <StatCard title="Classes" value={stats.totalClasses} icon={<School />} color="bg-indigo-600" />
        <StatCard title="Taux de Recouvrement" value={`${recoveryRate}%`} icon={<TrendingUp />} color="bg-emerald-500" />
        <StatCard title="Mois en cours" value="Mars" icon={<Clock />} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Total Encaissé</p>
              <h2 className="text-5xl font-black text-slate-950">
                {new Intl.NumberFormat('fr-FR').format(stats.totalCollected)} <span className="text-2xl text-slate-400 font-medium">FCFA</span>
              </h2>
            </div>
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Banknote size={32} />
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-500">Progression des objectifs</span>
              <span className="text-emerald-600">{recoveryRate}%</span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-1000" 
                style={{ width: `${recoveryRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-rose-500 p-10 rounded-[2.5rem] text-white shadow-xl shadow-rose-200 flex flex-col justify-between italic">
          <div>
            <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              <ArrowDownRight size={30} />
            </div>
            <p className="text-rose-100 font-bold text-xs uppercase tracking-widest mb-2">Reste à percevoir</p>
            <h2 className="text-4xl font-black">
              {new Intl.NumberFormat('fr-FR').format(remaining)} 
              <span className="text-lg block text-rose-200 font-medium mt-1 uppercase">FCFA dehors</span>
            </h2>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-sm font-medium opacity-80 underline underline-offset-4 cursor-pointer hover:opacity-100 transition">
              Voir la liste des impayés →
            </p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-100 p-6 rounded-3xl flex items-center gap-4">
        <div className="h-12 w-12 bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <ArrowUpRight size={24} />
        </div>
        <div>
            <h4 className="font-bold text-green-900 italic text-sm underline">Analyse IA :</h4>
            <p className="text-green-700 text-sm">Votre taux de recouvrement est de {recoveryRate}%. Pensez à relancer les parents pour les mensualités de Mars.</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-green-200 transition-all">
      <div className={`h-14 w-14 ${color} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
}
