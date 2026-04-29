import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export default function RetentionOverviewCombined() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lookbackDays] = useState(540);
  const [expertSummary, setExpertSummary] = useState({ combined: {}, experts: [] });
  const [sortBy, setSortBy] = useState("totalActiveCustomers");
  const [sortDir, setSortDir] = useState("desc");

  const API_BASE = (process.env.REACT_APP_API_BASE_URL || "http://localhost:5001").replace(/\/+$/, "");
  const buildUrl = (path) => `${API_BASE}${path}`;

  const fetchJson = async (path) => {
    const res = await fetch(buildUrl(path), { headers: { Accept: "application/json" } });
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const raw = await res.text();

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${raw.slice(0, 180)}`);
    }
    if (!contentType.includes("application/json")) {
      throw new Error(`Expected JSON but got ${contentType || "unknown"}: ${raw.slice(0, 180)}`);
    }

    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON response: ${raw.slice(0, 180)}`);
    }
  };

  const fetchExpertSummary = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ lookbackDays: String(lookbackDays) });
      const json = await fetchJson(`/cohart-dataApi/active-customers-expert-summary?${params.toString()}`);
      setExpertSummary({
        combined: json?.combined || {},
        experts: Array.isArray(json?.experts) ? json.experts : [],
      });
    } catch (e) {
      setError(String(e.message || e));
      setExpertSummary({ combined: {}, experts: [] });
    } finally {
      setLoading(false);
    }
  };

  const pct = (count, total) => {
    const c = Number(count || 0);
    const t = Number(total || 0);
    if (!t) return "0.0%";
    return `${((c / t) * 100).toFixed(1)}%`;
  };

  const openCategoryInNewTab = (category) => {
    try {
      const rawUser = sessionStorage.getItem("user");
      if (rawUser) {
        const userObj = JSON.parse(rawUser);
        localStorage.setItem(
          "session:user:bridge",
          JSON.stringify({ user: userObj, ts: Date.now() })
        );
      }
    } catch {
      // no-op
    }
    const href = `/retention/overview-combined/details/${category}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const pctNum = (count, total) => {
    const c = Number(count || 0);
    const t = Number(total || 0);
    if (!t) return 0;
    return (c / t) * 100;
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDir("desc");
  };

  const sortedExperts = [...(expertSummary?.experts || [])].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortBy === "totalActiveCustomers") {
      const av = Number(a?.totalActiveCustomers || 0);
      const bv = Number(b?.totalActiveCustomers || 0);
      if (av !== bv) return (av - bv) * dir;
      return String(a?.healthExpert || "").localeCompare(String(b?.healthExpert || ""));
    }

    if (["finished", "next10Days", "next10to20Days", "supply20PlusDays"].includes(sortBy)) {
      const ap = pctNum(a?.[sortBy], a?.totalActiveCustomers);
      const bp = pctNum(b?.[sortBy], b?.totalActiveCustomers);
      if (ap !== bp) return (ap - bp) * dir;
      return String(a?.healthExpert || "").localeCompare(String(b?.healthExpert || ""));
    }
    return 0;
  });

  useEffect(() => {
    fetchExpertSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookbackDays]);

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ borderRadius: 3, border: "1px solid #D4DFEC", boxShadow: "0 16px 34px rgba(15,23,42,0.1)", background: "linear-gradient(165deg, #FFFFFF 0%, #F6FAFF 100%)" }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A" }}>
              Retention Overview Combined
            </Typography>
            <Button onClick={fetchExpertSummary} variant="outlined" size="small">Refresh</Button>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load data: {error}</Alert>}

          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Loading combined retention overview…</Typography>
            </Stack>
          ) : (
            <>
              <Card sx={{ borderRadius: 2, border: "1px solid #E2E8F0", mb: 2 }}>
                <CardContent sx={{ p: 1.5 }}>
                  <Typography sx={{ fontWeight: 800, color: "#0F172A", mb: 1 }}>
                    Combined Active Customers
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Chip
                        label={`Total Active: ${expertSummary?.combined?.totalActiveCustomers || 0} (100.0%)`}
                        sx={{ bgcolor: "#EEF2FF", border: "1px solid #C7D2FE", fontWeight: 700, width: "100%" }}
                        onClick={() => openCategoryInNewTab("totalActive")}
                        clickable
                        icon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Chip
                        label={`Finished: ${expertSummary?.combined?.finished || 0} (${pct(expertSummary?.combined?.finished, expertSummary?.combined?.totalActiveCustomers)})`}
                        sx={{ bgcolor: "#FEE2E2", border: "1px solid #FCA5A5", fontWeight: 700, width: "100%" }}
                        onClick={() => openCategoryInNewTab("finished")}
                        clickable
                        icon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Chip
                        label={`Finishing in 10 Days: ${expertSummary?.combined?.next10Days || 0} (${pct(expertSummary?.combined?.next10Days, expertSummary?.combined?.totalActiveCustomers)})`}
                        sx={{ bgcolor: "#FFEDD5", border: "1px solid #FDBA74", fontWeight: 700, width: "100%" }}
                        onClick={() => openCategoryInNewTab("next10Days")}
                        clickable
                        icon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Chip
                        label={`10–20 Days: ${expertSummary?.combined?.next10to20Days || 0} (${pct(expertSummary?.combined?.next10to20Days, expertSummary?.combined?.totalActiveCustomers)})`}
                        sx={{ bgcolor: "#FEF9C3", border: "1px solid #FDE047", fontWeight: 700, width: "100%" }}
                        onClick={() => openCategoryInNewTab("next10to20Days")}
                        clickable
                        icon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Chip
                        label={`20+ Days: ${expertSummary?.combined?.supply20PlusDays || 0} (${pct(expertSummary?.combined?.supply20PlusDays, expertSummary?.combined?.totalActiveCustomers)})`}
                        sx={{ bgcolor: "#DCFCE7", border: "1px solid #86EFAC", fontWeight: 700, width: "100%" }}
                        onClick={() => openCategoryInNewTab("supply20PlusDays")}
                        clickable
                        icon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 2, border: "1px solid #E2E8F0", mb: 2 }}>
                <CardContent sx={{ p: 1.5 }}>
                  <Typography sx={{ fontWeight: 800, color: "#0F172A", mb: 1 }}>
                    Retention Experts Summary (Active Customers Only)
                  </Typography>
                  <TableContainer sx={{ border: "1px solid #E2E8F0", borderRadius: 2, maxHeight: 420 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Health Expert</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            <TableSortLabel
                              active={sortBy === "totalActiveCustomers"}
                              direction={sortBy === "totalActiveCustomers" ? sortDir : "desc"}
                              onClick={() => handleSort("totalActiveCustomers")}
                              sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                            >
                              Total Active Customers
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            <TableSortLabel
                              active={sortBy === "finished"}
                              direction={sortBy === "finished" ? sortDir : "desc"}
                              onClick={() => handleSort("finished")}
                              sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                            >
                              Finished
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            <TableSortLabel
                              active={sortBy === "next10Days"}
                              direction={sortBy === "next10Days" ? sortDir : "desc"}
                              onClick={() => handleSort("next10Days")}
                              sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                            >
                              Finishing in 10 Days
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            <TableSortLabel
                              active={sortBy === "next10to20Days"}
                              direction={sortBy === "next10to20Days" ? sortDir : "desc"}
                              onClick={() => handleSort("next10to20Days")}
                              sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                            >
                              10–20 Days
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            <TableSortLabel
                              active={sortBy === "supply20PlusDays"}
                              direction={sortBy === "supply20PlusDays" ? sortDir : "desc"}
                              onClick={() => handleSort("supply20PlusDays")}
                              sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                            >
                              20+ Days
                            </TableSortLabel>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedExperts.map((r) => (
                          <TableRow key={r.healthExpert} hover>
                            <TableCell>{r.healthExpert}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>{r.totalActiveCustomers || 0}</TableCell>
                            <TableCell align="center">
                              <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>{r.finished || 0}</Typography>
                              <Typography variant="caption" sx={{ color: "#64748B", lineHeight: 1.1 }}>
                                ({pct(r.finished, r.totalActiveCustomers)})
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>{r.next10Days || 0}</Typography>
                              <Typography variant="caption" sx={{ color: "#64748B", lineHeight: 1.1 }}>
                                ({pct(r.next10Days, r.totalActiveCustomers)})
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>{r.next10to20Days || 0}</Typography>
                              <Typography variant="caption" sx={{ color: "#64748B", lineHeight: 1.1 }}>
                                ({pct(r.next10to20Days, r.totalActiveCustomers)})
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>{r.supply20PlusDays || 0}</Typography>
                              <Typography variant="caption" sx={{ color: "#64748B", lineHeight: 1.1 }}>
                                ({pct(r.supply20PlusDays, r.totalActiveCustomers)})
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
