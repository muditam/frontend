import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper, 
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
} from "@mui/material";
import axios from "axios";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { styled } from "@mui/system";

const BlinkingIcon = styled(WarningAmberIcon)({
  animation: "blink-animation 1.5s steps(2, start) infinite",
  "@keyframes blink-animation": {
    "50%": {
      opacity: 0,
    },
  },
  color: "red",
});

const RetentionAgentDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayMetrics, setTodayMetrics] = useState({});
  const [followupMetrics, setFollowupMetrics] = useState({});
  const [applyingFilter, setApplyingFilter] = useState(false); 
  const [allTimeMetrics, setAllTimeMetrics] = useState({});
  const [deliverySummary, setDeliverySummary] = useState([]);
  const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });

  const fetchDashboardData = async (retentionAgentName, retentionAgentEmail) => {
    try {
      setLoading(true);

      // Fetch all leads assigned to the logged-in retention agent
      const retentionLeadsResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retention",
        {
          params: {
            fullName: retentionAgentName,
            email: retentionAgentEmail,
          },
        }
      );

      const retentionLeads = retentionLeadsResponse.data || [];
      const todayDate = new Date().toISOString().split("T")[0];
      const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // Today Section
      const activeCustomers = retentionLeads.filter(
        (lead) =>
          lead.healthExpertAssigned === retentionAgentName &&
          (!lead.retentionStatus || lead.retentionStatus === "Active")
      ).length;

      const customersAssignedToday = retentionLeads.filter(
        (lead) =>
          lead.healthExpertAssigned === retentionAgentName &&
          lead.date === todayDate
      ).length;

      // Fetch retention sales for the logged-in agent
      const retentionSalesResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales",
        { params: { orderCreatedBy: retentionAgentName } }
      );

      const retentionSales = retentionSalesResponse.data || [];
      const salesDoneToday = retentionSales.filter(
        (sale) => sale.date === todayDate
      );

      const totalSales = salesDoneToday.reduce(
        (acc, sale) => acc + (sale.amountPaid || 0),
        0
      );

      const avgOrderValue =
        salesDoneToday.length > 0
          ? totalSales / salesDoneToday.length
          : 0;

      setTodayMetrics({
        activeCustomers,
        customersAssignedToday,
        salesDone: salesDoneToday.length,
        totalSales: totalSales || 0,
        avgOrderValue,
      });

      // Follow-Up Section
      const noFollowupSet = retentionLeads.filter(
        (lead) =>
          lead.healthExpertAssigned === retentionAgentName &&
          !lead.rtNextFollowupDate
      ).length;

      const followupMissed = retentionLeads.filter(
        (lead) =>
          lead.healthExpertAssigned === retentionAgentName &&
          lead.rtNextFollowupDate &&
          lead.rtNextFollowupDate < todayDate
      ).length;

      const followupToday = retentionLeads.filter(
        (lead) =>
          lead.healthExpertAssigned === retentionAgentName &&
          lead.rtNextFollowupDate === todayDate
      ).length;

      const followupTomorrow = retentionLeads.filter(
        (lead) =>
          lead.healthExpertAssigned === retentionAgentName &&
          lead.rtNextFollowupDate === tomorrowDate
      ).length;

      const followupLater = retentionLeads.filter(
        (lead) =>
          lead.healthExpertAssigned === retentionAgentName &&
          lead.rtNextFollowupDate > tomorrowDate
      ).length;

      setFollowupMetrics({
        noFollowupSet,
        followupMissed,
        followupToday,
        followupTomorrow,
        followupLater,
      });

      // All Time Section
      const totalCustomers = retentionLeads.filter(
        (lead) =>
          lead.healthExpertAssigned === retentionAgentName
      ).length;

      const activeCustomersAllTime = retentionLeads.filter(
        (lead) =>
          lead.healthExpertAssigned === retentionAgentName &&
          (!lead.retentionStatus || lead.retentionStatus === "Active")
      ).length;

      const lostCustomers = retentionLeads.filter(
        (lead) =>
          lead.healthExpertAssigned === retentionAgentName &&
          lead.retentionStatus === "Lost"
      ).length;

      const customersRetainedThisMonth = retentionSales.filter((sale) => {
        const saleDate = new Date(sale.date);
        const now = new Date();
        return (
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      }).length;

      const retentionRate =
        totalCustomers > 0
          ? ((customersRetainedThisMonth / totalCustomers) * 100).toFixed(2)
          : 0;

      const totalSalesAllTime = retentionSales.reduce(
        (acc, sale) => acc + (sale.amountPaid || 0),
        0
      );

      const avgOrderValueAllTime =
        retentionSales.length > 0
          ? totalSalesAllTime / retentionSales.length
          : 0;

      setAllTimeMetrics({
        totalCustomers,
        activeCustomers: activeCustomersAllTime,
        lostCustomers,
        customersRetainedThisMonth,
        retentionRate,
        salesDone: retentionSales.length,
        totalSales: totalSalesAllTime,
        avgOrderValue: avgOrderValueAllTime,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliverySummary = async (retentionAgentName) => {
    try {
      setApplyingFilter(true); // Show spinner only for applying filter
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales",
        { params: { orderCreatedBy: retentionAgentName } }
      );

      const orders = response.data || [];
      const filteredOrders = orders.filter((order) => {
        const orderDate = new Date(order.date).toISOString().split("T")[0];
        return (
          (!dateFilter.startDate || orderDate >= dateFilter.startDate) &&
          (!dateFilter.endDate || orderDate <= dateFilter.endDate)
        );
      });

      const totalOrders = filteredOrders.length;
      const deliveredOrders = filteredOrders.filter(
        (order) => order.deliveryStatus === "Delivered"
      );
      const inTransitOrders = filteredOrders.filter(
        (order) => order.deliveryStatus === "Undelivered"
      );
      const rtoOrders = filteredOrders.filter(
        (order) => order.deliveryStatus === "RTO"
      );
      const othersOrders = filteredOrders.filter(
        (order) =>
          order.deliveryStatus !== "Delivered" &&
          order.deliveryStatus !== "Undelivered" &&
          order.deliveryStatus !== "RTO"
      );

      const calculateTotalAmount = (orders) =>
        orders.reduce((acc, order) => acc + (order.amountPaid || 0), 0);

      const summary = [
        {
          label: "Total Orders",
          count: totalOrders,
          amount: calculateTotalAmount(filteredOrders),
          percentage: 100,
        },
        {
          label: "Delivered Orders",
          count: deliveredOrders.length,
          amount: calculateTotalAmount(deliveredOrders),
          percentage:
            totalOrders > 0
              ? ((deliveredOrders.length / totalOrders) * 100).toFixed(2)
              : 0,
        },
        {
          label: "In Transit",
          count: inTransitOrders.length,
          amount: calculateTotalAmount(inTransitOrders),
          percentage:
            totalOrders > 0
              ? ((inTransitOrders.length / totalOrders) * 100).toFixed(2)
              : 0,
        },
        {
          label: "RTO",
          count: rtoOrders.length,
          amount: calculateTotalAmount(rtoOrders),
          percentage:
            totalOrders > 0
              ? ((rtoOrders.length / totalOrders) * 100).toFixed(2)
              : 0,
        },
        {
          label: "Others",
          count: othersOrders.length,
          amount: calculateTotalAmount(othersOrders),
          percentage:
            totalOrders > 0
              ? ((othersOrders.length / totalOrders) * 100).toFixed(2)
              : 0,
        },
      ];

      setDeliverySummary(summary);
    } catch (error) {
      console.error("Error fetching delivery summary:", error);
    } finally {
      setApplyingFilter(false); 
    }
  };

  useEffect(() => {
    const loggedInUser = JSON.parse(sessionStorage.getItem("user"));
    if (loggedInUser?.role === "Retention Agent") {
      setUser(loggedInUser);
      fetchDashboardData(loggedInUser.fullName, loggedInUser.email);
      fetchDeliverySummary(loggedInUser.fullName);
    }
  }, []);

  const handleApplyFilters = () => {
    if (user) {
      fetchDeliverySummary(user.fullName); 
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
        {user?.fullName} - Retention Agent Dashboard
      </Typography>

      {/* Today Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
        Today
      </Typography>
      <Grid container spacing={3}>
        {[
          { label: "Active Customers", value: todayMetrics.activeCustomers || 0 },
          {
            label: "Customers Assigned Today",
            value: todayMetrics.customersAssignedToday || 0,
          },
          { label: "Sales Done", value: todayMetrics.salesDone || 0 },
          {
            label: "Total Sales",
            value: `₹${(todayMetrics.totalSales || 0).toFixed(2)}`,
          },
          {
            label: "Average Order Value",
            value: `₹${(todayMetrics.avgOrderValue || 0).toFixed(2)}`,
          },
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

      {/* Follow-Up Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Follow-Up
      </Typography>
      <Grid container spacing={3}>
        {[
          {
            label: "No Followup Set",
            value: followupMetrics.noFollowupSet,
            showIcon: followupMetrics.noFollowupSet > 0,
          },
          {
            label: "Followup Missed",
            value: followupMetrics.followupMissed,
            showIcon: followupMetrics.followupMissed > 0,
          },
          { label: "Followup Today", value: followupMetrics.followupToday },
          { label: "Followup Tomorrow", value: followupMetrics.followupTomorrow },
          { label: "Followup Later", value: followupMetrics.followupLater },
        ].map(({ label, value, showIcon }) => (
          <Grid item xs={12} sm={6} md={4} key={label}>
            <Paper
              sx={{
                padding: 2,
                textAlign: "center",
                position: "relative",
              }}
            >
              <Typography variant="subtitle1" gutterBottom>
                {label}
              </Typography>
              <Typography variant="h6">{value}</Typography>
              {showIcon && (
                <BlinkingIcon sx={{ position: "absolute", top: 8, right: 8 }} />
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* All Time Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        All Time
      </Typography>
      <Grid container spacing={3}>
        {[
          { label: "Total Customers", value: allTimeMetrics.totalCustomers || 0 },
          {
            label: "Customers Retained This Month",
            value: allTimeMetrics.customersRetainedThisMonth || 0,
          },
          {
            label: "Retention Rate",
            value: `${allTimeMetrics.retentionRate || 0}%`,
          },
          {
            label: "Active Customers",
            value: allTimeMetrics.activeCustomers || 0,
          },
          { label: "Lost Customers", value: allTimeMetrics.lostCustomers || 0 },
          { label: "Sales Done", value: allTimeMetrics.salesDone || 0 },
          {
            label: "Total Sales",
            value: `₹${(allTimeMetrics.totalSales || 0).toFixed(2)}`,
          },
          {
            label: "Average Order Value",
            value: `₹${(allTimeMetrics.avgOrderValue || 0).toFixed(2)}`,
          },
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
      {/* Delivery Status Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Order Delivery Status
      </Typography>
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
          onClick={() => fetchDeliverySummary(user?.fullName)}
        >
          Apply Filters
        </Button>
      </Box>
      {applyingFilter ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#F4CCCC" }}>
                <TableCell>
                  <Typography fontWeight="bold">Category</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">Count</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">Amount</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">Percentage</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deliverySummary.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{`₹${row.amount.toFixed(2)}`}</TableCell>
                  <TableCell>{`${row.percentage}%`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default RetentionAgentDashboard;
