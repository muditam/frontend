import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";

const InfoCard = ({ title, value, icon }) => (
  <Paper
    elevation={3}
    sx={{
      p: 2,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 2,
    }}
  >
    <Box>
      <Typography variant="subtitle2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h6" fontWeight={600}>
        {value}
      </Typography>
    </Box>
    {icon}
  </Paper>
);

const FinanceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    gatewayTransactions: 0,
    totalRTOs: 0,
  });

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setSummary({
        totalRevenue: 125000,
        totalOrders: 320,
        gatewayTransactions: 980,
        totalRTOs: 12,
      });
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Finance Dashboard
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            <InfoCard
              title="Total Revenue"
              value={`₹${summary.totalRevenue.toLocaleString()}`}
              icon={<AccountBalanceIcon color="primary" fontSize="large" />}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <InfoCard
              title="Total Orders"
              value={summary.totalOrders}
              icon={<ListAltIcon color="secondary" fontSize="large" />}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <InfoCard
              title="Gateway Txns"
              value={summary.gatewayTransactions}
              icon={<ReceiptIcon color="success" fontSize="large" />}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <InfoCard
              title="RTO Orders"
              value={summary.totalRTOs}
              icon={<AssignmentReturnIcon color="error" fontSize="large" />}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default FinanceDashboard;
