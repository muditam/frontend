import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Button,
  Stack,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell, 
  TableBody,
  Paper,
  IconButton,
  Tooltip,
  FormHelperText,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Collapse,
  Alert,
  Checkbox, // ⬅️ added
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";

const BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const PUBLIC_LINK_BASE = "https://muditam.com/apps/consultation/diet-plan";

// ---------- HELPERS ----------
const WEEKLY_TYPE = "weekly-14";
const MONTHLY_TYPE = "monthly-options";
 
const mealsOrder = ["Breakfast", "Lunch", "Snacks", "Dinner"];
const monthlySlotOrder = ["Breakfast", "Lunch", "Evening Snack", "Dinner"];

const FORTNIGHT_DAYS = 14;

const emptyFortnight = () => 
  mealsOrder.reduce((acc, meal) => {
    acc[meal] = Array(FORTNIGHT_DAYS).fill("");
    return acc;
  }, {});

const defaultMonthlyState = () =>
  monthlySlotOrder.reduce((acc, key) => {
    acc[key] = { time: "", options: [] }; // no title
    return acc;
  }, {});

// Default weekly times (editable)
const defaultWeeklyTimes = () => ({
  Breakfast: "",
  Lunch: "",
  Snacks: "",
  Dinner: "",
});

function toISO(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

const deepClone = (o) => JSON.parse(JSON.stringify(o));

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtRange(isoStart, days) {
  const from = new Date(isoStart + "T00:00:00Z");
  const to = new Date(addDays(isoStart, days - 1) + "T00:00:00Z");
  return `${from.toLocaleDateString()} — ${to.toLocaleDateString()}`;
}

// Health profile + goals metadata
const CONDITION_OPTIONS = [
  "Diabetes",
  "Fatty Liver",
  "High Cholesterol",
  "Thyroid",
  "Digestive Issues",
];

const GOAL_OPTIONS = [
  "Blood sugar control",
  "Weight management",
  "Reduce Liver Stress",
  "Cholesterol & heart health",
  "Hormonal & metabolic balance",
  "Better digestion & gut health",
  "Steady energy levels",
  "Reduced inflammation",
];

const CONDITION_TO_GOALS = {
  Diabetes: ["Blood sugar control"],
  "Fatty Liver": [
    "Reduce Liver Stress",
    "Weight management",
    "Better digestion & gut health",
    "Reduced inflammation",
  ],
  "High Cholesterol": [
    "Cholesterol & heart health",
    "Weight management",
    "Reduced inflammation",
  ],
  Thyroid: [
    "Hormonal & metabolic balance",
    "Weight management",
    "Steady energy levels",
  ],
  "Digestive Issues": [
    "Better digestion & gut health",
    "Steady energy levels",
    "Reduced inflammation",
  ],
};

// Accepts either a flattened document or one with a `.plan` object
function unwrapPlan(doc) {
  const p = doc?.plan || doc || {};
  return {
    planType: p.planType,
    templateId: p.templateId,
    templateLabel: p.templateLabel,
    startDate: p.startDate,
    durationDays: p.durationDays,
    fortnight: p.fortnight,
    weeklyTimes: p.weeklyTimes,
    monthly: p.monthly,
    healthProfile: p.healthProfile, // kept for local UI display only (not sent now)
    conditions: p.conditions,
    healthGoals: p.healthGoals,
  };
}

// Limit dropdown height to 4 items
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const PastPlansMenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4 + ITEM_PADDING_TOP, // ~4 visible
      overflowY: "auto",
    },
  },
};

/* ===== Height helpers ===== */

// Parse "5.1", "5'6", "5-8", "5 8" → centimeters
function parseFeetStringToCm(input) {
  if (input == null) return NaN;
  let s = String(input).trim();
  if (!s) return NaN;

  // Normalize unicode quotes and separators
  s = s.replace(/″|”|“|’|‘/g, "'").replace(/[–—]/g, "-");

  // If it's like 5.10 treat . as inch separator (not decimal feet)
  // Accept separators: ', -, ., or space
  const m = s.match(/^(\d+)\s*(?:'|-|\.|\s)?\s*(\d{1,2})?$/);
  if (!m) return NaN;

  const feet = parseInt(m[1], 10);
  const inches = m[2] != null ? parseInt(m[2], 10) : 0;

  if (!Number.isFinite(feet) || feet < 0) return NaN;
  if (!Number.isFinite(inches) || inches < 0 || inches > 11) return NaN;

  const totalInches = feet * 12 + inches;
  const cm = totalInches * 2.54;
  return Math.round(cm); // integer cm is fine for DB
}

function cmToFeetInchesString(cmVal) {
  const cm = Number(cmVal);
  if (!Number.isFinite(cm) || cm <= 0) return "";
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    inches = 0;
    // carry over
    return `${feet + 1}'0`;
  }
  return `${feet}'${inches}`;
}

export default function CreateDietPlanPopup({
  open,
  onClose,
  prefillCustomer = {},
  initialPlanType = "Weekly",
  onSaved,
}) {
  const {
    name = "",
    phone = "",
    leadId = "",
    age: preAge = "",
    heightCm: preHeight = "",
    weightKg: preWeight = "",
  } = prefillCustomer;

  const appUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const createdByName = (appUser && appUser.fullName) || "";

  const [planType, setPlanType] = useState(initialPlanType);

  // Templates from backend
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesWeekly, setTemplatesWeekly] = useState([]);
  const [templatesMonthly, setTemplatesMonthly] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [templatesError, setTemplatesError] = useState("");

  // Start date controls
  const [startMode, setStartMode] = useState("Today"); // Today | Tomorrow | Custom
  const [customStartDate, setCustomStartDate] = useState("");

  // Weekly (14 days) state
  const [fortnight, setFortnight] = useState(emptyFortnight());
  const [weeklyTimes, setWeeklyTimes] = useState(defaultWeeklyTimes());

  // Monthly (options) state (no title)
  const [monthly, setMonthly] = useState(defaultMonthlyState());

  const [saving, setSaving] = useState(false);

  // Past plans
  const [pastPlans, setPastPlans] = useState([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [selectedPastPlanId, setSelectedPastPlanId] = useState(""); // dropdown beside template
  const selectedPastPlan = useMemo(
    () => pastPlans.find((p) => String(p._id) === String(selectedPastPlanId)),
    [pastPlans, selectedPastPlanId]
  );

  // ✅ generated plan link (shown after Save & Download)
  const [generatedLink, setGeneratedLink] = useState("");

  // Health inputs for quick display (not sent to backend anymore)
  const [age, setAge] = useState(preAge ?? "");
  const [heightCm, setHeightCm] = useState(preHeight ?? "");
  const [weightKg, setWeightKg] = useState(preWeight ?? "");

  // keep inputs in sync if parent prefill changes
  useEffect(() => {
    setAge(preAge ?? "");
    setHeightCm(preHeight ?? "");
    setWeightKg(preWeight ?? "");
  }, [preAge, preHeight, preWeight]);

  // Conditions & Goals
  const [conditions, setConditions] = useState([]);
  const [healthGoals, setHealthGoals] = useState([]);
  const [goalsTouched, setGoalsTouched] = useState(false); // prevent overwriting manual edits
  const [newGoal, setNewGoal] = useState(""); 

  const [editVitalsMode, setEditVitalsMode] = useState(false);
  const [editAge, setEditAge] = useState("");
  const [editHeightRaw, setEditHeightRaw] = useState("");     // ⬅️ unified height input (cm text or ft/in text)
  const [editHeightIsFeet, setEditHeightIsFeet] = useState(false); // ⬅️ checkbox state
  const [editWeightKg, setEditWeightKg] = useState("");
  const [savingVitals, setSavingVitals] = useState(false); 
  const [vitalsErrorMsg, setVitalsErrorMsg] = useState("");

  useEffect(() => {
    if (goalsTouched) return;
    const auto = Array.from(
      new Set(
        (conditions || []).flatMap((c) => CONDITION_TO_GOALS[c] || [])
      )
    );
    setHealthGoals(auto);
  }, [conditions, goalsTouched]);

  const addCustomGoal = () => {
    const g = (newGoal || "").trim();
    if (!g) return;
    setHealthGoals((prev) => Array.from(new Set([...(prev || []), g])));
    setNewGoal("");
    setGoalsTouched(true);
  };

  const removeGoal = (goal) => {
    setHealthGoals((prev) => (prev || []).filter((g) => g !== goal));
    setGoalsTouched(true);
  };

  const blackContained = {
    backgroundColor: "black",
    color: "white",
    "&:hover": { backgroundColor: "#222" },
  };
  const blackOutlined = {
    borderColor: "black",
    color: "black",
    "&:hover": { borderColor: "#222", backgroundColor: "rgba(0,0,0,0.04)" },
  };

  // Load templates on open
  useEffect(() => {
    if (!open) return;
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      setTemplatesError("");
      try {
        const { data } = await axios.get(`${BASE_URL}/api/diet-templates`, {
          params: { status: "published" },
        });
        const weekly = (data || []).filter((t) => t.type === WEEKLY_TYPE);
        const monthly = (data || []).filter((t) => t.type === MONTHLY_TYPE);
        setTemplatesWeekly(weekly);
        setTemplatesMonthly(monthly);
      } catch (e) {
        setTemplatesError(
          e?.response?.data?.error || "Failed to load templates. Please try again."
        );
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, [open]);

  // Load lead health fields + goals/conditions (display only)
  useEffect(() => {
    if (!open || !leadId) return;
    (async () => {
      try {
        const { data } = await axios.get(`${BASE_URL}/api/leads/${leadId}`);
        const hp = data?.healthProfile || {};
        const det = data?.details || {};

        const _age = det?.age ?? hp?.age ?? "";
        const _height = det?.height ?? hp?.heightCm ?? "";
        const _weight = det?.weight ?? hp?.weightKg ?? "";

        setAge(_age === 0 ? "0" : _age?.toString() || "");
        setHeightCm(_height === 0 ? "0" : _height?.toString() || "");
        setWeightKg(_weight === 0 ? "0" : _weight?.toString() || "");

        setConditions(data?.conditions || []);
        setHealthGoals(data?.healthGoals || []);
        setGoalsTouched(Boolean((data?.healthGoals || []).length));
      } catch {
        // silent
      }
    })();
  }, [open, leadId]);

  // Reset per plan-type switch
  useEffect(() => {
    setTemplateId("");
    setFortnight(emptyFortnight());
    setWeeklyTimes(defaultWeeklyTimes());
    setMonthly(defaultMonthlyState());
    setGeneratedLink(""); // clear old link on type change
  }, [planType]);

  // Initial planType sync
  useEffect(() => {
    setPlanType(initialPlanType);
  }, [initialPlanType]); 

  // Templates for current type
  const templateOptions =
    planType === "Weekly" ? templatesWeekly : templatesMonthly;

  // Selected template
  const selectedTemplate = useMemo(
    () => templateOptions.find((t) => String(t._id) === String(templateId)),
    [templateOptions, templateId]
  );

  // Apply selected template to UI state
  useEffect(() => {
    if (!selectedTemplate) return;
    const { body, type } = selectedTemplate || {};

    if (type === WEEKLY_TYPE) {
      const fromBody = body?.fortnight;
      if (fromBody && typeof fromBody === "object") {
        const normalized = emptyFortnight();
        mealsOrder.forEach((meal) => {
          const arr = Array.isArray(fromBody[meal]) ? fromBody[meal] : [];
          normalized[meal] = [...arr].slice(0, FORTNIGHT_DAYS);
          while (normalized[meal].length < FORTNIGHT_DAYS) normalized[meal].push("");
        });
        setFortnight(deepClone(normalized));
      } else {
        setFortnight(emptyFortnight());
      }

      const wt = body?.weeklyTimes || defaultWeeklyTimes();
      setWeeklyTimes({
        Breakfast: wt.Breakfast || "",
        Lunch: wt.Lunch || "",
        Snacks: wt.Snacks || "",
        Dinner: wt.Dinner || "",
      });
    } else if (type === MONTHLY_TYPE) {
      const fromBody = body?.monthly;
      const normalized = defaultMonthlyState();

      if (fromBody && typeof fromBody === "object") {
        monthlySlotOrder.forEach((slotKey) => {
          const slot = fromBody[slotKey];
          if (slot && typeof slot === "object") {
            normalized[slotKey] = {
              time: slot.time ?? "",
              options: Array.isArray(slot.options) ? [...slot.options] : [],
            };
          }
        });
      }
      setMonthly(deepClone(normalized));
    }
  }, [selectedTemplate]);

  const startEditVitals = () => {
    setVitalsErrorMsg("");
    setEditAge(String(age ?? ""));
    // default to cm mode; prefill raw with cm value
    setEditHeightIsFeet(false);
    setEditHeightRaw(String(heightCm ?? ""));
    setEditWeightKg(String(weightKg ?? ""));
    setEditVitalsMode(true);
  };

  const cancelEditVitals = () => {
    setVitalsErrorMsg("");
    setEditVitalsMode(false);
  };

  const toggleHeightMode = (checked) => {
    setEditHeightIsFeet(checked);
    // Convert the currently typed value for user convenience
    if (checked) {
      // convert cm -> feet'in string
      const ftStr = cmToFeetInchesString(Number(editHeightRaw));
      if (ftStr) setEditHeightRaw(ftStr);
    } else {
      // convert feet string -> cm number (as text)
      const cm = parseFeetStringToCm(editHeightRaw);
      if (Number.isFinite(cm)) setEditHeightRaw(String(cm));
    }
  };

  const saveEditVitals = async () => {
    if (!leadId) return;

    const a = Number(editAge);
    const w = Number(editWeightKg);

    // Height parsing based on mode
    let h;
    if (editHeightIsFeet) {
      h = parseFeetStringToCm(editHeightRaw);
    } else {
      h = Number(editHeightRaw);
    }

    if (![a, h, w].every((n) => Number.isFinite(n) && n > 0)) {
      setVitalsErrorMsg("Please enter valid positive numbers for Age, Height, and Weight.");
      return;
    }

    try {
      setSavingVitals(true);
      setVitalsErrorMsg("");
      // Update both places for compatibility: details + healthProfile
      await axios.put(`${BASE_URL}/api/leads/${leadId}`, {
        details: { age: a, height: h, heightCm: h, weight: w, weightKg: w }, 
        healthProfile: { age: a, heightCm: h, weightKg: w },
      });
      // Reflect locally
      setAge(a); 
      setHeightCm(h); 
      setWeightKg(w);
      setEditVitalsMode(false);
    } catch (e) {
      setVitalsErrorMsg(
        e?.response?.data?.error || "Failed to update vitals. Please try again."
      );
    } finally {
      setSavingVitals(false);
    }
  };

  // start date computed 
  const startDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startMode === "Today") return toISO(today);
    if (startMode === "Tomorrow") {
      const tm = new Date(today);
      tm.setDate(tm.getDate() + 1);
      return toISO(tm);
    }
    return customStartDate || toISO(today); 
  }, [startMode, customStartDate]);

  const durationDays = planType === "Weekly" ? FORTNIGHT_DAYS : 30; 

  const vitalsFilled = useMemo(() => {
    const a = String(age ?? "").trim();
    const h = String(heightCm ?? "").trim();
    const w = String(weightKg ?? "").trim();
    return Boolean(a && h && w);
  }, [age, heightCm, weightKg]);

  const conditionsFilled = useMemo(() => (conditions?.length ?? 0) > 0, [conditions]);

  const canSave = useMemo(() => {
    if (!leadId || saving || !templateId || !vitalsFilled || !conditionsFilled) return false; 

    if (planType === "Weekly") { 
      const any = mealsOrder.some((m) =>
        fortnight[m].some((v) => (v || "").trim())
      );
      return any;
    } 
    const anyMonthly = Object.values(monthly).some((slot) =>
      slot.options.some((o) => (o || "").trim())
    );
    return anyMonthly;
  }, [leadId, saving, templateId, planType, fortnight, monthly, vitalsFilled, conditionsFilled]);

  // -------- Weekly helpers --------
  const setCell = (meal, dayIdx, value) => {
    setFortnight((prev) => {
      const next = { ...prev, [meal]: [...prev[meal]] };
      next[meal][dayIdx] = value;
      return next;
    });
  };

  const setWeeklyTime = (meal, value) => {
    setWeeklyTimes((prev) => ({ ...prev, [meal]: value }));
  };

  // -------- Monthly helpers (no title) --------
  const setSlotTime = (slotKey, value) => {
    setMonthly((prev) => ({
      ...prev,
      [slotKey]: { ...prev[slotKey], time: value },
    }));
  };

  const addOption = (slotKey) => {
    setMonthly((prev) => {
      const items = [...prev[slotKey].options, ""];
      return { ...prev, [slotKey]: { ...prev[slotKey], options: items } };
    });
  };

  const setOption = (slotKey, idx, value) => {
    setMonthly((prev) => {
      const items = [...prev[slotKey].options];
      items[idx] = value;
      return { ...prev, [slotKey]: { ...prev[slotKey], options: items } };
    });
  };

  const removeOption = (slotKey, idx) => {
    setMonthly((prev) => {
      const items = prev[slotKey].options.filter((_, i) => i !== idx);
      return { ...prev, [slotKey]: { ...prev[slotKey], options: items } };
    });
  };

  // -------- Payloads & IO --------
  const makePayload = () => {
    return {
      customer: { name, phone, leadId },
      plan: {
        planType,
        templateId: selectedTemplate?._id || "",
        templateLabel: selectedTemplate?.name || "",
        templateType:
          selectedTemplate?.type ||
          (planType === "Weekly" ? WEEKLY_TYPE : MONTHLY_TYPE),
        startDate,
        durationDays,
        ...(planType === "Weekly" ? { fortnight, weeklyTimes } : { monthly }),
        // ✅ send conditions & goals only (no health profile in payload now)
        conditions,
        healthGoals,
        createdAt: new Date().toISOString(),
      },
    };
  };

  const saveToBackend = async (payload) => {
    const body = {
      ...payload,
      createdBy: createdByName,
    };
    const { data } = await axios.post(`${BASE_URL}/api/diet-plans`, body);
    return data;
  };

  // Copy handler
  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard?.writeText(generatedLink);
    } catch {
      // fallback
      window.prompt("Copy this link:", generatedLink);
    }
  };

  // Save handler — no CSV download anymore, just link with animation
  const handleSave = async () => {
    if (!canSave) return;
    if (!vitalsFilled) {
      alert("Age, Height, and Weight are required. Please update these before saving.");
      return;
    } 

    if (!conditionsFilled) {
      alert("Please select at least one Health Condition before saving.");
      return;
    }
    const payload = makePayload(); 
    try {
      setGeneratedLink(""); // clear old link
      setSaving(true);
      const created = await saveToBackend(payload);

      if (typeof onSaved === "function") {
        try {
          await Promise.resolve(onSaved({ payload, created }));
        } catch {}
      }

      const createdId =
        created?._id ||
        created?.item?._id ||
        created?.data?._id ||
        created?.plan?._id ||
        created?.result?._id;

      if (createdId) {
        // ✅ Append ?by=<fullName> so the viewer route uses this immediately
        const byParam = createdByName ? `?by=${encodeURIComponent(createdByName)}` : "";
        setGeneratedLink(`${PUBLIC_LINK_BASE}/${createdId}${byParam}`);
      } else {
        setGeneratedLink("");
        console.warn("Could not determine created diet plan _id for link.");
      }
    } catch (err) {
      console.error(
        "Failed to save diet plan:",
        err?.response?.data || err?.message || err
      );
      alert(
        err?.response?.data?.error ||
          "Failed to save diet plan. Please check server logs."
      );
    } finally {
      setSaving(false);
    }
  };

  const replicatePlanIntoEditor = (doc) => {
    if (!doc) return;
    const {
      planType: pType,
      templateId: tId,
      fortnight: f14,
      weeklyTimes: wt,
      monthly: mOpt,
      healthProfile: hp,
      conditions: cond,
      healthGoals: goals,
    } = unwrapPlan(doc);

    const safeType = pType || "Weekly";
    setPlanType(safeType);
    setTemplateId(tId ? String(tId) : "");

    if (safeType === "Weekly" && f14) {
      const normalized = emptyFortnight();
      mealsOrder.forEach((meal) => {
        const arr = Array.isArray(f14[meal]) ? f14[meal] : [];
        normalized[meal] = [...arr].slice(0, FORTNIGHT_DAYS);
        while (normalized[meal].length < FORTNIGHT_DAYS) normalized[meal].push("");
      });
      setFortnight(deepClone(normalized));
      setWeeklyTimes({
        Breakfast: wt?.Breakfast || "",
        Lunch: wt?.Lunch || "",
        Snacks: wt?.Snacks || "",
        Dinner: wt?.Dinner || "",
      });
      setMonthly(defaultMonthlyState());
    } else if (safeType === "Monthly" && mOpt) {
      const normalized = defaultMonthlyState();
      monthlySlotOrder.forEach((slotKey) => {
        const slot = mOpt[slotKey];
        if (slot && typeof slot === "object") {
          normalized[slotKey] = {
            time: slot.time ?? "",
            options: Array.isArray(slot.options) ? [...slot.options] : [],
          };
        }
      });
      setMonthly(deepClone(normalized));
      setFortnight(emptyFortnight());
      setWeeklyTimes(defaultWeeklyTimes());
    }

    // restore health info (display only)
    setAge(hp?.age ?? "");
    setHeightCm(hp?.heightCm ?? "");
    setWeightKg(hp?.weightKg ?? "");

    // restore conditions & goals
    setConditions(cond || []);
    setHealthGoals(goals || []);
    setGoalsTouched(Boolean(goals && goals.length));
  };

  const renderPastPlanPreview = (doc) => {
    if (!doc) return null;
    const u = unwrapPlan(doc);
    const isWeekly = u.planType === "Weekly";
    const effectiveDays = isWeekly ? 14 : 30;
    const isoStart = (u.startDate || "").slice(0, 10);
    const range = isoStart ? fmtRange(isoStart, effectiveDays) : "—";

    return (
      <Box
        sx={{
          mt: 1,
          p: 1.5,
          border: "1px dashed #ddd",
          borderRadius: 1.5,
          background: "#fafafa",
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
          {doc.templateLabel || doc.planType} • {doc.planType} • {range}
        </Typography>

        {isWeekly ? (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                    Meal
                  </TableCell>
                  {Array.from({ length: 14 }, (_, i) => (
                    <TableCell
                      key={i}
                      align="center"
                      sx={{
                        fontWeight: 700,
                        backgroundColor: "#f5f5f5",
                        minWidth: 120,
                      }}
                    >
                      Day {i + 1}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {mealsOrder.map((meal) => (
                  <TableRow key={meal}>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{meal}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {u.weeklyTimes && u.weeklyTimes[meal]
                            ? `(${u.weeklyTimes[meal]})`
                            : ""}
                        </Typography>
                      </Box>
                    </TableCell>
                    {Array.from({ length: 14 }, (_, i) => (
                      <TableCell key={i} align="left">
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {doc.fortnight?.[meal]?.[i] || "—"}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gap: 1 }}>
            {monthlySlotOrder.map((slot) => {
              const s = doc.monthly?.[slot];
              if (!s) return null;
              return (
                <Paper key={slot} variant="outlined" sx={{ p: 1, borderColor: "#eee" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {slot} {s.time ? `(${s.time})` : ""}
                  </Typography>
                  {(s.options || []).length ? (
                    <ul style={{ margin: "6px 0 0 16px" }}>
                      {s.options.map((opt, idx) => (
                        <li key={idx}>
                          <Typography variant="body2">{opt}</Typography>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Typography variant="body2">—</Typography>
                  )}
                </Paper>
              );
            })}
          </Box>
        )}
        <Box sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            sx={{ ...blackOutlined, mr: 1 }}
            onClick={() => replicatePlanIntoEditor(doc)}
          >
            Replicate same
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      scroll="paper"
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: "center" }}>
        Create Diet Plan
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: 2,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Customer + Health quick inputs (display only) */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          {!editVitalsMode ? (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ flexWrap: "wrap" }}
            >
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                <b>Customer:</b> {name || "—"} &nbsp; | &nbsp; <b>Phone:</b>{" "}
                {phone || "—"} &nbsp; | &nbsp; <b>Age:</b> {age || "—"} &nbsp; | &nbsp;{" "}
                <b>Height:</b> {heightCm ? `${heightCm} cm` : "—"} &nbsp; | &nbsp;{" "}
                <b>Weight:</b> {weightKg ? `${weightKg} kg` : "—"}
              </Typography>
              <Tooltip title="Edit age/height/weight">
                <span>
                  <IconButton size="small" onClick={startEditVitals} aria-label="Edit vitals">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          ) : (
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center">
              <TextField
                label="Age"
                size="small"
                type="number"
                value={editAge}
                onChange={(e) => setEditAge(e.target.value)}
                sx={{ width: 110 }}
                InputLabelProps={{ shrink: true }}
              />

              {/* Height input with ft/in toggle */}
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label={editHeightIsFeet ? "Height (ft/in)" : "Height (cm)"}
                  size="small"
                  type={editHeightIsFeet ? "text" : "number"}
                  value={editHeightRaw}
                  onChange={(e) => setEditHeightRaw(e.target.value)}
                  sx={{ width: 160 }}
                  InputLabelProps={{ shrink: true }}
                  placeholder={editHeightIsFeet ? "e.g. 5'6 or 5.8" : ""}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={editHeightIsFeet}
                      onChange={(e) => toggleHeightMode(e.target.checked)}
                    />
                  }
                  label="ft/in"
                />
              </Stack>

              <TextField
                label="Weight (kg)"
                size="small"
                type="number"
                value={editWeightKg}
                onChange={(e) => setEditWeightKg(e.target.value)}
                sx={{ width: 140 }}
                InputLabelProps={{ shrink: true }}
              />
              <Tooltip title="Save">
                <span>
                  <IconButton
                    size="small"
                    onClick={saveEditVitals}
                    aria-label="Save vitals"
                    disabled={savingVitals}
                    sx={{ color: "black" }}
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton size="small" onClick={cancelEditVitals} aria-label="Cancel edit">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Stack>

        {vitalsErrorMsg && (
          <Alert severity="error" variant="outlined">{vitalsErrorMsg}</Alert>
        )}
 
        {!vitalsFilled && (
          <Alert severity="error" variant="outlined">
             Age, Height, and Weight are required. Please update the lead’s details before saving.
          </Alert>
         )}

        {/* Controls row: Plan Type, Template, Past Plans */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          {/* Plan Type */}
          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel shrink id="plan-type-label">
              Plan Type
            </InputLabel>
            <Select
              labelId="plan-type-label"
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              label="Plan Type"
              sx={{
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(0,0,0,0.23)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "black",
                },
              }}
            >
              <MenuItem value="Weekly">Two Weeks (14 Days)</MenuItem>
              <MenuItem value="Monthly">Monthly (Options)</MenuItem>
            </Select>
          </FormControl>

          {/* Template */}
          <FormControl
            size="small"
            sx={{ width: 260 }}
            disabled={loadingTemplates || !!templatesError}
          >
            <InputLabel shrink id="template-label">
              Select Template
            </InputLabel>
            <Select
              labelId="template-label"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              label="Select Template"
              sx={{
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(0,0,0,0.23)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "black",
                },
              }}
            >
              {(planType === "Weekly" ? templatesWeekly : templatesMonthly).map(
                (t) => (
                  <MenuItem key={t._id} value={t._id}>
                    {t.name} {t.category ? `— ${t.category}` : ""}{" "}
                    {t.version ? `(v${t.version})` : ""}
                  </MenuItem>
                )
              )}
            </Select>
            {loadingTemplates && (
              <FormHelperText>Loading templates…</FormHelperText>
            )}
            {!!templatesError && (
              <FormHelperText error>Failed to load templates</FormHelperText>
            )}
          </FormControl>

          {/* Past Plans */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flex: 1 }}>
            <FormControl
              size="small"
              sx={{ minWidth: 260 }}
              disabled={loadingPast || !pastPlans.length}
            >
              <InputLabel shrink id="past-plans-label">
                See/Replicate Past Plan
              </InputLabel>
              <Select
                labelId="past-plans-label"
                value={selectedPastPlanId}
                onChange={(e) => setSelectedPastPlanId(e.target.value)}
                label="Select Past Plan"
                MenuProps={PastPlansMenuProps}
              >
                {pastPlans.map((p) => {
                  const isoStart = (p.startDate || "").slice(0, 10);
                  const days = p.planType === "Weekly" ? 14 : 30;
                  const label = `${p.templateLabel || p.planType} (${p.planType})`;
                  const range = isoStart ? fmtRange(isoStart, days) : "";
                  return (
                    <MenuItem key={p._id} value={p._id}>
                      {label} {range ? `• ${range}` : ""}
                    </MenuItem>
                  );
                })}
              </Select>
              {!loadingPast && !pastPlans.length && (
                <FormHelperText>★ No past diet plan available</FormHelperText>
              )}
              {loadingPast && (
                <FormHelperText>Loading past plans…</FormHelperText>
              )}
            </FormControl>
          </Box>
        </Stack>

        {/* Conditions & Goals */}
        <Paper
          variant="outlined"
          sx={{ p: 2, borderRadius: 2, borderColor: "rgba(0,0,0,0.08)" }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
            Health Conditions & Goals
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {/* Conditions (multi) */}
            <FormControl size="small" sx={{ minWidth: 240 }} error={!conditionsFilled}> 
              <InputLabel id="conditions-label">Conditions</InputLabel>
              <Select
                labelId="conditions-label"
                label="Conditions"
                multiple
                required
                value={conditions}
                onChange={(e) =>
                  setConditions(
                    typeof e.target.value === "string"
                      ? e.target.value.split(",")
                      : e.target.value
                  )
                }
                renderValue={(selected) => selected.join(", ")}
              >
                {CONDITION_OPTIONS.map((opt) => ( 
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select> 
              <FormHelperText>
                {conditionsFilled
                  ? "Selecting conditions will auto-pick relevant goals (you can edit)."
                  : "Please select at least one condition."}
             </FormHelperText>
            </FormControl>

            {/* Health Goals (multi) */}
            <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
              <InputLabel id="goals-label">Health Goals</InputLabel>
              <Select
                labelId="goals-label"
                label="Health Goals"
                multiple
                value={healthGoals}
                onChange={(e) => {
                  const vals =
                    typeof e.target.value === "string"
                      ? e.target.value.split(",")
                      : e.target.value;
                  setHealthGoals(vals);
                  setGoalsTouched(true);
                }}
                renderValue={(selected) => selected.join(", ")}
              >
                {GOAL_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Add your own goals below if needed.</FormHelperText>
            </FormControl>
          </Stack>

          {/* Selected goal chips with delete */}
          {!!healthGoals.length && (
            <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {healthGoals.map((g) => (
                <Chip key={g} label={g} onDelete={() => removeGoal(g)} />
              ))}
            </Box>
          )}
        </Paper>

        {/* Start Date Options */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <RadioGroup row value={startMode} onChange={(e) => setStartMode(e.target.value)}>
            <FormControlLabel value="Today" control={<Radio />} label="Today" />
            <FormControlLabel value="Tomorrow" control={<Radio />} label="Tomorrow" />
            <FormControlLabel value="Custom" control={<Radio />} label="Custom" />
          </RadioGroup>

          {startMode === "Custom" ? (
            <TextField
              type="date"
              size="small"
              label="Start Date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          ) : (
            <TextField
              size="small"
              label="Start Date"
              value={startDate}
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
            />
          )}

          <Typography variant="body2" sx={{ ml: { xs: 0, sm: 1 }, opacity: 0.7 }}>
            {planType === "Weekly"
              ? `Range: ${fmtRange(startDate, 14)}`
              : `Range: ${fmtRange(startDate, 30)}`}
          </Typography>
        </Stack>

        {/* BODY (scrolls) */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            borderRadius: 1,
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {planType === "Weekly" ? (
            <Box sx={{ overflowX: "auto", overflowY: "auto", height: "100%" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        backgroundColor: "#f5f5f5",
                      }}
                    >
                      Meal
                    </TableCell>
                    {Array.from({ length: FORTNIGHT_DAYS }, (_, i) => (
                      <TableCell
                        key={i}
                        align="center"
                        sx={{
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          minWidth: 220,
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        Day {i + 1}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mealsOrder.map((meal, rIdx) => (
                    <TableRow
                      key={meal}
                      sx={{
                        backgroundColor: rIdx % 2 ? "rgba(0,0,0,0.015)" : "inherit",
                      }}
                    >
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          position: "sticky",
                          left: 0,
                          zIndex: 1,
                          backgroundColor: rIdx % 2 ? "rgba(0,0,0,0.015)" : "#fff",
                        }}
                      >
                        {/* Meal name with time below it */}
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                          <Typography sx={{ fontWeight: 600 }}>{meal}</Typography>
                          <TextField
                            variant="standard"
                            size="small"
                            placeholder="8–9 AM"
                            value={weeklyTimes[meal] || ""}
                            onChange={(e) => setWeeklyTime(meal, e.target.value)}
                            inputProps={{ "aria-label": `${meal} time` }}
                            sx={{ maxWidth: 140 }}
                          />
                        </Box>
                      </TableCell>
                      {Array.from({ length: FORTNIGHT_DAYS }, (_, i) => (
                        <TableCell key={i} align="center" sx={{ minWidth: 220 }}>
                          <TextField
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                            value={fortnight[meal][i]}
                            onChange={(e) => setCell(meal, i, e.target.value)}
                            placeholder={`Enter ${meal.toLowerCase()}`}
                            inputProps={{ style: { fontSize: 14, lineHeight: 1.3 } }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                maxHeight: "100%",
                overflowY: "auto",
                overflowX: "hidden",
                p: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.75, px: 1 }}>
                Monthly plan uses option lists per slot. Patients can select any one.
              </Typography>

              {monthlySlotOrder.map((slotKey) => {
                const slot = monthly[slotKey];
                if (!slot) return null;
                return (
                  <Paper
                    key={slotKey}
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 2,
                      borderColor: "rgba(0,0,0,0.1)",
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 80 }}>
                        {slotKey}
                      </Typography>

                      <TextField
                        variant="standard"
                        size="small"
                        value={slot.time}
                        onChange={(e) => setSlotTime(slotKey, e.target.value)}
                        placeholder="8am - 9am"
                        inputProps={{ style: { textAlign: "center" } }}
                        sx={{ width: 100 }}
                      />
                    </Stack>

                    <Box>
                      {(slot.options || []).map((opt, idx) => (
                        <Stack
                          key={idx}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ mb: 1 }}
                        >
                          <Tooltip title="Remove option">
                            <span>
                              <IconButton
                                size="small"
                                aria-label="Remove"
                                onClick={() => removeOption(slotKey, idx)}
                                sx={{ color: "black" }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <TextField
                            variant="standard"
                            size="small"
                            fullWidth
                            value={opt}
                            onChange={(e) => setOption(slotKey, idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                          />
                        </Stack>
                      ))}

                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => addOption(slotKey)}
                        sx={{
                          mt: 0.5,
                          ...blackOutlined,
                          borderRadius: 1.5,
                        }}
                      >
                        Add Option
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{ p: 2, flexDirection: "column", alignItems: "stretch", gap: 1 }}
      >
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button onClick={onClose} disabled={saving} sx={{ color: "black" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!canSave || saving}
            onClick={handleSave}
            sx={{ ...blackContained }}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            Save & Share
          </Button>
        </Box>
 
        <Collapse in={saving} timeout={300} unmountOnExit>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mt: 0.5, color: "text.secondary" }}
          >
            <CircularProgress size={18} />
            <Typography variant="body2">Generating link…</Typography>
          </Stack>
        </Collapse>

        {/* ✅ Link appears below with an animated reveal */}
        <Collapse in={Boolean(generatedLink)} timeout={400} unmountOnExit>
          <Paper
            elevation={0}
            sx={{
              mt: 1,
              p: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
              border: "1px solid #e0e0e0", 
              borderRadius: 1.5,
              background: "#fafafa",
            }}
          >
            <CheckCircleOutlineIcon sx={{ color: "#2e7d32" }} />
            <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
              Link ready
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={generatedLink}
              InputProps={{ readOnly: true }}
            />
            <Tooltip title="Copy link">
              <IconButton onClick={handleCopyLink} aria-label="Copy link">
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Paper>
        </Collapse>
      </DialogActions>
    </Dialog>
  );
}

