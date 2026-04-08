'use client';

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { 
  Wallet, ShieldAlert, ArrowLeft, Plus, 
  Loader2, AlertTriangle, Phone, MapPin, 
  Cake, GraduationCap, TrendingUp, History,
  Edit3, X, CheckCircle2, MessageSquare, Settings2, Save, Coins, Receipt, Info
} from 'lucide-react';
import Link from 'next/link';
import NumericInput from '@/components/NumericInput';

export default function StudentDetails() {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [extraPayments, setExtraPayments] = useState<any[]>([]); // NOUVEAU
  const [extraFeeTypes, setExtraFeeTypes] = useState<any[]>([]); // NOUVEAU
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États Formulaires
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('');
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState('Bas');

  // États Frais Extra (NOUVEAU)
  const [selectedExtraType, setSelectedExtraType] = useState('');
  const [extraAmount, setExtraAmount] = useState('');

  // États pour la Moyenne
  const [showAvgForm, setShowAvgForm] = useState(false);
  const [newAvg, setNewAvg] = useState('');
  const [updatingAvg, setUpdatingAvg] = useState(false);

  // ÉTATS POUR LA MODIFICATION DU PROFIL
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    parent_phone: '',
    address: '',
    annual_fee: 0,
    payment_plan_tranches: 1 // NOUVEAU
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: st } = await supabase.from('students').select('*, classes(name)').eq('id', id).single();
      const { data: pay } = await supabase.from('payments').select('*').eq('student_id', id).order('payment_date', { ascending: false });
      const { data: inc } = await supabase.from('discipline').select('*').eq('student_id', id).order('incident_date', { ascending: false });
      
      // NOUVELLES DONNÉES SQL
      const { data: exPay } = await supabase.from('student_extra_payments').select('*, extra_fee_types(name)').eq('student_id', id).order('payment_date', { ascending: false });
      const { data: exTypes } = await supabase.from('extra_fee_types').select('*');

      setStudent(st);
      if (st) {
        setEditForm({
          first_name: st.first_name,
          last_name: st.last_name,
          parent_phone: st.parent_phone || '',
          address: st.address || '',
          annual_fee: st.annual_fee || 0,
          payment_plan_tranches: st.payment_plan_tranches || 1
        });
      }
      setPayments(pay || []);
      setIncidents(inc || []);
      setExtraPayments(exPay || []);
      setExtraFeeTypes(exTypes || []);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // FONCTION : GÉNÉRER ET ENVOYER LE REÇU WHATSAPP
  const sendReceiptWhatsApp = (pAmount: number, pMonth: string, type: 'SCOLAIRE' | 'EXTRA') => {
    if (!student?.parent_phone) return;
    const cleanNumber = student.parent_phone.replace(/\D/g, '');
    const dateStr = new Date().toLocaleDateString('fr-FR');
    
    const message = encodeURIComponent(
      `✅ *REÇU DE PAIEMENT - ÉCOLE*\n\n` +
      `*Élève :* ${student.first_name} ${student.last_name}\n` +
      `*Type :* ${type}\n` +
      `*Montant :* ${new Intl.NumberFormat().format(pAmount)} FCFA\n` +
      `*Motif :* ${pMonth}\n` +
      `*Date :* ${dateStr}\n` +
      `---------------------------\n` +
      `Merci pour votre confiance. 🙏`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('students').update(editForm).eq('id', id);
    if (!error) { setIsEditModalOpen(false); fetchData(); }
  };

  const updateAverage = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingAvg(true);
    const { error } = await supabase.from('students').update({ last_exam_avg: parseFloat(newAvg) }).eq('id', id);
    if (!error) { setNewAvg(''); setShowAvgForm(false); fetchData(); }
    setUpdatingAvg(false);
  };

  // ENREGISTRER FRAIS EXTRA
  const handleExtraPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('student_extra_payments').insert([{
      student_id: id,
      fee_type_id: selectedExtraType,
      amount_paid: parseFloat(extraAmount)
    }]);
    if (!error) {
      const typeLabel = extraFeeTypes.find(t => t.id === selectedExtraType)?.name;
      sendReceiptWhatsApp(parseFloat(extraAmount), typeLabel || 'Frais Divers', 'EXTRA');
      setExtraAmount('');
      fetchData();
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-green-600" size={40} /></div>;
  if (!student) return <div className="text-center p-20 font-bold">Élève non trouvé.</div>;

  const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const annualFee = Number(student.annual_fee) || 0;
  const currentYearCoverage = Math.min(totalPaid, annualFee);
  const nextYearAdvance = Math.max(0, totalPaid - annualFee);
  const remaining = Math.max(0, annualFee - totalPaid);
  const isSolded = remaining === 0;

  // Calcul des tranches
  const numTranches = student.payment_plan_tranches || 1;
  const amountPerTranche = annualFee / numTranches;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8">
      
      {/* HEADER ACTIONS */}
      <div className="flex justify-between items-center mt-6">
        <Link href="/students" className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Retour au registre
        </Link>
        <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-lg shadow-slate-200">
          <Settings2 size={14} /> Paramètres & Tranches
        </button>
      </div>

      {/* --- BANDEAU PROFIL --- */}
      <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-8 relative">
        <div className="h-32 w-32 bg-gradient-to-br from-green-600 to-green-700 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl">
          {student.first_name?.[0]}{student.last_name?.[0]}
        </div>
        
        <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-4xl font-black text-slate-950 tracking-tight uppercase italic">{student.first_name} {student.last_name}</h1>
                <span className="px-4 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase border border-indigo-100">
                    Plan: {numTranches} Tranche(s)
                </span>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mt-4 text-slate-500 font-bold text-sm">
                <div className="flex items-center gap-2"><Phone size={16} className="text-green-500" /> {student.parent_phone || "N/A"}</div>
                <div className="flex items-center gap-2"><MapPin size={16} className="text-green-500" /> {student.address || "N/A"}</div>
            </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center min-w-0 sm:min-w-[150px] relative">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Moyenne</p>
            <p className="text-3xl font-black text-green-600">{student.last_exam_avg || "00"}<span className="text-sm text-slate-400">/20</span></p>
            <button onClick={() => setShowAvgForm(!showAvgForm)} className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-xl shadow-lg hover:bg-green-600 transition-all">
                {showAvgForm ? <X size={14} /> : <Edit3 size={14} />}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- COLONNE GAUCHE : DISCIPLINE & FRAIS EXTRAS --- */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* FRAIS EXTRAS (NOUVEAU) */}
            <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl">
                <h3 className="font-bold mb-6 flex items-center gap-2 text-xs uppercase tracking-widest"><Plus size={16} /> Frais Extraordinaires</h3>
                <form onSubmit={handleExtraPayment} className="space-y-4">
                    <select className="w-full p-4 bg-white/10 border-none rounded-2xl text-sm font-bold outline-none" value={selectedExtraType} onChange={(e)=>setSelectedExtraType(e.target.value)} required>
                        <option value="" className="text-slate-900">Type de frais...</option>
                        {extraFeeTypes.map(t => <option key={t.id} value={t.id} className="text-slate-900">{t.name} ({t.default_amount} F)</option>)}
                    </select>
                    <NumericInput
                      placeholder="Montant..."
                      className="w-full p-4 bg-white/10 border-none rounded-2xl text-sm font-bold outline-none"
                      value={extraAmount === '' ? undefined : Number(extraAmount)}
                      onChange={(v)=>setExtraAmount(v === null ? '' : String(v))}
                      maximumFractionDigits={0}
                      required
                    />
                    <button type="submit" className="w-full bg-white text-blue-600 p-4 rounded-2xl font-black text-xs uppercase hover:bg-blue-50 transition-all">Encaisser & Reçu</button>
                </form>
            </div>

            {/* DISCIPLINE */}
            <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-xl">
                <h3 className="font-bold mb-6 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400"><ShieldAlert size={16} className="text-orange-400" /> Discipline</h3>
                <form onSubmit={async (e) => { e.preventDefault(); await supabase.from('discipline').insert([{ student_id: id, reason, severity }]); setReason(''); fetchData(); }} className="space-y-4">
                    <textarea placeholder="Motif..." className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm h-24 resize-none" value={reason} onChange={(e) => setReason(e.target.value)} required />
                    <div className="flex gap-2">
                        {['Bas', 'Moyen', 'Grave'].map(l => (
                            <button key={l} type="button" onClick={() => setSeverity(l)} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${severity === l ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-500 border border-white/5'}`}>{l}</button>
                        ))}
                    </div>
                    <button type="submit" className="w-full bg-white text-slate-950 p-4 rounded-2xl font-black text-xs uppercase">Enregistrer</button>
                </form>
            </div>
        </div>

        {/* --- COLONNE DROITE : FINANCES & TRANCHES --- */}
        <div className="lg:col-span-8 space-y-6">
            
            {/* RÉSUMÉ DES TRANCHES */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 italic">Échéancier ({numTranches} tranches)</h3>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Par tranche</p>
                      <p className="text-xl font-black text-slate-900">{new Intl.NumberFormat().format(amountPerTranche)} F</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Array.from({ length: numTranches }).map((_, i) => {
                        const trancheTarget = (i + 1) * amountPerTranche;
                        const isTranchePaid = totalPaid >= trancheTarget;
                        return (
                            <div key={i} className={`p-4 rounded-2xl border ${isTranchePaid ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                                <p className={`text-[9px] font-black uppercase mb-1 ${isTranchePaid ? 'text-green-600' : 'text-slate-400'}`}>Tranche {i+1}</p>
                                <div className="flex items-center gap-2">
                                    {isTranchePaid ? <CheckCircle2 size={14} className="text-green-600"/> : <div className="h-3 w-3 rounded-full border-2 border-slate-300"/>}
                                    <span className={`text-xs font-black ${isTranchePaid ? 'text-green-700' : 'text-slate-400'}`}>{isTranchePaid ? 'Payé' : 'En attente'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 italic">Scolarité Payée</p>
                    <h4 className="text-4xl font-black text-slate-950 italic">{new Intl.NumberFormat().format(currentYearCoverage)} F</h4>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-6 overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ${isSolded ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${(currentYearCoverage/annualFee)*100}%` }} />
                    </div>
                </div>

                {isSolded ? (
                  <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl">
                      <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-2 italic">Avance Année N+1</p>
                      <h4 className="text-4xl font-black italic">{new Intl.NumberFormat().format(nextYearAdvance)} F</h4>
                  </div>
                ) : (
                  <div className="bg-rose-500 p-8 rounded-[2.5rem] text-white shadow-xl">
                      <p className="text-rose-200 text-[10px] font-black uppercase tracking-widest mb-2 italic">Reste à payer</p>
                      <h4 className="text-4xl font-black italic">{new Intl.NumberFormat().format(remaining)} F</h4>
                  </div>
                )}
            </div>

            {/* FORMULAIRE ENCAISSEMENT + WHATSAPP */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="font-black mb-6 text-xs uppercase tracking-widest flex items-center gap-2"><Receipt size={18} className="text-green-600"/> Encaisser Scolarité</h3>
                <form onSubmit={async (e) => { 
                  e.preventDefault(); 
                  const { error } = await supabase.from('payments').insert([{ student_id: id, amount: parseFloat(amount), month }]); 
                  if (!error) {
                    sendReceiptWhatsApp(parseFloat(amount), month, 'SCOLAIRE');
                    setAmount(''); setMonth(''); fetchData(); 
                  }
                }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <NumericInput
                      placeholder="Montant..."
                      className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-none"
                      value={amount === '' ? undefined : Number(amount)}
                      onChange={(v)=>setAmount(v === null ? '' : String(v))}
                      maximumFractionDigits={0}
                      required
                    />
                    <select className="p-4 bg-slate-50 rounded-2xl outline-none font-bold border-none" value={month} onChange={(e)=>setMonth(e.target.value)} required>
                        <option value="">Période...</option>
                        {['Tranche 1', 'Tranche 2', 'Tranche 3', 'Mensuel Oct', 'Mensuel Nov'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button className="bg-slate-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-green-600 transition-all">Encaisser & Reçu</button>
                </form>
            </div>

            {/* HISTORIQUE MIXTE (SCOLAIRE + EXTRA) */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <p className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b italic">Journal des paiements récents</p>
                <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-50">
                        {/* On combine et trie les deux types de paiements */}
                        {[...payments, ...extraPayments].sort((a,b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).map((p, idx) => (
                            <tr key={idx} className="text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-5 text-slate-400 italic text-xs">{new Date(p.payment_date).toLocaleDateString()}</td>
                                <td className="px-8 py-5">
                                  <span className={`px-3 py-1 rounded-lg text-[9px] uppercase font-black ${p.extra_fee_types ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                    {p.extra_fee_types ? p.extra_fee_types.name : p.month}
                                  </span>
                                </td>
                                <td className="px-8 py-5 text-right font-black text-slate-900">
                                    {new Intl.NumberFormat().format(p.amount || p.amount_paid)} F
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* --- MODAL DE MODIFICATION ÉTENDU (TRANCHES) --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Paramètres <span className="text-blue-600">Élève</span></h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombre de tranches de paiement</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={editForm.payment_plan_tranches} onChange={(e)=>setEditForm({...editForm, payment_plan_tranches: parseInt(e.target.value)})}>
                    <option value={1}>1 Tranche (Paiement Unique)</option>
                    <option value={3}>3 Tranches (Trimestriel)</option>
                    <option value={9}>9 Tranches (Mensuel)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" className="p-4 bg-slate-50 rounded-2xl font-bold" value={editForm.first_name} onChange={(e)=>setEditForm({...editForm, first_name: e.target.value})} />
                <input type="text" className="p-4 bg-slate-50 rounded-2xl font-bold" value={editForm.last_name} onChange={(e)=>setEditForm({...editForm, last_name: e.target.value})} />
              </div>
              <NumericInput
                className="w-full p-4 bg-slate-50 rounded-2xl font-black text-blue-600"
                value={editForm.annual_fee ?? undefined}
                onChange={(v)=>setEditForm({...editForm, annual_fee: v ?? 0})}
                maximumFractionDigits={0}
              />
              <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3"><Save size={18} /> Mettre à jour le plan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}