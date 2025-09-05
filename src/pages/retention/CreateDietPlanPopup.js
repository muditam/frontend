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
  InputAdornment,
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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";

const BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

// ---------- HELPERS ----------
const mealsOrder = ["Breakfast", "Lunch", "Snacks", "Dinner"];
const FORTNIGHT_DAYS = 14;

const emptyFortnight = () =>
  mealsOrder.reduce((acc, meal) => {
    acc[meal] = Array(FORTNIGHT_DAYS).fill("");
    return acc;
  }, {});

function toISO(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

const deepClone = (o) => JSON.parse(JSON.stringify(o));

// ---------- WEEKLY (14-day) TEMPLATES ----------
const WEEKLY_TEMPLATES = [
  {
    id: "weekly14_diabetes_veg",
    label: "Diabetes Control (Veg) — 14 days",
    fortnight: (() => {
      // seed from a 7-day base and repeat once to make 14
      const base = {
        Breakfast: [
          "Moong chilla + mint chutney",
          "Oats upma + buttermilk",
          "Besan cheela + salad",
          "Sprouts bowl + tomato",
          "Ragi dosa + sambar",
          "Poha + peanuts",
          "Vegetable dalia",
        ],
        Lunch: [
          "2 phulkas + dal + sabzi + salad",
          "Brown rice + rajma + salad",
          "2 phulkas + chana + salad",
          "Millet khichdi + curd",
          "2 phulkas + mix veg + dal",
          "Brown rice + sambar + curd",
          "2 phulkas + soya bhurji",
        ],
        Snacks: [
          "Roasted chana",
          "Fruit (low GI)",
          "Buttermilk",
          "Coconut water",
          "Peanuts handful",
          "Sprout chaat",
          "Yogurt (plain)",
        ],
        Dinner: [
          "Vegetable soup + paneer",
          "Quinoa khichdi + curd",
          "2 phulkas + dal + sabzi",
          "Millet upma + salad",
          "Veg stir fry + tofu",
          "Dal soup + sautéed veg",
          "Moong khichdi + curd",
        ],
      };
      const fortnight = {};
      for (const meal of mealsOrder) {
        fortnight[meal] = [...base[meal], ...base[meal]]; // 14 entries
      }
      return fortnight;
    })(),
  },
  {
    id: "weekly14_weightloss_veg",
    label: "Weight Loss (Veg) — 14 days",
    fortnight: (() => {
      const base = {
        Breakfast: [
          "Greek yogurt + seeds",
          "Paneer bhurji wraps (multigrain)",
          "Upma + veggies",
          "Green smoothie",
          "Poha (less oil) + peanuts",
          "Oats porridge + nuts",
          "Moong chilla + salsa",
        ],
        Lunch: [
          "2 phulkas + dal + sabzi",
          "Buddha bowl (millet+beans+veg)",
          "Rice (small) + sambar + salad",
          "Grilled paneer + veggie salad",
          "2 phulkas + methi dal",
          "Brown rice + chole + salad",
          "2 phulkas + lauki chana",
        ],
        Snacks: [
          "Roasted foxnuts",
          "Apple + peanut butter",
          "Buttermilk",
          "Boiled chana",
          "Cucumber sticks + hummus",
          "1 fruit",
          "Nuts mix (small)",
        ],
        Dinner: [
          "Soup + salad",
          "Paneer tikka + salad",
          "Khichdi + curd",
          "Quinoa pulao + raita",
          "Tofu stir fry",
          "Dal + sautéed veg",
          "Veg clear soup + salad",
        ],
      };
      const fortnight = {};
      for (const meal of mealsOrder) {
        fortnight[meal] = [...base[meal], ...base[meal]];
      }
      return fortnight;
    })(),
  },
];

// ---------- MONTHLY (Options-style) TEMPLATES ----------
// Matches the structure in your image: per-slot time + editable options (pick any one).
// Feel free to add more templates here.
const MONTHLY_TEMPLATES = [
  {
    id: "monthly_diabetes_options_veg",
    label: "Monthly — Options (Veg, Diabetes-friendly)",
    slots: {
      Breakfast: {
        title: "Breakfast Options (Select any one)",
        time: "8am-9am",
        options: [
          "2 egg white omelette with vegetables + 1 cup sugar-free tea",
          "1 Katori suji oats upma + 1 cup sugar-free tea",
          "1 brown bread toast + 2 egg white bhurji + 1 cup sugar-free tea",
          "1–2 Besan chilla + 1 cup sugar-free tea",
          "1 Katori vegetable dalia + curd",
          "1–2 Ghiya stuffed chapati + curd",
          "1 Katori green moong sprouts salad + tea",
        ],
      },
      "Mid-Morning Snack": {
        title: "Mid-Morning Snack Options",
        time: "10:30am-11:30am",
        options: ["1 Fruit (apple, guava, orange, papaya, pear) + 5 soaked almonds"],
      },
      Lunch: {
        title: "Lunch Options (Select any one)",
        time: "1pm-2pm",
        options: [
          "1–2 Oats chapati + 1 katori veg + salad + curd",
          "1–2 Oats chapati + 1 katori dal + salad + curd",
          "1 Bowl veg dalia + salad + curd",
          "2 Oats cheela with veggies + curd + salad",
          "1 Bowl steamed kidney bean salad with veggies",
          "1 Paneer stuffed ragi dosa with sambhar + salad",
          "1–2 Vegetable brown bread sandwich + mint dip + salad",
        ],
      },
      "Evening Snack": {
        title: "Evening Snack Options (Select any one)",
        time: "4pm-5pm",
        options: [
          "1 cup green tea + 1 katori roasted chana",
          "1 cup green tea + 1 katori roasted makhana",
          "1 glass buttermilk + 1–2 spoon puffed rice",
          "1 glass buttermilk + 1 veg brown bread sandwich",
        ],
      },
      Dinner: {
        title: "Dinner Options (Select any one)",
        time: "7pm-8pm",
        options: [
          "1 Oats chapati + 1 katori veg + salad + curd",
          "1–2 Moong dal cheela with scrambled low fat paneer",
          "1 Bowl veg dalia + salad + curd",
          "1–2 Oats cheela + curd + salad",
          "1 Bowl three bean salad",
          "2 egg white omelette with vegetables + salad",
          "1 Bowl quinoa salad with veggies",
        ],
      },
    },
  },
];

const defaultMonthlyState = () => ({
  Breakfast: { title: "Breakfast Options (Select any one)", time: "8am-9am", options: [] },
  "Mid-Morning Snack": { title: "Mid-Morning Snack Options", time: "10:30am-11:30am", options: [] },
  Lunch: { title: "Lunch Options (Select any one)", time: "1pm-2pm", options: [] },
  "Evening Snack": { title: "Evening Snack Options (Select any one)", time: "4pm-5pm", options: [] },
  Dinner: { title: "Dinner Options (Select any one)", time: "7pm-8pm", options: [] },
});

// ---------- COMPONENT ----------
export default function CreateDietPlanPopup({
  open,
  onClose,
  prefillCustomer = {},
  initialPlanType = "Weekly", // "Weekly" | "Monthly"
  onSaved,
}) {
  const { name = "", phone = "", leadId = "" } = prefillCustomer;

  // Plan controls
  const [planType, setPlanType] = useState(initialPlanType);
  const [templateId, setTemplateId] = useState("");

  // Start date controls
  const [startMode, setStartMode] = useState("Today"); // Today | Tomorrow | Custom
  const [customStartDate, setCustomStartDate] = useState("");

  // Weekly (14 days) state
  const [fortnight, setFortnight] = useState(emptyFortnight());

  // Monthly (options) state
  const [monthly, setMonthly] = useState(defaultMonthlyState());

  const [saving, setSaving] = useState(false);

  // Sync initial plan type from parent menu open
  useEffect(() => {
    setPlanType(initialPlanType);
    setTemplateId("");
    setFortnight(emptyFortnight());
    setMonthly(defaultMonthlyState());
  }, [initialPlanType]);

  const templates = planType === "Weekly" ? WEEKLY_TEMPLATES : MONTHLY_TEMPLATES;

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId]
  );

  // Apply template
  useEffect(() => {
    if (!selectedTemplate) return;
    if (planType === "Weekly") {
      setFortnight(deepClone(selectedTemplate.fortnight));
    } else {
      setMonthly(deepClone(selectedTemplate.slots));
    }
  }, [selectedTemplate, planType]);

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
    // monthly: any option present
    const anyMonthly = Object.values(monthly).some((slot) => slot.options.some((o) => (o || "").trim()));
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

  // -------- Monthly helpers --------
  const setSlotField = (slotKey, field, value) => {
    setMonthly((prev) => ({
      ...prev,
      [slotKey]: { ...prev[slotKey], [field]: value },
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
    if (planType === "Weekly") {
      return {
        customer: { name, phone, leadId },
        plan: {
          planType,
          templateId,
          templateLabel: selectedTemplate?.label || "",
          startDate, // YYYY-MM-DD
          durationDays, // 14
          fortnight, // 14-day grid
          createdAt: new Date().toISOString(),
        },
      };
    }
    return {
      customer: { name, phone, leadId },
      plan: {
        planType,
        templateId,
        templateLabel: selectedTemplate?.label || "",
        startDate, // YYYY-MM-DD
        durationDays, // 30
        monthly, // options-format
        createdAt: new Date().toISOString(),
      },
    };
  };

  const saveToBackend = async (payload) => {
    if (!leadId) throw new Error("Missing leadId for saving diet plan.");
    await axios.post(`${BASE_URL}/api/leads/${leadId}/diet-plan`, payload);
  };

  // Text share formats
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
    const order = ["Breakfast", "Mid-Morning Snack", "Lunch", "Evening Snack", "Dinner"];
    order.forEach((slotKey) => {
      const slot = payload.plan.monthly[slotKey];
      if (!slot) return;
      lines.push(`${slot.title} ${slot.time ? `(${slot.time})` : ""}`);
      (slot.options || []).forEach((opt) => lines.push(`• ${opt}`));
      lines.push("");
    });
    return lines.join("\n");
  };

  // CSV downloads
  const downloadWeeklyCSV = (payload) => {
    const header = ["Meal", ...Array.from({ length: FORTNIGHT_DAYS }, (_, i) => `Day ${i + 1}`)];
    const rows = [header];
    for (const meal of mealsOrder) {
      rows.push([meal, ...payload.plan.fortnight[meal].map((v) => (v || "").replace(/[\n\r,]/g, " "))]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fname = `${(name || "diet-plan").replace(/\s+/g, "_")}-weekly14-${payload.plan.startDate}.csv`;
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
    const order = ["Breakfast", "Mid-Morning Snack", "Lunch", "Evening Snack", "Dinner"];
    order.forEach((slotKey) => {
      const slot = payload.plan.monthly[slotKey];
      if (!slot) return;
      if (!slot.options || slot.options.length === 0) {
        rows.push([slot.title, slot.time || "", ""]);
      } else {
        slot.options.forEach((opt) => rows.push([slot.title, slot.time || "", (opt || "").replace(/[\n\r,]/g, " ")]));
      }
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fname = `${(name || "diet-plan").replace(/\s+/g, "_")}-monthly-${payload.plan.startDate}.csv`;
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = async (mode /* "share" | "download" */) => {
    if (!canSave) return;
    const payload = makePayload();
    try {
      setSaving(true);
      if (typeof onSaved === "function") {
        await Promise.resolve(onSaved(payload));
      } else {
        await saveToBackend(payload);
      }

      if (mode === "share") {
        const text = planType === "Weekly" ? weeklyShareText(payload) : monthlyShareText(payload);
        if (navigator.share) {
          try {
            await navigator.share({ text, title: "Diet Plan" });
          } catch {
            /* user cancelled share */
          }
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

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, textAlign: "center" }}>
        Create Diet Plan
      </DialogTitle>

      <DialogContent dividers>
        {/* Top Controls */}
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            <b>Customer:</b> {name || "—"} &nbsp; | &nbsp; <b>Phone:</b> {phone || "—"}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            {/* Plan Type */}
            <Select
              fullWidth
              size="small"
              value={planType}
              onChange={(e) => {
                setPlanType(e.target.value);
                setTemplateId("");
                setFortnight(emptyFortnight());
                setMonthly(defaultMonthlyState());
              }}
            >
              <MenuItem value="Weekly">Weekly (14 Days)</MenuItem>
              <MenuItem value="Monthly">Monthly (Options)</MenuItem>
            </Select>

            {/* Template */}
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <MenuItem value="" disabled>
                Select a {planType === "Weekly" ? "Weekly (14D)" : "Monthly (Options)"} Template
              </MenuItem>
              {templates.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </Stack>

          {/* Start Date Options */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
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
          </Stack>
        </Stack>

        {/* BODY */}
        {planType === "Weekly" ? (
          <>
            {/* 14-day Editable Table */}
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>Meal</TableCell>
                    {Array.from({ length: FORTNIGHT_DAYS }, (_, i) => (
                      <TableCell key={i} align="center" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        Day {i + 1}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mealsOrder.map((meal) => (
                    <TableRow key={meal}>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{meal}</TableCell>
                      {Array.from({ length: FORTNIGHT_DAYS }, (_, i) => (
                        <TableCell key={i} align="center">
                          <TextField
                            size="small"
                            fullWidth
                            value={fortnight[meal][i]}
                            onChange={(e) => setCell(meal, i, e.target.value)}
                            placeholder={`Enter ${meal.toLowerCase()}`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {/* Optional metrics */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Calorie Target"
                size="small"
                fullWidth
                InputProps={{ endAdornment: <InputAdornment position="end">kcal</InputAdornment> }}
              />
              <TextField
                label="Water Intake"
                size="small"
                fullWidth
                InputProps={{ endAdornment: <InputAdornment position="end">L/day</InputAdornment> }}
              />
              <TextField
                label="Sleep Target"
                size="small"
                fullWidth
                InputProps={{ endAdornment: <InputAdornment position="end">hrs</InputAdornment> }}
              />
            </Stack>
          </>
        ) : (
          <>
            {/* MONTHLY: Options-format, fully editable */}
            <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.75 }}>
              Monthly plan uses editable option lists per slot. Patients can “select any one” at each time.
            </Typography>

            {["Breakfast", "Mid-Morning Snack", "Lunch", "Evening Snack", "Dinner"].map((slotKey) => {
              const slot = monthly[slotKey];
              return (
                <Paper key={slotKey} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
                    <TextField
                      size="small"
                      fullWidth
                      label={`${slotKey} Title`}
                      value={slot.title}
                      onChange={(e) => setSlotField(slotKey, "title", e.target.value)}
                    />
                    <TextField
                      size="small"
                      label="Time"
                      value={slot.time}
                      onChange={(e) => setSlotField(slotKey, "time", e.target.value)}
                      sx={{ minWidth: 180 }}
                    />
                  </Stack>

                  <Box sx={{ mt: 1 }}>
                    {slot.options.map((opt, idx) => (
                      <Stack
                        key={idx}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <TextField
                          size="small"
                          fullWidth
                          value={opt}
                          onChange={(e) => setOption(slotKey, idx, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                        />
                        <IconButton
                          size="small"
                          aria-label="Remove"
                          onClick={() => removeOption(slotKey, idx)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => addOption(slotKey)}
                      sx={{ mt: 0.5, borderColor: "black", color: "black" }}
                    >
                      Add Option
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving} sx={{ color: "black" }}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          disabled={!canSave}
          onClick={() => handleSave("share")}
          sx={{ borderColor: "black", color: "black" }}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? "Saving..." : "Save & Share"}
        </Button>
        <Button
          variant="contained"
          disabled={!canSave}
          onClick={() => handleSave("download")}
          sx={{ backgroundColor: "black", "&:hover": { backgroundColor: "#222" } }}
        >
          Save & Download
        </Button>
      </DialogActions>
    </Dialog>
  );
}
