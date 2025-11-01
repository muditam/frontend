// pages/SmartfloOverview.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
} from "@mui/material";
import axios from "axios";

export default function SmartfloOverview() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalCalls: 0,
    incomingCalls: 0,
    dialledCalls: 0,
    dialledConnected: 0,
    answeredOutbound: 0,
    missed: 0,
    avgDuration: 0,
  });
  const [agents, setAgents] = useState([]);
  const [dateLabel, setDateLabel] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // backend always uses today's IST window, so no params
      const { data } = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/smartflo/overview"
      );
      setSummary({
        totalCalls: data?.summary?.totalCalls ?? 0,
        incomingCalls: data?.summary?.incomingCalls ?? 0,
        dialledCalls: data?.summary?.dialledCalls ?? 0,
        dialledConnected: data?.summary?.dialledConnected ?? 0,
        answeredOutbound: data?.summary?.answeredOutbound ?? 0,
        missed: data?.summary?.missed ?? 0,
        avgDuration: data?.summary?.avgDuration ?? 0,
      });
      setAgents(data?.agents || []);
      setDateLabel(data?.date || "");
    } catch (err) {
      console.error(err);
      alert("Failed to load Smartflo overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Box p={2}>
      <Box
        mb={2}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
      >
        <Typography variant="h6">Smartflo – Call Overview</Typography>
        <Chip
          label={
            loading
              ? "Refreshing..."
              : dateLabel
              ? `Showing ${dateLabel} (IST)`
              : "Today's data (IST)"
          }
          color="primary"
          size="small"
          variant="outlined"
        />
      </Box>

      {/* Top summary cards */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Total Calls
            </Typography>
            <Typography variant="h5">
              {summary.totalCalls.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Incoming Calls
            </Typography>
            <Typography variant="h5">
              {summary.incomingCalls.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Dialled Calls
            </Typography>
            <Typography variant="h5">
              {summary.dialledCalls.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Dialled Connected
            </Typography>
            <Typography variant="h5">
              {summary.dialledConnected.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Answered outbound
            </Typography>
            <Typography variant="h5">
              {summary.answeredOutbound.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Missed
            </Typography>
            <Typography variant="h5">
              {summary.missed.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Avg Duration (sec)
            </Typography>
            <Typography variant="h5">
              {summary.avgDuration.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Agent-wise table */}
      <Paper>
        <Box p={2}>
          <Typography variant="subtitle1" mb={2}>
            Agent-wise Call Snapshot
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Total Dialled Calls</TableCell>
                  <TableCell align="right">Unique Dialled Calls</TableCell>
                  <TableCell align="right">Calls Connected</TableCell>
                  <TableCell align="right">Incoming Calls</TableCell>
                  <TableCell align="right">Missed Calls</TableCell>
                  <TableCell align="right">Avg Call Duration (s)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {agents.map((a) => (
                  <TableRow key={a.agent}>
                    <TableCell>{a.agent}</TableCell>
                    <TableCell align="right">
                      {a.totalDialled?.toLocaleString?.() ?? a.totalDialled ?? 0}
                    </TableCell>
                    <TableCell align="right">
                      {a.uniqueDialled?.toLocaleString?.() ?? a.uniqueDialled ?? 0}
                    </TableCell>
                    <TableCell align="right">
                      {a.callsConnected?.toLocaleString?.() ?? a.callsConnected ?? 0}
                    </TableCell>
                    <TableCell align="right">
                      {a.incomingCalls?.toLocaleString?.() ?? a.incomingCalls ?? 0}
                    </TableCell>
                    <TableCell align="right">
                      {a.missedCalls?.toLocaleString?.() ?? a.missedCalls ?? 0}
                    </TableCell>
                    <TableCell align="right">
                      {a.avgDuration?.toLocaleString?.() ?? a.avgDuration ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
                {!agents.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      {loading ? "Loading..." : "No data"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    </Box>
  );
}
