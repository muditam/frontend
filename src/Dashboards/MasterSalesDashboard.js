import React, { useEffect, useState, useCallback } from "react";
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
  MenuItem,
  Select,
  FormControl,
  TextField,
  Button,
  Dialog,
  DialogTitle, 
  DialogContent,
  DialogActions,
} from "@mui/material";
import axios from "axios";


import {
  Assignment,
  BarChart,
  CurrencyRupee,
  CurrencyRupeeOutlined,
  EventAvailable,
  EventBusy,
  MoreTime,
  Schedule,
  ShoppingCart,
  Today,
  TrendingUp,
} from "@mui/icons-material";


import ExpandMoreIcon from "@mui/icons-material/ExpandMore";


// -------------------------------------------
// 1) Time-range dropdown options
// -------------------------------------------
const timeRangeOptions = [
  "Custom range",
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
];


// -------------------------------------------
// 2) Convert date => 'YYYY-MM-DD'
// -------------------------------------------
const toISODate = (d) => d.toISOString().split("T")[0];


// -------------------------------------------
// 3) Compute start/end date from a range
// -------------------------------------------
const getDateRange = (rangeValue) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);


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
    case "Week to date": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(now.getDate() - diff);
      break;
    }
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
    default:
      break;
  }
  return { startDate: toISODate(start), endDate: toISODate(end) };
};


const ManagerSalesDashboard = () => {
  // Basic states
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);


  // Summaries
  const [todayStats, setTodayStats] = useState([]);
  const [followupStats, setFollowupStats] = useState([]);
  const [leadSourceData, setLeadSourceData] = useState([]);


  // Agents (for lead source summary and shipment summary)
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("All Agents");


  // The selected summary:
  //   "Sales Summary",
  //   "Followup Summary",
  //   "Lead Source Summary",
  //   "Shipment Summary"  <-- newly added
  const [selectedSummary, setSelectedSummary] = useState("Sales Summary");


  // Time range
  const [range, setRange] = useState("Today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");


  // Sales summary metrics
  const [salesSummary, setSalesSummary] = useState({
    openLeads: undefined,
    leadsAssigned: undefined,
    salesDone: undefined,
    conversionRate: undefined,
    totalSales: undefined,
    avgOrderValue: undefined,
  });


  // For "Shipment Summary" table
  const [shipmentData, setShipmentData] = useState([]);


  // State for Sales Done Order IDs popup
  const [orderIdsPopupOpen, setOrderIdsPopupOpen] = useState(false);
  const [orderIds, setOrderIds] = useState("");


  // On mount, fetch user & agents
  useEffect(() => {
    const loggedInUser = JSON.parse(sessionStorage.getItem("user"));
    if (loggedInUser?.role === "Manager") {
      setUser(loggedInUser);
      fetchAgents();
    }
  }, []);


  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      // Only active sales agents
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees", {
        params: { role: "Sales Agent" },
      });
      const activeAgents = response.data
        .filter((agent) => agent.status === "active")
        .map((agent) => agent.fullName);
      setAgents(["All Agents", ...activeAgents]);  
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  }, []);


  // ------------------------------------------------------
  // 1) Sales Summary
  // ------------------------------------------------------
  const fetchSalesSummaryData = useCallback(async (startDate, endDate) => {
    setLoading(true);
    try {
      // 1) MyOrder metrics from /sales-metrics
      const metricsRes = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders/combined/sales-metrics",
        { params: { startDate, endDate } }
      );
      const { salesDone, totalSales, avgOrderValue } = metricsRes.data;


      // 2) Overall leads from /sales-summary
      const overallRes = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/sales-summary",
        { params: { startDate, endDate } }
      );
      const overall = overallRes.data.overall || {};
      const leadsAssigned = overall.leadsAssigned || 0;


      // Conversion rate
      const conversionRate =
        leadsAssigned > 0 ? ((salesDone / leadsAssigned) * 100).toFixed(2) : 0;


      setSalesSummary({
        openLeads: overall.openLeads,
        leadsAssigned: overall.leadsAssigned,
        salesDone,
        conversionRate,
        totalSales,
        avgOrderValue,
      });


      // Agent-level performance
      setTodayStats(overallRes.data.perAgent || []);
    } catch (error) {
      console.error("Error fetching sales summary data:", error);
    } finally {
      setLoading(false);
    }
  }, []);


  // ------------------------------------------------------
  // 2) Followup Summary
  // ------------------------------------------------------
  const fetchFollowupData = useCallback(async (startDate, endDate) => {
    setLoading(true);
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/followup-summarys", {
        params: { startDate, endDate },
      });
      const { followup = [] } = response.data;
      setFollowupStats(followup);
    } catch (error) {
      console.error("Error fetching followup summary data:", error);
    } finally {
      setLoading(false);
    }
  }, []);


  // ------------------------------------------------------
  // 3) Lead Source Summary
  // ------------------------------------------------------
  const fetchLeadSourceData = useCallback(
    async (startDate, endDate) => {
      setLoading(true);
      try {
        const params = { startDate, endDate };
        if (selectedAgent && selectedAgent !== "All Agents") {
          params.agentAssignedName = selectedAgent;
        }
        const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/lead-source-summary", {
          params,
        });
        const { leadSourceSummary = [] } = response.data;
        setLeadSourceData(leadSourceSummary);
      } catch (error) {
        console.error("Error fetching lead source summary data:", error);
      } finally {
        setLoading(false);
      }
    },
    [selectedAgent]
  );


  // ------------------------------------------------------
  // 4) Shipment Summary
  // ------------------------------------------------------
  const [shipmentAgent, setShipmentAgent] = useState("All Agents");
  // In your ManagerSalesDashboard.js (Shipment Summary section)
  const fetchShipmentData = useCallback(
    async (startDate, endDate) => {
      setLoading(true);
      try {
        const params = { startDate, endDate };
        if (selectedAgent && selectedAgent !== "All Agents") {
                   params.agentName = selectedAgent;
                 }
        // Remove or ignore the agent filter since it's not applicable for the Order schema.
        const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/all-shipment-summary", { params });
        setShipmentData(response.data || []);


      } catch (error) {
        console.error("Error fetching shipment data:", error);
        setShipmentData([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedAgent]
  );

  // Combined table fetch
  const fetchTableData = useCallback(
    async (summary, startDate, endDate) => {
      setTableLoading(true);
      try {
        switch (summary) {
          case "Sales Summary":
            await fetchSalesSummaryData(startDate, endDate);
            break;
          case "Followup Summary":
            await fetchFollowupData(startDate, endDate);
            break;
          case "Lead Source Summary":
            await fetchLeadSourceData(startDate, endDate);
            break;
          case "Shipment Summary":
            await fetchShipmentData(startDate, endDate);
            break;
          default:
            console.warn("Unknown table selected");
        }
      } catch (error) {
        console.error(`Error fetching ${summary} data:`, error);
      } finally {
        setTableLoading(false);
      }
    },
    [
      fetchSalesSummaryData,
      fetchFollowupData,
      fetchLeadSourceData,
      fetchShipmentData,
    ]
  );


  // Handle range changes
  const handleRangeChange = async (e) => {
    const newRange = e.target.value;
    setRange(newRange);
    if (newRange !== "Custom range") {
      const { startDate, endDate } = getDateRange(newRange);
      setCustomStart("");
      setCustomEnd("");
      await fetchTableData(selectedSummary, startDate, endDate);
    }
  };


  // Handle custom range "Apply"
  const applyCustomRange = async () => {
    if (customStart && customEnd) {
      await fetchTableData(selectedSummary, customStart, customEnd);
    }
  };


  // Re-fetch when summary or range changes
  useEffect(() => {
    if (!selectedSummary) return;
    if (range === "Custom range" && customStart && customEnd) {
      fetchTableData(selectedSummary, customStart, customEnd);
    } else {
      const { startDate, endDate } = getDateRange(range);
      fetchTableData(selectedSummary, startDate, endDate);
    }
  }, [selectedSummary, range, customStart, customEnd, fetchTableData]);


  // Re-fetch lead source or shipment if agent changes
  useEffect(() => {
    if (selectedSummary === "Lead Source Summary") {
      if (range === "Custom range" && customStart && customEnd) {
        fetchLeadSourceData(customStart, customEnd);
      } else {
        const { startDate, endDate } = getDateRange(range);
        fetchLeadSourceData(startDate, endDate);
      }
    } else if (selectedSummary === "Shipment Summary") {
            const [startDate, endDate] =
              range === "Custom range" && customStart && customEnd
                ? [customStart, customEnd]
                : Object.values(getDateRange(range));
     
            fetchShipmentData(startDate, endDate);
          }
   
  }, [
    selectedAgent,
    shipmentAgent,
    selectedSummary,
    range,
    customStart,
    customEnd,
    fetchLeadSourceData,
    fetchShipmentData,
  ]);


  // Handler for Sales Done card click to open popup
  const handleSalesDoneClick = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/sales-order-ids", {
        params: {},
      });
      const ids = response.data.orderIds.join(", ");
      setOrderIds(ids);
    } catch (error) {
      console.error("Error fetching order IDs:", error);
      setOrderIds("Order123, Order456, Order789");
    }
    setOrderIdsPopupOpen(true);
  };


  // --------------- Metrics for Sales Summary ---------------
  const metrics1 = [
    {
      label: "Open Leads",
      value: salesSummary.openLeads,
      icon: <TrendingUp sx={{ color: "#1976D2" }} />,
    },
    {
      label: "Leads Assigned",
      value: salesSummary.leadsAssigned,
      icon: <Assignment sx={{ color: "#FF9800" }} />,
    },
    {
      label: "Sales Done",
      value: salesSummary.salesDone,
      icon: (
        <ShoppingCart
          sx={{ color: "#4CAF50", cursor: "pointer" }}
          onClick={handleSalesDoneClick}
        />
      ),
    },
    {
      label: "Conversion Rate",
      value:
        salesSummary.conversionRate !== undefined
          ? `${salesSummary.conversionRate}%`
          : undefined,
      icon: <BarChart sx={{ color: "#9C27B0" }} />,
    },
    {
      label: "Total Sales",
      value:
        salesSummary.totalSales !== undefined
          ? `₹${salesSummary.totalSales}`
          : undefined,
      icon: <CurrencyRupee sx={{ color: "#F44336" }} />,
    },
    {
      label: "Average Order Value",
      value:
        salesSummary.avgOrderValue !== undefined
          ? `₹${salesSummary.avgOrderValue}`
          : undefined,
      icon: <CurrencyRupeeOutlined sx={{ color: "#3F51B5" }} />,
    },
  ];


  // --------------- Metrics for Followup Summary ---------------
  const metrics2 = [
    {
      label: "No Followup Set",
      key: "noFollowupSet",
      value: followupStats.length
        ? followupStats.reduce((sum, stat) => sum + (stat.noFollowupSet || 0), 0)
        : 0,
      icon: <Schedule sx={{ color: "#546E7A" }} />,
      bgColor: "#ECEFF1",
    },
    {
      label: "Followup Missed",
      key: "followupMissed",
      value: followupStats.length
        ? followupStats.reduce((sum, stat) => sum + (stat.followupMissed || 0), 0)
        : 0,
      icon: <EventBusy sx={{ color: "#D32F2F" }} />,
      bgColor: "#FFEBEE",
    },
    {
      label: "Followup Today",
      key: "followupToday",
      value: followupStats.length
        ? followupStats.reduce((sum, stat) => sum + (stat.followupToday || 0), 0)
        : 0,
      icon: <Today sx={{ color: "#388E3C" }} />,
      bgColor: "#E8F5E9",
    },
    {
      label: "Followup Tomorrow",
      key: "followupTomorrow",
      value: followupStats.length
        ? followupStats.reduce((sum, stat) => sum + (stat.followupTomorrow || 0), 0)
        : 0,
      icon: <EventAvailable sx={{ color: "#FFA000" }} />,
      bgColor: "#FFF8E1",
    },
    {
      label: "Followup Later",
      key: "followupLater",
      value: followupStats.length
        ? followupStats.reduce((sum, stat) => sum + (stat.followupLater || 0), 0)
        : 0,
      icon: <MoreTime sx={{ color: "#0288D1" }} />,
      bgColor: "#E3F2FD",
    },
  ];


  // --------------- Shipment Summary Table columns ---------------
  // Example columns: "Category", "Count", "Amount", "Percentage"
  // We'll display data from shipmentData
  const shipmentColumns = ["Category", "Count", "Amount", "Percentage"];


  return (
    <Box sx={{ padding: 3 }}>
      {/* Dashboard Title */}
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{
          textAlign: "center",
          color: "#1E293B",
          letterSpacing: "0.8px", 
          mb: 3,
          mt: -5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          background: "linear-gradient(90deg, rgb(0, 0, 0), rgb(0, 0, 0))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: { xs: "1.8rem", md: "2.2rem" },
        }}
      >
        {user?.fullName
          ? `${user.fullName} - Sales Team Dashboard`
          : "Sales Team Dashboard"}
      </Typography>


      {/* Summary & Time Range Dropdowns */}
      <Box
        sx={{
          display: "flex",
          gap: 3,
          alignItems: "center",
          justifyContent: "center",
          ml: 25,
          width: "70%",
          mb: 2,
          mt: 4,
        }}
      >
        <FormControl fullWidth variant="outlined" sx={{ width: 300 }}>
          <Select
            value={selectedSummary}
            onChange={(e) => setSelectedSummary(e.target.value)}
            key={selectedSummary}
            displayEmpty
            IconComponent={ExpandMoreIcon}
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
            <MenuItem value="Sales Summary">
              <Typography variant="body2">Sales Summary</Typography>
            </MenuItem>
            <MenuItem value="Followup Summary">
              <Typography variant="body2">Followup Summary</Typography>
            </MenuItem>
            <MenuItem value="Lead Source Summary">
              <Typography variant="body2">Lead Source Summary</Typography>
            </MenuItem>
            {/* NEW SHIPMENT SUMMARY OPTION */}
            <MenuItem value="Shipment Summary">
              <Typography variant="body2">All Shipment Summary</Typography>
            </MenuItem>
          </Select>
        </FormControl>


        {/* Time range dropdown (shared by all summaries) */}
        {["Sales Summary", "Followup Summary", "Lead Source Summary", "Shipment Summary"].includes(
          selectedSummary
        ) && (
            <>
              <TextField
                select
                label="Select Range"
                value={range}
                onChange={handleRangeChange}
                sx={{
                  width: 220,
                  backgroundColor: "#F9F9F9",
                  borderRadius: 2,
                }}
              >
                {timeRangeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              {range === "Custom range" && (
                <>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      width: 160,
                      backgroundColor: "#F9F9F9",
                      borderRadius: 2,
                    }}
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      width: 160,
                      backgroundColor: "#F9F9F9",
                      borderRadius: 2,
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={applyCustomRange}
                    sx={{
                      backgroundColor: "#1976D2",
                      "&:hover": { backgroundColor: "#1565C0" },
                    }}
                  >
                    Apply
                  </Button>
                </>
              )}
            </>
          )}
      </Box>


      {/* -------------------- SALES SUMMARY -------------------- */}
      {selectedSummary === "Sales Summary" && (
        <>
          {/* Top Metrics */}
          <Box
            sx={{
              padding: 2,
              marginTop: 3,
              borderRadius: 2,
              backgroundColor: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "900px",
              margin: "0 auto",
              boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.05)",
              mb: 3,
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{
                textAlign: "center",
                letterSpacing: "0.5px",
                mb: 3,
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontFamily: "'Poppins', sans-serif",
                background: "linear-gradient(45deg, rgb(0, 0, 0), rgb(0, 0, 0))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Sales Summary
            </Typography>
            <Grid container spacing={2} sx={{ width: "100%" }}>
              {[
                {
                  label: "Open Leads",
                  value: salesSummary.openLeads,
                  icon: <TrendingUp sx={{ color: "#1976D2" }} />,
                },
                {
                  label: "Leads Assigned",
                  value: salesSummary.leadsAssigned,
                  icon: <Assignment sx={{ color: "#FF9800" }} />,
                },
                {
                  label: "Sales Done",
                  value: salesSummary.salesDone,
                  icon: (
                    <ShoppingCart
                      sx={{ color: "#4CAF50", cursor: "pointer" }}
                      onClick={handleSalesDoneClick}
                    />
                  ),
                },
                {
                  label: "Conversion Rate",
                  value:
                    salesSummary.conversionRate !== undefined
                      ? `${salesSummary.conversionRate}%`
                      : undefined,
                  icon: <BarChart sx={{ color: "#9C27B0" }} />,
                },
                {
                  label: "Total Sales",
                  value:
                    salesSummary.totalSales !== undefined
                      ? `₹${salesSummary.totalSales}`
                      : undefined,
                  icon: <CurrencyRupee sx={{ color: "#F44336" }} />,
                },
                {
                  label: "Average Order Value",
                  value:
                    salesSummary.avgOrderValue !== undefined
                      ? `₹${salesSummary.avgOrderValue}`
                      : undefined,
                  icon: <CurrencyRupeeOutlined sx={{ color: "#3F51B5" }} />,
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
                      width: "90%",
                      margin: "0 auto",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
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


          {/* Table for agent-level performance */}
          <Box
            sx={{
              padding: 2,
              marginTop: 3,
              borderRadius: 2,
              boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)",
              backgroundColor: "white",
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{
                textAlign: "center",
                color: "#333",
                letterSpacing: "0.5px",
                mb: 3,
              }}
            >
              Agent Performance
            </Typography>
            <TableContainer
              sx={{
                borderRadius: 2,
                boxShadow: 1,
                overflowX: "auto",
              }}
            >
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      backgroundColor: "#F8F9FA",
                      borderBottom: "1px solid #E0E0E0",
                    }}
                  >
                    {[
                      "Agent Name",
                      "Open Leads",
                      "Leads Assigned",
                      "Sales Done",
                      "Conversion Rate",
                      "Total Sales",
                      "Average Order Value",
                    ].map((head) => (
                      <TableCell
                        key={head}
                        sx={{
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "#6C757D",
                          fontSize: "14px",
                          padding: "8px",
                        }}
                      >
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                {tableLoading && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ padding: 0 }}>
                        <LinearProgress
                          variant="indeterminate"
                          sx={{ width: "100%", height: "1px" }}
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
                <TableBody>
                  {!tableLoading &&
                    todayStats.map((row, index) => (
                      <TableRow
                        key={row.agentName}
                        sx={{
                          backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F9F9F9",
                          "&:hover": {
                            backgroundColor: "#F1F3F5",
                            transition: "0.3s",
                          },
                        }}
                      >
                        <TableCell
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            padding: "8px",
                          }}
                        >
                          {row.agentName}
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "8px" }}>
                          {row.openLeads || 0}
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "8px" }}>
                          {row.leadsAssigned || 0}
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "8px" }}>
                          {row.salesDone || 0}
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "8px" }}>
                          {row.conversionRate || 0}%
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "8px" }}>
                          ₹{row.totalSales || 0}
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "8px" }}>
                          ₹{row.avgOrderValue || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  {!tableLoading && todayStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ padding: "8px" }}>
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}


      {/* -------------------- FOLLOWUP SUMMARY -------------------- */}
      {selectedSummary === "Followup Summary" && (
        <>
          <Box
            sx={{
              padding: 2,
              marginTop: 3,
              borderRadius: 2,
              backgroundColor: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "900px",
              margin: "0 auto",
              boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.05)",
              mb: 3,
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{
                textAlign: "center",
                letterSpacing: "0.5px",
                mb: 3,
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontFamily: "'Poppins', sans-serif",
                background: "linear-gradient(45deg, rgb(0, 0, 0), rgb(0, 0, 0))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Followup Summary
            </Typography>
            <Grid container spacing={2} sx={{ width: "100%" }}>
              {[
                {
                  label: "No Followup Set",
                  key: "noFollowupSet",
                  icon: <Schedule sx={{ color: "#546E7A" }} />,
                  bgColor: "#ECEFF1",
                },
                {
                  label: "Followup Missed",
                  key: "followupMissed",
                  icon: <EventBusy sx={{ color: "#D32F2F" }} />,
                  bgColor: "#FFEBEE",
                },
                {
                  label: "Followup Today",
                  key: "followupToday",
                  icon: <Today sx={{ color: "#388E3C" }} />,
                  bgColor: "#E8F5E9",
                },
                {
                  label: "Followup Tomorrow",
                  key: "followupTomorrow",
                  icon: <EventAvailable sx={{ color: "#FFA000" }} />,
                  bgColor: "#FFF8E1",
                },
                {
                  label: "Followup Later",
                  key: "followupLater",
                  icon: <MoreTime sx={{ color: "#0288D1" }} />,
                  bgColor: "#E3F2FD",
                },
              ].map(({ label, key, icon, bgColor }) => {
                const value = followupStats.length
                  ? followupStats.reduce((sum, stat) => sum + (stat[key] || 0), 0)
                  : 0;
                return (
                  <Grid item xs={12} sm={6} md={4} key={label}>
                    <Box
                      sx={{
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        borderRadius: 2,
                        backgroundColor: bgColor,
                        boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)",
                        transition: "0.3s",
                        width: "90%",
                        margin: "0 auto",
                        "&:hover": {
                          transform: "translateY(-3px)",
                          boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
                        },
                      }}
                    >
                      <Box sx={{ fontSize: 28, mr: 2 }}>{icon}</Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: "#555" }}>
                          {label}
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: "#333" }}>
                          {loading ? <CircularProgress size={18} /> : value}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>


          <Paper
            sx={{
              padding: 1.5,
              borderRadius: 2,
              boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              textAlign="center"
              gutterBottom
              sx={{ marginBottom: 1 }}
            >
              Detailed Followup Summary
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: "none" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#424242" }}>
                    {[
                      "Agent Name",
                      "No Followup Set",
                      "Followup Missed",
                      "Followup Today",
                      "Followup Tomorrow",
                      "Followup Later",
                    ].map((header) => (
                      <TableCell
                        key={header}
                        sx={{
                          color: "#fff",
                          fontWeight: "bold",
                          textAlign: "center",
                          padding: "8px",
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <CircularProgress size={20} />
                      </TableCell>
                    </TableRow>
                  ) : followupStats.length > 0 ? (
                    followupStats.map((row, index) => (
                      <TableRow
                        key={row.agentName}
                        sx={{
                          backgroundColor: index % 2 === 0 ? "#F5F5F5" : "#FFFFFF",
                          "&:hover": {
                            backgroundColor: "#E0E0E0",
                            transition: "0.3s",
                          },
                        }}
                      >
                        <TableCell sx={{ textAlign: "center", fontWeight: 500, padding: "8px" }}>
                          {row.agentName}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", padding: "8px" }}>
                          {row.noFollowupSet}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", padding: "8px" }}>
                          {row.followupMissed}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", padding: "8px" }}>
                          {row.followupToday}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", padding: "8px" }}>
                          {row.followupTomorrow}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", padding: "8px" }}>
                          {row.followupLater}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align="center"
                        sx={{ padding: "10px", color: "#888", fontStyle: "italic" }}
                      >
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}


      {/* -------------------- LEAD SOURCE SUMMARY -------------------- */}
      {selectedSummary === "Lead Source Summary" && (
        <Box
          sx={{
            padding: 2,
            marginTop: 3,
            backgroundColor: "#FFFFFF",
            borderRadius: 2,
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ textAlign: "center", color: "#333", marginBottom: 3 }}
          >
            Lead Source Summary
          </Typography>
          {/* Agent Filter */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              marginBottom: 2,
              justifyContent: "center",
            }}
          >
            <FormControl sx={{ width: "30%" }}>
              <Select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                defaultValue="All Agents"
                sx={{ backgroundColor: "#F9F9F9", borderRadius: 1 }}
              >
                {agents.map((agent) => (
                  <MenuItem key={agent} value={agent}>
                    {agent}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>


          <TableContainer
            sx={{ borderRadius: 2, boxShadow: 1, overflowX: "auto" }}
            component={Paper}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: "#F8F9FA",
                    borderBottom: "1px solid #E0E0E0",
                  }}
                >
                  {[
                    "Lead Source",
                    "Leads Assigned",
                    "Leads Converted",
                    "Conversion Rate",
                    "Sales Amount",
                  ].map((head) => (
                    <TableCell
                      key={head}
                      sx={{
                        fontWeight: "bold",
                        textAlign: "center",
                        color: "#6C757D",
                        fontSize: "14px",
                        padding: "8px",
                      }}
                    >
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableLoading && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ padding: 0 }}>
                      <LinearProgress sx={{ width: "100%", height: "1px" }} />
                    </TableCell>
                  </TableRow>
                )}
                {!tableLoading && leadSourceData.length > 0
                  ? leadSourceData.map((row, index) => (
                    <TableRow
                      key={row.leadSource}
                      sx={{
                        backgroundColor:
                          index % 2 === 0 ? "#FFFFFF" : "#F9F9F9",
                        "&:hover": {
                          backgroundColor: "#F1F3F5",
                          transition: "0.3s",
                        },
                      }}
                    >
                      <TableCell sx={{ padding: "8px" }}>
                        {row.leadSource}
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "8px" }}>
                        {row.leadsAssigned}
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "8px" }}>
                        {row.leadsConverted}
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "8px" }}>
                        {`${row.conversionRate}%`}
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "8px" }}>
                        ₹{row.salesAmount}
                      </TableCell>
                    </TableRow>
                  ))
                  : !tableLoading && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ padding: "8px" }}>
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}


      {/* -------------------- SHIPMENT SUMMARY -------------------- */}
      {selectedSummary === "Shipment Summary" && (
        <Box
          sx={{
            padding: 2,
            marginTop: 3,
            backgroundColor: "#FFFFFF",
            borderRadius: 2,
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ textAlign: "center", color: "#333", marginBottom: 3 }}
          >
            Shipment Status Summary
          </Typography>


          {/* Agent Filter for Shipment Summary */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              marginBottom: 2,
              justifyContent: "center",
            }}
          >
            <FormControl sx={{ width: "30%" }}>
              <Select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                defaultValue="All Agents"
                sx={{ backgroundColor: "#F9F9F9", borderRadius: 1 }}
              >
                {agents.map((agent) => (
                  <MenuItem key={agent} value={agent}>
                    {agent}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>


          <TableContainer
            sx={{ borderRadius: 2, boxShadow: 1, overflowX: "auto" }}
            component={Paper}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: "#E3F2FD",
                    borderBottom: "1px solid #E0E0E0",
                  }}
                >
                  {["Category", "Count", "Amount", "Percentage"].map((head) => (
                    <TableCell
                      key={head}
                      sx={{
                        fontWeight: "bold",
                        textAlign: "center",
                        color: "#333",
                        fontSize: "14px",
                        padding: "8px",
                      }}
                    >
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableLoading && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ padding: 0 }}>
                      <LinearProgress sx={{ width: "100%", height: "1px" }} />
                    </TableCell>
                  </TableRow>
                )}
                {!tableLoading && shipmentData.length > 0 ? (
                  shipmentData.map((row, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        backgroundColor:
                          index % 2 === 0 ? "#FFFFFF" : "#F9F9F9",
                        "&:hover": {
                          backgroundColor: "#F1F3F5",
                          transition: "0.3s",
                        },
                      }}
                    >
                      <TableCell sx={{ padding: "8px" }}>
                        {row.category}
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "8px" }}>
                        {row.count}
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "8px" }}>
                        ₹{row.amount?.toFixed?.(2) ?? row.amount}
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "8px" }}>
                        {row.percentage}%
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  !tableLoading && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ padding: "8px" }}>
                        No data available
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}


      {/* Sales Done Order IDs Popup Dialog */}
      <Dialog
        open={orderIdsPopupOpen}
        onClose={() => setOrderIdsPopupOpen(false)}
      >
        <DialogTitle>Sales Done Order IDs</DialogTitle>
        <DialogContent>
          <Typography>{orderIds || "No order IDs available"}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderIdsPopupOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


export default ManagerSalesDashboard;

