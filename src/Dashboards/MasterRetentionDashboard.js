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
  CircularProgress,
  TextField,
  MenuItem,
  Button,
} from "@mui/material";
import axios from "axios";

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

  // Data for top sections
  const [todaySummary, setTodaySummary] = useState({});
  const [agentMetrics, setAgentMetrics] = useState([]);
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

  // ---------------------------
  // Fetch Dashboard Data for Top Sections (Today's Summary & Agent Metrics)
  // ---------------------------
  const fetchDashboardDataRange = async (startDate, endDate) => {
    try {
      setLoading(true);

      // 1) Fetch active retention agents
      const agentsResponse = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees", {
        params: { role: "Retention Agent" },
      });
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
        setAgentMetrics([]);
        setLoading(false);
        return;
      }

      // 2) Fetch Customer Acquired count from /api/leads/new-orders
      // If the range is a single day, use orderDate for filtering.
      const acquiredParams = { limit: 0, page: 1, startDate, endDate };
      const acquiredRes = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/new-orders", {
        params: acquiredParams,
      });
      const customerAcquiredCount = acquiredRes.data.total || (acquiredRes.data.leads && acquiredRes.data.leads.length) || 0;


      // 3) For each agent, fetch leads & sales for the given date range
      let totalActiveCustomers = 0;
      let totalSalesDoneInRange = 0;
      let totalSalesAmountInRange = 0;

      const agentData = await Promise.all(
        activeAgents.map(async (agent) => {
          // Fetch all retention leads
          const leadsRes = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retention");
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
          const salesRes = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales", {
            params: { orderCreatedBy: agent.fullName },
          });
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
      const salesRes = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales");
      const allSales = salesRes.data || [];
      const filteredSales = allSales.filter(
        (sale) => sale.date >= startDate && sale.date <= endDate
      );
      setRetentionSales(filteredSales);

      const employeesRes = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees", {
        params: { role: "Retention Agent" },
      });
      const activeAgents = employeesRes.data.filter((emp) => emp.status === "active");
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

  // Recompute shipment summaries when retentionSales or selectedAgent changes
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
      {/* ------------------ Dashboard Range Controls ------------------ */}
      <Typography variant="h4" gutterBottom>
        Manager Retention Dashboard
      </Typography>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
        <TextField
          select
          label="Select Range"
          value={dashboardRange}
          onChange={handleDashboardRangeChange}
          sx={{ width: 250 }}
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
            />
            <TextField
              label="End Date"
              type="date"
              value={customDashboardEnd}
              onChange={(e) => setCustomDashboardEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="contained" onClick={applyCustomDashboardRange}>
              Apply
            </Button>
          </>
        )}
      </Box>

      {/* ------------------ Today's Summary ------------------ */}
      <Typography variant="h5" gutterBottom sx={{ mt: 3, mb: 7, fontWeight: "bold" }}>
        Today's Summary
      </Typography>
      <Grid
        container
        spacing={3}
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 3,
        }}
      >
        {[
          {
            label: "Active Customers",
            value:
              todaySummary.totalActiveCustomers !== undefined ? (
                todaySummary.totalActiveCustomers
              ) : (
                <CircularProgress size={20} />
              ),
          },
          {
            label: "Customer Acquired",
            value:
              todaySummary.customerAcquired !== undefined ? (
                todaySummary.customerAcquired
              ) : (
                <CircularProgress size={20} />
              ),
          },
          {
            label: "Sales Done",
            value:
              todaySummary.totalSalesDoneToday !== undefined ? (
                todaySummary.totalSalesDoneToday
              ) : (
                <CircularProgress size={20} />
              ),
          },
          {
            label: "Total Sales",
            value:
              todaySummary.totalSalesAmount !== undefined ? (
                `₹${todaySummary.totalSalesAmount.toFixed(2)}`
              ) : (
                <CircularProgress size={20} />
              ),
          },
          {
            label: "Average Order Value",
            value:
              todaySummary.avgOrderValue !== undefined ? (
                `₹${todaySummary.avgOrderValue.toFixed(2)}`
              ) : (
                <CircularProgress size={20} />
              ),
          },
        ].map(({ label, value }) => (
          <Paper
            key={label}
            sx={{
              padding: 3,
              textAlign: "center",
              borderRadius: 3,
              backgroundColor: "#E3F2FD",
              boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.3s",
              "&:hover": { transform: "scale(1.05)" },
            }}
          >
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
              {label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              {value}
            </Typography>
          </Paper>
        ))}
      </Grid>

      {/* ------------------ Agent Metrics ------------------ */}
      <Typography variant="h5" gutterBottom sx={{ mt: 5, fontWeight: "bold" }}>
        Agent Metrics
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Agent Name</TableCell>
              <TableCell>Active Customers</TableCell>
              <TableCell>Customer Acquired</TableCell>
              <TableCell>Sales Done</TableCell>
              <TableCell>Total Sales</TableCell>
              <TableCell>Average Order Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agentMetrics.length > 0 ? (
              agentMetrics.map((agent) => (
                <TableRow key={agent.agentName}>
                  <TableCell>{agent.agentName}</TableCell>
                  <TableCell>{agent.activeCustomers}</TableCell>
                  <TableCell>{agent.customerAcquired}</TableCell>
                  <TableCell>{agent.salesDone}</TableCell>
                  <TableCell>₹{agent.totalSales.toFixed(2)}</TableCell>
                  <TableCell>₹{agent.avgOrderValue.toFixed(2)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {loading ? <CircularProgress size={24} /> : "No data found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ------------------ Shipment Status Summary ------------------ */}
      <Typography variant="h5" gutterBottom sx={{ mt: 5, fontWeight: "bold" }}>
        Shipment Status Summary
      </Typography>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
        <TextField
          select
          label="Select Range"
          value={shipmentRange}
          onChange={handleShipmentRangeChange}
          sx={{ width: 250 }}
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
            />
            <TextField
              label="End Date"
              type="date"
              value={customShipmentEnd}
              onChange={(e) => setCustomShipmentEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="contained" onClick={applyCustomShipmentRange}>
              Apply
            </Button>
          </>
        )}
      </Box>
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell>Count</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Percentage</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shipmentSummary.length > 0 ? (
              shipmentSummary.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>₹{row.amount.toFixed(2)}</TableCell>
                  <TableCell>{row.percentage}%</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No shipment data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ------------------ Agent-wise Shipment Status ------------------ */}
      <Box sx={{ mt: 5 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
          Agent wise Shipment Status
        </Typography>
        <TextField
          select
          label="Select Agent"
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          sx={{ width: 300 }}
        >
          <MenuItem value="">-- Select an Agent --</MenuItem>
          {retentionAgents.map((agent) => (
            <MenuItem key={agent._id} value={agent.fullName}>
              {agent.fullName}
            </MenuItem>
          ))}
        </TextField>
        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Count</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Percentage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agentShipmentSummary.length > 0 ? (
                agentShipmentSummary.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>₹{row.amount.toFixed(2)}</TableCell>
                    <TableCell>{row.percentage}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
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
    </Box>
  );
};

export default ManagerRetentionDashboard;
