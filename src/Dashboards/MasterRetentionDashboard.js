import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  CircularProgress,
  LinearProgress,
  TextField,
  MenuItem,
  Select,
  Button,
  Grid,
} from "@mui/material";
import axios from "axios";
import { Link as RouterLink } from 'react-router-dom';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  AccountCircle,
  ShoppingCart,
  CurrencyRupee,
  PersonOff,
  EventBusy,
  EventAvailable,
  Event,
  Update,
  HighlightOff,
} from "@mui/icons-material";
import TotalSalesDrilldown from "../pages/filtered/TotalSalesDrilldown";

// ---------------------------------------------
// 1) Time-range options for both Dashboard & Shipment
// ---------------------------------------------
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

// ---------------------------------------------
// 2) Helper: convert Date => YYYY-MM-DD
// ---------------------------------------------
const toISODate = (d) => d.toISOString().split("T")[0];

// ---------------------------------------------
// 3) Helper: compute start/end date from a range
// ---------------------------------------------
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

// ---------------------------------------------
// ManagerRetentionDashboard Component
// ---------------------------------------------
const ManagerRetentionDashboard = () => {
  // (A) Dashboard Range
  const [dashboardRange, setDashboardRange] = useState("Today");
  const [customDashboardStart, setCustomDashboardStart] = useState("");
  const [customDashboardEnd, setCustomDashboardEnd] = useState("");

  // (B) Shipment Range
  const [shipmentRange, setShipmentRange] = useState("Today");
  const [customShipmentStart, setCustomShipmentStart] = useState("");
  const [customShipmentEnd, setCustomShipmentEnd] = useState("");

  // Which summary is selected
  const [selectedSummary, setSelectedSummary] = useState("Agent's Summary");

  const [reachoutAgents, setReachoutAgents] = useState([]);
  const [reachoutLogsData, setReachoutLogsData] = useState({});


  // Data for Agent's Summary
  const [todaySummary, setTodaySummary] = useState({
    totalActiveCustomers: 0,
    totalSalesDoneToday: 0,
    totalSalesAmount: 0,
    avgOrderValue: 0,
  });
  const [agentMetrics, setAgentMetrics] = useState([]);

  // Data for Shipment Summary
  const [shipmentSummary, setShipmentSummary] = useState([]);
  const [retentionAgents, setRetentionAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [agentShipmentSummary, setAgentShipmentSummary] = useState([]);
  const [showTotalSalesDialog, setShowTotalSalesDialog] = useState(false);

  const [codSummary, setCodSummary] = useState([]);

  const [loading, setLoading] = useState(true);
  const [followupSummary, setFollowupSummary] = useState({
    totalNoFollowupSet: 0,
    totalFollowupMissed: 0,
    totalFollowupToday: 0,
    totalFollowupTomorrow: 0,
    totalFollowupLater: 0,
    totalLostCustomers: 0,
  });


  const [followupMetrics, setFollowupMetrics] = useState([]);

  // ---------------------------------------------
  // 4) Fetch active customer counts (unchanged)
  // ---------------------------------------------
  const fetchActiveCustomerCounts = async () => {
    try {
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retention/active-counts"
      );
      return res.data;
    } catch (err) {
      console.error("Error fetching active-customer counts:", err);
      return [];
    }
  };

  // ---------------------------------------------
  // 5) Fetch aggregated sales data per agent from new endpoint
  // ---------------------------------------------
  const fetchAggregatedSalesData = async (startDate, endDate) => {
    try {
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/aggregated",
        { params: { startDate, endDate } }
      );
      return res.data;
    } catch (err) {
      console.error("Error fetching aggregated sales data:", err);
      return [];
    }
  };

  // ---------------------------------------------
  // 6) Fetch dashboard data for Agent's Summary
  // ---------------------------------------------
  const fetchDashboardDataRange = async (startDate, endDate) => {
    setLoading(true);
    try {
      // (A) Get all active retention agents
      const agentsResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
        { params: { role: "Retention Agent" } }
      );
      const activeAgents = agentsResponse.data.filter(
        (agent) => agent.status === "active"
      );

      // (B) Get active customer counts
      const activeCountsArr = await fetchActiveCustomerCounts();

      // (C) Get aggregated sales data from new endpoint
      const aggregatedSales = await fetchAggregatedSalesData(startDate, endDate);

      // (D) Combine data for each agent
      let totalActiveCustomers = 0;
      let totalSalesDoneInRange = 0;
      let totalSalesAmountInRange = 0;

      const agentData = activeAgents.map((agent) => {
        const activeCountMatch = activeCountsArr.find(
          (item) => item._id === agent.fullName
        );
        const activeCustomers = activeCountMatch ? activeCountMatch.activeCount : 0;

        const salesData = aggregatedSales.find(
          (item) => item.agentName === agent.fullName
        );
        const salesDone = salesData ? salesData.salesDone : 0;
        const totalSales = salesData ? salesData.totalSales : 0;
        const avgOrderValue = salesData ? salesData.avgOrderValue : 0;

        totalActiveCustomers += activeCustomers;
        totalSalesDoneInRange += salesDone;
        totalSalesAmountInRange += totalSales;

        return {
          agentName: agent.fullName,
          activeCustomers,
          salesDone,
          totalSales,
          avgOrderValue,
        };
      });

      const overallAvgOrderValue =
        totalSalesDoneInRange > 0
          ? totalSalesAmountInRange / totalSalesDoneInRange
          : 0;

      setTodaySummary({
        totalActiveCustomers,
        totalSalesDoneToday: totalSalesDoneInRange,
        totalSalesAmount: totalSalesAmountInRange,
        avgOrderValue: overallAvgOrderValue,
      });
      setAgentMetrics(agentData);
    } catch (err) {
      console.error("Error fetching dashboard data by range:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowupSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/aggregated-followup"
      );
      const summary = res.data.summary || [];
      setFollowupMetrics(summary);

      // Calculate totals across all agents
      const totals = summary.reduce(
        (acc, agent) => {
          acc.totalNoFollowupSet += agent.noFollowupSet || 0;
          acc.totalFollowupMissed += agent.followupMissed || 0;
          acc.totalFollowupToday += agent.followupToday || 0;
          acc.totalFollowupTomorrow += agent.followupTomorrow || 0;
          acc.totalFollowupLater += agent.followupLater || 0;
          acc.totalLostCustomers += agent.lostCustomers || 0;
          return acc;
        },
        {
          totalNoFollowupSet: 0,
          totalFollowupMissed: 0,
          totalFollowupToday: 0,
          totalFollowupTomorrow: 0,
          totalFollowupLater: 0,
          totalLostCustomers: 0,
        }
      );
      setFollowupSummary(totals);
    } catch (err) {
      console.error("Error fetching agent followup summary:", err);
      setAgentMetrics([]);
      setFollowupSummary({
        totalNoFollowupSet: 0,
        totalFollowupMissed: 0,
        totalFollowupToday: 0,
        totalFollowupTomorrow: 0,
        totalFollowupLater: 0,
        totalLostCustomers: 0,
      });
    }
    setLoading(false);
  };


  const fetchActiveRetentionAgents = async () => {
    try {
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
        { params: { role: "Retention Agent" } }
      );
      return res.data.filter((agent) => agent.status === "active");
    } catch (err) {
      console.error("Error fetching retention agents:", err);
      return [];
    }
  };

  // ---------------------------------------------
  // Fetch Reachout Logs count per agent for given date range
  // ---------------------------------------------
  const fetchReachoutLogsCounts = async (startDate, endDate) => {
    setLoading(true);
    try {
      // First get active agents
      const activeAgents = await fetchActiveRetentionAgents();
      setReachoutAgents(activeAgents);

      // For each agent fetch reachout logs count aggregated by method 
      const logsData = {};

      // Use Promise.all to parallel fetch for all agents
      await Promise.all(
        activeAgents.map(async (agent) => {
          const res = await axios.get(
            "https://muditamleads-14f32a10d7f7.herokuapp.com/api/reachout-logs/count",
            {
              params: {
                startDate,
                endDate,
                healthExpertAssigned: agent.fullName,
              },
            }
          );
          logsData[agent.fullName] = res.data;
        })
      );

      setReachoutLogsData(logsData);
    } catch (err) {
      console.error("Error fetching reachout logs count:", err);
      setReachoutAgents([]);
      setReachoutLogsData({});
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------
  // 7) Fetch overall shipment summary from new endpoint
  // ---------------------------------------------
  const fetchShipmentData = async (startDate, endDate) => {
    setLoading(true);
    try {
      const shipmentRes = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/shipment-summary",
        { params: { startDate, endDate } }
      );
      setShipmentSummary(shipmentRes.data);

      const agentsRes = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
        { params: { role: "Retention Agent" } }
      );
      const activeAgents = agentsRes.data.filter((emp) => emp.status === "active");
      setRetentionAgents(activeAgents);
    } catch (err) {
      console.error("Error fetching shipment data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------
  // 8) Fetch agent-wise shipment summary from new endpoint
  // ---------------------------------------------
  const fetchAgentShipmentSummary = async (agentName, startDate, endDate) => {
    if (!agentName) {
      setAgentShipmentSummary([]);
      return;
    }
    try {
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/shipment-summary/agent",
        { params: { agentName, startDate, endDate } }
      );
      setAgentShipmentSummary(res.data);
    } catch (err) {
      console.error("Error fetching agent shipment summary:", err);
      setAgentShipmentSummary([]);
    }
  };

  // ---------------------------------------------
  // Fetch COD vs Prepaid Summary
  // ---------------------------------------------
  const fetchCodPrepaidSummary = async (startDate, endDate) => {
    setLoading(true);
    try {
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/cod-prepaid-summary",
        { params: { startDate, endDate } }
      );
      setCodSummary(res.data);
    } catch (err) {
      console.error("Error fetching COD vs Prepaid Summary:", err);
      setCodSummary([]);
    } finally {
      setLoading(false);
    }
  };


  // ---------------------------------------------
  // 9) Handlers for Range Changes
  // ---------------------------------------------
  const handleDashboardRangeChange = async (e) => {
    const newRange = e.target.value;
    setDashboardRange(newRange);
    if (newRange !== "Custom range") {
      const { startDate, endDate } = getDateRange(newRange);

      if (selectedSummary === "Agent's Summary") {
        await fetchDashboardDataRange(startDate, endDate);
      } else if (selectedSummary === "Reached Out Log Summary") {
        await fetchReachoutLogsCounts(startDate, endDate);
      } else if (selectedSummary === "COD vs Prepaid Summary") {
        await fetchCodPrepaidSummary(startDate, endDate);
      }

      setCustomDashboardStart("");
      setCustomDashboardEnd("");
    }
  };

  const applyCustomDashboardRange = async () => {
    if (!customDashboardStart || !customDashboardEnd) return;

    if (selectedSummary === "Agent's Summary") {
      await fetchDashboardDataRange(customDashboardStart, customDashboardEnd);
    } else if (selectedSummary === "Reached Out Log Summary") {
      await fetchReachoutLogsCounts(customDashboardStart, customDashboardEnd);
    } else if (selectedSummary === "COD vs Prepaid Summary") {
      await fetchCodPrepaidSummary(customDashboardStart, customDashboardEnd);
    }
  };

  const handleShipmentRangeChange = async (e) => {
    const newRange = e.target.value;
    setShipmentRange(newRange);
    if (newRange !== "Custom range") {
      const { startDate, endDate } = getDateRange(newRange);
      await fetchShipmentData(startDate, endDate);
      setCustomShipmentStart("");
      setCustomShipmentEnd("");
    }
  };

  const applyCustomShipmentRange = async () => {
    if (!customShipmentStart || !customShipmentEnd) return;
    await fetchShipmentData(customShipmentStart, customShipmentEnd);
  };

  const shipmentDates =
    shipmentRange !== "Custom range"
      ? getDateRange(shipmentRange)
      : { startDate: customShipmentStart, endDate: customShipmentEnd };


  useEffect(() => {
    // On summary change, reload data for selected date range
    const loadData = async () => {
      if (selectedSummary === "Agent's Summary") {
        const { startDate, endDate } =
          dashboardRange !== "Custom range"
            ? getDateRange(dashboardRange)
            : { startDate: customDashboardStart, endDate: customDashboardEnd };
        await fetchDashboardDataRange(startDate, endDate);
      } else if (selectedSummary === "Shipment Summary") {
        const { startDate, endDate } =
          shipmentRange !== "Custom range"
            ? getDateRange(shipmentRange)
            : { startDate: customShipmentStart, endDate: customShipmentEnd };
        await fetchShipmentData(startDate, endDate);
      } else if (selectedSummary === "Reached Out Log Summary") {
        const { startDate, endDate } =
          dashboardRange !== "Custom range"
            ? getDateRange(dashboardRange)
            : { startDate: customDashboardStart, endDate: customDashboardEnd };
        await fetchReachoutLogsCounts(startDate, endDate);
      } else if (selectedSummary === "Followup Summary") {
        await fetchFollowupSummary();
      } else if (selectedSummary === "COD vs Prepaid Summary") {
        const { startDate, endDate } =
          dashboardRange !== "Custom range"
            ? getDateRange(dashboardRange)
            : { startDate: customDashboardStart, endDate: customDashboardEnd };

        await fetchCodPrepaidSummary(startDate, endDate);
      }

    };


    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSummary]);

  // ---------------------------------------------
  // 10) Update agent-wise shipment summary when agent changes
  // ---------------------------------------------
  useEffect(() => {
    const { startDate, endDate } =
      shipmentRange !== "Custom range"
        ? getDateRange(shipmentRange)
        : { startDate: customShipmentStart, endDate: customShipmentEnd };
    if (selectedAgent && startDate && endDate) {
      fetchAgentShipmentSummary(selectedAgent, startDate, endDate);
    }
  }, [selectedAgent, shipmentRange, customShipmentStart, customShipmentEnd]);

  // ---------------------------------------------
  // 11) On mount, fetch "Today" data for both sections
  // ---------------------------------------------
  useEffect(() => {
    const { startDate, endDate } = getDateRange("Today");
    fetchDashboardDataRange(startDate, endDate);
    fetchShipmentData(startDate, endDate);
    // eslint-disable-next-line
  }, []);

  // ---------------------------------------------
  // Render
  // ---------------------------------------------
  return (
    <Box sx={{ padding: 3 }}>
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
        Manager Retention Dashboard
      </Typography>

      {/* Combined Summary Dropdown & Range Selection */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 3,
          width: "90%",
          alignItems: "center",
          mb: 3,
          mt: 2,
          ml: 2,
        }}
      >
        <FormControl fullWidth variant="outlined" sx={{ width: 300 }}>
          <Select
            value={selectedSummary}
            onChange={(e) => setSelectedSummary(e.target.value)}
            displayEmpty
            IconComponent={ExpandMoreIcon}
            renderValue={(selected) =>
              selected ? `Summary: ${selected}` : "Summary:"
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
            <MenuItem value="Agent's Summary">
              <Typography variant="body2">Agent's Summary</Typography>
            </MenuItem>
            <MenuItem value="Followup Summary">
              <Typography variant="body2">Followup Summary</Typography>
            </MenuItem>
            <MenuItem value="Shipment Summary">
              <Typography variant="body2">Shipment Summary</Typography>
            </MenuItem>
            <MenuItem value="Reached Out Log Summary">
              <Typography variant="body2">Reached Out Log Summary</Typography>
            </MenuItem>
            <MenuItem value="COD vs Prepaid Summary">
              <Typography variant="body2">COD vs Prepaid Summary</Typography>
            </MenuItem>
          </Select>
        </FormControl>

        {(selectedSummary === "Agent's Summary" ||
          selectedSummary === "Reached Out Log Summary" ||
          selectedSummary === "COD vs Prepaid Summary") && (
            <>
              <TextField
                select
                label="Select Range"
                value={dashboardRange}
                onChange={handleDashboardRangeChange}
                sx={{
                  width: 250,
                  backgroundColor: "#F9FAFB",
                  borderRadius: 2,
                  "& fieldset": { border: "none" },
                  boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)",
                }}
              >
                {timeRangeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>

              {dashboardRange === "Custom range" && (
                <>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={customDashboardStart}
                    onChange={(e) => setCustomDashboardStart(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      width: 180,
                      backgroundColor: "#F9FAFB",
                      borderRadius: 2,
                      "& fieldset": { border: "none" },
                      boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)",
                    }}
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={customDashboardEnd}
                    onChange={(e) => setCustomDashboardEnd(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      width: 180,
                      backgroundColor: "#F9FAFB",
                      borderRadius: 2,
                      "& fieldset": { border: "none" },
                      boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)",
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={applyCustomDashboardRange}
                    sx={{
                      backgroundColor: "#1976D2",
                      color: "#fff",
                      borderRadius: 2,
                      boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)",
                      "&:hover": { backgroundColor: "#1565C0" },
                    }}
                  >
                    Apply
                  </Button>
                </>
              )}
            </>
          )}

        {selectedSummary === "Shipment Summary" && (
          <>
            <TextField
              select
              label="Select Range"
              value={shipmentRange}
              onChange={handleShipmentRangeChange}
              sx={{
                width: 250,
                backgroundColor: "#F9FAFB",
                borderRadius: 2,
                "& fieldset": { border: "none" },
                boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)",
              }}
            >
              {timeRangeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            {shipmentRange === "Custom range" && (
              <>
                <TextField
                  label="Start Date"
                  type="date"
                  value={customShipmentStart}
                  onChange={(e) => setCustomShipmentStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    width: 170,
                    backgroundColor: "#F9FAFB",
                    borderRadius: 2,
                    "& fieldset": { border: "none" },
                    boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)",
                  }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={customShipmentEnd}
                  onChange={(e) => setCustomShipmentEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    width: 170,
                    backgroundColor: "#F9FAFB",
                    borderRadius: 2,
                    "& fieldset": { border: "none" },
                    boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)",
                  }}
                />
                <Button
                  variant="contained"
                  onClick={applyCustomShipmentRange}
                  sx={{
                    backgroundColor: "#1976D2",
                    color: "#fff",
                    boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)",
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

      {/* -------------------- AGENT'S SUMMARY SECTION -------------------- */}
      {selectedSummary === "Agent's Summary" && (
        <>
          {/* Agent's Summary Cards */}
          <Box
            sx={{
              padding: 2,
              marginTop: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "1000px",
              margin: "0 auto",
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ textAlign: "center", color: "#000", marginBottom: 2 }}
            >
              Agent's Summary
            </Typography>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                overflowX: "auto",
                whiteSpace: "nowrap",
                paddingBottom: 1,
                paddingX: 2,
              }}
            >
              {[
                {
                  key: "active",
                  label: "Active Customers",
                  value: todaySummary.totalActiveCustomers,
                  icon: <AccountCircle sx={{ fontSize: 20, color: "#fff" }} />,
                  gradient: "linear-gradient(135deg, #64B5F6 30%, #42A5F5 100%)",
                  onClick: null,
                },
                {
                  key: "salesDone",
                  label: "Sales Done",
                  value: todaySummary.totalSalesDoneToday,
                  icon: <ShoppingCart sx={{ fontSize: 20, color: "#fff" }} />,
                  gradient: "linear-gradient(135deg, #FFCC80 30%, #FFA726 100%)",
                  onClick: null,
                },
                {
                  key: "totalSales",
                  label: "Total Sales",
                  value:
                    todaySummary.totalSalesAmount !== undefined
                      ? `₹${todaySummary.totalSalesAmount.toLocaleString("en-IN")}`
                      : undefined,
                  icon: <CurrencyRupee sx={{ fontSize: 20, color: "#fff" }} />,
                  gradient: "linear-gradient(135deg, #EF9A9A 30%, #E57373 100%)",
                  onClick: () => setShowTotalSalesDialog(true), // <-- OPEN HERE
                },
                {
                  key: "aov",
                  label: "Average Order Value",
                  value:
                    todaySummary.avgOrderValue !== undefined
                      ? `₹${todaySummary.avgOrderValue.toLocaleString("en-IN")}`
                      : undefined,
                  icon: <CurrencyRupee sx={{ fontSize: 20, color: "#fff" }} />,
                  gradient: "linear-gradient(135deg, #CE93D8 30%, #BA68C8 100%)",
                  onClick: null,
                },
              ].map(({ label, value, icon, gradient, onClick, key }) => (
                <Box
                  key={key}
                  onClick={onClick || undefined}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: gradient,
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    textAlign: "center",
                    transition: "all 0.3s ease",
                    minWidth: 200,
                    height: 120,
                    cursor: onClick ? "pointer" : "default",
                    "&:hover": onClick ? { transform: "translateY(2px)" } : undefined,
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 1,
                    }}
                  >
                    {icon}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                    {label}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ color: "#fff" }}>
                    {loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <TotalSalesDrilldown
            open={showTotalSalesDialog}
            onClose={() => setShowTotalSalesDialog(false)}
            initialDates={
              (dashboardRange !== "Custom range")
                ? getDateRange(dashboardRange)
                : { startDate: customDashboardStart, endDate: customDashboardEnd }
            }
          />

          {/* Agent Metrics Table */}
          <Box
            sx={{
              padding: 2,
              marginTop: 3,
              backgroundColor: "#FFFFFF",
              borderRadius: 2,
              boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
              maxWidth: "1000px",
              margin: "0 auto",
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ textAlign: "center", color: "#000", marginBottom: 2 }}
            >
              Agent Metrics
            </Typography>
            <TableContainer
              sx={{ borderRadius: 2, boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)", overflowX: "auto" }}
              component={Paper}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ background: "linear-gradient(135deg, #64B5F6 30%, #42A5F5 100%)" }}>
                    {[
                      "Agent Name",
                      "Active Customers",
                      "Sales Done",
                      "Total Sales",
                      "Average Order Value",
                    ].map((header) => (
                      <TableCell
                        key={header}
                        sx={{
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "#fff",
                          fontSize: "14px",
                          padding: "10px",
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                {loading && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ padding: 0 }}>
                        <LinearProgress variant="indeterminate" sx={{ width: "100%", height: "3px" }} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
                <TableBody>
                  {!loading && agentMetrics.length > 0 ? (
                    agentMetrics.map((agent, index) => (
                      <TableRow
                        key={agent.agentName}
                        sx={{
                          backgroundColor: index % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
                          "&:hover": { backgroundColor: "#E3F2FD", transition: "0.3s" },
                        }}
                      >
                        <TableCell sx={{ padding: "12px", textAlign: "center", fontWeight: 500 }}>
                          {agent.agentName}
                        </TableCell>
                        <TableCell sx={{ padding: "12px", textAlign: "center" }}>
                          {agent.activeCustomers}
                        </TableCell>
                        <TableCell sx={{ padding: "12px", textAlign: "center" }}>
                          {agent.salesDone}
                        </TableCell>
                        <TableCell sx={{ padding: "12px", textAlign: "center" }}>
                          ₹{agent.totalSales.toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ padding: "12px", textAlign: "center" }}>
                          ₹{agent.avgOrderValue.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    !loading && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          align="center"
                          sx={{ padding: "12px", color: "#888", fontStyle: "italic" }}
                        >
                          No data found.
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}

      {selectedSummary === "Followup Summary" && (
        <>
          {/* Agent's Summary Cards */}
          <Box
            sx={{
              padding: 2,
              marginTop: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "100%",
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ textAlign: "center", color: "#000", marginBottom: 2 }}
            >
              Followup Summary
            </Typography>

            <Grid container spacing={2} width="50%">
              {[
                {
                  label: "No Followup Set",
                  icon: <PersonOff sx={{ fontSize: 28, color: "#880e4f" }} />,
                  background: "#fff0f5 ",
                  value: followupSummary.totalNoFollowupSet,
                },
                {
                  label: "Followup Missed",
                  background: "#fff8e1",
                  value: followupSummary.totalFollowupMissed,
                  icon: <EventBusy sx={{ fontSize: 28, color: "#e65100" }} />,
                },
                {
                  label: "Followup Today",
                  background: "#ffebee",
                  value: followupSummary.totalFollowupToday,
                  icon: <EventAvailable sx={{ fontSize: 28, color: "#b71c1c" }} />,
                },
                {
                  label: "Followup Tomorrow",
                  background: "#f3e5f5",
                  value: followupSummary.totalFollowupTomorrow,
                  icon: <Event sx={{ fontSize: 28, color: "#6a1b9a" }} />,
                },
                {
                  label: "Followup Later",
                  background: "#e3f2fd",
                  value: followupSummary.totalFollowupLater,
                  icon: <Update sx={{ fontSize: 28, color: "#1a237e" }} />,
                },
                {
                  label: "Lost Customers",
                  background: "#e8f5e9",
                  value: followupSummary.totalLostCustomers,
                  icon: <HighlightOff sx={{ fontSize: 28, color: "#1b5e20" }} />,
                },
              ].map(({ label, value, icon, background }) => (
                <Grid item xs={12} sm={6} md={4} key={label}>
                  <Box
                    key={label}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: background,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      textAlign: "center",
                      transition: "all 0.3s ease",
                      minWidth: 80,
                      height: 130,
                      "&:hover": { transform: "translateY(2px)" },
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor: "rgba(255,255,255,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 1,
                      }}
                    >
                      {icon}
                    </Box>


                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, mb: 1, mt: 1 }}
                    >
                      {label}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="600">
                      {loading ? (
                        <CircularProgress size={16} sx={{ color: "#fff" }} />
                      ) : (
                        value
                      )}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>


          {/* Agent Metrics Table */}
          <Box
            sx={{
              padding: 2,
              marginTop: 3,
              backgroundColor: "#FFFFFF",
              borderRadius: 2,
              boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
              maxWidth: "1000px",
              margin: "0 auto",
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ textAlign: "center", color: "#000", marginBottom: 2 }}
            >
              Agent Followup Metrics
            </Typography>
            <TableContainer
              sx={{
                borderRadius: 2,
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
                overflowX: "auto",
              }}
              component={Paper}
            >
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      background:
                        "linear-gradient(135deg, #64B5F6 30%, #42A5F5 100%)",
                    }}
                  >
                    {[
                      "Agent Name",
                      "No Followup Set",
                      "Followup Missed",
                      "Followup Today",
                      "Followup Tomorrow",
                      "Followup Later",
                      "Lost Customers",
                    ].map((header) => (
                      <TableCell
                        key={header}
                        sx={{
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "#fff",
                          fontSize: "14px",
                          padding: "10px",
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                {loading && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ padding: 0 }}>
                        <LinearProgress
                          variant="indeterminate"
                          sx={{ width: "100%", height: "3px" }}
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
                <TableBody>
                  {!loading && followupMetrics.length > 0 ? (
                    followupMetrics.map((agent, index) => (
                      <TableRow
                        key={agent.agentName}
                        sx={{
                          backgroundColor:
                            index % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
                          "&:hover": {
                            backgroundColor: "#E3F2FD",
                            transition: "0.3s",
                          },
                        }}
                      >
                        <TableCell
                          sx={{
                            padding: "12px",
                            textAlign: "center",
                            fontWeight: 500,
                          }}
                        >
                          {agent.agentName} {/* ✅ FIXED */}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {agent.noFollowupSet}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {agent.followupMissed}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {agent.followupToday}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {agent.followupTomorrow}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {agent.followupLater}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {agent.lostCustomers}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6} // ✅ change to 6 columns
                        align="center"
                        sx={{
                          padding: "12px",
                          color: "#888",
                          fontStyle: "italic",
                        }}
                      >
                        No data found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}

      {/* -------------------- SHIPMENT SUMMARY SECTION -------------------- */}
      {selectedSummary === "Shipment Summary" && (
        <>
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              textAlign: "center",
              letterSpacing: "0.5px",
              mt: 5,
              mb: 3,
              fontFamily: "'Poppins', sans-serif",
              color: "#000",
            }}
          >
            Shipment Status Summary
          </Typography>

          {/* Overall Shipment Summary Table */}
          <Box
            sx={{
              padding: 2,
              marginTop: 3,
              backgroundColor: "#FFFFFF",
              borderRadius: 2,
              boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
              maxWidth: "1000px",
              margin: "0 auto",
            }}
          >
            <TableContainer
              sx={{ borderRadius: 2, boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)", overflowX: "auto" }}
              component={Paper}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ background: "linear-gradient(135deg, #64B5F6 30%, #42A5F5 100%)" }}>
                    {["Category", "Count", "Amount", "Percentage"].map((header) => (
                      <TableCell
                        key={header}
                        sx={{ fontWeight: "bold", textAlign: "center", color: "#fff", fontSize: "14px", padding: "10px" }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                {loading && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4} sx={{ padding: 0 }}>
                        <LinearProgress variant="indeterminate" sx={{ width: "100%", height: "3px" }} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
                <TableBody>
                  {!loading && shipmentSummary.length > 0 ? (
                    shipmentSummary.map((row, idx) => (
                      <TableRow
                        component={RouterLink}
                        to={`/shipment-details?category=${encodeURIComponent(row.category)}&startDate=${shipmentDates.startDate}&endDate=${shipmentDates.endDate}${selectedAgent ? `&agent=${encodeURIComponent(selectedAgent)}` : ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          backgroundColor: idx % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
                          "&:hover": { backgroundColor: "#E3F2FD", transition: "0.3s" },
                        }}
                      >
                        <TableCell sx={{ textAlign: "center", fontWeight: 500 }}>
                          {row.category}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>{row.count}</TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          ₹{parseFloat(row.totalAmount).toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {row.percentage}%
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    !loading && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ color: "#888" }}>
                          No shipment data found.
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              textAlign: "center",
              letterSpacing: "0.5px",
              mt: 5,
              mb: 3,
              fontFamily: "'Poppins', sans-serif",
              color: "#000",
            }}
          >
            Agent Wise Shipment Status
          </Typography>

          {/* Agent Filter for Shipment */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              mb: 2,
              flexWrap: "wrap",
              justifyContent: "flex-start",
              ml: 20,
            }}
          >
            <TextField
              select
              label="Select Agent"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              sx={{
                width: 250,
                backgroundColor: "#F9FAFB",
                borderRadius: 2,
                "& fieldset": { border: "none" },
                boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)",
              }}
            >
              <MenuItem value="">-- Select an Agent --</MenuItem>
              {retentionAgents.map((agent) => (
                <MenuItem key={agent._id} value={agent.fullName}>
                  {agent.fullName}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Agent Shipment Summary Table */}
          <Box
            sx={{
              padding: 2,
              marginTop: 3,
              backgroundColor: "#FFFFFF",
              borderRadius: 2,
              boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
              maxWidth: "1000px",
              margin: "0 auto",
            }}
          >
            <TableContainer
              sx={{ borderRadius: 2, boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)", overflowX: "auto" }}
              component={Paper}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ background: "linear-gradient(135deg, #64B5F6 30%, #42A5F5 100%)" }}>
                    {["Category", "Count", "Amount", "Percentage"].map((header) => (
                      <TableCell
                        key={header}
                        sx={{ fontWeight: "bold", textAlign: "center", color: "#fff", fontSize: "14px", padding: "10px" }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                {loading && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4} sx={{ padding: 0 }}>
                        <LinearProgress variant="indeterminate" sx={{ width: "100%", height: "3px" }} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
                <TableBody>
                  {!loading && agentShipmentSummary.length > 0 ? (
                    agentShipmentSummary.map((row, idx) => (
                      <TableRow
                        key={idx}
                        component={RouterLink}
                        to={`/shipment-details?agent=${encodeURIComponent(
                          selectedAgent
                        )}&category=${encodeURIComponent(
                          row.category
                        )}&startDate=${shipmentDates.startDate}&endDate=${shipmentDates.endDate}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          backgroundColor: idx % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
                          "&:hover": { backgroundColor: "#E3F2FD", transition: "0.3s", cursor: "pointer" },
                        }}
                      >
                        <TableCell sx={{ padding: "12px", textAlign: "center", fontWeight: 500 }}>
                          {row.category}
                        </TableCell>
                        <TableCell sx={{ padding: "12px", textAlign: "center" }}>{row.count}</TableCell>
                        <TableCell sx={{ padding: "12px", textAlign: "center" }}>
                          ₹{parseFloat(row.totalAmount).toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ padding: "12px", textAlign: "center" }}>
                          {row.percentage}%
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    !loading && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          align="center"
                          sx={{ padding: "12px", color: "#888", fontStyle: "italic" }}
                        >
                          {selectedAgent ? "No shipment data found for this agent." : "Please select an agent."}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}

      {selectedSummary === "Reached Out Log Summary" && (
        <>
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{ textAlign: "center", color: "#000", marginBottom: 2 }}
          >
            Reached Out Logs Summary
          </Typography>

          <TableContainer
            sx={{
              borderRadius: 2,
              boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
              overflowX: "auto",
              maxWidth: "1000px",
              margin: "0 auto",
            }}
            component={Paper}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    background: "linear-gradient(135deg, #64B5F6 30%, #42A5F5 100%)",
                  }}
                >
                  {[
                    "Health Expert Assigned",
                    "Total Reachouts",
                    "WhatsApp",
                    "Call",
                    "Both",
                  ].map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        fontWeight: "bold",
                        textAlign: "center",
                        color: "#fff",
                        fontSize: "14px",
                        padding: "10px",
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              {loading && (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} sx={{ padding: 0 }}>
                      <LinearProgress
                        variant="indeterminate"
                        sx={{ width: "100%", height: "3px" }}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}

              <TableBody>
                {!loading && reachoutAgents.length > 0 ? (
                  reachoutAgents.map((agent, idx) => {
                    const log = reachoutLogsData[agent.fullName] || {
                      totalCount: 0,
                      WhatsApp: 0,
                      Call: 0,
                      Both: 0,
                    };
                    return (
                      <TableRow
                        key={agent._id}
                        sx={{
                          backgroundColor: idx % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
                          "&:hover": { backgroundColor: "#E3F2FD", transition: "0.3s" },
                        }}
                      >
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center", fontWeight: 500 }}
                        >
                          {agent.fullName}
                        </TableCell>
                        <TableCell sx={{ padding: "12px", textAlign: "center" }}>
                          {log.totalCount}
                        </TableCell>
                        <TableCell sx={{ padding: "12px", textAlign: "center" }}>
                          {log.WhatsApp}
                        </TableCell>
                        <TableCell sx={{ padding: "12px", textAlign: "center" }}>
                          {log.Call}
                        </TableCell>
                        <TableCell sx={{ padding: "12px", textAlign: "center" }}>
                          {log.Both}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  !loading && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        align="center"
                        sx={{ padding: "12px", color: "#888", fontStyle: "italic" }}
                      >
                        No data found.
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {selectedSummary === "COD vs Prepaid Summary" && (
  <>
    <Typography
      variant="h6"
      fontWeight="bold"
      sx={{ textAlign: "center", color: "#000", marginBottom: 2 }}
    >
      COD vs Prepaid Summary
    </Typography>

    <TableContainer
      sx={{
        borderRadius: 2,
        boxShadow: "0px 2px 8px rgba(0,0,0,0.08)",
        overflowX: "auto",
        maxWidth: "1000px",
        margin: "0 auto",
      }}
      component={Paper}
    >
      <Table>
        <TableHead>
          <TableRow
            sx={{
              background: "linear-gradient(135deg, #64B5F6 30%, #42A5F5 100%)",
            }}
          >
            {[
              "Agent Name",
              "Total Orders",
              "COD Orders",
              "Prepaid Orders",
              "COD %",
              "Prepaid %",
            ].map((header) => (
              <TableCell
                key={header}
                sx={{
                  fontWeight: "bold",
                  textAlign: "center",
                  color: "#fff",
                  fontSize: "14px",
                  padding: "10px",
                }}
              >
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        {/* ---------- TOTAL ROW (Corrected % formula) ---------- */}

        {!loading && codSummary.length > 0 && (
          <TableBody>
            {(() => {
              const totalOrders = codSummary.reduce(
                (acc, a) => acc + (a.totalOrders || 0),
                0
              );
              const totalCOD = codSummary.reduce(
                (acc, a) => acc + (a.codOrders || 0),
                0
              );
              const totalPrepaid = codSummary.reduce(
                (acc, a) => acc + (a.prepaidOrders || 0),
                0
              );

              const totalCODPercent =
                totalOrders > 0
                  ? ((totalCOD / totalOrders) * 100).toFixed(1)
                  : "0.0";

              const totalPrepaidPercent =
                totalOrders > 0
                  ? ((totalPrepaid / totalOrders) * 100).toFixed(1)
                  : "0.0";

              return (
                <TableRow
                  sx={{
                    backgroundColor: "#E8F4FF",
                    "&:hover": { backgroundColor: "#E8F4FF" },
                  }}
                >
                  <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>
                    TOTAL
                  </TableCell>

                  <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>
                    {totalOrders}
                  </TableCell>

                  <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>
                    {totalCOD}
                  </TableCell>

                  <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>
                    {totalPrepaid}
                  </TableCell>

                  <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>
                    {totalCODPercent}%
                  </TableCell>

                  <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>
                    {totalPrepaidPercent}%
                  </TableCell>
                </TableRow>
              );
            })()}
          </TableBody>
        )}

        {/* -------------------- LOADING ROW -------------------- */}
        {loading && (
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} sx={{ padding: 0 }}>
                <LinearProgress
                  variant="indeterminate"
                  sx={{ width: "100%", height: "3px" }}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        )}

        {/* -------------------- AGENT ROWS -------------------- */}
        <TableBody>
          {!loading && codSummary.length > 0 ? (
            codSummary.map((agent, idx) => (
              <TableRow
                key={idx}
                sx={{
                  backgroundColor: idx % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
                  "&:hover": { backgroundColor: "#E3F2FD", transition: "0.3s" },
                }}
              >
                <TableCell sx={{ textAlign: "center", fontWeight: 500 }}>
                  {agent.agentName}
                </TableCell>

                <TableCell sx={{ textAlign: "center" }}>
                  {agent.totalOrders}
                </TableCell>

                <TableCell sx={{ textAlign: "center" }}>
                  {agent.codOrders}
                </TableCell>

                <TableCell sx={{ textAlign: "center" }}>
                  {agent.prepaidOrders}
                </TableCell>

                <TableCell sx={{ textAlign: "center" }}>
                  {agent.totalOrders > 0
                    ? ((agent.codOrders / agent.totalOrders) * 100).toFixed(1) +
                      "%"
                    : "0%"}
                </TableCell>

                <TableCell sx={{ textAlign: "center" }}>
                  {agent.totalOrders > 0
                    ? (
                        (agent.prepaidOrders / agent.totalOrders) *
                        100
                      ).toFixed(1) + "%"
                    : "0%"}
                </TableCell>
              </TableRow>
            ))
          ) : (
            !loading && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="center"
                  sx={{ padding: "12px", color: "#888", fontStyle: "italic" }}
                >
                  No data found.
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </>
)}
    </Box>
  );
};

export default ManagerRetentionDashboard;

