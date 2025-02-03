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
} from "@mui/material";
import axios from "axios";

const ManagerRetentionDashboard = () => {
  const [todaySummary, setTodaySummary] = useState({});
  const [agentMetrics, setAgentMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
  
      const todayDate = new Date().toISOString().split("T")[0];
  
      // Fetch retention agents
      const agentsResponse = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees", {
        params: { role: "Retention Agent" },
      });
      const retentionAgents = agentsResponse.data;
  
      // Early exit if no agents are found
      if (retentionAgents.length === 0) {
        setTodaySummary({
          totalActiveCustomers: 0,
          totalCustomersAssignedToday: 0,
          totalSalesDoneToday: 0,
          totalSalesAmount: 0,
          avgOrderValue: 0,
        });
        setAgentMetrics([]);
        setLoading(false);
        return;
      }
  
      let totalActiveCustomers = 0;
      let totalCustomersAssignedToday = 0;
      let totalSalesDoneToday = 0;
      let totalSalesAmount = 0;
  
      const agentData = await Promise.all(
        retentionAgents.map(async (agent) => {
          // Fetch leads for the agent
          const leadsResponse = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/retention");
          const agentLeads = leadsResponse.data.filter(
            (lead) => lead.healthExpertAssigned === agent.fullName
          );
  
          // Calculate "Customers Assigned Today" directly from leads API
          const customersAssignedToday = leadsResponse.data.filter(
            (lead) => lead.date === todayDate && lead.healthExpertAssigned === agent.fullName
          ).length;
  
          // Fetch sales for the agent
          const salesResponse = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales", {
            params: { orderCreatedBy: agent.fullName },
          });
          const sales = salesResponse.data;
  
          // Calculate metrics
          const activeCustomers = agentLeads.filter(
            (lead) => !lead.retentionStatus || lead.retentionStatus === "Active"
          ).length;
  
          const salesDone = sales.filter((sale) => sale.date === todayDate);
  
          const totalSales = salesDone.reduce((acc, sale) => acc + (sale.amountPaid || 0), 0);
  
          const avgOrderValue =
            salesDone.length > 0 ? totalSales / salesDone.length : 0;
  
          // Update overall metrics
          totalActiveCustomers += activeCustomers;
          totalCustomersAssignedToday += customersAssignedToday;
          totalSalesDoneToday += salesDone.length;
          totalSalesAmount += totalSales;
  
          return {
            agentName: agent.fullName,
            activeCustomers,
            customersAssignedToday,
            salesDone: salesDone.length,
            totalSales,
            avgOrderValue,
          };
        })
      );
  
      const avgOrderValue =
        totalSalesDoneToday > 0 ? totalSalesAmount / totalSalesDoneToday : 0;
  
      setTodaySummary({
        totalActiveCustomers,
        totalCustomersAssignedToday,
        totalSalesDoneToday,
        totalSalesAmount,
        avgOrderValue,
      });
  
      setAgentMetrics(agentData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };  

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
        Manager Retention Dashboard
      </Typography>

      {/* Today's Summary */}
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
            value: todaySummary.totalActiveCustomers,
          },
          {
            label: "Customers Assigned Today",
            value: todaySummary.totalCustomersAssignedToday,
          },
          { label: "Sales Done", value: todaySummary.totalSalesDoneToday },
          {
            label: "Total Sales",
            value: `₹${todaySummary.totalSalesAmount?.toFixed(2)}`,
          },
          {
            label: "Average Order Value",
            value: `₹${todaySummary.avgOrderValue?.toFixed(2)}`,
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
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{ fontWeight: "bold" }}
            >
              {label}
            </Typography>
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold" }}
            >
              {value}
            </Typography> 
          </Paper>
        ))}
      </Grid>

      {/* Agent Metrics */}
      <Typography variant="h5" gutterBottom sx={{ mt: 5, fontWeight: "bold" }}>
        Agent Metrics
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Agent Name</TableCell>
              <TableCell>Active Customers</TableCell>
              <TableCell>Customers Assigned Today</TableCell>
              <TableCell>Sales Done</TableCell>
              <TableCell>Total Sales</TableCell>
              <TableCell>Average Order Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agentMetrics.map((agent) => (
              <TableRow key={agent.agentName}>
                <TableCell>{agent.agentName}</TableCell>
                <TableCell>{agent.activeCustomers}</TableCell>
                <TableCell>{agent.customersAssignedToday}</TableCell>
                <TableCell>{agent.salesDone}</TableCell>
                <TableCell>₹{agent.totalSales.toFixed(2)}</TableCell>
                <TableCell>₹{agent.avgOrderValue.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ManagerRetentionDashboard;
