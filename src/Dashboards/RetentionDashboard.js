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
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [todayMetrics, setTodayMetrics] = useState({});
  const [followupMetrics, setFollowupMetrics] = useState({});
  const [applyingFilter, setApplyingFilter] = useState(false);
  const [allTimeMetrics, setAllTimeMetrics] = useState({});
  const [deliverySummary, setDeliverySummary] = useState([]);
  const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });


  const user = JSON.parse(sessionStorage.getItem("user"));


  const handleBoxClick = (filterType) => {
    const clickableBoxes = [
      "Active Customers",
      "Lost Customers",
      "Sales Done",
      "Followup Today",
      "No Followup Set",
      "Followup Tomorrow",
      "Followup Later",
      "Followup Missed",
    ];
    if (clickableBoxes.includes(filterType)) {
      window.open(`/retention/${filterType}`, "_blank");
    }
  };


  const fetchDashboardData = async (
    retentionAgentName,
    retentionAgentEmail
  ) => {
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


      const filteredLeads = retentionLeads.filter(
        (lead) => lead.healthExpertAssigned === retentionAgentName
      );
      setLeads(filteredLeads);


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
        salesDoneToday.length > 0 ? totalSales / salesDoneToday.length : 0;


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
        (lead) => lead.healthExpertAssigned === retentionAgentName
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
    if (user.fullName && user.email) {
      fetchDashboardData(user.fullName, user.email);
      fetchDeliverySummary(user.fullName);
    }
  }, [user.fullName, user.email]);


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
    <Box
      sx={{
        padding: { xs: 2, sm: 3, md: 4 },
        // marginTop: 2,
        width: { xs: "90%", sm: "85%", md: "85%", lg: "90%" },
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: "bold",
          color: "#388E3C",
          textAlign: "center",
          marginBottom: 3,
          letterSpacing: 1.5,
          fontSize: { xs: "1.8rem", sm: "2rem", md: "2.2rem" },
          borderRadius: "0 0 5px 5px",
          position: "sticky",
          top: 66.5,
          zIndex: 1000,
          backgroundColor: "#ffffff",
          padding: "1px 0",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        }}
      >
        {user?.fullName} - Retention Agent Dashboard
      </Typography>


      {/* Today Section */}
      <Paper
        sx={{
          padding: 3,
          marginBottom: 3,
          borderRadius: "8px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            color: "#1565C0",
            marginBottom: 2,
          }}
        >
          Today
        </Typography>
        <Grid
          container
          spacing={2}
          sx={{
            justifyContent: { xs: "center", md: "flex-start" },
          }}
        >
          {[
            {
              label: "Active Customers",
              value: todayMetrics.activeCustomers || 0,
            },
            {
              label: "Customers Assigned",
              value: todayMetrics.customersAssignedToday || 0,
            },
            {
              label: "Sales Done Today",
              value: todayMetrics.salesDone || 0,
            },
            {
              label: "Total Sales",
              value: `₹${(todayMetrics.totalSales || 0).toFixed(2)}`,
            },
            {
              label: "Average Order Value",
              value: `₹${(todayMetrics.avgOrderValue || 0).toFixed(2)}`,
            },
          ].map(({ label, value }) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={2.4}
              key={label}
              sx={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Paper
                sx={{
                  width: "100%",
                  maxWidth: "250px", // Increased width for a rectangular look
                  height: "90px", // Reduced height slightly
                  padding: 2,
                  textAlign: "center",
                  borderRadius: "2px",
                  border: "1px solid #1565C0",
                  backgroundColor: "#E1F5FE",
                  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  transition: "transform 0.2s",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.15)",
                  },
                }}
                onClick={() => handleBoxClick(label)}
              >
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{
                    fontWeight: "500",
                    color: "#0288D1",
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#01579B",
                  }}
                >
                  {value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>


      {/* Follow-Up Section */}
      <Paper
        sx={{
          padding: 3,
          borderRadius: "8px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
          marginBottom: 3,
        }}
      >
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            color: "#00695C", // Deep Teal heading color
            marginBottom: 2,
          }}
        >
          Follow-Up
        </Typography>
        <Grid
          container
          spacing={2}
          sx={{
            justifyContent: { xs: "center", md: "flex-start" },
          }}
        >
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
            {
              label: "Followup Tomorrow",
              value: followupMetrics.followupTomorrow,
            },
            { label: "Followup Later", value: followupMetrics.followupLater },
          ].map(({ label, value, showIcon }) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={2.4}
              key={label}
              sx={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Paper
                sx={{
                  width: "100%",
                  maxWidth: "250px",
                  height: "90px",
                  padding: 3,
                  textAlign: "center",
                  borderRadius: "2px",
                  border: "1px solid #00695C", // Deep Teal border
                  backgroundColor: "#E0F2F1", // Light Teal background
                  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  transition: "transform 0.2s",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.15)",
                  },
                }}
                onClick={() => handleBoxClick(label)}
              >
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{
                    fontWeight: "500",
                    color: "#00897B", // Muted Teal label color
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#004D40", // Dark Teal value color
                  }}
                >
                  {value}
                </Typography>
                {showIcon && (
                  <BlinkingIcon
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      color: "#00BFA5", // Bright Cyan for blinking icon
                    }}
                  />
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>


      {/* All Time Section */}
      <Paper
        sx={{
          padding: 3,
          marginTop: 3,
          borderRadius: "8px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            color: "#388E3C", // Green accent color for heading
            marginBottom: 2,
          }}
        >
          All Time
        </Typography>


        <Grid
          container
          spacing={2} // Reduce spacing for large and extra-large screens
          sx={{
            justifyContent: { xs: "center", md: "flex-start" },
          }}
        >
          {[
            {
              label: "Total Customers",
              value: allTimeMetrics.totalCustomers || 0,
            },
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
            {
              label: "Lost Customers",
              value: allTimeMetrics.lostCustomers || 0,
            },
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
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={3} // Four tiles in a row for large screens
              key={label}
              sx={{
                display: "flex",
                justifyContent: "center", // Center tiles horizontally
              }}
            >
              <Paper
                sx={{
                  width: "100%", // Full width of the grid item
                  maxWidth: "350px", // Restrict max width for uniformity
                  height: "90px", // Ensure equal height for all tiles
                  padding: 3,
                  textAlign: "center",
                  borderRadius: "2px",
                  border: "1px solid #388E3C", // Green border
                  backgroundColor: "#F1F8E9", // Light pistachio green
                  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center", // Center content vertically
                  transition: "transform 0.2s",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.15)",
                  },
                }}
                onClick={() => handleBoxClick(label)}
              >
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ fontWeight: "500", color: "#2E7D32" }}
                >
                  {label}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", color: "#388E3C" }}
                >
                  {value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>


      {/* Delivery Status Section */}
      <Paper
        sx={{
          padding: { xs: 2, sm: 3, md: 4 }, // Adjust padding for different screen sizes
          marginTop: 3,
          borderRadius: "8px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
          width: "100%", // Set width to 100% to allow responsiveness
          maxWidth: "1200px", // Optional max-width for larger screens
          marginLeft: "auto", // Center horizontally
          marginRight: "auto",
        }}
      >
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            color: "#4F4F4F", // Dark gray accent color for heading
            marginBottom: 2,
          }}
        >
          Order Delivery Status
        </Typography>


        {/* Date Range Filter */}
          
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
            sx={{ backgroundColor: "#6D6D6D" }}
          >
            Apply Filters
          </Button>
        </Box>


        {/* Loading Indicator */}
        {applyingFilter ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: "10px" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#6D6D6D" }}>
                  {["Category", "Count", "Amount", "Percentage"].map(
                    (header) => (
                      <TableCell
                        key={header}
                        sx={{
                          backgroundColor: "#6D6D6D",
                          textAlign: "center",
                        }}
                      >
                        <Typography
                          fontWeight="bold"
                          sx={{ color: "#e8e8e8" }} // Light gray text
                        >
                          {header}
                        </Typography>
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {deliverySummary.map((row) => (
                  <TableRow
                    key={row.label}
                    sx={{
                      "&:nth-of-type(odd)": { backgroundColor: "#F5F5F5" }, // Subtle alternate row shading
                      "&:nth-of-type(even)": { backgroundColor: "#FFFFFF" },
                    }}
                  >
                    <TableCell sx={{ textAlign: "center" }}>
                      <Typography fontWeight="bold">{row.label}</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      {row.count}
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      {`₹${row.amount.toFixed(2)}`}
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      {`${row.percentage}%`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};


export default RetentionAgentDashboard;



