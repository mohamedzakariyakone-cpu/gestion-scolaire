'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Trash2, PlusCircle, School, Search, Loader2, ArrowUpRight, Users } from 'lucide-react';
import Link from 'next/link';

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [className, setClassName] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    // On sélectionne les classes et on compte les élèves liés (relation students)
    const { data, error } = await supabase
      .from('classes')
      .select('*, students(id)')
      .order('name');
    
    if (error) console.error(error);
    else setClasses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClasses(); }, []);

  const addClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !level) return;
    setSubmitting(true);

    const { error } = await supabase.from('classes').insert([{ 
      name: className.toUpperCase(), 
      level: level 
    }]);

    if (error) {
      alert("Erreur : Cette classe existe déjà !");
    } else {
      setClassName(''); setLevel('');
      fetchClasses();
    }
    setSubmitting(false);
  };

  const deleteClass = async (id: string, name: string) => {
    const confirm = window.confirm(`Voulez-vous vraiment supprimer la classe ${name} ?`);
    if (confirm) {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) alert("Impossible de supprimer : Des élèves sont peut-être liés à cette classe.");
      else fetchClasses();
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-8">
        <div>
          <p className="text-sm font-medium text-green-600">Configuration</p>
          <h1 className="text-4xl font-extrabold tracking-tighter text-slate-950 flex items-center gap-3">
            <School className="text-slate-400" size={36} /> Structure de l'école
          </h1>
          <p className="text-slate-600 mt-2 max-w-lg">Gérez les classes et niveaux d'enseignement de votre établissement.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start">
        
        {/* Formulaire d'ajout (Col 1) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 xl:col-span-1 sticky top-10">
          <h2 className="text-xl font-bold mb-1 text-slate-950">Nouvelle Classe</h2>
          <p className="text-sm text-slate-500 mb-6">Enregistrez une section d'enseignement.</p>
          
          <form onSubmit={addClass} className="space-y-5">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom de la classe</label>
                <input
                    type="text"
                    placeholder="ex: 10ÈME LETTRES, CM2 B"
                    className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none transition uppercase font-bold"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Niveau d'enseignement</label>
                <select 
                    className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none bg-white transition cursor-pointer font-medium"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    required
                >
                    <option value="">Sélectionner...</option>
                    <option value="Maternelle">🧸 Maternelle</option>
                    <option value="Premier Cycle">📖 Premier Cycle (Primaire)</option>
                    <option value="Second Cycle">🏫 Second Cycle (Collège)</option>
                    <option value="Lycée">🔬 Lycée</option>
                </select>
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-950 text-white p-4 rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase shadow-lg disabled:opacity-70"
            >
              {submitting ? <Loader2 className="animate-spin" size={20}/> : <PlusCircle size={20} />}
              Créer la classe
            </button>
          </form>
        </div>

        {/* Liste des classes (Col 2-3) */}
        <div className="xl:col-span-2 space-y-6">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Rechercher une classe..." className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-inner outline-none focus:ring-2 focus:ring-green-100"/>
            </div>

            {loading ? (
                <div className="flex items-center gap-3 text-slate-500 p-6"><Loader2 className="animate-spin"/> Chargement...</div>
            ) : classes.length === 0 ? (
                <div className="bg-white text-center p-12 rounded-3xl border border-dashed border-slate-200 text-slate-500">Aucune classe enregistrée.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {classes.map((cls) => (
                    <div key={cls.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col group hover:border-green-500 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                        
                        {/* Bouton de suppression discret en haut à droite */}
                        <button 
                            onClick={(e) => { e.preventDefault(); deleteClass(cls.id, cls.name); }}
                            className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors z-20"
                        >
                            <Trash2 size={16} />
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 group-hover:bg-green-600 group-hover:text-white transition-all">
                                <School size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-950 tracking-tight">{cls.name}</h3>
                                <span className="text-[10px] text-green-600 font-black uppercase tracking-widest">{cls.level}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Users size={14} />
                                <span className="text-xs font-bold">{cls.students?.length || 0} élèves</span>
                            </div>
                            
                            {/* LIEN VERS LES ÉLÈVES DE CETTE CLASSE */}
                            <Link 
                                href={`/students?class=${cls.id}`}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-green-600 hover:text-green-800 transition-colors"
                            >
                                Voir la liste <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    </div>
                ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}