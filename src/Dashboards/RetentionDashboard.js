import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  TextField,
  Button,
} from "@mui/material";
import axios from "axios";

import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  PersonOutline,
  LocalMall,
  CurrencyRupee,
  CurrencyRupeeOutlined,
  ExpandMore,
  EventBusy,
  Today,
  EventAvailable,
  Schedule,
  MoreTime,
  PeopleAlt,
  PersonAdd,
  BarChart,
  Cancel,
} from "@mui/icons-material";
import { styled } from "@mui/system";

// 1) Range dropdown options for "Today-Followup Summary" (including "Custom range")
const timeRangeOptionsTF = [
  "Today",
  "Yesterday",
  "Last 7 days",
  "Last 30 days",
  "Week to date",
  "Month to date",
  "Year to date",
  "Last 90 days",
  "Last 365 days",
  "Last month",
  "Last 12 months",
  "Last year",
  "Quarter to date",
  "Custom range",
];

// 2) Utility: format date => YYYY-MM-DD
const toISODate = (date) => date.toISOString().split("T")[0];

// 3) getDateRange helper
const getDateRange = (rangeValue) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  // Helper to get Monday-based "week to date":
  const getWeekStart = (d) => {
    const day = d.getDay(); // 0 = Sunday
    const diff = day === 0 ? 6 : day - 1; // Monday-based
    d.setDate(d.getDate() - diff);
    return d;
  };

  switch (rangeValue) {
    case "Today":
      break;
    case "Yesterday":
      start.setDate(now.getDate() - 1);
      end = new Date(start);
      break;
    case "Last 7 days":
      start.setDate(now.getDate() - 6);
      break;
    case "Last 30 days":
      start.setDate(now.getDate() - 29);
      break;
    case "Week to date":
      start = getWeekStart(new Date());
      break;
    case "Month to date":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "Year to date":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "Last 90 days":
      start.setDate(now.getDate() - 89);
      break;
    case "Last 365 days":
      start.setDate(now.getDate() - 364);
      break;
    case "Last month": {
      const year = now.getFullYear();
      const month = now.getMonth();
      const prevMonth = month - 1 < 0 ? 11 : month - 1;
      const prevYear = month - 1 < 0 ? year - 1 : year;
      start = new Date(prevYear, prevMonth, 1);
      end = new Date(prevYear, prevMonth + 1, 0);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case "Last 12 months":
      start.setFullYear(now.getFullYear() - 1);
      break;
    case "Last year": {
      const y = now.getFullYear() - 1;
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case "Quarter to date": {
      const currentMonth = now.getMonth();
      const quarterStartMonth = currentMonth - (currentMonth % 3);
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    }
    case "Custom range":
      return { startDate: "", endDate: "" };
    default:
      break;
  }
  return { startDate: toISODate(start), endDate: toISODate(end) };
};

const BlinkingIcon = styled(WarningAmberIcon)({
  animation: "blink-animation 1.5s steps(2, start) infinite",
  "@keyframes blink-animation": {
    "50%": { opacity: 0 },
  },
  color: "red",
});

// Default date filter for the current month (used in shipment)
const getCurrentMonthDateFilter = () => {
  const currentDate = new Date();
  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  )
    .toISOString()
    .split("T")[0];
  const lastDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  )
    .toISOString()
    .split("T")[0];
  return { startDate: firstDay, endDate: lastDay };
};

const RetentionAgentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [todayMetrics, setTodayMetrics] = useState({});
  const [followupMetrics, setFollowupMetrics] = useState({});
  const [shipmentSummary, setShipmentSummary] = useState([]);
  const [applyingShipment, setApplyingShipment] = useState(false);

  // For Shipment Summary date filter
  const [dateFilter, setDateFilter] = useState(getCurrentMonthDateFilter());

  // Which summary is selected in the main toggle?
  const [selectedSummary, setSelectedSummary] = useState("Today-Followup Summary");

  // For the "Today-Followup" range dropdown
  const [selectedRangeTF, setSelectedRangeTF] = useState("Today");
  // For "Custom range" in the Today-Followup summary
  const [customStartTF, setCustomStartTF] = useState("");
  const [customEndTF, setCustomEndTF] = useState("");

  const user = JSON.parse(sessionStorage.getItem("user"));

  const handleBoxClick = (filterType) => {
    const clickableBoxes = [
      "Active Customers",
      "Lost Customers",
      "Sales Done Today",
      "Followup Today",
      "No Followup Set",
      "Followup Tomorrow",
      "Followup Later",
      "Followup Missed",
    ];
    if (clickableBoxes.includes(filterType)) {
      window.open(`/retention/${filterType}`, "_blank");
    }
  };

  // 1) fetchTodayFollowupData => calls /api/today-summary and /api/followup-summary with a date range
  const fetchTodayFollowupData = async (agentName, startDate, endDate) => {
    try {
      setLoading(true);
      // "Today" summary endpoint
      const todaySummaryResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/today-summary",
        {
          params: { agentName, startDate, endDate },
        }
      );
      setTodayMetrics(todaySummaryResponse.data);

      // "Followup" summary endpoint (now including lost customers)
      const followupSummaryResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/followup-summary",
        {
          params: { agentName, startDate, endDate },
        }
      );
      setFollowupMetrics(followupSummaryResponse.data);
    } catch (error) {
      console.error("Error fetching Today-Followup data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2) fetchShipmentStatusSummary => calls /api/shipment-summary
  const fetchShipmentStatusSummary = async (retentionAgentName) => {
    try {
      setApplyingShipment(true);
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/shipment-summary",
        {
          params: {
            agentName: retentionAgentName,
            startDate: dateFilter.startDate,
            endDate: dateFilter.endDate,
          },
        }
      );
      setShipmentSummary(response.data);
    } catch (error) {
      console.error("Error fetching shipment status summary:", error);
    } finally {
      setApplyingShipment(false);
    }
  };

  // On mount, default to "Today-Followup Summary" => use "Today" range
  useEffect(() => {
    if (user?.fullName) {
      const { startDate, endDate } = getDateRange("Today");
      fetchTodayFollowupData(user.fullName, startDate, endDate);
      fetchShipmentStatusSummary(user.fullName);
    }
  }, [user?.fullName]);

  // Handle main summary toggle (now only two options)
  const handleSummaryChange = (e) => {
    setSelectedSummary(e.target.value);
  };

  // 4) handleTimeRangeChange for Today-Followup
  const handleTimeRangeChangeTF = async (e) => {
    const newRange = e.target.value;
    setSelectedRangeTF(newRange);
    if (!user?.fullName) return;
    if (newRange !== "Custom range") {
      const { startDate, endDate } = getDateRange(newRange);
      await fetchTodayFollowupData(user.fullName, startDate, endDate);
    }
  };

  // 5) applyCustomRangeTF
  const applyCustomRangeTF = async () => {
    if (!customStartTF || !customEndTF || !user?.fullName) return;
    await fetchTodayFollowupData(user.fullName, customStartTF, customEndTF);
  };

  return (
    <Box
      sx={{
        padding: { xs: 2, sm: 3, md: 4 },
        width: { xs: "90%", sm: "85%", md: "85%", lg: "90%" },
        paddingBottom: "10px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <Typography
        variant="h4"
        gutterBottom
        fontWeight={600}
        color="#000000"
        textAlign="center"
        marginTop={-2}
      >
        {user?.fullName} - Retention Agent Dashboard
      </Typography>

      {/* Combined Dropdowns for Summary Toggle and Time Range */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          mb: 2,
          mt: 2,
        }}
      >
        {/* Summary Toggle (only two options now) */}
        <FormControl variant="outlined" sx={{ width: 300 }}>
          <Select
            value={selectedSummary}
            onChange={handleSummaryChange}
            displayEmpty
            IconComponent={ExpandMore}
            renderValue={(selected) =>
              selected ? `${selected}` : "Summary:"
            }
            sx={{
              backgroundColor: "#fff",
              color: "#333",
              borderRadius: 2,
              border: "1px solid #ccc",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#888" },
            }}
          >
            <MenuItem value="Today-Followup Summary">
              <Typography variant="body2">
                Today & Followup Summary
              </Typography>
            </MenuItem>
            <MenuItem value="Shipment Summary">
              <Typography variant="body2">Shipment Summary</Typography>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Time Range Dropdown (only for Today-Followup Summary) */}
        {selectedSummary === "Today-Followup Summary" && (
          <FormControl variant="outlined" sx={{ width: 300 }}>
            <Select
              value={selectedRangeTF}
              onChange={handleTimeRangeChangeTF}
              displayEmpty
              IconComponent={ExpandMore}
              renderValue={(val) => (val ? val : "Time Range")}
              sx={{
                backgroundColor: "#fff",
                color: "#333",
                borderRadius: 2,
                border: "1px solid #ccc",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#888" },
              }}
            >
              {timeRangeOptionsTF.map((option) => (
                <MenuItem key={option} value={option}>
                  <Typography variant="body2">{option}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* If "Custom range" is selected, show date pickers and Apply button */}
      {selectedSummary === "Today-Followup Summary" && selectedRangeTF === "Custom range" && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            flexWrap: "wrap",
            mb: 2,
          }}
        >
          <TextField
            label="Start Date"
            type="date"
            value={customStartTF}
            onChange={(e) => setCustomStartTF(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              width: 180,
              "& .MuiInputBase-root": {
                backgroundColor: "background.default",
              },
            }}
          />
          <TextField
            label="End Date"
            type="date"
            value={customEndTF}
            onChange={(e) => setCustomEndTF(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              width: 180,
              "& .MuiInputBase-root": {
                backgroundColor: "background.default",
              },
            }}
          />
          <Button
            variant="contained"
            onClick={applyCustomRangeTF}
            sx={{
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            Apply
          </Button>
        </Box>
      )}

      {/* 1) TODAY-FOLLOWUP SUMMARY */}
      {selectedSummary === "Today-Followup Summary" && (
        <>
          {/* Today Summary Section */}
          <Box
            sx={{
              padding: 2,
              marginTop: 1,
              borderRadius: 2,
              backgroundColor: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "1000px",
              margin: "0 auto",
              boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.05)",
            }}
          >
            <Typography
              variant="h5"
              fontWeight={600}
              gutterBottom
              color="#000000"
              textAlign="center"
              marginTop={-2}
            >
              Today Summary
            </Typography>
            <Grid container spacing={2} sx={{ width: "100%" }}>
              {[
                {
                  label: "Active Customers",
                  value: todayMetrics.activeCustomers || 0,
                  icon: (
                    <PersonOutline fontSize="medium" sx={{ color: "#1976D2" }} />
                  ),
                },
                {
                  label: "Sales Done Today",
                  value: todayMetrics.salesDone || 0,
                  icon: (
                    <LocalMall fontSize="medium" sx={{ color: "#f57c00" }} />
                  ),
                },
                {
                  label: "Total Sales",
                  value: `₹${(todayMetrics.totalSales || 0).toFixed(2)}`,
                  icon: (
                    <CurrencyRupee fontSize="medium" sx={{ color: "#9c27b0" }} />
                  ),
                },
                {
                  label: "Average Order Value",
                  value: `₹${(todayMetrics.avgOrderValue || 0).toFixed(2)}`,
                  icon: (
                    <CurrencyRupeeOutlined fontSize="medium" sx={{ color: "#d32f2f" }} />
                  ),
                },
              ].map(({ label, value, icon }) => (
                <Grid item xs={12} sm={6} md={3} key={label}>
                  <Box
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 2,
                      backgroundColor: "#F9FAFB",
                      boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)",
                      transition: "0.3s",
                      width: "90%",
                      minHeight: "130px",
                      margin: "0 auto",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                    onClick={() => handleBoxClick(label)}
                  >
                    <Box sx={{ fontSize: 28, mr: 2 }}>{icon}</Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: "#555" }}>
                        {label}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" sx={{ color: "#333" }}>
                        {value !== undefined ? value : <CircularProgress size={18} />}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Followup Summary Section */}
          <Box
            sx={{
              padding: 2,
              marginTop: 3,
              borderRadius: 2,
              backgroundColor: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "1000px",
              margin: "0 auto",
              boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.05)",
            }}
          >
            <Typography
              variant="h5"
              fontWeight={600}
              gutterBottom
              color="#000000"
              textAlign="center"
              marginTop={-3}
            >
              Followup Summary
            </Typography>
            <Grid container spacing={2} sx={{ width: "100%" }}>
              {[
                {
                  label: "No Followup Set",
                  icon: <Schedule sx={{ color: "#546E7A" }} />,
                  value: followupMetrics.noFollowupSet !== undefined
                    ? followupMetrics.noFollowupSet
                    : <CircularProgress size={20} />,
                },
                {
                  label: "Followup Missed",
                  icon: <EventBusy sx={{ color: "#D32F2F" }} />,
                  value: followupMetrics.followupMissed !== undefined
                    ? followupMetrics.followupMissed
                    : <CircularProgress size={20} />,
                },
                {
                  label: "Followup Today",
                  icon: <Today sx={{ color: "#388E3C" }} />,
                  value: followupMetrics.followupToday !== undefined
                    ? followupMetrics.followupToday
                    : <CircularProgress size={20} />,
                },
                {
                  label: "Followup Tomorrow",
                  icon: <EventAvailable sx={{ color: "#FFA000" }} />,
                  value: followupMetrics.followupTomorrow !== undefined
                    ? followupMetrics.followupTomorrow
                    : <CircularProgress size={20} />,
                },
                {
                  label: "Followup Later",
                  icon: <MoreTime sx={{ color: "#0288D1" }} />,
                  value: followupMetrics.followupLater !== undefined
                    ? followupMetrics.followupLater
                    : <CircularProgress size={20} />,
                },
                {
                  label: "Lost Customers",
                  icon: <Cancel sx={{ color: "#D32F2F" }} />,
                  value: followupMetrics.lostCustomers !== undefined
                    ? followupMetrics.lostCustomers
                    : <CircularProgress size={20} />,
                },
              ].map(({ label, value, icon }) => (
                <Grid item xs={12} sm={6} md={4} key={label}>
                  <Box
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 2,
                      backgroundColor: "#F9FAFB",
                      boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)",
                      transition: "0.3s",
                      minHeight: "130px",
                      width: "90%",
                      margin: "0 auto",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                    onClick={() => handleBoxClick(label)}
                  >
                    <Box sx={{ fontSize: 28, mr: 2 }}>{icon}</Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: "#555" }}>
                        {label}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" sx={{ color: "#333" }}>
                        {value !== undefined ? value : <CircularProgress size={18} />}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      )}

      {/* 3) SHIPMENT SUMMARY */}
      {selectedSummary === "Shipment Summary" && (
        <Paper
          sx={{
            padding: { xs: 2, sm: 3, md: 4 },
            marginTop: 3,
            borderRadius: "8px",
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
            width: "100%",
            maxWidth: "1200px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: "bold",
              textAlign: "center",
              color: "#4F4F4F",
              marginBottom: 2,
              marginTop: -2,
            }}
          >
            Shipment Status
          </Typography>
          {/* Date Filter Controls for Shipment Summary */}
          <Box sx={{ display: "flex", gap: 2, marginBottom: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={dateFilter.startDate}
              onChange={(e) =>
                setDateFilter((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
            <TextField
              label="End Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={dateFilter.endDate}
              onChange={(e) =>
                setDateFilter((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
            <Button
              variant="contained"
              onClick={() => fetchShipmentStatusSummary(user?.fullName)}
              sx={{ backgroundColor: "#6D6D6D" }}
            >
              Apply Filters
            </Button>
          </Box>
          <TableContainer component={Paper} sx={{ borderRadius: "10px" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#6D6D6D" }}>
                  {["Category", "Count", "Amount", "Percentage"].map((header) => (
                    <TableCell
                      key={header}
                      sx={{ backgroundColor: "#6D6D6D", textAlign: "center" }}
                    >
                      <Typography fontWeight="bold" sx={{ color: "#e8e8e8" }}>
                        {header}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              {applyingShipment && (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={4} sx={{ padding: 0 }}>
                      <LinearProgress variant="indeterminate" sx={{ width: "100%", height: "3px" }} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}
              {!applyingShipment && (
                <TableBody>
                  {shipmentSummary.length > 0 ? (
                    shipmentSummary.map((row) => (
                      <TableRow
                        key={row.label}
                        sx={{
                          "&:nth-of-type(odd)": { backgroundColor: "#F5F5F5" },
                          "&:nth-of-type(even)": { backgroundColor: "#FFFFFF" },
                        }}
                      >
                        <TableCell sx={{ textAlign: "center" }}>
                          <Typography fontWeight="bold">{row.label}</Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>{row.count}</TableCell>
                        <TableCell sx={{ textAlign: "center" }}>{`₹${row.amount.toFixed(2)}`}</TableCell>
                        <TableCell sx={{ textAlign: "center" }}>{`${row.percentage}%`}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ padding: "12px", color: "#888", fontStyle: "italic" }}>
                        No data found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              )}
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default RetentionAgentDashboard;
