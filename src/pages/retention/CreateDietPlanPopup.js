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
  CircularProgress,
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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import StarIcon from "@mui/icons-material/Star";
import axios from "axios";

const BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

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
    monthly: p.monthly,
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

// ---------- COMPONENT ----------
export default function CreateDietPlanPopup({
  open,
  onClose,
  prefillCustomer = {},
  initialPlanType = "Weekly", // "Weekly" | "Monthly"
  onSaved, // optional callback after successful save
}) {
  const { name = "", phone = "", leadId = "" } = prefillCustomer;

  // Plan controls (UI-facing labels)
  const [planType, setPlanType] = useState(initialPlanType); // "Weekly" | "Monthly"

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

  // Load past plans for this customer
  useEffect(() => {
    if (!open || !leadId) return;
    const loadPast = async () => {
      setLoadingPast(true);
      try {
        const { data } = await axios.get(`${BASE_URL}/api/diet-plans`, {
          params: { leadId, limit: 50 },
        });
        const items = data?.items || [];
        setPastPlans(items);
      } catch {
        // silent
      } finally {
        setLoadingPast(false);
      }
    };
    loadPast();
  }, [open, leadId]);

  // Reset per plan-type switch
  useEffect(() => {
    setTemplateId("");
    setFortnight(emptyFortnight());
    setMonthly(defaultMonthlyState());
  }, [planType]);

  // Initial planType sync
  useEffect(() => {
    setPlanType(initialPlanType);
  }, [initialPlanType]);

  // Templates for current type
  const templateOptions = planType === "Weekly" ? templatesWeekly : templatesMonthly;

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

  const canSave = useMemo(() => {
    if (!leadId || saving || !templateId) return false;

    if (planType === "Weekly") {
      const any = mealsOrder.some((m) => fortnight[m].some((v) => (v || "").trim()));
      return any;
    }
    const anyMonthly = Object.values(monthly).some((slot) =>
      slot.options.some((o) => (o || "").trim())
    );
    return anyMonthly;
  }, [leadId, saving, templateId, planType, fortnight, monthly]);

  // -------- Weekly helpers --------
  const setCell = (meal, dayIdx, value) => {
    setFortnight((prev) => {
      const next = { ...prev, [meal]: [...prev[meal]] };
      next[meal][dayIdx] = value;
      return next;
    });
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
        ...(planType === "Weekly" ? { fortnight } : { monthly }),
        createdAt: new Date().toISOString(),
      },
    };
  };

  const saveToBackend = async (payload) => {
    const { data } = await axios.post(`${BASE_URL}/api/diet-plans`, payload);
    return data;
  };

  const weeklyShareText = (payload) => {
    const lines = [];
    lines.push(`Diet Plan (14-Day) — ${payload.plan.templateLabel}`);
    lines.push(`Start: ${payload.plan.startDate}`);
    lines.push("");
    for (let d = 0; d < FORTNIGHT_DAYS; d++) {
      lines.push(`Day ${d + 1}:`);
      for (const meal of mealsOrder) {
        const val = payload.plan.fortnight[meal][d] || "-";
        lines.push(`• ${meal}: ${val}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  };

  const monthlyShareText = (payload) => {
    const lines = [];
    lines.push(`Diet Plan (Monthly Options) — ${payload.plan.templateLabel}`);
    lines.push(`Start: ${payload.plan.startDate}`);
    lines.push("");
    monthlySlotOrder.forEach((slotKey) => {
      const slot = payload.plan.monthly[slotKey];
      if (!slot) return;
      const header = `${slotKey}${slot.time ? ` (${slot.time})` : ""}`;
      lines.push(header);
      (slot.options || []).forEach((opt) => lines.push(`• ${opt}`));
      lines.push("");
    });
    return lines.join("\n");
  };

  const downloadWeeklyCSV = (payload) => {
    const header = [
      "Meal",
      ...Array.from({ length: FORTNIGHT_DAYS }, (_, i) => `Day ${i + 1}`),
    ];
    const rows = [header];
    for (const meal of mealsOrder) {
      rows.push([
        meal,
        ...payload.plan.fortnight[meal].map((v) =>
          (v || "").replace(/[\n\r,]/g, " ")
        ),
      ]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fname = `${(name || "diet-plan")
      .replace(/\s+/g, "_")}-weekly14-${payload.plan.startDate}.csv`;
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadMonthlyCSV = (payload) => {
    const header = ["Slot", "Time", "Option"];
    const rows = [header];

    monthlySlotOrder.forEach((slotKey) => {
      const slot = payload.plan.monthly[slotKey];
      if (!slot) return;
      if (!slot.options || slot.options.length === 0) {
        rows.push([slotKey, slot.time || "", ""]);
      } else {
        slot.options.forEach((opt) =>
          rows.push([
            slotKey,
            slot.time || "",
            (opt || "").replace(/[\n\r,]/g, " "),
          ])
        );
      }
    });

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fname = `${(name || "diet-plan")
      .replace(/\s+/g, "_")}-monthly-${payload.plan.startDate}.csv`;
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const replicatePlanIntoEditor = (doc) => {
  if (!doc) return;
  const {
    planType: pType,
    templateId: tId,
    fortnight: f14,
    monthly: mOpt,
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
  }
};

const handleReplicateSelected = () => {
  if (!selectedPastPlan) return;
  replicatePlanIntoEditor(selectedPastPlan);
};


  const handleSave = async (mode /* "share" | "download" */) => {
    if (!canSave) return;
    const payload = makePayload();
    try {
      setSaving(true);
      const created = await saveToBackend(payload);

      if (typeof onSaved === "function") {
        try {
          await Promise.resolve(onSaved({ payload, created }));
        } catch {}
      }

      if (mode === "share") {
        const text =
          planType === "Weekly"
            ? weeklyShareText(payload)
            : monthlyShareText(payload);
        if (navigator.share) {
          try {
            await navigator.share({ text, title: "Diet Plan" });
          } catch {}
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          alert("Diet plan text copied to clipboard.");
        } else {
          alert(text);
        }
      } else if (mode === "download") {
        if (planType === "Weekly") downloadWeeklyCSV(payload);
        else downloadMonthlyCSV(payload);
      }

      setSaving(false);
      onClose?.();
    } catch (err) {
      console.error("Failed to save diet plan:", err?.response?.data || err?.message || err);
      alert(err?.response?.data?.error || "Failed to save diet plan. Please check server logs.");
      setSaving(false);
    }
  };

  const mostRecentPlan = pastPlans[0];

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
                      sx={{ fontWeight: 700, backgroundColor: "#f5f5f5", minWidth: 120 }}
                    >
                      Day {i + 1}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {mealsOrder.map((meal) => (
                  <TableRow key={meal}>
                    <TableCell sx={{ fontWeight: 600 }}>{meal}</TableCell>
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
        {/* Customer */}
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          <b>Customer:</b> {name || "—"} &nbsp; | &nbsp; <b>Phone:</b>{" "}
          {phone || "—"}
        </Typography>

        {/* Controls row: Plan Type, Template, Past Plans (to the RIGHT of template) */}
       <Stack
  direction={{ xs: "column", sm: "row" }}
  spacing={2}
  alignItems={{ xs: "stretch", sm: "center" }}
>
  {/* Plan Type */}
  <FormControl size="small" sx={{ width: 200 }}>
    <InputLabel shrink id="plan-type-label">Plan Type</InputLabel>
    <Select
      labelId="plan-type-label"
      value={planType}
      onChange={(e) => setPlanType(e.target.value)}
      label="Plan Type"
      sx={{
        "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.23)" },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
      }}
    >
      <MenuItem value="Weekly">Two Weeks (14 Days)</MenuItem>
      <MenuItem value="Monthly">Monthly (Options)</MenuItem>
    </Select>
  </FormControl>

  {/* Template */}
  <FormControl size="small" sx={{ width: 260 }} disabled={loadingTemplates || !!templatesError}>
    <InputLabel shrink id="template-label">Select Template</InputLabel>
    <Select
      labelId="template-label"
      value={templateId}
      onChange={(e) => setTemplateId(e.target.value)}
      label="Select Template"
      sx={{
        "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.23)" },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
      }}
    >
      {(planType === "Weekly" ? templatesWeekly : templatesMonthly).map((t) => (
        <MenuItem key={t._id} value={t._id}>
          {t.name} {t.category ? `— ${t.category}` : ""} {t.version ? `(v${t.version})` : ""}
        </MenuItem>
      ))}
    </Select>
    {/* Optional helper text for loading/error */}
    {loadingTemplates && <FormHelperText>Loading templates…</FormHelperText>}
    {!!templatesError && <FormHelperText error>Failed to load templates</FormHelperText>}
  </FormControl>

  {/* Past Plans (to the right of Template) */}
  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flex: 1 }}>
    <FormControl size="small" sx={{ minWidth: 260 }} disabled={loadingPast || !pastPlans.length}>
      <InputLabel shrink id="past-plans-label">See/Replicate Past Plan</InputLabel>
      <Select
        labelId="past-plans-label"
        value={selectedPastPlanId}
        onChange={(e) => setSelectedPastPlanId(e.target.value)}
        label="Select Past Plan"
        MenuProps={PastPlansMenuProps} // keeps list to ~4 visible items
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
        <FormHelperText>
          ★ No past diet plan available
        </FormHelperText>
      )}
      {loadingPast && <FormHelperText>Loading past plans…</FormHelperText>}
    </FormControl>
  </Box>
</Stack>


        {/* If a past plan is picked in the dropdown, show non-editable preview + replicate */}
        {selectedPastPlan && renderPastPlanPreview(selectedPastPlan)}

        {/* Start Date Options */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems="center"
        >
          <RadioGroup
            row
            value={startMode}
            onChange={(e) => setStartMode(e.target.value)}
          >
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

          {/* Live date range for current (unsaved) plan */}
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
                          backgroundColor:
                            rIdx % 2 ? "rgba(0,0,0,0.015)" : "#fff",
                        }}
                      >
                        {meal}
                      </TableCell>
                      {Array.from({ length: FORTNIGHT_DAYS }, (_, i) => (
                        <TableCell key={i} align="center" sx={{ minWidth: 220 }}>
                          <TextField
                            size="small"
                            fullWidth
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
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, opacity: 0.75, px: 1 }}
              >
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
                      borderColor: "rgba(0,0,0,0.10)",
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{ minWidth: 80 }}
                      >
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

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: "black" }}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          disabled={!canSave}
          onClick={() => handleSave("share")}
          sx={{ ...blackOutlined }}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? "Saving..." : "Save & Share"}
        </Button>
        <Button
          variant="contained"
          disabled={!canSave}
          onClick={() => handleSave("download")}
          sx={{ ...blackContained }}
        >
          Save & Download
        </Button>
      </DialogActions>
    </Dialog>
  );
}
