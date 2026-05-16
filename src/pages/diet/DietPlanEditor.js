import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API = 'http://localhost:5001';

const C = {
  page: '#f4f7fb',
  surface: '#ffffff',
  surfaceAlt: '#eef4fb',
  line: '#dbe4f0',
  text: '#102033',
  sub: '#66758a',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primarySoft: '#eaf2ff',
  danger: '#ef4444',
  success: '#16a34a',
  gold: '#0f766e',
  greenSoft: '#ecfdf3',
  shadow: '0 18px 42px rgba(15, 23, 42, 0.08)',
};

const ACTIVITY_LABELS = {
  AC1: 'Sedentary',
  AC2: 'Lightly Active',
  AC3: 'Moderately Active',
  AC4: 'Very Active',
};

const GOAL_LABELS = {
  weightLoss: 'Weight Loss',
  weightMaintenance: 'Maintenance',
  muscleGain: 'Muscle Gain',
  fatShredding: 'Fat Shredding',
  diabetes: 'Manage Diabetes',
  pcos: 'Manage PCOS',
  cholesterol: 'Manage Cholesterol',
  hypertension: 'Manage Hypertension',
  thyroid: 'Manage Thyroid',
  ibs: 'IBS',
  kidneyStonesOxalate: 'Kidney Stones',
  pregnancy: 'Pregnancy',
  lactation: 'Lactation',
  glp1: 'GLP-1',
  anemia: 'Anemia',
  osteoporosis: 'Osteoporosis',
  uricAcid: 'Uric Acid',
  heartDisease: 'Heart Disease',
  liverDisease: 'Liver Disease',
  immunityBooster: 'Immunity',
  skinHealth: 'Skin Health',
  hairHealth: 'Hair Health',
};

const DIET_LABELS = {
  V: 'Vegetarian',
  Ve: 'Vegan',
  NV: 'Non-Vegetarian',
  E: 'Eggetarian',
};

const COMMUNITY_LABELS = {
  U: 'Universal',
  P: 'North India',
  S: 'South India',
  M: 'Maharashtra',
  G: 'Gujarat',
  B: 'Bengal',
  T: 'Tamil Nadu',
  R: 'Karnataka',
  K: 'Kerala',
  A: 'Andhra Pradesh',
  H: 'Telangana',
  O: 'Odisha',
  C: 'Continental',
};

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const ACTIVITY_OPTIONS = [
  { value: 'AC1', label: 'Sedentary (No Exercise)' },
  { value: 'AC2', label: 'Lightly Active' },
  { value: 'AC3', label: 'Moderately Active' },
  { value: 'AC4', label: 'Very Active' },
];

const DIET_OPTIONS = [
  { value: 'V', label: 'Vegetarian' },
  { value: 'Ve', label: 'Vegan' },
  { value: 'NV', label: 'Non-Vegetarian' },
  { value: 'E', label: 'Eggetarian' },
];

const COMMUNITY_OPTIONS = [
  { value: 'U', label: 'Universal' },
  { value: 'P', label: 'North India' },
  { value: 'S', label: 'South India' },
  { value: 'M', label: 'Maharashtra' },
  { value: 'G', label: 'Gujarat' },
  { value: 'B', label: 'Bengal' },
  { value: 'T', label: 'Tamil Nadu' },
  { value: 'R', label: 'Karnataka' },
  { value: 'K', label: 'Kerala' },
  { value: 'A', label: 'Andhra Pradesh' },
  { value: 'H', label: 'Telangana' },
  { value: 'O', label: 'Odisha' },
  { value: 'C', label: 'Continental' },
];

const GOAL_OPTIONS = Object.entries(GOAL_LABELS).map(([value, label]) => ({ value, label }));
const CONDITION_OPTIONS = GOAL_OPTIONS;
const ALLERGY_OPTIONS = [
  { value: 'SF', label: 'Seafood' },
  { value: 'ML', label: 'Milk / Lactose' },
  { value: 'F', label: 'Fruits' },
  { value: 'E', label: 'Eggs' },
  { value: 'N', label: 'Nuts' },
  { value: 'G', label: 'Gluten' },
];

const ALLERGY_LABELS = Object.fromEntries(ALLERGY_OPTIONS.map(option => [option.value, option.label]));

function getSessionUserHeaders() {
  try {
    const raw = sessionStorage.getItem('user');
    return raw ? { 'x-session-user': raw } : {};
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

function formatHeight(heightCm) {
  const cm = Number(heightCm || 0);
  if (!cm) return '—';
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return `${feet}' ${inches}"`;
}

function shortText(value, max = 18) {
  const text = String(value || '').trim();
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function listText(values, mapper = (value) => value, empty = '—') {
  const list = (Array.isArray(values) ? values : [])
    .map(mapper)
    .filter(Boolean);
  return list.length ? list.join(', ') : empty;
}

function dayTotals(day) {
  const totals = { calories: 0, carbs: 0, fat: 0, protein: 0, fiber: 0 };
  (day?.slots || []).forEach(slot => {
    totals.calories += Number(slot?.totalCalories || 0);
    totals.carbs += Number(slot?.totalCarbs || 0);
    totals.fat += Number(slot?.totalFat || 0);
    totals.protein += Number(slot?.totalProtein || 0);
    totals.fiber += Number(slot?.totalFiber || 0);
  });
  return totals;
}

function withDayOffset(baseDate, offset) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + offset);
  return next;
}

function SummaryField({ label, value, wide = false }) {
  return (
    <div style={{
      minWidth: wide ? 150 : 108,
      padding: '10px 12px',
      borderRadius: 12,
      background: '#ffffff',
      border: `1px solid ${C.line}`,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <div style={{ fontSize: 10, color: C.sub, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 15, color: C.text, fontWeight: 700, lineHeight: 1.25 }}>{value || '—'}</div>
    </div>
  );
}

function PillBadge({ children, tone = 'warm' }) {
  const tones = {
    warm: { bg: C.primarySoft, color: C.primaryDark, border: '#cfe0ff' },
    soft: { bg: '#eff8ff', color: C.gold, border: '#c7ece8' },
    success: { bg: C.greenSoft, color: C.success, border: '#bbf7d0' },
  };
  const activeTone = tones[tone] || tones.warm;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 12px',
      borderRadius: 999,
      border: `1px solid ${activeTone.border}`,
      background: activeTone.bg,
      color: activeTone.color,
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function MultiSelectPills({ options, values, onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(option => {
        const active = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 999,
              border: `1px solid ${active ? C.primary : C.line}`,
              background: active ? C.primarySoft : '#fff',
              color: active ? C.primaryDark : C.text,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 7 }}>
        {label}{required ? ' *' : ''}
      </div>
      {children}
    </div>
  );
}

function InputControl(props) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        height: 40,
        borderRadius: 10,
        border: `1px solid ${C.line}`,
        background: '#f8fbff',
        padding: '0 12px',
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box',
        ...(props.style || {}),
      }}
    />
  );
}

function SelectControl(props) {
  return (
    <select
      {...props}
      style={{
        width: '100%',
        height: 40,
        borderRadius: 10,
        border: `1px solid ${C.line}`,
        background: '#f8fbff',
        padding: '0 12px',
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box',
        ...(props.style || {}),
      }}
    />
  );
}

function ProfileEditDialog({ open, form, onChange, onToggle, onClose, onSave, saving }) {
  if (!open) return null;

  const sectionHeader = (icon, title, subtitle, iconBg, iconColor) => (
    <div style={{ padding: '14px 22px', borderBottom: '1px solid #edf0f7', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: iconBg, color: iconColor, display: 'grid', placeItems: 'center', fontSize: 15 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1f3250' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#9aa6bd', marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.32)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        width: 'min(1560px, 96vw)',
        maxHeight: '94vh',
        overflowY: 'auto',
        background: '#f6f7ff',
        borderRadius: 22,
        boxShadow: '0 24px 80px rgba(15,23,42,0.16)',
        border: '1px solid #dfe5f3',
        padding: 12,
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: 'sticky',
            top: 0,
            marginLeft: 'auto',
            display: 'grid',
            placeItems: 'center',
            width: 34,
            height: 34,
            borderRadius: 10,
            border: '1px solid #d7dfef',
            background: '#ffffff',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
            zIndex: 2,
          }}
        >
          ×
        </button>
        <div style={{ background: '#fff', border: '1px solid #e6eaf5', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
          {sectionHeader('◌', 'Basic Information', 'Personal details and body metrics', '#f4f6fb', '#475569')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: 10, borderRight: '1px solid #edf0f7', borderBottom: '1px solid #edf0f7' }}>
                <Field label="Name" required>
                  <InputControl value={form.clientName} onChange={e => onChange('clientName', e.target.value)} style={{ background: '#eef1fb', height: 32 }} />
                </Field>
              </div>
              <div style={{ padding: 10, borderBottom: '1px solid #edf0f7' }}>
                <Field label="Age" required>
                  <InputControl value={form.age} onChange={e => onChange('age', e.target.value.replace(/[^\d]/g, ''))} style={{ background: '#eef1fb', height: 32 }} />
                </Field>
              </div>

              <div style={{ padding: 10, borderRight: '1px solid #edf0f7', borderBottom: '1px solid #edf0f7' }}>
                <Field label="Gender" required>
                  <SelectControl value={form.gender} onChange={e => onChange('gender', e.target.value)} style={{ background: '#eef1fb', height: 32 }}>
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectControl>
                </Field>
              </div>
              <div style={{ padding: 10, borderBottom: '1px solid #edf0f7' }}>
                <Field label="Country" required>
                  <SelectControl value={form.country} onChange={e => onChange('country', e.target.value)} style={{ background: '#eef1fb', height: 32 }}>
                    <option value="India">India</option>
                  </SelectControl>
                </Field>
              </div>

              <div style={{ padding: 10, borderRight: '1px solid #edf0f7', borderBottom: '1px solid #edf0f7' }}>
                <Field label="Actual Weight" required>
                  <InputControl value={form.weightKg} onChange={e => onChange('weightKg', e.target.value.replace(/[^\d.]/g, ''))} style={{ background: '#eef1fb', height: 32 }} />
                </Field>
              </div>
              <div style={{ padding: 10, borderBottom: '1px solid #edf0f7' }}>
                <Field label="Desired Weight">
                  <InputControl value={form.targetWeightKg} onChange={e => onChange('targetWeightKg', e.target.value.replace(/[^\d.]/g, ''))} style={{ background: '#eef1fb', height: 32 }} />
                </Field>
              </div>

              <div style={{ padding: 10, borderRight: '1px solid #edf0f7' }}>
                <Field label="Height" required>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px', gap: 8 }}>
                    <InputControl value={form.heightCm} onChange={e => onChange('heightCm', e.target.value.replace(/[^\d.]/g, ''))} style={{ background: '#eef1fb', height: 32 }} />
                    <SelectControl value="Cms" onChange={() => {}} style={{ background: '#eef1fb', height: 32 }}>
                      <option value="Cms">Cms</option>
                    </SelectControl>
                  </div>
                </Field>
              </div>
              <div style={{ padding: 10 }}>
                <Field label="Community" required>
                  <SelectControl value={form.communityCode} onChange={e => onChange('communityCode', e.target.value)} style={{ background: '#eef1fb', height: 32 }}>
                    {COMMUNITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectControl>
                </Field>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e6eaf5', borderRadius: 18, overflow: 'hidden' }}>
          {sectionHeader('♡', 'Health & Diet', 'Activity, preferences and clinical information', '#fff7ec', '#d97706')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: 14, borderRight: '1px solid #edf0f7', borderBottom: '1px solid #edf0f7' }}>
              <Field label="Activity Level" required>
                <SelectControl value={form.activityCode} onChange={e => onChange('activityCode', e.target.value)} style={{ background: '#eef1fb' }}>
                  {ACTIVITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectControl>
              </Field>
            </div>
            <div style={{ padding: 14, borderBottom: '1px solid #edf0f7' }}>
              <Field label="Diet Preference" required>
                <SelectControl value={form.dietType} onChange={e => onChange('dietType', e.target.value)} style={{ background: '#eef1fb' }}>
                  {DIET_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectControl>
              </Field>
            </div>

            <div style={{ padding: 14, borderRight: '1px solid #edf0f7', borderBottom: '1px solid #edf0f7' }}>
              <Field label="Diet Plan Name" required>
                <SelectControl value={form.goal} onChange={e => onChange('goal', e.target.value)} style={{ background: '#eef1fb' }}>
                  {GOAL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectControl>
              </Field>
            </div>
            <div style={{ padding: 14, borderBottom: '1px solid #edf0f7' }}>
              <Field label="Disorders">
                <MultiSelectPills options={CONDITION_OPTIONS} values={form.healthConditions} onToggle={(value) => onToggle('healthConditions', value)} />
              </Field>
            </div>

            <div style={{ padding: 14 }}>
              <Field label="Allergies">
                <MultiSelectPills options={ALLERGY_OPTIONS} values={form.allergies} onToggle={(value) => onToggle('allergies', value)} />
              </Field>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              minWidth: 320,
              height: 42,
              borderRadius: 24,
              border: 'none',
              background: saving ? '#c7d2fe' : '#a9b4f7',
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Updating…' : 'Update Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchBox({ state, onChange, onSearch, onClose, onPick, disabled }) {
  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 14, background: '#f8fbff', border: `1px solid ${C.line}`, boxShadow: '0 8px 18px rgba(15,23,42,0.05)' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={state.q}
          onChange={e => onChange(e.target.value)}
          placeholder="Search food from database"
          style={{
            flex: 1,
            height: 34,
            borderRadius: 10,
            border: `1px solid ${C.line}`,
            padding: '0 10px',
            fontSize: 12,
            outline: 'none',
            background: '#ffffff',
          }}
        />
        <button
          onClick={onSearch}
          disabled={disabled || !state.q.trim()}
          style={{
            height: 34,
            padding: '0 12px',
            borderRadius: 10,
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: disabled ? '#c7d2fe' : C.primary,
            color: '#fff',
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {state.loading ? 'Searching…' : 'Search'}
        </button>
        <button
          onClick={onClose}
          style={{
            height: 34,
            padding: '0 10px',
            borderRadius: 10,
            border: `1px solid ${C.line}`,
            background: '#ffffff',
            cursor: 'pointer',
            color: C.sub,
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          Close
        </button>
      </div>
      {state.error && <div style={{ marginTop: 8, fontSize: 12, color: C.danger }}>{state.error}</div>}
      {!state.error && state.searched && !state.loading && state.results.length === 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: C.sub }}>No database foods matched this search.</div>
      )}
      {state.results.length > 0 && (
        <div style={{ display: 'grid', gap: 8, marginTop: 10, maxHeight: 220, overflowY: 'auto' }}>
          {state.results.map(food => (
            <div key={`${food.source}-${food._id}-${food.name}`} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '10px 12px',
              background: '#ffffff',
              border: `1px solid ${C.line}`,
              borderRadius: 12,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
                <div style={{ fontSize: 11, color: C.sub }}>
                  {Math.round(food.calories || 0)} kcal
                  {food.portion ? ` · ${food.portion}` : ''}
                  {food.portionUnit ? ` ${food.portionUnit}` : ''}
                </div>
              </div>
              <button
                onClick={() => onPick(food)}
                style={{
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: C.primary,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditorProfileSummary({
  profile,
  plan,
  calorieDraft,
  saving,
  onEditProfile,
  onCaloriesChange,
  onUpdateCalories,
}) {
  const items = [
    ['Weight', profile?.weightKg ? `${profile.weightKg} kg` : '—'],
    ['Height', formatHeight(profile?.heightCm)],
    ['Activity', shortText(ACTIVITY_LABELS[profile?.activityCode] || profile?.activityCode, 12)],
    ['Goal', shortText(GOAL_LABELS[profile?.goal] || profile?.goal, 12)],
    ['Food Pref.', shortText(DIET_LABELS[profile?.dietType] || profile?.dietType, 12)],
    ['Country', 'India'],
    ['Community', shortText(listText(profile?.communityCodes, code => COMMUNITY_LABELS[code] || code), 14)],
    ['Allergy', shortText(listText(profile?.allergies, code => ALLERGY_LABELS[code] || code), 16)],
    ['Diseases', shortText(listText(profile?.healthConditions, code => GOAL_LABELS[code] || code), 16)],
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr repeat(9, minmax(0, 0.85fr)) auto',
      background: '#ffffff',
      border: `1px solid ${C.line}`,
      borderRadius: 18,
      overflow: 'hidden',
      alignItems: 'stretch',
    }}>
      <div style={{ padding: '12px 14px', borderRight: '2px solid #6d77ff', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, color: '#5b60ff', fontWeight: 800 }}>{profile?.clientName || plan?.clientName || 'Client'}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>
            {profile?.age ? `${profile.age} yrs,` : '—'}
            {profile?.clientPhone ? ` ${profile.clientPhone}` : ''}
          </div>
        </div>
        <button onClick={onEditProfile} title="Edit profile" style={{ border: 'none', background: 'transparent', color: '#5b60ff', cursor: 'pointer', fontSize: 18, padding: 0 }}>✎</button>
      </div>

      {items.map(([label, value]) => (
        <div key={label} style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, color: '#6d77ff', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{value}</div>
        </div>
      ))}

      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: '#6d77ff', marginBottom: 4 }}>Calories</div>
          <input
            value={calorieDraft}
            onChange={e => onCaloriesChange(e.target.value.replace(/[^\d]/g, ''))}
            style={{
              width: 74,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${C.line}`,
              textAlign: 'center',
              background: '#fff',
              fontSize: 13,
              fontWeight: 700,
              outline: 'none',
            }}
          />
        </div>
        <button
          onClick={onUpdateCalories}
          disabled={saving || !calorieDraft.trim()}
          style={{
            marginTop: 18,
            height: 32,
            padding: '0 18px',
            borderRadius: 16,
            border: 'none',
            background: saving ? '#c7d2fe' : '#6d77ff',
            color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          Update
        </button>
      </div>
    </div>
  );
}

export default function DietPlanEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId') || '';
  const requestedPlanId = searchParams.get('planId') || '';

  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [planList, setPlanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    clientName: '',
    age: '',
    gender: '',
    country: 'India',
    weightKg: '',
    targetWeightKg: '',
    heightCm: '',
    communityCode: 'U',
    activityCode: 'AC1',
    dietType: 'V',
    goal: 'weightLoss',
    healthConditions: [],
    allergies: [],
  });
  const [calorieDraft, setCalorieDraft] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [searchBoxes, setSearchBoxes] = useState({});
  const messageTimeoutRef = useRef(null);

  const showMessage = (message) => {
    window.clearTimeout(messageTimeoutRef.current);
    setSaveMessage(message);
    messageTimeoutRef.current = window.setTimeout(() => setSaveMessage(''), 2200);
  };

  const openProfileDialog = () => {
    const current = profile || {};
    setProfileForm({
      clientName: current.clientName || plan?.clientName || '',
      age: current.age ? String(current.age) : '',
      gender: current.gender || '',
      country: 'India',
      weightKg: current.weightKg ? String(current.weightKg) : '',
      targetWeightKg: current.targetWeightKg ? String(current.targetWeightKg) : '',
      heightCm: current.heightCm ? String(current.heightCm) : '',
      communityCode: current.communityCodes?.[0] || 'U',
      activityCode: current.activityCode || 'AC1',
      dietType: current.dietType || 'V',
      goal: current.goal || 'weightLoss',
      healthConditions: Array.isArray(current.healthConditions) ? current.healthConditions : [],
      allergies: Array.isArray(current.allergies) ? current.allergies : [],
    });
    setProfileDialogOpen(true);
  };

  const updateProfileForm = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleProfileArray = (field, value) => {
    setProfileForm(prev => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists ? current.filter(item => item !== value) : [...current, value],
      };
    });
  };

  const loadData = useCallback(async () => {
    if (!leadId) {
      setError('leadId is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const profileRes = await apiFetch(`${API}/api/smart-diet-plan/health-profile/${leadId}`);
      const profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData.error || 'Failed to load profile');

      const listRes = await apiFetch(`${API}/api/smart-diet-plan/by-lead/${leadId}?limit=10`);
      const listData = await listRes.json();
      if (!listRes.ok) throw new Error(listData.error || 'Failed to load plans');

      let targetPlanId = requestedPlanId || listData?.items?.[0]?._id || '';
      if (!targetPlanId) {
        const generateRes = await apiFetch(`${API}/api/smart-diet-plan/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId }),
        });
        const generateData = await generateRes.json();
        if (!generateRes.ok) throw new Error(generateData.error || 'Failed to generate diet plan');
        targetPlanId = generateData._id;
      }

      const planRes = await apiFetch(`${API}/api/smart-diet-plan/${targetPlanId}`);
      const planData = await planRes.json();
      if (!planRes.ok) throw new Error(planData.error || 'Failed to load plan');

      setProfile(profileData);
      setPlanList(listData.items || []);
      setPlan(planData);
      setCalorieDraft(String(planData.calorieTarget || profileData.calorieTarget || ''));
    } catch (err) {
      setError(err.message || 'Failed to load diet editor.');
      setProfile(null);
      setPlan(null);
      setPlanList([]);
    } finally {
      setLoading(false);
    }
  }, [leadId, requestedPlanId]);

  useEffect(() => {
    loadData();
    return () => window.clearTimeout(messageTimeoutRef.current);
  }, [loadData]);

  const activeSlots = useMemo(() => {
    const slots = plan?.planDays?.[0]?.slots || [];
    return slots.filter(slot => slot?.isActive).sort((a, b) => a.slotIndex - b.slotIndex);
  }, [plan]);

  const weekStart = useMemo(() => {
    const base = plan?.createdAt ? new Date(plan.createdAt) : new Date();
    return base;
  }, [plan]);

  const weekLabel = useMemo(() => {
    const start = weekStart;
    const end = withDayOffset(start, 6);
    return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }, [weekStart]);

  const persistEditor = async (payload, successMessage) => {
    if (!plan?._id) return null;
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/api/smart-diet-plan/${plan._id}/editor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save diet plan');
      setPlan(data);
      if (payload.calorieTarget !== undefined) {
        setCalorieDraft(String(data.calorieTarget || ''));
      }
      if (successMessage) showMessage(successMessage);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to save diet plan.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateSearchBox = (key, patch) => {
    setSearchBoxes(prev => ({
      ...prev,
      [key]: {
        q: '',
        results: [],
        loading: false,
        searched: false,
        error: '',
        open: true,
        ...(prev[key] || {}),
        ...patch,
      },
    }));
  };

  const runSearch = async (dayIndex, slotIndex) => {
    const key = `${dayIndex}-${slotIndex}`;
    const box = searchBoxes[key] || {};
    const q = String(box.q || '').trim();
    if (!q) return;
    updateSearchBox(key, { loading: true, searched: false, error: '' });
    try {
      const qs = new URLSearchParams({ q, leadId, slotIndex: String(slotIndex) });
      const res = await apiFetch(`${API}/api/smart-diet-plan/food-search?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Food search failed');
      updateSearchBox(key, { loading: false, searched: true, results: data.results || [] });
    } catch (err) {
      updateSearchBox(key, { loading: false, searched: true, error: err.message || 'Search failed', results: [] });
    }
  };

  const handleAddFood = async (dayIndex, slotIndex, food) => {
    if (!plan?._id) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/api/smart-diet-plan/${plan._id}/add-food`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayIndex, slotIndex, food }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add food');
      setPlan(prev => {
        if (!prev) return prev;
        const planDays = [...(prev.planDays || [])];
        planDays[dayIndex] = data.day;
        return { ...prev, planDays };
      });
      updateSearchBox(`${dayIndex}-${slotIndex}`, { open: false, q: '', results: [], searched: false, error: '' });
      showMessage('Food added.');
    } catch (err) {
      setError(err.message || 'Failed to add food.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFood = async (dayIndex, slotIndex, foodIndexInSlot) => {
    if (!plan?._id) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/api/smart-diet-plan/${plan._id}/remove-food`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayIndex, slotIndex, foodIndexInSlot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove food');
      setPlan(prev => {
        if (!prev) return prev;
        const planDays = [...(prev.planDays || [])];
        planDays[dayIndex] = data.day;
        return { ...prev, planDays };
      });
      showMessage('Food removed.');
    } catch (err) {
      setError(err.message || 'Failed to remove food.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPreviousWeek = async () => {
    const previousMeta = (planList || []).find(item => String(item._id) !== String(plan?._id));
    if (!previousMeta?._id) {
      showMessage('No previous week found for this client.');
      return;
    }
    setSaving(true);
    try {
      const prevRes = await apiFetch(`${API}/api/smart-diet-plan/${previousMeta._id}`);
      const prevData = await prevRes.json();
      if (!prevRes.ok) throw new Error(prevData.error || 'Failed to load previous week');
      await persistEditor({ planDays: prevData.planDays || [] }, 'Previous week copied.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWeek = async () => {
    await persistEditor({ planDays: plan?.planDays || [] }, 'Diet plan saved.');
  };

  const handleUpdateCalories = async () => {
    if (!calorieDraft.trim()) return;
    await persistEditor({ calorieTarget: Number(calorieDraft) }, 'Calories updated.');
  };

  const handleSaveProfile = async () => {
    if (!leadId) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        leadId,
        clientName: profileForm.clientName.trim(),
        clientPhone: profile?.clientPhone || plan?.clientPhone || '',
        gender: profileForm.gender,
        age: Number(profileForm.age || 0),
        heightCm: Number(profileForm.heightCm || 0),
        weightKg: Number(profileForm.weightKg || 0),
        targetWeightKg: profileForm.targetWeightKg ? Number(profileForm.targetWeightKg) : undefined,
        activityCode: profileForm.activityCode,
        goal: profileForm.goal,
        dietType: profileForm.dietType,
        communityCodes: [profileForm.communityCode || 'U'],
        healthConditions: profileForm.healthConditions,
        allergies: profileForm.allergies,
        mealsPerDay: profile?.mealsPerDay || plan?.healthProfileSnapshot?.mealsPerDay || 3,
      };

      if (!payload.clientName || !payload.gender || !payload.age || !payload.heightCm || !payload.weightKg) {
        throw new Error('Please fill all required profile fields.');
      }

      const res = await apiFetch(`${API}/api/smart-diet-plan/health-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfile(data);
      setCalorieDraft(String(data.calorieTarget || calorieDraft));
      setPlan(prev => prev ? ({
        ...prev,
        clientName: data.clientName || prev.clientName,
        clientPhone: data.clientPhone || prev.clientPhone,
        calorieTarget: data.calorieTarget || prev.calorieTarget,
        smartCalorieTarget: data.smartCalorieTarget || prev.smartCalorieTarget,
        healthProfileSnapshot: {
          ...(prev.healthProfileSnapshot || {}),
          gender: data.gender,
          age: data.age,
          heightCm: data.heightCm,
          weightKg: data.weightKg,
          targetWeightKg: data.targetWeightKg,
          activityCode: data.activityCode,
          goal: data.goal,
          dietType: data.dietType,
          communityCodes: data.communityCodes,
          healthConditions: data.healthConditions,
          allergies: data.allergies,
          mealsPerDay: data.mealsPerDay,
        },
      }) : prev);
      setProfileDialogOpen(false);
      showMessage('Profile updated.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', background: C.page, display: 'grid', placeItems: 'center', fontFamily: 'Noto Sans, sans-serif', color: C.sub }}>Loading diet editor…</div>;
  }

  if (error && !plan) {
    return (
      <div style={{ minHeight: '100vh', background: C.page, padding: 32, fontFamily: 'Noto Sans, sans-serif' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 16, border: `1px solid ${C.line}`, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 10 }}>Diet editor could not load</div>
          <div style={{ fontSize: 14, color: C.sub, marginBottom: 18 }}>{error}</div>
          <button onClick={() => navigate('/diet-dashboard')} style={{ height: 40, padding: '0 18px', borderRadius: 10, border: 'none', background: C.primary, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f6f9fc 0%, #f2f6fb 100%)',
      fontFamily: 'Noto Sans, sans-serif',
      color: C.text,
    }}>
      <ProfileEditDialog
        open={profileDialogOpen}
        form={profileForm}
        onChange={updateProfileForm}
        onToggle={toggleProfileArray}
        onClose={() => setProfileDialogOpen(false)}
        onSave={handleSaveProfile}
        saving={saving}
      />
      <div style={{ maxWidth: 1740, margin: '0 auto', padding: '24px 20px 34px' }}>
        <div style={{
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: C.shadow,
        }}>
          <div style={{
            padding: '22px 24px 24px',
            borderBottom: `1px solid ${C.line}`,
            background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 55%, #f2f7ff 100%)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 12, color: C.gold, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Diet Plan Editor</div>
                <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.08, color: C.text, maxWidth: 620 }}>
                  Fine-tune the weekly plan for {profile?.clientName || plan?.clientName || 'your client'}
                </div>
                <div style={{ fontSize: 14, color: C.sub, marginTop: 10, maxWidth: 620 }}>
                  Review nutrition targets, refine meal slots, and keep the weekly plan aligned with the client profile.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <PillBadge tone="soft">{weekLabel}</PillBadge>
                {saveMessage && <PillBadge tone="success">{saveMessage}</PillBadge>}
                {error && <PillBadge>{error}</PillBadge>}
              </div>
            </div>

            <EditorProfileSummary
              profile={profile}
              plan={plan}
              calorieDraft={calorieDraft}
              saving={saving}
              onEditProfile={openProfileDialog}
              onCaloriesChange={setCalorieDraft}
              onUpdateCalories={handleUpdateCalories}
            />

            <div style={{ display: 'none' }}>
            <div style={{
              minWidth: 248,
              padding: '18px 18px 16px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
              color: '#f8fbff',
              boxShadow: '0 12px 28px rgba(15,23,42,0.14)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#f8fbff', lineHeight: 1.1 }}>{profile?.clientName || plan?.clientName || 'Client'}</div>
                <button
                  onClick={openProfileDialog}
                  title="Edit profile"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#f8fbff',
                    cursor: 'pointer',
                    fontSize: 16,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  ✎
                </button>
              </div>
              <div style={{ fontSize: 14, color: 'rgba(248,251,255,0.76)', marginTop: 8 }}>{profile?.age ? `${profile.age} yrs` : '—'} {profile?.clientPhone ? `· ${profile.clientPhone}` : ''}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <PillBadge tone="soft">{DIET_LABELS[profile?.dietType] || 'Diet'}</PillBadge>
                <PillBadge tone="soft">{GOAL_LABELS[profile?.goal] || 'Goal'}</PillBadge>
              </div>
            </div>
            <SummaryField label="Weight" value={profile?.weightKg ? `${profile.weightKg} kg` : '—'} />
            <SummaryField label="Height" value={formatHeight(profile?.heightCm)} />
            <SummaryField label="Activity" value={shortText(ACTIVITY_LABELS[profile?.activityCode] || profile?.activityCode)} />
            <SummaryField label="Goal" value={shortText(GOAL_LABELS[profile?.goal] || profile?.goal)} />
            <SummaryField label="Food Pref." value={shortText(DIET_LABELS[profile?.dietType] || profile?.dietType)} />
            <SummaryField label="Country" value="India" />
            <SummaryField label="Community" value={shortText((profile?.communityCodes || []).map(code => COMMUNITY_LABELS[code] || code).join(', '), 20)} />
            <SummaryField label="Allergy" value={shortText((profile?.allergies || []).join(', '), 20)} />
            <SummaryField label="Diseases" value={shortText((profile?.healthConditions || []).join(', '), 20)} />
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 18, background: '#fffaf6', border: `1px solid ${C.line}` }}>
              <div>
                <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Calories</div>
                <input
                  value={calorieDraft}
                  onChange={e => setCalorieDraft(e.target.value.replace(/[^\d]/g, ''))}
                  style={{
                    width: 90,
                    height: 40,
                    borderRadius: 12,
                    border: `1px solid ${C.line}`,
                    textAlign: 'center',
                    background: '#fff',
                    fontSize: 16,
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={handleUpdateCalories}
                disabled={saving || !calorieDraft.trim()}
                style={{
                  height: 40,
                  padding: '0 18px',
                  borderRadius: 14,
                  border: 'none',
                  background: saving ? '#c7d2fe' : C.primary,
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                }}
              >
                Update
              </button>
            </div>
          </div>
          </div>

          <div style={{ padding: '18px 20px 14px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 18,
              flexWrap: 'wrap',
              position: 'sticky',
              top: 0,
              zIndex: 4,
              background: 'rgba(246,249,252,0.96)',
              backdropFilter: 'blur(10px)',
              padding: '12px 0 14px',
            }}>
              <button onClick={() => navigate('/diet-dashboard')} style={{ width: 46, height: 46, borderRadius: 14, border: `1px solid ${C.line}`, background: '#ffffff', fontSize: 22, cursor: 'pointer', color: C.text, lineHeight: 1 }}>←</button>
              <div style={{ fontSize: 23, fontWeight: 800, minWidth: 140, color: C.text }}>Weekly Builder</div>
              <button
                onClick={() => showMessage('Template copy will be wired next.')}
                style={{
                  height: 44,
                  padding: '0 18px',
                  borderRadius: 14,
                  border: `1px solid ${C.line}`,
                  background: '#ffffff',
                  color: C.text,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Copy from template
              </button>
              <button
                onClick={handleCopyPreviousWeek}
                style={{
                  height: 44,
                  padding: '0 18px',
                  borderRadius: 14,
                  border: 'none',
                  background: C.primary,
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Copy previous week
              </button>
            </div>

            <div style={{ overflowX: 'auto', paddingBottom: 12, borderRadius: 22, border: `1px solid ${C.line}`, background: '#ffffff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)' }}>
              <div style={{ minWidth: 1580, padding: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '240px repeat(7, minmax(196px, 1fr))', gap: 10, marginBottom: 10 }}>
                  <div />
                  {(plan?.planDays || []).slice(0, 7).map((day, idx) => {
                    const date = withDayOffset(weekStart, idx);
                    const totals = dayTotals(day);
                    return (
                      <div key={idx} style={{ padding: '12px 10px 14px', border: `1px solid ${C.line}`, background: '#fbfdff', borderRadius: 16, boxShadow: '0 6px 14px rgba(15,23,42,0.04)' }}>
                        <div style={{ textAlign: 'center', color: C.primaryDark, fontWeight: 800, fontSize: 18 }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div style={{ textAlign: 'center', color: C.sub, fontSize: 12, marginBottom: 10 }}>{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div style={{ background: '#f6faff', borderRadius: 14, padding: '12px 10px 10px', textAlign: 'center', minHeight: 84, border: '1px solid #dce7f5' }}>
                          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: C.primaryDark }}>{Math.round(totals.calories || 0)}<span style={{ fontSize: 14, fontWeight: 700, marginLeft: 2 }}>kcal</span></div>
                          <div style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>
                            Carbs:{Math.round(totals.carbs || 0)}g | Fat:{Math.round(totals.fat || 0)}g
                          </div>
                          <div style={{ fontSize: 11, color: C.sub }}>
                            Protein:{Math.round(totals.protein || 0)}g | Fiber:{Math.round(totals.fiber || 0)}g
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activeSlots.map(slotMeta => (
                  <div key={slotMeta.slotIndex} style={{ display: 'grid', gridTemplateColumns: '240px repeat(7, minmax(196px, 1fr))', gap: 10, marginBottom: 10 }}>
                    <div style={{ padding: '18px 16px', background: '#f8fbff', border: `1px solid ${C.line}`, borderRadius: 16, boxShadow: '0 6px 14px rgba(15,23,42,0.04)' }}>
                      <div style={{ fontSize: 12, color: C.gold, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{slotMeta.mealTime || '—'}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.primaryDark }}>{slotMeta.slotName}</div>
                      <div style={{ fontSize: 12, color: C.sub, marginTop: 8 }}>Add, remove, or adjust foods for this meal block.</div>
                    </div>

                    {(plan?.planDays || []).slice(0, 7).map((day, dayIndex) => {
                      const slot = (day?.slots || []).find(item => item.slotIndex === slotMeta.slotIndex) || slotMeta;
                      const key = `${dayIndex}-${slotMeta.slotIndex}`;
                      const searchState = searchBoxes[key] || { q: '', results: [], loading: false, searched: false, error: '', open: false };
                      return (
                        <div key={key} style={{ padding: 8, border: `1px solid ${C.line}`, borderRadius: 16, background: '#ffffff', boxShadow: '0 6px 14px rgba(15,23,42,0.035)' }}>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {(slot?.foods || []).map((food, foodIndex) => (
                              <div key={`${food.source}-${food.foodId || food._id || food.name}-${foodIndex}`} style={{
                                border: `1px solid ${C.line}`,
                                borderRadius: 12,
                                background: '#fbfdff',
                                padding: '12px 12px 10px',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: C.primaryDark, lineHeight: 1.35 }}>{food.name}</div>
                                  <PillBadge tone="soft">{Math.round(food.calories || 0)} kcal</PillBadge>
                                </div>
                                <div style={{ fontSize: 11, color: C.sub }}>
                                  {food.portion ? `${food.portion}` : ''}
                                  {food.portionUnit ? ` ${food.portionUnit}` : ''}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                  <div style={{ fontSize: 10, color: C.sub, fontWeight: 700 }}>
                                    P{Math.round(food.protein || 0)} · C{Math.round(food.carbs || 0)} · F{Math.round(food.fat || 0)}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveFood(dayIndex, slotMeta.slotIndex, foodIndex)}
                                    style={{
                                      height: 28,
                                      padding: '0 10px',
                                      borderRadius: 10,
                                      border: `1px solid #fecaca`,
                                      background: '#fff5f5',
                                      color: C.danger,
                                      cursor: 'pointer',
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}

                            <button
                              onClick={() => updateSearchBox(key, { open: !searchState.open })}
                              style={{
                                height: 38,
                                borderRadius: 12,
                                border: `1px dashed ${C.primary}`,
                                background: '#f8fbff',
                                color: C.primaryDark,
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              + Add Food
                            </button>

                            {searchState.open && (
                              <SearchBox
                                state={searchState}
                                onChange={(q) => updateSearchBox(key, { q })}
                                onSearch={() => runSearch(dayIndex, slotMeta.slotIndex)}
                                onClose={() => updateSearchBox(key, { open: false })}
                                onPick={(food) => handleAddFood(dayIndex, slotMeta.slotIndex, food)}
                                disabled={saving}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '22px 4px 14px' }}>
              <button
                onClick={handleSaveWeek}
                disabled={saving}
                style={{
                  minWidth: 280,
                  height: 48,
                  borderRadius: 18,
                  border: 'none',
                  background: saving ? '#c7d2fe' : C.primary,
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {saving ? 'Saving…' : 'Save Diet Plan'}
              </button>
              <button
                onClick={() => showMessage('Template creation can be connected next.')}
                style={{
                  minWidth: 280,
                  height: 48,
                  borderRadius: 18,
                  border: `1px solid ${C.line}`,
                  background: '#ffffff',
                  color: C.text,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
