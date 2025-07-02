import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
} from "@mui/material";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

// Fixed hike amounts for each slab except the first
const hikeAmounts = [
  0,    // First 6 Months: No hike
  5000, // 2nd slab
  5000, // 3rd slab
  7000, // 4th slab
  8000, // 5th slab
  8000, // 6th slab
  9000, // 7th slab
  9000, // 8th slab
];

// Slab definitions
const slabs = [
  // Year 1
  {
    responsibilities: "Junior Dietitian/Sales Agent",
    targets: "Maintain average of 3 Lakhs for 6 Months to move to next slab",
  },
  {
    responsibilities: "Junior Dietitian/Sales Agent",
    targets: "Maintain average of 5 Lakhs for 6 Months to move to next slab",
  },
  // Year 2
  {
    responsibilities: "Senior Dietitian/Senior Sales Agent with a team of Junior Dietitians (Min 4)",
    targets: "Self targets + Team targets. Maintain 5 Lakhs for 6 Months to move to next slab",
  },
  {
    responsibilities: "Senior Dietitian/Senior Sales Agent with a team of Junior Dietitians (Min 4)",
    targets: "Self targets + Team targets. Maintain 5 Lakhs for 6 Months to move to next slab",
  },
  // Year 3
  {
    responsibilities: "Team Leader with a team of 15 to 20, Team Targets, Team Strategy, Team Hiring",
    targets: "Achieve Team Targets & contribute in Team Strategy, Team Training, New Process Development & Team Hiring",
  },
  {
    responsibilities: "Team Leader with a team of 15 to 20, Team Targets, Team Strategy, Team Hiring",
    targets: "Achieve Team Targets & contribute in Team Strategy, Team Training, New Process Development & Team Hiring",
  },
  // Year 4
  {
    responsibilities: "Manager with a team of 40+, Team Targets, Team Strategy, Team Hiring, Business Strategy, Marketing Strategy, Profit & Loss Management",
    targets: "Achieve Team Targets & contribute in sales strategy, Team Hiring, Business Strategy, Marketing Strategy, Profit & Loss Management",
  },
  {
    responsibilities: "Manager with a team of 40+, Team Targets, Team Strategy, Team Hiring, Business Strategy, Marketing Strategy, Profit & Loss Management",
    targets: "Achieve Team Targets & contribute in sales strategy, Team Hiring, Business Strategy, Marketing Strategy, Profit & Loss Management",
  },
];

const bonuses = [50000, 75000, 125000, 150000]; // 1st-4th years (fixed)
const years = ["Year 1", "Year 2", "Year 3", "Year 4"];

const yearColors = [
  "#FFF9DF", // Year 1 (pale yellow)
  "#E9F1FF", // Year 2 (pale blue)
  "#FFF0F0", // Year 3 (pale pink)
  "#EAFBF0", // Year 4 (pale green)
];

function getTenure(joinDate) {
  const now = dayjs();
  const start = dayjs(joinDate);
  const diff = dayjs.duration(now.diff(start));
  const yrs = diff.years();
  const months = diff.months();
  let tenure = "";
  if (yrs) tenure += `${yrs} year${yrs > 1 ? "s" : ""} `;
  if (months || !yrs) tenure += `${months} month${months !== 1 ? "s" : ""}`;
  return tenure.trim();
}

function getSlabDates(joiningDate, idx) {
  const start = dayjs(joiningDate).add(idx * 6, "month");
  const end = start.add(6, "month").subtract(1, "day");
  return `${start.format("MMM YYYY")} - ${end.format("MMM YYYY")}`;
}

export default function GrowthTracker() {
  const [joiningSalary, setJoiningSalary] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!joiningSalary || !joiningDate) {
      setError("Please enter both joining date and salary.");
      return;
    }
    if (isNaN(Number(joiningSalary)) || Number(joiningSalary) < 8000) {
      setError("Enter a valid salary (minimum ₹8,000).");
      return;
    }
    setShowTable(true);
    setError("");
  };

  // --- Salary calculation logic ---
  const getSalaryForSlab = (base, idx) => {
    let salary = Number(base);
    for (let i = 1; i <= idx; ++i) {
      salary += hikeAmounts[i];
    }
    return Math.round(salary);
  };

  // Hike % calculation for this slab vs previous
  const getHikePercent = (base, idx) => {
    if (idx === 0) return "--";
    const prevSalary = getSalaryForSlab(base, idx - 1);
    const thisSalary = getSalaryForSlab(base, idx);
    const hike = ((thisSalary - prevSalary) / prevSalary) * 100;
    return `${hike.toFixed(2)}%`;
  };

  // Package for a year (2 slabs)
  const getYearlyPackage = (base, yearIdx) => {
    const a = getSalaryForSlab(base, yearIdx * 2);
    const b = getSalaryForSlab(base, yearIdx * 2 + 1);
    const bonus = bonuses[yearIdx];
    return a * 6 + b * 6 + bonus;
  };

  function isMergedCell(idx) {
    return idx % 2 === 0;
  }
  function isCellHidden(idx) {
    return idx % 2 === 1;
  }

  // Row background for the year (applied on both slabs of each year)
  const getRowSx = (idx) => ({
    background: yearColors[Math.floor(idx / 2)],
    "&:last-child td, &:last-child th": { border: 0 },
  });

  return (
    <Box sx={{ maxWidth: "100vw", mx: "auto", mt: 5, p: { xs: 1, md: 4 } }}>
      <Typography
        variant="h4"
        fontWeight={900}
        textAlign="center"
        gutterBottom
        sx={{
          color: "#111",
          letterSpacing: 1.2,
          mb: 2,
        }}
      >
        Growth Calculator
      </Typography>

      {!showTable ? (
        <Box
          component="form"
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 3,
            alignItems: "center",
            justifyContent: "center",
            mt: 4,
            mb: 6,
          }}
          onSubmit={handleSubmit}
        >
          <TextField
            label="Joining Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            required
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
            sx={{ minWidth: 180 }}
          />
          <TextField
            label="Joining Salary (per month)"
            type="number"
            required
            value={joiningSalary}
            onChange={(e) => setJoiningSalary(e.target.value)}
            inputProps={{ min: 8000, step: 500 }}
            sx={{ minWidth: 180 }}
          />
          <Button
            type="submit"
            size="large"
            variant="contained"
            sx={{
              bgcolor: "#111",
              color: "#fff",
              fontWeight: 800,
              px: 4,
              py: 1.5,
              fontSize: 18,
              borderRadius: 3,
              boxShadow: "0 2px 8px #1113",
              "&:hover": { bgcolor: "#222" },
            }}
          >
            Calculate
          </Button>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Typography
              sx={{
                fontWeight: 800,
                color: "#111",
                fontSize: 19,
                textAlign: "center",
                letterSpacing: 0.2,
              }}
            >
              Tenure with Muditam:&nbsp;
              <span style={{ color: "#1976d2" }}>
                {joiningDate ? getTenure(joiningDate) : "--"}
              </span>
            </Typography>
          </Box>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              background: "#fff",
              borderRadius: 4,
              boxShadow: "0 1.5px 18px #0001",
              mt: 2,
              overflowX: "auto",
              minWidth: 1450,
              width: "100%",
            }}
          >
            <Table sx={{ minWidth: 1450, background: "#fff" }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 900,
                      background: "#111",
                      color: "#fff",
                      fontSize: 17,
                      letterSpacing: 1,
                      borderTopLeftRadius: 8,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Year
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 900,
                      background: "#111",
                      color: "#fff",
                      fontSize: 17,
                      letterSpacing: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Tenure/Slab
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 900,
                      background: "#111",
                      color: "#fff",
                      fontSize: 17,
                      letterSpacing: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Hike
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 900,
                      background: "#111",
                      color: "#fff",
                      fontSize: 17,
                      letterSpacing: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Fixed Salary
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 900,
                      background: "#111",
                      color: "#fff",
                      fontSize: 17,
                      letterSpacing: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    6 Months Total
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 900,
                      background: "#111",
                      color: "#fff",
                      fontSize: 17,
                      letterSpacing: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Yearly Bonus
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 900,
                      background: "#111",
                      color: "#fff",
                      fontSize: 17,
                      letterSpacing: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Package
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 900,
                      background: "#111",
                      color: "#fff",
                      fontSize: 17,
                      letterSpacing: 1,
                      borderTopRightRadius: 8,
                      minWidth: 190,
                      whiteSpace: "pre-line",
                    }}
                  >
                    Responsibilities
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 900,
                      background: "#111",
                      color: "#fff",
                      fontSize: 17,
                      letterSpacing: 1,
                      minWidth: 220,
                      whiteSpace: "pre-line",
                    }}
                  >
                    Targets
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slabs.map((slab, idx) => {
                  const hike = getHikePercent(joiningSalary, idx);
                  const salary = getSalaryForSlab(joiningSalary, idx);
                  const total = Math.round(salary * 6);
                  const yearIdx = Math.floor(idx / 2);
                  const bonus =
                    isMergedCell(idx) && bonuses[yearIdx]
                      ? `₹${bonuses[yearIdx].toLocaleString()}`
                      : isCellHidden(idx)
                      ? null
                      : "";
                  const pkg =
                    isMergedCell(idx)
                      ? `₹${getYearlyPackage(joiningSalary, yearIdx).toLocaleString()}`
                      : isCellHidden(idx)
                      ? null
                      : "";
                  const year =
                    isMergedCell(idx) ? years[yearIdx] : isCellHidden(idx) ? null : "";

                  return (
                    <TableRow key={idx} sx={getRowSx(idx)}>
                      {isMergedCell(idx) ? (
                        <TableCell
                          rowSpan={2}
                          sx={{
                            fontWeight: 800,
                            fontSize: 15.5,
                            py: 2,
                            whiteSpace: "pre-line",
                            color: "#17181a",
                            textAlign: "center",
                            minWidth: 90,
                          }}
                        >
                          {year}
                        </TableCell>
                      ) : null}
                      <TableCell sx={{ fontWeight: 700, fontSize: 15, whiteSpace: "pre-line" }}>
                        {joiningDate ? getSlabDates(joiningDate, idx) : ""}
                        <br />
                        <span style={{ color: "#1976d2", fontSize: 12 }}>
                          {`Slab ${idx + 1}`}
                        </span>
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: 15,
                          color: idx === 0 ? "#666" : "#109447",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {hike}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 15 }}>
                        ₹{salary.toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 15 }}>
                        ₹{total.toLocaleString()}
                      </TableCell>
                      {isMergedCell(idx) ? (
                        <TableCell rowSpan={2} sx={{ fontWeight: 800, fontSize: 15.5, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                          {bonus}
                        </TableCell>
                      ) : null}
                      {isMergedCell(idx) ? (
                        <TableCell rowSpan={2} sx={{ fontWeight: 900, fontSize: 16, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                          {pkg}
                        </TableCell>
                      ) : null}
                      {isMergedCell(idx) ? (
                        <TableCell
                          rowSpan={2}
                          sx={{
                            fontWeight: 600,
                            fontSize: 15,
                            whiteSpace: "pre-line",
                            minWidth: 170,
                            verticalAlign: "middle",
                          }}
                        >
                          {slab.responsibilities}
                        </TableCell>
                      ) : null}
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: 15,
                          whiteSpace: "pre-line",
                          minWidth: 210,
                        }}
                      >
                        {slab.targets}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box mt={2.5} mb={3} sx={{ maxWidth: 1250, mx: "auto", color: "#ab3709" }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: 15,
                whiteSpace: "pre-line",
              }}
            >
              <b>Terms:</b> If not achieved in 6 months, extra months will be given to complete the target. However, the target for the extra months will also be added, but only 50% of the extra period target will be counted towards the requirement. The candidate must complete the target to move to the next slab.
              {"\n"}
              <span style={{ color: "#333" }}>
                Yearly Bonus: Employees can avail the yearly bonus only if they achieve their yearly targets.
              </span>
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              onClick={() => setShowTable(false)}
              sx={{
                bgcolor: "#222",
                color: "#fff",
                mt: 2,
                px: 6,
                fontWeight: 700, 
                borderRadius: 2.5,
                fontSize: 16,
                boxShadow: "0 2px 7px #1113",
                "&:hover": { bgcolor: "#111" },
              }}
            >
              Back
            </Button> 
          </Box>
        </Box>
      )}
      {error && (
        <Typography color="error" textAlign="center" mt={2}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
