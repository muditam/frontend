import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  LinearProgress,
  Button,
  Table,
  TableBody,
  Select,
  FormControl,
  MenuItem,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import axios from "axios";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  CurrencyRupee,
  CurrencyRupeeOutlined,
  ExpandMore,
  Schedule,
  EventBusy,
  Today,
  EventAvailable,
  MoreTime,
} from "@mui/icons-material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { styled } from "@mui/system";

// ----------------------
// 1) Range dropdown options (including "Custom range")
// ----------------------
const timeRangeOptions = [
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

// ----------------------
// 2) Utility: format date => YYYY-MM-DD
// ----------------------
const toISODate = (date) => date.toISOString().split("T")[0];

// ----------------------
// 3) getDateRange helper
// ----------------------
const getDateRange = (rangeValue) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  // Helper to get Monday-based "week to date":
  const getWeekStart = (d) => {
    const day = d.getDay(); // 0 = Sunday
    const diff = day === 0 ? 6 : day - 1;
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

const AgentDashboard = () => {
  const [user, setUser] = useState(null);
  const [todayStats, setTodayStats] = useState({});
  const [followupStats, setFollowupStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [leadSourceData, setLeadSourceData] = useState([]);
  const [deliverySummary, setDeliverySummary] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState("Sales & Followup Summary");
  const [selectedRange, setSelectedRange] = useState("Today");
  // For custom range when selected
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [totals, setTotals] = useState({
    leadsAssigned: 0,
    leadsConverted: 0,
    conversionRate: 0,
    salesAmount: 0,
  });
  const [allTimeStats, setAllTimeStats] = useState({
    totalLeads: 0,
    salesDone: 0,
    conversionRate: 0,
    totalSales: 0,
    avgOrderValue: 0,
  });

  // On mount, load user & fetch default data using "Today"
  useEffect(() => {
    const loggedInUser = JSON.parse(sessionStorage.getItem("user"));
    if (loggedInUser) {
      setUser(loggedInUser);
      const { startDate, endDate } = getDateRange("Today");
      // Fetch data for Today & Followup Summary by default
      fetchTodaySummaryData(loggedInUser.fullName, startDate, endDate);
      fetchFollowupStatsData(loggedInUser.fullName, startDate, endDate);
      fetchAllTimeData(loggedInUser.fullName);
      // Also fetch the limited Lead Source and Delivery summaries if needed
      if (selectedSummary === "Lead-Source & Delivery Summary") {
        fetchLeadSourceSummaryLimited(startDate, endDate);
        fetchDeliveryStatusSummaryLimited(startDate, endDate);
      }
      setLoading(false);
    }
  }, []);

  // ------------------------------
  // 1) Today Summary endpoint
  // ------------------------------
  const fetchTodaySummaryData = async (agentName, startDate, endDate) => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/dashboard/today-summary-agent",
        { params: { agentAssignedName: agentName, startDate, endDate } }
      );
      setTodayStats(response.data);
    } catch (error) {
      console.error("Error fetching today summary data:", error);
    }
  };

  // ------------------------------
  // 2) Followup Summary endpoint
  // ------------------------------
  const fetchFollowupStatsData = async (agentName, startDate, endDate) => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/dashboard/followup-summary-agent",
        { params: { agentAssignedName: agentName, startDate, endDate } }
      );
      setFollowupStats(response.data);
    } catch (error) {
      console.error("Error fetching followup stats:", error);
    }
  };

  // ------------------------------
  // 3) All Time Data (unchanged)
  // ------------------------------
  const fetchAllTimeData = async (agentName) => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
        { params: { agentAssignedName: agentName, limit: 0 } }
      );
      const leads = response.data.leads || [];
      const salesDoneLeads = leads.filter(
        (lead) => lead.salesStatus === "Sales Done"
      );
      const totalSales = salesDoneLeads.reduce(
        (acc, lead) => acc + (lead.amountPaid || 0),
        0
      );
      setAllTimeStats({
        totalLeads: leads.length,
        salesDone: salesDoneLeads.length,
        conversionRate:
          leads.length > 0
            ? ((salesDoneLeads.length / leads.length) * 100).toFixed(2)
            : 0,
        totalSales,
        avgOrderValue:
          salesDoneLeads.length > 0
            ? (totalSales / salesDoneLeads.length).toFixed(2)
            : 0,
      });
    } catch (error) {
      console.error("Error fetching all-time data:", error);
    }
  };

  // ------------------------------
  // 4) Lead Source Summary (Limited) endpoint
  // ------------------------------
  const fetchLeadSourceSummaryLimited = async (startDate, endDate) => {
    try {
      setLoading(true);
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/dashboard/lead-source-summary-limited",
        {
          params: {
            agentAssignedName: user?.fullName,
            startDate,
            endDate,
          },
        }
      );
      const sourceSummary = response.data || [];
      setLeadSourceData(sourceSummary);

      const totalLeadsAssigned = sourceSummary.reduce(
        (acc, row) => acc + (row.leadsAssigned || 0),
        0
      );
      const totalLeadsConverted = sourceSummary.reduce(
        (acc, row) => acc + (row.leadsConverted || 0),
        0
      );
      const totalSalesAmount = sourceSummary.reduce(
        (acc, row) => acc + (row.salesAmount || 0),
        0
      );
      setTotals({
        leadsAssigned: totalLeadsAssigned,
        leadsConverted: totalLeadsConverted,
        conversionRate:
          totalLeadsAssigned > 0
            ? ((totalLeadsConverted / totalLeadsAssigned) * 100).toFixed(2)
            : 0,
        salesAmount: totalSalesAmount,
      });
    } catch (error) {
      console.error("Error fetching lead source summary:", error);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // 5) Delivery Status Summary (Limited) endpoint
  // ------------------------------
  const fetchDeliveryStatusSummaryLimited = async (startDate, endDate) => {
    try {
      setLoading(true);
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/dashboard/delivery-status-summary-limited",
        {
          params: {
            agentAssignedName: user?.fullName,
            startDate,
            endDate,
          },
        }
      );
      setDeliverySummary(response.data);
    } catch (error) {
      console.error("Error fetching delivery status summary limited:", error);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // HANDLERS
  // ------------------------------
  // When summary dropdown changes
  const handleSummaryChange = async (e) => {
    const newSummary = e.target.value;
    setSelectedSummary(newSummary);
    let dates = {};
    if (selectedRange !== "Custom range") {
      dates = getDateRange(selectedRange);
    } else {
      // For custom, use the picked dates
      dates = { startDate: customStart, endDate: customEnd };
    }
    if (!user?.fullName) return;

    if (newSummary === "Sales & Followup Summary") {
      await fetchTodaySummaryData(user.fullName, dates.startDate, dates.endDate);
      await fetchFollowupStatsData(user.fullName, dates.startDate, dates.endDate);
    } else if (newSummary === "Lead-Source & Delivery Summary") {
      await fetchLeadSourceSummaryLimited(dates.startDate, dates.endDate);
      await fetchDeliveryStatusSummaryLimited(dates.startDate, dates.endDate);
    }
  };

  // When time range dropdown changes
  const handleTimeRangeChange = async (e) => {
    const newRange = e.target.value;
    setSelectedRange(newRange);

    // If not custom, fetch data automatically using computed dates
    if (newRange !== "Custom range") {
      const { startDate, endDate } = getDateRange(newRange);
      if (!user?.fullName) return;
      if (selectedSummary === "Sales & Followup Summary") {
        await fetchTodaySummaryData(user.fullName, startDate, endDate);
        await fetchFollowupStatsData(user.fullName, startDate, endDate);
      } else if (selectedSummary === "Lead-Source & Delivery Summary") {
        await fetchLeadSourceSummaryLimited(startDate, endDate);
        await fetchDeliveryStatusSummaryLimited(startDate, endDate);
      }
    }
  };

  // Called when user clicks Apply for custom range
  const applyCustomRange = async () => {
    if (!customStart || !customEnd || !user?.fullName) return;
    if (selectedSummary === "Sales & Followup Summary") {
      await fetchTodaySummaryData(user.fullName, customStart, customEnd);
      await fetchFollowupStatsData(user.fullName, customStart, customEnd);
    } else if (selectedSummary === "Lead-Source & Delivery Summary") {
      await fetchLeadSourceSummaryLimited(customStart, customEnd);
      await fetchDeliveryStatusSummaryLimited(customStart, customEnd);
    }
  };

  // ------------------------------
  // Render Metrics
  // ------------------------------
  // "Today Summary" stats
  const stats1 = [
    {
      label: "Open Leads",
      icon: <PersonOutlineIcon fontSize="medium" style={{ color: "#1976d2" }} />,
      value:
        todayStats.openLeads !== undefined ? (
          todayStats.openLeads
        ) : (
          <CircularProgress size={20} />
        ),
    },
    {
      label: "Leads Assigned Today",
      icon: (
        <AssignmentTurnedInIcon fontSize="medium" style={{ color: "#28a745" }} />
      ),
      value:
        todayStats.leadsAssignedToday !== undefined ? (
          todayStats.leadsAssignedToday
        ) : (
          <CircularProgress size={20} />
        ),
    },
    {
      label: "Sales Done",
      icon: <LocalMallIcon fontSize="medium" style={{ color: "#f39c12" }} />,
      value:
        todayStats.salesDone !== undefined ? (
          todayStats.salesDone
        ) : (
          <CircularProgress size={20} />
        ),
    },
    {
      label: "Conversion Rate",
      icon: <TrendingUpIcon fontSize="medium" style={{ color: "#8e44ad" }} />,
      value:
        todayStats.conversionRate !== undefined ? (
          `${todayStats.conversionRate}%`
        ) : (
          <CircularProgress size={20} />
        ),
    },
    {
      label: "Total Sales",
      icon: <CurrencyRupee fontSize="medium" style={{ color: "#e74c3c" }} />,
      value:
        todayStats.totalSales !== undefined ? (
          `₹${todayStats.totalSales}`
        ) : (
          <CircularProgress size={20} />
        ),
    },
    {
      label: "Average Order Value",
      icon: (
        <CurrencyRupeeOutlined fontSize="medium" style={{ color: "#f1c40f" }} />
      ),
      value:
        todayStats.avgOrderValue !== undefined ? (
          `₹${todayStats.avgOrderValue}`
        ) : (
          <CircularProgress size={20} />
        ),
    },
  ];

  // "Followup Summary" stats
  const stats2 = [
    {
      label: "No Followup Set",
      icon: <Schedule sx={{ color: "#546E7A" }} />,
      value:
        followupStats.noFollowupSet !== undefined ? (
          followupStats.noFollowupSet
        ) : (
          <CircularProgress size={20} />
        ),
    },
    {
      label: "Followup Missed",
      icon: <EventBusy sx={{ color: "#D32F2F" }} />,
      value:
        followupStats.followupMissed !== undefined ? (
          followupStats.followupMissed
        ) : (
          <CircularProgress size={20} />
        ),
    },
    {
      label: "Followup Today",
      icon: <Today sx={{ color: "#388E3C" }} />,
      value:
        followupStats.followupToday !== undefined ? (
          followupStats.followupToday
        ) : (
          <CircularProgress size={20} />
        ),
    },
    {
      label: "Followup Tomorrow",
      icon: <EventAvailable sx={{ color: "#FFA000" }} />,
      value:
        followupStats.followupTomorrow !== undefined ? (
          followupStats.followupTomorrow
        ) : (
          <CircularProgress size={20} />
        ),
    },
    {
      label: "Followup Later",
      icon: <MoreTime sx={{ color: "#0288D1" }} />,
      value:
        followupStats.followupLater !== undefined ? (
          followupStats.followupLater
        ) : (
          <CircularProgress size={20} />
        ),
    },
  ];

  return (
    <Box
      sx={{
        padding: { xs: 2, sm: 3, md: 4 },
        width: { xs: "90%", sm: "85%", md: "85%", lg: "90%" },
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
      >
        {user?.fullName
          ? `${user.fullName} - Sales Dashboard`
          : "Sales Dashboard"}
      </Typography>

      {/* Summary Type & Time Range Dropdowns */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          flexWrap: "wrap",
          mb: 2,
          mt: 2,
        }}
      >
        <FormControl fullWidth variant="outlined" sx={{ width: 300 }}>
          <Select
            value={selectedSummary}
            onChange={handleSummaryChange}
            displayEmpty
            IconComponent={ExpandMore}
            renderValue={(val) => (val ? val : "Summary:")}
            sx={{
              backgroundColor: "#fff",
              color: "#333",
              borderRadius: 2,
              border: "1px solid #ccc",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#888" },
            }}
          >
            <MenuItem value="Sales & Followup Summary">
              <Typography variant="body2">Sales & Followup Summary</Typography>
            </MenuItem>
            <MenuItem value="Lead-Source & Delivery Summary">
              <Typography variant="body2">
                Lead-Source & Delivery Summary
              </Typography>
            </MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth variant="outlined" sx={{ width: 300 }}>
          <Select
            value={selectedRange}
            onChange={handleTimeRangeChange}
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
            {timeRangeOptions.map((option) => (
              <MenuItem key={option} value={option}>
                <Typography variant="body2">{option}</Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* If Custom Range is selected, show date pickers and Apply button */}
      {selectedRange === "Custom range" && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          <TextField
            label="Start Date"
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
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
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
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
            onClick={applyCustomRange}
            sx={{
              bgcolor: "#000000",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            Apply
          </Button>
        </Box>
      )}

      {selectedSummary === "Sales & Followup Summary" && (
        <>
          {/* Today Summary */}
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
              boxShadow: "0px 5px 15px rgba(0,0,0,0.05)",
            }}
          >
            <Typography
              variant="h5"
              fontWeight={600}
              gutterBottom
              color="#000000"
              textAlign="center"
            >
              Sales Summary
            </Typography>
            <Grid container spacing={2} sx={{ width: "100%" }}>
              {stats1.map(({ label, icon, value }) => (
                <Grid item xs={12} sm={6} md={4} key={label}>
                  <Box
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 2,
                      backgroundColor: "#F9FAFB",
                      boxShadow: "0px 3px 10px rgba(0,0,0,0.05)",
                      transition: "0.3s",
                      width: "90%",
                      minHeight: "130px",
                      margin: "0 auto",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0px 5px 15px rgba(0,0,0,0.1)",
                      },
                    }}
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

          {/* Followup Summary */}
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
              boxShadow: "0px 5px 15px rgba(0,0,0,0.05)",
            }}
          >
            <Typography
              variant="h5"
              fontWeight={600}
              gutterBottom
              color="#000000"
              textAlign="center"
            >
              Followup Summary
            </Typography>
            <Grid container spacing={2} sx={{ width: "100%" }}>
              {stats2.map(({ label, icon, value }) => (
                <Grid item xs={12} sm={6} md={4} key={label}>
                  <Box
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 2,
                      backgroundColor: "#F9FAFB",
                      boxShadow: "0px 3px 10px rgba(0,0,0,0.05)",
                      transition: "0.3s",
                      minHeight: "130px",
                      width: "90%",
                      margin: "0 auto",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0px 5px 15px rgba(0,0,0,0.1)",
                      },
                    }}
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

      {selectedSummary === "Lead-Source & Delivery Summary" && (
        <>
          {/* Lead Source Summary */}
          <Paper
            sx={{
              padding: { xs: 2, sm: 3, md: 4 },
              marginTop: 3,
              borderRadius: "8px",
              boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
              width: "100%",
              maxWidth: "1000px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              color="grey.800"
              gutterBottom
              textAlign="center"
            >
              Lead Source Summary
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: "none" }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#6D6D6D" }}>
                    {[
                      "Lead Source",
                      "Lead Assigned",
                      "Leads Converted",
                      "Conversion Rate",
                      "Sales Amount",
                    ].map((header, index) => (
                      <TableCell key={index} align="center">
                        <Typography fontWeight="bold" color="grey.50">
                          {header}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                {loading ? (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0 }}>
                        <LinearProgress sx={{ width: "100%", height: "2px" }} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                ) : (
                  <TableBody>
                    {leadSourceData && leadSourceData.length > 0 ? (
                      leadSourceData.map((row) => (
                        <TableRow
                          key={row.leadSource}
                          sx={{
                            "&:nth-of-type(odd)": { backgroundColor: "grey.200" },
                          }}
                        >
                          <TableCell sx={{ padding: "4px 8px" }}>
                            <Typography fontWeight="medium" color="grey.800">
                              {row.leadSource}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ padding: "4px 8px" }}>
                            <Typography color="grey.700">{row.leadsAssigned}</Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ padding: "4px 8px" }}>
                            <Typography color="grey.700">{row.leadsConverted}</Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ padding: "4px 8px" }}>
                            <Typography color="grey.700">{`${row.conversionRate}%`}</Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ padding: "4px 8px" }}>
                            <Typography color="grey.700">{`₹${row.salesAmount}`}</Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow
                      sx={{
                        backgroundColor: "grey.400",
                        "&:hover": { backgroundColor: "grey.500" },
                      }}
                    >
                      <TableCell>
                        <Typography fontWeight="bold" color="grey.800" sx={{ padding: "4px 8px" }}>
                          Total
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "4px 8px" }}>
                        {totals.leadsAssigned !== undefined ? (
                          <Typography color="grey.800" fontWeight="medium">
                            {totals.leadsAssigned}
                          </Typography>
                        ) : (
                          <CircularProgress size={20} />
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "4px 8px" }}>
                        {totals.leadsConverted !== undefined ? (
                          <Typography color="grey.800" fontWeight="medium">
                            {totals.leadsConverted}
                          </Typography>
                        ) : (
                          <CircularProgress size={20} />
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "4px 8px" }}>
                        {totals.conversionRate !== undefined ? (
                          <Typography color="grey.800" fontWeight="medium">
                            {`${totals.conversionRate}%`}
                          </Typography>
                        ) : (
                          <CircularProgress size={20} />
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "4px 8px" }}>
                        {totals.salesAmount !== undefined ? (
                          <Typography color="grey.800" fontWeight="medium">
                            {`₹${totals.salesAmount}`}
                          </Typography>
                        ) : (
                          <CircularProgress size={20} />
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </TableContainer>
          </Paper>

          {/* Delivery Status Summary */}
          <Paper
            sx={{
              padding: { xs: 2, sm: 3, md: 4 },
              marginTop: 3,
              borderRadius: "8px",
              boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
              width: "100%",
              maxWidth: "1000px",
              marginLeft: "auto",
              marginRight: "auto",
              mt: 3,
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              color="grey.800"
              gutterBottom
              textAlign="center"
            >
              Delivery Status Summary
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: "none" }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#6D6D6D" }}>
                    {["Category", "Total Orders", "Total Amount", "Percentage"].map(
                      (header, index) => (
                        <TableCell key={index} align="center">
                          <Typography fontWeight="bold" color="grey.50">
                            {header}
                          </Typography>
                        </TableCell>
                      )
                    )}
                  </TableRow>
                </TableHead>
                {loading ? (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4} sx={{ p: 0 }}>
                        <LinearProgress sx={{ width: "100%", height: "2px" }} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                ) : (
                  <TableBody>
                    {deliverySummary && deliverySummary.length > 0 ? (
                      deliverySummary.map((row) => (
                        <TableRow
                          key={row.label}
                          sx={{
                            "&:nth-of-type(odd)": { backgroundColor: "grey.200" },
                            "&:hover": { backgroundColor: "grey.500" },
                          }}
                        >
                          <TableCell>
                            <Typography fontWeight="bold" color="text.primary">
                              {row.label}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography color="text.secondary">
                              {row.totalOrders}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography color="text.secondary">
                              {`₹${row.totalAmount}`}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography color="text.secondary">
                              {`${row.percentage}%`}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                )}
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default AgentDashboard;
