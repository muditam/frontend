import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  Button,
  Chip,
  Divider,
  Tooltip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import Delete from "@mui/icons-material/Delete";
import AddCircleOutline from "@mui/icons-material/AddCircleOutline";
import LockOutlined from "@mui/icons-material/LockOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import axios from "axios";

const pillInputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 999,
    height: 40,
    "& .MuiOutlinedInput-input": {
      py: 0.5,
    },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E6E8EC" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#DDE1E6" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#E6E8EC" },
    "&.Mui-disabled .MuiOutlinedInput-notchedOutline": { borderColor: "#E6E8EC" },
    "&.Mui-disabled": { bgcolor: "#F9FAFB" },
  },
  "& .MuiInputLabel-root": { color: "#667085" },
};

// Always-green outline (when enabled) for specific fields
const alwaysFocusedCapsuleSx = {
  ...pillInputSx,
  // Force green outline when not disabled, regardless of focus state
  "& .MuiOutlinedInput-root:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline": {
    borderColor: "#E6E8EC",
  },
  "& .MuiOutlinedInput-root:not(.Mui-disabled):hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "#256528",
  },
};

// Capsule style for FormControl + Select (like your reference)
const pillSelectSx = {
  minWidth: 150,
  "& .MuiOutlinedInput-root": {
    borderRadius: 999,
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E6E8EC" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#DDE1E6" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#2E7D32" },
    "&.Mui-disabled .MuiOutlinedInput-notchedOutline": { borderColor: "#E6E8EC" },
    "&.Mui-disabled": { backgroundColor: "#F9FAFB" },
  },
};

const RetentionFollowUp = ({ contactNumber }) => {
  const createEmptyFollowup = () => ({
    key: Date.now() + Math.random(),
    date: "",
    takingSupplements: "",
    sendingGlucometerPhotos: "",
    currentSugar: { fasting: "", pp: "" },
    hba1cTestDone: "",
    hba1cValue: "",
    drop: "",
    note: "",
  });

  const [followups, setFollowups] = useState([createEmptyFollowup()]);
  const [saving, setSaving] = useState(false);

  const saveToDB = async (newFollowups) => {
    try {
      setSaving(true);
      const cleanFollowups = newFollowups.map(({ key, ...rest }) => rest);
      await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/details/save-followups",
        { contactNumber, followUps: cleanFollowups }
      );
    } catch (err) {
      console.error("Error saving followups", err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (index, field, value) => {
    const updated = [...followups];
    if (field === "fasting" || field === "pp") {
      updated[index].currentSugar[field] = value;
    } else {
      updated[index][field] = value;
    }
    setFollowups(updated);
    saveToDB(updated);
  };

  const addFollowup = () => {
    const newFollowups = [createEmptyFollowup(), ...followups];
    setFollowups(newFollowups);
    saveToDB(newFollowups);
  };

  const removeFollowup = (index) => {
    const updated = followups.filter((_, i) => i !== index);
    setFollowups(updated);
    saveToDB(updated);
  };

  useEffect(() => {
    if (!contactNumber) return;
    const fetchFollowups = async () => {
      try {
        const { data } = await axios.get(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/details/get-details/${contactNumber}`
        );
        const followUps = data?.followUps || [];
        setFollowups(
          followUps.length
            ? followUps
                .map((f) => ({ ...f, key: Date.now() + Math.random() }))
                .reverse() // latest first
            : [createEmptyFollowup()]
        );
      } catch (err) {
        console.error("Failed to fetch followups", err);
      }
    };
    fetchFollowups();
  }, [contactNumber]);

  return (
    <Box
      sx={{
        p: 3,
        mt: 3,
        mb: 3,
        backgroundColor: "#F8FAFC",
        borderRadius: 2,
        border: "1px solid #EEF2F6",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 2,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>
          Retention Follow-up
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            size="small"
            variant="outlined"
            label={saving ? "Saving…" : "Saved"}
            sx={{ borderColor: saving ? "#F59E0B" : "#E5E7EB", color: saving ? "#B45309" : "#6B7280" }}
          />
          <Button
            variant="contained"
            onClick={addFollowup}
            startIcon={<AddCircleOutline />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 999,
              bgcolor: "#111827",
              "&:hover": { bgcolor: "#0B1220" },
            }}
          >
            Add Followup
          </Button>
        </Box>
      </Box>

      {followups.map((fup, index) => {
        const followupNumber = followups.length - index;
        const isLatest = index === 0; // newest at top is editable
        const isOldest = followupNumber === 1; // Followup-1 at the bottom (oldest)
        const disabled = !isLatest;

        return (
          <Paper
            key={fup.key}
            elevation={0}
            sx={{
              p: 2.25,
              mb: 2,
              borderRadius: 2,
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 1px 2px rgba(16,24,40,0.06)",
            }}
          >
            {/* Card header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  bgcolor: "#F1F5F9",
                  color: "#0F172A",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                }}
              >
                Followup-{followupNumber}
              </Box>

              {isLatest ? (
                <Chip
                  size="small"
                  icon={<EditOutlined sx={{ fontSize: 16 }} />}
                  label="Editable"
                  sx={{
                    bgcolor: "#ECFDF5",
                    color: "#065F46",
                    "& .MuiChip-icon": { color: "#065F46" },
                    fontWeight: 700,
                  }}
                />
              ) : (
                <Chip
                  size="small"
                  icon={<LockOutlined sx={{ fontSize: 16 }} />}
                  label="Locked"
                  sx={{
                    bgcolor: "#F8FAFC",
                    color: "#475569",
                    "& .MuiChip-icon": { color: "#475569" },
                    fontWeight: 700,
                  }}
                />
              )}

              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
                {!isOldest && isLatest && (
                  <Tooltip title="Delete latest follow-up">
                    <IconButton
                      onClick={() => removeFollowup(index)}
                      size="small"
                      sx={{
                        color: "#991B1B",
                        border: "1px solid #FEE2E2",
                        bgcolor: "#FEF2F2",
                        "&:hover": { bgcolor: "#FEE2E2" },
                        borderRadius: 999,
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Form grid */}
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={2.4}>
                <TextField
                  variant="outlined"
                  label="Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  value={fup.date}
                  onChange={(e) => handleChange(index, "date", e.target.value)}
                  inputProps={{
                    min: (() => {
                      const today = new Date();
                      return today.toISOString().split("T")[0];
                    })(),
                    max: (() => {
                      const today = new Date();
                      today.setDate(today.getDate() + 10);
                      return today.toISOString().split("T")[0];
                    })(),
                  }}
                  disabled={disabled}
                  sx={pillInputSx}
                />
              </Grid>

              {/* Taking supplements (capsule Select) */}
              <Grid item xs={12} sm={2.4}>
                <FormControl size="small" fullWidth disabled={disabled} sx={pillSelectSx}>
                  <InputLabel>Taking supplements</InputLabel>
                  <Select
                    label="Taking supplements"
                    value={fup.takingSupplements}
                    onChange={(e) => handleChange(index, "takingSupplements", e.target.value)}
                  >
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Glucometer photos (capsule Select) */}
              <Grid item xs={12} sm={2.4}>
                <FormControl size="small" fullWidth disabled={disabled} sx={pillSelectSx}>
                  <InputLabel>Glucometer photos</InputLabel>
                  <Select
                    label="Glucometer photos"
                    value={fup.sendingGlucometerPhotos}
                    onChange={(e) =>
                      handleChange(index, "sendingGlucometerPhotos", e.target.value)
                    }
                  >
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Fasting & PP sugars — ALWAYS GREEN OUTLINE */}
              <Grid item xs={12} sm={4.8}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    variant="outlined"
                    label="Fasting Sugar"
                    fullWidth
                    value={fup.currentSugar.fasting}
                    onChange={(e) => handleChange(index, "fasting", e.target.value)}
                    disabled={disabled}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">mg/dL</InputAdornment>,
                      inputMode: "numeric",
                    }}
                    InputLabelProps={{ shrink: true }}
                    sx={alwaysFocusedCapsuleSx}
                  />
                  <TextField
                    variant="outlined"
                    label="PP Sugar"
                    fullWidth 
                    value={fup.currentSugar.pp}
                    onChange={(e) => handleChange(index, "pp", e.target.value)}
                    disabled={disabled}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">mg/dL</InputAdornment>,
                      inputMode: "numeric",
                    }}
                    InputLabelProps={{ shrink: true }}
                    sx={alwaysFocusedCapsuleSx}
                  />
                </Box>
              </Grid>

              {/* HbA1c test done (capsule Select) */}
              <Grid item xs={12} sm={2.4}>
                <FormControl size="small" fullWidth disabled={disabled} sx={pillSelectSx}>
                  <InputLabel>HbA1c test done</InputLabel>
                  <Select
                    label="HbA1c test done"
                    value={fup.hba1cTestDone}
                    onChange={(e) => handleChange(index, "hba1cTestDone", e.target.value)}
                  >
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* HbA1c Value — ALWAYS GREEN OUTLINE (only when visible) */}
              {fup.hba1cTestDone === "Yes" && (
                <Grid item xs={12} sm={2.4}>
                  <TextField
                    variant="outlined"
                    label="HbA1c Value"
                    fullWidth
                    value={fup.hba1cValue}
                    onChange={(e) => handleChange(index, "hba1cValue", e.target.value)}
                    disabled={disabled}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      inputMode: "decimal",
                    }}
                    InputLabelProps={{ shrink: true }}
                    sx={alwaysFocusedCapsuleSx}
                  />
                </Grid>
              )}

              {/* Drop (capsule Select) */}
              <Grid item xs={12} sm={2.4}>
                <FormControl size="small" fullWidth disabled={disabled} sx={pillSelectSx}>
                  <InputLabel>Drop</InputLabel>
                  <Select
                    label="Drop"
                    value={fup.drop}
                    onChange={(e) => handleChange(index, "drop", e.target.value)}
                  >
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Notes & remarks — ALWAYS GREEN OUTLINE */}
              <Grid item xs={12} sm={fup.hba1cTestDone === "Yes" ? 4.8 : 7.2}>
                <TextField
                  variant="outlined"
                  label="Notes & remarks"
                  placeholder=""
                  multiline
                  rows={2}
                  fullWidth
                  value={fup.note}
                  onChange={(e) => handleChange(index, "note", e.target.value)}
                  disabled={disabled}
                  InputLabelProps={{ shrink: true }}
                  sx={alwaysFocusedCapsuleSx}
                />
              </Grid>
            </Grid>
          </Paper>
        );
      })}
    </Box>
  );
};

export default RetentionFollowUp;
