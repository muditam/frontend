import React, { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(true);
  const [todaySummary, setTodaySummary] = useState({
    activeCustomers: 0,
    customersAssignedToday: 0,
    salesDone: 0,
    totalSales: 0,
    targetDeficit: 0,
    averageOrderValue: 0,
  });
  const [agentData, setAgentData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const todayDate = new Date().toISOString().split("T")[0];

      // Fetch Leads
      const leadsResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads"
      );

      const leads = leadsResponse.data || [];

      // Fetch Retention Sales
      const salesResponse = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales"
      );

      const retentionSales = salesResponse.data || [];

      // Calculate Today's Summary
      const activeCustomers = leads.filter(
        (lead) =>
          (!lead.retentionStatus || lead.retentionStatus === "Active") &&
          lead.role === "Retention Agent"
      ).length;

      const customersAssignedToday = leads.filter(
        (lead) =>
          lead.role === "Retention Agent" && lead.date === todayDate
      ).length;

      const salesDoneToday = retentionSales.filter(
        (sale) => sale.date === todayDate
      );

      const totalSales = salesDoneToday.reduce(
        (acc, sale) => acc + (sale.amountPaid || 0),
        0
      );

      const averageOrderValue =
        salesDoneToday.length > 0
          ? (totalSales / salesDoneToday.length).toFixed(2)
          : 0;

      const targetDeficit = 100000 - totalSales; // Example target set to ₹100,000

      setTodaySummary({
        activeCustomers,
        customersAssignedToday,
        salesDone: salesDoneToday.length,
        totalSales,
        targetDeficit,
        averageOrderValue,
      });

      // Calculate Agent-Wise Data
      const agents = Array.from(
        new Set(leads.map((lead) => lead.healthExpertAssigned))
      ).filter(Boolean);

      const agentMetrics = agents.map((agentName) => {
        const agentLeads = leads.filter(
          (lead) => lead.healthExpertAssigned === agentName
        );

        const agentActiveCustomers = agentLeads.filter(
          (lead) =>
            !lead.retentionStatus || lead.retentionStatus === "Active"
        ).length;

        const agentCustomersAssignedToday = agentLeads.filter(
          (lead) => lead.date === todayDate
        ).length;

        const agentSalesDoneToday = retentionSales.filter(
          (sale) => sale.orderCreatedBy === agentName && sale.date === todayDate
        );

        const agentTotalSales = agentSalesDoneToday.reduce(
          (acc, sale) => acc + (sale.amountPaid || 0),
          0
        );

        const agentAverageOrderValue =
          agentSalesDoneToday.length > 0
            ? (agentTotalSales / agentSalesDoneToday.length).toFixed(2)
            : 0;

        return {
          agentName,
          activeCustomers: agentActiveCustomers,
          customersAssignedToday: agentCustomersAssignedToday,
          salesDone: agentSalesDoneToday.length,
          totalSales: agentTotalSales,
          averageOrderValue: agentAverageOrderValue,
          targetDeficit: 100000 - agentTotalSales, // Example target set to ₹100,000 per agent
        };
      });

      setAgentData(agentMetrics);
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
        Manager Retention Dashboard
      </Typography>

      {/* Today's Summary Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
        Today's Summary
      </Typography>
      <Grid container spacing={3}>
        {[
          { label: "Active Customers", value: todaySummary.activeCustomers },
          {
            label: "Customers Assigned Today",
            value: todaySummary.customersAssignedToday,
          },
          { label: "Sales Done", value: todaySummary.salesDone },
          { label: "Total Sales", value: `₹${todaySummary.totalSales}` },
          {
            label: "Target Deficit",
            value: `₹${todaySummary.targetDeficit}`,
          },
          {
            label: "Average Order Value",
            value: `₹${todaySummary.averageOrderValue}`,
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

      {/* Agent-Wise Table Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Agent Performance
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Agent Name</TableCell>
              <TableCell>Active Customers</TableCell>
              <TableCell>Customers Assigned Today</TableCell>
              <TableCell>Sales Done</TableCell>
              <TableCell>Total Sales</TableCell>
              <TableCell>Target Deficit</TableCell>
              <TableCell>Average Order Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agentData.map((agent) => (
              <TableRow key={agent.agentName}>
                <TableCell>{agent.agentName}</TableCell>
                <TableCell>{agent.activeCustomers}</TableCell>
                <TableCell>{agent.customersAssignedToday}</TableCell>
                <TableCell>{agent.salesDone}</TableCell>
                <TableCell>{`₹${agent.totalSales}`}</TableCell>
                <TableCell>{`₹${agent.targetDeficit}`}</TableCell>
                <TableCell>{`₹${agent.averageOrderValue}`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ManagerRetentionDashboard;
