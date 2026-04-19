"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import {
  Users, UserPlus, Search, ArrowUpRight,
  Loader2, Phone, MapPin, Calendar as CalendarIcon, X, Trash2, Plus
} from 'lucide-react';
import Link from 'next/link';
import NumericInput from '@/components/NumericInput';

export default function StudentsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <Loader2 className="animate-spin text-green-600" size={32} />
        <p className="font-bold animate-pulse text-xs uppercase tracking-widest">Chargement...</p>
      </div>
    }>
      <StudentsPageContent />
    </Suspense>
  );
}

function StudentsPageContent() {
  const searchParams = useSearchParams();
  const classFilter = searchParams.get('class');

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMobileForm, setShowMobileForm] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', classId: '', annualFee: '',
    parentPhone: '', address: '', birthDate: '', lastExamAvg: '0'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('students').select('*, classes(name)');
      if (classFilter) query = query.eq('class_id', classFilter);
      const { data: stData } = await query.order('created_at', { ascending: false });
      const { data: clData } = await supabase.from('classes').select('*').order('name');
      setStudents(stData || []);
      setClasses(clData || []);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [classFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId) return alert("Classe requise");
    setIsSubmitting(true);
    const { error } = await supabase.from('students').insert([{
      first_name: formData.firstName, last_name: formData.lastName,
      class_id: formData.classId, annual_fee: parseFloat(formData.annualFee || '0'),
      parent_phone: formData.parentPhone, address: formData.address,
      birth_date: formData.birthDate || null, last_exam_avg: parseFloat(formData.lastExamAvg || '0')
    }]);

    if (!error) {
      setFormData({ firstName: '', lastName: '', classId: '', annualFee: '', parentPhone: '', address: '', birthDate: '', lastExamAvg: '0' });
      setShowMobileForm(false);
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleDeleteStudent = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) { setConfirmDeleteId(null); fetchData(); }
    setDeletingId(null);
  };

  const filteredStudents = students.filter(student => 
    (student.first_name + " " + student.last_name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* Header Adapté */}
      <div className="flex items-center justify-between gap-2 pt-6 md:pt-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 bg-green-600 rounded-full animate-pulse" />
            <p className="text-[9px] font-black uppercase tracking-widest text-green-600">Registre</p>
          </div>
          <h1 className="text-2xl md:text-5xl font-black tracking-tighter text-slate-950 italic">
            {classFilter ? 'Effectif' : 'Élèves'}
          </h1>
        </div>
        
        <button 
          onClick={() => setShowMobileForm(!showMobileForm)}
          className="md:hidden h-11 w-11 bg-slate-950 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          {showMobileForm ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {/* Formulaire Responsive */}
      <div className={`${showMobileForm ? 'block' : 'hidden md:block'} bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl`}>
        <h2 className="text-lg font-black text-slate-900 mb-6 hidden md:block">Nouvelle Inscription</h2>
        <form onSubmit={addStudent} className="space-y-4 md:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Prénom</label>
              <input type="text" placeholder="Moussa" className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-transparent focus:border-green-500 outline-none font-bold text-sm" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} required />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nom</label>
              <input type="text" placeholder="Diarra" className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-transparent focus:border-green-500 outline-none font-bold text-sm" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} required />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Naissance</label>
              <input type="date" className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-transparent focus:border-green-500 outline-none font-bold text-sm text-slate-600" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Classe</label>
              <select className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-transparent focus:border-green-500 outline-none font-bold text-sm" value={formData.classId} onChange={(e) => setFormData({...formData, classId: e.target.value})} required >
                <option value="">Sélectionner...</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Contact</label>
              <input type="text" placeholder="+223" className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-transparent focus:border-green-500 outline-none font-bold text-sm" value={formData.parentPhone} onChange={(e) => setFormData({...formData, parentPhone: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Résidence</label>
              <input type="text" placeholder="Quartier" className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-transparent focus:border-green-500 outline-none font-bold text-sm" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Frais (FCFA)</label>
              <NumericInput
                placeholder="0"
                className="w-full p-3.5 bg-green-50 rounded-xl border-2 border-green-100 focus:border-green-500 outline-none font-black text-green-600 text-sm"
                value={formData.annualFee === '' ? undefined : Number(formData.annualFee)}
                onChange={(v) => setFormData({...formData, annualFee: v === undefined ? '' : String(v)})}
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-slate-950 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase shadow-lg disabled:opacity-50">
            {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filtrer par nom..."
          className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-100 rounded-xl shadow-sm outline-none font-bold text-sm focus:ring-2 ring-green-500/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* AFFICHAGE PC : Tableau */}
      <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400">
            <tr>
              <th className="px-8 py-5">Élève</th>
              <th className="px-4 py-5 text-center">Contact</th>
              <th className="px-4 py-5 text-center">Moyenne</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={4} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-green-600" /></td></tr>
            ) : filteredStudents.map((s: any) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm uppercase">
                      {s.first_name?.[0]}{s.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-base leading-tight">{s.first_name} {s.last_name}</p>
                      <span className="text-[9px] font-black text-green-600 uppercase">{s.classes?.name}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center font-bold text-slate-500 text-xs">{s.parent_phone || '---'}</td>
                <td className="px-4 py-4 text-center font-black text-sm">{s.last_exam_avg}/20</td>
                <td className="px-8 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setConfirmDeleteId(s.id)} className="p-2 text-slate-200 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                    <Link href={`/students/${s.id}`} className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95"><ArrowUpRight size={18} /></Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AFFICHAGE MOBILE : Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-green-600" /></div>
        ) : filteredStudents.map((s: any) => (
          <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-950 text-white flex items-center justify-center font-black text-xs uppercase">
                {s.first_name?.[0]}{s.last_name?.[0]}
              </div>
              <div className="flex-1">
                <p className="font-black text-slate-900 text-sm">{s.first_name} {s.last_name}</p>
                <p className="text-[9px] font-black text-green-600 uppercase tracking-tighter">{s.classes?.name}</p>
              </div>
              <div className={`px-2 py-1 rounded-lg font-black text-[10px] ${s.last_exam_avg >= 10 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {s.last_exam_avg}/20
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-slate-50 pt-2">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px]">
                <Phone size={12} className="text-slate-300" />
                {s.parent_phone || 'N/A'}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setConfirmDeleteId(s.id)} className="p-2 text-slate-300"><Trash2 size={16} /></button>
                <Link href={`/students/${s.id}`} className="h-9 w-9 bg-slate-900 text-white rounded-lg flex items-center justify-center"><ArrowUpRight size={16} /></Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal suppression simplifié */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/20 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[1.5rem] shadow-2xl w-full max-w-xs text-center">
            <p className="font-black text-slate-900 text-xs uppercase mb-4">Confirmer la suppression ?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleDeleteStudent(confirmDeleteId)} className="bg-rose-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Oui</button>
              <button onClick={() => setConfirmDeleteId(null)} className="bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-[10px] uppercase">Non</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}