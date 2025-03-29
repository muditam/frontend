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

// Define a blinking icon style (if needed elsewhere)
const BlinkingIcon = styled(WarningAmberIcon)({
  animation: "blink-animation 1.5s steps(2, start) infinite",
  "@keyframes blink-animation": {
    "50%": { opacity: 0 },
  },
  color: "red",
});

// Compute default date filter for the current month.
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
  const [allTimeMetrics, setAllTimeMetrics] = useState({});
  const [shipmentSummary, setShipmentSummary] = useState([]);
  const [applyingShipment, setApplyingShipment] = useState(false);
  const [dateFilter, setDateFilter] = useState(getCurrentMonthDateFilter());
  const [selectedSummary, setSelectedSummary] = useState("Today-Followup Summary");

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

  // Updated fetch function:
  // - Gets Today Summary from its dedicated endpoint.
  // - Gets Followup Summary from its dedicated endpoint.
  // - Gets All Time Summary from its dedicated endpoint.
  const fetchDashboardData = async (retentionAgentName, retentionAgentEmail) => {
    try {
      setLoading(true);
      // 1. Get Today Summary.
      const todaySummaryResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/today-summary",
        { params: { agentName: retentionAgentName } }
      );
      setTodayMetrics(todaySummaryResponse.data);

      // 2. Get Followup Summary.
      const followupSummaryResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/followup-summary",
        { params: { agentName: retentionAgentName } }
      );
      setFollowupMetrics(followupSummaryResponse.data);

      // 3. Get All Time Summary.
      const allTimeSummaryResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/all-time-summary",
        { params: { agentName: retentionAgentName } }
      );
      setAllTimeMetrics(allTimeSummaryResponse.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // New Shipment Summary fetch function using a dedicated endpoint.
  const fetchShipmentStatusSummary = async (retentionAgentName) => {
    try {
      setApplyingShipment(true);
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/shipment-summary", {
        params: {
          agentName: retentionAgentName,
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate,
        },
      });
      setShipmentSummary(response.data);
    } catch (error) {
      console.error("Error fetching shipment status summary:", error);
    } finally {
      setApplyingShipment(false);
    }
  };

  useEffect(() => {
    if (user.fullName && user.email) {
      fetchDashboardData(user.fullName, user.email);
      fetchShipmentStatusSummary(user.fullName);
    }
  }, [user.fullName, user.email]);

  return (
    <Box
      sx={{
        padding: { xs: 2, sm: 3, md: 4 },
        width: { xs: "90%", sm: "85%", md: "85%", lg: "90%" },
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <Typography variant="h4" gutterBottom fontWeight={600} color="#000000" textAlign="center">
        {user?.fullName} - Retention Agent Dashboard
      </Typography>

      {/* Summary Toggle */}
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%", mb: 2, mt: 2 }}>
        <FormControl fullWidth variant="outlined" sx={{ width: 300 }}>
          <Select
            value={selectedSummary}
            onChange={(e) => setSelectedSummary(e.target.value)}
            displayEmpty
            IconComponent={ExpandMore}
            renderValue={(selected) => (selected ? `${selected}` : "Summary:")}
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
              <Typography variant="body2">Today & Followup Summary</Typography>
            </MenuItem>
            <MenuItem value="All Time Summary">
              <Typography variant="body2">All Time Summary</Typography>
            </MenuItem>
            <MenuItem value="Shipment Summary">
              <Typography variant="body2">Shipment Summary</Typography>
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      {selectedSummary === "Today-Followup Summary" && (
        <>
          {/* Today Summary Section */}
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
            <Typography variant="h5" fontWeight={600} gutterBottom color="#000000" textAlign="center">
              Today Summary
            </Typography>
            <Grid container spacing={2} sx={{ width: "100%" }}>
              {[
                {
                  label: "Active Customers",
                  value: todayMetrics.activeCustomers || 0,
                  icon: <PersonOutline fontSize="medium" sx={{ color: "#1976D2" }} />,
                },
                {
                  label: "Sales Done Today",
                  value: todayMetrics.salesDone || 0,
                  icon: <LocalMall fontSize="medium" sx={{ color: "#f57c00" }} />,
                },
                {
                  label: "Total Sales",
                  value: `₹${(todayMetrics.totalSales || 0).toFixed(2)}`,
                  icon: <CurrencyRupee fontSize="medium" sx={{ color: "#9c27b0" }} />,
                },
                {
                  label: "Average Order Value",
                  value: `₹${(todayMetrics.avgOrderValue || 0).toFixed(2)}`,
                  icon: <CurrencyRupeeOutlined fontSize="medium" sx={{ color: "#d32f2f" }} />,
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
            <Typography variant="h5" fontWeight={600} gutterBottom color="#000000" textAlign="center">
              Followup Summary
            </Typography>
            <Grid container spacing={2} sx={{ width: "100%" }}>
              {[
                {
                  label: "No Followup Set",
                  key: "noFollowupSet",
                  icon: <Schedule sx={{ color: "#546E7A" }} />,
                  value:
                    followupMetrics.noFollowupSet !== undefined ? followupMetrics.noFollowupSet : <CircularProgress size={20} />,
                },
                {
                  label: "Followup Missed",
                  key: "followupMissed",
                  icon: <EventBusy sx={{ color: "#D32F2F" }} />,
                  value:
                    followupMetrics.followupMissed !== undefined ? followupMetrics.followupMissed : <CircularProgress size={20} />,
                },
                {
                  label: "Followup Today",
                  key: "followupToday",
                  icon: <Today sx={{ color: "#388E3C" }} />,
                  value:
                    followupMetrics.followupToday !== undefined ? followupMetrics.followupToday : <CircularProgress size={20} />,
                },
                {
                  label: "Followup Tomorrow",
                  key: "followupTomorrow",
                  icon: <EventAvailable sx={{ color: "#FFA000" }} />,
                  value:
                    followupMetrics.followupTomorrow !== undefined ? followupMetrics.followupTomorrow : <CircularProgress size={20} />,
                },
                {
                  label: "Followup Later",
                  key: "followupLater",
                  icon: <MoreTime sx={{ color: "#0288D1" }} />,
                  value:
                    followupMetrics.followupLater !== undefined ? followupMetrics.followupLater : <CircularProgress size={20} />,
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

      {selectedSummary === "All Time Summary" && (
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
          <Typography variant="h5" fontWeight={600} gutterBottom color="#000000" textAlign="center">
            All Time
          </Typography>
          <Grid container spacing={2} sx={{ width: "100%" }}>
            {[
              {
                label: "Total Customers",
                value: allTimeMetrics.totalCustomers || 0,
                icon: <PeopleAlt sx={{ color: "#0288D1" }} />,
              },
              {
                label: "Customers Retained This Month",
                value: allTimeMetrics.customersRetainedThisMonth || 0,
                icon: <PersonAdd sx={{ color: "#388E3C" }} />,
              },
              {
                label: "Retention Rate",
                value: `${allTimeMetrics.retentionRate || 0}%`,
                icon: <BarChart sx={{ color: "#FF5722" }} />,
              },
              {
                label: "Active Customers",
                value: allTimeMetrics.activeCustomers || 0,
                icon: <PersonOutline sx={{ color: "#4CAF50" }} />,
              },
              {
                label: "Lost Customers",
                value: allTimeMetrics.lostCustomers || 0,
                icon: <Cancel sx={{ color: "#D32F2F" }} />,
              },
              {
                label: "Sales Done",
                value: allTimeMetrics.salesDone || 0,
                icon: <LocalMall sx={{ color: "#9C27B0" }} />,
              },
              {
                label: "Total Sales",
                value: `₹${(allTimeMetrics.totalSales || 0).toFixed(2)}`,
                icon: <CurrencyRupee sx={{ color: "#1976D2" }} />,
              },
              {
                label: "Average Order Value",
                value: `₹${(allTimeMetrics.avgOrderValue || 0).toFixed(2)}`,
                icon: <CurrencyRupeeOutlined sx={{ color: "#FF9800" }} />,
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
                      {value}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

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
            }}
          >
            Shipment Status
          </Typography>
          {/* Date Filter Controls */}
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
