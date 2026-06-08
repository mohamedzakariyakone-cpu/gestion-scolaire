"use client";

import { useState, useEffect, cloneElement } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Users, School, TrendingUp, Clock, 
  ArrowUpRight, ArrowDownRight, Banknote, 
  AlertTriangle, Calendar, UserCheck, ShieldAlert, Activity, DollarSign
} from 'lucide-react';

// Types basés sur le schéma réel
interface Class {
  id: string;
  name: string;
  level: string;
  created_at: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  annual_fee: number;
  class_id: string;
  scolarite_totale: number;
  scolarite_payee: number;
  dernier_paiement: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  month: string;
  created_at: string;
  description?: string;
}

interface DisciplineRecord {
  id: string;
  student_id: string;
  reason: string;
  severity: string;
  incident_date: string;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialty: string;
  status: string;
  salary: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  created_at: string;
}

interface SchoolSettings {
  school_name: string;
  current_academic_year: string;
  current_month_index: number;
}

interface StudentInfo {
  fullName: string;
  className: string;
}

interface Debtor {
  id: string;
  name: string;
  className: string;
  totalDebt: number;
  percentagePaid: number;
}

interface ClassDistribution {
  name: string;
  level: string;
  count: number;
}

interface EnrichedPayment {
  id: string;
  amount: number;
  payment_date: string;
  studentName: string;
  className: string;
  month: string;
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
    netCaisse: 0,
  });
  const [recentPayments, setRecentPayments] = useState<EnrichedPayment[]>([]);
  const [criticalDebtors, setCriticalDebtors] = useState<Debtor[]>([]);
  const [classDistribution, setClassDistribution] = useState<ClassDistribution[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<EnrichedIncident[]>([]);
  const [schoolName, setSchoolName] = useState('École');
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
      // 1. Récupération des paramètres école
      const { data: settings } = await supabase
        .from('school_settings')
        .select('school_name, current_academic_year, current_month_index')
        .single();

      if (settings?.school_name) {
        setSchoolName(settings.school_name);
      }

      // 2. Récupération des élèves
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, annual_fee, class_id, scolarite_totale, scolarite_payee, dernier_paiement')
        .order('created_at', { ascending: false });

      if (studentsError) throw studentsError;

      // 3. Récupération des classes
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, name, level')
        .order('name');

      if (classesError) throw classesError;

      // 4. Récupération des enseignants
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, email, specialty, status');

      if (teachersError) throw teachersError;

      // 5. Récupération des paiements récents (derniers 10 jours)
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, student_id, amount, payment_date, month, created_at, description')
        .gte('created_at', tenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (paymentsError) throw paymentsError;

      // 6. Récupération des dépenses du mois
      const startMonth = new Date();
      startMonth.setDate(1);

      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('id, description, amount, category, expense_date')
        .gte('expense_date', startMonth.toISOString().split('T')[0])
        .order('expense_date', { ascending: false });

      if (expensesError) throw expensesError;

      // 7. Récupération des incidents disciplinaires récents (30 derniers jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: discipline, error: disciplineError } = await supabase
        .from('discipline')
        .select('id, student_id, reason, severity, incident_date')
        .gte('incident_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('incident_date', { ascending: false })
        .limit(5);

      if (disciplineError) throw disciplineError;

      // --- TRAITEMENT DES MAPS EN MÉMOIRE ---
      const classMap: Record<string, { name: string; level: string }> = {};
      (classes as Class[] | null)?.forEach((c: Class) => {
        classMap[c.id] = { name: c.name, level: c.level };
      });

      const studentMap: Record<string, StudentInfo> = {};
      (students as Student[] | null)?.forEach((s: Student) => {
        studentMap[s.id] = {
          fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Élève Sans Nom',
          className: classMap[s.class_id]?.name || 'Sans classe',
        };
      });

      // Calculs financiers globaux
      const totalExpected =
        (students as Student[] | null)?.reduce(
          (acc: number, s: Student) => acc + Number(s.scolarite_totale || s.annual_fee || 0),
          0
        ) || 0;

      const totalCollected =
        (students as Student[] | null)?.reduce(
          (acc: number, s: Student) => acc + Number(s.scolarite_payee || 0),
          0
        ) || 0;

      const totalExp =
        (expenses as Expense[] | null)?.reduce(
          (acc: number, e: Expense) => acc + Number(e.amount || 0),
          0
        ) || 0;

      const netCaisse = totalCollected - totalExp;

      // Top 5 des impayés critiques (les plus endettés)
      const debtors = ((students as Student[] | null) || [])
        .map((s: Student) => {
          const total = Number(s.scolarite_totale || s.annual_fee || 0);
          const paid = Number(s.scolarite_payee || 0);
          const debt = total - paid;
          const percentagePaid = total > 0 ? Math.round((paid / total) * 100) : 0;

          return {
            id: s.id,
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
            className: classMap[s.class_id]?.name || 'N/A',
            totalDebt: debt,
            percentagePaid: percentagePaid,
          };
        })
        .filter((s: Debtor) => s.totalDebt > 0)
        .sort((a: Debtor, b: Debtor) => b.totalDebt - a.totalDebt)
        .slice(0, 5);

      // Répartition des effectifs par classe
      const distribution = ((classes as Class[] | null) || [])
        .map((c: Class) => {
          const count = ((students as Student[] | null) || []).filter(
            (s: Student) => s.class_id === c.id
          ).length;
          return { name: c.name, level: c.level, count };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      // Formatage des flux récents (derniers 6 paiements)
      const enrichedPayments = ((payments as Payment[] | null) || [])
        .slice(0, 6)
        .map((p: Payment) => ({
          id: p.id,
          amount: p.amount,
          payment_date: p.payment_date || p.created_at,
          studentName: studentMap[p.student_id]?.fullName || 'Élève Anonyme',
          className: studentMap[p.student_id]?.className || 'N/A',
          month: p.month || 'N/A',
        }));

      // Formatage incidents disciplinaires
      const enrichedIncidents = ((discipline as DisciplineRecord[] | null) || [])
        .map((d: DisciplineRecord) => ({
          id: d.id,
          reason: d.reason,
          severity: d.severity,
          date: d.incident_date,
          studentName: studentMap[d.student_id]?.fullName || 'Élève',
        }));

      setStats({
        totalStudents: (students as Student[] | null)?.length || 0,
        totalClasses: (classes as Class[] | null)?.length || 0,
        totalTeachers: (teachers as Teacher[] | null)?.length || 0,
        totalCollected: Math.round(totalCollected),
        totalExpected: Math.round(totalExpected),
        totalExpenses: Math.round(totalExp),
        netCaisse: Math.round(netCaisse),
      });
      setRecentPayments(enrichedPayments);
      setCriticalDebtors(debtors as Debtor[]);
      setClassDistribution(distribution);
      setRecentIncidents(enrichedIncidents);

    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const remaining = stats.totalExpected - stats.totalCollected;
  const recoveryRate =
    stats.totalExpected > 0
      ? Math.round((stats.totalCollected / stats.totalExpected) * 100)
      : 0;

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Chargement des données en temps réel...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-6">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <p className="text-sm font-bold text-slate-700 text-center">{error}</p>
        <button
          onClick={() => fetchDashboardData()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
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
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {schoolName}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">
            Tableau de Bord - Vue d'Ensemble
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm self-start sm:self-center">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">{formattedMonth} {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Cartes Clés Réelles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Élèves Inscrits"
          value={stats.totalStudents}
          icon={<Users />}
          color="bg-green-600"
        />
        <StatCard
          title="Classes"
          value={stats.totalClasses}
          icon={<School />}
          color="bg-blue-600"
        />
        <StatCard
          title="Enseignants"
          value={stats.totalTeachers}
          icon={<UserCheck />}
          color="bg-purple-600"
        />
        <StatCard
          title="Taux Recouvrement"
          value={`${recoveryRate}%`}
          icon={<TrendingUp />}
          color="bg-emerald-500"
        />
      </div>

      {/* Vue Trésorerie Avancée */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Module Recettes Globales */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-100 pb-6">
            <div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">
                Total Encaissé
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
                {new Intl.NumberFormat('fr-FR').format(stats.totalCollected)}{' '}
                <span className="text-sm font-medium text-slate-400">F</span>
              </h2>
            </div>
            <div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">
                Total Dépenses
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-rose-600 tracking-tight">
                {new Intl.NumberFormat('fr-FR').format(stats.totalExpenses)}{' '}
                <span className="text-sm font-medium text-rose-300">F</span>
              </h2>
            </div>
          </div>

          <div className="pt-6 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Trésorerie Nette
              </p>
              <p
                className={`text-2xl font-black ${
                  stats.netCaisse >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {new Intl.NumberFormat('fr-FR').format(stats.netCaisse)} F
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500">
                Objectif Annuel
              </span>
              <p className="text-sm font-black text-slate-700 mb-2">
                {new Intl.NumberFormat('fr-FR').format(stats.totalExpected)} F
              </p>
              <div className="w-40 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${recoveryRate}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{recoveryRate}% collecté</p>
            </div>
          </div>
        </div>

        {/* Module Reste à Percevoir */}
        <div className="bg-rose-500 p-6 sm:p-10 rounded-[2rem] text-white shadow-xl shadow-rose-200 flex flex-col justify-between">
          <div>
            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              <ArrowDownRight className="w-6 h-6" />
            </div>
            <p className="text-rose-100 font-bold text-xs uppercase tracking-widest mb-2">
              Solde à Recouvrer
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight break-words">
              {new Intl.NumberFormat('fr-FR').format(remaining)}
              <span className="text-sm block text-rose-200 font-medium mt-2 uppercase">
                F à recouvrer
              </span>
            </h2>
          </div>
        </div>
      </div>

      {/* Modules de Listes Métiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Colonne 1 : Flux Récents */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-950 text-base">Derniers Paiements</h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {recentPayments.length} flux
              </span>
            </div>
            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Aucun paiement récent.</p>
              ) : (
                recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100/50 flex justify-between items-start text-xs hover:bg-emerald-50/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{p.studentName}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(p.payment_date).toLocaleDateString('fr-FR')} • {p.month}
                      </p>
                    </div>
                    <span className="font-black text-emerald-600 shrink-0 ml-2">
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
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Impayés Critiques
              </h3>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                {criticalDebtors.length}
              </span>
            </div>
            <div className="space-y-3">
              {criticalDebtors.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Excellent ! Aucun retard.</p>
              ) : (
                criticalDebtors.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl border border-rose-100 bg-rose-50/20 hover:bg-rose-50/40 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate text-xs">{d.name}</p>
                        <p className="text-[10px] text-slate-500">{d.className}</p>
                      </div>
                      <span className="font-black text-rose-600 shrink-0 ml-2 text-xs">
                        {new Intl.NumberFormat('fr-FR').format(d.totalDebt)} F
                      </span>
                    </div>
                    <div className="w-full bg-rose-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${d.percentagePaid}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1">{d.percentagePaid}% payé</p>
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
                <ShieldAlert className="w-4 h-4 text-indigo-600" /> Incidents Récents
              </h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {recentIncidents.length}
              </span>
            </div>
            <div className="space-y-3">
              {recentIncidents.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Aucun incident signalé.</p>
              ) : (
                recentIncidents.map((i) => (
                  <div
                    key={i.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-amber-50/30 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-xs truncate flex-1">
                        {i.studentName}
                      </span>
                      <span
                        className={`text-[8px] px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          i.severity === 'high' || i.severity === 'Grave'
                            ? 'bg-rose-100 text-rose-700 font-bold'
                            : 'bg-amber-100 text-amber-700 font-bold'
                        }`}
                      >
                        {i.severity || 'Normal'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 line-clamp-2">
                      {i.reason}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1">
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
            <h3 className="font-black text-slate-950 text-base sm:text-lg">
              Répartition par Classe
            </h3>
            <p className="text-slate-400 text-xs font-medium">
              Effectifs actuels par section
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classDistribution.length === 0 ? (
            <p className="text-xs font-medium text-slate-400 py-2 col-span-full">
              Aucune classe enregistrée.
            </p>
          ) : (
            classDistribution.map((c, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold text-slate-700">{c.name}</p>
                    <p className="text-[10px] text-slate-500">{c.level}</p>
                  </div>
                  <div className="text-2xl font-black text-indigo-600">{c.count}</div>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full"
                    style={{
                      width: `${
                        stats.totalStudents > 0
                          ? (c.count / stats.totalStudents) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-[9px] text-slate-500 mt-1">
                  {stats.totalStudents > 0
                    ? Math.round((c.count / stats.totalStudents) * 100)
                    : 0}
                  % des élèves
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Statistiques Rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            Manquants
          </p>
          <p className="text-xl sm:text-2xl font-black text-slate-900">
            {new Intl.NumberFormat('fr-FR').format(remaining)} F
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            Taux Collecte
          </p>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">
            {recoveryRate}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            Dettes Critiques
          </p>
          <p className="text-xl sm:text-2xl font-black text-rose-600">
            {criticalDebtors.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            Incidents (30j)
          </p>
          <p className="text-xl sm:text-2xl font-black text-indigo-600">
            {recentIncidents.length}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
      <div
        className={`h-11 w-11 sm:h-12 sm:w-12 ${color} text-white rounded-xl flex items-center justify-center shadow-md shrink-0`}
      >
        {cloneElement(icon, { className: 'w-5 h-5' })}
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">
          {title}
        </p>
        <p className="text-lg sm:text-2xl font-black text-slate-950 truncate mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}
