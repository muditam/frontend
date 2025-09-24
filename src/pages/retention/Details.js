import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Typography, 
  IconButton,
  Chip,
  Divider,
  Collapse, 
  Tooltip,
  Snackbar,
  Alert, 
  CircularProgress, 
  Stack,
  InputAdornment,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  KeyboardDoubleArrowDown,
  KeyboardDoubleArrowUp,
  FavoriteRounded,
  ScienceRounded,
  LocalHotelRounded,
  MedicationRounded,
  PsychologyRounded,
  HealthAndSafetyRounded,
  HistoryToggleOffRounded,
} from "@mui/icons-material";
import axios from "axios";

/** ---------- CONFIG & HELPERS ---------- */

const API_BASE =
  "https://muditamleads-14f32a10d7f7.herokuapp.com/api/details";

const initialFormState = {
  age: "",
  height: "",        // stored as CM in DB
  hba1c: "",
  lastTestDone: "",
  fastingSugar: "",
  ppSugar: "",
  durationOfDiabetes: "",
  gender: "",
  dietType: "",
  weight: "",
  sittingTime: "",
  exerciseRoutine: "",
  outsideMeals: "",
  timeOfSleep: "",
  currentMedications: [],
  sideEffects: "",
  suddenSugarFluctuations: "",
  familyHistory: "",
  monitorBloodSugar: "",
  sugarCravings: "",
  symptoms: [],
  otherConditions: [],
  stressLevel: "",
  painInLiver: "",
  gutIssues: "",
  energyLevels: "",
  sleepQuality: "",
};

const formatTime = (d = new Date()) =>
  d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const toNumber = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));

const computeBMI = (heightCm, weightKg) => {
  const h = toNumber(heightCm);
  const w = toNumber(weightKg);
  if (!h || !w || h <= 0) return null;
  const m = h / 100;
  return +(w / (m * m)).toFixed(1);
};

const badgeColorByHba1c = (val) => {
  const n = Number(val);
  if (!n && n !== 0) return "default";
  if (n < 5.7) return "success";
  if (n < 6.5) return "warning";
  return "error";
};

/** ----- Height parsing utilities (ft/in -> cm) ----- */

const feetInchesToCm = (ft = 0, inch = 0) =>
  +(ft * 30.48 + inch * 2.54).toFixed(1);

/**
 * Accepts:
 *  - 5'8", 5'8, 5 ' 8
 *  - 5-8, 5 8
 *  - 5.8  (dot treated as INCH separator if right part is 0..11; else decimal feet)
 *  - 5.67 ft (decimal feet)
 * Returns CM (number) or "" if invalid.
 */
const parseFeetHeightToCm = (raw) => {
  if (raw == null) return "";

  let s = String(raw).trim().toLowerCase();

  // Normalize words to symbols
  s = s
    .replace(/\"|inches?|in\b/g, '"')
    .replace(/feet?|ft\b/g, "'")
    .replace(/\s+/g, " ");

  // 1) 5'8" / 5'8
  const m1 = s.match(/^(\d+(?:\.\d+)?)[\'’]\s*(\d+(?:\.\d+)?)?/);
  if (m1) {
    const ft = parseFloat(m1[1]) || 0;
    const inch = parseFloat(m1[2]) || 0;
    return feetInchesToCm(ft, inch);
  }

  // 2) 5-8 or 5 8
  const m2 = s.match(/^(\d+(?:\.\d+)?)\s*[- ]\s*(\d+(?:\.\d+)?)/);
  if (m2) {
    const ft = parseFloat(m2[1]) || 0;
    const inch = parseFloat(m2[2]) || 0;
    return feetInchesToCm(ft, inch);
  }

  // 3) 5.8  -> interpret dot as inches if RHS 0..11
  const m3 = s.match(/^(\d+)\.(\d+)$/);
  if (m3) {
    const ft = parseInt(m3[1], 10);
    const rhs = m3[2];
    const asInches = parseInt(rhs, 10);
    if (!Number.isNaN(asInches) && asInches >= 0 && asInches <= 11) {
      return feetInchesToCm(ft, asInches);
    }
    // decimal feet
    const decFeet = parseFloat(s);
    return Number.isFinite(decFeet) ? +(decFeet * 30.48).toFixed(1) : "";
  }

  // 4) plain decimal -> decimal feet
  const dec = parseFloat(s);
  if (Number.isFinite(dec)) return +(dec * 30.48).toFixed(1);

  return "";
};

/** ---------- SECTION WRAPPER ---------- */
const SectionCard = ({ icon, title, children }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(250,250,255,0.94) 100%)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        {icon}
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Paper>
  );
};

/** ---------- MAIN COMPONENT ---------- */
const Details = ({ contactNumber, onDetailsUpdate }) => {
  const [open, setOpen] = useState(false); // collapsed by default
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormState);

  // height: ft mode + visible input for ft field
  const [heightInFeetMode, setHeightInFeetMode] = useState(false);
  const [heightFeetInput, setHeightFeetInput] = useState(""); // e.g., "5'8" or "5.8"

  const [saveState, setSaveState] = useState("idle"); // 'idle' | 'saving' | 'saved' | 'error'
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const debounceRef = useRef(null);

  const bmi = useMemo(
    () => computeBMI(formData.height, formData.weight),
    [formData.height, formData.weight]
  );

  /** ------- COMPLETION % ------- */
  const completionPercent = useMemo(() => {
    const keys = Object.keys(initialFormState);
    const isFilled = (val) => {
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === "number") return !Number.isNaN(val);
      if (typeof val === "string") return val.trim() !== "";
      if (val && typeof val === "object") return Object.keys(val).length > 0;
      return !!val;
    };
    const filled = keys.reduce((acc, k) => acc + (isFilled(formData[k]) ? 1 : 0), 0);
    return Math.round((filled / keys.length) * 100);
  }, [formData]);

  /** ------- LOAD DETAILS ------- */
  useEffect(() => {
    if (!contactNumber) {
      setFormData(initialFormState);
      setOpen(false); // <-- keep collapsed when no contact
      return;
    }
    setLoading(true);
    setFormData(initialFormState);
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/get-details/${contactNumber}`);
        if (data?.details) {
          setFormData({ ...initialFormState, ...data.details });
          // prefill ft display from cm if available
          const cm = Number(data.details.height);
          if (cm) {
            const totalIn = cm / 2.54;
            const ft = Math.floor(totalIn / 12);
            const inch = Math.round(totalIn - ft * 12);
            setHeightFeetInput(`${ft}'${inch}`);
          } else {
            setHeightFeetInput("");
          }
        } else {
          setFormData(initialFormState);
          setHeightFeetInput("");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setSnack({ open: true, message: "Could not load previous history.", severity: "warning" });
        setFormData(initialFormState);
      } finally {
        setLoading(false);
      }
    })();
  }, [contactNumber]);

  /** ------- SAVE (DEBOUNCED) ------- */
  const saveNow = async (payload) => {
    if (!contactNumber) return;
    try {
      setSaveState("saving");
      await axios.post(`${API_BASE}/save-details`, {
        contactNumber,
        details: payload,
      });
      setSaveState("saved");
      setLastSavedAt(formatTime(new Date()));
      if (typeof onDetailsUpdate === "function") {
        onDetailsUpdate(contactNumber, payload);
      }
    } catch (err) {
      console.error("Auto-save failed:", err);
      setSaveState("error");
      setSnack({ open: true, message: "Auto-save failed. Check connection.", severity: "error" });
    }
  };

  const autoSave = (updatedData) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNow(updatedData), 600);
  };

  /** ------- HANDLERS ------- */
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Special handling for height when in ft mode
    if (name === "height" && heightInFeetMode) {
      setHeightFeetInput(value);
      const cm = parseFeetHeightToCm(value);
      const updated = { ...formData, height: cm || "" };
      setFormData(updated);
      autoSave(updated);
      return;
    }

    const updated = { ...formData, [name]: value };
    setFormData(updated);
    autoSave(updated);
  };

  const handleMultiSelectChange = (name, value) => {
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    autoSave(updated);
  };

  /** ------- HEADER BAR UI (click-anywhere to expand/collapse) ------- */
  const HeaderBar = () => (
    <Box
      onClick={() => setOpen((v) => !v)}
      sx={{
        position: "relative",
        borderRadius: 3,
        overflow: "hidden",
        background: "linear-gradient(90deg, #0f172a 0%, #1e293b 45%, #334155 100%)",
        color: "white",
        px: { xs: 2, sm: 3 },
        py: 2,
        boxShadow: "0 8px 24px rgba(14,165,233,0.25)",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
        {/* Title + Summary chips */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
          sx={{ flex: 1, mx: 1 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <HealthAndSafetyRounded fontSize="small" />
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: 0.2 }}>
              History
            </Typography>
          </Stack>

          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Chip
              size="small"
              icon={<HistoryToggleOffRounded />}
              label={`Age: ${formData.age || "—"}`}
              sx={{ color: "white", bgcolor: "rgba(255,255,255,0.16)" }}
            />
            <Chip
              size="small"
              icon={<ScienceRounded />}
              label={`HbA1c: ${formData.hba1c || "—"}%`}
              color={badgeColorByHba1c(formData.hba1c)}
              variant={formData.hba1c ? "filled" : "outlined"}
              sx={{ color: "white", bgcolor: formData.hba1c ? undefined : "rgba(255,255,255,0.16)" }}
            />
          </Stack>
        </Stack>

        {/* Save State + Completion + Toggle Arrow */}
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {saveState === "saving" && (
              <>
                <CircularProgress size={16} sx={{ color: "white" }} />
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Saving…
                </Typography>
              </>
            )}
            {saveState === "saved" && (
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Saved • {lastSavedAt}
              </Typography>
            )}
            {saveState === "error" && (
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Save error
              </Typography>
            )}
          </Stack>

          {/* COMPLETION % chip — sits to the LEFT of the arrow */}
          <Tooltip title="Profile completion">
            <Chip
              size="small"
              label={`${completionPercent}%`}
              sx={{
                color: "white",
                bgcolor: "rgba(255,255,255,0.18)",
                fontWeight: 700,
              }}
            />
          </Tooltip>

          {/* Stop click bubbling so header doesn't toggle twice */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            sx={{
              color: "white",
              bgcolor: "rgba(255,255,255,0.18)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.26)" },
            }}
            aria-label={open ? "Collapse details" : "Expand details"}
          >
            {open ? <KeyboardDoubleArrowUp /> : <KeyboardDoubleArrowDown />}
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );

  const DisabledOverlay = () =>
    !contactNumber ? (
      <Paper
        variant="outlined"
        sx={{
          mt: 2,
          p: 4,
          borderRadius: 3,
          textAlign: "center",
          color: "text.secondary",
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Select a contact to view History
        </Typography>
        <Typography variant="body2">
          Once you choose a lead/contact, this panel will unlock and auto-save as you type.
        </Typography>
      </Paper>
    ) : null;

  if (!contactNumber) {
    return (
      <Box>
        <HeaderBar />
        <DisabledOverlay />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <HeaderBar />

      <Collapse in={open} timeout={300} unmountOnExit>
        <Box sx={{ mt: 2, display: "grid", gap: 2 }}>
          {/* Loading shimmer */}
          {loading ? (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <CircularProgress size={20} />
                <Typography variant="body2">Loading previous history…</Typography>
              </Stack>
            </Paper>
          ) : (
            <>
              {/* Vitals & Labs */}
              <SectionCard icon={<FavoriteRounded color="error" />} title="Vitals & Labs">
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3} md={2.2}>
                    <TextField
                      name="age"
                      label="Age"
                      type="number"
                      size="small"
                      fullWidth
                      value={formData.age}
                      onChange={handleChange}
                      inputProps={{ min: 0, max: 120, inputMode: "numeric", pattern: "[0-9]*" }}
                    />
                  </Grid>

                  {/* HEIGHT with ft/in toggle */}
                  <Grid item xs={6} sm={3} md={3}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                      <Box sx={{ flex: 1, width: "100%" }}>
                        {heightInFeetMode ? (
                          <TextField
                            name="height"
                            label="Height (ft′in″)"
                            placeholder={`e.g. 5'8  or  5-8  or  5.8`}
                            size="small"
                            fullWidth
                            value={heightFeetInput}
                            onChange={handleChange}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">ft/in</InputAdornment>
                              ),
                            }}
                            helperText="Use 5'8, 5-8, 5 8, or 5.8 (dot = inches)"
                          />
                        ) : (
                          <TextField
                            name="height"
                            label="Height (cm)"
                            type="number"
                            size="small"
                            fullWidth
                            value={formData.height}
                            onChange={handleChange}
                            InputProps={{
                              inputProps: { inputMode: "numeric", pattern: "[0-9]*" },
                              endAdornment: <InputAdornment position="end">cm</InputAdornment>,
                            }}
                          />
                        )}
                      </Box>

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={heightInFeetMode}
                            onChange={(e) => {
                              const next = e.target.checked;
                              setHeightInFeetMode(next);
                              if (next) {
                                // go to ft display – prefill from cm
                                const cm = Number(formData.height);
                                if (cm) {
                                  const totalIn = cm / 2.54;
                                  const ft = Math.floor(totalIn / 12);
                                  const inch = Math.round(totalIn - ft * 12);
                                  setHeightFeetInput(`${ft}'${inch}`);
                                } else {
                                  setHeightFeetInput("");
                                }
                              }
                            }}
                            size="small"
                          />
                        }
                        label="ft/in"
                        sx={{ ml: 0.5, mt: { xs: 0, sm: 0.2 } }}
                      />
                    </Stack>
                  </Grid>

                  <Grid item xs={6} sm={3} md={2.2}>
                    <TextField
                      name="weight"
                      label="Weight"
                      type="number"
                      size="small"
                      fullWidth
                      value={formData.weight}
                      onChange={handleChange}
                      InputProps={{
                        inputProps: { inputMode: "numeric", pattern: "[0-9]*" },
                        endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                      }}
                    />
                  </Grid>

                  <Grid item xs={6} sm={3} md={2.2}>
                    <Tooltip title="Calculated from height & weight">
                      <TextField
                        label="BMI"
                        size="small"
                        fullWidth
                        value={bmi ?? ""}
                        InputProps={{ readOnly: true }}
                        placeholder="—"
                      />
                    </Tooltip>
                  </Grid>

                  <Grid item xs={6} sm={3} md={2.2}>
                    <TextField
                      name="hba1c"
                      label="HbA1c"
                      type="number"
                      size="small"
                      fullWidth
                      value={formData.hba1c}
                      onChange={handleChange}
                      InputProps={{
                        inputProps: { step: "0.1", min: 0, max: 25 },
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Last Test</InputLabel>
                      <Select
                        name="lastTestDone"
                        value={formData.lastTestDone}
                        label="Last Test"
                        onChange={handleChange}
                      >
                        {[
                          "Within the last month",
                          "Within the last 3 months",
                          "Within the last 6 months",
                          "Within the last year",
                          "More than a year ago",
                          "Never",
                        ].map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6} sm={3} md={2.2}>
                    <TextField
                      name="fastingSugar"
                      label="Fasting Sugar"
                      type="number"
                      size="small"
                      fullWidth
                      value={formData.fastingSugar}
                      onChange={handleChange}
                      InputProps={{
                        inputProps: { inputMode: "numeric", pattern: "[0-9]*" },
                        endAdornment: <InputAdornment position="end">mg/dL</InputAdornment>,
                      }}
                    />
                  </Grid>

                  <Grid item xs={6} sm={3} md={2.2}>
                    <TextField
                      name="ppSugar"
                      label="PP Sugar"
                      type="number"
                      size="small"
                      fullWidth
                      value={formData.ppSugar}
                      onChange={handleChange}
                      InputProps={{
                        inputProps: { inputMode: "numeric", pattern: "[0-9]*" },
                        endAdornment: <InputAdornment position="end">mg/dL</InputAdornment>,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Duration</InputLabel>
                      <Select
                        name="durationOfDiabetes"
                        value={formData.durationOfDiabetes}
                        label="Duration"
                        onChange={handleChange}
                      >
                        {[
                          "Less than 1 year",
                          "1-3 years",
                          "4-5 years",
                          "6-10 years",
                          "More than 10 years",
                        ].map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </SectionCard>

              {/* Lifestyle */}
              <SectionCard icon={<LocalHotelRounded color="primary" />} title="Lifestyle">
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Gender</InputLabel>
                      <Select
                        name="gender"
                        value={formData.gender}
                        label="Gender"
                        onChange={handleChange}
                      >
                        {["Male", "Female", "Other"].map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6} sm={4} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Diet Type</InputLabel>
                      <Select
                        name="dietType"
                        value={formData.dietType}
                        label="Diet Type"
                        onChange={handleChange}
                      >
                        {["Vegetarian", "Non-vegetarian", "Vegan"].map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Sitting Time</InputLabel>
                      <Select
                        name="sittingTime"
                        value={formData.sittingTime}
                        label="Sitting Time"
                        onChange={handleChange}
                      >
                        {[
                          "Less than 1 hour",
                          "1-2 hours",
                          "3-4 hours",
                          "5-6 hours",
                          "7-8 hours",
                          "9-10 hours",
                          "More than 10 hours",
                        ].map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Exercise</InputLabel>
                      <Select
                        name="exerciseRoutine"
                        value={formData.exerciseRoutine}
                        label="Exercise"
                        onChange={handleChange}
                      >
                        {["Daily", "4-5 times a week", "2-3 times a week", "Once a week", "Rarely", "Never"].map(
                          (option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          )
                        )}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Outside Meals</InputLabel>
                      <Select
                        name="outsideMeals"
                        value={formData.outsideMeals}
                        label="Outside Meals"
                        onChange={handleChange}
                      >
                        {["Daily", "4-5 times a week", "2-3 times a week", "Once a week", "Rarely", "Never"].map(
                          (option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          )
                        )}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Time of Sleep</InputLabel>
                      <Select
                        name="timeOfSleep"
                        value={formData.timeOfSleep}
                        label="Time of Sleep"
                        onChange={handleChange}
                      >
                        {[
                          "6-7 hours",
                          "7-8 hours",
                          "8-9 hours",
                          "9-10 hours",
                          "More than 10 hours",
                          "Less than 6 hours",
                        ].map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Energy Levels</InputLabel>
                      <Select
                        name="energyLevels"
                        value={formData.energyLevels}
                        label="Energy Levels"
                        onChange={handleChange}
                      >
                        {["Low", "Medium", "High"].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Sleep Quality</InputLabel>
                      <Select
                        name="sleepQuality"
                        value={formData.sleepQuality}
                        label="Sleep Quality"
                        onChange={handleChange}
                      >
                        {["Poor", "Average", "Good"].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </SectionCard>

              {/* Medications & Effects */}
              <SectionCard icon={<MedicationRounded color="secondary" />} title="Medications & Effects">
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={[
                        "Metformin",
                        "Glimepiride",
                        "Glipizide",
                        "Sitagliptin",
                        "Liraglutide",
                        "Pioglitazone",
                        "Canagliflozin",
                        "Empagliflozin",
                        "Dapagliflozin",
                        "Exenatide",
                      ]}
                      value={formData.currentMedications || []}
                      onChange={(_, newValue) =>
                        handleMultiSelectChange("currentMedications", newValue)
                      }
                      renderInput={(params) => (
                        <TextField {...params} label="Current Medications" size="small" />
                      )}
                      limitTags={3}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Side Effects</InputLabel>
                      <Select
                        name="sideEffects"
                        value={formData.sideEffects}
                        label="Side Effects"
                        onChange={handleChange}
                      >
                        {["Nausea", "Weight gain", "None"].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Sudden Sugar Fluctuations</InputLabel>
                      <Select
                        name="suddenSugarFluctuations"
                        value={formData.suddenSugarFluctuations}
                        label="Sudden Sugar Fluctuations"
                        onChange={handleChange}
                      >
                        {["Yes", "No"].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Family History</InputLabel>
                      <Select
                        name="familyHistory"
                        value={formData.familyHistory}
                        label="Family History"
                        onChange={handleChange}
                      >
                        {["Yes", "No"].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Monitor Blood Sugar</InputLabel>
                      <Select
                        name="monitorBloodSugar"
                        value={formData.monitorBloodSugar}
                        label="Monitor Blood Sugar"
                        onChange={handleChange}
                      >
                        {["Daily", "Weekly", "Rarely", "Never"].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Sugar Cravings</InputLabel>
                      <Select
                        name="sugarCravings"
                        value={formData.sugarCravings}
                        label="Sugar Cravings"
                        onChange={handleChange}
                      >
                        {["Often", "Sometimes", "Never"].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Stress Level</InputLabel>
                      <Select
                        name="stressLevel"
                        value={formData.stressLevel}
                        label="Stress Level"
                        onChange={handleChange}
                      >
                        {["Low", "Moderate", "High"].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Pain in Liver</InputLabel>
                      <Select
                        name="painInLiver"
                        value={formData.painInLiver}
                        label="Pain in Liver"
                        onChange={handleChange}
                      >
                        {["Yes", "No"].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </SectionCard>

              {/* Symptoms & Conditions */}
              <SectionCard icon={<PsychologyRounded color="info" />} title="Symptoms & Conditions">
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={[
                        "Frequent urination",
                        "Increased thirst",
                        "Increased hunger",
                        "Fatigue",
                        "Blurred vision",
                        "Slow-healing wounds",
                        "Unexplained weight loss",
                        "Numbness or tingling",
                        "Frequent infections",
                        "Darkened skin",
                      ]}
                      value={formData.symptoms || []}
                      onChange={(_, newValue) => handleMultiSelectChange("symptoms", newValue)}
                      renderInput={(params) => <TextField {...params} label="Symptoms" size="small" />}
                      limitTags={3}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={["Thyroid", "BP", "Cholesterol"]}
                      value={formData.otherConditions || []}
                      onChange={(_, newValue) => handleMultiSelectChange("otherConditions", newValue)}
                      renderInput={(params) => (
                        <TextField {...params} label="Other Conditions" size="small" />
                      )}
                      limitTags={3}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Gut Issues</InputLabel>
                      <Select
                        name="gutIssues"
                        value={formData.gutIssues}
                        label="Gut Issues"
                        onChange={handleChange}
                      >
                        {["Constipation", "Diarrhea", "Bloating"].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </SectionCard>
            </>
          )}
        </Box>
      </Collapse>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Details;
