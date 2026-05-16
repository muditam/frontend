import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';


const API        = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const PUBLIC_API = 'https://muditamleads-14f32a10d7f7.herokuapp.com/api/diet-public';


const C = {
 primary:     '#F05C7C',
 primaryDark: '#D84E6C',
 bg:          '#FFFFFF',
 text:        '#1A1A1A',
 sub:         '#909090',
 border:      '#E8E8E8',
 lightPink:   '#FFF0F3',
 success:     '#22C55E',
 danger:      '#EF4444',
};


// ── Inline SVG Illustration (two people consulting) ────────────────────────────
function ConsultIllustration() {
 return (
   <svg viewBox="0 0 260 170" width="260" height="170" style={{ display: 'block' }}>
     {/* Soft white blob */}
     <ellipse cx="130" cy="115" rx="115" ry="75" fill="rgba(255,255,255,0.18)" />


     {/* Left window */}
     <rect x="15" y="18" width="100" height="130" rx="10" fill="white" />
     <rect x="15" y="18" width="100" height="30" rx="10" fill="#F0F0F0" />
     <rect x="15" y="38" width="100" height="10" fill="#F0F0F0" />
     {/* Female person */}
     <circle cx="65" cy="98" r="21" fill="#FFCB9A" />
     <ellipse cx="65" cy="80" rx="23" ry="14" fill="#2A2A2A" />
     <ellipse cx="44" cy="90" rx="7" ry="13" fill="#2A2A2A" />
     <rect x="49" y="120" width="32" height="24" rx="7" fill="#F59E0B" />
     <ellipse cx="37" cy="128" rx="8" ry="6" fill="#FFCB9A" transform="rotate(-20 37 128)" />
     <ellipse cx="93" cy="126" rx="8" ry="6" fill="#FFCB9A" transform="rotate(20 93 126)" />


     {/* Right window */}
     <rect x="145" y="10" width="100" height="140" rx="10" fill="white" />
     {/* Venetian blinds */}
     {[0, 1, 2, 3, 4].map(i => (
       <rect key={i} x="147" y={12 + i * 9} width="96" height="7" fill="#EBEBEB" rx="2" />
     ))}
     {/* Male person */}
     <circle cx="195" cy="98" r="21" fill="#FFCB9A" />
     <ellipse cx="195" cy="82" rx="22" ry="11" fill="#4A4A4A" />
     <rect x="179" y="120" width="32" height="24" rx="7" fill="#6B7280" />
     <ellipse cx="167" cy="126" rx="8" ry="6" fill="#FFCB9A" transform="rotate(20 167 126)" />
     <ellipse cx="223" cy="128" rx="8" ry="6" fill="#FFCB9A" transform="rotate(-20 223 128)" />
   </svg>
 );
}


// ── Data ───────────────────────────────────────────────────────────────────────
const ACTIVITY_OPTIONS = [
 { code: 'AC1', label: 'Sedentary',         desc: 'No Exercise',                        icon: '🧘', blob: '#EDE4F5' },
 { code: 'AC2', label: 'Lightly Active',    desc: 'Brisk Walking, Yoga, functional exercise', icon: '🤸', blob: '#F7D7D0' },
 { code: 'AC3', label: 'Moderately Active', desc: 'Workout 5 days a week',              icon: '🏃', blob: '#DEE5F8' },
 { code: 'AC4', label: 'Super Active',      desc: 'Rigorous workout, 5 days a week',    icon: '🏋️', blob: '#F4EED8' },
 { code: 'AC5', label: 'Extremely Active',  desc: 'Rigorous workout, 2 times a day',    icon: '🏋️‍♂️', blob: '#DEE5F8' },
];


const GOAL_OPTIONS = [
 { code: 'weightLoss',   title: 'Weight Loss',         subtitle: 'Lose weight, feel lighter',  emoji: '🚴', blob: '#FAD8D2' },
 { code: 'muscleGain',   title: 'Muscle Building',     subtitle: 'Pump and get stronger',       emoji: '🏋️', blob: '#FAD8D2' },
 { code: 'fatShredding', title: 'Lean Body',           subtitle: 'Maintain muscles and lose fat', emoji: '🤸', blob: '#EBDFF6' },
 { code: 'diabetes',     title: 'Manage Diabetes',     subtitle: 'Optimize blood glucose levels', emoji: '🩺', blob: '#FAD8D2' },
 { code: 'pcos',         title: 'Manage PCOS',         subtitle: 'No more irregular periods',   emoji: '📱', blob: '#EFE3F8' },
 { code: 'cholesterol',  title: 'Manage Cholesterol',  subtitle: 'Better heart health daily',   emoji: '🥗', blob: '#EFEAF5' },
 { code: 'hypertension', title: 'Manage Hypertension', subtitle: 'Keep blood pressure steady',  emoji: '🧘', blob: '#FAD8D2' },
];


const DIET_TYPES = [
 { code: 'V',  title: 'Vegetarian',       subtitle: '', icon: '🥦' },
 { code: 'NV', title: 'Non-Vegetarian',   subtitle: '', icon: '🥩' },
 { code: 'E',  title: 'Vegetarian + Egg', subtitle: '', icon: '🥚' },
 { code: 'Ve', title: 'Vegan',            subtitle: '', icon: '🍃' },
];


const COMMUNITY_OPTIONS = [
 { code: 'B', label: 'Bengali' },
 { code: 'P', label: 'North India' },
 { code: 'G', label: 'Gujarat' },
 { code: 'M', label: 'Maharashtra' },
 { code: 'T', label: 'Tamil Nadu' },
 { code: 'A', label: 'Andhra Pradesh' },
 { code: 'R', label: 'Karnataka' },
 // Telangana uses existing backend-compatible code `H` (legacy Hyderabad slot).
 { code: 'H', label: 'Telangana' },
];


const HEALTH_CONDITIONS = [
 'weightLoss', 'diabetes', 'pcos', 'cholesterol', 'hypertension',
 'muscleGain', 'fatShredding', 'thyroid', 'ibs', 'kidneyStonesOxalate',
 'pregnancy', 'lactation', 'glp1', 'anemia', 'osteoporosis',
 'uricAcid', 'heartDisease', 'liverDisease', 'immunityBooster',
 'skinHealth', 'hairHealth',
];


const ALLERGY_OPTIONS = [
 { code: 'SF', label: '🐟 Seafood' },
 { code: 'ML', label: '🥛 Dairy / Milk' },
 { code: 'F',  label: '🍎 Fruits' },
 { code: 'E',  label: '🥚 Eggs' },
 { code: 'N',  label: '🥜 Nuts' },
 { code: 'G',  label: '🌾 Gluten' },
];


const STEPS = ['Your Goal', 'Vitals', 'Activity Level', 'Diet Preference', 'Health & Allergies', 'Meals'];


// ── Chip ───────────────────────────────────────────────────────────────────────
function Chip({ label, active, onClick }) {
 return (
   <button type="button" onClick={onClick}
     style={{
       padding: '8px 16px', borderRadius: 999, fontSize: 13.5,
       cursor: 'pointer', fontFamily: 'inherit',
       fontWeight: active ? 600 : 400,
       background: active ? C.primary : '#FFF',
       color:      active ? '#fff'    : C.text,
       border:     `1.5px solid ${active ? C.primary : C.border}`,
       transition: 'all 0.15s',
     }}>
     {label}
   </button>
 );
}


// ── Underline Input ────────────────────────────────────────────────────────────
function UnderlineInput({ value, onChange, placeholder, type = 'text', min, max }) {
 const [focused, setFocused] = useState(false);
 return (
   <input
     type={type} value={value} onChange={onChange}
     placeholder={placeholder} min={min} max={max}
     onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
     style={{
       width: '100%', border: 'none', borderBottom: `2px solid ${focused ? C.primary : C.border}`,
       padding: '10px 0', fontSize: 16, fontFamily: 'inherit', color: C.text,
       background: 'transparent', outline: 'none', boxSizing: 'border-box',
       transition: 'border-color 0.2s',
     }}
   />
 );
}


// ── Label ──────────────────────────────────────────────────────────────────────
function FieldLabel({ children }) {
 return (
   <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
     {children}
   </div>
 );
}

function clampNumber(num, min, max) {
 return Math.max(min, Math.min(max, num));
}

function formatFeetInchesFromCm(cm) {
 const parsed = Number(cm);
 if (!Number.isFinite(parsed) || parsed <= 0) return '';
 const totalInchesRounded = Math.round(parsed / 2.54);
 const feet = Math.floor(totalInchesRounded / 12);
 const inches = totalInchesRounded - feet * 12;
 return `${feet}'${inches}`;
}

function parseFeetInchesToCm(input) {
 const raw = String(input || '').trim();
 if (!raw) return NaN;

 const normalized = raw
   .replace(/[′’]/g, "'")
   .replace(/[″”]/g, '"')
   .replace(/\s+/g, ' ')
   .trim();

 const match = normalized.match(/^(\d+)\s*(?:'|ft|\s|-)?\s*(\d{1,2})?\s*(?:"|in)?$/i);
 if (!match) return NaN;

 const feet = Number(match[1] || 0);
 const inches = Number(match[2] || 0);
 if (!Number.isFinite(feet) || !Number.isFinite(inches) || inches > 11) return NaN;

 return Math.round((feet * 12 + inches) * 2.54);
}


function WeightGaugePicker({ label, rawValue, min, max, step = 0.5, onChange, unit = 'kg', tone = 'default' }) {
 const isEmphasis = tone === 'emphasis';
 const hasRaw = rawValue !== '' && rawValue !== null && rawValue !== undefined;
 const parsed = parseFloat(rawValue);
 const v = hasRaw && !Number.isNaN(parsed) ? Math.max(min, Math.min(max, parsed)) : min;
 const [draft, setDraft] = useState(hasRaw ? String(rawValue) : '');

 useEffect(() => {
   setDraft(hasRaw ? String(rawValue) : '');
 }, [hasRaw, rawValue]);


 return (
   <div style={{
     background: isEmphasis ? '#E8F1FF' : '#fff',
     borderRadius: 18,
     border: isEmphasis ? '2px solid #3B82F6' : `1.5px solid ${C.border}`,
     padding: '14px 14px 18px',
   }}>
     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
       <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{label}</div>
       <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
         <input
           type="text"
           inputMode="decimal"
           value={draft}
           onChange={(e) => {
             const txt = e.target.value;
             if (/^\d*\.?\d*$/.test(txt)) {
               setDraft(txt);
               onChange(txt);
             }
           }}
           onBlur={() => {
             if (!draft) {
               onChange('');
               return;
             }
             const next = parseFloat(draft);
             if (Number.isNaN(next)) {
               setDraft('');
               onChange('');
               return;
             }
             const normalized = String(clampNumber(next, min, max).toFixed(1));
             setDraft(normalized);
             onChange(normalized);
           }}
           style={{
             width: 118,
             textAlign: 'right',
             border: 'none',
             borderBottom: `2px solid ${C.primary}`,
             background: 'transparent',
             outline: 'none',
             fontSize: 38,
             lineHeight: 1,
             fontWeight: 800,
             color: C.text,
             fontFamily: 'inherit',
           }}
         />
         <span style={{ fontSize: 18, color: C.sub, marginLeft: 4 }}>{unit}</span>
       </div>
     </div>


     <div style={{ position: 'relative', paddingTop: 8 }}>
       <input
         type="range"
         min={min}
         max={max}
         step={step}
         value={v}
         onChange={e => {
           const next = String(Number(e.target.value).toFixed(1));
           setDraft(next);
           onChange(next);
         }}
         style={{ width: '100%', accentColor: C.primary, cursor: 'pointer' }}
       />
       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.sub, marginTop: 4 }}>
         <span>{min} {unit}</span>
         <span>{max} {unit}</span>
       </div>
     </div>
   </div>
 );
}


function HeightRulerPicker({ valueCm, unitMode, onUnitModeChange, onChangeCm, minCm = 120, maxCm = 220 }) {
 const hasRaw = valueCm !== '' && valueCm !== null && valueCm !== undefined;
 const rawNum = parseFloat(valueCm);
 const clampedCm = hasRaw && !Number.isNaN(rawNum) ? clampNumber(rawNum, minCm, maxCm) : minCm;
 const [cmDraft, setCmDraft] = useState(hasRaw ? String(valueCm) : '');
 const [feetDraft, setFeetDraft] = useState(hasRaw ? formatFeetInchesFromCm(clampedCm) : '');
 const [isEditingCm, setIsEditingCm] = useState(false);
 const [isEditingFeet, setIsEditingFeet] = useState(false);

 useEffect(() => {
   if (!hasRaw) {
     if (!isEditingCm) setCmDraft('');
     if (!isEditingFeet) setFeetDraft('');
     return;
   }
   if (!isEditingCm) setCmDraft(String(valueCm));
   if (!isEditingFeet) setFeetDraft(formatFeetInchesFromCm(clampedCm));
 }, [clampedCm, hasRaw, isEditingCm, isEditingFeet, valueCm]);


 return (
   <div style={{ background: '#fff', borderRadius: 18, border: `1.5px solid ${C.border}`, padding: 14 }}>
     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
       <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>How tall are you?</div>
       <div style={{ display: 'inline-flex', border: `1px solid ${C.border}`, borderRadius: 999, overflow: 'hidden' }}>
         {['cm', 'feet'].map(u => (
           <button
             key={u}
             type="button"
             onClick={() => onUnitModeChange(u)}
             style={{
               padding: '6px 12px',
               border: 'none',
               background: unitMode === u ? C.primary : '#fff',
               color: unitMode === u ? '#fff' : C.text,
               fontSize: 12,
               fontWeight: 700,
               cursor: 'pointer',
               fontFamily: 'inherit',
               textTransform: u === 'cm' ? 'none' : 'capitalize',
             }}
           >
             {u}
           </button>
         ))}
       </div>
     </div>


     <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
       <input
         type="text"
         inputMode={unitMode === 'cm' ? 'numeric' : 'text'}
         value={unitMode === 'cm' ? cmDraft : feetDraft}
         onFocus={() => {
           if (unitMode === 'cm') setIsEditingCm(true);
           else setIsEditingFeet(true);
         }}
         onChange={(e) => {
           const txt = e.target.value;
           if (txt === '') {
             if (unitMode === 'cm') setCmDraft('');
             else setFeetDraft('');
             onChangeCm('');
             return;
           }
           if (unitMode === 'cm') {
             if (/^\d*$/.test(txt)) {
               setCmDraft(txt);
               onChangeCm(txt);
             }
             return;
           }
           const normalizedTyping = txt.replace(/[′’]/g, "'").replace(/[^0-9'"\s-]/g, '');
           setFeetDraft(normalizedTyping);
           const nextCm = parseFeetInchesToCm(normalizedTyping);
           if (!Number.isNaN(nextCm)) onChangeCm(String(nextCm));
         }}
         onBlur={() => {
           if (unitMode === 'cm') {
             setIsEditingCm(false);
             if (!cmDraft) {
               onChangeCm('');
               return;
             }
             const next = parseFloat(cmDraft);
             if (Number.isNaN(next)) {
               setCmDraft('');
               onChangeCm('');
               return;
             }
             const normalizedCm = String(Math.round(clampNumber(next, minCm, maxCm)));
             setCmDraft(normalizedCm);
             setFeetDraft(formatFeetInchesFromCm(Number(normalizedCm)));
             onChangeCm(normalizedCm);
             return;
           }
           setIsEditingFeet(false);
           if (!feetDraft) {
             onChangeCm('');
             return;
           }
           const nextCm = parseFeetInchesToCm(feetDraft);
           if (Number.isNaN(nextCm)) {
             setFeetDraft(hasRaw ? formatFeetInchesFromCm(clampedCm) : '');
             return;
           }
           const normalizedCm = String(Math.round(clampNumber(nextCm, minCm, maxCm)));
           const normalizedFeet = formatFeetInchesFromCm(Number(normalizedCm));
           setCmDraft(normalizedCm);
           setFeetDraft(normalizedFeet);
           onChangeCm(normalizedCm);
         }}
         style={{
           width: 150,
           border: 'none',
           borderBottom: `2px solid ${C.primary}`,
           background: 'transparent',
           outline: 'none',
           fontSize: 36,
           fontWeight: 800,
           color: C.text,
           fontFamily: 'inherit',
         }}
       />
       <span style={{ fontSize: 28, fontWeight: 700, color: C.text }}>{unitMode === 'cm' ? 'cm' : 'ft'}</span>
     </div>

     {unitMode === 'feet' && (
       <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>
         Example: `5'9`
       </div>
     )}


     <div style={{ position: 'relative', paddingTop: 6 }}>
       <input
         type="range"
         min={minCm}
         max={maxCm}
         step={1}
         value={Math.round(clampedCm)}
         onChange={e => {
           const nextCm = String(Number(e.target.value));
           setCmDraft(nextCm);
           setFeetDraft(formatFeetInchesFromCm(Number(nextCm)));
           onChangeCm(nextCm);
         }}
         style={{ width: '100%', accentColor: C.primary, cursor: 'pointer' }}
       />
       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.sub, marginTop: 4 }}>
         <span>{minCm} cm</span>
         <span>{maxCm} cm</span>
       </div>
     </div>
   </div>
 );
}


function GoalCard({ option, active, onClick }) {
 return (
   <button
     type="button"
     onClick={onClick}
     style={{
       width: '100%',
       borderRadius: 18,
       border: active ? `3px solid ${C.primary}` : `1.5px solid ${C.border}`,
       background: '#fff',
       boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
       cursor: 'pointer',
       padding: '18px 18px',
       display: 'grid',
       gridTemplateColumns: '1fr 104px',
       alignItems: 'center',
       gap: 10,
       textAlign: 'left',
       fontFamily: 'inherit',
     }}
   >
     <div style={{ minWidth: 0 }}>
       <div style={{ fontSize: 39, lineHeight: 1, marginBottom: 8, display: 'none' }}>{option.emoji}</div>
       <div style={{ fontSize: 20, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{option.title}</div>
       <div style={{ fontSize: 13, color: '#444', marginTop: 8, lineHeight: 1.35 }}>{option.subtitle}</div>
     </div>
     <div style={{ display: 'flex', justifyContent: 'center' }}>
       <div style={{ width: 92, height: 92, borderRadius: '50%', background: option.blob, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46 }}>
         {option.emoji}
       </div>
     </div>
   </button>
 );
}


function ActivityCard({ option, active, onClick }) {
 return (
   <button
     type="button"
     onClick={onClick}
     style={{
       width: '100%',
       borderRadius: 18,
       border: active ? `3px solid ${C.primary}` : `1.5px solid ${C.border}`,
       background: '#fff',
       boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
       cursor: 'pointer',
       padding: '18px 18px',
       display: 'grid',
       gridTemplateColumns: '1fr 140px',
       alignItems: 'center',
       gap: 10,
       textAlign: 'left',
       fontFamily: 'inherit',
     }}
   >
     <div style={{ minWidth: 0 }}>
       <div style={{ fontSize: 20, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{option.label}</div>
       <div style={{ fontSize: 13, color: '#444', marginTop: 8, lineHeight: 1.35 }}>{option.desc}</div>
     </div>
     <div style={{ display: 'flex', justifyContent: 'center' }}>
       <div style={{ width: 126, height: 96, borderRadius: '45% 55% 58% 42% / 50% 48% 52% 50%', background: option.blob, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
         {option.icon}
       </div>
     </div>
   </button>
 );
}


function DietTypeCard({ option, active, onClick }) {
 return (
   <button
     type="button"
     onClick={onClick}
     style={{
       width: '100%',
       minHeight: 120,
       borderRadius: 16,
       border: active ? `3px solid ${C.primary}` : `1.5px solid ${C.border}`,
       background: '#fff',
       boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
       cursor: 'pointer',
       padding: '14px 14px',
       display: 'flex',
       flexDirection: 'column',
       justifyContent: 'space-between',
       textAlign: 'left',
       fontFamily: 'inherit',
     }}
   >
     <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
       <div style={{ fontSize: 54, lineHeight: 1 }}>{option.icon}</div>
     </div>
     <div style={{ marginTop: 8 }}>
       <div style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{option.title}</div>
       {!!option.subtitle && <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>{option.subtitle}</div>}
     </div>
   </button>
 );
}


// ── Main ───────────────────────────────────────────────────────────────────────
function MobilePage({ children }) {
 return (
   <div style={{
     minHeight: '100vh',
     background: '#ECECEC',
     fontFamily: "'Noto Sans', 'Inter', sans-serif",
     display: 'flex',
     justifyContent: 'center',
     alignItems: 'stretch',
     padding: '0',
   }}>
     <div style={{
       width: '100%',
       maxWidth: 430,
       minHeight: '100vh',
       background: C.bg,
       display: 'flex',
       flexDirection: 'column',
       position: 'relative',
       boxShadow: '0 10px 36px rgba(0,0,0,0.12)',
     }}>
       {children}
     </div>
   </div>
 );
}

export default function DietOnboarding() {
 const [searchParams] = useSearchParams();
 const navigate       = useNavigate();


 const token         = searchParams.get('token')  || '';
 const leadIdFromUrl = searchParams.get('leadId') || '';
 const nameFromUrl   = searchParams.get('name')   || '';
 const phoneFromUrl  = searchParams.get('phone')  || '';


 const isTokenFlow = !!token;


 const [step,          setStep]          = useState(0);
 const [showWelcome,   setShowWelcome]   = useState(true);
 const [saving,        setSaving]        = useState(false);
 const [error,         setError]         = useState('');
 const [tokenError,    setTokenError]    = useState('');
 const [success,       setSuccess]       = useState(false);
 const [heightUnit,    setHeightUnit]    = useState('cm');
 const [showAllHealth, setShowAllHealth] = useState(false);


 const [form, setForm] = useState({
   clientName:       nameFromUrl,
   clientPhone:      phoneFromUrl,
   gender:           '',
   age:              '',
   heightCm:         '',
   weightKg:         '',
   targetWeightKg:   '',
   activityCode:     'AC1',
   goal:             'weightLoss',
   dietType:         'V',
   communityCodes:   ['U'],
   healthConditions: [],
   allergies:        [],
   mealsPerDay:      3,
 });


 // Token flow: validate + prefill
 useEffect(() => {
   if (!token) return;
   fetch(`${PUBLIC_API}/token/${token}`)
     .then(r => r.json())
     .then(data => {
       if (!data.valid) { setTokenError(data.error || 'Invalid link.'); return; }
       setForm(prev => ({
         ...prev,
         clientName:  data.clientName  || prev.clientName,
         clientPhone: data.clientPhone || prev.clientPhone,
       }));
     })
     .catch(() => setTokenError('Could not validate link. Please try again.'));
 }, [token]);


 // Internal flow: prefill existing profile
 useEffect(() => {
   if (token) return;
   const lookup = leadIdFromUrl
     ? `${API}/api/smart-diet-plan/health-profile/${leadIdFromUrl}`
     : phoneFromUrl
       ? `${API}/api/smart-diet-plan/health-profile-by-phone/${encodeURIComponent(phoneFromUrl)}`
       : null;
   if (!lookup) return;
   fetch(lookup, { credentials: 'include' })
     .then(r => r.ok ? r.json() : null)
     .then(data => {
       if (!data) return;
       setForm(prev => ({
         ...prev,
         clientName:       data.clientName       || prev.clientName,
         clientPhone:      data.clientPhone      || prev.clientPhone,
         gender:           data.gender           || '',
         age:              data.age              || '',
         heightCm:         data.heightCm         || '',
         weightKg:         data.weightKg         || '',
         targetWeightKg:   data.targetWeightKg   || '',
         activityCode:     data.activityCode     || 'AC1',
         goal:             data.goal             || 'weightLoss',
         dietType:         data.dietType         || 'V',
         communityCodes:   data.communityCodes   || ['U'],
         healthConditions: data.healthConditions || [],
         allergies:        data.allergies        || [],
         mealsPerDay:      data.mealsPerDay      || 3,
       }));
     })
     .catch(() => {});
 }, [token, leadIdFromUrl, phoneFromUrl]);


 const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
 const toggleArr = (key, code) =>
   setForm(p => {
     const arr = p[key] || [];
     return { ...p, [key]: arr.includes(code) ? arr.filter(c => c !== code) : [...arr, code] };
   });


 const isValidPhone = (phone) => /^\d{10}$/.test((phone || '').trim());


 const getStepValidationError = (stepIdx) => {
   if (stepIdx === 0 && !form.goal) return 'Please select your goal.';
   if (stepIdx === 1) {
     if (!String(form.age || '').trim()) return 'Please enter age.';
     if (!String(form.heightCm || '').trim()) return 'Please set your height.';
     if (!String(form.weightKg || '').trim()) return 'Please set your current weight.';
     if (!String(form.targetWeightKg || '').trim()) return 'Please set your target weight.';
     return '';
   }
   if (stepIdx === 2 && !form.activityCode) return 'Please select your activity level.';
   if (stepIdx === 3) {
     if (!form.dietType) return 'Please select your diet preference.';
     if (!(form.communityCodes || []).length) return 'Please select your regional preference.';
     if (!form.mealsPerDay) return 'Please set meals per day.';
     return '';
   }
   return '';
 };


 const getFinalValidationError = () => {
   if (!String(form.clientName || '').trim()) return 'Name is required.';
   if (!isValidPhone(form.clientPhone)) return 'Enter a valid 10-digit phone number.';
   if (!form.gender) return 'Please select gender.';
   for (let i = 0; i < STEPS.length - 1; i += 1) {
     const err = getStepValidationError(i);
     if (err) return err;
   }
   return '';
 };


 const handleNextStep = () => {
   const err = getStepValidationError(step);
   if (err) {
     setError(err);
     return;
   }
   setError('');
   setStep(s => s + 1);
 };


 const handleSubmit = async () => {
   const validationErr = getFinalValidationError();
   if (validationErr) {
     setError(validationErr);
     return;
   }
   setError(''); setSaving(true);
   try {
     let endpoint, payload, opts;
     if (isTokenFlow) {
       endpoint = `${PUBLIC_API}/health-profile`;
       payload  = { ...form, token };
       opts     = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
     } else {
       endpoint = `${API}/api/smart-diet-plan/health-profile`;
       payload  = { ...form };
       if (leadIdFromUrl) payload.leadId = leadIdFromUrl;
       opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) };
     }
     const res  = await fetch(endpoint, opts);
     const data = await res.json();
     if (!res.ok) throw new Error(data.error || 'Failed to save profile');


     // Auto-generate plan immediately after onboarding save.
     const resolvedLeadId = data?.leadId || leadIdFromUrl;
     if (!resolvedLeadId) throw new Error('Lead not found for plan generation.');


     const genRes = await fetch(`${API}/api/smart-diet-plan/generate`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       credentials: 'include',
       body: JSON.stringify({ leadId: resolvedLeadId }),
     });
     const genData = await genRes.json();
     if (!genRes.ok) throw new Error(genData.error || 'Failed to generate diet plan');


     const nextName = encodeURIComponent(form.clientName || nameFromUrl || '');
     navigate(`/smart-diet-plan?leadId=${encodeURIComponent(resolvedLeadId)}&planId=${encodeURIComponent(genData._id)}&name=${nextName}`);
   } catch (e) {
     setError(e.message);
   } finally {
     setSaving(false);
   }
 };


 // ── Wrappers ───────────────────────────────────────────────────────────────
 // ── Token invalid ──────────────────────────────────────────────────────────
 if (tokenError) {
   return (
     <MobilePage>
       <div style={{ background: C.primary, height: 180, width: '100%' }} />
       <div style={{ flex: 1, padding: '40px 28px', textAlign: 'center' }}>
         <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>🔗</div>
         <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: C.text }}>Link Invalid</h2>
         <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.6 }}>{tokenError}</p>
         <p style={{ color: C.sub, fontSize: 13 }}>Please request a new link from your dietitian.</p>
       </div>
     </MobilePage>
   );
 }


 // ── Success ────────────────────────────────────────────────────────────────
 if (success) {
   return (
     <MobilePage>
       <div style={{ background: C.primary, height: 200, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✅</div>
       </div>
       <div style={{ flex: 1, padding: '40px 28px', textAlign: 'center' }}>
         <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 700, color: C.text }}>
           {isTokenFlow ? 'Profile Submitted!' : 'Profile Saved!'}
         </h2>
         <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7 }}>
           {isTokenFlow
             ? 'Your details have been received. Your dietitian will review them and prepare your personalised plan shortly.'
             : 'Redirecting to dashboard…'}
         </p>
       </div>
     </MobilePage>
   );
 }


 // ── Welcome screen ─────────────────────────────────────────────────────────
 if (showWelcome) {
   return (
     <MobilePage>
       {/* Coral hero */}
       <div style={{ background: C.primary, width: '100%', position: 'relative', paddingTop: 36, paddingBottom: 0, overflow: 'hidden' }}>
         <div style={{ display: 'flex', justifyContent: 'center' }}>
           <ConsultIllustration />
         </div>
         {/* Wave cut */}
         <svg viewBox="0 0 480 50" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 50, marginTop: -2 }}>
           <path d="M0 50 L0 25 Q120 0 240 25 Q360 50 480 25 L480 50 Z" fill="#FFFFFF" />
         </svg>
       </div>


       {/* Content */}
       <div style={{ flex: 1, padding: '20px 28px 32px' }}>
         <p style={{ color: C.sub, textAlign: 'center', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
           Hey, answer a few questions to help us get your personalised plan
         </p>


         {/* Name input */}
         <div style={{ marginBottom: 12 }}>
           <FieldLabel>Your Name</FieldLabel>
           <UnderlineInput
             value={form.clientName}
             onChange={e => set('clientName', e.target.value)}
             placeholder="e.g. Priya Sharma"
           />
         </div>


         {/* Phone input */}
         <div style={{ marginBottom: 32 }}>
           <FieldLabel>Phone Number</FieldLabel>
           <UnderlineInput
             value={form.clientPhone}
             onChange={e => set('clientPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
             placeholder="10-digit number"
           />
         </div>


         {/* Gender quick pick */}
         <div style={{ marginBottom: 36 }}>
           <FieldLabel>I am</FieldLabel>
           <div style={{ display: 'flex', gap: 12 }}>
             {[{ code: 'male', label: '👨 Male' }, { code: 'female', label: '👩 Female' }].map(g => (
               <button key={g.code} type="button" onClick={() => set('gender', g.code)}
                 style={{
                   flex: 1, padding: '14px', borderRadius: 12, cursor: 'pointer', fontSize: 14,
                   fontFamily: 'inherit', fontWeight: form.gender === g.code ? 700 : 400,
                   background: form.gender === g.code ? C.primary : '#FFF',
                   color:      form.gender === g.code ? '#fff'    : C.text,
                   border:     `1.5px solid ${form.gender === g.code ? C.primary : C.border}`,
                 }}>
                 {g.label}
               </button>
             ))}
           </div>
         </div>


         <button
           onClick={() => setShowWelcome(false)}
           disabled={!form.clientName.trim() || !isValidPhone(form.clientPhone) || !form.gender}
           style={{
             width: '100%', padding: '16px', borderRadius: 999,
             background: (form.clientName.trim() && isValidPhone(form.clientPhone) && form.gender) ? C.primary : C.border,
             color: (form.clientName.trim() && isValidPhone(form.clientPhone) && form.gender) ? '#fff' : C.sub,
             border: 'none', fontSize: 16, fontWeight: 700, cursor: (form.clientName.trim() && isValidPhone(form.clientPhone) && form.gender) ? 'pointer' : 'not-allowed',
             letterSpacing: '0.01em',
           }}>
           Let's Start →
         </button>
       </div>
     </MobilePage>
   );
 }


 // ── Step renderer ──────────────────────────────────────────────────────────
 const renderStep = () => {
   switch (step) {
     case 0:
       return (
         <>
           <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: C.text }}>What's your goal?</h2>
           <p style={{ margin: '0 0 24px', color: C.sub, fontSize: 14 }}>Select the primary reason you want a diet plan.</p>
           <div style={{ display: 'grid', gap: 14 }}>
             {GOAL_OPTIONS.map(opt => (
               <GoalCard key={opt.code} option={opt} active={form.goal === opt.code} onClick={() => set('goal', opt.code)} />
             ))}
           </div>
         </>
       );


     case 1:
       return (
         <>
           <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: C.text }}>Quick vitals</h2>
           <p style={{ margin: '0 0 24px', color: C.sub, fontSize: 14 }}>Needed for accurate calorie and macro calculation.</p>


           <div style={{ background: C.lightPink, borderRadius: 12, padding: '14px 16px' }}>
             <div style={{ display: 'grid', gap: 12 }}>
               <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${C.border}`, padding: '14px 14px' }}>
                 <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                   Age (years)
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }}>
                   <button
                     type="button"
                     onClick={() => set('age', String(Math.max(14, (Number(form.age) || 30) - 1)))}
                     style={{
                       width: 38, height: 38, borderRadius: '50%', border: `1.5px solid ${C.border}`, background: '#fff',
                       fontSize: 22, lineHeight: 1, cursor: 'pointer', color: C.text,
                     }}
                   >
                     −
                   </button>
                   <input
                     type="text"
                     inputMode="numeric"
                     value={form.age}
                     onChange={e => {
                       const next = e.target.value.replace(/\D/g, '').slice(0, 2);
                       set('age', next);
                     }}
                     placeholder="30"
                     style={{
                       width: 96,
                       textAlign: 'center',
                       border: 'none',
                       borderBottom: `2px solid ${C.primary}`,
                       padding: '6px 0',
                       fontSize: 32,
                       fontWeight: 800,
                       fontFamily: 'inherit',
                       color: C.text,
                       outline: 'none',
                       background: 'transparent',
                     }}
                   />
                   <button
                     type="button"
                     onClick={() => set('age', String(Math.min(90, (Number(form.age) || 30) + 1)))}
                     style={{
                       width: 38, height: 38, borderRadius: '50%', border: `1.5px solid ${C.border}`, background: '#fff',
                       fontSize: 22, lineHeight: 1, cursor: 'pointer', color: C.text,
                     }}
                   >
                     +
                   </button>
                 </div>
               </div>


               <HeightRulerPicker
                 valueCm={form.heightCm}
                 unitMode={heightUnit}
                 onUnitModeChange={setHeightUnit}
                 onChangeCm={(v) => set('heightCm', v === '' ? '' : String(Math.round(v)))}
                 minCm={120}
                 maxCm={220}
               />


               <WeightGaugePicker
                 label="Current weight"
                 rawValue={form.weightKg}
                 min={30}
                 max={180}
                 step={0.5}
                 unit="kg"
                 tone="emphasis"
                 onChange={(v) => set('weightKg', v === '' ? '' : String(v))}
               />


               <WeightGaugePicker
                 label="Target weight"
                 rawValue={form.targetWeightKg}
                 min={30}
                 max={180}
                 step={0.5}
                 unit="kg"
                 tone="default"
                 onChange={(v) => set('targetWeightKg', v === '' ? '' : String(v))}
               />
             </div>
           </div>
         </>
       );


     case 2:
       return (
         <>
           <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: C.text }}>How often do you exercise?</h2>
           <p style={{ margin: '0 0 20px', color: C.sub, fontSize: 14 }}>Select one that best matches your routine.</p>
           <div style={{ display: 'grid', gap: 12 }}>
             {ACTIVITY_OPTIONS.map(opt => (
               <ActivityCard
                 key={opt.code}
                 option={opt}
                 active={form.activityCode === opt.code}
                 onClick={() => set('activityCode', opt.code)}
               />
             ))}
           </div>
         </>
       );


     case 3:
       return (
         <>
           <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: C.text }}>Diet preference</h2>
           <p style={{ margin: '0 0 24px', color: C.sub, fontSize: 14 }}>What kind of foods do you eat?</p>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
             {DIET_TYPES.map(opt => (
               <DietTypeCard key={opt.code} option={opt} active={form.dietType === opt.code} onClick={() => set('dietType', opt.code)} />
             ))}
           </div>


           <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: C.text }}>Regional preference</h3>
           <p style={{ margin: '0 0 16px', color: C.sub, fontSize: 13 }}>Choose your major regional preference</p>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
             {COMMUNITY_OPTIONS.map(opt => {
               const active = (form.communityCodes || []).includes(opt.code);
               return (
                 <button
                   key={opt.code}
                   type="button"
                   onClick={() => set('communityCodes', [opt.code])}
                   style={{
                     minHeight: 58,
                     borderRadius: 14,
                     border: active ? `2.5px solid ${C.primary}` : `1.5px solid ${C.border}`,
                     background: '#fff',
                     boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                     cursor: 'pointer',
                     fontFamily: 'inherit',
                     fontSize: 16,
                     fontWeight: 700,
                     color: C.text,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     gap: 8,
                     padding: '10px 12px',
                   }}
                 >
                   {active && <span style={{ fontSize: 18, color: '#666' }}>✓</span>}
                   <span>{opt.label}</span>
                 </button>
               );
             })}
           </div>


           <h3 style={{ margin: '20px 0 6px', fontSize: 16, fontWeight: 800, color: C.text }}>Meals per day</h3>
           <p style={{ margin: '0 0 12px', color: C.sub, fontSize: 13 }}>How many times do you eat in a day?</p>
           <div style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '16px 16px 14px', marginBottom: 4 }}>
             <div style={{ textAlign: 'center', marginBottom: 10 }}>
               <span style={{ fontSize: 48, fontWeight: 800, color: C.primary }}>{form.mealsPerDay}</span>
               <div style={{ fontSize: 13, color: C.sub, marginTop: -4 }}>meals/day</div>
             </div>
             <input
               type="range"
               min={2}
               max={8}
               step={1}
               value={form.mealsPerDay}
               onChange={e => set('mealsPerDay', Number(e.target.value))}
               style={{ width: '100%', accentColor: C.primary, cursor: 'pointer' }}
             />
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.sub, marginTop: 4 }}>
               <span>2 meals</span>
               <span>8 meals</span>
             </div>
           </div>
         </>
       );


     case 4:
       return (
         <>
           <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: C.text }}>Health & allergies</h2>
           <p style={{ margin: '0 0 18px', color: C.sub, fontSize: 14 }}>Select all that apply.</p>


           <div style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 18, padding: '16px 14px 14px', marginBottom: 14 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
               <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>Health condition</h3>
               <div style={{ fontSize: 40, lineHeight: 1 }}>🩺</div>
             </div>
             <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 12 }} />
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
               {(showAllHealth ? HEALTH_CONDITIONS : HEALTH_CONDITIONS.slice(0, 6)).map(cond => {
                 const active = form.healthConditions.includes(cond);
                 const label = cond.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                 return (
                   <button
                     key={cond}
                     type="button"
                     onClick={() => toggleArr('healthConditions', cond)}
                     style={{
                       background: 'transparent',
                       border: 'none',
                       padding: '8px 4px',
                       cursor: 'pointer',
                       display: 'flex',
                       alignItems: 'center',
                       gap: 10,
                       fontFamily: 'inherit',
                       textAlign: 'left',
                     }}
                   >
                     <span style={{
                       width: 24,
                       height: 24,
                       borderRadius: 8,
                       border: `2px solid ${C.primary}`,
                       background: active ? C.primary : '#fff',
                       color: '#fff',
                       fontSize: 16,
                       fontWeight: 800,
                       display: 'inline-flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       flexShrink: 0,
                     }}>{active ? '✓' : ''}</span>
                     <span style={{ fontSize: 15, color: C.text }}>{label}</span>
                   </button>
                 );
               })}
             </div>
             {!showAllHealth && (
               <button
                 type="button"
                 onClick={() => setShowAllHealth(true)}
                 style={{
                   width: '100%',
                   marginTop: 10,
                   padding: '12px 14px',
                   borderRadius: 999,
                   background: '#fff',
                   border: `2px solid ${C.primary}`,
                   color: C.primary,
                   fontSize: 16,
                   fontWeight: 700,
                   cursor: 'pointer',
                   fontFamily: 'inherit',
                 }}
               >
                 Show More
               </button>
             )}
           </div>


           <div style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 18, padding: '16px 14px 14px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
               <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>Allergies</h3>
               <div style={{ fontSize: 40, lineHeight: 1 }}>🤧</div>
             </div>
             <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 12 }} />
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
               {ALLERGY_OPTIONS.map(opt => {
                 const active = (form.allergies || []).includes(opt.code);
                 const label = opt.label.replace(/^[^\s]+\s/, '');
                 return (
                   <button
                     key={opt.code}
                     type="button"
                     onClick={() => toggleArr('allergies', opt.code)}
                     style={{
                       background: 'transparent',
                       border: 'none',
                       padding: '8px 4px',
                       cursor: 'pointer',
                       display: 'flex',
                       alignItems: 'center',
                       gap: 10,
                       fontFamily: 'inherit',
                       textAlign: 'left',
                     }}
                   >
                     <span style={{
                       width: 24,
                       height: 24,
                       borderRadius: 8,
                       border: `2px solid ${C.primary}`,
                       background: active ? C.primary : '#fff',
                       color: '#fff',
                       fontSize: 16,
                       fontWeight: 800,
                       display: 'inline-flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       flexShrink: 0,
                     }}>{active ? '✓' : ''}</span>
                     <span style={{ fontSize: 15, color: C.text }}>{label}</span>
                   </button>
                 );
               })}
             </div>
           </div>
         </>
       );


     case 5:
       return (
         <>
           {/* Analysis cards */}
           <p style={{ margin: '0 0 14px', fontSize: 17, color: '#333', lineHeight: 1.45 }}>
             From the information provided, that is our basic analysis.
           </p>


           <div style={{ display: 'grid', gap: 12 }}>
             <div style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '16px 16px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                   <div style={{ fontSize: 42, fontWeight: 800, color: C.text, lineHeight: 1 }}>{bmiValue.toFixed(2)}</div>
                   <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginTop: 6 }}>Your BMI</div>
                   <div style={{ fontSize: 14, color: C.sub, marginTop: 6 }}>
                     Healthy BMI range: 18.5 - 24.9
                   </div>
                 </div>
                 <div style={{ fontSize: 54 }}>📊</div>
               </div>
             </div>


             <div style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '16px 16px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div>
                   <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Current Weight: {weightVal.toFixed(1)} kg</div>
                   <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginTop: 2 }}>Desired Weight: {targetWeightVal.toFixed(1)} kg</div>
                   <div style={{ fontSize: 14, color: C.sub, marginTop: 10 }}>
                     Target/Ideal weight recommended: {idealWeightLow} - {idealWeightHigh} kg
                   </div>
                 </div>
                 <div style={{ fontSize: 50, lineHeight: 1 }}>⚖️</div>
               </div>
             </div>


             <div style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '16px 16px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div>
                   <div style={{ fontSize: 18, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>Nutritional Requirement</div>
                   <div style={{ fontSize: 14, color: C.sub, marginTop: 3 }}>(On daily basis)</div>
                 </div>
                 <div style={{ fontSize: 50, lineHeight: 1 }}>🥗</div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
                 {[
                   ['Daily calorie target', `${dailyCalories} kcal`, '🔥'],
                   ['Carbs', `${dailyCarbs}g`, '🍚'],
                   ['Protein', `${dailyProtein}g`, '💪'],
                   ['Fats', `${dailyFats}g`, '🧀'],
                 ].map(([k, v, i]) => (
                   <div key={k} style={{ minWidth: 0 }}>
                     <div style={{ fontSize: 18 }}>{i}</div>
                     <div style={{ fontSize: 12, color: C.sub, marginTop: 4, lineHeight: 1.2 }}>{k}</div>
                     <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginTop: 4 }}>{v}</div>
                   </div>
                 ))}
               </div>
             </div>
           </div>


           <p style={{ margin: '16px 0 0', fontSize: 18, fontWeight: 700, color: '#333' }}>Let's get you started with our journey</p>
         </>
       );


     default: return null;
   }
 };


 // ── Step wizard ────────────────────────────────────────────────────────────
 const totalSteps = STEPS.length;
 const weightVal = Math.max(30, Math.min(180, Number(form.weightKg) || 70));
 const targetWeightVal = Math.max(30, Math.min(180, Number(form.targetWeightKg) || Math.max(30, Math.min(180, Number(form.weightKg) || 65))));
 const heightCmVal = Math.max(120, Math.min(220, Number(form.heightCm) || 165));
 const heightM = heightCmVal / 100;
 const bmiValue = Math.max(0, weightVal / Math.max(0.0001, heightM * heightM));
 const idealWeightLow = Math.max(30, Math.round(18.5 * heightM * heightM));
 const idealWeightHigh = Math.max(idealWeightLow, Math.round(24.9 * heightM * heightM));
 const activityFactorMap = { AC1: 1.2, AC2: 1.375, AC3: 1.55, AC4: 1.725, AC5: 1.9 };
 const ageNum = Math.max(14, Number(form.age) || 30);
 const genderMul = form.gender === 'male' ? 5 : form.gender === 'female' ? -161 : -78;
 const bmr = 10 * weightVal + 6.25 * heightCmVal - 5 * ageNum + genderMul;
 const maintenanceKcal = bmr * (activityFactorMap[form.activityCode] || 1.2);
 const goalAdjustMap = { weightLoss: -350, fatShredding: -450, muscleGain: 250 };
 const dailyCalories = Math.max(1200, Math.round(maintenanceKcal + (goalAdjustMap[form.goal] || 0)));
 const dailyCarbs = Math.round((dailyCalories * 0.5) / 4);
 const dailyProtein = Math.round((dailyCalories * 0.25) / 4);
 const dailyFats = Math.round((dailyCalories * 0.25) / 9);


 return (
   <MobilePage>
     {/* Top stepper header */}
     <div style={{ background: C.primary, padding: '12px 18px 18px' }}>
       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
         <div style={{ width: 30, height: 30 }} />
         <div style={{ width: 30, height: 30 }} />
       </div>


       <div style={{ position: 'relative', height: 26 }}>
         <div style={{ position: 'absolute', left: 16, right: 16, top: 12, height: 2, background: 'rgba(255,255,255,0.45)' }} />
         <div
           style={{
             position: 'absolute',
             left: 16,
             top: 12,
             height: 2,
             width: `calc((100% - 32px) * ${step / Math.max(1, totalSteps - 1)})`,
             background: '#fff',
             transition: 'width 0.25s ease',
           }}
         />
         {STEPS.map((_, i) => {
           const done = i <= step;
           const left = `calc(16px + ((100% - 32px) * ${i / Math.max(1, totalSteps - 1)}))`;
           return (
             <div
               key={i}
               style={{
                 position: 'absolute',
                 top: 0,
                 left,
                 transform: 'translateX(-50%)',
                 width: 26,
                 height: 26,
                 borderRadius: '50%',
                 border: '2px solid #fff',
                 background: done ? '#fff' : C.primary,
                 color: done ? C.primary : '#fff',
                 fontSize: 13,
                 fontWeight: 800,
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
               }}
             >
               {i + 1}
             </div>
           );
         })}
       </div>
     </div>


     {/* Content */}
     <div style={{ flex: 1, padding: '24px 24px 120px', overflowY: 'auto' }}>
       {renderStep()}
     </div>


     {/* Fixed bottom CTA */}
     <div style={{
       position: 'sticky', bottom: 0, left: 0, right: 0,
       padding: '16px 24px 24px',
       background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 30%)',
     }}>
       {error && (
         <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: C.danger, borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>
           {error}
         </div>
       )}
       <div style={{ display: 'flex', gap: 12 }}>
         <button
           type="button"
           onClick={() => step === 0 ? setShowWelcome(true) : setStep(s => s - 1)}
           style={{
             flex: 1,
             padding: '16px',
             borderRadius: 999,
             background: '#fff',
             color: '#777',
             border: `3px solid ${C.primary}`,
             fontSize: 16,
             fontWeight: 700,
             cursor: 'pointer',
           }}
         >
           Back
         </button>
         {step < totalSteps - 1 ? (
           <button type="button" onClick={handleNextStep}
             style={{ flex: 1, padding: '16px', borderRadius: 999, background: C.primary, color: '#fff', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
             Continue →
           </button>
         ) : (
           <button type="button" onClick={handleSubmit} disabled={saving}
             style={{ flex: 1, padding: '16px', borderRadius: 999, background: saving ? C.border : C.primary, color: saving ? C.sub : '#fff', border: 'none', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
             {saving ? 'Saving…' : 'Start Journey'}
           </button>
         )}
       </div>
     </div>
   </MobilePage>
 );
}



