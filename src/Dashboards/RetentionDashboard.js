import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
} from "@mui/material";
import axios from "axios";

const RetentionDashboard = () => {
  const [user, setUser] = useState(null);
  const [todayStats, setTodayStats] = useState({});
  const [followupStats, setFollowupStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [leadSourceData, setLeadSourceData] = useState([]);
  const [deliverySummary, setDeliverySummary] = useState([]);
const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });
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

const [filters, setFilters] = useState({ startDate: "", endDate: "" });
const leadSources = [
  "Abandoned Cart",
  "BiteSpeed",
  "Business on Bot",
  "Facebook Lead",
  "Google Lead",
  "Incoming Call",
  "Lead Form",
  "Online Store",
  "Others",
  "Rampwin",
  "Reference",
  "Whatsapp",
  "Degpeg",
];

  useEffect(() => {
    const loggedInUser = JSON.parse(sessionStorage.getItem("user"));
    if (loggedInUser) {
      setUser(loggedInUser);
      fetchDashboardData(loggedInUser.fullName);
    }
  }, []);

  

  const fetchAllTimeData = async (agentName) => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
        { params: { agentAssignedName: agentName, limit: 0 } }  
      );
      
  
      const leads = response.data.leads || [];
      const salesDoneLeads = leads.filter((lead) => lead.salesStatus === "Sales Done");
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

  const fetchDeliverySummary = async () => {
    console.log("Fetching Delivery Summary...");
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
        { params: { agentAssignedName: user?.fullName, limit: 0 } }  
      );
      console.log("API Response:", response.data);
  
      const leads = response.data.leads || [];
      console.log("Total Leads Retrieved:", leads.length);
  
      // Filter leads by date range
      const filteredLeads = leads.filter((lead) => {
        // Validate and normalize lead.date
        if (!lead.date || isNaN(new Date(lead.date))) {
          console.warn(`Invalid or missing date for lead:`, lead);
          return false; // Skip leads with invalid dates
        }
  
        const leadDate = new Date(lead.date).toISOString().split("T")[0];
  
        return (
          (!dateFilter.startDate || leadDate >= dateFilter.startDate) &&
          (!dateFilter.endDate || leadDate <= dateFilter.endDate)
        );
      });
      console.log("Filtered Leads:", filteredLeads);
  
      const totalOrders = filteredLeads.filter(
        (lead) => lead.salesStatus === "Sales Done"
      );
      const deliveredOrders = totalOrders.filter(
        (lead) => lead.deliveryStatus === "Delivered"
      );
      const inTransitOrders = totalOrders.filter(
        (lead) => lead.deliveryStatus === "Undelivered"
      );
      const rtoOrders = totalOrders.filter(
        (lead) => lead.deliveryStatus === "RTO"
      );
      const othersOrders = totalOrders.filter(
        (lead) =>
          lead.deliveryStatus !== "Delivered" &&
          lead.deliveryStatus !== "Undelivered" &&
          lead.deliveryStatus !== "RTO"
      );
  
      const calculateTotalAmount = (orders) =>
        orders.reduce((acc, lead) => acc + (lead.amountPaid || 0), 0);
  
      const summary = [
        {
          label: "Total Orders",
          totalOrders: totalOrders.length,
          totalAmount: calculateTotalAmount(totalOrders),
          percentage: totalOrders.length > 0 ? 100 : 0,
        },
        {
          label: "Delivered Orders",
          totalOrders: deliveredOrders.length,
          totalAmount: calculateTotalAmount(deliveredOrders),
          percentage:
            totalOrders.length > 0
              ? ((deliveredOrders.length / totalOrders.length) * 100).toFixed(2)
              : 0,
        },
        {
          label: "In Transit",
          totalOrders: inTransitOrders.length,
          totalAmount: calculateTotalAmount(inTransitOrders),
          percentage:
            totalOrders.length > 0
              ? ((inTransitOrders.length / totalOrders.length) * 100).toFixed(2)
              : 0,
        },
        {
          label: "RTO",
          totalOrders: rtoOrders.length,
          totalAmount: calculateTotalAmount(rtoOrders),
          percentage:
            totalOrders.length > 0
              ? ((rtoOrders.length / totalOrders.length) * 100).toFixed(2)
              : 0,
        },
        {
          label: "Others",
          totalOrders: othersOrders.length,
          totalAmount: calculateTotalAmount(othersOrders),
          percentage:
            totalOrders.length > 0
              ? ((othersOrders.length / totalOrders.length) * 100).toFixed(2)
              : 0,
        },
      ];
  
      console.log("Delivery Summary:", summary);
      setDeliverySummary(summary);
    } catch (error) {
      console.error("Error fetching delivery summary:", error);
    }
  };
  
  
  const applyLeadSourceFilters = async () => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
        {
          params: {
            agentAssignedName: user?.fullName,
            startDate: filters.startDate,
            endDate: filters.endDate,
            limit: 0, 
          },
        }
      );
      
  
      const leads = response.data.leads || [];
      const sourceSummary = leadSources.map((source) => {
        const leadsBySource = leads.filter((lead) => lead.leadSource === source);
        const leadsConverted = leadsBySource.filter(
          (lead) => lead.salesStatus === "Sales Done"
        );
        const salesAmount = leadsConverted.reduce(
          (acc, lead) => acc + (lead.amountPaid || 0),
          0
        );
  
        return {
          leadSource: source,
          leadsAssigned: leadsBySource.length,
          leadsConverted: leadsConverted.length,
          conversionRate:
            leadsBySource.length > 0
              ? ((leadsConverted.length / leadsBySource.length) * 100).toFixed(2)
              : 0,
          salesAmount,
        };
      });
  
      const totalLeadsAssigned = sourceSummary.reduce(
        (acc, row) => acc + row.leadsAssigned,
        0
      );
      const totalLeadsConverted = sourceSummary.reduce(
        (acc, row) => acc + row.leadsConverted,
        0
      );
      const totalSalesAmount = sourceSummary.reduce(
        (acc, row) => acc + row.salesAmount,
        0
      );
  
      setLeadSourceData(sourceSummary);
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
      console.error("Error fetching lead source data:", error);
    }
  };

  const fetchDashboardData = async (agentName) => {
    try {
      setLoading(true);
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
        { params: { agentAssignedName: agentName, limit: 0 } }   
      );
      

      const leads = response.data.leads || [];
      const todayDate = new Date().toISOString().split("T")[0];
      const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // Calculate "Today" section stats
      const openLeads = leads.filter(
        (lead) => lead.salesStatus === "On Follow Up"
      ).length;
      const leadsAssignedToday = leads.filter(
        (lead) => lead.date === todayDate
      ).length;
      const salesDoneToday = leads.filter(
        (lead) =>
          lead.salesStatus === "Sales Done" && lead.date === todayDate
      );
      const totalSales = salesDoneToday.reduce(
        (acc, lead) => acc + (lead.amountPaid || 0),
        0
      );
      const conversionRate =
        leadsAssignedToday > 0
          ? ((salesDoneToday.length / leadsAssignedToday) * 100).toFixed(2)
          : 0;
      const avgOrderValue =
        salesDoneToday.length > 0
          ? (totalSales / salesDoneToday.length).toFixed(2)
          : 0;

      setTodayStats({
        openLeads,
        leadsAssignedToday,
        salesDone: salesDoneToday.length,
        conversionRate,
        totalSales,
        avgOrderValue,
      });

      // Calculate "Followup" section stats
      const noFollowupSet = leads.filter((lead) => !lead.nextFollowup).length;
      const followupMissed = leads.filter(
        (lead) => lead.nextFollowup && lead.nextFollowup < todayDate
      ).length;
      const followupToday = leads.filter(
        (lead) => lead.nextFollowup === todayDate
      ).length;
      const followupTomorrow = leads.filter(
        (lead) => lead.nextFollowup === tomorrowDate
      ).length;
      const followupLater = leads.filter(
        (lead) => lead.nextFollowup > tomorrowDate
      ).length;

      setFollowupStats({
        noFollowupSet,
        followupMissed,
        followupToday,
        followupTomorrow,
        followupLater,
      });
      await fetchAllTimeData(agentName);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        {user?.fullName} - Sales Dashboard
      </Typography>

      {/* Today Section */}
      <Paper
        sx={{
          padding: 2,
          marginBottom: 3,
          backgroundColor: "#FFF2CC",
        }}
      >
        <Typography variant="h5" gutterBottom>
          Today
        </Typography>
        <Grid container spacing={3}>
          {[
            { label: "Open Leads", value: todayStats.openLeads },
            { label: "Leads Assigned Today", value: todayStats.leadsAssignedToday },
            { label: "Sales Done", value: todayStats.salesDone },
            { label: "Conversion Rate", value: `${todayStats.conversionRate}%` },
            { label: "Total Sales", value: `₹${todayStats.totalSales}` },
            { label: "Average Order Value", value: `₹${todayStats.avgOrderValue}` },
          ].map(({ label, value }) => (
            <Grid item xs={12} sm={6} md={4} key={label}>
              <Paper sx={{ padding: 2, textAlign: "center" }}>
                <Typography variant="subtitle1" gutterBottom>
                  {label}
                </Typography>
                <Typography variant="h6">{value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Followup Section */}
      <Paper
        sx={{
          padding: 2,
          backgroundColor: "#F4CCCC",
        }}
      >
        <Typography variant="h5" gutterBottom>
          Followup
        </Typography>
        <Grid container spacing={3}>
          {[
            { label: "No Followup Set", value: followupStats.noFollowupSet },
            { label: "Followup Missed", value: followupStats.followupMissed },
            { label: "Followup Today", value: followupStats.followupToday },
            { label: "Followup Tomorrow", value: followupStats.followupTomorrow },
            { label: "Followup Later", value: followupStats.followupLater },
          ].map(({ label, value }) => (
            <Grid item xs={12} sm={6} md={4} key={label}>
              <Paper sx={{ padding: 2, textAlign: "center" }}>
                <Typography variant="subtitle1" gutterBottom>
                  {label}
                </Typography>
                <Typography variant="h6">{value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper
  sx={{
    padding: 2,
    marginTop: 3,
    backgroundColor: "#E5E5E5", // Adjust background color if needed
  }}
>
  <Typography variant="h5" gutterBottom>
    Lead Source Summary
  </Typography>

  <Box sx={{ display: "flex", gap: 2, marginBottom: 2 }}>
    <TextField
      label="Start Date"
      type="date"
      InputLabelProps={{ shrink: true }}
      value={filters.startDate || ""}
      onChange={(e) =>
        setFilters((prev) => ({ ...prev, startDate: e.target.value }))
      }
      fullWidth
    />
    <TextField
      label="End Date"
      type="date"
      InputLabelProps={{ shrink: true }}
      value={filters.endDate || ""}
      onChange={(e) =>
        setFilters((prev) => ({ ...prev, endDate: e.target.value }))
      }
      fullWidth
    />
    <Button
      variant="contained"
      onClick={applyLeadSourceFilters}
      sx={{ alignSelf: "center" }}
    >
      Apply Filters
    </Button>
  </Box>

  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Lead Source</TableCell>
          <TableCell>Leads Assigned</TableCell>
          <TableCell>Leads Converted</TableCell>
          <TableCell>Conversion Rate</TableCell>
          <TableCell>Sales Amount</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {leadSourceData.map((row) => (
          <TableRow key={row.leadSource}>
            <TableCell>{row.leadSource}</TableCell>
            <TableCell>{row.leadsAssigned}</TableCell>
            <TableCell>{row.leadsConverted}</TableCell>
            <TableCell>{`${row.conversionRate}%`}</TableCell>
            <TableCell>{`₹${row.salesAmount}`}</TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">Total</Typography>
          </TableCell>
          <TableCell>{totals.leadsAssigned}</TableCell>
          <TableCell>{totals.leadsConverted}</TableCell>
          <TableCell>{`${totals.conversionRate}%`}</TableCell>
          <TableCell>{`₹${totals.salesAmount}`}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </TableContainer>
</Paper>

{/* All Time Summary Section */}
<Paper
  sx={{
    padding: 2,
    marginTop: 3,
    backgroundColor: "#FFFFFF",
  }}
>
  <Typography variant="h5" gutterBottom>
    All Time
  </Typography>

  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow sx={{ backgroundColor: "#F4CCCC" }}>
          <TableCell>
            <Typography fontWeight="bold">Label</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Total Leads</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Sales Done</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Conversion Rate</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Total Sales</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Average Order Value</Typography>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">All Time</Typography>
          </TableCell>
          <TableCell>{allTimeStats.totalLeads}</TableCell>
          <TableCell>{allTimeStats.salesDone}</TableCell>
          <TableCell>{`${allTimeStats.conversionRate}%`}</TableCell>
          <TableCell>{`₹${allTimeStats.totalSales}`}</TableCell>
          <TableCell>{`₹${allTimeStats.avgOrderValue}`}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </TableContainer>
</Paper>

{/* Delivery Status Summary Section */}
<Paper
  sx={{
    padding: 2,
    marginTop: 3,
    backgroundColor: "#FFFFFF",
  }}
>
  <Typography variant="h5" gutterBottom>
    Delivery Status Summary
  </Typography>

  {/* Date Range Filter */}
  <Box sx={{ display: "flex", gap: 2, marginBottom: 2 }}>
    <TextField
      label="Start Date"
      type="date"
      value={dateFilter.startDate}
      onChange={(e) =>
        setDateFilter((prev) => ({ ...prev, startDate: e.target.value }))
      }
      InputLabelProps={{ shrink: true }}
      fullWidth
    />
    <TextField
      label="End Date"
      type="date"
      value={dateFilter.endDate}
      onChange={(e) =>
        setDateFilter((prev) => ({ ...prev, endDate: e.target.value }))
      }
      InputLabelProps={{ shrink: true }}
      fullWidth
    />
    <Button
      variant="contained"
      onClick={fetchDeliverySummary}
      sx={{ alignSelf: "flex-end" }}
    >
      Apply Filters
    </Button>
  </Box>

  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow sx={{ backgroundColor: "#F4CCCC" }}>
          <TableCell>
            <Typography fontWeight="bold">Category</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Total Orders</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Total Amount</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Percentage</Typography>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {deliverySummary.map((row) => (
          <TableRow key={row.label}>
            <TableCell>
              <Typography fontWeight="bold">{row.label}</Typography>
            </TableCell>
            <TableCell>{row.totalOrders}</TableCell>
            <TableCell>{`₹${row.totalAmount}`}</TableCell>
            <TableCell>{`${row.percentage}%`}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
</Paper>

    </Box>
  );
};

export default RetentionDashboard;