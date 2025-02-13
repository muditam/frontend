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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  Button,
} from "@mui/material";
import axios from "axios";

const ManagerSalesDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState([]);
  const [followupStats, setFollowupStats] = useState([]);
  const [leadSourceData, setLeadSourceData] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("All Agents");
  const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });
  const [salesSummary, setSalesSummary] = useState({
    openLeads: 0,
    leadsAssignedToday: 0,
    salesDone: 0,
    conversionRate: 0,
    totalSales: 0,
    avgOrderValue: 0,
  });

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
    if (loggedInUser?.role === "Manager") {
      setUser(loggedInUser);
      fetchDashboardData(loggedInUser.fullName);
      fetchAgents();
    }
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees", {
        params: { role: "Sales Agent" },
      });
      const agentList = response.data.map((agent) => agent.fullName);
      setAgents(["All Agents", ...agentList]);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const fetchDashboardData = async (managerName) => {
    try {
      setLoading(true);

      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
        { params: { limit: 0 } } // Fetch all leads
      );

      const leads = response.data.leads || [];
      const todayDate = new Date().toISOString().split("T")[0];
      const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // "Today" Section Data
      const agents = [...new Set(leads.map((lead) => lead.agentAssigned))];
      const todayData = agents.map((agent) => {
        const agentLeads = leads.filter((lead) => lead.agentAssigned === agent);

        const openLeads = agentLeads.filter(
          (lead) => lead.salesStatus === "On Follow Up"
        ).length;
        const leadsAssignedToday = agentLeads.filter(
          (lead) => lead.date === todayDate
        ).length;
        const salesDoneToday = agentLeads.filter(
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

        return {
          agentName: agent,
          openLeads,
          leadsAssignedToday,
          salesDone: salesDoneToday.length,
          conversionRate,
          totalSales,
          avgOrderValue,
        };
      });
 
      setTodayStats(todayData);

      // "Followup" Section Data
      const followupData = agents.map((agent) => {
        const agentLeads = leads.filter((lead) => lead.agentAssigned === agent);

        const noFollowupSet = agentLeads.filter((lead) => !lead.nextFollowup)
          .length;
        const followupMissed = agentLeads.filter(
          (lead) => lead.nextFollowup && lead.nextFollowup < todayDate
        ).length;
        const followupToday = agentLeads.filter(
          (lead) => lead.nextFollowup === todayDate
        ).length;
        const followupTomorrow = agentLeads.filter(
          (lead) => lead.nextFollowup === tomorrowDate
        ).length;
        const followupLater = agentLeads.filter(
          (lead) => lead.nextFollowup > tomorrowDate
        ).length;

        return {
          agentName: agent, 
          noFollowupSet,
          followupMissed,
          followupToday,
          followupTomorrow,
          followupLater,
        };
      });

      setFollowupStats(followupData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadSourceData = async () => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
        { params: { limit: 0 } }
      );
  
      const leads = response.data.leads || [];
      const filteredLeads =
        selectedAgent === "All Agents"
          ? leads
          : leads.filter((lead) => lead.agentAssigned === selectedAgent);
   
      const filteredByDate = filteredLeads.filter((lead) => {
        const leadDate = lead.date;  
        return (
          (!dateFilter.startDate || leadDate >= dateFilter.startDate) &&
          (!dateFilter.endDate || leadDate <= dateFilter.endDate)
        );
      });
  
      const summary = leadSources.map((source) => {
        const leadsBySource = filteredByDate.filter(
          (lead) => lead.leadSource === source
        );
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
  
      setLeadSourceData(summary);
    } catch (error) {
      console.error("Error fetching lead source data:", error);
    }
  };

  const fetchSalesSummary = async () => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads",
        { params: { limit: 0 } }  
      );

      const leads = response.data.leads || [];
      const todayDate = new Date().toISOString().split("T")[0];
 
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

      setSalesSummary({
        openLeads,
        leadsAssignedToday,
        salesDone: salesDoneToday.length,
        conversionRate,
        totalSales,
        avgOrderValue,
      });
    } catch (error) {
      console.error("Error fetching sales summary:", error);
    }
  };

  useEffect(() => {
    if (agents.length > 0) { 
      const today = new Date().toISOString().split("T")[0];
      setDateFilter({ startDate: today, endDate: today });
      fetchLeadSourceData();
      fetchSalesSummary();
    }
  }, [agents]);
  
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
        {user?.fullName} - Sales Team Dashboard
      </Typography>

<Paper
      sx={{
        padding: 2,
        marginTop: 3,
        backgroundColor: "#E8F5E9",
      }}
    >
      <Typography variant="h5" gutterBottom>
        Sales Summary - Today
      </Typography>
      <Grid container spacing={3}>
        {[{
          label: "Open Leads",
          value: salesSummary.openLeads,
        },
        {
          label: "Leads Assigned Today",
          value: salesSummary.leadsAssignedToday,
        },
        {
          label: "Sales Done",
          value: salesSummary.salesDone,
        },
        {
          label: "Conversion Rate",
          value: `${salesSummary.conversionRate}%`,
        },
        {
          label: "Total Sales",
          value: `₹${salesSummary.totalSales}`,
        },
        {
          label: "Average Order Value",
          value: `₹${salesSummary.avgOrderValue}`,
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
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Agent Name</TableCell>
                <TableCell>Open Leads</TableCell>
                <TableCell>Leads Assigned Today</TableCell>
                <TableCell>Sales Done</TableCell>
                <TableCell>Conversion Rate</TableCell>
                <TableCell>Total Sales</TableCell>
                <TableCell>Average Order Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {todayStats.map((row) => (
                <TableRow key={row.agentName}>
                  <TableCell>{row.agentName}</TableCell>
                  <TableCell>{row.openLeads}</TableCell>
                  <TableCell>{row.leadsAssignedToday}</TableCell>
                  <TableCell>{row.salesDone}</TableCell>
                  <TableCell>{`${row.conversionRate}%`}</TableCell>
                  <TableCell>{`₹${row.totalSales}`}</TableCell>
                  <TableCell>{`₹${row.avgOrderValue}`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Followup Summary Section */}
<Paper
  sx={{
    padding: 3,
    marginTop: 3,
    backgroundColor: "#E0F7FA",
    borderRadius: 2,
  }}
>
  <Typography variant="h5" gutterBottom>
    Followup Summary
  </Typography>
  <Grid container spacing={3}>
    {[
      {
        label: "No Followup Set",
        value: followupStats.reduce((sum, stat) => sum + stat.noFollowupSet, 0), 
      },
      {
        label: "Followup Missed",
        value: followupStats.reduce((sum, stat) => sum + stat.followupMissed, 0), 
      },
      {
        label: "Followup Today",
        value: followupStats.reduce((sum, stat) => sum + stat.followupToday, 0), 
      },
      {
        label: "Followup Tomorrow",
        value: followupStats.reduce((sum, stat) => sum + stat.followupTomorrow, 0), 
      },
      {
        label: "Followup Later",
        value: followupStats.reduce((sum, stat) => sum + stat.followupLater, 0), 
      },
    ].map(({ label, value, color }) => (
      <Grid item xs={12} sm={6} md={4} key={label}>
        <Paper
          sx={{
            padding: 2,
            textAlign: "center",
            backgroundColor: color,
            borderRadius: 2,
          }}
          elevation={3}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
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
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Agent Name</TableCell>
                <TableCell>No Followup Set</TableCell>
                <TableCell>Followup Missed</TableCell>
                <TableCell>Followup Today</TableCell>
                <TableCell>Followup Tomorrow</TableCell>
                <TableCell>Followup Later</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {followupStats.map((row) => (
                <TableRow key={row.agentName}>
                  <TableCell>{row.agentName}</TableCell>
                  <TableCell>{row.noFollowupSet}</TableCell>
                  <TableCell>{row.followupMissed}</TableCell>
                  <TableCell>{row.followupToday}</TableCell>
                  <TableCell>{row.followupTomorrow}</TableCell>
                  <TableCell>{row.followupLater}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

              {/* Lead Source Summary Section */}
              <Paper
          sx={{
            padding: 2,
            marginTop: 3,
            backgroundColor: "#E5E5E5",
          }}
        >
          <Typography variant="h5" gutterBottom>
            Lead Source Summary
          </Typography>
          <Box sx={{ display: "flex", gap: 2, marginBottom: 2 }}>
            <FormControl sx={{ width: "30%" }}>
              <InputLabel shrink>Agent Filter</InputLabel>
              <Select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                defaultValue="All Agents"
              >
                {agents.map((agent) => (
                  <MenuItem key={agent} value={agent}>
                    {agent}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
              onClick={fetchLeadSourceData}
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
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

                {/* Section 4: Agent Performance Summary */}
                <Paper
          sx={{
            padding: 2,
            marginTop: 3,
            backgroundColor: "#FFE5E5",
          }}
        >
          <Typography variant="h5" gutterBottom>
            Section 4: Agent Performance Summary
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            All time
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#F4CCCC" }}>
                  <TableCell><Typography fontWeight="bold">Agent Name</Typography></TableCell>
                  <TableCell><Typography fontWeight="bold">Total Leads</Typography></TableCell>
                  <TableCell><Typography fontWeight="bold">Sales Done</Typography></TableCell>
                  <TableCell><Typography fontWeight="bold">Conversion Rate</Typography></TableCell>
                  <TableCell><Typography fontWeight="bold">Total Sales</Typography></TableCell>
                  <TableCell><Typography fontWeight="bold">Average Order Value</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Total Row */}
                <TableRow sx={{ backgroundColor: "#F4CCCC" }}>
                  <TableCell><Typography fontWeight="bold">Total of all</Typography></TableCell>
                  <TableCell>{todayStats.reduce((sum, row) => sum + row.totalLeads, 0)}</TableCell>
                  <TableCell>{todayStats.reduce((sum, row) => sum + row.salesDone, 0)}</TableCell>
                  <TableCell>
                    {todayStats.reduce((sum, row) => sum + (row.salesDone / row.totalLeads || 0), 0) > 0
                      ? (
                          (todayStats.reduce((sum, row) => sum + row.salesDone, 0) /
                            todayStats.reduce((sum, row) => sum + row.totalLeads, 0)) *
                          100
                        ).toFixed(2)
                      : 0}
                    %
                  </TableCell>
                  <TableCell>
                    ₹{todayStats.reduce((sum, row) => sum + row.totalSales, 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    ₹{
                      todayStats.reduce((sum, row) => sum + row.totalSales, 0) > 0
                        ? (
                            todayStats.reduce((sum, row) => sum + row.totalSales, 0) /
                            todayStats.reduce((sum, row) => sum + row.salesDone, 0)
                          ).toFixed(2)
                        : 0
                    }
                  </TableCell>
                </TableRow>

                {/* Agent Rows */}
                {todayStats.map((row) => (
                  <TableRow key={row.agentName}>
                    <TableCell>{row.agentName}</TableCell>
                    <TableCell>{row.totalLeads}</TableCell>
                    <TableCell>{row.salesDone}</TableCell>
                    <TableCell>{`${((row.salesDone / row.totalLeads) * 100).toFixed(2)}%`}</TableCell>
                    <TableCell>{`₹${row.totalSales.toFixed(2)}`}</TableCell>
                    <TableCell>{
                      row.salesDone > 0
                        ? `₹${(row.totalSales / row.salesDone).toFixed(2)}`
                        : "₹0"
                    }</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

    </Box>
  );
};

export default ManagerSalesDashboard;
