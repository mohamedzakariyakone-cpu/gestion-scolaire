'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import NumericInput from '@/components/NumericInput';
import { 
  Save, Calendar, ShieldCheck, Store, 
  Loader2, Clock, GraduationCap, AlertCircle
} from 'lucide-react';

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function GlobalSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => { 
    fetchSettings(); 
  }, []);

  async function fetchSettings() {
    setLoading(true);
    // On essaie de récupérer la config ID 1
    let { data, error } = await supabase.from('school_settings').select('*').eq('id', 1).single();
    
    // Si la ligne n'existe pas (erreur 406 ou data null), on l'initialise
    if (error || !data) {
      const initialConfig = { id: 1, school_name: "La Source", current_month_index: 1 };
      const { data: newData } = await supabase.from('school_settings').insert(initialConfig).select().single();
      setConfig(newData);
    } else {
      setConfig(data);
    }
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    
    // Nettoyage de l'objet pour envoyer uniquement les colonnes valides
    const updates = {
      school_name: config.school_name,
      current_academic_year: config.current_academic_year,
      current_month_index: config.current_month_index,
      registration_fee_default: config.registration_fee_default,
      outfit_fee_default: config.outfit_fee_default,
      passing_grade: config.passing_grade,
      is_registration_open: config.is_registration_open,
      t1_start_month: config.t1_start_month,
      t1_end_month: config.t1_end_month,
      t2_start_month: config.t2_start_month,
      t2_end_month: config.t2_end_month,
      t3_start_month: config.t3_start_month,
      t3_end_month: config.t3_end_month,
    };

    const { error } = await supabase
      .from('school_settings')
      .update(updates)
      .eq('id', 1);

    if (error) {
      console.error("Erreur de sauvegarde:", error);
      alert("Erreur lors de l'enregistrement : " + error.message);
    } else {
      alert("✅ Configuration système mise à jour !");
    }
    setSaving(false);
  }

  if (loading || !config) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <Loader2 className="animate-spin text-green-600" size={50}/>
      <p className="font-black italic uppercase text-slate-400 animate-pulse">Initialisation du Cockpit...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 space-y-10">
      
      {/* HEADER DYNAMIQUE */}
      <div className="mt-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-slate-900">
              Cockpit <span className="text-green-600">Système</span>
            </h1>
            <p className="text-slate-400 font-bold italic uppercase text-[10px] tracking-widest mt-2">
              Configuration active : {config.school_name} | {config.current_academic_year}
            </p>
        </div>
        <button 
          onClick={saveSettings} disabled={saving}
          className="bg-slate-900 text-white px-6 sm:px-10 py-3 sm:py-5 rounded-[2rem] font-black uppercase italic flex items-center gap-3 hover:bg-green-600 transition-all shadow-2xl active:scale-95 disabled:opacity-50 w-full sm:w-auto justify-center"
        >
          {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
          Appliquer les changements
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SECTION : IDENTITÉ ÉCOLE */}
        <div className="lg:col-span-4 bg-white p-6 md:p-8 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
                <Store className="text-blue-600" size={20} />
                <h3 className="font-black uppercase italic text-sm text-slate-800">Établissement</h3>
            </div>
            <div className="space-y-4">
              <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nom de l'école</label>
                  <input 
                      type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-green-500"
                      value={config.school_name || ''} onChange={(e)=>setConfig({...config, school_name: e.target.value})}
                  />
              </div>
              <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Année Scolaire</label>
                  <input 
                      type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none"
                      value={config.current_academic_year || ''} onChange={(e)=>setConfig({...config, current_academic_year: e.target.value})}
                  />
              </div>
            </div>
        </div>

        {/* SECTION : ÉCHÉANCIER DES TRANCHES */}
        <div className="lg:col-span-8 bg-white p-6 md:p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-3 border-b pb-6">
                <Clock className="text-green-600" />
                <h3 className="font-black uppercase italic text-lg text-slate-800">Calendrier des Tranches (Plan 3)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((num) => (
                <div key={num} className="space-y-4 p-4 sm:p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                        <p className="font-black text-center text-green-600 uppercase text-[10px]">Tranche {num}</p>
                        <div className="space-y-3">
                            <select 
                                className="w-full p-3 bg-white rounded-xl font-bold text-xs outline-none shadow-sm"
                                value={config[`t${num}_start_month`] ?? 0}
                                onChange={(e)=>setConfig({...config, [`t${num}_start_month`]: parseInt(e.target.value)})}
                            >
                                <option disabled>Début</option>
                                {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <select 
                                className="w-full p-3 bg-white rounded-xl font-bold text-xs outline-none shadow-sm"
                                value={config[`t${num}_end_month`] ?? 0}
                                onChange={(e)=>setConfig({...config, [`t${num}_end_month`]: parseInt(e.target.value)})}
                            >
                                <option disabled>Fin</option>
                                {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* SECTION : PLAN 9 ET RÈGLES */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* PLAN 9 MOIS */}
            <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b pb-4">
                    <Calendar className="text-blue-600" />
                    <h3 className="font-black uppercase italic text-sm text-slate-800">Échéance Mensuelle</h3>
                </div>
                <div className="text-center">
                    <span className="text-5xl font-black text-slate-900 italic">{config.current_month_index}</span>
                    <p className="text-[9px] font-black uppercase text-slate-400 mt-1">Mois en cours de règlement</p>
                </div>
                <input 
                    type="range" min="1" max="9" className="w-full accent-slate-900"
                    value={config.current_month_index || 1}
                    onChange={(e)=>setConfig({...config, current_month_index: parseInt(e.target.value)})}
                />
            </div>

            {/* TARIFS DE BASE */}
            <div className="md:col-span-2 bg-slate-900 p-8 rounded-[3.5rem] shadow-xl space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                    <ShieldCheck className="text-green-400" />
                    <h3 className="font-black uppercase italic text-sm text-white">Tarification & Académique</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Inscription</label>
                        <NumericInput
                          className="w-full p-4 bg-slate-800 text-green-400 rounded-2xl font-black outline-none"
                          value={config.registration_fee_default ?? null}
                          onChange={(v)=>setConfig({...config, registration_fee_default: v ?? 0})}
                          maximumFractionDigits={0}
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Moyenne Passage</label>
                        <NumericInput
                          className="w-full p-4 bg-slate-800 text-blue-400 rounded-2xl font-black outline-none"
                          value={config.passing_grade ?? null}
                          onChange={(v)=>setConfig({...config, passing_grade: v ?? 10})}
                          maximumFractionDigits={1}
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                            onClick={() => setConfig({...config, is_registration_open: !config.is_registration_open})}
                            className={`w-full p-4 rounded-2xl font-black uppercase text-[10px] transition-all ${config.is_registration_open ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-rose-500 text-white'}`}
                        >
                            Inscriptions : {config.is_registration_open ? 'Ouvertes' : 'Fermées'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}