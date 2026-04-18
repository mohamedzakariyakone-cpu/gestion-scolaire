"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Trophy, AlertTriangle, TrendingUp, Users, 
  BookOpen, Target, Loader2, Award, Star, Search
} from 'lucide-react';

export default function PerformancePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-500 font-bold">Chargement du rapport...</div>}>
      <PerformanceContent />
    </Suspense>
  );
}

function PerformanceContent() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  
  // Utilisation du libellé exact de ta base de données pour l'état initial
  const [period, setPeriod] = useState('1er Trimestre'); 

  // Liste exacte de tes périodes (copiée de ton code)
  const allPeriods = [
    "1er Trimestre", "2e Trimestre", "3e Trimestre", "Examen Final",
    "composition du mois de janvier", "composition du mois de fevrier",
    "composition du mois de mars", "composition du mois d'avril",
    "composition du mois mai", "composition du mois de juin",
    "composition du mois de juillet", "compositin du mois d'aout",
    "composition du mois de septembre", "composition du mois d'octobre"
  ];

  const fetchPerformanceData = useCallback(async () => {
    setLoading(true);
    try {
      // Requête avec jointures
      const { data: grades, error } = await supabase
        .from('student_grades')
        .select(`
          grade_value,
          subject_name,
          period,
          students (
            id, 
            first_name, 
            last_name, 
            classes (name)
          )
        `)
        .eq('period', period);

      if (error) throw error;

      if (!grades || grades.length === 0) {
        setStats(null);
        return;
      }

      const studentMetrics: any = {};
      const subjectMajors: any = {};

      grades.forEach((g: any) => {
        if (!g.students) return;

        const sId = g.students.id;
        const studentName = `${g.students.first_name} ${g.students.last_name}`;
        const className = g.students.classes?.name || "N/A";

        if (!studentMetrics[sId]) {
          studentMetrics[sId] = { name: studentName, className, total: 0, count: 0 };
        }
        studentMetrics[sId].total += g.grade_value;
        studentMetrics[sId].count += 1;

        if (!subjectMajors[g.subject_name] || g.grade_value > subjectMajors[g.subject_name].score) {
          subjectMajors[g.subject_name] = {
            score: g.grade_value,
            studentName: studentName
          };
        }
      });

      const processedStudents = Object.values(studentMetrics).map((s: any) => ({
        ...s,
        average: s.total / s.count
      }));

      const haveAvg = processedStudents.filter((s: any) => s.average >= 10);
      const noAvg = processedStudents.filter((s: any) => s.average < 10);
      const top10 = [...processedStudents].sort((a, b) => b.average - a.average).slice(0, 10);
      const flop10 = [...processedStudents].sort((a, b) => a.average - b.average).slice(0, 10);

      const classStats: any = {};
      processedStudents.forEach((s: any) => {
        if (!classStats[s.className]) classStats[s.className] = { admit: 0, fail: 0 };
        if (s.average >= 10) classStats[s.className].admit++;
        else classStats[s.className].fail++;
      });

      setStats({
        global: { total: processedStudents.length, admit: haveAvg.length, fail: noAvg.length },
        top10,
        flop10,
        classStats,
        subjectMajors
      });

    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchPerformanceData(); }, [fetchPerformanceData]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10 bg-[#f8fafc]">
      
      {/* HEADER AVEC SELECT DE PÉRIODE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-slate-950">Rapport de Performance</h1>
          <p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-widest flex items-center gap-2">
            <Target size={14} className="text-green-600" /> Analyse académique en temps réel
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl appearance-none font-black text-slate-700 focus:border-green-500 outline-none transition-all cursor-pointer text-sm"
          >
            {allPeriods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col h-96 items-center justify-center gap-4">
          <Loader2 className="animate-spin text-green-600" size={48} />
          <p className="font-black text-slate-400 uppercase text-xs tracking-widest animate-pulse">Calcul des moyennes...</p>
        </div>
      ) : !stats ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold italic text-xl">Aucune note enregistrée pour "{period}"</p>
        </div>
      ) : (
        <>
          {/* STATS GLOBALES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4"><Users /></div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Effectif Évalué</p>
                <h3 className="text-4xl font-black text-slate-900">{stats.global.total}</h3>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-4"><Award /></div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Admis (≥ 10)</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-slate-900">{stats.global.admit}</h3>
                    <span className="text-emerald-600 font-bold text-sm">({((stats.global.admit/stats.global.total)*100).toFixed(0)}%)</span>
                </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white mb-4"><AlertTriangle /></div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Échecs (&lt; 10)</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-slate-900">{stats.global.fail}</h3>
                    <span className="text-rose-600 font-bold text-sm">({((stats.global.fail/stats.global.total)*100).toFixed(0)}%)</span>
                </div>
            </div>
          </div>

          {/* TOP & FLOP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <RankingCard title="Top 10 - Excellence" data={stats.top10} color="emerald" icon={<Trophy />} />
            <RankingCard title="Top 10 - Soutien" data={stats.flop10} color="rose" icon={<AlertTriangle />} />
          </div>

          {/* MAJORS */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Star className="text-amber-500 fill-amber-500" /> Meilleurs par Matière
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(stats.subjectMajors).map(([subject, data]: any) => (
                <div key={subject} className="bg-white p-6 rounded-[2rem] border border-slate-100 text-center hover:scale-105 transition-transform shadow-sm">
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-2">{subject}</p>
                  <p className="font-black text-slate-900 text-sm mb-3">{data.studentName}</p>
                  <span className="bg-amber-100 text-amber-700 px-4 py-1 rounded-full font-black text-xs">{data.score}/20</span>
                </div>
              ))}
            </div>
          </div>

          {/* CLASSES TAUX DE REUSSITE */}
          <div className="bg-slate-900 p-10 md:p-16 rounded-[4rem] text-white">
            <h2 className="text-3xl font-black italic mb-12">Performance par Classe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Object.entries(stats.classStats).map(([name, data]: any) => {
                const percent = Math.round((data.admit / (data.admit + data.fail)) * 100);
                return (
                  <div key={name} className="bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-700">
                    <p className="text-slate-500 text-[10px] font-black uppercase mb-4 tracking-widest">{name}</p>
                    <div className="flex justify-between items-end mb-4">
                      <span className="text-5xl font-black tracking-tighter">{percent}%</span>
                      <span className="text-green-400 font-bold text-xs uppercase mb-2">Succès</span>
                    </div>
                    <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="flex justify-between mt-6 text-[10px] font-black uppercase tracking-tighter">
                      <span className="text-slate-400">{data.admit} Admis</span>
                      <span className="text-slate-400">{data.fail} Échecs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RankingCard({ title, data, color, icon }: any) {
  const isEmerald = color === 'emerald';
  return (
    <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className={`p-3 rounded-2xl ${isEmerald ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{icon}</div>
        <h2 className="text-xl font-black italic text-slate-900">{title}</h2>
      </div>
      <div className="space-y-3">
        {data.map((s: any, i: number) => (
          <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border-l-4 ${isEmerald ? 'bg-emerald-50/30 border-emerald-500' : 'bg-rose-50/30 border-rose-500'}`}>
            <div className="flex items-center gap-4">
              <span className={`font-black text-sm ${isEmerald ? 'text-emerald-600' : 'text-rose-600'}`}>#{i+1}</span>
              <div>
                <p className="font-black text-slate-900 text-sm">{s.name}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">{s.className}</p>
              </div>
            </div>
            <span className={`px-4 py-1 rounded-xl font-black text-sm bg-white shadow-sm border ${isEmerald ? 'text-emerald-600 border-emerald-100' : 'text-rose-600 border-rose-100'}`}>
              {s.average.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}