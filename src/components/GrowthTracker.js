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
  Divider,
} from "@mui/material";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

// Fixed hike amounts for each slab except the first
const hikeAmounts = [
  0, // First 6 Months: No hike
  5000, // 2nd slab
  5000, // 3rd slab
  7000, // 4th slab
  8000, // 5th slab
  8000, // 6th slab
  9000, // 7th slab
  9000, // 8th slab
];

// Policy tables (same info as images)
const incrementPolicy6m = [
  { category: "Below Expectation", achievement: "< ₹12L", recommendation: "No increment" },
  { category: "Meets Expectation", achievement: "₹12–15L", recommendation: "10% increment" },
  { category: "Exceeds Expectation", achievement: "₹15–18L", recommendation: "15% increment" },
  { category: "Outstanding", achievement: "₹18L+", recommendation: "20% increment + role upgrade" },
];

const incrementPolicy12m = [
  { category: "Below Expectation", achievement: "< ₹18L", recommendation: "No increment" },
  { category: "Meets Expectation", achievement: "₹18–25L", recommendation: "6–10% increment" },
  { category: "Exceeds Expectation", achievement: "₹25–30L", recommendation: "10–15% increment" },
  { category: "Outstanding", achievement: "₹30L+", recommendation: "15–20% increment + role upgrade" },
];

// ✅ More natural “embedded policy block” (not like pasted image)
function InlinePolicyTable({ title, rows }) {
  return (
    <Box
      sx={{
        mt: 1.3,
        borderRadius: 2.5,
        border: "1px solid #e9ecef",
        background: "#fafbfc",
        overflow: "hidden",
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          px: 1.5,
          py: 1.1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          background: "#fff",
        }}
      >
        <Typography sx={{ fontWeight: 900, fontSize: 12.8, color: "#111" }}>
          {title}
        </Typography>
      </Box>

      <Divider />

      {/* table */}
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 520 }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 900,
                  fontSize: 11.5,
                  color: "#555",
                  py: 1,
                  background: "#f5f7fb",
                  borderBottom: "1px solid #e9ecef",
                  whiteSpace: "nowrap",
                }}
              >
                Category
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 900,
                  fontSize: 11.5,
                  color: "#555",
                  py: 1,
                  background: "#f5f7fb",
                  borderBottom: "1px solid #e9ecef",
                  whiteSpace: "nowrap",
                }}
              >
                Achievement
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 900,
                  fontSize: 11.5,
                  color: "#555",
                  py: 1,
                  background: "#f5f7fb",
                  borderBottom: "1px solid #e9ecef",
                  whiteSpace: "nowrap",
                }}
              >
                Recommendation
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((r, i) => (
              <TableRow
                key={i}
                sx={{
                  "& td": { borderBottom: "1px solid #eef1f5" },
                  background: i % 2 === 0 ? "#ffffff" : "#fbfcfe",
                }}
              >
                <TableCell sx={{ fontWeight: 800, fontSize: 12.2, py: 1 }}>
                  {r.category}
                </TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 12.2, py: 1 }}>
                  {r.achievement}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: 12.2,
                    py: 1,
                    color: "#111",
                    whiteSpace: "normal",
                  }}
                >
                  {r.recommendation}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}

// Slab definitions
const slabs = [
  // Year 1
  {
    responsibilities: "Junior Dietitian/Sales Agent",
    targets: "Maintain average of 2 Lakhs for 6 Months to move to next slab",
  },
  {
    responsibilities: "Junior Dietitian/Sales Agent",
    targets: "Maintain average of 4 Lakhs for 6 Months to move to next slab",
  },

  // Year 2
  {
    responsibilities:
      "Senior Dietitian/Senior Sales Agent with a team of Junior Dietitians (Min 4)",
    targets:
      "Self targets + Team targets. Maintain 5 Lakhs for 6 Months to move to next slab",
  },
  {
    responsibilities:
      "Senior Dietitian/Senior Sales Agent with a team of Junior Dietitians (Min 4)",
    targets:
      "Self targets + Team targets. Maintain 5 Lakhs for 6 Months to move to next slab",
  },

  // Year 3
  {
    responsibilities:
      "Team Leader with a team of 15 to 20, Team Targets, Team Strategy, Team Hiring",
    targets:
      "Achieve Team Targets & contribute in Team Strategy, Team Training, New Process Development & Team Hiring",
  },
  {
    responsibilities:
      "Team Leader with a team of 15 to 20, Team Targets, Team Strategy, Team Hiring",
    targets:
      "Achieve Team Targets & contribute in Team Strategy, Team Training, New Process Development & Team Hiring",
  },

  // Year 4
  {
    responsibilities:
      "Manager with a team of 40+, Team Targets, Team Strategy, Team Hiring, Business Strategy, Marketing Strategy, Profit & Loss Management",
    targets:
      "Achieve Team Targets & contribute in sales strategy, Team Hiring, Business Strategy, Marketing Strategy, Profit & Loss Management",
  },
  {
    responsibilities:
      "Manager with a team of 40+, Team Targets, Team Strategy, Team Hiring, Business Strategy, Marketing Strategy, Profit & Loss Management",
    targets:
      "Achieve Team Targets & contribute in sales strategy, Team Hiring, Business Strategy, Marketing Strategy, Profit & Loss Management",
  },
];

const bonuses = [50000, 75000, 125000, 150000]; // 1st-4th years (fixed)
const years = ["Year 1", "Year 2", "Year 3", "Year 4"];

const yearColors = [
  "#FFF9DF",
  "#E9F1FF",
  "#FFF0F0",
  "#EAFBF0",
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

  const getSalaryForSlab = (base, idx) => {
    let salary = Number(base);
    for (let i = 1; i <= idx; ++i) salary += hikeAmounts[i];
    return Math.round(salary);
  };

  const getHikePercent = (base, idx) => {
    if (idx === 0) return "--";
    const prevSalary = getSalaryForSlab(base, idx - 1);
    const thisSalary = getSalaryForSlab(base, idx);
    const hike = ((thisSalary - prevSalary) / prevSalary) * 100;
    return `${hike.toFixed(2)}%`;
  };

  const getYearlyPackage = (base, yearIdx) => {
    const a = getSalaryForSlab(base, yearIdx * 2);
    const b = getSalaryForSlab(base, yearIdx * 2 + 1);
    const bonus = bonuses[yearIdx];
    return a * 6 + b * 6 + bonus;
  };

  const isMergedCell = (idx) => idx % 2 === 0;

  const getRowSx = (idx) => ({
    background: yearColors[Math.floor(idx / 2)],
    "&:last-child td, &:last-child th": { border: 0 },
  });

  return (
    <Box sx={{ maxWidth: "100vw", mx: "auto", mt: 5, p: 1 }}>
      {!showTable ? null : (
        <>
          <Typography
            variant="h4"
            fontWeight={600}
            textAlign="center"
            gutterBottom
            sx={{ color: "#111" }}
          >
            Growth Calculator
          </Typography>
          <Box
            sx={{
              height: 3,
              borderRadius: "20px",
              backgroundColor: "#FFD700",
              mr: 80,
              ml: 80,
              mb: 5,
            }}
          />
        </>
      )}

      {!showTable ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 2,
            mt: 5,
          }}
          component="form"
          onSubmit={handleSubmit}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              gap: 2,
              borderRadius: 3,
              backgroundColor: "#fff",
              boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
              width: 550,
              p: 2,
            }}
          >
            <Typography
              variant="h4"
              fontWeight={600}
              textAlign="center"
              gutterBottom
              sx={{ color: "#111", mt: 2 }}
            >
              Growth Calculator
            </Typography>

            <Box
              sx={{
                height: 3,
                borderRadius: "20px",
                backgroundColor: "#FFD700",
                width: "70%",
                mx: 1,
                mb: 3,
              }}
            />

            <TextField
              label="Joining Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              required
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              sx={{
                width: 500,
                background: "#fafbfc",
                borderRadius: 2,
                "& .MuiInputBase-input": { padding: "10px 12px" },
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": { borderColor: "black" },
                },
              }}
            />

            <TextField
              label="Joining Salary (per month)"
              type="number"
              required
              value={joiningSalary}
              onChange={(e) => setJoiningSalary(e.target.value)}
              inputProps={{ min: 8000, step: 500 }}
              sx={{
                width: 500,
                background: "#fafbfc",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": { borderColor: "black" },
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: "#111",
                width: 500,
                color: "#fff",
                px: 4,
                py: 2,
                borderRadius: 2,
                boxShadow: "0 2px 8px #1113",
                "&:hover": { bgcolor: "#222" },
              }}
            >
              Calculate
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
            <Typography sx={{ fontWeight: 800, color: "#111", fontSize: 19 }}>
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
                  {[
                    { label: "Year", sx: { borderTopLeftRadius: 8 } },
                    { label: "Tenure/Slab" },
                    { label: "Hike" },
                    { label: "Fixed Salary" },
                    { label: "6 Months Total" },
                    { label: "Yearly Bonus" },
                    { label: "Package" },
                    { label: "Responsibilities", sx: { minWidth: 190, whiteSpace: "pre-line" } },
                    { label: "Targets", sx: { minWidth: 560, whiteSpace: "pre-line", borderTopRightRadius: 8 } },
                  ].map((c) => (
                    <TableCell
                      key={c.label}
                      sx={{
                        fontWeight: 900,
                        background: "#111",
                        color: "#fff",
                        fontSize: 17,
                        letterSpacing: 1,
                        whiteSpace: "nowrap",
                        ...(c.sx || {}),
                      }}
                    >
                      {c.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {slabs.map((slab, idx) => {
                  const hike = getHikePercent(joiningSalary, idx);
                  const salary = getSalaryForSlab(joiningSalary, idx);
                  const total = Math.round(salary * 6);
                  const yearIdx = Math.floor(idx / 2);

                  const year = isMergedCell(idx) ? years[yearIdx] : null;
                  const bonus = isMergedCell(idx) ? `₹${bonuses[yearIdx].toLocaleString()}` : null;
                  const pkg = isMergedCell(idx)
                    ? `₹${getYearlyPackage(joiningSalary, yearIdx).toLocaleString()}`
                    : null;

                  return (
                    <TableRow key={idx} sx={getRowSx(idx)}>
                      {isMergedCell(idx) && (
                        <TableCell
                          rowSpan={2}
                          sx={{
                            fontWeight: 800,
                            fontSize: 15.5,
                            py: 2,
                            color: "#17181a",
                            textAlign: "center",
                            minWidth: 90,
                          }}
                        >
                          {year}
                        </TableCell>
                      )}

                      <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>
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

                      {isMergedCell(idx) && (
                        <TableCell
                          rowSpan={2}
                          sx={{
                            fontWeight: 800,
                            fontSize: 15.5,
                            textAlign: "center",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {bonus}
                        </TableCell>
                      )}

                      {isMergedCell(idx) && (
                        <TableCell
                          rowSpan={2}
                          sx={{
                            fontWeight: 900,
                            fontSize: 16,
                            textAlign: "center",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pkg}
                        </TableCell>
                      )}

                      {isMergedCell(idx) && (
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
                      )}

                      <TableCell sx={{ fontWeight: 600, fontSize: 15, minWidth: 560 }}>
                        {slab.targets}

                        {idx === 0 && (
                          <InlinePolicyTable
                            title="Increment Policy for Health Experts (6 months)"
                            rows={incrementPolicy6m}
                          />
                        )}

                        {idx === 1 && (
                          <InlinePolicyTable
                            title="Increment Policy for Health Experts (12 months)"
                            rows={incrementPolicy12m}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box mt={2.5} mb={3} sx={{ maxWidth: 1250, mx: "auto", color: "#ab3709" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 15, whiteSpace: "pre-line" }}>
              <b>Terms:</b> If not achieved in 6 months, extra months will be given to complete the target.
              However, the target for the extra months will also be added, but only 50% of the extra period
              target will be counted towards the requirement.
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
