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
 Tooltip,
 Snackbar,
 Alert,
 CircularProgress,
 Stack,
 InputAdornment,
 Checkbox,
 FormControlLabel,
 Collapse,
 Button,
} from "@mui/material";
import {
 KeyboardDoubleArrowDown,
 KeyboardDoubleArrowUp,
 FavoriteRounded,
 ScienceRounded,
 LocalHotelRounded,
 MedicationRounded,
 HealthAndSafetyRounded,
 HistoryToggleOffRounded,
 UploadFileRounded,
 VisibilityRounded,
} from "@mui/icons-material";
import axios from "axios";


/** ---------- CONFIG & HELPERS ---------- */


const API_BASE = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api/details`;
const ROOT_API_BASE = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api`;


// Includes added Cholesterol + Fatty Liver fields
const initialFormState = {
 // Basics
 age: "",
 height: "", // cm
 weight: "",
 // Diabetes
 hba1c: "",
 fastingSugar: "",
 ppSugar: "",
 durationOfDiabetes: "",
 lastTestDone: "", // diabetes last test
 diabetesReport: "",
 // Cholesterol
 totalCholesterol: "",
 ldl: "",
 hdl: "",
 triglycerides: "",
 lastCholesterolTest: "",
 cholesterolReport: "",
 // Fatty Liver
 sgpt: "",
 sgot: "",
 ggt: "",
 ultrasoundFindings: "",
 lastLiverTest: "",
 liverReport: "",
 // Lifestyle
 gender: "",
 dietType: "",
 sittingTime: "",
 exerciseRoutine: "",
 outsideMeals: "",
 timeOfSleep: "",
 energyLevels: "",
 sleepQuality: "",
 gutIssues: "",
 // Medications & Effects + symptoms
 currentMedications: [],
 sideEffects: "",
 suddenSugarFluctuations: "",
 familyHistory: "",
 monitorBloodSugar: "",
 sugarCravings: "",
 stressLevel: "",
 symptoms: [],
 // legacy keys kept so we don’t unset them by accident
 otherConditions: [],
 painInLiver: "",
};


const formatTime = (d = new Date()) =>
 d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });


const toNumber = (v) =>
 v === "" || v === null || v === undefined ? NaN : Number(v);


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

const reportAcceptTypes = ".pdf,.jpg,.jpeg,.png,.webp";

const reportConfigs = {
 diabetes: {
   label: "Diabetes",
   field: "diabetesReport",
   inputId: "diabetes-report-upload",
 },
 cholesterol: {
   label: "Cholesterol",
   field: "cholesterolReport",
   inputId: "cholesterol-report-upload",
 },
 liver: {
   label: "Fatty Liver",
   field: "liverReport",
   inputId: "liver-report-upload",
 },
};


/** ----- Height parsing utilities (ft/in -> cm) ----- */


const feetInchesToCm = (ft = 0, inch = 0) =>
 +(ft * 30.48 + inch * 2.54).toFixed(1);


/**
* Accepts: 5'8", 5-8, 5 8, 5.8 (inch RHS), 5.67ft (decimal feet)
* Returns CM number or "".
*/
const parseFeetHeightToCm = (raw) => {
 if (raw == null) return "";
 let s = String(raw).trim().toLowerCase();
 s = s
   .replace(/\"|inches?|in\b/g, '"')
   .replace(/feet?|ft\b/g, "'")
   .replace(/\s+/g, " ");


 const m1 = s.match(/^(\d+(?:\.\d+)?)[\'’]\s*(\d+(?:\.\d+)?)?/);
 if (m1) {
   const ft = parseFloat(m1[1]) || 0;
   const inch = parseFloat(m1[2]) || 0;
   return feetInchesToCm(ft, inch);
 }


 const m2 = s.match(/^(\d+(?:\.\d+)?)\s*[- ]\s*(\d+(?:\.\d+)?)/);
 if (m2) {
   const ft = parseFloat(m2[1]) || 0;
   const inch = parseFloat(m2[2]) || 0;
   return feetInchesToCm(ft, inch);
 }


 const m3 = s.match(/^(\d+)\.(\d+)$/);
 if (m3) {
   const ft = parseInt(m3[1], 10);
   const rhs = m3[2];
   const asInches = parseInt(rhs, 10);
   if (!Number.isNaN(asInches) && asInches >= 0 && asInches <= 11) {
     return feetInchesToCm(ft, asInches);
   }
   const decFeet = parseFloat(s);
   return Number.isFinite(decFeet) ? +(decFeet * 30.48).toFixed(1) : "";
 }


 const dec = parseFloat(s);
 if (Number.isFinite(dec)) return +(dec * 30.48).toFixed(1);
 return "";
};


/** ---------- SECTION WRAPPER ---------- */
const SectionCard = ({ icon, title, headerRight, children }) => (
 <Paper
   elevation={0}
   sx={{
     p: 2.25,
     borderRadius: 3.5,
     border: "1px solid",
     borderColor: "#D4DFEC",
     background:
       "linear-gradient(170deg, rgba(255,255,255,0.99) 0%, rgba(246,250,255,0.98) 100%)",
     boxShadow: "0 16px 30px rgba(15,23,42,0.12)",
     backdropFilter: "blur(8px)",
     "& .MuiInputLabel-root": {
       color: "#5B6B7F",
       fontWeight: 500,
     },
     "& .MuiOutlinedInput-root": {
       borderRadius: "12px",
       backgroundColor: "rgba(255,255,255,0.92)",
       "& .MuiOutlinedInput-notchedOutline": { borderColor: "#D4DFEC" },
       "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#B9C9DC" },
       "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#8EA9C7" },
     },
     "& .MuiSelect-icon": {
       color: "#64748B",
     },
     "& .MuiAutocomplete-tag": {
       borderRadius: "8px",
     },
   }}
 >
   {/* Header row with right-side slot */}
   <Stack
     direction={{ xs: "column", sm: "row" }}
     alignItems={{ xs: "stretch", sm: "center" }}
     justifyContent="space-between"
     sx={{ mb: 1.5 }}
     spacing={1.5}
   >
     <Stack direction="row" alignItems="center" spacing={1.5}>
       {icon}
       <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#0F172A", letterSpacing: 0.1 }}>
         {title}
       </Typography>
     </Stack>


     {headerRight ? (
       <Box sx={{ minWidth: { xs: "100%", sm: 220 }, maxWidth: "100%" }}>
         {headerRight}
       </Box>
     ) : null}
   </Stack>


   <Divider sx={{ mb: 2, borderColor: "#E2EAF3" }} />
   {children}
 </Paper>
);


/** ---------- MAIN COMPONENT ---------- */
const Details = ({ contactNumber, onDetailsUpdate, activeConditions = [] }) => {
 const [open, setOpen] = useState(false); // start collapsed
 const [loading, setLoading] = useState(false);
 const [formData, setFormData] = useState(initialFormState);


 // height: ft/in toggle
 const [heightInFeetMode, setHeightInFeetMode] = useState(false);
 const [heightFeetInput, setHeightFeetInput] = useState("");


 const [saveState, setSaveState] = useState("idle"); // 'idle' | 'saving' | 'saved' | 'error'
 const [lastSavedAt, setLastSavedAt] = useState(null);
 const [snack, setSnack] = useState({
   open: false,
   message: "",
   severity: "success",
 });
 const [reportUploading, setReportUploading] = useState({});
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
   const filled = keys.reduce(
     (acc, k) => acc + (isFilled(formData[k]) ? 1 : 0),
     0
   );
   return Math.round((filled / keys.length) * 100);
 }, [formData]);


 /** ------- LOAD DETAILS ------- */
 useEffect(() => {
   if (!contactNumber) {
     setFormData(initialFormState);
     setOpen(false);
     return;
   }
   setLoading(true);
   setFormData(initialFormState);
   (async () => {
     try {
       const { data } = await axios.get(
         `${API_BASE}/get-details/${contactNumber}`
       );
       if (data?.details) {
         setFormData({ ...initialFormState, ...data.details });
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
       setSnack({
         open: true,
         message: "Could not load previous history.",
         severity: "warning",
       });
       setFormData(initialFormState);
     } finally {
       setLoading(false);
     }
   })();
 }, [contactNumber]);


 /** ------- SAVE (DEBOUNCED) ------- */
 const saveNow = async (payload, options = {}) => {
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
     setSnack({
       open: true,
       message: "Auto-save failed. Check connection.",
       severity: "error",
     });
     if (options.throwOnError) throw err;
   }
 };


 const autoSave = (updatedData) => {
   if (debounceRef.current) clearTimeout(debounceRef.current);
   debounceRef.current = setTimeout(() => saveNow(updatedData), 600);
 };


 /** ------- HANDLERS ------- */
 const handleChange = (e) => {
   const { name, value } = e.target;


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

 const handleReportUpload = async (reportKey, file) => {
   if (!file || !contactNumber) return;
   const config = reportConfigs[reportKey];
   if (!config) return;

   try {
     if (debounceRef.current) clearTimeout(debounceRef.current);
     setReportUploading((prev) => ({ ...prev, [reportKey]: true }));
     setSaveState("saving");

     const body = new FormData();
     body.append("report", file);
     body.append(
       "prefix",
       `lead-reports/${String(contactNumber).replace(/[^0-9a-zA-Z_-]/g, "_")}/${reportKey}`
     );

     const { data } = await axios.post(`${ROOT_API_BASE}/upload-report-to-wasabi`, body, {
       headers: { "Content-Type": "multipart/form-data" },
     });

     const reportUrl = data?.url;

     if (!reportUrl) {
       throw new Error("Report uploaded, but no URL was returned.");
     }

     const updated = { ...formData, [config.field]: reportUrl };
     setFormData(updated);
     await saveNow(updated, { throwOnError: true });
     setSnack({
       open: true,
       message: `${config.label} report uploaded.`,
       severity: "success",
     });
   } catch (err) {
     console.error("Report upload failed:", err);
     setSaveState("error");
     setSnack({
       open: true,
       message: err?.response?.data?.message || err?.message || "Report upload failed.",
       severity: "error",
     });
   } finally {
     setReportUploading((prev) => ({ ...prev, [reportKey]: false }));
   }
 };

 const ReportActions = ({ reportKey }) => {
   const config = reportConfigs[reportKey];
   const report = formData[config.field];
   const isUploading = Boolean(reportUploading[reportKey]);
   const reportUrl = typeof report === "string" ? report : report?.url || "";

   return (
     <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
       <input
         id={config.inputId}
         type="file"
         accept={reportAcceptTypes}
         style={{ display: "none" }}
         onChange={(event) => {
           const file = event.target.files?.[0];
           event.target.value = "";
           handleReportUpload(reportKey, file);
         }}
       />
       <Button
         component="label"
         htmlFor={config.inputId}
         size="small"
         variant="outlined"
         startIcon={isUploading ? <CircularProgress size={14} /> : <UploadFileRounded />}
         disabled={isUploading}
         sx={{ whiteSpace: "nowrap", borderRadius: 2 }}
       >
         {isUploading ? "Uploading" : "Upload Report"}
       </Button>
       <Button
         size="small"
         variant={reportUrl ? "contained" : "outlined"}
         startIcon={<VisibilityRounded />}
         disabled={!reportUrl}
         onClick={() => window.open(reportUrl, "_blank", "noopener,noreferrer")}
         sx={{ whiteSpace: "nowrap", borderRadius: 2 }}
       >
         View Report
       </Button>
     </Stack>
   );
 };


 /** ------- HEADER BAR UI ------- */
 const HeaderBar = () => {
   const normalizedConds = (activeConditions || []).map((c) =>
     c === "Liver" ? "Fatty Liver" : c
   );
   const conditionsLabel = normalizedConds.length
     ? normalizedConds.join(", ")
     : "—";
   const showHbA1c = normalizedConds.includes("Diabetes");


   return (
     <Box
       onClick={() => setOpen((v) => !v)}
       sx={{
         position: "relative",
         borderRadius: 3.5,
         overflow: "hidden",
         background:
           "linear-gradient(105deg, #0B1324 0%, #17233B 45%, #2A3B59 100%)",
         color: "white",
         px: { xs: 2, sm: 3 },
         py: 2.1,
         boxShadow: "0 18px 34px rgba(15,23,42,0.34)",
         cursor: "pointer",
         userSelect: "none",
         border: "1px solid rgba(148, 163, 184, 0.28)",
         "&::before": {
           content: '""',
           position: "absolute",
           inset: 0,
           background:
             "radial-gradient(circle at 12% 30%, rgba(56,189,248,0.18), transparent 45%)",
           pointerEvents: "none",
         },
       }}
     >
       <Stack
         direction="row"
         alignItems="center"
         justifyContent="space-between"
         gap={2}
       >
         <Stack
           direction={{ xs: "column", sm: "row" }}
           alignItems={{ xs: "flex-start", sm: "center" }}
           spacing={1.5}
           sx={{ flex: 1, mx: 1 }}
         >
           <Stack direction="row" spacing={1} alignItems="center">
             <HealthAndSafetyRounded fontSize="small" />
             <Typography
               variant="h6"
               fontWeight={800}
               sx={{ letterSpacing: 0.2 }}
             >
               History
             </Typography>
           </Stack>


           <Stack direction="row" flexWrap="wrap" gap={1}>
             {/* Age */}
             <Chip
               size="small"
               icon={<HistoryToggleOffRounded />}
               label={`Age: ${formData.age || "—"}`}
               sx={{
                 color: "white",
                 bgcolor: "rgba(255,255,255,0.15)",
                 border: "1px solid rgba(255,255,255,0.2)",
               }}
             />


             {/* Conditions (comma separated), shown next to Age */}
             <Chip
               size="small"
               icon={<HealthAndSafetyRounded />}
               label={`Conditions: ${conditionsLabel}`}
               sx={{
                 color: "white",
                 bgcolor: "rgba(255,255,255,0.15)",
                 border: "1px solid rgba(255,255,255,0.2)",
               }}
             />


             {/* HbA1c only if Diabetes is selected */}
             {showHbA1c && (
               <Chip
                 size="small"
                 icon={<ScienceRounded />}
                 label={`HbA1c: ${formData.hba1c || "—"}%`}
                 color={badgeColorByHba1c(formData.hba1c)}
                 variant={formData.hba1c ? "filled" : "outlined"}
                 sx={{
                   color: "white",
                   bgcolor: formData.hba1c
                     ? undefined
                     : "rgba(255,255,255,0.15)",
                   border: formData.hba1c
                     ? undefined
                     : "1px solid rgba(255,255,255,0.2)",
                 }}
               />
             )}
           </Stack>
         </Stack>


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


           <Tooltip title="Profile completion">
             <Chip
               size="small"
               label={`${completionPercent}%`}
               sx={{
                 color: "white",
                 bgcolor: "rgba(255,255,255,0.2)",
                 fontWeight: 700,
                 border: "1px solid rgba(255,255,255,0.24)",
               }}
             />
           </Tooltip>


           <IconButton
             size="small"
             onClick={(e) => {
               e.stopPropagation();
               setOpen((v) => !v);
             }}
             sx={{
               color: "white",
               bgcolor: "rgba(255,255,255,0.2)",
               "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
             }}
             aria-label={open ? "Collapse details" : "Expand details"}
           >
             {open ? <KeyboardDoubleArrowUp /> : <KeyboardDoubleArrowDown />}
           </IconButton>
         </Stack>
       </Stack>
     </Box>
   );
 };


 const DisabledOverlay = () =>
   !contactNumber ? (
     <Paper
       variant="outlined"
       sx={{
         mt: 2,
         p: 4.5,
         borderRadius: 3.5,
         textAlign: "center",
         color: "text.secondary",
         borderColor: "#D4DFEC",
         background: "linear-gradient(170deg, #FFFFFF 0%, #F6FAFF 100%)",
         boxShadow: "0 14px 28px rgba(15,23,42,0.10)",
       }}
     >
       <Typography variant="subtitle1" fontWeight={700} gutterBottom>
         Select a contact to view History
       </Typography>
       <Typography variant="body2">
         Once you choose a lead/contact, this panel will unlock and auto-save
         as you type.
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


 // Normalize incoming conditions: show blocks for each selected
 const normalized = (activeConditions || []).map((c) =>
   c === "Liver" ? "Fatty Liver" : c
 );
 const showDiabetes = normalized.includes("Diabetes");
 const showCholesterol = normalized.includes("Cholesterol");
 const showLiver = normalized.includes("Fatty Liver");


 return (
   <Box sx={{ mt: 2 }}>
     <HeaderBar />


     <Collapse in={open} timeout="auto" unmountOnExit>
       {loading ? (
         <Paper
           elevation={0}
           sx={{
             mt: 2,
             p: 3,
             borderRadius: 3.5,
             border: "1px solid",
             borderColor: "#D4DFEC",
             background: "linear-gradient(170deg, #FFFFFF 0%, #F6FAFF 100%)",
             boxShadow: "0 14px 28px rgba(15,23,42,0.10)",
           }}
         >
           <Stack direction="row" alignItems="center" spacing={1.5}>
             <CircularProgress size={20} />
             <Typography variant="body2">Loading previous history…</Typography>
           </Stack>
         </Paper>
       ) : (
         <Box sx={{ mt: 2, display: "grid", gap: 2 }}>
           {/* ===== BASICS (left) + LIFESTYLE (right) in one row ===== */}
           <Grid container spacing={2}>
             {/* LEFT: BASICS (vertical 1-column stack) */}
             <Grid item xs={12} md={4}>
               <SectionCard icon={<FavoriteRounded color="error" />} title="Basics">
                 <Grid container spacing={2} direction="column">
                   {/* AGE */}
                   <Grid item xs={12}>
                     <TextField
                       name="age"
                       label="Age"
                       type="number"
                       size="small"
                       fullWidth
                       value={formData.age}
                       onChange={handleChange}
                       inputProps={{
                         min: 0,
                         max: 120,
                         inputMode: "numeric",
                         pattern: "[0-9]*",
                       }}
                     />
                   </Grid>


                   {/* HEIGHT (its own row) */}
<Grid item xs={12}>
 <Grid container spacing={2}>
   <Grid item xs={12} sm={8}>
     <Stack direction="row" spacing={1} alignItems="flex-start">
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
         sx={{ ml: 0.5, mt: 0.2 }}
       />
     </Stack>
   </Grid>
 </Grid>
</Grid>


{/* WEIGHT + BMI on one line */}
<Grid item xs={12}>
 <Grid container spacing={2}>
   {/* WEIGHT */}
   <Grid item xs={12} sm={6}>
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


   {/* BMI */}
   <Grid item xs={12} sm={6}>
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
 </Grid>
</Grid>


                 </Grid>
               </SectionCard>
             </Grid>




             {/* RIGHT: LIFESTYLE (3 x 3 grid) */}
             <Grid item xs={12} md={8}>
               <SectionCard
                 icon={<LocalHotelRounded color="primary" />}
                 title="Lifestyle"
               >
                 <Grid
                   container
                   spacing={2}
                   columns={{ xs: 1, sm: 6, md: 12 }}
                 >
                   {/* Row 1 */}
                   <Grid item xs={1} sm={3} md={4}>
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


                   <Grid item xs={1} sm={3} md={4}>
                     <FormControl fullWidth size="small">
                       <InputLabel>Diet Type</InputLabel>
                       <Select
                         name="dietType"
                         value={formData.dietType}
                         label="Diet Type"
                         onChange={handleChange}
                       >
                         {["Vegetarian", "Non-vegetarian", "Vegan"].map(
                           (option) => (
                             <MenuItem key={option} value={option}>
                               {option}
                             </MenuItem>
                           )
                         )}
                       </Select>
                     </FormControl>
                   </Grid>


                   <Grid item xs={1} sm={3} md={4}>
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


                   {/* Row 2 */}
                   <Grid item xs={1} sm={3} md={4}>
                     <FormControl fullWidth size="small">
                       <InputLabel>Exercise</InputLabel>
                       <Select
                         name="exerciseRoutine"
                         value={formData.exerciseRoutine}
                         label="Exercise"
                         onChange={handleChange}
                       >
                         {[
                           "Daily",
                           "4-5 times a week",
                           "2-3 times a week",
                           "Once a week",
                           "Rarely",
                           "Never",
                         ].map((option) => (
                           <MenuItem key={option} value={option}>
                             {option}
                           </MenuItem>
                         ))}
                       </Select>
                     </FormControl>
                   </Grid>


                   <Grid item xs={1} sm={3} md={4}>
                     <FormControl fullWidth size="small">
                       <InputLabel>Outside Meals</InputLabel>
                       <Select
                         name="outsideMeals"
                         value={formData.outsideMeals}
                         label="Outside Meals"
                         onChange={handleChange}
                       >
                         {[
                           "Daily",
                           "4-5 times a week",
                           "2-3 times a week",
                           "Once a week",
                           "Rarely",
                           "Never",
                         ].map((option) => (
                           <MenuItem key={option} value={option}>
                             {option}
                           </MenuItem>
                         ))}
                       </Select>
                     </FormControl>
                   </Grid>


                   <Grid item xs={1} sm={3} md={4}>
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


                   {/* Row 3 */}
                   <Grid item xs={1} sm={3} md={4}>
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


                   <Grid item xs={1} sm={3} md={4}>
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


                   <Grid item xs={1} sm={3} md={4}>
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
             </Grid>
           </Grid>


           {/* ===== CONDITION SECTIONS: show all selected below ===== */}
           {showDiabetes && (
             <SectionCard
               icon={<ScienceRounded color="warning" />}
               title="Diabetes"
               headerRight={
                 <Stack
                   direction={{ xs: "column", md: "row" }}
                   spacing={1}
                   alignItems={{ xs: "stretch", md: "center" }}
                 >
                   <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 220 } }}>
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
                   <ReportActions reportKey="diabetes" />
                 </Stack>
               }
             >
               <Grid container spacing={2}>
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
                       endAdornment: (
                         <InputAdornment position="end">%</InputAdornment>
                       ),
                     }}
                   />
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
                       endAdornment: (
                         <InputAdornment position="end">mg/dL</InputAdornment>
                       ),
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
                       endAdornment: (
                         <InputAdornment position="end">mg/dL</InputAdornment>
                       ),
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
           )}


           {showCholesterol && (
             <SectionCard
               icon={<ScienceRounded color="info" />}
               title="Cholesterol"
               headerRight={
                 <Stack
                   direction={{ xs: "column", md: "row" }}
                   spacing={1}
                   alignItems={{ xs: "stretch", md: "center" }}
                 >
                   <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 220 } }}>
                     <InputLabel>Last Test</InputLabel>
                     <Select
                       name="lastCholesterolTest"
                       value={formData.lastCholesterolTest}
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
                   <ReportActions reportKey="cholesterol" />
                 </Stack>
               }
             >
               <Grid container spacing={2}>
                 <Grid item xs={6} sm={3} md={2.2}>
                   <TextField
                     name="totalCholesterol"
                     label="Total Cholesterol"
                     type="number"
                     size="small"
                     fullWidth
                     value={formData.totalCholesterol}
                     onChange={handleChange}
                     InputProps={{
                       endAdornment: (
                         <InputAdornment position="end">mg/dL</InputAdornment>
                       ),
                     }}
                   />
                 </Grid>
                 <Grid item xs={6} sm={3} md={2.2}>
                   <TextField
                     name="ldl"
                     label="LDL"
                     type="number"
                     size="small"
                     fullWidth
                     value={formData.ldl}
                     onChange={handleChange}
                     InputProps={{
                       endAdornment: (
                         <InputAdornment position="end">mg/dL</InputAdornment>
                       ),
                     }}
                   />
                 </Grid>
                 <Grid item xs={6} sm={3} md={2.2}>
                   <TextField
                     name="hdl"
                     label="HDL"
                     type="number"
                     size="small"
                     fullWidth
                     value={formData.hdl}
                     onChange={handleChange}
                     InputProps={{
                       endAdornment: (
                         <InputAdornment position="end">mg/dL</InputAdornment>
                       ),
                     }}
                   />
                 </Grid>
                 <Grid item xs={6} sm={3} md={2.2}>
                   <TextField
                     name="triglycerides"
                     label="Triglycerides"
                     type="number"
                     size="small"
                     fullWidth
                     value={formData.triglycerides}
                     onChange={handleChange}
                     InputProps={{
                       endAdornment: (
                         <InputAdornment position="end">mg/dL</InputAdornment>
                       ),
                     }}
                   />
                 </Grid>
               </Grid>
             </SectionCard>
           )}


           {showLiver && (
             <SectionCard
               icon={<ScienceRounded color="secondary" />}
               title="Fatty Liver"
               headerRight={
                 <Stack
                   direction={{ xs: "column", md: "row" }}
                   spacing={1}
                   alignItems={{ xs: "stretch", md: "center" }}
                 >
                   <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 220 } }}>
                     <InputLabel>Last Test</InputLabel>
                     <Select
                       name="lastLiverTest"
                       value={formData.lastLiverTest}
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
                   <ReportActions reportKey="liver" />
                 </Stack>
               }
             >
               <Grid container spacing={2}>
                 <Grid item xs={6} sm={3} md={2.2}>
                   <TextField
                     name="sgpt"
                     label="SGPT (ALT)"
                     type="number"
                     size="small"
                     fullWidth
                     value={formData.sgpt}
                     onChange={handleChange}
                   />
                 </Grid>
                 <Grid item xs={6} sm={3} md={2.2}>
                   <TextField
                     name="sgot"
                     label="SGOT (AST)"
                     type="number"
                     size="small"
                     fullWidth
                     value={formData.sgot}
                     onChange={handleChange}
                   />
                 </Grid>
                 <Grid item xs={6} sm={3} md={2.2}>
                   <TextField
                     name="ggt"
                     label="GGT"
                     type="number"
                     size="small"
                     fullWidth
                     value={formData.ggt}
                     onChange={handleChange}
                   />
                 </Grid>


                 {/* Ultrasound Findings dropdown */}
                 <Grid item xs={12} sm={6} md={4}>
                   <FormControl fullWidth size="small">
                     <InputLabel>Ultrasound Findings</InputLabel>
                     <Select
                       name="ultrasoundFindings"
                       value={formData.ultrasoundFindings}
                       label="Ultrasound Findings"
                       onChange={handleChange}
                     >
                       {["Normal", "Grade 1", "Grade 2", "Grade 3"].map(
                         (opt) => (
                           <MenuItem key={opt} value={opt}>
                             {opt}
                           </MenuItem>
                         )
                       )}
                     </Select>
                   </FormControl>
                 </Grid>
               </Grid>
             </SectionCard>
           )}


           {/* MEDICATIONS & EFFECTS (always visible) */}
           <SectionCard
             icon={<MedicationRounded color="secondary" />}
             title="Medications & Effects"
           >
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
                     <TextField
                       {...params}
                       label="Current Medications"
                       size="small"
                     />
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
                   onChange={(_, newValue) =>
                     handleMultiSelectChange("symptoms", newValue)
                   }
                   renderInput={(params) => (
                     <TextField {...params} label="Symptoms" size="small" />
                   )}
                   limitTags={3}
                 />
               </Grid>
             </Grid>
           </SectionCard>
         </Box>
       )}
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



