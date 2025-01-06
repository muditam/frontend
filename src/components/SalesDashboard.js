import React, { useEffect, useState } from "react";
import { Box, Typography, Grid, Paper } from "@mui/material";
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

  const [userLoggedIn, setUserLoggedIn] = useState(false);

  useEffect(() => {
    const user = sessionStorage.getItem("user");
    if (user) {
      setUserLoggedIn(true);
      const fetchDashboardData = async () => {
        try {
          const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/sales/dashboard");
          setDashboardData(response.data);
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
        }
      };

      fetchDashboardData();
    }
  }, []);

  if (!userLoggedIn) {
    return (
      <Box sx={{ padding: 3, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Muditam<br></br> Ayurveda Sales Dashboard
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Sales Dashboard
      </Typography>
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
            <Typography variant="h4">₹{dashboardData.totalSalesAmount.toLocaleString()}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ padding: 2 }}>
            <Typography variant="h6">Sales Today (INR)</Typography>
            <Typography variant="h4">₹{dashboardData.salesTodayAmount.toLocaleString()}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ padding: 2 }}>
            <Typography variant="h6">Weekly Sales (INR)</Typography>
            <Typography variant="h4">₹{dashboardData.weeklySalesAmount.toLocaleString()}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ padding: 2 }}>
            <Typography variant="h6">Monthly Sales (INR)</Typography>
            <Typography variant="h4">₹{dashboardData.monthlySalesAmount.toLocaleString()}</Typography>
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
    </Box>
  );
};

export default SalesDashboard;
