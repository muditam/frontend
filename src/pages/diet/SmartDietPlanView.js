import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';


const API = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");


const C = {
 purple:      '#7263F4',  // header bg
 purpleLight: '#EEF0FF',
 primary:     '#F05C7C',  // coral accent
 primaryBg:   '#FFF0F3',
 bg:          '#F7F7F7',
 surface:     '#FFFFFF',
 text:        '#1A1A1A',
 sub:         '#909090',
 border:      '#E8E8E8',
 success:     '#22C55E',
 danger:      '#EF4444',
};


const SLOT_ICONS = ['🌅', '🍳', '🥣', '☕', '🍽️', '🥤', '🍎', '🌙', '🌟'];

const SLOT_TYPE_CODES = {
 0: ['DZ'],
 1: ['F', 'N'],
 2: ['M', 'B', 'P'],
 3: ['F', 'N', 'Y'],
 4: ['W', 'C', 'B', 'R', 'S', 'SO', 'SD', 'P', 'FI'],
 5: ['D', 'F'],
 6: ['NS', 'F', 'Y', 'PW'],
 7: ['W', 'C', 'B', 'R', 'S', 'SO', 'SD', 'P'],
 8: ['DZ', 'D'],
};


function cleanText(value) {
 const text = value === undefined || value === null ? '' : String(value).trim();
 return ['-', '--', '~'].includes(text) ? '' : text;
}


function splitDetailText(value) {
 const text = cleanText(value);
 if (!text) return [];
 return text
   .split(/\n+|(?:\s*(?:\d+[).]|[•*-])\s+)/)
   .map(s => s.trim())
   .filter(Boolean);
}


function getEligibleSlotsForFood(food, activeSlots = []) {
 const foodTypes = Array.isArray(food?.typeArr) ? food.typeArr.filter(Boolean) : [];
 if (!foodTypes.length) return activeSlots;
 const foodTypeSet = new Set(foodTypes);
 const matches = activeSlots.filter(slot => {
   const slotCodes = SLOT_TYPE_CODES[slot.slotIndex] || [];
   return slotCodes.some(code => foodTypeSet.has(code));
 });
 return matches.length ? matches : activeSlots;
}


function choiceLabel(score) {
 const n = Number(score);
 if (n >= 9) return { text: 'Best choice', color: '#15803D', bg: '#DCFCE7' };
 if (n >= 6) return { text: 'Good choice', color: '#3F6212', bg: '#ECFCCB' };
 if (n >= 3) return { text: 'Average choice', color: '#92400E', bg: '#FEF3C7' };
 if (n >= 1) return { text: 'Limit intake', color: '#991B1B', bg: '#FEE2E2' };
 return { text: 'Unclassified', color: C.sub, bg: '#F3F4F6' };
}


function ProgressBar({ value, max, color }) {
 const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
 return (
   <div style={{ height: 5, borderRadius: 999, background: '#E8E8E8', overflow: 'hidden' }}>
     <div style={{ height: '100%', width: `${pct}%`, background: color || C.primary, borderRadius: 999, transition: 'width 0.4s ease' }} />
   </div>
 );
}


function isConsumedFood(food) {
 if (!food || typeof food !== 'object') return false;
 if (food.isConsumed === true || food.consumed === true || food.taken === true || food.completed === true) return true;
 const status = String(food.status || '').toLowerCase();
 return ['consumed', 'eaten', 'taken', 'completed', 'logged'].includes(status);
}


function sumDayFromFoods(daySlots = []) {
 const foods = (daySlots || []).flatMap(slot => slot?.foods || []);
 const consumedFoods = foods.filter(isConsumedFood);
 const pool = consumedFoods;


 return pool.reduce((acc, food) => {
   acc.calories += Number(food?.calories || 0);
   acc.protein += Number(food?.protein || 0);
   acc.carbs += Number(food?.carbs || 0);
   acc.fat += Number(food?.fat || 0);
   return acc;
 }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}


// ── Macros Card ────────────────────────────────────────────────────────────────
function MacrosCard({ plan, daySlots }) {
 const dayTotals = sumDayFromFoods(daySlots);
 const totalCal  = dayTotals.calories;
 const totalProt = dayTotals.protein;
 const totalCarb = dayTotals.carbs;
 const totalFat  = dayTotals.fat;


 const calTarget  = plan?.calorieTarget || 2000;
 const protTarget = Math.round(calTarget * 0.20 / 4);
 const carbTarget = Math.round(calTarget * 0.50 / 4);
 const fatTarget  = Math.round(calTarget * 0.30 / 9);


 return (
   <div style={{
     background: '#fff', borderRadius: 16, padding: '16px 20px',
     boxShadow: '0 4px 20px rgba(114,99,244,0.15)',
   }}>
     <div style={{ fontSize: 12, color: C.sub, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
       <span>Your Daily Target</span>
       <span>🍎</span>
     </div>


     {/* Calories */}
     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
       <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Calories</span>
       <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
         {Math.round(totalCal)} / {calTarget} Kcal
       </span>
     </div>
     <ProgressBar value={totalCal} max={calTarget} color={C.primary} />


     {/* Macros row */}
     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
       {[
         { label: 'Carbs',   val: totalCarb, max: carbTarget, unit: 'g' },
         { label: 'Protein', val: totalProt, max: protTarget, unit: 'g' },
         { label: 'Fat',     val: totalFat,  max: fatTarget,  unit: 'g' },
       ].map(m => (
         <div key={m.label} style={{ textAlign: 'center' }}>
           <div style={{ fontSize: 12, color: C.sub, marginBottom: 6 }}>{m.label}</div>
           <ProgressBar value={m.val} max={m.max} color={C.primary} />
           <div style={{ fontSize: 12, color: C.sub, marginTop: 5 }}>
             {m.val.toFixed(0)}/{m.max}{m.unit}
           </div>
         </div>
       ))}
     </div>
   </div>
 );
}


// ── Food Item ──────────────────────────────────────────────────────────────────
function FoodItem({ food, onSwap, onOpen, onLog }) {
 const choice = choiceLabel(food?.score);
 const dietTag = getDietTag(food);


 return (
   <div style={{
     display: 'flex', alignItems: 'flex-start', gap: 10,
     padding: '11px 14px', background: '#FAFAFA', borderRadius: 12,
     border: `1px solid ${C.border}`, marginBottom: 8,
   }}>
     {/* Food emoji/image */}
     <div style={{
       width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
       background: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
     }}>
       {food.imageId
         ? <img src={food.imageId} alt={food.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
         : '🥗'}
     </div>


     {/* Info */}
     <div style={{ flex: 1, minWidth: 0 }}>
       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
         <span style={{ fontSize: 10, fontWeight: 800, color: choice.color, background: choice.bg, borderRadius: 999, padding: '3px 8px', whiteSpace: 'nowrap' }}>
           {choice.text}
         </span>
         <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: dietTag.color, border: `1px solid ${dietTag.border}`, background: dietTag.bg, borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap' }}>
           <span style={{ width: 7, height: 7, borderRadius: '50%', background: dietTag.dot }} />
           {dietTag.label}
         </span>
       </div>
       <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
         {food.name}
       </div>
       <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
         {food.portion && <span>{food.portion}{food.portionUnit ? ` ${food.portionUnit}` : ''} · </span>}
         <span>{Math.round(food.calories)} kcal</span>
         {food.protein > 0 && <span> · P {food.protein.toFixed(0)}g</span>}
         {food.carbs   > 0 && <span> · C {food.carbs.toFixed(0)}g</span>}
       </div>
       <div style={{ display: 'flex', gap: 8, marginTop: 9, alignItems: 'center' }}>
         <button onClick={e => { e.stopPropagation(); onLog(); }}
           style={{
             minWidth: 116, height: 34, borderRadius: 10,
             border: 'none', background: food.isConsumed ? '#16A34A' : C.primary,
             color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
             boxShadow: food.isConsumed ? 'none' : '0 3px 10px rgba(240,92,124,0.25)',
           }}>
           {food.isConsumed ? 'Logged' : 'Log +'}
         </button>
         <button onClick={e => { e.stopPropagation(); onSwap(); }}
           style={{
             minWidth: 104, height: 34, borderRadius: 10,
             border: `1px solid ${C.border}`, background: '#fff',
             color: C.text, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
           }}>
           Options ›
           </button>
          <button
            onClick={e => { e.stopPropagation(); onOpen(); }}
            aria-label={`Open details for ${food.name}`}
            style={{
              marginLeft: 'auto', width: 34, height: 34, borderRadius: 10,
              border: `1px solid ${C.border}`, background: '#fff',
              color: C.primary, fontWeight: 900, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            &rsaquo;
          </button>
        </div>
     </div>


   </div>
 );
}


function DetailSection({ title, children }) {
 return (
   <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 16 }}>
     <div style={{ fontSize: 12, fontWeight: 800, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
       {title}
     </div>
     {children}
   </div>
 );
}


function FoodDetailDrawer({ detail, loading, error, onClose, onOpenAlternative }) {
 const food = detail?.food || detail;
 const label = choiceLabel(food?.score);
 const detailSourceLabel = food?.detailSource || food?.source || 'Recipe';
 const ingredients = splitDetailText(food?.recipe);
 const steps = splitDetailText(food?.steps);
 const video = cleanText(food?.video);
 const alternatives = detail?.alternatives || [];


 return (
   <>
     <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.36)', zIndex: 9998 }} />
     <aside style={{
       position: 'fixed', top: 0, right: 0, width: 'min(440px, 100vw)', height: '100vh',
       background: '#fff', zIndex: 9999, boxShadow: '-16px 0 48px rgba(0,0,0,0.16)',
       display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
     }}>
       <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div>
           <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Food Details</div>
           <div style={{ fontSize: 12, color: C.sub }}>{detailSourceLabel}</div>
         </div>
         <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', color: C.sub }}>x</button>
       </div>


       <div style={{ overflowY: 'auto', padding: 18 }}>
         {loading ? (
           <div style={{ color: C.sub, textAlign: 'center', padding: '40px 0' }}>Loading food details...</div>
         ) : error ? (
           <div style={{ color: C.danger, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 12 }}>{error}</div>
         ) : food ? (
           <>
             <div style={{ height: 190, borderRadius: 14, overflow: 'hidden', background: '#F3F4F6', marginBottom: 16 }}>
               {food.imageId
                 ? <img src={food.imageId} alt={food.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                 : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.sub }}>No image available</div>}
             </div>


             <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
               <div>
                 <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.25, color: C.text }}>{food.name}</h2>
                 <div style={{ color: C.sub, fontSize: 13, marginTop: 6 }}>
                   {food.portion || 1}{food.portionUnit ? ` ${food.portionUnit}` : ''} · {Math.round(food.calories || 0)} kcal
                 </div>
               </div>
               <span style={{ borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800, color: label.color, background: label.bg, whiteSpace: 'nowrap' }}>
                 {label.text}
               </span>
             </div>


             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
               {[
                 ['Fiber', food.fiber],
                 ['Carbs', food.carbs],
                 ['Protein', food.protein],
                 ['Fat', food.fat],
               ].map(([labelText, val]) => (
                 <div key={labelText} style={{ background: '#F9FAFB', border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, textAlign: 'center' }}>
                   <div style={{ fontSize: 11, color: C.sub }}>{labelText}</div>
                   <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginTop: 4 }}>{Number(val || 0).toFixed(1)}g</div>
                 </div>
               ))}
             </div>


             {cleanText(food.remark) && (
               <DetailSection title="Remarks">
                 <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.55 }}>{food.remark}</p>
               </DetailSection>
             )}


             <DetailSection title="Ingredients">
               {ingredients.length ? (
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                   {ingredients.map((item, idx) => (
                     <div key={idx} style={{ background: '#FAFAFA', border: `1px solid ${C.border}`, borderRadius: 8, padding: 9, fontSize: 13, color: C.text }}>{item}</div>
                   ))}
                 </div>
               ) : (
                 <div style={{ color: C.sub, fontSize: 13 }}>Recipe not available.</div>
               )}
             </DetailSection>


             <DetailSection title="Preparation">
               {steps.length ? (
                 <div style={{ display: 'grid', gap: 10 }}>
                   {steps.map((step, idx) => (
                     <div key={idx} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start' }}>
                       <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{idx + 1}</div>
                       <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{step}</div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div style={{ color: C.sub, fontSize: 13 }}>Preparation steps not available.</div>
               )}
             </DetailSection>


             <DetailSection title="Video">
               {/^https?:\/\//i.test(video) ? (
                 <a href={video} target="_blank" rel="noreferrer" style={{ color: C.primary, fontWeight: 800, fontSize: 13 }}>Open recipe video</a>
               ) : (
                 <div style={{ color: C.sub, fontSize: 13 }}>Video not available.</div>
               )}
             </DetailSection>


             <DetailSection title="Health Tags">
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                 {[...(food.recommendedIn || []).map(v => `Recommended: ${v}`), ...(food.avoidIn || []).map(v => `Avoid: ${v}`)].length ? (
                   [...(food.recommendedIn || []).map(v => `Recommended: ${v}`), ...(food.avoidIn || []).map(v => `Avoid: ${v}`)].map(tag => (
                     <span key={tag} style={{ fontSize: 12, color: C.text, background: '#F3F4F6', borderRadius: 999, padding: '5px 9px' }}>{tag}</span>
                   ))
                 ) : (
                   <div style={{ color: C.sub, fontSize: 13 }}>No health tags available.</div>
                 )}
               </div>
             </DetailSection>


             <DetailSection title="Alternatives">
               {alternatives.length ? (
                 <div style={{ display: 'grid', gap: 8 }}>
                   {alternatives.map(alt => (
                     <button key={`${alt.source}-${alt.foodId}`} onClick={() => onOpenAlternative(alt)}
                       style={{ textAlign: 'left', border: `1px solid ${C.border}`, background: '#fff', borderRadius: 10, padding: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                       <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{alt.name}</div>
                       <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>{Math.round(alt.calories || 0)} kcal · {alt.source}</div>
                     </button>
                   ))}
                 </div>
               ) : (
                 <div style={{ color: C.sub, fontSize: 13 }}>No alternatives available.</div>
               )}
             </DetailSection>
           </>
         ) : null}
       </div>
     </aside>
   </>
 );
}


function ProfileDetailModal({ profile, leadName, onClose }) {
 const rows = [
   ['Name', leadName || '-'],
   ['Gender', cleanText(profile?.gender) || '-'],
   ['Age', profile?.age ? `${profile.age} years` : '-'],
   ['Height', profile?.heightCm ? `${profile.heightCm} cm` : '-'],
   ['Current Weight', profile?.weightKg ? `${Number(profile.weightKg).toFixed(1)} kg` : '-'],
   ['Target Weight', profile?.targetWeightKg ? `${Number(profile.targetWeightKg).toFixed(1)} kg` : '-'],
   ['Diet', cleanText(profile?.dietType) || '-'],
   ['Activity', cleanText(profile?.activityLevel) || '-'],
   ['Conditions', (profile?.healthConditions || []).length ? profile.healthConditions.join(', ') : '-'],
   ['Allergies', (profile?.allergies || []).length ? profile.allergies.join(', ') : '-'],
   ['Communities', (profile?.communityCodes || []).length ? profile.communityCodes.join(', ') : '-'],
 ];


 return (
   <>
     <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.36)', zIndex: 9998 }} />
     <aside style={{
       position: 'fixed', top: 0, right: 0, width: 'min(440px, 100vw)', height: '100vh',
       background: '#fff', zIndex: 9999, boxShadow: '-16px 0 48px rgba(0,0,0,0.16)',
       display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
     }}>
       <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>My Profile</div>
         <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', color: C.sub }}>x</button>
       </div>
       <div style={{ overflowY: 'auto', padding: 16 }}>
         <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
           {rows.map(([label, value]) => (
             <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, padding: '11px 12px', borderBottom: `1px solid ${C.border}` }}>
               <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{label}</div>
               <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{value}</div>
             </div>
           ))}
         </div>
       </div>
     </aside>
   </>
 );
}


function getDietTag(food = {}) {
 const code = String(food.foodType || '').trim().toLowerCase();
 if (code === 'nv' || code === 'nve' || code === 'nonveg' || code === 'non-veg') {
   return { label: 'Non-Veg', color: '#B91C1C', dot: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
 }
 if (code === 'e') {
   return { label: 'Eggetarian', color: '#9A3412', dot: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' };
 }
 if (code === 've') {
   return { label: 'Vegan', color: '#166534', dot: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' };
 }
 return { label: 'Vegetarian', color: '#166534', dot: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' };
}


function AddFoodSlotModal({ food, slots, onClose, onSelect, adding }) {
 if (!food) return null;

 return (
   <>
     <div onClick={adding ? undefined : onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.36)', zIndex: 9998 }} />
     <aside style={{
       position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
       width: 'min(420px, calc(100vw - 24px))', background: '#fff', zIndex: 9999,
       boxShadow: '0 20px 50px rgba(0,0,0,0.18)', borderRadius: 20, padding: 18, fontFamily: 'inherit',
     }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
         <div>
           <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>Add Food To Meal</div>
           <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>
             Choose where to add <span style={{ color: C.text, fontWeight: 700 }}>{food.name}</span>
           </div>
         </div>
         <button onClick={adding ? undefined : onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: adding ? 'default' : 'pointer', color: C.sub }}>x</button>
       </div>

       <div style={{ display: 'grid', gap: 10 }}>
         {(slots || []).map(slot => (
           <div key={slot.slotIndex} style={{
             display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
             border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px', background: '#fff',
           }}>
             <div>
               <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{slot.slotName}</div>
               <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>{slot.mealTime}</div>
             </div>
             <button
               onClick={() => onSelect(slot.slotIndex)}
               disabled={adding}
               style={{
                 padding: '9px 16px', borderRadius: 999, border: 'none', background: C.primary,
                 color: '#fff', fontWeight: 800, fontSize: 12, cursor: adding ? 'default' : 'pointer',
                 fontFamily: 'inherit', opacity: adding ? 0.65 : 1,
               }}
             >
               {adding ? 'Adding...' : 'Add'}
             </button>
           </div>
         ))}
       </div>
     </aside>
   </>
 );
}


// ── Slot Block ─────────────────────────────────────────────────────────────────
function SlotBlock({ slot, dayIndex, planId, leadId, onPlanUpdate, onOpenFoodDetail }) {
 const [swapPanel,   setSwapPanel]   = useState(null);
 const [swapOptions, setSwapOptions] = useState([]);
 const [swapLoading, setSwapLoading] = useState(false);
 const [searchQ,     setSearchQ]     = useState('');


 const openSwap = async (foodIndex) => {
   setSwapPanel({ foodIndex });
   setSwapLoading(true);
   try {
     const res = await fetch(`${API}/api/smart-diet-plan/swap-options/${slot.slotIndex}?leadId=${leadId}&dayIndex=${dayIndex}`, { credentials: 'include' });
     const data = await res.json();
     setSwapOptions(data.options || []);
   } catch { setSwapOptions([]); }
   finally { setSwapLoading(false); }
 };


 const doSwap = async (newFood) => {
   try {
     const res = await fetch(`${API}/api/smart-diet-plan/${planId}/swap`, {
       method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
       body: JSON.stringify({ dayIndex, slotIndex: slot.slotIndex, foodIndexInSlot: swapPanel.foodIndex, newFood }),
     });
     const data = await res.json();
     if (res.ok) { onPlanUpdate(data.day, dayIndex); setSwapPanel(null); setSearchQ(''); }
   } catch {}
 };


 const doLog = async (foodIndex, isConsumed) => {
   try {
     const res = await fetch(`${API}/api/smart-diet-plan/${planId}/log-food`, {
       method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
       body: JSON.stringify({ dayIndex, slotIndex: slot.slotIndex, foodIndexInSlot: foodIndex, isConsumed }),
     });
     const data = await res.json();
     if (res.ok) onPlanUpdate(data.day, dayIndex);
   } catch {}
 };


 const filtered = swapOptions.filter(f => !searchQ || f.name.toLowerCase().includes(searchQ.toLowerCase()));
 const icon = SLOT_ICONS[slot.slotIndex] || '🍽️';
 const selectedFoodName = swapPanel ? (slot.foods?.[swapPanel.foodIndex]?.name || 'this food') : 'this food';
 if (!slot.isActive) return null;


 return (
   <div style={{ marginBottom: 20 }}>
     {/* Slot header */}
     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
         <span style={{ fontSize: 20 }}>{icon}</span>
         <div>
           <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{slot.slotName}</div>
           <div style={{ fontSize: 12, color: C.sub }}>{slot.mealTime}</div>
         </div>
       </div>
       {slot.totalCalories > 0 && (
         <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{Math.round(slot.totalCalories)} kcal</div>
           {slot.totalSmartCalories > 0 && <div style={{ fontSize: 11, color: C.sub }}>SC {slot.totalSmartCalories.toFixed(1)}</div>}
         </div>
       )}
     </div>


     {/* Foods */}
     {slot.foods.length === 0 ? (
       <div style={{ padding: '12px 14px', borderRadius: 12, border: `1px dashed ${C.border}`, color: C.sub, fontSize: 13, textAlign: 'center' }}>
         No foods assigned to this slot
       </div>
     ) : (
       slot.foods.map((food, fi) => (
         <FoodItem key={`${food.foodId}-${fi}`} food={food}
           onSwap={() => openSwap(fi)}
           onLog={() => doLog(fi, !food.isConsumed)}
           onOpen={() => onOpenFoodDetail(food, slot.slotIndex)} />
       ))
     )}


     {/* Swap drawer */}
     {swapPanel && (
       <>
         <div onClick={() => { setSwapPanel(null); setSearchQ(''); }}
           style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 8999 }} />
         <div style={{
           position: 'fixed', inset: '0 auto 0 50%', transform: 'translateX(-50%)',
           width: 'min(430px, 100vw)', height: '100vh', zIndex: 9000,
           background: C.bg, boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
           display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
         }}>
           <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${C.border}`, background: '#fff' }}>
             <div style={{ width: 80, height: 5, borderRadius: 999, background: '#A3A3A3', margin: '0 auto 12px' }} />
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
               <button
                 onClick={() => { setSwapPanel(null); setSearchQ(''); }}
                 style={{ border: 'none', background: 'none', color: C.primary, fontSize: 28, lineHeight: 1, cursor: 'pointer', padding: 0 }}
               >
                 ←
               </button>
               <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                 Alternatives for "{selectedFoodName}"
               </div>
               <button onClick={() => { setSwapPanel(null); setSearchQ(''); }}
                 style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#262626', padding: 0 }}>✕</button>
             </div>
           </div>
           <div style={{ padding: '12px 14px 0' }}>
             <input
               style={{ width: '100%', padding: '12px 16px', borderRadius: 999, border: `1.5px solid ${C.primary}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }}
               placeholder="Search in Alternatives" value={searchQ} onChange={e => setSearchQ(e.target.value)} autoFocus
               onFocus={e => { e.target.style.borderColor = C.primary; }}
               onBlur={e => { e.target.style.borderColor = C.primary; }}
             />
           </div>
           <div style={{ padding: '10px 16px', fontSize: 15, color: '#333' }}>
             {filtered.length} Alternatives available
           </div>
           <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 14px' }}>
             {swapLoading ? (
               <div style={{ textAlign: 'center', color: C.sub, paddingTop: 30, fontSize: 14 }}>Loading options…</div>
             ) : filtered.length === 0 ? (
               <div style={{ textAlign: 'center', color: C.sub, paddingTop: 30, fontSize: 14 }}>No foods found</div>
             ) : (
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                 {filtered.map((food, fi) => (
                   (() => {
                     const choice = choiceLabel(food.score);
                     const mark = getDietTag(food);
                     return (
                   <div key={fi} style={{
                     borderRadius: 14, border: `1px solid ${C.border}`, background: '#fff', overflow: 'hidden',
                     boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                   }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 8px 0' }}>
                       <span style={{ fontSize: 10, fontWeight: 800, color: choice.color, background: choice.bg, borderRadius: 999, padding: '4px 8px', maxWidth: 110, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         {choice.text}
                       </span>
                       <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: mark.color, border: `1px solid ${mark.border}`, background: mark.bg, borderRadius: 999, padding: '3px 7px' }}>
                         <span style={{ width: 7, height: 7, borderRadius: '50%', background: mark.dot }} />
                         {mark.label}
                       </span>
                     </div>
                     <div style={{ display: 'flex', gap: 8, padding: 8 }}>
                       <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#F0F0F0' }}>
                         {food.imageId
                           ? <img src={food.imageId} alt={food.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                           : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.sub }}>🥗</div>}
                       </div>
                       <div style={{ minWidth: 0, flex: 1 }}>
                         <div style={{ fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.25, maxHeight: 32, overflow: 'hidden' }}>{food.name}</div>
                         <div style={{ marginTop: 8, fontSize: 12, color: '#5E5E5E' }}>{Math.round(food.calories || 0)} Kcal</div>
                         <div style={{ marginTop: 5, height: 6, borderRadius: 999, background: '#E7E7E7' }}>
                           <div style={{ width: `${Math.max(10, Math.min(100, (Number(food.calories || 0) / 200) * 100))}%`, height: '100%', borderRadius: 999, background: '#2FA339' }} />
                         </div>
                       </div>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 8px 8px' }}>
                       <button
                         onClick={() => doSwap(food)}
                         style={{
                           width: 34, height: 34, borderRadius: '50%', border: '2px solid #9CA3AF',
                           background: '#fff', color: '#6B7280', fontSize: 24, lineHeight: 1, cursor: 'pointer',
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                         }}
                       >
                         +
                       </button>
                     </div>
                   </div>
                     );
                   })()
                 ))}
               </div>
             )}
           </div>
         </div>
       </>
     )}
   </div>
 );
}


// ── Plan List Sidebar ──────────────────────────────────────────────────────────
function PlanListSidebar({ plans, activePlanId, onSelect, onArchive, loading }) {
 return (
   <div style={{ width: 240, flexShrink: 0 }}>
     <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, paddingLeft: 2 }}>
       Plans ({plans.length})
     </div>
     {loading && <div style={{ color: C.sub, fontSize: 13 }}>Loading…</div>}
     {plans.map(p => {
       const isActive = activePlanId === p._id;
       return (
         <div key={p._id} onClick={() => onSelect(p._id)}
           style={{
             borderRadius: 14, padding: '13px 15px', marginBottom: 8, cursor: 'pointer',
             background: isActive ? C.purpleLight : '#fff',
             border: `1.5px solid ${isActive ? C.purple : C.border}`,
             transition: 'all 0.15s',
           }}>
           <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
             {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
           </div>
           <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>
             {p.calorieTarget} kcal/day
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
             <span style={{
               fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
               background: p.status === 'active' ? '#DCFCE7' : '#F3F4F6',
               color:      p.status === 'active' ? '#166534' : C.sub,
             }}>{p.status}</span>
             {p.status !== 'archived' && (
               <button onClick={e => { e.stopPropagation(); onArchive(p._id); }}
                 style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', color: C.sub }}>
                 Archive
               </button>
             )}
           </div>
         </div>
       );
     })}
     {plans.length === 0 && !loading && (
       <div style={{ fontSize: 13, color: C.sub, fontStyle: 'italic', padding: '8px 2px' }}>
         No plans yet.
       </div>
     )}
   </div>
 );
}


// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SmartDietPlanView() {
 const [searchParams] = useSearchParams();
 const navigate = useNavigate();


 const leadId   = searchParams.get('leadId') || '';
 const planId   = searchParams.get('planId') || '';
 const leadName = searchParams.get('name')   || '';


 const [plan,       setPlan]       = useState(null);
 const [plans,      setPlans]      = useState([]);
 const [activeDay,  setActiveDay]  = useState(0);
 const [loading,    setLoading]    = useState(false);
 const [generating, setGenerating] = useState(false);
 const [error,      setError]      = useState('');
 const [foodSearch, setFoodSearch] = useState('');
 const [searchResults, setSearchResults] = useState([]);
 const [searchingFoods, setSearchingFoods] = useState(false);
 const [addFoodState, setAddFoodState] = useState({ open: false, food: null, loading: false });
 const [detailState, setDetailState] = useState({ open: false, loading: false, error: '', detail: null, slotIndex: null });
 const [profileOpen, setProfileOpen] = useState(false);


 const fetchPlans = useCallback(async () => {
   if (!leadId) return;
   try {
     const res  = await fetch(`${API}/api/smart-diet-plan/by-lead/${leadId}`, { credentials: 'include' });
     const data = await res.json();
     setPlans(data.items || []);
   } catch {}
 }, [leadId]);


 const fetchPlan = useCallback(async (id) => {
   setLoading(true); setError('');
   try {
     const res  = await fetch(`${API}/api/smart-diet-plan/${id}`, { credentials: 'include' });
     if (!res.ok) throw new Error('Plan not found');
     const data = await res.json();
     setPlan(data);
   } catch (e) {
     setError(e.message);
   } finally { setLoading(false); }
 }, []);


 useEffect(() => { fetchPlans(); }, [fetchPlans]);


 useEffect(() => {
   if (planId) fetchPlan(planId);
 }, [planId, fetchPlan]);


 useEffect(() => {
   if (plans.length > 0 && !plan && !planId) fetchPlan(plans[0]._id);
 }, [plans, plan, planId, fetchPlan]);


 const generateNewPlan = async () => {
   if (!leadId) return;
   setGenerating(true); setError('');
   try {
     const res  = await fetch(`${API}/api/smart-diet-plan/generate`, {
       method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
       body: JSON.stringify({ leadId }),
     });
     const data = await res.json();
     if (!res.ok) throw new Error(data.error || 'Generation failed');
     setPlan(data);
     await fetchPlans();
   } catch (e) {
     setError(e.message);
   } finally { setGenerating(false); }
 };


 const handlePlanUpdate = (updatedDay, dayIdx) => {
   setPlan(prev => {
     if (!prev) return prev;
     const days = [...prev.planDays];
     days[dayIdx] = updatedDay;
     return { ...prev, planDays: days };
   });
 };


 const archivePlan = async (id) => {
   await fetch(`${API}/api/smart-diet-plan/${id}/status`, {
     method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
     body: JSON.stringify({ status: 'archived' }),
   });
   fetchPlans();
   if (plan?._id === id) setPlan(null);
 };


 const openFoodDetail = async (food, slotIndex) => {
   setDetailState({ open: true, loading: true, error: '', detail: { food }, slotIndex });
   try {
     const qs = new URLSearchParams({
       source: food.source || '',
       foodId: String(food.foodId || ''),
       leadId,
       slotIndex: String(slotIndex),
     });
     const res = await fetch(`${API}/api/smart-diet-plan/food-detail?${qs.toString()}`, { credentials: 'include' });
     const data = await res.json();
     if (!res.ok) throw new Error(data.error || 'Food details not found');
     setDetailState({ open: true, loading: false, error: '', detail: data, slotIndex });
   } catch (e) {
     setDetailState({ open: true, loading: false, error: e.message, detail: { food }, slotIndex });
   }
 };


 const currentDay = plan?.planDays?.[activeDay];
 const currentActiveSlots = (currentDay?.slots || []).filter(slot => slot.isActive);
 const eligibleAddSlots = getEligibleSlotsForFood(addFoodState.food, currentActiveSlots);


 // Build day tabs from plan
 const dayTabs = plan?.planDays?.map((day, idx) => {
   const date = new Date();
   date.setDate(date.getDate() + idx);
   return {
     label:    idx === 0 ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short' }),
     dateNum:  date.getDate(),
     dayLabel: day.dayLabel,
     idx,
   };
 }) || [];


 useEffect(() => {
   if (!plan || !leadId || !foodSearch.trim()) {
     setSearchResults([]);
     setSearchingFoods(false);
     return undefined;
   }

   let active = true;
   const timer = setTimeout(async () => {
     setSearchingFoods(true);
     try {
       const qs = new URLSearchParams({ q: foodSearch.trim(), leadId });
       const res = await fetch(`${API}/api/smart-diet-plan/food-search?${qs.toString()}`, { credentials: 'include' });
       const data = await res.json();
       if (!active) return;
       setSearchResults(Array.isArray(data.results) ? data.results : []);
     } catch {
       if (active) setSearchResults([]);
     } finally {
       if (active) setSearchingFoods(false);
     }
   }, 300);

   return () => {
     active = false;
     clearTimeout(timer);
   };
 }, [foodSearch, leadId, plan]);


 const addFoodToSlot = async (slotIndex, foodOverride = null) => {
   const foodToAdd = foodOverride || addFoodState.food;
   if (!plan?._id || !foodToAdd) return;
   setAddFoodState(prev => ({ ...prev, loading: true }));
   try {
     const res = await fetch(`${API}/api/smart-diet-plan/${plan._id}/add-food`, {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       credentials: 'include',
       body: JSON.stringify({ dayIndex: activeDay, slotIndex, food: foodToAdd }),
     });
     const data = await res.json();
     if (!res.ok) throw new Error(data.error || 'Failed to add food');
     handlePlanUpdate(data.day, activeDay);
     setFoodSearch('');
     setSearchResults([]);
     setAddFoodState({ open: false, food: null, loading: false });
   } catch (e) {
     setError(e.message || 'Failed to add food');
     setAddFoodState(prev => ({ ...prev, loading: false }));
   }
 };


 const openAddFoodFlow = (food) => {
   const matchedSlots = getEligibleSlotsForFood(food, currentActiveSlots);
   if (matchedSlots.length === 1) {
     setAddFoodState({ open: false, food, loading: false });
     addFoodToSlot(matchedSlots[0].slotIndex, food);
     return;
   }
   setAddFoodState({ open: true, food, loading: false });
 };


 return (
   <div style={{ minHeight: '100vh', background: '#ECECEC', fontFamily: "'Noto Sans', 'Inter', sans-serif", display: 'flex', justifyContent: 'center' }}>
     <div style={{ width: '100%', maxWidth: 430, minHeight: '100vh', background: C.bg, boxShadow: '0 10px 36px rgba(0,0,0,0.12)', padding: '0 0 40px' }}>
       <div style={{ padding: '16px 14px 0' }}>
         <div style={{ minWidth: 0 }}>
           {error && (
             <div style={{ padding: '12px 16px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: C.danger, fontSize: 13, marginBottom: 16 }}>
               {error}
             </div>
           )}


           {/* ── Purple header card ── */}
           <div style={{
             background: `linear-gradient(135deg, ${C.purple} 0%, #9B8CF8 100%)`,
             borderRadius: 20, padding: '24px 24px 28px', marginBottom: 20, color: '#fff',
             boxShadow: '0 8px 30px rgba(114,99,244,0.3)',
           }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
               <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
                 {leadName || 'Diet Plan'}
               </h1>
               <button
                 onClick={() => setProfileOpen(true)}
                 title="Open profile"
                 style={{
                   width: 32, height: 32, borderRadius: '50%', border: 'none',
                   background: 'rgba(255,255,255,0.24)', color: '#fff', cursor: 'pointer',
                   fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                 }}
               >
                 ✎
               </button>
             </div>
             <p style={{ margin: '0 0 20px', fontSize: 13, opacity: 0.85 }}>
               Welcome to your daily diet plan.
             </p>


             {plan ? (
               <MacrosCard plan={plan} daySlots={currentDay?.slots} />
             ) : (
               <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
                 <div style={{ fontSize: 14, opacity: 0.85 }}>No plan loaded yet.</div>
                 <button onClick={generateNewPlan} disabled={generating}
                   style={{ marginTop: 12, padding: '10px 24px', borderRadius: 999, background: '#fff', color: C.purple, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                   {generating ? 'Generating…' : '✦ Generate Plan'}
                 </button>
               </div>
             )}
           </div>


           {/* ── Loading ── */}
           {loading && plan === null && (
             <div style={{ textAlign: 'center', padding: 40, color: C.sub, fontSize: 14 }}>Loading plan…</div>
           )}


           {/* ── Plan view ── */}
           {plan && (
             <>
               {/* Day tabs */}
               <div style={{ marginBottom: 20 }}>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, paddingBottom: 4 }}>
                   {dayTabs.map(tab => {
                     const active = tab.idx === activeDay;
                     return (
                       <button key={tab.idx} onClick={() => setActiveDay(tab.idx)}
                         style={{
                           display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                           padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                         }}>
                         <span style={{ fontSize: 12, color: active ? C.primary : C.sub, fontWeight: active ? 700 : 400 }}>
                           {tab.label}
                         </span>
                          <div style={{
                           width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                           background: active ? C.primary : '#E8E8E8',
                           color:      active ? '#fff'    : C.sub,
                           fontSize: 13, fontWeight: active ? 700 : 400,
                         }}>
                           {tab.dateNum}
                         </div>
                       </button>
                     );
                   })}
                 </div>
               </div>


               {/* Diet for Today section */}
               <div style={{ background: '#fff', borderRadius: 20, padding: '18px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                 {/* Section header */}
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                   <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>
                     Diet for {activeDay === 0 ? 'Today' : dayTabs[activeDay]?.label}
                   </h2>
                 </div>


                 {/* Search Food */}
                 <div style={{ position: 'relative', marginBottom: 20 }}>
                   <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.sub, fontSize: 16 }}>🔍</span>
                   <input
                     value={foodSearch} onChange={e => setFoodSearch(e.target.value)}
                     placeholder="Search Food"
                     style={{
                       width: '100%', padding: '11px 16px 11px 62px', borderRadius: 999,
                       border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit',
                       color: C.text, outline: 'none', boxSizing: 'border-box',
                       transition: 'border-color 0.2s',
                     }}
                     onFocus={e => { e.target.style.borderColor = C.primary; }}
                     onBlur={e => { e.target.style.borderColor = C.border; }}
                   />
                   <div style={{ display: 'none' }}>
                     <span style={{ cursor: 'pointer' }}>📷</span>
                     <span style={{ cursor: 'pointer' }}>📊</span>
                   </div>
                 </div>


                 {foodSearch.trim() && (
                   <div style={{ marginBottom: 18, border: `1px solid ${C.border}`, borderRadius: 16, background: '#FCFCFC', overflow: 'hidden' }}>
                     <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                       <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Search Results</div>
                       <div style={{ fontSize: 12, color: C.sub }}>
                         {searchingFoods ? 'Searching...' : `${searchResults.length} foods`}
                       </div>
                     </div>
                     <div style={{ maxHeight: 320, overflowY: 'auto', padding: 12, display: 'grid', gap: 10 }}>
                       {searchingFoods && searchResults.length === 0 && (
                         <div style={{ textAlign: 'center', color: C.sub, fontSize: 13, padding: '16px 0' }}>Searching foods from database...</div>
                       )}
                       {!searchingFoods && searchResults.length === 0 && (
                         <div style={{ textAlign: 'center', color: C.sub, fontSize: 13, padding: '16px 0' }}>No foods found in database.</div>
                       )}
                       {searchResults.map(food => (
                         <div key={`${food.source}-${food.foodId}`} style={{
                           display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                           border: `1px solid ${C.border}`, borderRadius: 14, background: '#fff', padding: 12,
                         }}>
                           <div style={{ minWidth: 0 }}>
                             <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                               {food.name}
                             </div>
                             <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>
                               {Math.round(food.calories || 0)} kcal
                               {food.protein > 0 ? ` · P ${Number(food.protein).toFixed(0)}g` : ''}
                               {food.detailSource ? ` · ${food.detailSource}` : ''}
                             </div>
                           </div>
                            <button
                              onClick={() => openAddFoodFlow(food)}
                             style={{
                               padding: '9px 16px', borderRadius: 999, border: 'none', background: C.primary,
                               color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                             }}
                           >
                             Add
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}


                 {/* Slots */}
                 {currentActiveSlots.map((slot, si) => (
                   <SlotBlock
                     key={si} slot={slot} dayIndex={activeDay}
                     planId={plan._id} leadId={leadId} onPlanUpdate={handlePlanUpdate}
                     onOpenFoodDetail={openFoodDetail}
                   />
                 ))}


                 {currentActiveSlots.length === 0 && (
                   <div style={{ textAlign: 'center', color: C.sub, fontSize: 14, padding: '20px 0' }}>
                     No active meal slots for this day.
                   </div>
                 )}
               </div>


             </>
           )}
         </div>
       </div>
     </div>
     {detailState.open && (
       <FoodDetailDrawer
         detail={detailState.detail}
         loading={detailState.loading}
         error={detailState.error}
         onClose={() => setDetailState({ open: false, loading: false, error: '', detail: null, slotIndex: null })}
         onOpenAlternative={(food) => openFoodDetail(food, detailState.slotIndex)}
       />
     )}
     {profileOpen && (
       <ProfileDetailModal
         profile={plan?.healthProfileSnapshot || {}}
         leadName={leadName}
         onClose={() => setProfileOpen(false)}
       />
     )}
     {addFoodState.open && (
       <AddFoodSlotModal
         food={addFoodState.food}
         slots={eligibleAddSlots}
         adding={addFoodState.loading}
         onClose={() => setAddFoodState({ open: false, food: null, loading: false })}
         onSelect={addFoodToSlot}
       />
     )}
   </div>
 );
}



