// src/components/TotalSalesDrilldown.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Grid,
  Button,
  TextField,
  Autocomplete,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableFooter,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  IconButton,
  Stack,
  TableContainer,
  Alert
} from "@mui/material";
import {
  RestartAlt,
  PersonSearch,
  Group,
  TrendingUp,
  Close,
  Payments,
  ChevronRight
} from "@mui/icons-material";
import axios from "axios";


// --- Configuration & Helpers ---
const RANGE_OPTIONS = ["Today", "Yesterday", "Last 2 days", "Last one week", "Custom Date"];
const toISODate = (d) => d.toISOString().split("T")[0];


const toDisplayDate = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
};


const getRange = (label) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  switch (label) {
    case "Yesterday": start.setDate(now.getDate() - 1); end = new Date(start); break;
    case "Last 2 days": start.setDate(now.getDate() - 2); break;
    case "Last one week": start.setDate(now.getDate() - 6); break;
    default: break;
  }
  return { startDate: toISODate(start), endDate: toISODate(end) };
};


const fmtINR = (n) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;


const EmptyState = () => (
  <Stack
    alignItems="center"
    justifyContent="center"
    sx={{ height: 400, border: "2px dashed #eee", borderRadius: 4, textAlign: "center" }}
  >
    <Payments sx={{ fontSize: 48, color: "#eee", mb: 2 }} />
    <Typography variant="body1" fontWeight={700} color="text.secondary">
      No Data Generated
    </Typography>
    <Typography variant="caption" color="text.secondary">
      Configure filters on the left and click "Generate Report"
    </Typography>
  </Stack>
);


export default function TotalSalesDrilldown({ open, onClose, initialDates }) {
  // -------------------- State --------------------
  const [employees, setEmployees] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [tabMode, setTabMode] = useState("manager");
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
    axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees")
      .then(({ data }) => {
        const list = data || [];
        setEmployees(list);
        setLeaders(list.filter((e) => e.status === "active" && e.hasTeam === true));
      })
      .catch(() => { setEmployees([]); setLeaders([]); });
  }, [open]);


  // -------------------- Derived Logic --------------------
  const activeAgents = useMemo(() =>
    employees.filter(e => e.status === "active" && (e.role === "Sales Agent" || e.role === "Retention Agent")),
    [employees]
  );


  const effectiveDates = useMemo(() => {
    if (range === "Custom Date") return { startDate: customStart, endDate: customEnd };
    return getRange(range);
  }, [range, customStart, customEnd]);


  const isDaywise = range === "Last one week" || range === "Last 2 days" || (range === "Custom Date" && customStart && customEnd);


  const canApply = effectiveDates.startDate && effectiveDates.endDate &&
    (tabMode === "agents" ? selectedAgents.length > 0 : Boolean(selectedLeader?.fullName));


  const calculatedGrandTotal = useMemo(() => {
    if (isDaywise) return daywiseResults.reduce((acc, r) => acc + (r.grandTotal || 0), 0);
    return results.reduce((acc, r) => acc + (r.total || 0), 0);
  }, [isDaywise, daywiseResults, results]);


  // Calculate vertical totals for the footer
  const columnTotals = useMemo(() => {
    if (!isDaywise || daywiseResults.length === 0) return [];
    const totals = daywiseResults[0].perDay.map((_, colIndex) => {
      return daywiseResults.reduce((sum, row) => sum + (row.perDay[colIndex]?.total || 0), 0);
    });
    return totals;
  }, [isDaywise, daywiseResults]);


  // -------------------- Actions --------------------
  const handleApply = async () => {
    setResultsError(""); setResults([]); setDaywiseResults([]); setResultsLoading(true);
    const { startDate, endDate } = effectiveDates;
    try {
      let names = [];
      if (tabMode === "agents") {
        names = selectedAgents.map(a => a.fullName).filter(Boolean);
      } else if (tabMode === "manager" && selectedLeader?._id) {
        const { data: mgr } = await axios.get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${selectedLeader._id}`);
        names = (mgr?.teamMembers || []).filter(m => m?.status === "active").map(m => m.fullName);
      }
     
      if (!names.length) throw new Error("No active users found for selection.");


      if (isDaywise) {
        const { data } = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/daywise-matrix", { names, startDate, endDate });
        setDaywiseResults(data.map(row => ({
          ...row,
          perDay: row.perDay.map(d => ({ ...d, label: toDisplayDate(d.date) }))
        })).sort((a, b) => b.grandTotal - a.grandTotal));
      } else {
        const rows = await Promise.all(names.map(name =>
          axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/progress", { params: { name, from: startDate, to: endDate } })
          .then(({ data }) => ({ name, total: Number(data?.total || 0) }))
          .catch(() => ({ name, total: 0 }))
        ));
        setResults(rows.sort((a, b) => b.total - a.total));
      }
    } catch (e) {
      setResultsError(e.message || "Failed to fetch data.");
    } finally {
      setResultsLoading(false);
    }
  };


  const resetFilters = () => {
    setRange("Today");
    setResults([]);
    setDaywiseResults([]);
    setSelectedLeader(null);
    setSelectedAgents([]);
    setResultsError("");
  };


  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}>
      <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#000", color: "#fff" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ bgcolor: "#333", p: 0.8, borderRadius: 1.5, display: "flex" }}><TrendingUp fontSize="small" /></Box>
          <Typography variant="h6" fontWeight={800} letterSpacing="-0.5px">Sales Analytics Drilldown</Typography>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: "#fff" }}><Close /></IconButton>
      </Box>


      <DialogContent sx={{ p: 0, bgcolor: "#fcfcfc" }}>
        <Grid container sx={{ height: "100%" }}>
          <Grid item xs={12} md={3.5} sx={{ p: 2.5, borderRight: "1px solid #eee" }}>
            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ mb: 2, display: "block", textTransform: "uppercase" }}>View Configuration</Typography>
           
            <Tabs
              value={tabMode} onChange={(_, v) => setTabMode(v)}
              sx={{ mb: 3, minHeight: 44, bgcolor: "#f1f1f1", p: 0.5, borderRadius: 2.5, "& .MuiTabs-indicator": { display: "none" } }}
            >
              <Tab icon={<Group sx={{ fontSize: 18 }} />} label="Team" value="manager" sx={{ flex: 1, textTransform: "none", fontWeight: 700, borderRadius: 2, "&.Mui-selected": { bgcolor: "#fff", color: "#000" } }} />
              <Tab icon={<PersonSearch sx={{ fontSize: 18 }} />} label="Agents" value="agents" sx={{ flex: 1, textTransform: "none", fontWeight: 700, borderRadius: 2, "&.Mui-selected": { bgcolor: "#fff", color: "#000" } }} />
            </Tabs>


            <Stack spacing={2.5}>
              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>Date Range</Typography>
                <ToggleButtonGroup
                  exclusive value={range} onChange={(_, v) => v && setRange(v)} size="small"
                  sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5, "& .MuiToggleButton-root": { border: "1px solid #eee !important", borderRadius: "8px !important", textTransform: "none", fontWeight: 600 } }}
                >
                  {RANGE_OPTIONS.map((opt) => <ToggleButton key={opt} value={opt} sx={{ py: 0.5 }}>{opt}</ToggleButton>)}
                </ToggleButtonGroup>
              </Box>


              {range === "Custom Date" && (
                <Stack spacing={1}>
                  <TextField size="small" type="date" label="Start" value={customStart} onChange={(e) => setCustomStart(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                  <TextField size="small" type="date" label="End" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                </Stack>
              )}


              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>{tabMode === "manager" ? "Select Manager" : "Select Agents"}</Typography>
                {tabMode === "manager" ? (
                  <Autocomplete
                    options={leaders} getOptionLabel={(o) => o?.fullName || ""}
                    value={selectedLeader} onChange={(_, v) => setSelectedLeader(v)}
                    renderInput={(params) => <TextField {...params} placeholder="Search manager..." size="small" />}
                  />
                ) : (
                  <Autocomplete
                    multiple options={activeAgents} getOptionLabel={(o) => o?.fullName || ""}
                    value={selectedAgents} onChange={(_, v) => setSelectedAgents(v)}
                    renderInput={(params) => <TextField {...params} placeholder="Select agents..." size="small" />}
                  />
                )}
              </Box>


              <Button
                onClick={handleApply} variant="contained" disabled={!canApply || resultsLoading}
                sx={{ bgcolor: "#000", py: 1.2, borderRadius: 2, fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: "#222" } }}
              >
                {resultsLoading ? <CircularProgress size={20} color="inherit" /> : "Generate Report"}
              </Button>
             
              <Button onClick={resetFilters} startIcon={<RestartAlt />} sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600 }}>Reset Filters</Button>
            </Stack>
          </Grid>


          <Grid item xs={12} md={8.5} sx={{ bgcolor: "#fff", display: "flex", flexDirection: "column" }}>
            <Box sx={{ p: 2, borderBottom: "1px solid #eee", bgcolor: "#fafafa" }}>
              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL SALES REVENUE</Typography>
                  <Typography variant="h5" fontWeight={900} color="#000">{fmtINR(calculatedGrandTotal)}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>PERIOD</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                    {effectiveDates.startDate} <ChevronRight sx={{ fontSize: 14 }} /> {effectiveDates.endDate}
                  </Typography>
                </Box>
              </Stack>
            </Box>


            <Box sx={{ p: 2, flexGrow: 1, overflow: "hidden" }}>
              {resultsError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{resultsError}</Alert>}


              {resultsLoading ? (
                <Stack alignItems="center" justifyContent="center" sx={{ height: 400 }}>
                  <CircularProgress color="inherit" size={30} />
                </Stack>
              ) : (daywiseResults.length > 0 || results.length > 0) ? (
                <Paper elevation={0} sx={{ border: "1px solid #eee", borderRadius: 3, overflow: "hidden" }}>
                  <TableContainer
                    sx={{
                      maxHeight: "60vh",
                      overflowY: "auto",
                      overflowX: "auto",
                      "&::-webkit-scrollbar": { width: 6, height: 6 },
                      "&::-webkit-scrollbar-thumb": { bgcolor: "#ccc", borderRadius: 3 }
                    }}
                  >
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: "#000", color: "#fff", fontWeight: 700, position: "sticky", left: 0, zIndex: 12 }}>Expert Name</TableCell>
                          {isDaywise ? (
                            <>
                              {daywiseResults[0]?.perDay?.map((d) => (
                                <TableCell key={d.label} align="right" sx={{ bgcolor: "#000", color: "#fff", fontWeight: 700 }}>{d.label}</TableCell>
                              ))}
                              <TableCell align="right" sx={{ bgcolor: "#000", color: "#fff", fontWeight: 800 }}>TOTAL</TableCell>
                            </>
                          ) : (
                            <TableCell align="right" sx={{ bgcolor: "#000", color: "#fff", fontWeight: 700 }}>Total Revenue</TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {isDaywise ? daywiseResults.map((row) => (
                          <TableRow key={row.name} hover>
                            <TableCell sx={{ fontWeight: 700, position: "sticky", left: 0, bgcolor: "#fff", zIndex: 5, borderRight: "2px solid #f1f1f1" }}>{row.name}</TableCell>
                            {row.perDay.map((d, i) => <TableCell key={i} align="right">{fmtINR(d.total)}</TableCell>)}
                            <TableCell align="right" sx={{ fontWeight: 900, bgcolor: "#f8f9fa" }}>{fmtINR(row.grandTotal)}</TableCell>
                          </TableRow>
                        )) : results.map((r) => (
                          <TableRow key={r.name} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{r.name}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 900, color: "primary.main" }}>{fmtINR(r.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      {/* --- Added Footer for Date-wise Totals --- */}
                      {isDaywise && (
                        <TableFooter sx={{ position: "sticky", bottom: 0, zIndex: 10, bgcolor: "#f1f1f1" }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 900, position: "sticky", left: 0, bgcolor: "#f1f1f1", zIndex: 11 }}>TOTAL SALES</TableCell>
                            {columnTotals.map((total, idx) => (
                              <TableCell key={idx} align="right" sx={{ fontWeight: 900, color: "#000" }}>
                                {fmtINR(total)}
                              </TableCell>
                            ))}
                            <TableCell align="right" sx={{ fontWeight: 900, bgcolor: "#000", color: "#fff" }}>
                              {fmtINR(calculatedGrandTotal)}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      )}
                    </Table>
                  </TableContainer>
                </Paper>
              ) : (
                <EmptyState />
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}

