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
} from "@mui/material";
import Delete from "@mui/icons-material/Delete";
import axios from "axios";

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
    note: "", // New Note field
  });

  const [followups, setFollowups] = useState([createEmptyFollowup()]);

  const saveToDB = async (newFollowups) => {
    try {
      const cleanFollowups = newFollowups.map(({ key, ...rest }) => rest);
      await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/details/save-followups", {
        contactNumber,
        followUps: cleanFollowups,
      });
    } catch (err) {
      console.error("Error saving followups", err);
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
  
        const followUps = data?.followUps || []; // FIXED this line
  
        setFollowups(
          followUps.length
            ? followUps.map((f) => ({ ...f, key: Date.now() + Math.random() }))
            : [createEmptyFollowup()]
        );
      } catch (err) {
        console.error("Failed to fetch followups", err);
      }
    };
  
    fetchFollowups();
  }, [contactNumber]);
  
  
  
  
  return (
    <Box sx={{ p: 3, backgroundColor: "#f7f7f7", borderRadius: 2 }}>
      <Typography
        variant="h5"
        sx={{ mb: 3, fontWeight: "bold", color: "black", textAlign: "center" }}
      >
        Retention Follow-up
      </Typography>

      <Button
        variant="outlined"
        onClick={addFollowup}
        sx={{
          borderColor: "black",
          color: "black",
          mb: 2,
          textTransform: "none",
          fontWeight: "bold",
        }}
      >
        Add Followup
      </Button>

      {followups.map((fup, index) => {
        const followupNumber = followups.length - index;
        return (
          <Paper
            key={fup.key}
            elevation={4}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              borderLeft: "5px solid black",
              backgroundColor: "#fff",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", color: "black" }}
              >
                Followup-{followupNumber}
              </Typography>
              {followups.length > 1 && (
                <IconButton
                  onClick={() => removeFollowup(index)}
                  size="small"
                  sx={{ color: "black" }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={2}>
                <TextField
                  variant="outlined"
                  label="Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  value={fup.date}
                  onChange={(e) =>
                    handleChange(index, "date", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  variant="outlined"
                  select
                  label="Taking supplements"
                  fullWidth
                  value={fup.takingSupplements}
                  onChange={(e) =>
                    handleChange(index, "takingSupplements", e.target.value)
                  }
                >
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={2}>
                <TextField
                  variant="outlined"
                  select
                  label="Glucometer photos"
                  fullWidth
                  value={fup.sendingGlucometerPhotos}
                  onChange={(e) =>
                    handleChange(index, "sendingGlucometerPhotos", e.target.value)
                  }
                >
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    variant="outlined"
                    label="Fasting Sugar"
                    fullWidth
                    value={fup.currentSugar.fasting}
                    onChange={(e) =>
                      handleChange(index, "fasting", e.target.value)
                    }
                  />
                  <TextField
                    variant="outlined"
                    label="PP Sugar"
                    fullWidth
                    value={fup.currentSugar.pp}
                    onChange={(e) =>
                      handleChange(index, "pp", e.target.value)
                    }
                  />
                </Box>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  variant="outlined"
                  select
                  label="Hba1c test done"
                  fullWidth
                  value={fup.hba1cTestDone}
                  onChange={(e) =>
                    handleChange(index, "hba1cTestDone", e.target.value)
                  }
                >
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </TextField>
              </Grid>

              {fup.hba1cTestDone === "Yes" && (
                <Grid item xs={12} sm={3}>
                  <TextField
                    variant="outlined"
                    label="Hba1c Value"
                    fullWidth
                    value={fup.hba1cValue}
                    onChange={(e) =>
                      handleChange(index, "hba1cValue", e.target.value)
                    }
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={3}>
                <TextField
                  variant="outlined"
                  select
                  label="Drop"
                  fullWidth
                  value={fup.drop}
                  onChange={(e) =>
                    handleChange(index, "drop", e.target.value)
                  }
                >
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </TextField>
              </Grid>

              {/* Note Field */}
              <Grid item xs={12} sm={6}>
                <TextField
                  variant="outlined"
                  label="Notes & Remarks"
                  multiline
                  rows={1}
                  fullWidth
                  value={fup.note}
                  onChange={(e) =>
                    handleChange(index, "note", e.target.value)
                  }
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
