"use client";

import { useState, useEffect, cloneElement } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Users, School, TrendingUp, Clock, 
  ArrowUpRight, ArrowDownRight, Banknote, 
  AlertTriangle, Calendar, UserCheck, ShieldAlert, Activity, DollarSign
} from 'lucide-react';

// Types
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  annual_fee: number;
  scolarite_totale: number;
  scolarite_payee: number;
  class_id: string;
}

interface Class {
  id: string;
  name: string;
  level?: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date?: string;
  created_at: string;
  student_id: string;
  month?: string;
}

interface Expense {
  id: string;
  amount: number;
  description?: string;
  category?: string;
  expense_date?: string;
}

interface DisciplineRecord {
  id: string;
  reason: string;
  severity: string;
  incident_date: string;
  student_id: string;
}

interface StudentInfo {
  fullName: string;
  className: string;
}

interface Debtor {
  id: string;
  name: string;
  className: string;
  debt: number;
  percentagePaid: number;
}

interface ClassDistribution {
  name: string;
  count: number;
}

interface EnrichedPayment {
  id: string;
  amount: number;
  created_at: string;
  studentName: string;
  className: string;
}

interface EnrichedIncident {
  id: string;
  reason: string;
  severity: string;
  date: string;
  studentName: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalTeachers: 0,
    totalCollected: 0,
    totalExpected: 0,
    totalExpenses: 0,
  });
  const [recentPayments, setRecentPayments] = useState<EnrichedPayment[]>([]);
  const [criticalDebtors, setCriticalDebtors] = useState<Debtor[]>([]);
  const [classDistribution, setClassDistribution] = useState<ClassDistribution[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<EnrichedIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  const formattedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📊 Début du chargement des données du dashboard...');

      // 1. Récupération des élèves
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, annual_fee, scolarite_totale, scolarite_payee, class_id');
      
      if (studentsError) {
        console.error('❌ Erreur students:', studentsError);
        throw studentsError;
      }
      console.log('✅ Élèves chargés:', students?.length);

      // 2. Récupération des classes
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, name, level');
      
      if (classesError) {
        console.error('❌ Erreur classes:', classesError);
        throw classesError;
      }
      console.log('✅ Classes chargées:', classes?.length);

      // 3. Récupération des enseignants
      const { count: teacherCount, error: teachersError } = await supabase
        .from('teachers')
        .select('id', { count: 'exact', head: true });

      if (teachersError) {
        console.error('❌ Erreur teachers:', teachersError);
      }
      console.log('✅ Nombre d\'enseignants:', teacherCount);

      // 4. Récupération des paiements (tous)
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, created_at, payment_date, student_id, month, description')
        .order('created_at', { ascending: false })
        .limit(20);

      if (paymentsError) {
        console.error('❌ Erreur payments:', paymentsError);
        throw paymentsError;
      }
      console.log('✅ Paiements chargés:', payments?.length);

      // 5. Récupération des dépenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('id, amount, description, category, expense_date')
        .limit(50);

      if (expensesError) {
        console.error('❌ Erreur expenses:', expensesError);
      }
      console.log('✅ Dépenses chargées:', expenses?.length);

      // 6. Récupération des incidents disciplinaires
      const { data: discipline, error: disciplineError } = await supabase
        .from('discipline')
        .select('id, reason, severity, incident_date, student_id')
        .order('incident_date', { ascending: false })
        .limit(10);

      if (disciplineError) {
        console.error('❌ Erreur discipline:', disciplineError);
      }
      console.log('✅ Incidents chargés:', discipline?.length);

      // --- TRAITEMENT DES MAPS EN MÉMOIRE ---
      const classMap: Record<string, string> = {};
      (classes as Class[] | null)?.forEach((c: Class) => {
        classMap[c.id] = c.name;
      });

      const studentMap: Record<string, StudentInfo> = {};
      (students as Student[] | null)?.forEach((s: Student) => {
        studentMap[s.id] = {
          fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Élève Sans Nom',
          className: classMap[s.class_id] || 'Sans classe'
        };
      });

      // Calculs financiers globaux
      let expected = 0;
      let collected = 0;

      (students as Student[] | null)?.forEach((s: Student) => {
        // Utiliser scolarite_totale en priorité, sinon annual_fee
        const studentTotal = Number(s.scolarite_totale) || Number(s.annual_fee) || 0;
        const studentPaid = Number(s.scolarite_payee) || 0;
        
        expected += studentTotal;
        collected += studentPaid;
      });

      console.log('💰 Total Attendu:', expected);
      console.log('💰 Total Collecté:', collected);

      const totalExp = (expenses as Expense[] | null)?.reduce(
        (acc: number, e: Expense) => acc + Number(e.amount || 0),
        0
      ) || 0;

      console.log('💰 Total Dépenses:', totalExp);

      // Top 5 des impayés critiques
      const debtors = ((students as Student[] | null) || [])
        .map((s: Student) => {
          const studentTotal = Number(s.scolarite_totale) || Number(s.annual_fee) || 0;
          const studentPaid = Number(s.scolarite_payee) || 0;
          const debt = studentTotal - studentPaid;
          const percentagePaid = studentTotal > 0 ? Math.round((studentPaid / studentTotal) * 100) : 0;

          return {
            id: s.id,
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
            className: classMap[s.class_id] || 'N/A',
            debt: debt,
            percentagePaid: percentagePaid
          };
        })
        .filter((s: Debtor) => s.debt > 0)
        .sort((a: Debtor, b: Debtor) => b.debt - a.debt)
        .slice(0, 5);

      console.log('⚠️ Impayés critiques:', debtors.length);

      // Répartition des effectifs par classe
      const distribution = ((classes as Class[] | null) || []).map((c: Class) => {
        const count = ((students as Student[] | null) || []).filter((s: Student) => s.class_id === c.id).length;
        return { name: c.name, count };
      });

      // Formatage des flux récents
      const enrichedPayments = ((payments as Payment[] | null) || [])
        .slice(0, 6)
        .map((p: Payment) => ({
          id: p.id,
          amount: p.amount,
          created_at: p.payment_date || p.created_at,
          studentName: studentMap[p.student_id]?.fullName || 'Élève Anonyme',
          className: studentMap[p.student_id]?.className || 'N/A'
        }));

      // Formatage incidents disciplinaires
      const enrichedIncidents = ((discipline as DisciplineRecord[] | null) || [])
        .slice(0, 5)
        .map((d: DisciplineRecord) => ({
          id: d.id,
          reason: d.reason,
          severity: d.severity,
          date: d.incident_date,
          studentName: studentMap[d.student_id]?.fullName || 'Élève'
        }));

      setStats({
        totalStudents: (students as Student[] | null)?.length || 0,
        totalClasses: (classes as Class[] | null)?.length || 0,
        totalTeachers: teacherCount || 0,
        totalCollected: Math.round(collected),
        totalExpected: Math.round(expected),
        totalExpenses: Math.round(totalExp)
      });
      setRecentPayments(enrichedPayments);
      setCriticalDebtors(debtors as Debtor[]);
      setClassDistribution(distribution);
      setRecentIncidents(enrichedIncidents);

      console.log('✅ Dashboard chargé avec succès!');

    } catch (error) {
      console.error('❌ Erreur lors du chargement du dashboard:', error);
      setError('Erreur lors du chargement des données. Vérifiez la console.');
    } finally {
      setLoading(false);
    }
  };

  const remaining = stats.totalExpected - stats.totalCollected;
  const recoveryRate = stats.totalExpected > 0 ? Math.round((stats.totalCollected / stats.totalExpected) * 100) : 0;
  const netCaisse = stats.totalCollected - stats.totalExpenses;

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Calcul des indicateurs métiers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-6">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <p className="text-sm font-bold text-slate-700 text-center mb-4">{error}</p>
        <button
          onClick={() => fetchDashboardData()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden px-1 py-2 sm:px-0 bg-slate-50/50">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">Vue d'Ensemble Établissement</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">Pilotage de la structure scolaire</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm self-start sm:self-center">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">{formattedMonth} {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Cartes Clés Réelles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Élèves Inscrits" value={stats.totalStudents} icon={<Users />} color="bg-green-600" />
        <StatCard title="Classes" value={stats.totalClasses} icon={<School />} color="bg-blue-600" />
        <StatCard title="Enseignants" value={stats.totalTeachers} icon={<UserCheck />} color="bg-purple-600" />
        <StatCard title="Taux Recouvrement" value={`${recoveryRate}%`} icon={<TrendingUp />} color="bg-emerald-500" />
      </div>

      {/* Vue Trésorerie Avancée */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Module Recettes Globales */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-100 pb-6">
            <div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Total Encaissé</p>
              <h2 className="text-2xl sm:text-4xl font-black text-emerald-600 tracking-tight">
                {new Intl.NumberFormat('fr-FR').format(stats.totalCollected)} <span className="text-sm font-medium text-slate-400">F</span>
              </h2>
              <p className="text-[10px] text-slate-500 mt-2">Collecté auprès des élèves</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Total Dépenses</p>
              <h2 className="text-2xl sm:text-4xl font-black text-rose-600 tracking-tight">
                {new Intl.NumberFormat('fr-FR').format(stats.totalExpenses)} <span className="text-sm font-medium text-slate-400">F</span>
              </h2>
              <p className="text-[10px] text-slate-500 mt-2">Dépenses enregistrées</p>
            </div>
          </div>

          <div className="pt-6 space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Trésorerie Disponible (Net)</p>
              <p className={`text-3xl font-black ${netCaisse >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {new Intl.NumberFormat('fr-FR').format(netCaisse)} F
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {netCaisse >= 0 ? '✅ Solde positif' : '⚠️ Déficit'}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl">
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-500">Objectif Annuel</span>
                <p className="text-sm font-black text-slate-700">
                  {new Intl.NumberFormat('fr-FR').format(stats.totalExpected)} F
                </p>
              </div>
              <div className="text-right">
                <div className="w-32 bg-slate-200 h-3 rounded-full overflow-hidden mb-1">
                  <div className="bg-emerald-500 h-full" style={{ width: `${recoveryRate}%` }}></div>
                </div>
                <p className="text-xs font-black text-emerald-600">{recoveryRate}% collecté</p>
              </div>
            </div>
          </div>
        </div>

        {/* Module Reste à Percevoir */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 sm:p-10 rounded-[2rem] text-white shadow-xl shadow-rose-200 flex flex-col justify-between">
          <div>
            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              <ArrowDownRight className="w-6 h-6" />
            </div>
            <p className="text-rose-100 font-bold text-xs uppercase tracking-widest mb-2">Solde à Recouvrer</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight break-words">
              {new Intl.NumberFormat('fr-FR').format(remaining)}
              <span className="text-sm block text-rose-200 font-medium mt-2 uppercase">F à recouvrer</span>
            </h2>
            <p className="text-rose-100 text-xs mt-4">
              Montant à collecter auprès des élèves
            </p>
          </div>
        </div>
      </div>

      {/* Modules de Listes Métiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Colonne 1 : Flux Récents */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-950 text-base">Flux Financiers</h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{recentPayments.length} flux</span>
            </div>
            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Aucun flux récent.</p>
              ) : (
                recentPayments.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex justify-between items-start text-xs hover:shadow-md transition-shadow">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{p.studentName}</p>
                      <p className="text-[10px] text-slate-500">{p.className}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className="font-black text-emerald-600 shrink-0 ml-2 text-sm">
                      +{new Intl.NumberFormat('fr-FR').format(p.amount)} F
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Colonne 2 : Impayés Critiques */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-950 text-base flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Alertes Recouvrement
              </h3>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{criticalDebtors.length}</span>
            </div>
            <div className="space-y-3">
              {criticalDebtors.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">✅ Excellent ! Aucun retard critique.</p>
              ) : (
                criticalDebtors.map((d) => (
                  <div key={d.id} className="p-3 rounded-xl border border-rose-100 bg-rose-50/30 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate text-xs">{d.name}</p>
                        <p className="text-[10px] text-slate-500">{d.className}</p>
                      </div>
                      <span className="font-black text-rose-600 shrink-0 ml-2 text-sm">
                        {new Intl.NumberFormat('fr-FR').format(d.debt)} F
                      </span>
                    </div>
                    <div className="w-full bg-rose-200 h-1.5 rounded-full overflow-hidden mb-1">
                      <div className="bg-emerald-500 h-full" style={{ width: `${d.percentagePaid}%` }} />
                    </div>
                    <p className="text-[9px] text-slate-500">{d.percentagePaid}% payé</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Colonne 3 : Vie Scolaire & Discipline */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-950 text-base flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-indigo-600" /> Suivi Disciplinaire
              </h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{recentIncidents.length}</span>
            </div>
            <div className="space-y-3">
              {recentIncidents.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">✅ Rien à signaler (discipline OK).</p>
              ) : (
                recentIncidents.map((i) => (
                  <div key={i.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-xs truncate flex-1">
                        {i.studentName}
                      </span>
                      <span
                        className={`text-[8px] px-1.5 py-0.5 rounded uppercase shrink-0 font-bold ${
                          i.severity === 'high' || i.severity === 'Grave'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {i.severity || 'Normal'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 line-clamp-2 mb-1">
                      {i.reason}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {new Date(i.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Distribution Globale Des Classes */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-black text-slate-950 text-base sm:text-lg">Cartographie des Effectifs</h3>
            <p className="text-slate-400 text-xs font-medium">Nombre d'étudiants enregistrés par section</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {classDistribution.length === 0 ? (
            <p className="text-xs font-medium text-slate-400 py-2 col-span-full">Aucune donnée de classe.</p>
          ) : (
            classDistribution.map((c, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <span className="text-xs font-bold text-slate-700 truncate">{c.name}</span>
                <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">{c.count} élèves</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
      <div className={`h-11 w-11 sm:h-12 sm:w-12 ${color} text-white rounded-xl flex items-center justify-center shadow-md shrink-0`}>
        {cloneElement(icon, { className: "w-5 h-5" })}
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">{title}</p>
        <p className="text-lg sm:text-2xl font-black text-slate-950 truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}
