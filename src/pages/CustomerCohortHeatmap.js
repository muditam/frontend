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
} from "@mui/material";


// ------------------------------------------------------
// FORMAT COHORT LABEL → "Jan 2025"
// ------------------------------------------------------
function formatCohortLabel(key) {
  const [y, m] = key.split("-");
  const date = new Date(y, m - 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}


// ------------------------------------------------------
// UPDATED HEATMAP COLORS → MATCH FUNNEL THEME
// ------------------------------------------------------
const COMMON_COLORS = ["#2C5F6F", "#3A8F9F", "#5FB8A8", "#80CBC4"];


function getHeatColor(percent) {
  const n = parseFloat(percent);
  if (isNaN(n) || n <= 0) return COMMON_COLORS[3]; // lightest


  if (n < 5) return COMMON_COLORS[2];      // light teal
  if (n < 10) return COMMON_COLORS[1];     // medium teal
  return COMMON_COLORS[0];                 // darkest
}


function getTextColor(percent) {
  const n = parseFloat(percent);
  return n >= 10 ? "white" : "black";
}


export default function CustomerCohortHeatmap() {
  const API = "https://muditamleads-14f32a10d7f7.herokuapp.com";


  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");


  const loadCohort = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API}/api/super-admin/analytics/cohort-analysis`,
        { params: { start, end } }
      );
      setCohorts(res.data.cohorts || []);
    } catch (err) {
      console.error("COHORT FETCH ERROR:", err);
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
            <Skeleton variant="rectangular" height={28} />
          </TableCell>
        ))}
      </TableRow>
    ));


  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Customer Cohort Analysis
      </Typography>


      {/* Filters */}
      <Card sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            type="date"
            label="Start Date"
            InputLabelProps={{ shrink: true }}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />


          <TextField
            type="date"
            label="End Date"
            InputLabelProps={{ shrink: true }}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />


          <Button variant="contained" onClick={loadCohort}>
            Apply Range
          </Button>


          <Button
            variant="outlined"
            onClick={() => {
              setStart("");
              setEnd("");
              loadCohort();
            }}
          >
            Last 12 Months
          </Button>
        </Stack>
      </Card>


      {/* Heatmap */}
      <Card sx={{ overflowX: "auto", p: 2, borderRadius: 3 }}>
        <Table
          size="small"
          sx={{
            minWidth: 1400,
            borderCollapse: "separate",
            borderSpacing: "0",
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  background: "#fff",
                  borderRight: "1px solid #eee",
                }}
              >
                Cohort
              </TableCell>


              <TableCell sx={{ fontWeight: 700 }}>Customers</TableCell>


              <TableCell sx={{ fontWeight: 700 }}>Retention Rate</TableCell>


              {[...Array(13).keys()].map((m) => (
                <TableCell key={m} sx={{ fontWeight: 700 }}>
                  Month {m}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>


          <TableBody>
            {loading
              ? renderSkeletonRows()
              : cohorts.map((row) => (
                  <TableRow key={row.cohort}>
                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 0,
                        background: "#fff",
                        zIndex: 2,
                        fontWeight: 600,
                        borderRight: "1px solid #eee",
                      }}
                    >
                      {formatCohortLabel(row.cohort)}
                    </TableCell>


                    <TableCell sx={{ fontWeight: 600 }}>
                      {row.customers}
                    </TableCell>


                    {/* Retention Rate = Month 1 */}
                    <TableCell sx={{ fontWeight: 600 }}>
                      {row.months[1] || "0%"}
                    </TableCell>


                  {row.months.map((v, i) => {
  const isZero = !v || v === "0%";


  return (
    <TableCell
      key={i}
      sx={{
        textAlign: "center",
        fontWeight: 600,
        backgroundColor: isZero ? "#FFFFFF" : getHeatColor(v),
        color: isZero ? "#FFFFFF" : getTextColor(v),   // text invisible for empty cells
        cursor: isZero ? "default" : "pointer",
        transition: "0.15s",
        "&:hover": isZero
          ? {}
          : {
              outline: "2px solid #00000040",
            },
      }}
    >
      {/* show value ONLY if not zero */}
      {isZero ? "" : v}
    </TableCell>
  );
})}


                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}



