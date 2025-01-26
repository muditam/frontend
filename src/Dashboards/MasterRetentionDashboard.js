import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

const RetentionAgentDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState({});
  const [followupStats, setFollowupStats] = useState({});

  useEffect(() => {
    const loggedInUser = JSON.parse(sessionStorage.getItem("user"));
    if (loggedInUser?.role === "Retention Agent") {
      setUser(loggedInUser);
      fetchDashboardData(loggedInUser.fullName, loggedInUser.email);
    }
  }, []);

  const fetchDashboardData = async (fullName, email) => {
    try {
      setLoading(true);

      // Fetch data from `api/leads/retention`
      const retentionResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retention",
        { params: { fullName, email } }
      );
      const retentionLeads = retentionResponse.data || [];

      // Fetch data from `api/retention-sales`
      const salesResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales",
        { params: { orderCreatedBy: fullName } }
      );
      const retentionSales = salesResponse.data || [];

      const todayDate = new Date().toISOString().split("T")[0];
      const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // "Today" Section
      const activeCustomers = retentionLeads.filter(
        (lead) => lead.retentionStatus !== "Lost"
      ).length;
      const customersAssignedToday = retentionLeads.filter(
        (lead) => lead.date === todayDate
      ).length;
      const salesDone = retentionSales.filter(
        (sale) => sale.date === todayDate
      );
      const totalSales = salesDone.reduce(
        (acc, sale) => acc + (sale.amountPaid || 0),
        0
      );
      const avgOrderValue =
        salesDone.length > 0 ? (totalSales / salesDone.length).toFixed(2) : 0;

      setTodayStats({
        activeCustomers,
        customersAssignedToday,
        salesDone: salesDone.length,
        totalSales,
        avgOrderValue,
      });

      // "Followup" Section
      const noFollowupSet = retentionLeads.filter(
        (lead) => !lead.nextFollowup
      ).length;
      const followupMissed = retentionLeads.filter(
        (lead) => lead.nextFollowup && lead.nextFollowup < todayDate
      ).length;
      const followupToday = retentionLeads.filter(
        (lead) => lead.nextFollowup === todayDate
      ).length;
      const followupTomorrow = retentionLeads.filter(
        (lead) => lead.nextFollowup === tomorrowDate
      ).length;
      const followupLater = retentionLeads.filter(
        (lead) => lead.nextFollowup > tomorrowDate
      ).length;

      setFollowupStats({
        noFollowupSet,
        followupMissed,
        followupToday,
        followupTomorrow,
        followupLater,
      });
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
        {user?.fullName} - Retention Dashboard
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
          {[{
            label: "Active Customers",
            value: todayStats.activeCustomers,
          },
          {
            label: "Customers Assigned Today",
            value: todayStats.customersAssignedToday,
          },
          {
            label: "Sales Done",
            value: todayStats.salesDone,
          },
          {
            label: "Total Sales",
            value: `₹${todayStats.totalSales}`,
          },
          {
            label: "Average Order Value",
            value: `₹${todayStats.avgOrderValue}`,
          }].map(({ label, value }) => (
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
          {[{
            label: "No Followup Set",
            value: followupStats.noFollowupSet,
          },
          {
            label: "Followup Missed",
            value: followupStats.followupMissed,
          },
          {
            label: "Followup Today",
            value: followupStats.followupToday,
          },
          {
            label: "Followup Tomorrow",
            value: followupStats.followupTomorrow,
          },
          {
            label: "Followup Later",
            value: followupStats.followupLater,
          }].map(({ label, value }) => (
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
    </Box>
  );
};

export default RetentionAgentDashboard;
