import React from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { styled } from "@mui/system";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DashboardIcon from "@mui/icons-material/Dashboard"; 

const StyledBox = styled(Box)({
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center", 
  backgroundSize: "cover",
  backgroundPosition: "center",
});

const StyledPaper = styled(Paper)({
  maxWidth: "500px",
  padding: "30px",
  textAlign: "center",
  boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.2)",
  backgroundColor: "rgba(255, 255, 255, 0.9)",
  borderRadius: "20px",
});

const MasterRetentionDashboard = () => {
  return (
    <StyledBox>
      <StyledPaper>
        <DashboardIcon sx={{ fontSize: 50, color: "#4CAF50", mb: 2 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Retention Dashboard for Managers
        </Typography>
        <AccessTimeIcon
          sx={{
            fontSize: 100,
            color: "#FF9800",
            animation: "pulse 1.5s infinite",
          }}
        />
        <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>
          Coming Soon!
        </Typography>
        <Typography variant="body1" sx={{ mt: 2, color: "#757575" }}>
          We’re working hard to build an insightful and feature-rich retention
          dashboard for managers. Stay tuned!
        </Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{
            mt: 3,
            borderRadius: "20px",
            textTransform: "none",
            fontWeight: "bold",
          }}
        >
          Notify Me
        </Button>
      </StyledPaper>
    </StyledBox>
  );
};

export default MasterRetentionDashboard;
