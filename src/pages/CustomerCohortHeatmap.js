import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Box,
  Card,
  Typography,
  Stack,
  TextField,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  MenuItem,
  Select,
  Skeleton,
  LinearProgress,
} from "@mui/material";




const COMMON_COLORS = ["#2C5F6F", "#3A8F9F", "#5FB8A8", "#80CBC4"];


// Format large numbers → "1.2k", "3.1m"
const formatNumber = (num) => {
  if (!num || num <= 0) return "";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "m";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "k";
  return num.toString();
};




function getRawMetricValue(m, metric) {
  if (!m) return 0;
  switch (metric) {
    case "retention":
      return m.retention || 0;
    case "customers":
      return m.customers || 0;
    case "aov":
      return m.aov || 0;
    case "sales":
      return m.total_sales || 0;
    default:
      return 0;
  }
}


function getDisplayMetricValue(m, metric) {
  if (!m) return "";
  switch (metric) {
    case "retention":
      return m.retention ? (m.retention * 100).toFixed(1) + "%" : "";
    case "customers":
      return m.customers > 0 ? m.customers : "";
    case "aov":
      return m.aov > 0 ? "₹" + Math.round(m.aov) : "";
    case "sales":
      return m.total_sales > 0 ? "₹" + formatNumber(m.total_sales) : "";
    default:
      return "";
  }
}


function getHeatColor(value, maxVal) {
  if (!value || !maxVal) return "transparent";
  const ratio = value / maxVal;


  if (ratio < 0.25) return COMMON_COLORS[3];
  if (ratio < 0.5) return COMMON_COLORS[2];
  if (ratio < 0.75) return COMMON_COLORS[1];
  return COMMON_COLORS[0];
}


function getTextColor(bg) {
  if (bg === "transparent") return "#000";
  return [COMMON_COLORS[3], COMMON_COLORS[2]].includes(bg) ? "#000" : "#fff";
}




export default function CustomerCohortHeatmap() {
  const API = "https://muditamleads-14f32a10d7f7.herokuapp.com";


  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);


  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");


  const [metric, setMetric] = useState("retention");
  const [show36, setShow36] = useState(false);


  const loadCohort = async () => {
    let progressInterval;
   
    try {
      setLoading(true);
      setLoadingProgress(0);


      const params = {
        maxMonths: show36 ? 36 : 12,
      };


      if (start) params.start = start;
      if (end) params.end = end;
      let currentProgress = 0;
      progressInterval = setInterval(() => {
        currentProgress += 5;
        if (currentProgress <= 90) {
          setLoadingProgress(currentProgress);
        }
      }, 200);


      const startTime = Date.now();
     
      const res = await axios.get(
        `${API}/api/super-admin/analytics/cohort-analysis`,
        { params }
      );


      const elapsed = Date.now() - startTime;
      console.log(`⚡ Data loaded in ${elapsed}ms`);


      clearInterval(progressInterval);
      setLoadingProgress(95);
     
      setCohorts(res.data.cohorts || []);
     
      setLoadingProgress(100);


      await new Promise(resolve => setTimeout(resolve, 300));
     
    } catch (err) {
      console.error("LOAD ERROR:", err);
      setCohorts([]);
      clearInterval(progressInterval);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };




  useEffect(() => {
    loadCohort();


  }, [show36]);


  function formatCohortLabel(key) {
    const [y, m] = key.split("-");
    return new Date(y, m - 1).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
  }




function getMaxMonthsToShow(cohortKey) {
  const [y, m] = cohortKey.split("-").map(Number);
  const cohortDate = new Date(y, m - 1);
  const today = new Date();


  const diff =
    (today.getFullYear() - cohortDate.getFullYear()) * 12 +
    (today.getMonth() - cohortDate.getMonth());




  return Math.min(diff + 1, show36 ? 36 : 12);
}






  const metricMax = useMemo(() => {
    if (!cohorts.length) return 0;


    let maxVal = 0;
    const limit = show36 ? 36 : 12;


    for (const row of cohorts) {
      const slice = row.months.slice(0, limit);
      for (const m of slice) {
        const raw = getRawMetricValue(m, metric);
        if (raw > maxVal) maxVal = raw;
      }
    }
    return maxVal;
  }, [cohorts, metric, show36]);


function computeSummary(row) {
  if (metric !== "retention") {
    const m0 = row.months[0];
    return getDisplayMetricValue(m0, metric);
  }


  const limit = show36 ? 36 : 12;
  const months = row.months.slice(0, limit);


  let sum = 0;
  let count = 0;


  for (const m of months) {
    if (m && typeof m.retention === "number") {
      sum += m.retention;
      count++;
    }
  }


  if (!count) return "";
  return ((sum / count) * 100).toFixed(1) + "%";
}


  const renderSkeleton = () =>
    [...Array(5)].map((_, i) => (
      <TableRow key={i}>
        {[...Array(show36 ? 40 : 16)].map((__, j) => (
          <TableCell key={j}>
            <Skeleton height={28} />
          </TableCell>
        ))}
      </TableRow>
    ));




  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Customer Cohort Analytics
      </Typography>


      {/* LOADING PROGRESS */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={loadingProgress} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Loading cohort data... {loadingProgress}%
          </Typography>
        </Box>
      )}


      {/* FILTER BAR */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField
              type="date"
              label="Start Date"
              InputLabelProps={{ shrink: true }}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              size="small"
              disabled={loading}
            />


            <TextField
              type="date"
              label="End Date"
              InputLabelProps={{ shrink: true }}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              size="small"
              disabled={loading}
            />


            <Button variant="contained" onClick={loadCohort} disabled={loading}>
              Apply
            </Button>


            <Button
              variant="outlined"
              onClick={() => {
                setStart("");
                setEnd("");
                loadCohort();
              }}
              disabled={loading}
            >
              Clear
            </Button>
          </Stack>


          <Box sx={{ flexGrow: 1 }} />


          {/* METRIC SWITCH */}
          <Stack direction="row" spacing={2}>
            <Select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              size="small"
              sx={{ minWidth: 220 }}
              disabled={loading}
            >
              <MenuItem value="retention">📈 Avg Retention %</MenuItem>
              <MenuItem value="customers">👥 Total Customers</MenuItem>
              <MenuItem value="aov">💰 AOV</MenuItem>
              <MenuItem value="sales">💵 Total Sales</MenuItem>
            </Select>


            <Button
              variant="outlined"
              onClick={() => setShow36((prev) => !prev)}
              disabled={loading}
            >
              {show36 ? "Show 12 Months" : "Show 36 Months"}
            </Button>
          </Stack>
        </Stack>
      </Card>


      {/* DATA SUMMARY */}
      {!loading && cohorts.length > 0 && (
        <Card sx={{ p: 2, mb: 2, bgcolor: "#f5f5f5" }}>
          <Typography variant="body2" color="text.secondary">
            📊 Showing {cohorts.length} cohorts |
            {cohorts.reduce((sum, c) => sum + c.customers, 0).toLocaleString()} total customers
          </Typography>
        </Card>
      )}


      {/* TABLE */}
      <Card sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 1800 }}>
          <TableHead sx={{ background: "#F5F5F5" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Cohort</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Customers</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>
  {metric === "retention" && "Retention"}
  {metric === "customers" && "Total"}
  {metric === "sales" && "Total"}
  {metric === "aov" && "Aov "}
</TableCell>


              {Array.from({ length: show36 ? 36 : 12 }).map((_, i) => (
                <TableCell
                  key={i}
                  sx={{ fontWeight: 700, textAlign: "center" }}
                >
                  M{i}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>


          <TableBody>
            {loading ? (
              renderSkeleton()
            ) : cohorts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={show36 ? 40 : 16} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No cohort data available for the selected period
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              cohorts.map((row) => {
                const maxMonths = getMaxMonthsToShow(row.cohort);
                const limit = show36 ? 36 : 12;


                const displayedMonths = row.months.slice(0, limit );


                return (
                  <TableRow key={row.cohort}>
                    <TableCell>{formatCohortLabel(row.cohort)}</TableCell>
                    <TableCell>{row.customers.toLocaleString()}</TableCell>


                   
                    <TableCell sx={{ fontWeight: 700 }}>
                      {computeSummary(row)}
                    </TableCell>


                    {displayedMonths.map((m, idx) => {
                     if (idx >= maxMonths)


                        return (
                          <TableCell key={idx} sx={{ background: "#EEE" }} />
                        );


                      const raw = getRawMetricValue(m, metric);
                      const display = getDisplayMetricValue(m, metric);


                      if (!display) return <TableCell key={idx} />;


                      const bg = getHeatColor(raw, metricMax);


                      return (
                        <TableCell
                          key={idx}
                          sx={{
                            textAlign: "center",
                            backgroundColor: bg,
                            color: getTextColor(bg),
                            fontWeight: 600,
                          }}
                        >
                          {display}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}

