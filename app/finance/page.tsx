'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import NumericInput from '@/components/NumericInput';
import {
  Target, Loader2, MessageSquare, Search, BellRing, AlertTriangle,
  Zap, Users, Landmark, ArrowUpRight, PieChart
} from 'lucide-react';

// --- Composants UI Internes Optimisés ---

const GlassCard = ({ children, title, icon: Icon, className = "" }: { children: React.ReactNode, title?: string, icon?: React.ElementType, className?: string }) => (
  <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all w-full ${className}`}>
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">{title}</h3>
      {Icon && <div className="p-2 bg-slate-50 rounded-xl text-slate-900"><Icon size={16} /></div>}
    </div>
    {children}
  </div>
);

const ProgressBar = ({ progress, color = "bg-indigo-600" }: { progress: number, color?: string }) => (
  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
    <div 
      className={`h-full transition-all duration-1000 ${color}`} 
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} 
    />
  </div>
);

interface Payment {
  amount?: string | number;
  created_at: string;
}

interface ClassRelation {
  name?: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  parent_phone?: string;
  annual_fee?: string | number;
  payment_plan_tranches?: string | number;
  payments?: Payment[];
  classes?: ClassRelation | ClassRelation[];
}

interface Expense {
  id?: string;
  amount?: string | number;
  created_at?: string;
  description?: string;
}

interface Settings {
  current_month_index?: number;
}

interface ProcessedStudent extends Student {
  totalPaid: number;
  className: string;
  annual_fee: number;
}

interface ClassPerformance {
  name: string;
  percent: number;
}

interface Analytics {
  totalPotential: number;
  collected: number;
  expectedMonth: number;
  collectedMonth: number;
  healthScore: number;
  runway: number;
  classPerformance: ClassPerformance[];
  processedStudents: ProcessedStudent[];
}

// --- Composant Principal ---

export default function CFODashboardUltraResponsive() {
  const [students, setStudents] = useState<Student[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sData, error: sErr } = await supabase.from('school_settings').select('*').eq('id', 1).single();
      if (sErr) throw sErr;
      setSettings(sData);

      const { data: stData, error: stErr } = await supabase
        .from('students')
        .select('*, payments(amount, created_at), classes(name)');
      if (stErr) throw stErr;

      const { data: exData, error: exErr } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (exErr) throw exErr;

      setStudents((stData as Student[]) || []);
      setExpenses((exData as Expense[]) || []);
    } catch (err: unknown) {
      console.error("Erreur de chargement:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const analytics = useMemo(() => {
    if (!students.length || !settings) return { 
      totalPotential: 0, collected: 0, expectedMonth: 0, 
      collectedMonth: 0, healthScore: 0, runway: 0,
      classPerformance: [], processedStudents: []
    };

    const now = new Date();
    const currentMonth = settings?.current_month_index || (now.getMonth() + 1);
    
    let totalPotential = 0;
    let collected = 0;
    let expectedMonth = 0;
    let collectedMonth = 0;

    const classStats: Record<string, { total: number; paid: number }> = {};

    const processedStudents: ProcessedStudent[] = students.map((s) => {
      const fee = Number(s.annual_fee) || 0;
      const pays = s.payments || [];
      const totalPaid = pays.reduce((sum: number, p: Payment) => sum + (Number(p.amount) || 0), 0);
      const className = Array.isArray(s.classes) ? (s.classes[0]?.name || "Sans Classe") : (s.classes?.name || "Sans Classe");
      
      totalPotential += fee;
      collected += Math.min(totalPaid, fee);

      const tranches = Number(s.payment_plan_tranches) || 1;
      if (tranches === 9 && currentMonth <= 9) expectedMonth += (fee / 9);
      else if (tranches === 3 && [1, 5, 9].includes(currentMonth)) expectedMonth += (fee / 3);

      const paidMonth = pays.filter((p: Payment) => {
        const d = new Date(p.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((sum: number, p: Payment) => sum + (Number(p.amount) || 0), 0);
      collectedMonth += paidMonth;

      if (!classStats[className]) classStats[className] = { total: 0, paid: 0 };
      classStats[className].total += fee;
      classStats[className].paid += totalPaid;

      return { ...s, totalPaid, className, annual_fee: fee };
    });

    const totalExp = expenses.reduce((sum: number, e: Expense) => sum + (Number(e.amount) || 0), 0);
    const burnRate = expenses.length > 0 ? totalExp / 6 : 1; 
    const runway = (collected - totalExp) / (burnRate || 1);

    return {
      totalPotential,
      collected,
      expectedMonth,
      collectedMonth,
      runway: Math.max(0, runway),
      healthScore: Math.round((collected / totalPotential) * 100) || 0,
      classPerformance: Object.entries(classStats).map(([name, stats]) => ({
        name,
        percent: Math.round((stats.paid / stats.total) * 100) || 0
      })).sort((a, b) => b.percent - a.percent),
      processedStudents
    } as Analytics;
  }, [students, expenses, settings]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc || !expAmount) return;
    const { error } = await supabase.from('expenses').insert([{ 
      description: expDesc, 
      amount: parseFloat(expAmount) 
    }]);
    if (!error) {
      setExpDesc('');
      setExpAmount('');
      fetchData();
    }
  };

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden pb-10">
      
      {/* Conteneur principal avec marges adaptatives */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Header - S'empile sur mobile */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="w-full md:w-auto">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="text-indigo-600" size={16} fill="currentColor" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">CFO Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 uppercase italic leading-tight">
              Intelligence <span className="text-indigo-600">Financière</span>
            </h1>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={fetchData} className="flex-1 md:flex-none px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-lg text-center">
              Actualiser
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl text-xs font-bold mb-6 flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* GRILLE PRINCIPALE - 1 colonne mobile / 12 colonnes desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* KPIs - S'empilent verticalement sur mobile */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col items-center justify-center shadow-xl w-full">
              <div className="text-5xl font-black italic text-green-400">{analytics.healthScore}%</div>
              <div className="text-[10px] font-bold uppercase mt-2 opacity-50 tracking-widest">Santé Financière</div>
              <ProgressBar progress={analytics.healthScore} color="bg-green-400" />
            </div>
            
            <GlassCard title="Autonomie (Runway)" icon={Landmark}>
              <div className="text-2xl font-black italic text-slate-900">{analytics.runway.toFixed(1)} <span className="text-xs uppercase">Mois</span></div>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic">Survie estimée</p>
            </GlassCard>

            <GlassCard title="Potentiel Annuel" icon={Target}>
              <div className="text-xl font-black italic text-slate-900">{analytics.totalPotential.toLocaleString()} F</div>
              <ProgressBar progress={(analytics.collected / analytics.totalPotential) * 100} color="bg-green-500" />
              <p className="text-[9px] font-black uppercase text-green-600 mt-2">Encaissé: {analytics.collected.toLocaleString()} F</p>
            </GlassCard>
          </div>

          {/* CENTRE - Flux & Performance */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            {/* 2 Colonnes sur tablette/desktop, 1 sur mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Collecte Mois</p>
                <div className="text-2xl font-black italic text-slate-900">{analytics.collectedMonth.toLocaleString()} F</div>
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-green-600">
                  <ArrowUpRight size={14} /> {Math.round((analytics.collectedMonth / analytics.expectedMonth) * 100 || 0)}% atteint
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Objectif Mois</p>
                <div className="text-2xl font-black italic text-slate-900">{analytics.expectedMonth.toLocaleString()} F</div>
                <div className="mt-2 text-[10px] font-bold text-slate-400 italic">Basé sur les plans</div>
              </div>
            </div>

            <GlassCard title="Performance par Classe" icon={Users}>
              <div className="space-y-4">
                {analytics.classPerformance.slice(0, 4).map((c: ClassPerformance, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-16 text-[9px] font-black text-slate-900 uppercase truncate">{c.name}</div>
                    <div className="flex-1"><ProgressBar progress={c.percent} color={c.percent > 70 ? "bg-green-500" : "bg-indigo-500"} /></div>
                    <div className="w-8 text-[9px] font-black text-slate-400 text-right">{c.percent}%</div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-black italic uppercase mb-1">Relances</h3>
                <p className="text-indigo-100 text-[10px] mb-4 opacity-80">Contactez les parents en retard via WhatsApp.</p>
                <button className="w-full sm:w-auto px-6 py-3 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase">
                  Ouvrir WhatsApp
                </button>
              </div>
              <BellRing className="absolute right-[-10px] bottom-[-10px] text-white opacity-10" size={100} />
            </div>
          </div>

          {/* DROITE - Dépenses */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 italic tracking-widest">Nouvelle Sortie</h3>
              <form onSubmit={handleAddExpense} className="space-y-3">
                <input 
                  type="text" placeholder="Motif..."
                  className="w-full p-3 bg-slate-50 rounded-xl border-none text-xs font-bold outline-none focus:ring-1 ring-indigo-500"
                  value={expDesc} onChange={(e) => setExpDesc(e.target.value)}
                />
                <NumericInput
                  placeholder="Montant"
                  className="w-full p-3 bg-slate-50 rounded-xl border-none text-xs font-black text-rose-600 outline-none"
                  value={expAmount === '' ? undefined : Number(expAmount)}
                  onChange={(v) => setExpAmount(v === null || v === undefined ? '' : String(v))}
                />
                <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">
                  Enregistrer
                </button>
              </form>
            </div>

            <GlassCard title="Audit Dépenses" icon={PieChart}>
              <div className="space-y-3">
                {expenses.slice(0, 3).map((ex, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-bold text-slate-600 uppercase truncate w-24 italic">{ex.description}</span>
                    <span className="text-[10px] font-black text-rose-500">-{Number(ex.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* TABLEAU - mobile-first et responsive */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm w-full">
          <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <h3 className="text-lg font-black italic uppercase text-slate-900">Registre Financier</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border-none text-xs font-bold outline-none"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Vue mobile en cartes */}
          <div className="sm:hidden space-y-3 p-4">
            {analytics.processedStudents
              .filter((s: ProcessedStudent) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((s: ProcessedStudent) => (
                <div key={s.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="text-sm font-black uppercase tracking-wider text-slate-900">{s.last_name} {s.first_name}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{s.parent_phone || 'Téléphone indisponible'}</div>
                    </div>
                    <button 
                      onClick={() => {
                        const msg = encodeURIComponent(`Bonjour, rappel pour la scolarité de ${s.first_name}. Reste: ${(s.annual_fee - s.totalPaid).toLocaleString()} F.`);
                        window.open(`https://wa.me/${s.parent_phone?.replace(/\D/g,'')}?text=${msg}`, '_blank');
                      }}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"
                    >
                      <MessageSquare size={16} />
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white rounded-2xl p-3 border border-slate-100">
                      <div className="font-black text-slate-900">Classe</div>
                      <div className="text-slate-500 mt-1 uppercase tracking-widest text-[9px]">{s.className}</div>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-slate-100">
                      <div className="font-black text-slate-900">Payé</div>
                      <div className="text-green-600 font-black mt-1">{s.totalPaid.toLocaleString()} F</div>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-slate-100 col-span-2">
                      <div className="font-black text-slate-900">Solde</div>
                      <div className={`mt-1 font-black ${s.annual_fee - s.totalPaid > 0 ? 'text-rose-500' : 'text-green-500'}`}>
                        {(s.annual_fee - s.totalPaid).toLocaleString()} F
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Vue desktop/tablette */}
          <div className="hidden sm:block w-full overflow-x-auto">
            <table className="w-full text-left min-w-full">
              <thead>
                <tr className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                  <th className="px-4 py-4">Élève</th>
                  <th className="px-4 py-4">Classe</th>
                  <th className="px-4 py-4">Payé</th>
                  <th className="px-4 py-4">Solde</th>
                  <th className="px-4 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {analytics.processedStudents
            .filter((s: ProcessedStudent) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((s: ProcessedStudent) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-4 py-4">
                        <div className="text-[10px] font-black text-slate-900 uppercase italic">{s.last_name} {s.first_name}</div>
                        <div className="text-[8px] font-bold text-slate-400">{s.parent_phone}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-600 uppercase">{s.className}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-[10px] font-black text-green-600">{s.totalPaid.toLocaleString()} F</div>
                        <div className="text-[7px] font-bold text-slate-300 italic">{Math.round((s.totalPaid/s.annual_fee)*100 || 0)}%</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-[10px] font-black ${s.annual_fee - s.totalPaid > 0 ? 'text-rose-500' : 'text-green-500'}`}>
                          {(s.annual_fee - s.totalPaid).toLocaleString()} F
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={() => {
                            const msg = encodeURIComponent(`Bonjour, rappel pour la scolarité de ${s.first_name}. Reste: ${(s.annual_fee - s.totalPaid).toLocaleString()} F.`);
                            window.open(`https://wa.me/${s.parent_phone?.replace(/\D/g,'')}?text=${msg}`, '_blank');
                          }}
                          className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"
                        >
                          <MessageSquare size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
