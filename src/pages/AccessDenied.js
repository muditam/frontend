import React from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useNavigate } from "react-router-dom";

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "75vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 520,
          p: { xs: 3, sm: 5 },
          textAlign: "center",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 56, color: "error.main", mb: 2 }} />
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Access denied
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          You do not have permission to access this page. Ask an admin for
          permission.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/", { replace: true })}>
          Go to dashboard
        </Button>
      </Paper>
    </Box>
  );
}
