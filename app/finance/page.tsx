'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import * as XLSX from 'xlsx'; // N'oublie pas : npm install xlsx
import NumericInput from '@/components/NumericInput';
import { 
  Target, ArrowRight, CalendarHeart, Loader2, 
  MessageSquare, TrendingDown, Coins, FileDown, Search
} from 'lucide-react';

export default function FinancialForecastPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [totals, setTotals] = useState({
    ObjectifAnnuel: 0,
    EncaisseScolarite: 0,
    ResteARecouvrer: 0,
    AvanceNplus1: 0,
    TotalExtras: 0,
    TotalDepenses: 0
  });

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer les paramètres de tranches (Le Cockpit)
      const { data: setts, error: settingsError } = await supabase.from('school_settings').select('*').eq('id', 1).single();
      if (settingsError) {
        console.error('Erreur school_settings:', settingsError);
        setError(settingsError.message);
      }
      setSettings(setts);

      // 2. Récupérer élèves et paiements
      const { data: stData, error: stError } = await supabase
        .from('students')
        .select('id, first_name, last_name, parent_phone, annual_fee, payment_plan_tranches, payments(amount), classes(name)');

      if (stError) {
        console.error('Erreur students:', stError);
        setError(stError.message);
      }

      const { data: exData, error: exError } = await supabase.from('student_extra_payments').select('amount_paid');
      if (exError) {
        console.error('Erreur student_extra_payments:', exError);
        setError(exError.message);
      }

      const { data: dpData, error: dpError } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (dpError) {
        console.error('Erreur expenses:', dpError);
        setError(dpError.message);
      }

      if (!stData) {
        setStudents([]);
        setExpenses(dpData || []);
        setLoading(false);
        return;
      }

      const parseAmount = (v: any) => Number(v) || 0;
      let totalObj = 0;
      let totalScolariteReel = 0;
      let totalAvances = 0;

      const studentsWithRates = stData.map((s) => {
        const annualFee = parseAmount(s.annual_fee);
        const payArray = Array.isArray(s.payments) ? s.payments : [];
        const totalPaye = payArray.reduce((sum, p) => sum + parseAmount(p.amount), 0);
        const payeAnnee = Math.min(totalPaye, annualFee);
        const avance = Math.max(0, totalPaye - annualFee);
        const className = Array.isArray((s as any).classes) ? (s as any).classes[0]?.name : (s as any).classes?.name;

        totalObj += annualFee;
        totalScolariteReel += payeAnnee;
        totalAvances += avance;

        return {
          ...s,
          class_name: className || (s as any).class_name || 'Non défini',
          paye: payeAnnee,
          total: annualFee,
          reste: annualFee - payeAnnee
        };
      });

      const totalExtras = exData?.reduce((sum, item) => sum + parseAmount(item.amount_paid), 0) || 0;
      const totalDepenses = dpData?.reduce((sum, item) => sum + parseAmount(item.amount), 0) || 0;

      setTotals({
        ObjectifAnnuel: totalObj,
        EncaisseScolarite: totalScolariteReel,
        ResteARecouvrer: Math.max(totalObj - totalScolariteReel, 0),
        AvanceNplus1: totalAvances,
        TotalExtras: totalExtras,
        TotalDepenses: totalDepenses
      });

      setStudents(studentsWithRates);
      setExpenses(dpData || []);
    } catch (err) {
      console.error('Erreur fetchData finance:', err);
      setError('Impossible de charger les données de la finance.');
    } finally {
      setLoading(false);
    }
  }

  // --- LOGIQUE DE DÉTECTION DES RETARDS (DYNAMIQUE) ---
  const checkIsLate = (s: any) => {
    if (!settings || s.total <= 0) return false;

    const currentMonth = Number(settings.current_month_index || new Date().getMonth() + 1);
    const trancheCount = Number(s.payment_plan_tranches || 1);
    const montantParTranche = s.total / Math.max(trancheCount, 1);

    const getMidMonth = (start: number, end: number) => Math.ceil((start + end) / 2);
    const isPastMid = (start: number, end: number) => currentMonth >= getMidMonth(start, end);

    if (trancheCount === 9) {
      const dueMonths = Math.min(currentMonth, 9);
      const montantAttendu = Math.min(s.total, (s.total / 9) * dueMonths);
      return s.paye < montantAttendu;
    }

    if (trancheCount === 3) {
      const t1Start = Number(settings.t1_start_month || 1);
      const t1End = Number(settings.t1_end_month || 4);
      const t2Start = Number(settings.t2_start_month || 5);
      const t2End = Number(settings.t2_end_month || 8);
      const t3Start = Number(settings.t3_start_month || 9);
      const t3End = Number(settings.t3_end_month || 12);

      if (isPastMid(t1Start, t1End) && s.paye < montantParTranche) return true;
      if (isPastMid(t2Start, t2End) && s.paye < montantParTranche * 2) return true;
      if (isPastMid(t3Start, t3End) && s.paye < s.total) return true;
    }

    if (trancheCount === 1) {
      const yearMid = Math.ceil((Number(settings.t1_start_month || 1) + Number(settings.t3_end_month || 12)) / 2);
      if (currentMonth >= yearMid && s.paye < s.total) return true;
    }

    return false;
  };

  // --- EXPORT EXCEL ---
  const exportLateList = () => {
    const list = students.filter(s => checkIsLate(s)).sort((a,b) => a.class_name.localeCompare(b.class_name));
    const worksheet = XLSX.utils.json_to_sheet(list.map(s => ({
      Classe: s.class_name,
      Nom: s.last_name,
      Prenom: s.first_name,
      Plan: s.payment_plan_tranches + " Tranches",
      Payé: s.paye,
      Reste: s.reste
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Retards");
    XLSX.writeFile(workbook, `Retards_Scolarite_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!expDesc || !expAmount) return;
    const { error } = await supabase.from('expenses').insert([{ description: expDesc, amount: parseFloat(expAmount) }]);
    if(!error) { setExpDesc(''); setExpAmount(''); fetchData(); }
  };

  useEffect(() => { fetchData(); }, []);

  const retardataires = students.filter(s => 
    checkIsLate(s) && 
    (`${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const soldeNet = (totals.EncaisseScolarite + totals.TotalExtras + totals.AvanceNplus1) - totals.TotalDepenses;

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-10 px-4">
      
      {/* HEADER */}
      {error && (
        <div className="rounded-3xl bg-rose-50 border border-rose-200 p-5 text-rose-700 font-black uppercase text-xs mb-6">
          Erreur de chargement : {error}
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-end mt-8 gap-6">
        <div className="space-y-2">
            <h1 className="text-5xl font-black italic tracking-tighter text-slate-900 uppercase">
              Comptabilité <span className="text-green-600">Générale</span>
            </h1>
            <p className="text-slate-400 font-bold italic uppercase text-[10px]">
              Mois Actuel (Plan 9): {settings?.current_month_index} | Année: {settings?.current_academic_year}
            </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={exportLateList}
            className="bg-white border-2 border-slate-900 text-slate-900 px-6 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <FileDown size={18} /> Excel Retards
          </button>
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1 leading-none">Solde Net</p>
              <h2 className="text-3xl font-black italic text-slate-900">{soldeNet.toLocaleString()} <span className="text-xs uppercase">F</span></h2>
          </div>
        </div>
      </div>

      {/* --- CARTES DE FLUX --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-950 rounded-[3rem] p-8 text-white shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={60}/></div>
          <p className="text-[10px] font-black uppercase text-green-400 mb-4 italic">Encaissé Scolarité</p>
          <h2 className="text-3xl font-black italic">{totals.EncaisseScolarite.toLocaleString()} F</h2>
          <div className="mt-4 text-[9px] font-bold text-slate-500 uppercase italic tracking-widest text-right">Cible: {totals.ObjectifAnnuel.toLocaleString()} F</div>
        </div>
        
        <div className="bg-blue-600 rounded-[3rem] p-8 text-white shadow-xl">
          <p className="text-[10px] font-black uppercase text-blue-100 mb-4 italic">Frais Extras</p>
          <h2 className="text-3xl font-black italic">{totals.TotalExtras.toLocaleString()} F</h2>
        </div>
        <div className="bg-rose-500 rounded-[3rem] p-8 text-white shadow-xl">
          <p className="text-[10px] font-black uppercase text-rose-100 mb-4 italic">Total Dépenses</p>
          <h2 className="text-3xl font-black italic">-{totals.TotalDepenses.toLocaleString()} F</h2>
        </div>
        <div className="bg-indigo-600 rounded-[3rem] p-8 text-white shadow-xl">
          <p className="text-[10px] font-black uppercase text-indigo-100 mb-4 italic">Avances N+1</p>
          <h2 className="text-3xl font-black italic">{totals.AvanceNplus1.toLocaleString()} F</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- DÉPENSES --- */}
        <div className="lg:col-span-4 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm h-fit">
            <h3 className="text-xl font-black uppercase italic mb-6 flex items-center gap-3 text-slate-900 border-b pb-4">
              <TrendingDown className="text-rose-500" /> Sorties
            </h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
                <input 
                    type="text" placeholder="Motif..." 
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-xs outline-none"
                    value={expDesc} onChange={(e)=>setExpDesc(e.target.value)}
                />
                <div className="flex gap-2">
                  <NumericInput
                    placeholder="Montant"
                    className="flex-1 p-4 bg-slate-50 rounded-2xl border-none font-black text-rose-600 outline-none"
                    // CORRECTION ICI : Remplacement de null par undefined
                    value={expAmount === '' ? undefined : Number(expAmount)}
                    onChange={(v)=>setExpAmount(v === null || v === undefined ? '' : String(v))}
                    maximumFractionDigits={0}
                  />
                  <button className="bg-slate-900 text-white px-4 rounded-2xl font-black uppercase text-[10px]">OK</button>
                </div>
            </form>
            <div className="mt-8 space-y-3">
              {expenses.slice(0, 4).map((ex, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold uppercase truncate w-24 italic">{ex.description}</span>
                  <span className="font-black text-rose-500">-{ex.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
        </div>

        {/* --- LISTE RECOUVREMENT --- */}
        <div className="lg:col-span-8 bg-rose-50 rounded-[3.5rem] p-10 border border-rose-100">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg animate-pulse"><CalendarHeart size={24} /></div>
                    <h3 className="text-2xl font-black text-slate-900 italic uppercase">Retardataires</h3>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" size={16} />
                  <input 
                    type="text" placeholder="Chercher un nom..."
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border-none text-[10px] font-bold outline-none ring-2 ring-rose-200"
                    value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)}
                  />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    <div className="col-span-full flex justify-center py-10"><Loader2 className="animate-spin text-rose-600" /></div>
                ) : retardataires.map((s) => (
                    <div key={s.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-rose-100 relative group">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase italic">{s.class_name}</p>
                                <p className="font-black text-slate-900 italic uppercase text-xs">{s.last_name} {s.first_name}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    const msg = encodeURIComponent(`Bonjour, rappel pour la scolarité de ${s.first_name}. Reste: ${s.reste.toLocaleString()} F. Merci.`);
                                    window.open(`https://wa.me/${s.parent_phone.replace(/\D/g,'')}?text=${msg}`, '_blank');
                                }}
                                className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                            >
                                <MessageSquare size={14} />
                            </button>
                        </div>
                        <div className="mt-4 flex justify-between items-end border-t border-slate-50 pt-3">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase">Reste Scolarité</p>
                                <p className="text-lg font-black text-rose-600 italic leading-none">{s.reste.toLocaleString()} <span className="text-[10px]">F</span></p>
                            </div>
                            <span className="text-[8px] font-black bg-rose-100 text-rose-600 px-3 py-1 rounded-full uppercase">Plan {s.payment_plan_tranches} Tr</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}