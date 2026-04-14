import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, Paper, Grid } from "@mui/material";
import axios from "axios";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const ConsultationHistory = ({ customerId }) => {
  const [fullHistory, setFullHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) {
      setFullHistory(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    api
      .get("/api/consultation-full-history", {
        params: { customerId },
      })
      .then((response) => {
        setFullHistory(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(
          "Error fetching full consultation history:",
          error?.response?.data || error.message
        );
        setFullHistory(null);
        setLoading(false);
      });
  }, [customerId]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "200px",
        }}
      >
        <CircularProgress sx={{ color: "black" }} />
      </Box>
    );
  }

  if (!fullHistory) {
    return <Typography>No history data available.</Typography>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Consultation History
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Presales
        </Typography>
        <Grid container spacing={2}>
          {fullHistory.presales &&
            Object.entries(fullHistory.presales).map(([key, value]) => (
              <Grid item xs={6} key={key}>
                <Typography variant="body2">
                  <strong>{key}:</strong>{" "}
                  {Array.isArray(value)
                    ? value.join(", ")
                    : value !== null && value !== undefined
                    ? value.toString()
                    : ""}
                </Typography>
              </Grid>
            ))}
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Consultation
        </Typography>
        <Grid container spacing={2}>
          {fullHistory.consultation &&
            Object.entries(fullHistory.consultation).map(([key, value]) => (
              <Grid item xs={6} key={key}>
                <Typography variant="body2">
                  <strong>{key}:</strong>{" "}
                  {Array.isArray(value)
                    ? value.join(", ")
                    : value !== null && value !== undefined
                    ? value.toString()
                    : ""}
                </Typography>
              </Grid>
            ))}
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Closing
        </Typography>
        <Grid container spacing={2}>
          {fullHistory.closing &&
            Object.entries(fullHistory.closing).map(([key, value]) => (
              <Grid item xs={6} key={key}>
                <Typography variant="body2">
                  <strong>{key}:</strong>{" "}
                  {typeof value === "object" && value !== null
                    ? JSON.stringify(value)
                    : value !== null && value !== undefined
                    ? value.toString()
                    : ""}
                </Typography>
              </Grid>
            ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default ConsultationHistory;