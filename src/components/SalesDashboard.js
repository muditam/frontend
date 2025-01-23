import React, { useEffect, useState } from "react";
import { Box, Typography, Grid, Paper, CircularProgress } from "@mui/material";
import axios from "axios";

const SalesDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalLeadsAssigned: 0,
    leadsAssignedToday: 0,
    totalSalesAmount: 0,
    salesTodayAmount: 0,
    weeklySalesAmount: 0,
    monthlySalesAmount: 0,
    ordersToday: 0,
    ordersThisWeek: 0,
    ordersThisMonth: 0,
  });

  const [loading, setLoading] = useState(true);
  const [userLoggedIn, setUserLoggedIn] = useState(false);

  const user = sessionStorage.getItem("user");
  const empData = user ? JSON.parse(user) : null;

  useEffect(() => {
    if (user) {
      setUserLoggedIn(true);
      fetchDashboardData(empData);
    }
  }, [user]);

  const fetchDashboardData = async (user) => {
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];
    const lastDayOfWeek = new Date(new Date().setDate(new Date().getDate() - 6));
    const lastDayOfMonth = new Date(new Date().setDate(new Date().getDate() - 30));

    try {
      const params = {
        limit: 0,  
        ...(user.role === "Sales Agent"
          ? { agentAssignedName: user.fullName }
          : user.role === "Retention Agent"
          ? { healthExpertAssigned: user.fullName } 
          : {}),
      };
 
      const leadsResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
        { params }
      );

      const leads = leadsResponse.data.leads;

      const totalLeadsAssigned = leads.length;
      const leadsAssignedToday = leads.filter((lead) => lead.date === today).length;

      const totalSalesAmount = leads.reduce(
        (sum, lead) => sum + (lead.amountPaid || 0),
        0
      );

      const salesTodayAmount = leads
        .filter((lead) => lead.date === today)
        .reduce((sum, lead) => sum + (lead.amountPaid || 0), 0);

      const weeklySalesAmount = leads
        .filter((lead) => new Date(lead.date) >= lastDayOfWeek)
        .reduce((sum, lead) => sum + (lead.amountPaid || 0), 0);

      const monthlySalesAmount = leads
        .filter((lead) => new Date(lead.date) >= lastDayOfMonth)
        .reduce((sum, lead) => sum + (lead.amountPaid || 0), 0);
 
      const ordersResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/new-orders",
        { params }
      );

      const orders = ordersResponse.data;

      const ordersToday = orders.filter((order) => order.date === today).length;
      const ordersThisWeek = orders.filter(
        (order) => new Date(order.date) >= lastDayOfWeek
      ).length;

      const ordersThisMonth = orders.filter(
        (order) => new Date(order.date) >= lastDayOfMonth
      ).length;

      setDashboardData({
        totalLeadsAssigned,
        leadsAssignedToday,
        totalSalesAmount,
        salesTodayAmount,
        weeklySalesAmount,
        monthlySalesAmount,
        ordersToday,
        ordersThisWeek,
        ordersThisMonth,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error.message);
    } finally {
      setLoading(false);
    }
  }; 

  if (!userLoggedIn) {
    return (
      <Box sx={{ padding: 3, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Muditam Ayurveda Sales Dashboard
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        {`${empData.fullName}'s Dashboard`}
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ padding: 2 }}>
              <Typography variant="h6">Total Leads Assigned</Typography>
              <Typography variant="h4">{dashboardData.totalLeadsAssigned}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ padding: 2 }}>
              <Typography variant="h6">Leads Assigned Today</Typography>
              <Typography variant="h4">{dashboardData.leadsAssignedToday}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ padding: 2 }}>
              <Typography variant="h6">Total Sales (INR)</Typography>
              <Typography variant="h4">
                ₹{dashboardData.totalSalesAmount.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ padding: 2 }}>
              <Typography variant="h6">Sales Today (INR)</Typography>
              <Typography variant="h4">
                ₹{dashboardData.salesTodayAmount.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ padding: 2 }}>
              <Typography variant="h6">Weekly Sales (INR)</Typography>
              <Typography variant="h4">
                ₹{dashboardData.weeklySalesAmount.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ padding: 2 }}>
              <Typography variant="h6">Monthly Sales (INR)</Typography>
              <Typography variant="h4">
                ₹{dashboardData.monthlySalesAmount.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ padding: 2 }}>
              <Typography variant="h6">Orders Created Today</Typography>
              <Typography variant="h4">{dashboardData.ordersToday}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ padding: 2 }}>
              <Typography variant="h6">Orders This Week</Typography>
              <Typography variant="h4">{dashboardData.ordersThisWeek}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ padding: 2 }}>
              <Typography variant="h6">Orders This Month</Typography>
              <Typography variant="h4">{dashboardData.ordersThisMonth}</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default SalesDashboard;
