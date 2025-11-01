// src/components/TotalSalesDrilldown.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Grid,
  Button,
  TextField,
  Autocomplete,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Chip,
  Tooltip,
  Tabs,
  Tab,
  Alert,
} from "@mui/material";
import { FilterList, RestartAlt, PersonSearch, Group } from "@mui/icons-material";
import axios from "axios";

// ✅ Updated range options
const RANGE_OPTIONS = ["Today", "Yesterday", "Last 2 days", "Last one week", "Custom Date"];

const toISODate = (d) => d.toISOString().split("T")[0];

// Display date as dd/MM/yy
const toDisplayDate = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = String(dt.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const getRange = (label) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (label) {
    case "Today":
      break;
    case "Yesterday":
      start.setDate(now.getDate() - 1);
      end = new Date(start);
      break;
    case "Last 2 days":
      start.setDate(now.getDate() - 2);
      break;
    case "Last one week":
      start.setDate(now.getDate() - 6);
      break;
    default:
      break;
  }
  return { startDate: toISODate(start), endDate: toISODate(end) };
};

const fmtINR0 = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function TotalSalesDrilldown({ open, onClose, onApply, initialDates }) {
  // -------------------- State --------------------
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [leaders, setLeaders] = useState([]);

  const [tabMode, setTabMode] = useState("manager"); // 'manager' | 'agents'
  const [range, setRange] = useState("Today");
  const [customStart, setCustomStart] = useState(initialDates?.startDate || "");
  const [customEnd, setCustomEnd] = useState(initialDates?.endDate || "");
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [selectedAgents, setSelectedAgents] = useState([]);

  const [resultsLoading, setResultsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [resultsError, setResultsError] = useState("");
  const [daywiseResults, setDaywiseResults] = useState([]);

  // -------------------- Effects --------------------
  useEffect(() => {
    if (!open) return;
    setLoadingMeta(true);
    axios
      .get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees")
      .then(({ data }) => {
        const list = data || [];
        setEmployees(list);
        setLeaders(list.filter((e) => e.status === "active" && e.hasTeam === true));
      })
      .catch(() => {
        setEmployees([]);
        setLeaders([]);
      })
      .finally(() => setLoadingMeta(false));
  }, [open]);

  // -------------------- Derived --------------------
  const activeAgents = useMemo(
    () =>
      employees.filter(
        (e) =>
          e.status === "active" &&
          (e.role === "Sales Agent" || e.role === "Retention Agent")
      ),
    [employees]
  );

  const effectiveDates = useMemo(() => {
    if (range === "Custom Date") return { startDate: customStart, endDate: customEnd };
    return getRange(range);
  }, [range, customStart, customEnd]);

  const isDaywise =
    range === "Last one week" ||
    range === "Last 2 days" ||
    (range === "Custom Date" && customStart && customEnd);

  const canApply =
    effectiveDates.startDate &&
    effectiveDates.endDate &&
    (tabMode === "agents"
      ? selectedAgents.length > 0
      : Boolean(selectedLeader?.fullName));

  const grandTotal = results.reduce((acc, r) => acc + (r.total || 0), 0);

  const resetFilters = () => {
    setRange("Today");
    setCustomStart(initialDates?.startDate || "");
    setCustomEnd(initialDates?.endDate || "");
    setSelectedLeader(null);
    setSelectedAgents([]);
    setResults([]);
    setDaywiseResults([]);
    setResultsError("");
  };

  // -------------------- Apply --------------------
  const handleApply = async () => {
    setResultsError("");
    setResults([]);
    setDaywiseResults([]);
    setResultsLoading(true);

    const { startDate, endDate } = effectiveDates;

    try {
      let names = [];

      if (tabMode === "agents" && selectedAgents.length > 0) {
        names = selectedAgents.map((a) => a.fullName).filter(Boolean);
      } else if (tabMode === "manager" && selectedLeader?._id) {
        const { data: mgr } = await axios.get(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${selectedLeader._id}`
        );
        const teamMembers = (mgr?.teamMembers || []).filter(
          (m) => m?.status === "active" && m?.fullName
        );
        names = teamMembers.map((m) => m.fullName);
        if (names.length === 0) {
          setResultsError("No active team members found for this manager.");
          setResultsLoading(false);
          return;
        }
      } else {
        setResultsError(
          tabMode === "agents"
            ? "Please select at least one Agent."
            : "Please select a Manager who has a team."
        );
        setResultsLoading(false);
        return;
      }
 
      if (isDaywise) {
        const { data } = await axios.post(
          "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/daywise-matrix",
          {
            names,
            startDate,
            endDate,
          }
        );

        const formatted = data.map((row) => ({
          ...row,
          perDay: row.perDay.map((d) => ({
            ...d,
            label: toDisplayDate(d.date),
          })),
        }));

        formatted.sort((a, b) => b.grandTotal - a.grandTotal);
        setDaywiseResults(formatted);
      } else {
        // Normal simple total mode
        const calls = names.map((name) =>
          axios
            .get(
              "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/progress",
              { params: { name, from: startDate, to: endDate } }
            )
            .then(({ data }) => ({ name, total: Number(data?.total || 0) }))
            .catch(() => ({ name, total: 0 }))
        );
        const rows = await Promise.all(calls);
        rows.sort((a, b) => b.total - a.total);
        setResults(rows);
      }

      onApply?.({
        mode: tabMode,
        range,
        startDate,
        endDate,
        teamLeader: selectedLeader ? selectedLeader.fullName : "",
        agents: selectedAgents.map((a) => a.fullName),
      });
    } catch (e) {
      setResultsError("Failed to fetch totals. Please try again.");
    } finally {
      setResultsLoading(false);
    }
  };

  // -------------------- Styles --------------------
  const headSx = {
    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
    backgroundColor: "#0284c7",
  };

  const headCellSx = {
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.8rem",
    whiteSpace: "nowrap",
  };

  // -------------------- UI --------------------
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: { width: "100%", maxWidth: "1100px" },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 700, letterSpacing: 0.3 }}>
        Total Sales — Drilldown
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 1.5 }}>
        {/* Top Bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Tabs
            value={tabMode}
            onChange={(_, v) => setTabMode(v)}
            aria-label="View Mode"
            sx={{
              ".MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 42 },
            }}
          >
            <Tab icon={<Group sx={{ mr: 1 }} />} iconPosition="start" label="By Manager" value="manager" />
            <Tab icon={<PersonSearch sx={{ mr: 1 }} />} iconPosition="start" label="By Agents" value="agents" />
          </Tabs>

          <Tooltip title="Reset filters">
            <Button
              onClick={resetFilters}
              startIcon={<RestartAlt />}
              variant="outlined"
              color="inherit"
            >
              Reset
            </Button>
          </Tooltip>
        </Box>

        {/* Filters */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #eee" }}>
          <Grid container spacing={2} alignItems="center">
            {/* Date Range */}
            <Grid item xs={12} md={7}>
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                Date Range
              </Typography>
              <Box sx={{ mt: 1 }}>
                <ToggleButtonGroup
                  exclusive
                  value={range}
                  onChange={(_, v) => v && setRange(v)}
                  size="small"
                  sx={{
                    flexWrap: "wrap",
                    gap: 1,
                    "& .MuiToggleButton-root": {
                      borderRadius: 999,
                      px: 1.5,
                      py: 0.5,
                      borderColor: "#e5e7eb",
                    },
                  }}
                >
                  {RANGE_OPTIONS.map((opt) => (
                    <ToggleButton key={opt} value={opt}>
                      {opt}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                {range === "Custom Date" && (
                  <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
                    <TextField
                      size="small"
                      type="date"
                      label="Start"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      size="small"
                      type="date"
                      label="End"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Summary */}
            <Grid item xs={12} md={5}>
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                Summary
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  icon={<FilterList />}
                  variant="outlined"
                  label={
                    effectiveDates.startDate && effectiveDates.endDate
                      ? `Selected: ${effectiveDates.startDate} → ${effectiveDates.endDate}`
                      : "Select a date range"
                  }
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Manager / Agent Selector */}
            {tabMode === "manager" ? (
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={leaders}
                  loading={loadingMeta}
                  getOptionLabel={(o) => o?.fullName || ""}
                  value={selectedLeader}
                  onChange={(_, v) => setSelectedLeader(v)}
                  renderInput={(params) => (
                    <TextField {...params} label="Manager" size="small" placeholder="Type to search manager" />
                  )}
                />
              </Grid>
            ) : (
              <Grid item xs={12} md={8}>
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  options={activeAgents}
                  loading={loadingMeta}
                  getOptionLabel={(o) => o?.fullName || ""}
                  value={selectedAgents}
                  onChange={(_, v) => setSelectedAgents(v)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Agents (Active Sales + Retention)"
                      size="small"
                      placeholder="Search and select agents"
                    />
                  )}
                />
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Results */}
        <Box sx={{ mt: 2 }}>
          {resultsError && <Alert severity="error" sx={{ mb: 2 }}>{resultsError}</Alert>}

          {resultsLoading ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : isDaywise ? (
            daywiseResults.length > 0 ? (
              <Paper sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid #eee", width: "100%", overflowX: "auto" }}>
                <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Day-wise Results</Typography>
                  <Chip
                    label={`Total: ₹${fmtINR0(
                      daywiseResults.reduce((acc, r) => acc + (r.grandTotal || 0), 0)
                    )}`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
                <Divider />
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={headSx}>
                      <TableCell sx={{ ...headCellSx, backgroundColor: headSx.backgroundColor }}>Name</TableCell>
                      {daywiseResults[0]?.perDay?.map((d) => (
                        <TableCell key={d.label} align="right" sx={{ ...headCellSx, backgroundColor: headSx.backgroundColor }}>
                          {d.label}
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ ...headCellSx, backgroundColor: headSx.backgroundColor }}>Total</TableCell>
                    </TableRow>

                    {tabMode === "manager" && (
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                        {daywiseResults[0]?.perDay?.map((d, idx) => {
                          const daySum = daywiseResults.reduce(
                            (sum, row) => sum + (row.perDay[idx]?.total || 0),
                            0
                          );
                          return (
                            <TableCell key={d.label} align="right" sx={{ fontWeight: 700 }}>
                              ₹{fmtINR0(daySum)}
                            </TableCell>
                          );
                        })}
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          ₹{fmtINR0(
                            daywiseResults.reduce(
                              (sum, row) => sum + (row.grandTotal || 0),
                              0
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableHead>
                  <TableBody>
                    {daywiseResults.map((row) => (
                      <TableRow key={row.name} hover>
                        <TableCell>{row.name}</TableCell>
                        {row.perDay.map((d) => (
                          <TableCell key={d.label} align="right">
                            ₹{fmtINR0(d.total)}
                          </TableCell>
                        ))}
                        <TableCell align="right">₹{fmtINR0(row.grandTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            ) : (
              <Paper elevation={0} sx={{ p: 3, textAlign: "center", border: "1px dashed #d1d5db", borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>No results yet.</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
                  Choose a manager / agent and click Apply.
                </Typography>
              </Paper>
            )
          ) : results.length > 0 ? (
            <Paper sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid #eee" }}>
              <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Results</Typography>
                <Chip
                  label={`Total: ₹${fmtINR0(grandTotal)}`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <Divider />
              <Table size="small">
                <TableHead>
                  <TableRow sx={headSx}>
                    <TableCell sx={headCellSx}>Name</TableCell>
                    <TableCell sx={headCellSx} align="right">
                      Total Sales
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.name} hover>
                      <TableCell>{r.name}</TableCell>
                      <TableCell align="right">₹{fmtINR0(r.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ p: 3, textAlign: "center", border: "1px dashed #d1d5db", borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>No results yet.</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
                Choose a date range and a{" "}
                {tabMode === "manager" ? "manager" : "one or more agents"}, then click Apply.
              </Typography>
            </Paper>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Close</Button>
        <Button onClick={handleApply} variant="contained" disabled={!canApply} sx={{ px: 3, fontWeight: 700 }}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
