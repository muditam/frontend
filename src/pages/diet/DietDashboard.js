import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';


const API         = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const FRONTEND    = window.location.origin || 'http://localhost:3000';


const C = {
 primary: '#2563eb', accent: '#ffc107', bg: '#f6f8fb', surface: '#ffffff',
 text: '#0f172a', sub: '#64748b', border: '#e2e8f0',
 success: '#16a34a', danger: '#dc2626', warning: '#f59e0b',
};


const card = {
 background: C.surface, border: `1px solid ${C.border}`,
 borderRadius: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
};


const TAG = (active, color = C.primary) => ({
 fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
 background: active ? `${color}18` : '#f1f5f9',
 color: active ? color : C.sub,
 border: `1px solid ${active ? `${color}30` : C.border}`,
});


const GOAL_LABELS = {
 weightLoss: 'Weight Loss', weightMaintenance: 'Maintenance', muscleGain: 'Muscle Gain',
 fatShredding: 'Fat Shredding', diabetes: 'Diabetes', pcos: 'PCOS',
 cholesterol: 'Cholesterol', hypertension: 'BP', thyroid: 'Thyroid',
 ibs: 'IBS', pregnancy: 'Pregnancy', lactation: 'Lactation',
 anemia: 'Anemia', osteoporosis: 'Osteoporosis', uricAcid: 'Uric Acid',
 heartDisease: 'Heart', liverDisease: 'Liver', immunityBooster: 'Immunity',
 skinHealth: 'Skin', hairHealth: 'Hair',
};
const glabel = g => GOAL_LABELS[g] || g;

function getSessionUserHeaders() {
  try {
    const raw = sessionStorage.getItem('user');
    return {};
  } catch {
    return {};
  }
}

async function apiFetch(url, options = {}) {
  const mergedHeaders = {
    ...getSessionUserHeaders(),
    ...(options.headers || {}),
  };

  return fetch(url, {
    credentials: 'include',
    ...options,
    headers: mergedHeaders,
  });
}


// ── Generate Link Modal ────────────────────────────────────────────────────────
function GenerateLinkModal({ onClose }) {
 const [query,       setQuery]       = useState('');
 const [results,     setResults]     = useState([]);
 const [searching,   setSearching]   = useState(false);
 const [selected,    setSelected]    = useState(null);   // { leadId, name, phone }
 const [generating,  setGenerating]  = useState(false);
 const [shareUrl,    setShareUrl]    = useState('');
 const [copied,      setCopied]      = useState(false);
 const debounceRef = useRef(null);


 const search = useCallback(async (q) => {
   if (!q.trim()) { setResults([]); return; }
   setSearching(true);
   try {
     const res  = await apiFetch(`${API}/api/smart-diet-plan/leads-search?q=${encodeURIComponent(q)}&limit=20`);
     const data = await res.json();
     if (!res.ok) throw new Error(data.error || 'Search failed');
     setResults(data.results || []);
   } catch { setResults([]); }
   finally { setSearching(false); }
 }, []);


 const handleQueryChange = (e) => {
   const v = e.target.value;
   setQuery(v);
   setSelected(null);
   setShareUrl('');
   clearTimeout(debounceRef.current);
   debounceRef.current = setTimeout(() => search(v), 300);
 };


 const selectLead = (lead) => {
   setSelected(lead);
   setResults([]);
   setQuery(lead.name + (lead.phone ? ` · ${lead.phone}` : ''));
   setShareUrl('');
 };


 const generateLink = async () => {
   if (!selected) return;
   setGenerating(true);
   try {
     const res  = await apiFetch(`${API}/api/smart-diet-plan/generate-token`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ leadId: selected.leadId, clientName: selected.name, clientPhone: selected.phone }),
     });
     const data = await res.json();
     if (!res.ok) throw new Error(data.error || 'Failed');
     setShareUrl(`${FRONTEND}/diet-onboarding?token=${data.token}`);
   } catch (e) {
     alert(e.message);
   } finally { setGenerating(false); }
 };


 const copyLink = async () => {
   try {
     await navigator.clipboard.writeText(shareUrl);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000);
   } catch {
     // fallback: select the input
     document.getElementById('share-url-input')?.select();
   }
 };


 return (
   <div style={{
     position: 'fixed', inset: 0, zIndex: 9000,
     background: 'rgba(15,23,42,0.45)',
     display: 'flex', alignItems: 'center', justifyContent: 'center',
     fontFamily: 'Noto Sans, sans-serif',
   }}
     onClick={e => { if (e.target === e.currentTarget) onClose(); }}>


     <div style={{ ...card, width: 520, padding: 28, position: 'relative' }}>
       {/* Header */}
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
         <div>
           <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>Generate Onboarding Link</div>
           <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>Search a customer → generate a unique link → share it with them</div>
         </div>
         <button onClick={onClose}
           style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.sub, lineHeight: 1 }}>✕</button>
       </div>


       {/* Search */}
       <div style={{ position: 'relative', marginBottom: 4 }}>
         <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
           Search Customer
         </div>
         <input
           value={query}
           onChange={handleQueryChange}
           placeholder="Type name or phone number…"
           autoFocus
           style={{
             width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
             border: `1.5px solid ${selected ? C.success : C.border}`, fontSize: 14, outline: 'none',
             fontFamily: 'Noto Sans, sans-serif', color: C.text,
           }}
         />
         {searching && (
           <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: C.sub }}>
             Searching…
           </div>
         )}


         {/* Dropdown results */}
         {results.length > 0 && (
           <div style={{
             position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
             background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
             boxShadow: '0 8px 24px rgba(15,23,42,0.12)', marginTop: 4, maxHeight: 260, overflowY: 'auto',
           }}>
             {results.map(r => (
               <div key={r.leadId}
                 onClick={() => selectLead(r)}
                 style={{
                   padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`,
                   display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                 }}
                 onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                 onMouseLeave={e => e.currentTarget.style.background = C.surface}>
                 <div>
                   <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name || '(No name)'}</div>
                   <div style={{ fontSize: 11, color: C.sub }}>{r.phone || '—'}</div>
                 </div>
                 <div style={{ display: 'flex', gap: 6 }}>
                   {r.status && <span style={TAG(true, C.primary)}>{r.status}</span>}
                   {r.type   && <span style={TAG(true, C.warning)}>{r.type}</span>}
                 </div>
               </div>
             ))}
           </div>
         )}
       </div>


       {/* Selected summary */}
       {selected && !shareUrl && (
         <div style={{ padding: '12px 14px', borderRadius: 8, background: '#f0fdf4', border: `1px solid #bbf7d0`, marginTop: 12, marginBottom: 4 }}>
           <div style={{ fontSize: 13, fontWeight: 700, color: C.success }}>✓ Selected: {selected.name}</div>
           {selected.phone && <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{selected.phone}</div>}
         </div>
       )}


       {/* Generate button */}
       {selected && !shareUrl && (
         <button
           onClick={generateLink}
           disabled={generating}
           style={{
             width: '100%', marginTop: 14, padding: '11px 0', borderRadius: 8, border: 'none',
             background: generating ? C.border : C.primary, color: generating ? C.sub : '#fff',
             fontSize: 14, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer',
             fontFamily: 'Noto Sans, sans-serif',
           }}>
           {generating ? 'Generating…' : 'Generate Unique Link'}
         </button>
       )}


       {/* Share URL */}
       {shareUrl && (
         <div style={{ marginTop: 16 }}>
           <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
             Shareable Link (valid 30 days)
           </div>
           <div style={{ display: 'flex', gap: 8 }}>
             <input
               id="share-url-input"
               readOnly
               value={shareUrl}
               style={{
                 flex: 1, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${C.primary}`,
                 fontSize: 12, fontFamily: 'monospace', color: C.text, background: '#f8fafc', outline: 'none',
               }}
               onClick={e => e.target.select()}
             />
             <button
               onClick={copyLink}
               style={{
                 padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                 background: copied ? C.success : C.primary, color: '#fff',
                 fontSize: 13, fontWeight: 700, fontFamily: 'Noto Sans, sans-serif',
                 whiteSpace: 'nowrap', flexShrink: 0,
               }}>
               {copied ? '✓ Copied!' : 'Copy'}
             </button>
           </div>
           <div style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>
             Share this link with <strong>{selected?.name}</strong>. When they fill the form, they appear in the Clients table below.
           </div>
           {/* Generate another */}
           <button
             onClick={() => { setSelected(null); setShareUrl(''); setQuery(''); }}
             style={{ marginTop: 14, padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontSize: 13, color: C.text }}>
             ← Generate for another customer
           </button>
         </div>
       )}
     </div>
   </div>
 );
}


// ── KPI Card ───────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color }) {
 return (
   <div style={{ ...card, flex: 1, padding: 20 }}>
     <div style={{ fontSize: 28, fontWeight: 800, color: color || C.text }}>{value}</div>
     <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{label}</div>
     {sub && <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{sub}</div>}
   </div>
 );
}


// ── Client Row ─────────────────────────────────────────────────────────────────
function ClientRow({ profile, planCount, latestPlan, generating, onGenerate, onOpen, onOnboard, onCopyLink, copied }) {
 const [hovered, setHovered] = useState(false);


 const bmiVal = profile.heightCm > 0
   ? (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
   : null;
 const bmiColor = !bmiVal ? C.sub
   : bmiVal < 18.5 ? C.warning
   : bmiVal < 25   ? C.success
   : bmiVal < 30   ? C.warning
   : C.danger;


 return (
   <div
     onMouseEnter={() => setHovered(true)}
     onMouseLeave={() => setHovered(false)}
     style={{
       display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.8fr 0.8fr 1fr auto',
       gap: 12, alignItems: 'center',
       padding: '13px 20px',
       background: hovered ? '#f8fafc' : C.surface,
       borderBottom: `1px solid ${C.border}`,
       fontSize: 13,
     }}>


     {/* Name + meta */}
     <div>
       <div style={{ fontWeight: 700, color: C.text }}>{profile.clientName || '—'}</div>
       <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>
         {profile.clientPhone || ''}{profile.clientPhone && profile.gender ? ' · ' : ''}{profile.gender} {profile.age ? `· ${profile.age}y` : ''}{profile.dietType ? ` · ${profile.dietType}` : ''}
       </div>
       <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
         {profile.goal && <span style={TAG(true, C.primary)}>{glabel(profile.goal)}</span>}
         {(profile.healthConditions || []).slice(0, 2).map(c => (
           <span key={c} style={TAG(true, C.warning)}>{glabel(c)}</span>
         ))}
       </div>
     </div>


     {/* Calorie */}
     <div>
       <div style={{ fontWeight: 600, color: C.text }}>{profile.calorieTarget || '—'}</div>
       <div style={{ fontSize: 11, color: C.sub }}>kcal / day</div>
     </div>


     {/* BMI */}
     <div>
       <div style={{ fontWeight: 600, color: bmiColor }}>{bmiVal || '—'}</div>
       <div style={{ fontSize: 11, color: C.sub }}>BMI</div>
     </div>


     {/* Plans */}
     <div>
       <div style={{ fontWeight: 600, color: C.text }}>{planCount}</div>
       <div style={{ fontSize: 11, color: C.sub }}>plans</div>
     </div>


     {/* Last plan */}
     <div>
       <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>
         {latestPlan
           ? new Date(latestPlan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
           : '—'}
       </div>
       <div style={{ fontSize: 11, color: C.sub }}>last plan</div>
     </div>


     {/* Actions */}
     <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
       <button onClick={onOnboard}
         style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontSize: 11, color: C.sub }}>
         Edit
       </button>
       {planCount <= 0 && (
         <button onClick={onGenerate} disabled={!!generating}
           style={{
             padding: '6px 10px', borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 600,
             background: generating ? C.border : '#eff6ff', color: generating ? C.sub : C.primary,
             cursor: generating ? 'not-allowed' : 'pointer',
           }}>
           {generating ? '…' : 'Generate'}
         </button>
       )}
       {planCount > 0 && (
         <div style={{ display: 'grid', gap: 6 }}>
           <button onClick={onOpen}
             style={{ padding: '6px 10px', borderRadius: 7, border: 'none', background: C.primary, cursor: 'pointer', fontSize: 11, color: '#fff', fontWeight: 700 }}>
             Open Diet Plan
           </button>
           <button
             onClick={onCopyLink}
             title="Copy client diet plan link"
             style={{
               width: 32, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface,
               cursor: 'pointer', fontSize: 14, color: copied ? C.success : C.sub, fontWeight: 700,
             }}
           >
             🔗
           </button>
         </div>
       )}
     </div>
   </div>
 );
}


// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DietDashboard() {
 const navigate = useNavigate();


 const [profiles,    setProfiles]    = useState([]);
 const [planCounts,  setPlanCounts]  = useState({});
 const [latestPlans, setLatestPlans] = useState({});
 const [loading,     setLoading]     = useState(false);
 const [search,      setSearch]      = useState('');
 const [filterGoal,  setFilterGoal]  = useState('');
 const [generating,  setGenerating]  = useState(null);
 const [genError,    setGenError]    = useState('');
 const [loadError,   setLoadError]   = useState('');
 const [showModal,   setShowModal]   = useState(false);
 const [copiedLeadId, setCopiedLeadId] = useState('');


 const fetchProfiles = useCallback(async () => {
   setLoading(true);
   setLoadError('');
   try {
     const res  = await apiFetch(`${API}/api/smart-diet-plan/health-profile-list?limit=100`);
     const data = await res.json();
     if (!res.ok) {
       throw new Error(res.status === 401 ? 'Unauthorized. Please log in again.' : (data.error || 'Failed to load clients'));
     }
     const items = data.items || [];
     setProfiles(items);


     // Fetch plan counts in parallel
     const counts = {}, lates = {};
     await Promise.all(items.map(async p => {
       try {
         const r = await apiFetch(`${API}/api/smart-diet-plan/by-lead/${p.leadId}?limit=1`);
         const d = await r.json();
         if (!r.ok) throw new Error(d.error || 'Failed to load plan list');
         counts[p.leadId] = d.total || 0;
         lates[p.leadId]  = (d.items || [])[0] || null;
       } catch { counts[p.leadId] = 0; }
     }));
     setPlanCounts(counts);
     setLatestPlans(lates);
   } catch (e) {
     setProfiles([]);
     setPlanCounts({});
     setLatestPlans({});
     setLoadError(e.message || 'Failed to load diet dashboard.');
   }
   finally { setLoading(false); }
 }, []);


 useEffect(() => { fetchProfiles(); }, [fetchProfiles]);


 const generatePlan = async (leadId) => {
   setGenerating(leadId); setGenError('');
   try {
     const res  = await apiFetch(`${API}/api/smart-diet-plan/generate`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ leadId }),
     });
     const data = await res.json();
     if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized. Please log in again.' : (data.error || 'Generation failed'));
     const p = profiles.find(x => String(x.leadId) === String(leadId));
     navigate(`/smart-diet-plan?leadId=${leadId}&planId=${data._id}&name=${encodeURIComponent(p?.clientName || '')}`);
   } catch (e) {
     setGenError(e.message);
   } finally { setGenerating(null); }
 };


 const filtered = profiles.filter(p => {
   const q = search.toLowerCase();
   const matchQ    = !q || (p.clientName || '').toLowerCase().includes(q) || (p.clientPhone || '').includes(q);
   const matchGoal = !filterGoal || p.goal === filterGoal;
   return matchQ && matchGoal;
 });


 const withPlans  = Object.values(planCounts).filter(n => n > 0).length;
 const pending    = profiles.length - withPlans;
 const allGoals = [...new Set(profiles.map(p => p.goal).filter(Boolean))];


 return (
   <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Noto Sans, sans-serif' }}>
     {showModal && <GenerateLinkModal onClose={() => { setShowModal(false); fetchProfiles(); }} />}


     <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>


       {/* Header */}
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
         <div>
           <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Diet Plan Dashboard</h1>
           <p style={{ color: C.sub, margin: '4px 0 0', fontSize: 13 }}>
             Manage client health profiles and auto-generated diet plans
           </p>
         </div>
         <button
           onClick={() => setShowModal(true)}
           style={{
             padding: '10px 22px', borderRadius: 8, border: 'none',
             background: C.primary, color: '#fff', cursor: 'pointer',
             fontSize: 14, fontWeight: 700, fontFamily: 'Noto Sans, sans-serif',
           }}>
           + Generate Onboarding Link
         </button>
       </div>


       {/* KPIs */}
       <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
         <KPICard label="Total Clients"       value={profiles.length} sub="with health profiles"    color={C.primary} />
         <KPICard label="Plans Generated"     value={withPlans}       sub="clients with active plans" color={C.success} />
         <KPICard label="Awaiting Plans"      value={pending}         sub="profiles without a plan"  color={C.danger} />
       </div>


       {genError && (
         <div style={{ padding: '10px 16px', borderRadius: 8, background: '#fef2f2', border: `1px solid #fecaca`, color: C.danger, fontSize: 13, marginBottom: 16 }}>
           {genError}
         </div>
       )}

       {loadError && (
         <div style={{ padding: '10px 16px', borderRadius: 8, background: '#fff7ed', border: `1px solid #fed7aa`, color: '#c2410c', fontSize: 13, marginBottom: 16 }}>
           {loadError}
         </div>
       )}


       {/* Filters */}
       <div style={{ ...card, padding: '12px 18px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
         <input
           value={search} onChange={e => setSearch(e.target.value)}
           placeholder="Filter by name or phone…"
           style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, width: 240, outline: 'none' }}
         />
         <select value={filterGoal} onChange={e => setFilterGoal(e.target.value)}
           style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', background: C.surface }}>
           <option value="">All Goals</option>
           {allGoals.map(g => <option key={g} value={g}>{glabel(g)}</option>)}
         </select>
         <button onClick={fetchProfiles}
           style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontSize: 13, color: C.text }}>
           Refresh
         </button>
         <span style={{ fontSize: 12, color: C.sub, marginLeft: 'auto' }}>
           {filtered.length} client{filtered.length !== 1 ? 's' : ''}
         </span>
       </div>


       {/* Client table */}
       <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
         {/* Table header */}
         <div style={{
           display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.8fr 0.8fr 1fr auto',
           gap: 12, padding: '10px 20px',
           background: '#f8fafc', borderBottom: `1px solid ${C.border}`,
           fontSize: 11, fontWeight: 700, color: C.sub,
           textTransform: 'uppercase', letterSpacing: '0.04em',
         }}>
           <div>Client</div><div>Calorie Target</div><div>BMI</div>
           <div>Plans</div><div>Last Plan</div><div>Actions</div>
         </div>


         {loading ? (
           <div style={{ padding: 40, textAlign: 'center', color: C.sub }}>Loading clients…</div>
         ) : filtered.length === 0 ? (
           <div style={{ padding: 48, textAlign: 'center' }}>
             <div style={{ fontSize: 32, marginBottom: 10 }}>🥗</div>
             <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>
               {profiles.length === 0 ? 'No clients yet' : 'No clients match your filter'}
             </div>
             <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>
               {profiles.length === 0
                 ? 'Click "+ Generate Onboarding Link" to invite your first customer.'
                 : 'Try a different name or clear the goal filter.'}
             </div>
             {profiles.length === 0 && (
               <button onClick={() => setShowModal(true)}
                 style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                 Generate Onboarding Link
               </button>
             )}
           </div>
         ) : (
           filtered.map(profile => (
             <ClientRow
               key={String(profile.leadId)}
               profile={profile}
               planCount={planCounts[profile.leadId] || 0}
               latestPlan={latestPlans[profile.leadId]}
               generating={generating === profile.leadId}
               onGenerate={() => generatePlan(profile.leadId)}
               onOnboard={() => {
                 const latest = latestPlans[profile.leadId];
                 const qs = new URLSearchParams({
                   leadId: profile.leadId,
                   name: profile.clientName || '',
                   phone: profile.clientPhone || '',
                 });
                 if (latest?._id) qs.set('planId', latest._id);
                 navigate(`/diet-plan-editor?${qs.toString()}`);
               }}
               onOpen={() => {
                 const latest = latestPlans[profile.leadId];
                 const qs = new URLSearchParams({
                   leadId: profile.leadId,
                   name: profile.clientName || '',
                 });
                 if (latest?._id) qs.set('planId', latest._id);
                 navigate(`/smart-diet-plan?${qs.toString()}`);
               }}
               onCopyLink={async () => {
                 const latest = latestPlans[profile.leadId];
                 if (!latest?._id) return;
                 const qs = new URLSearchParams({
                   leadId: profile.leadId,
                   planId: latest._id,
                   name: profile.clientName || '',
                 });
                 const link = `${FRONTEND}/smart-diet-plan?${qs.toString()}`;
                 try {
                   await navigator.clipboard.writeText(link);
                   setCopiedLeadId(String(profile.leadId));
                   setTimeout(() => setCopiedLeadId(''), 1600);
                 } catch {
                   window.prompt('Copy this diet plan link:', link);
                 }
               }}
               copied={copiedLeadId === String(profile.leadId)}
             />
           ))
         )}
       </div>


     </div>
   </div>
 );
}


