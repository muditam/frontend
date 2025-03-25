import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
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
} from "@mui/material";
import axios from "axios";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"; // Down arrow icon


import {
  AccountCircle,
  GroupAdd,
  ShoppingCart,
  CurrencyRupee,
  MonetizationOn,
} from "@mui/icons-material";


// Time-range options for both Dashboard and Shipment sections
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


// Helper to convert a JS Date to YYYY-MM-DD
const toISODate = (d) => d.toISOString().split("T")[0];


// Helper to compute a start/end date from a preset range
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
      const day = now.getDay(); // 0 (Sun) -> 6 (Sat)
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
    case "Last 12 months": {
      start.setFullYear(now.getFullYear() - 1);
      break;
    }
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


// Summarize sales by shipway_status => { category, count, amount, percentage }
const computeShipmentSummary = (salesData) => {
  if (!salesData || salesData.length === 0) return [];


  const totalCount = salesData.length;
  let totalAmount = 0;
  const grouped = {};


  for (const sale of salesData) {
    const category = sale.shipway_status || "Not available";
    if (!grouped[category]) {
      grouped[category] = { count: 0, amount: 0 };
    }
    grouped[category].count += 1;
    grouped[category].amount += sale.amountPaid || 0;
    totalAmount += sale.amountPaid || 0;
  }


  const summaryArr = Object.entries(grouped).map(([category, val]) => {
    const percentage = ((val.count / totalCount) * 100).toFixed(2);
    return {
      category,
      count: val.count,
      amount: val.amount,
      percentage,
    };
  });


  summaryArr.unshift({
    category: "Total Orders",
    count: totalCount,
    amount: totalAmount,
    percentage: "100",
  });


  return summaryArr;
};


const ManagerRetentionDashboard = () => {
  // ---------------------------
  // Dashboard Range (Top Sections)
  // ---------------------------
  const [dashboardRange, setDashboardRange] = useState("Today");
  const [customDashboardStart, setCustomDashboardStart] = useState("");
  const [customDashboardEnd, setCustomDashboardEnd] = useState("");
  const [selectedSummary, setSelectedSummary] = useState("Agent's Summary");


  // Data for top sections
  const [todaySummary, setTodaySummary] = useState({});
  const [followupSummary, setFollowupSummary] = useState({});
  const [allTimeSummary, setAllTimeSummary] = useState({});
  const [agentMetrics, setAgentMetrics] = useState([]);
  const [followupMetrics, setFollowupMetrics] = useState([]);
  const [allTimeMetrics, setAllTimeMetrics] = useState([]);


  const [loading, setLoading] = useState(true);
  // New state for "Customer Acquired"
  const [customerAcquired, setCustomerAcquired] = useState(0);


  // ---------------------------
  // Shipment Range (Bottom Sections)
  // ---------------------------
  const [shipmentRange, setShipmentRange] = useState("Today");
  const [customShipmentStart, setCustomShipmentStart] = useState("");
  const [customShipmentEnd, setCustomShipmentEnd] = useState("");


  // Data for shipment sections
  const [retentionSales, setRetentionSales] = useState([]);
  const [shipmentSummary, setShipmentSummary] = useState([]);
  const [retentionAgents, setRetentionAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [agentShipmentSummary, setAgentShipmentSummary] = useState([]);


  const fetchDashboardDataRange = async (startDate, endDate) => {
    try {
      setLoading(true);


      const agentsResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
        {
          params: { role: "Retention Agent" },
        }
      );
      const activeAgents = agentsResponse.data.filter(
        (agent) => agent.status === "active"
      );


      if (activeAgents.length === 0) {
        setTodaySummary({
          totalActiveCustomers: 0,
          customerAcquired: 0,
          totalSalesDoneToday: 0,
          totalSalesAmount: 0,
          avgOrderValue: 0,
        });
        setFollowupSummary({
          totalNoFollowupSet: 0,
          totalFollowupToday: 0,
          totalFollowupMissed: 0,
          totalFollowupTomorrow: 0,
          totalFollowupLater: 0,
        });
        setAllTimeSummary({
          totalCustomersAllTime: 0,
          totalCustomersRetainedThisMonth: 0,
          totalActiveCustomersAllTime: 0,
          totalLostCustomers: 0,
          totalSales: 0,
          totalSalesDone: 0,
          totalRetentionRate: 0,
        });
        setAllTimeMetrics([]);
        setAgentMetrics([]);
        setFollowupMetrics([]);
        setLoading(false);
        return;
      }


      // 2) Fetch Customer Acquired count from /api/leads/new-orders
      // If the range is a single day, use orderDate for filtering.
      const acquiredParams = { limit: 0, page: 1, startDate, endDate };
      const acquiredRes = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/new-orders",
        {
          params: acquiredParams,
        }
      );
      const customerAcquiredCount =
        acquiredRes.data.total ||
        (acquiredRes.data.leads && acquiredRes.data.leads.length) ||
        0;


      // 3) For each agent, fetch leads & sales for the given date range
      let totalActiveCustomers = 0;
      let totalSalesDoneInRange = 0;
      let totalSalesAmountInRange = 0;


      const agentData = await Promise.all(
        activeAgents.map(async (agent) => {
          // Fetch all retention leads
          const leadsRes = await axios.get(
            "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retention"
          );
          const leadsData = Array.isArray(leadsRes.data)
            ? leadsRes.data
            : leadsRes.data.leads || [];


          // Filter leads for this agent in the date range
          const filteredLeads = leadsData.filter(
            (lead) =>
              lead.healthExpertAssigned === agent.fullName &&
              lead.date >= startDate &&
              lead.date <= endDate
          );


          // Active customers: count all leads for this agent where retentionStatus is undefined or "Active"
          const allAgentLeads = leadsData.filter(
            (lead) => lead.healthExpertAssigned === agent.fullName
          );
          const activeCustomers = allAgentLeads.filter(
            (lead) =>
              typeof lead.retentionStatus === "undefined" ||
              lead.retentionStatus === "Active"
          ).length;


          // "Customer Acquired" for the agent in the date range
          const customersAcquired = filteredLeads.length;


          // Fetch sales for this agent and filter by date range
          const salesRes = await axios.get(
            "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales",
            {
              params: { orderCreatedBy: agent.fullName },
            }
          );
          const allSales = salesRes.data || [];
          const filteredSales = allSales.filter(
            (sale) => sale.date >= startDate && sale.date <= endDate
          );
          const totalSales = filteredSales.reduce(
            (acc, sale) => acc + (sale.amountPaid || 0),
            0
          );
          const salesDone = filteredSales.length;
          const avgOrderValue = salesDone > 0 ? totalSales / salesDone : 0;


          totalActiveCustomers += activeCustomers;
          totalSalesDoneInRange += salesDone;
          totalSalesAmountInRange += totalSales;


          return {
            agentName: agent.fullName,
            activeCustomers,
            customerAcquired: customersAcquired,
            salesDone,
            totalSales,
            avgOrderValue,
          };
        })
      );


      const overallAvgOrderValue =
        totalSalesDoneInRange > 0
          ? totalSalesAmountInRange / totalSalesDoneInRange
          : 0;


      setTodaySummary({
        totalActiveCustomers,
        customerAcquired: customerAcquiredCount,
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


  // When user changes Dashboard Range
  const handleDashboardRangeChange = async (e) => {
    const newRange = e.target.value;
    setDashboardRange(newRange);
    if (newRange !== "Custom range") {
      const { startDate, endDate } = getDateRange(newRange);
      await fetchDashboardDataRange(startDate, endDate);
      setCustomDashboardStart("");
      setCustomDashboardEnd("");
    }
  };


  const applyCustomDashboardRange = async () => {
    if (!customDashboardStart || !customDashboardEnd) return;
    await fetchDashboardDataRange(customDashboardStart, customDashboardEnd);
  };


  // ---------------------------
  // Shipment sections: fetch & filter data similarly
  // ---------------------------
  const fetchShipmentData = async (startDate, endDate) => {
    try {
      const salesRes = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales"
      );
      const allSales = salesRes.data || [];
      const filteredSales = allSales.filter(
        (sale) => sale.date >= startDate && sale.date <= endDate
      );
      setRetentionSales(filteredSales);


      const employeesRes = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees",
        {
          params: { role: "Retention Agent" },
        }
      );
      const activeAgents = employeesRes.data.filter(
        (emp) => emp.status === "active"
      );
      setRetentionAgents(activeAgents);
    } catch (err) {
      console.error("Error fetching shipment data:", err);
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


  useEffect(() => {
    setShipmentSummary(computeShipmentSummary(retentionSales));
    if (!selectedAgent) {
      setAgentShipmentSummary([]);
    } else {
      const filtered = retentionSales.filter(
        (sale) => sale.orderCreatedBy === selectedAgent
      );
      setAgentShipmentSummary(computeShipmentSummary(filtered));
    }
  }, [retentionSales, selectedAgent]);


  // On mount: Load default ranges ("Today" for both sections)
  useEffect(() => {
    const { startDate, endDate } = getDateRange("Today");
    fetchDashboardDataRange(startDate, endDate);
    fetchShipmentData(startDate, endDate);
    // eslint-disable-next-line
  }, []);


  return (
    <Box sx={{ padding: 3 }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{
          textAlign: "center",
          color: "#1E293B", // Dark contrast for readability
          letterSpacing: "0.8px",
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5, // Smooth spacing
          background: "linear-gradient(90deg, #1976D2, #42A5F5)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: { xs: "1.8rem", md: "2.2rem" }, // Responsive font size
        }}
      >
        Manager Retention Dashboard
      </Typography>


      {/* summary toggle */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          width: "100%",
          mb: 6,
          mt: 2,
          ml: 20,
        }}
      >
        <FormControl fullWidth variant="outlined" sx={{ width: 300 }}>
          <Select
            value={selectedSummary}
            onChange={(e) => setSelectedSummary(e.target.value)}
            displayEmpty
            IconComponent={ExpandMoreIcon}
            renderValue={(selected) => {
              return selected ? `Summary: ${selected}` : "Summary:";
            }}
            sx={{
              backgroundColor: "#fff",
              color: "#333",
              borderRadius: 2,
              border: "1px solid #ccc",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#888",
              },
            }}
          >
            <MenuItem value="Agent's Summary">
              <Typography variant="body2">Agent's Summary</Typography>
            </MenuItem>
            <MenuItem value="Shipment Status Summary">
              <Typography variant="body2">Shipment Status Summary</Typography>
            </MenuItem>
            <MenuItem value="Agent Wise Shipment Summary">
              <Typography variant="body2">
                Agent Wise Shipment Summary
              </Typography>
            </MenuItem>
          </Select>
        </FormControl>
      </Box>


      {selectedSummary === "Agent's Summary" && (
        <>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              justifyContent: "flex-start",
              mb: 3,
              ml: 20,
              flexWrap: "wrap",
            }}
          >
            {/* Filters */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                justifyContent: "flex-start",
                flexWrap: "wrap",
              }}
            >
              {/* Select Range Field */}
              <TextField
                select
                label="Select Range"
                value={dashboardRange}
                onChange={handleDashboardRangeChange}
                sx={{
                  width: 250,
                  backgroundColor: "#F9FAFB",
                  borderRadius: 2,
                  "& fieldset": { border: "none" }, // Remove default border
                  boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                {timeRangeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>


              {/* Custom Range Inputs */}
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
            </Box>
          </Box>


          {/* Agent's Summary */}
          <Box
            sx={{
              padding: 2,
              marginTop: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "1000px", // Adjusted width
              margin: "0 auto",
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{
                textAlign: "center",
                color: "#000", // Black color for "Agent Metrics" heading
                marginBottom: 2,
              }}
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
                  label: "Active Customers",
                  value: todaySummary.totalActiveCustomers,
                  icon: <AccountCircle sx={{ fontSize: 20, color: "#fff" }} />,
                  gradient:
                    "linear-gradient(135deg, #64B5F6 30%, #42A5F5 100%)",
                },
                {
                  label: "Customer Acquired",
                  value: todaySummary.customerAcquired,
                  icon: <GroupAdd sx={{ fontSize: 20, color: "#fff" }} />,
                  gradient:
                    "linear-gradient(135deg, #66BB6A 30%, #43A047 100%)",
                },
                {
                  label: "Sales Done",
                  value: todaySummary.totalSalesDoneToday,
                  icon: <ShoppingCart sx={{ fontSize: 20, color: "#fff" }} />,
                  gradient:
                    "linear-gradient(135deg, #FFCC80 30%, #FFA726 100%)",
                },
                {
                  label: "Total Sales",
                  value:
                    todaySummary.totalSalesAmount !== undefined
                      ? `₹${todaySummary.totalSalesAmount.toLocaleString(
                          "en-IN"
                        )}`
                      : undefined,
                  icon: <CurrencyRupee sx={{ fontSize: 20, color: "#fff" }} />,
                  gradient:
                    "linear-gradient(135deg, #EF9A9A 30%, #E57373 100%)",
                },
                {
                  label: "Average Order Value",
                  value:
                    todaySummary.avgOrderValue !== undefined
                      ? `₹${todaySummary.avgOrderValue.toLocaleString("en-IN")}`
                      : undefined,
                  icon: <CurrencyRupee sx={{ fontSize: 20, color: "#fff" }} />,
                  gradient:
                    "linear-gradient(135deg, #CE93D8 30%, #BA68C8 100%)",
                },
              ].map(({ label, value, icon, gradient }) => (
                <Box
                  key={label}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: gradient, // Gradient background
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    textAlign: "center",
                    transition: "all 0.3s ease",
                    minWidth: 200,
                    height: 120,
                    "&:hover": {
                      transform: "translateY(2px)",
                    },
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


                  <Typography
                    variant="subtitle1"
                    fontWeight="600"
                    sx={{ color: "#fff" }}
                  >
                    {value !== undefined ? (
                      value
                    ) : (
                      <CircularProgress size={16} sx={{ color: "#fff" }} />
                    )}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>


          {/* Agent Metrics */}
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
              sx={{
                textAlign: "center",
                color: "#000", // Black color for "Agent Metrics" heading
                marginBottom: 2,
              }}
            >
              Agent Metrics
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
                {/* TABLE HEAD */}
                <TableHead>
                  <TableRow
                    sx={{
                      background:
                        "linear-gradient(135deg, #64B5F6 30%, #42A5F5 100%)",
                    }}
                  >
                    {[
                      "Agent Name",
                      "Active Customers",
                      "Customer Acquired",
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


                {/* LOADING INDICATOR */}
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


                {/* TABLE BODY */}
                <TableBody>
                  {!loading &&
                    agentMetrics.length > 0 &&
                    agentMetrics.map((agent, index) => (
                      <TableRow
                        key={agent.agentName}
                        sx={{
                          backgroundColor:
                            index % 2 === 0 ? "#F9FAFB" : "#FFFFFF", // Alternating row colors
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
                          {agent.agentName}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {agent.activeCustomers}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {agent.customerAcquired}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {agent.salesDone}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          ₹{agent.totalSales.toFixed(2)}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          ₹{agent.avgOrderValue.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}


                  {/* NO DATA FOUND */}
                  {!loading && agentMetrics.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
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
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}
      {selectedSummary === "Shipment Status Summary" && (
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


          {/* Filters */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              mb: 2,
              flexWrap: "wrap",
              justifyContent: "flex-start",
              ml:20,
            }}
          >
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
                  sx={{
                    backgroundColor: "#1976D2",
                    color: "#fff",
                    boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)",
                    "&:hover": { backgroundColor: "#1565C0" },
                  }}
                  onClick={applyCustomShipmentRange}
                >
                  Apply
                </Button>
              </>
            )}
          </Box>


          {/* Table */}
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
              sx={{
                borderRadius: 2,
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
                overflowX: "auto",
              }}
              component={Paper}
            >
              <Table>
                {/* TABLE HEAD */}
                <TableHead>
                  <TableRow
                    sx={{
                      background:
                        "linear-gradient(135deg, #64B5F6 30%, #42A5F5 100%)",
                    }}
                  >
                    {["Category", "Count", "Amount", "Percentage"].map(
                      (header) => (
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
                      )
                    )}
                  </TableRow>
                </TableHead>


                {/* LOADING INDICATOR */}
                {loading && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4} sx={{ padding: 0 }}>
                        <LinearProgress
                          variant="indeterminate"
                          sx={{ width: "100%", height: "3px" }}
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}


                {/* TABLE BODY */}
                <TableBody>
                  {!loading &&
                    shipmentSummary.length > 0 &&
                    shipmentSummary.map((row, idx) => (
                      <TableRow
                        key={idx}
                        sx={{
                          backgroundColor:
                            idx % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
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
                          {row.category}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {row.count}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          ₹{row.amount.toFixed(2)}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {row.percentage}%
                        </TableCell>
                      </TableRow>
                    ))}


                  {/* NO DATA FOUND */}
                  {!loading && shipmentSummary.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        align="center"
                        sx={{
                          padding: "12px",
                          color: "#888",
                          fontStyle: "italic",
                        }}
                      >
                        No shipment data found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}
      {selectedSummary === "Agent Wise Shipment Summary" && (
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
            Agent Wise Shipment Status
          </Typography>


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
              sx={{
                borderRadius: 2,
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
                overflowX: "auto",
              }}
              component={Paper}
            >
              <Table>
                {/* TABLE HEAD */}
                <TableHead>
                  <TableRow
                    sx={{
                      background:
                        "linear-gradient(135deg, #64B5F6 30%, #42A5F5 100%)",
                    }}
                  >
                    {["Category", "Count", "Amount", "Percentage"].map(
                      (header) => (
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
                      )
                    )}
                  </TableRow>
                </TableHead>


                {/* LOADING INDICATOR */}
                {loading && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4} sx={{ padding: 0 }}>
                        <LinearProgress
                          variant="indeterminate"
                          sx={{ width: "100%", height: "3px" }}
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}


                {/* TABLE BODY */}
                <TableBody>
                  {!loading &&
                    agentShipmentSummary.length > 0 &&
                    agentShipmentSummary.map((row, idx) => (
                      <TableRow
                        key={idx}
                        sx={{
                          backgroundColor:
                            idx % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
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
                          {row.category}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {row.count}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          ₹{row.amount.toFixed(2)}
                        </TableCell>
                        <TableCell
                          sx={{ padding: "12px", textAlign: "center" }}
                        >
                          {row.percentage}%
                        </TableCell>
                      </TableRow>
                    ))}


                  {/* NO DATA FOUND */}
                  {!loading && agentShipmentSummary.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        align="center"
                        sx={{
                          padding: "12px",
                          color: "#888",
                          fontStyle: "italic",
                        }}
                      >
                        {selectedAgent
                          ? "No shipment data found for this agent."
                          : "Please select an agent."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}
    </Box>
  );
};


export default ManagerRetentionDashboard;





