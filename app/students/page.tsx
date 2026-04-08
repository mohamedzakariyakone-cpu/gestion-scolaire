"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import {
  Users, UserPlus, Search, ArrowUpRight,
  Loader2, Phone, MapPin, Calendar as CalendarIcon, GraduationCap, X, Trash2
} from 'lucide-react';
import Link from 'next/link';
import NumericInput from '@/components/NumericInput';

// --- Composant Principal avec Suspense ---
// Important : useSearchParams() dans un composant enfant nécessite Suspense pour le rendu côté serveur
export default function StudentsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-20 text-slate-500 gap-4">
        <Loader2 className="animate-spin text-green-600" size={40} />
        <p className="font-bold animate-pulse">Chargement du registre...</p>
      </div>
    }>
      <StudentsPageContent />
    </Suspense>
  );
}

function StudentsPageContent() {
  const searchParams = useSearchParams();
  const classFilter = searchParams.get('class');

  // États
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Suppression
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Formulaire
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    classId: '',
    annualFee: '',
    parentPhone: '',
    address: '',
    birthDate: '',
    lastExamAvg: '0'
  });

  // Récupération des données optimisée avec useCallback
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Requête élèves
      let query = supabase.from('students').select('*, classes(name)');
      if (classFilter) query = query.eq('class_id', classFilter);
      
      const { data: stData, error: stError } = await query.order('created_at', { ascending: false });
      if (stError) throw stError;

      // Requête classes (pour le select)
      const { data: clData, error: clError } = await supabase.from('classes').select('*').order('name');
      if (clError) throw clError;

      setStudents(stData || []);
      setClasses(clData || []);
    } catch (error: any) {
      console.error('Erreur fetchData:', error.message);
    } finally {
      setLoading(false);
    }
  }, [classFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ajouter un élève
  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId) return alert("Veuillez sélectionner une classe.");

    setIsSubmitting(true);
    const { error } = await supabase.from('students').insert([{
      first_name: formData.firstName,
      last_name: formData.lastName,
      class_id: formData.classId,
      annual_fee: parseFloat(formData.annualFee || '0'),
      parent_phone: formData.parentPhone,
      address: formData.address,
      birth_date: formData.birthDate || null, // Évite les chaînes vides pour le type date
      last_exam_avg: parseFloat(formData.lastExamAvg || '0')
    }]);

    if (!error) {
      setFormData({ firstName: '', lastName: '', classId: '', annualFee: '', parentPhone: '', address: '', birthDate: '', lastExamAvg: '0' });
      fetchData();
    } else {
      alert("Erreur lors de l'ajout : " + error.message);
    }
    setIsSubmitting(false);
  };

  // Supprimer un élève
  const handleDeleteStudent = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('students').delete().eq('id', id);
    
    if (!error) {
      setConfirmDeleteId(null);
      fetchData();
    } else {
      console.error(error);
      alert("Erreur. Vérifiez que l'élève n'est pas lié à d'autres données (ex: paiements).");
    }
    setDeletingId(null);
  };

  // Filtrage local
  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (student.first_name + " " + student.last_name).toLowerCase().includes(searchLower) ||
      student.parent_phone?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 bg-green-600 rounded-full animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600">Base de données</p>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-950 italic">
            {classFilter ? 'Effectif Classe' : 'Registre Élèves'}
          </h1>
        </div>

        {classFilter && students.length > 0 && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 px-4 py-2 rounded-2xl">
            <p className="text-[10px] font-black text-green-700 uppercase">Classe : {students[0].classes?.name}</p>
            <Link href="/students" className="p-1 hover:bg-green-200 rounded-full text-green-600 transition-colors">
              <X size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* Formulaire d'inscription */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <UserPlus size={120} />
        </div>

        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-8">Nouvelle Inscription</h2>

        <form onSubmit={addStudent} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Prénom</label>
                <input type="text" placeholder="Moussa" className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-green-500 focus:bg-white transition-all outline-none font-bold text-slate-900" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} required />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nom</label>
                <input type="text" placeholder="Diarra" className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-green-500 focus:bg-white transition-all outline-none font-bold text-slate-900" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} required />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Naissance</label>
                <input type="date" className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-green-500 focus:bg-white transition-all outline-none font-bold text-slate-600" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Classe d'accueil</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-green-500 focus:bg-white transition-all outline-none font-bold cursor-pointer text-slate-900" value={formData.classId} onChange={(e) => setFormData({...formData, classId: e.target.value})} required >
                    <option value="">Sélectionner...</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Contact Parent</label>
                <input type="text" placeholder="+223 ..." className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-green-500 focus:bg-white transition-all outline-none font-bold text-slate-900" value={formData.parentPhone} onChange={(e) => setFormData({...formData, parentPhone: e.target.value})} />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Lieu de Résidence</label>
                <input type="text" placeholder="Quartier..." className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-green-500 focus:bg-white transition-all outline-none font-bold text-slate-900" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Frais Annuels (FCFA)</label>
              <NumericInput
                placeholder="450000"
                className="w-full p-4 bg-green-50 border-2 border-green-100 rounded-2xl focus:border-green-500 focus:bg-white transition-all outline-none font-black text-green-600"
                value={formData.annualFee === '' ? undefined : Number(formData.annualFee)}
                onChange={(v) => setFormData({...formData, annualFee: v === undefined || v === null ? '' : String(v)})}
                maximumFractionDigits={0}
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="bg-slate-950 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase hover:bg-green-600 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2">
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Enregistrer l\'élève'}
          </button>
        </form>
      </div>

      {/* Recherche et Liste */}
      <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Filtrer par nom..."
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm outline-none focus:ring-2 focus:ring-green-500 font-bold text-slate-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{filteredStudents.length} Dossiers</p>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                  <tr>
                    <th className="px-10 py-6">Élève & Classe</th>
                    <th className="px-6 py-6 text-center">Moyenne</th>
                    <th className="px-10 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={3} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-green-600" size={32} /></td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan={3} className="p-10 text-center text-slate-400">Aucun résultat trouvé</td></tr>
                  ) : filteredStudents.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-5">
                          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white font-black text-sm shadow-lg group-hover:scale-110 transition-transform">
                            {s.first_name?.[0]}{s.last_name?.[0]}
                          </div>
                          <div>
                              <p className="font-black text-slate-900 text-lg leading-none mb-1">{s.first_name} {s.last_name}</p>
                              <span className="text-[10px] font-black text-green-600 uppercase bg-green-50 px-2 py-0.5 rounded-md">{s.classes?.name || '---'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <div className={`inline-block px-4 py-1.5 rounded-full font-black text-sm ${s.last_exam_avg >= 10 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {s.last_exam_avg}/20
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        {confirmDeleteId === s.id ? (
                          <div className="flex items-center justify-end gap-2 animate-in fade-in duration-200">
                            <span className="text-[10px] font-black uppercase text-rose-500 mr-2">Sûr ?</span>
                            <button 
                              onClick={() => handleDeleteStudent(s.id)}
                              disabled={deletingId === s.id}
                              className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-rose-700 transition-all shadow-md disabled:opacity-50"
                            >
                              {deletingId === s.id ? <Loader2 className="animate-spin" size={14} /> : 'Oui'}
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={deletingId === s.id}
                              className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase hover:bg-slate-300 transition-all"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            <button 
                              onClick={() => setConfirmDeleteId(s.id)}
                              className="inline-flex items-center justify-center h-12 w-12 bg-transparent text-slate-300 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all"
                              title="Supprimer l'élève"
                            >
                              <Trash2 size={18} />
                            </button>
                            <Link href={`/students/${s.id}`} className="inline-flex items-center justify-center h-12 w-12 bg-slate-900 text-white rounded-2xl hover:bg-green-600 hover:-rotate-12 transition-all shadow-lg">
                              <ArrowUpRight size={20} />
                            </Link>
                          </div>
                        )}
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