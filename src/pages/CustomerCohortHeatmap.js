import React, { useEffect, useState } from "react";
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
  Skeleton,
  Chip,
} from "@mui/material";


// Format cohort label → "Jan 2025"
function formatCohortLabel(key) {
  const [y, m] = key.split("-");
  const date = new Date(y, m - 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}


// Heatmap colors - match your funnel theme
const COMMON_COLORS = ['#2C5F6F', '#3A8F9F', '#5FB8A8', '#80CBC4'];


function getHeatColor(percent) {
  if (!percent || percent === "") return "#FFFFFF";
 
  const n = parseFloat(percent);
 
  if (isNaN(n) || n <= 0) return "#FFFFFF";      // empty
  if (n < 5) return COMMON_COLORS[3];            // lightest teal
  if (n < 10) return COMMON_COLORS[2];           // light teal
  if (n < 20) return COMMON_COLORS[1];           // medium teal
  return COMMON_COLORS[0];                       // darkest teal
}


function getTextColor(bgColor) {
  // Light teal = black text, dark teal = white text
  return [COMMON_COLORS[3], COMMON_COLORS[2]].includes(bgColor) ? "black" : "white";
}


export default function CustomerCohortHeatmap() {
  const API = "https://muditamleads-14f32a10d7f7.herokuapp.com";


  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");


  const loadCohort = async () => {
    try {
      setLoading(true);
      setError("");


      const params = {};
      if (start) params.start = start;
      if (end) params.end = end;


      const res = await axios.get(
        `${API}/api/super-admin/analytics/cohort-analysis`,
        { params }
      );


      setCohorts(res.data.cohorts || []);
    } catch (err) {
      console.error("COHORT FETCH ERROR:", err);
      setError(err.message || "Failed to load cohort data");
      setCohorts([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadCohort();
  }, []);


  const renderSkeletonRows = () =>
    [...Array(6)].map((_, i) => (
      <TableRow key={i}>
        {[...Array(16)].map((_, j) => (
          <TableCell key={j}>
            <Skeleton variant="rectangular" height={32} />
          </TableCell>
        ))}
      </TableRow>
    ));


  return (
    <Box sx={{ p: 3, backgroundColor: "#FAFAFA", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          📊 Customer Cohort Retention Analysis
        </Typography>
        <Typography variant="body2" sx={{ color: "gray" }}>


        </Typography>
      </Box>


      {/* Filter Card */}
      <Card sx={{ p: 2.5, mb: 3, borderRadius: 2, boxShadow: 1 }}>
        <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ flexWrap: "wrap" }}>
          <TextField
            type="date"
            label="Start Date"
            InputLabelProps={{ shrink: true }}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />


          <TextField
            type="date"
            label="End Date"
            InputLabelProps={{ shrink: true }}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />


          <Button
            variant="contained"
            onClick={loadCohort}
            disabled={loading}
            sx={{ backgroundColor: COMMON_COLORS[0] }}
          >
            {loading ? "Loading..." : "Apply Range"}
          </Button>


          <Button
            variant="outlined"
            onClick={() => {
              setStart("");
              setEnd("");
              setCohorts([]);
            }}
          >
            Clear Filters
          </Button>
        </Stack>
      </Card>


      {/* Error Message */}
      {error && (
        <Card sx={{ p: 2, mb: 3, backgroundColor: "#FFEBEE", borderLeft: "4px solid #C62828" }}>
          <Typography sx={{ color: "#C62828" }}>❌ {error}</Typography>
        </Card>
      )}




      {/* Heatmap Table */}
      <Card sx={{ overflowX: "auto", borderRadius: 2, boxShadow: 1 }}>
        <Table size="small" sx={{ minWidth: 1500, borderCollapse: "separate", borderSpacing: 0 }}>
          <TableHead sx={{ backgroundColor: "#F5F5F5" }}>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  backgroundColor: "#FFFFFF",
                  borderRight: "2px solid #DDD",
                  minWidth: 100,
                }}
              >
                Cohort
              </TableCell>


              <TableCell sx={{ fontWeight: 700, minWidth: 80, textAlign: "center" }}>
                Customers
              </TableCell>


              <TableCell sx={{ fontWeight: 700, minWidth: 100, textAlign: "center" }}>
                Retention %
              </TableCell>


              {[...Array(13).keys()].map((m) => (
                <TableCell
                  key={m}
                  sx={{
                    fontWeight: 700,
                    minWidth: 60,
                    textAlign: "center",
                    backgroundColor: m === 0 ? "#FFF9C4" : "transparent",
                  }}
                >
                  M{m}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>


          <TableBody>
            {loading
              ? renderSkeletonRows()
              : cohorts.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={16} sx={{ textAlign: "center", py: 3 }}>
                    <Typography sx={{ color: "gray" }}>
                      No cohort data available. Try adjusting the date range.
                    </Typography>
                  </TableCell>
                </TableRow>
              )
              : cohorts.map((row) => (
                  <TableRow key={row.cohort} sx={{ "&:hover": { backgroundColor: "#F5F5F5" } }}>
                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 0,
                        backgroundColor: "#FFFFFF",
                        zIndex: 2,
                        fontWeight: 600,
                        borderRight: "2px solid #DDD",
                        minWidth: 100,
                      }}
                    >
                      {formatCohortLabel(row.cohort)}
                    </TableCell>


                    <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>
                      {row.customers}
                    </TableCell>


                    <TableCell
                      sx={{
                        fontWeight: 600,
                        textAlign: "center",
                        color: COMMON_COLORS[0],
                      }}
                    >
                      {row.retentionRate}
                    </TableCell>


                    {row.months.map((percent, idx) => {
                      const bgColor = getHeatColor(percent);
                      const isZero = !percent || percent === "" || percent === "0%";


                      return (
                        <TableCell
                          key={idx}
                          sx={{
                            textAlign: "center",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            backgroundColor: bgColor,
                            color: getTextColor(bgColor),
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            borderBottom: "1px solid #EEE",
                            "&:hover": !isZero
                              ? {
                                  transform: "scale(1.05)",
                                  boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.2)",
                                }
                              : {},
                          }}
                          title={isZero ? "No data" : `${percent} retention`}
                        >
                          {isZero ? "—" : percent}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>


      {/* Footer Note */}
     
    </Box>
  );
}

