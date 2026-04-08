'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Settings, PenTool, BarChart3, FileText, 
  Plus, Save, Trash2, Download, Trophy, Target, Search 
} from 'lucide-react';

export default function EngineScolaire() {
  const [tab, setTab] = useState<'config' | 'saisie' | 'resultats' | 'stats'>('saisie');
  const [loading, setLoading] = useState(false);

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [period, setPeriod] = useState('1er Trimestre');
  const [year, setYear] = useState('2025-2026');

  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [rawGrades, setRawGrades] = useState<any[]>([]);

  const [searchSaisie, setSearchSaisie] = useState('');
  const [searchBulletins, setSearchBulletins] = useState('');

  const [newSubName, setNewSubName] = useState('');
  const [newSubCoeff, setNewSubCoeff] = useState('1');

  // Mise à jour de la logique : Second cycle = 7, 8, 9
  const isSecondCycle = useMemo(() => {
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return false;
    const name = currentClass.name.toLowerCase();
    return name.includes('7') || name.includes('8') || name.includes('9');
  }, [selectedClassId, classes]);

  useEffect(() => {
    async function getClasses() {
      const { data } = await supabase.from('classes').select('*');
      setClasses(data || []);
    }
    getClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) loadClassData();
  }, [selectedClassId, period, year]);

  async function loadClassData() {
    setLoading(true);
    const { data: sub } = await supabase.from('class_subjects').select('*').eq('class_id', selectedClassId);
    const { data: stu } = await supabase.from('students').select('*').eq('class_id', selectedClassId);
    const { data: grd } = await supabase.from('student_grades')
      .select('*')
      .eq('class_id', selectedClassId)
      .eq('period', period)
      .eq('academic_year', year);

    setSubjects(sub || []);
    setStudents(stu || []);
    setRawGrades(grd || []);
    setLoading(false);
  }

  const addSubject = async () => {
    if (!selectedClassId || !newSubName) return;
    const { error } = await supabase.from('class_subjects').insert({
      class_id: selectedClassId,
      subject_name: newSubName,
      coefficient: parseFloat(newSubCoeff)
    });
    if (!error) {
      setNewSubName('');
      loadClassData();
    }
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from('class_subjects').delete().eq('id', id);
    if (!error) loadClassData();
  };

  const filteredStudentsSaisie = useMemo(() => {
    return students.filter(s => 
      `${s.last_name} ${s.first_name}`.toLowerCase().includes(searchSaisie.toLowerCase())
    );
  }, [students, searchSaisie]);

  const bulletinData = useMemo(() => {
    const data = students.map(student => {
      let totalPondere = 0;
      let totalCoeffs = 0;
      const detailNotes = subjects.map(sub => {
        const matchingGrade = rawGrades.find(g => g.student_id === student.id && g.subject_name === sub.subject_name);
        
        const noteClasse = matchingGrade ? parseFloat(matchingGrade.grade_value) || 0 : 0;
        const noteCompo = matchingGrade ? parseFloat(matchingGrade.compo_value) || 0 : 0;
        
        // Logique de calcul selon le cycle
        let moyenneMatiere = 0;
        if (isSecondCycle) {
          moyenneMatiere = (noteClasse + (noteCompo * 2)) / 3;
        } else {
          moyenneMatiere = noteCompo; // Exclure la note de classe pour le premier cycle
        }

        totalPondere += (moyenneMatiere * sub.coefficient);
        totalCoeffs += sub.coefficient;
        
        return { 
          name: sub.subject_name, 
          noteClasse, 
          noteCompo, 
          moyenneMatiere: parseFloat(moyenneMatiere.toFixed(2)),
          coeff: sub.coefficient, 
          points: moyenneMatiere * sub.coefficient 
        };
      });

      const moyenne = totalCoeffs > 0 ? totalPondere / totalCoeffs : 0;
      return {
        ...student,
        notes: detailNotes,
        moyenne: parseFloat(moyenne.toFixed(2)),
        totalPoints: totalPondere,
        totalCoeffs
      };
    }).sort((a, b) => b.moyenne - a.moyenne)
      .map((s, i) => ({ ...s, rang: i + 1 }));

    return data.filter(s => 
      `${s.last_name} ${s.first_name}`.toLowerCase().includes(searchBulletins.toLowerCase())
    );
  }, [students, subjects, rawGrades, isSecondCycle, searchBulletins]);

  // Mentions adaptées selon la base 10 ou 20
  const getMention = (m: number) => {
    const ratio = m / (isSecondCycle ? 20 : 10);
    if (ratio >= 0.8) return "Très Bien";
    if (ratio >= 0.7) return "Bien";
    if (ratio >= 0.6) return "Assez Bien";
    if (ratio >= 0.5) return "Passable";
    return "Insuffisant";
  };

  const getAppreciation = (note: number) => {
    const ratio = note / (isSecondCycle ? 20 : 10);
    if (ratio >= 0.9) return "Excellent travail";
    if (ratio >= 0.8) return "Très bien";
    if (ratio >= 0.7) return "Bien";
    if (ratio >= 0.6) return "Assez bien";
    if (ratio >= 0.5) return "Passable, des efforts à faire";
    if (ratio >= 0.4) return "Insuffisant, doit travailler plus";
    if (ratio >= 0.25) return "Faible, attention";
    return "Très faible";
  };

  const applyScaleToFit = (el: HTMLElement) => {
    // réinitialiser d'abord
    el.style.transform = '';
    el.style.transformOrigin = '';
    el.style.lineHeight = '';
    el.style.fontSize = '';
    // mesurer (attacher temporairement au DOM si nécessaire)
    let needsAttach = !el.isConnected;
    if (needsAttach) {
      document.body.appendChild(el);
    }
    const h = el.scrollHeight;
    if (needsAttach) {
      document.body.removeChild(el);
    }
    const mmToPx = (mm: number) => mm * (96 / 25.4);
    const TARGET_HEIGHT_PX = mmToPx(297) - 20; // laisser un peu de marge
    if (h > TARGET_HEIGHT_PX) {
      const scale = Math.max(0.5, TARGET_HEIGHT_PX / h);
      el.style.transformOrigin = 'top left';
      el.style.transform = `scale(${scale})`;
      // réduire légèrement les espacements en cas de besoin
      el.style.lineHeight = '1.05';
      // réduire la taille de police globale proportionnellement
      el.style.fontSize = `calc(1rem * ${scale})`;
      return () => {
        el.style.transform = '';
        el.style.transformOrigin = '';
        el.style.lineHeight = '';
        el.style.fontSize = '';
      };
    }
    return () => {};
  };

  const downloadPDF = async (student: any) => {
    // Render single bulletin via html2canvas + jsPDF to ensure A4 fit and no blank pages
    const [{ jsPDF }, html2canvas] = await Promise.all([
      import('jspdf').then(m => ({ jsPDF: (m as any).jsPDF || (m as any).default?.jsPDF || (m as any).default })),
      import('html2canvas').then(m => (m as any).default || m)
    ]);

    const element = document.getElementById(`bulletin-pdf-${student.id}`);
    if (!element) return;

    // clone, attach offscreen, scale, render
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.display = 'block';
    clone.style.width = '210mm';
    clone.style.boxSizing = 'border-box';
    clone.style.position = 'fixed';
    clone.style.left = '-9999px';
    document.body.appendChild(clone);

    const reset = applyScaleToFit(clone);

    try {
      const canvas = await (html2canvas as any)(clone, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pdf = new (jsPDF as any)({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidthMM = pdf.internal.pageSize.getWidth();
      const pageHeightMM = pdf.internal.pageSize.getHeight();

      const imgProps = (pdf as any).getImageProperties(imgData);
      let pdfW = pageWidthMM;
      let pdfH = (imgProps.height * pdfW) / imgProps.width;

      // if image taller than page, scale down to fit height
      if (pdfH > pageHeightMM) {
        const scale = pageHeightMM / pdfH;
        pdfW = pdfW * scale;
        pdfH = pageHeightMM;
      }

      // center horizontally
      const x = (pageWidthMM - pdfW) / 2;
      const y = 0;

      pdf.addImage(imgData, 'JPEG', x, y, pdfW, pdfH);
      const filename = `Bulletin_${student.last_name}_${student.first_name}_${period}.pdf`;
      pdf.save(filename);
    } finally {
      reset();
      document.body.removeChild(clone);
    }
  };

  // NOUVELLE FONCTION : Exporter tous les bulletins en un seul PDF
  const downloadAllInOnePDF = async () => {
    if (bulletinData.length === 0) return;
    setLoading(true);
    
    try {
      // Nouvelle approche plus fiable : rendre chaque bulletin en image via html2canvas
      // puis construire un PDF page par page avec jsPDF. Cela évite les pages vides
      // causées par la pagination automatisée.
      const [{ jsPDF }, html2canvas] = await Promise.all([
        import('jspdf').then(m => ({ jsPDF: (m as any).jsPDF || (m as any).default?.jsPDF || (m as any).default })),
        import('html2canvas').then(m => (m as any).default || m)
      ]);

      const pdf = new (jsPDF as any)({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const mmToPx = (mm: number) => mm * (96 / 25.4);
      const pageWidthMM = pdf.internal.pageSize.getWidth();
      // iterate bulletins
      for (let i = 0; i < bulletinData.length; i++) {
        const student = bulletinData[i];
        const element = document.getElementById(`bulletin-pdf-${student.id}`);
        if (!element) continue;

        // clone and prepare
        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.display = 'block';
        clone.style.width = '210mm';
        clone.style.boxSizing = 'border-box';
        // reduce padding and font to fit printable area better
        clone.style.padding = '16px';
        clone.style.fontSize = '12px';
        clone.style.lineHeight = '1.1';
        // ensure images don't overflow
        try {
          Array.from(clone.querySelectorAll('img')).forEach((img: any) => { img.style.maxWidth = '100%'; img.style.height = 'auto'; });
        } catch (_) {}
        // attach offscreen to measure and render
        clone.style.position = 'fixed';
        clone.style.left = '-9999px';
        document.body.appendChild(clone);

        // apply scale to fit if needed and capture reset function
        const resetScale = applyScaleToFit(clone);

        // render to canvas (high DPI)
        const canvas = await (html2canvas as any)(clone, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        // compute image display size in mm from pixel dimensions
        const imgProps = (pdf as any).getImageProperties(imgData);
        const pxToMm = (px: number) => (px * 25.4) / 96; // 96 DPI
        const imgWmm = pxToMm(imgProps.width);
        const imgHmm = pxToMm(imgProps.height);

        // printable area margins
        const pageMarginMM = 10; // 10mm margin
        const maxW = pageWidthMM - pageMarginMM * 2;
        const maxH = pdf.internal.pageSize.getHeight() - pageMarginMM * 2;

        // fit to printable area while preserving aspect ratio
        let renderW = Math.min(imgWmm, maxW);
        let renderH = (imgHmm * renderW) / imgWmm;
        if (renderH > maxH) {
          renderH = maxH;
          renderW = (imgWmm * renderH) / imgHmm;
        }

        const x = (pageWidthMM - renderW) / 2;
        const y = pageMarginMM;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', x, y, renderW, renderH);

        // cleanup (reset scale and remove clone)
        try { resetScale(); } catch (_) {}
        document.body.removeChild(clone);
      }

      const className = classes.find(c => c.id === selectedClassId)?.name || 'Classe';
      pdf.save(`Bulletins_Complets_${className}_${period}.pdf`);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF groupé", error);
    }
    
    setLoading(false);
  };

  const saveGrade = async (studentId: string, subjectName: string, field: 'grade_value' | 'compo_value', value: string) => {
    const val = parseFloat(value);
    const maxGrade = isSecondCycle ? 20 : 10;
    
    if (isNaN(val) || val < 0 || val > maxGrade) return;
    
    const { error } = await supabase.from('student_grades').upsert({
      student_id: studentId,
      class_id: selectedClassId,
      subject_name: subjectName,
      period: period,
      academic_year: year,
      [field]: val
    }, { onConflict: 'student_id, subject_name, period, academic_year' });
    if (!error) loadClassData();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans text-slate-900">
      
      <div className="max-w-[1600px] mx-auto mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-xl border border-white">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase italic">LES OURSINS <span className="text-indigo-600 font-bold tracking-normal not-italic underline decoration-indigo-200">ACADEMY</span></h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                {isSecondCycle ? "Régime : Second Cycle / Lycée" : "Régime : Premier Cycle / Fondamental"}
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {[
            { id: 'config', icon: Settings, label: 'Configuration' },
            { id: 'saisie', icon: PenTool, label: 'Saisie Notes' },
            { id: 'resultats', icon: Trophy, label: 'Bulletins' },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id as any)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${tab === item.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>
              <item.icon size={14} /> {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        <div className="md:col-span-1 space-y-4">
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Classe</label>
              <select onChange={(e) => setSelectedClassId(e.target.value)} value={selectedClassId} className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition-all">
                <option value="">Sélectionner...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Période d'évaluation</label>
              <select onChange={(e) => setPeriod(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold">
                <option>1er Trimestre</option>
                <option>2e Trimestre</option>
                <option>3e Trimestre</option>
                <option>Examen Final</option>
                <option> composition du mois de janvier </option>
                <option> composition du mois de fevrier </option>
                <option>composition du mois de mars</option>
                <option>composition du mois d'avril</option>
                <option>composition du mois mai</option>
                <option>composition du mois de juin</option>
                <option>composition du mois de juillet</option>
                <option>compositin du mois d'aout</option>
                <option>composition du mois de septembre</option>
                <option>composition du mois d'octobre</option>
                <option>composition du mois de </option>
              </select>
           </div>

           {tab === 'saisie' && selectedClassId && (
             <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-left-2">
                <label className="text-[10px] font-black uppercase text-indigo-400 block mb-2">Rechercher un élève</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    value={searchSaisie}
                    onChange={(e) => setSearchSaisie(e.target.value)}
                    placeholder="Nom ou prénom..."
                    className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-3 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
             </div>
           )}

           {tab === 'resultats' && selectedClassId && (
             <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm">
                  <label className="text-[10px] font-black uppercase text-indigo-400 block mb-2">Rechercher un bulletin</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      value={searchBulletins}
                      onChange={(e) => setSearchBulletins(e.target.value)}
                      placeholder="Nom de l'élève..."
                      className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-3 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <button 
                  onClick={downloadAllInOnePDF}
                  disabled={loading || bulletinData.length === 0}
                  className="w-full bg-slate-900 text-white p-6 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-lg"
                >
                  <Download size={18} /> {loading ? 'Création du PDF...' : 'Tout exporter en 1 PDF'}
                </button>
             </div>
           )}
        </div>

        <div className="md:col-span-3">

          {tab === 'config' && selectedClassId && (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-black uppercase italic mb-6">Configuration des Matières</h2>
              <div className="flex gap-4 mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Nom de la matière</label>
                  <input value={newSubName} onChange={(e) => setNewSubName(e.target.value)} type="text" placeholder="Ex: Mathématiques" className="w-full p-3 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="w-32">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Coefficient</label>
                  <input value={newSubCoeff} onChange={(e) => setNewSubCoeff(e.target.value)} type="number" step="1" className="w-full p-3 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex items-end">
                  <button onClick={addSubject} className="bg-indigo-600 text-white p-3.5 rounded-xl hover:bg-slate-900 transition-all">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {subjects.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-sm">{s.subject_name}</p>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Coefficient: {s.coefficient}</p>
                    </div>
                    <button onClick={() => deleteSubject(s.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {tab === 'saisie' && selectedClassId && (
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden overflow-x-auto animate-in fade-in duration-500">
              <table className="w-full border-collapse">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-8 text-left text-[11px] font-black uppercase tracking-widest sticky left-0 bg-slate-900 z-10">Liste des Élèves</th>
                    {subjects.map(s => (
                      <th key={s.id} className="p-6 text-center border-l border-slate-800 min-w-[180px]">
                        <span className="text-sm font-black uppercase block tracking-tighter">{s.subject_name}</span>
                        <span className="text-[9px] text-indigo-400 font-bold uppercase opacity-80">
                            {isSecondCycle ? "Notes : Cl. | Cp." : `Coeff. ${s.coefficient}`}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudentsSaisie.map(student => (
                    <tr key={student.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="p-8 sticky left-0 bg-white border-r border-slate-50">
                        <p className="font-black text-slate-900 uppercase italic text-base leading-tight">
                          {student.last_name}
                        </p>
                        <p className="text-xs font-bold text-slate-400">{student.first_name}</p>
                      </td>
                      {subjects.map(sub => {
                        const grade = rawGrades.find(g => g.student_id === student.id && g.subject_name === sub.subject_name);
                        return (
                          <td key={sub.id} className="p-4 border-l border-slate-50">
                            <div className="flex gap-3 justify-center items-center">
                              
                              {/* On n'affiche la Note de Classe que pour le Second Cycle */}
                              {isSecondCycle && (
                                <div className="flex flex-col items-center">
                                  <span className="text-[8px] font-black text-slate-300 uppercase mb-1">Classe</span>
                                  <input 
                                    type="number" step="0.25" max="20"
                                    defaultValue={grade?.grade_value}
                                    onBlur={(e) => saveGrade(student.id, sub.subject_name, 'grade_value', e.target.value)}
                                    className="w-16 h-14 bg-white border-2 border-slate-100 text-center font-black text-slate-700 rounded-2xl text-xl shadow-inner focus:border-indigo-500 outline-none transition-all"
                                    placeholder="00"
                                  />
                                </div>
                              )}

                              <div className="flex flex-col items-center">
                                <span className={`text-[8px] font-black uppercase mb-1 ${isSecondCycle ? 'text-indigo-300' : 'text-emerald-400'}`}>
                                  {isSecondCycle ? 'Compo' : 'Note (/10)'}
                                </span>
                                <input 
                                  type="number" step="0.25" max={isSecondCycle ? "20" : "10"}
                                  defaultValue={grade?.compo_value}
                                  onBlur={(e) => saveGrade(student.id, sub.subject_name, 'compo_value', e.target.value)}
                                  className={`w-16 h-14 border-2 text-center font-black rounded-2xl text-xl shadow-inner outline-none transition-all ${
                                    isSecondCycle 
                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-600 focus:border-indigo-500' 
                                    : 'bg-emerald-50 border-emerald-100 text-emerald-600 focus:border-emerald-500'
                                  }`}
                                  placeholder="00"
                                />
                              </div>

                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'resultats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-5 duration-500">
              {bulletinData.map((s) => (
                <div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg relative group">
                  <div className="absolute top-6 right-6 bg-slate-900 text-white px-4 py-2 rounded-full font-black text-sm italic">Rang: {s.rang}</div>
                  <h3 className="text-2xl font-black uppercase italic mb-8">{s.last_name} {s.first_name}</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-indigo-600 p-6 rounded-3xl text-center text-white shadow-lg shadow-indigo-100">
                      <p className="text-[10px] font-black uppercase opacity-60">Moyenne Générale</p>
                      <p className="text-4xl font-black italic">{s.moyenne} <span className="text-base opacity-75">{isSecondCycle ? '/20' : '/10'}</span></p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl text-center flex flex-col justify-center border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400">Mention Obtenue</p>
                      <p className={`text-sm font-black uppercase ${s.moyenne >= (isSecondCycle ? 10 : 5) ? 'text-emerald-600' : 'text-rose-600'}`}>{getMention(s.moyenne)}</p>
                    </div>
                  </div>

                  <div className="mb-8 space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Aperçu des notes :</p>
                    {s.notes.map((n: any) => (
                      <div key={n.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-600 truncate mr-4">{n.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-300">coeff.{n.coeff}</span>
                          <span className="text-sm font-black text-indigo-600 bg-white px-2 py-1 rounded-lg border border-slate-200">{n.moyenneMatiere}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => downloadPDF(s)} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100">
                    <FileText size={18} /> Générer ce Bulletin
                  </button>

                  {/* TEMPLATE CACHÉ POUR LE PDF */}
                  <div style={{ position: 'absolute', top: '-10000px', left: 0 }}>
                    <div id={`bulletin-pdf-${s.id}`} style={{ padding: '40px', background: 'white', color: '#0f172a', fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif', width: '210mm', minHeight: '297mm', boxSizing: 'border-box', pageBreakAfter: 'always', breakAfter: 'page', pageBreakInside: 'avoid' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px' }}>
                        <div>
                          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: '#4f46e5', letterSpacing: '-0.5px' }}>Ecole priveé Fankele OUATARA</h1>

                          <h2 style={{ margin: '8px 0 0 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b', fontWeight: 'bold' }}>CAP de sogoniko</h2>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-block', background: '#4f46e5', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                            Bulletin de Notes
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#334155' }}>Période : <span style={{ color: '#4f46e5' }}>{period}</span></p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Année Scolaire : {year}</p>
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', letterSpacing: '1px' }}>Identité de l'élève</p>
                          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>{s.last_name} {s.first_name}</h2>
                          <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}><strong style={{ color: '#0f172a' }}>Classe :</strong> {classes.find(c => c.id === selectedClassId)?.name}</p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}><strong style={{ color: '#0f172a' }}>Régime :</strong> {isSecondCycle ? "Second Cycle" : "Premier Cycle"}</p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', background: 'white', padding: '12px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          <p style={{ margin: '0 0 4px 0', fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700' }}>Rang de l'élève</p>
                          <p style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#4f46e5' }}>{s.rang} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>/ {students.length}</span></p>
                        </div>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                        <thead>
                          <tr>
                            <th style={{ background: '#f1f5f9', color: '#334155', padding: '12px 15px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e2e8f0', borderTopLeftRadius: '8px' }}>Matière</th>
                            <th style={{ background: '#f1f5f9', color: '#334155', padding: '12px 15px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e2e8f0' }}>Coeff</th>
                            {isSecondCycle && <th style={{ background: '#f1f5f9', color: '#334155', padding: '12px 15px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e2e8f0' }}>Classe</th>}
                            {isSecondCycle && <th style={{ background: '#f1f5f9', color: '#334155', padding: '12px 15px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e2e8f0' }}>Compo</th>}
                            <th style={{ background: '#f1f5f9', color: '#334155', padding: '12px 15px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e2e8f0' }}>Moy/{isSecondCycle ? '20' : '10'}</th>
                            <th style={{ background: '#f1f5f9', color: '#334155', padding: '12px 15px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e2e8f0' }}>Pondéré</th>
                            <th style={{ background: '#f1f5f9', color: '#334155', padding: '12px 15px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e2e8f0', borderTopRightRadius: '8px' }}>Appréciation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.notes.map((n: any, idx: number) => (
                            <tr key={n.name} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{n.name}</td>
                              <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>{n.coeff}</td>
                              {isSecondCycle && <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>{n.noteClasse}</td>}
                              {isSecondCycle && <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>{n.noteCompo}</td>}
                              <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{n.moyenneMatiere}</td>
                              <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>{n.points.toFixed(2)}</td>
                              <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '12px', fontStyle: 'italic', color: '#475569' }}>{getAppreciation(n.moyenneMatiere)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '50px' }}>
                        <div style={{ width: '380px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Pondéré</span>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{s.totalPoints.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <span style={{ fontSize: '15px', color: '#0f172a', fontWeight: '800', textTransform: 'uppercase' }}>Moyenne Générale</span>
                            <span style={{ fontSize: '26px', fontWeight: '900', color: '#4f46e5' }}>{s.moyenne} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/{isSecondCycle ? '20' : '10'}</span></span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'inline-block', background: s.moyenne >= (isSecondCycle ? 10 : 5) ? '#dcfce7' : '#fee2e2', color: s.moyenne >= (isSecondCycle ? 10 : 5) ? '#166534' : '#991b1b', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              Mention : {getMention(s.moyenne)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ width: '35%' }}>
                          <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Signature des parents</p>
                          
                        </div>
                        <div style={{ width: '35%', textAlign: 'right' }}>
                          <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Le Directeur des Études</p>
                          
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}  
        </div>      
      </div>
    </div>
  );      
};    