import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  MenuItem, 
  Grid, 
  IconButton,
  Paper
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import axios from "axios";

const defaultFollowup = {
  date: "",
  takingSupplements: "",
  sendingGlucometerPhotos: "",
  currentSugar: { fasting: "", pp: "" },
  hba1cTestDone: "",
  hba1cValue: "",
  drop: "",
  rtNotes: "",
};

const ConsultationFollowup = ({ customerId }) => {
  const [followups, setFollowups] = useState([{ ...defaultFollowup }]);
  const [loading, setLoading] = useState(true);
  const [consultInfo, setConsultInfo] = useState({
    assignExpertName: "",
    doctorCons: "",
  });

  // Load existing followups from the backend
  useEffect(() => {
    if (customerId) {
      axios
        .get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-followup?customerId=${customerId}`)
        .then((response) => {
          if (response.data.followups && response.data.followups.length > 0) {
            setFollowups(response.data.followups);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching followup data:", error);
          setLoading(false);
        });
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;

    axios
      .get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-full-history?customerId=${customerId}`)
      .then((response) => {
        const presales = response.data.presales || {};
        setConsultInfo({
          assignExpertName: presales.assignExpert?.fullName || "",
          doctorCons: presales.doctorCons || "",
        });
      })
      .catch((error) => {
        console.error("Error fetching consultation info:", error);
      });
  }, [customerId]);

  const handleChange = (index, field, value) => {
    const updated = [...followups];
    if (field === "fasting" || field === "pp") {
      updated[index].currentSugar = { ...updated[index].currentSugar, [field]: value };
    } else {
      updated[index][field] = value;
    }
    setFollowups(updated);
  };

  const addFollowup = () => {
    setFollowups([...followups, { ...defaultFollowup }]);
  };

  const removeFollowup = (index) => {
    const updated = followups.filter((_, i) => i !== index);
    setFollowups(updated);
  };

  const handleSaveFollowups = () => {
    if (!customerId) return;
    axios
      .post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-followup", { customerId, followups })
      .then((response) => {
        console.log("Followups saved", response.data);
      })
      .catch((error) => {
        console.error("Error saving followups:", error);
      });
  };

  if (loading) {
    return (
      <Typography sx={{ color: "black", textAlign: "center" }}>
        Loading followup data...
      </Typography>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: "#f7f7f7", borderRadius: 2 }}>
      {consultInfo.assignExpertName  && (
        <Typography>
        Assigned Expert: {consultInfo.assignExpertName}
      </Typography>
      )}
      {consultInfo.doctorCons && (
        <Typography
          variant="subtitle1"
          sx={{ mb: 2, fontWeight: "medium", color: "black" }}
        >
          Doctor Consultation: {consultInfo.doctorCons}
        </Typography>
      )}

      <Typography 
        variant="h5" 
        sx={{ mb: 3, fontWeight: "bold", color: "black", textAlign: "center" }}
      >
        Consultation Follow-up
      </Typography>
      {followups.map((fup, index) => (
        <Paper 
          key={index} 
          elevation={4} 
          sx={{ 
            p: 3, 
            mb: 3, 
            borderRadius: 2, 
            borderLeft: "5px solid black",
            backgroundColor: "#fff"
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
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "black" }}>
              Followup-{index + 1}
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
            <Grid item xs={12} sm={3}>
              <TextField
                variant="outlined"
                label="Date"
                type="date"
                InputLabelProps={{
                  shrink: true,
                  sx: { "&.Mui-focused": { color: "black" } },
                }}
                fullWidth
                value={fup.date}
                onChange={(e) => handleChange(index, "date", e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": { borderColor: "black" },
                  },
                  "& .MuiInputBase-input": { color: "black" }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                variant="outlined"
                select
                label="Taking supplements regularly"
                InputLabelProps={{
                  sx: { "&.Mui-focused": { color: "black" } },
                }}
                fullWidth
                value={fup.takingSupplements}
                onChange={(e) =>
                  handleChange(index, "takingSupplements", e.target.value)
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": { borderColor: "black" },
                  },
                  "& .MuiInputBase-input": { color: "black" }
                }}
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                variant="outlined"
                select
                label="Sending Glucometer photos"
                InputLabelProps={{
                  sx: { "&.Mui-focused": { color: "black" } },
                }}
                fullWidth
                value={fup.sendingGlucometerPhotos}
                onChange={(e) =>
                  handleChange(index, "sendingGlucometerPhotos", e.target.value)
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": { borderColor: "black" },
                  },
                  "& .MuiInputBase-input": { color: "black" }
                }}
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  variant="outlined"
                  label="Fasting Sugar"
                  fullWidth
                  value={fup.currentSugar.fasting}
                  onChange={(e) =>
                    handleChange(index, "fasting", e.target.value)
                  }
                  InputLabelProps={{
                    sx: { "&.Mui-focused": { color: "black" } },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": { borderColor: "black" },
                    },
                    "& .MuiInputBase-input": { color: "black" }
                  }}
                />
                <TextField
                  variant="outlined"
                  label="PP Sugar"
                  fullWidth
                  value={fup.currentSugar.pp}
                  onChange={(e) =>
                    handleChange(index, "pp", e.target.value)
                  }
                  InputLabelProps={{
                    sx: { "&.Mui-focused": { color: "black" } },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": { borderColor: "black" },
                    },
                    "& .MuiInputBase-input": { color: "black" }
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                variant="outlined"
                select
                label="Hba1c test done"
                fullWidth
                value={fup.hba1cTestDone}
                onChange={(e) =>
                  handleChange(index, "hba1cTestDone", e.target.value)
                }
                InputLabelProps={{
                  sx: { "&.Mui-focused": { color: "black" } },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": { borderColor: "black" },
                  },
                  "& .MuiInputBase-input": { color: "black" }
                }}
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>
            </Grid>
            {fup.hba1cTestDone === "Yes" && (
              <Grid item xs={12} sm={2}>
                <TextField
                  variant="outlined"
                  label="Hba1c Value"
                  fullWidth
                  value={fup.hba1cValue}
                  onChange={(e) =>
                    handleChange(index, "hba1cValue", e.target.value)
                  }
                  InputLabelProps={{
                    sx: { "&.Mui-focused": { color: "black" } },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": { borderColor: "black" },
                    },
                    "& .MuiInputBase-input": { color: "black" }
                  }}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={2}>
              <TextField
                variant="outlined"
                select
                label="Drop"
                fullWidth
                value={fup.drop}
                onChange={(e) =>
                  handleChange(index, "drop", e.target.value)
                }
                InputLabelProps={{
                  sx: { "&.Mui-focused": { color: "black" } },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": { borderColor: "black" },
                  },
                  "& .MuiInputBase-input": { color: "black" }
                }}
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>
            </Grid>
          <Grid item xs={12} sm={4}>
          <TextField
            variant="outlined" 
            label="Follow up Notes"
            fullWidth
            multiline 
            value={fup.rtNotes}
            onChange={(e) =>
              handleChange(index, "rtNotes", e.target.value)
            }
            InputLabelProps={{
              sx: { "&.Mui-focused": { color: "black" } },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&.Mui-focused fieldset": { borderColor: "black" },
              },
              "& .MuiInputBase-input": { color: "black" }
            }}
          />
        </Grid>
          </Grid>

        </Paper>
      ))}
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
      <Box sx={{ textAlign: "center" }}>
        <Button 
          variant="contained" 
          onClick={handleSaveFollowups}
          sx={{
            backgroundColor: "black",
            color: "#fff",
            textTransform: "none",
            fontWeight: "bold",
            "&:hover": { backgroundColor: "#333" },
            px: 4,
          }}
        >
          Save Followups
        </Button>
      </Box>
    </Box>
  );
};

export default ConsultationFollowup;