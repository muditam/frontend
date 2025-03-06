import React, { useState } from "react";
import {
  Grid,
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const LoginPage = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Using userId as email for login
      const response = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/login",
        { email: userId, password }
      );
      if (response.status === 200) {
        sessionStorage.setItem("user", JSON.stringify(response.data.user));
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    }
  };

  return (
    <Grid container sx={{ minHeight: "90vh" }}>
      {/* Left Section: Logo + Tagline */}
      <Grid
        item
        xs={12}
        md={6}
        sx={{
          backgroundColor: "#0F427C",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          p: 3,
        }}
      >
        <Box
          component="img"
          src="https://cdn.shopify.com/s/files/1/0734/7155/7942/files/new_logo_orange_leaf_1_4e0e0f89-08a5-4264-9d2b-0cfe9535d553.png?v=1727508866"
          alt="Muditam Ayurveda Logo"
          sx={{ width: 200, mb: 3 }}
        /> 
        <Typography variant="subtitle1" sx={{ textAlign: "center" }}>
          "Focus on solving the customer's problems,<br /> and sales will follow automatically."
        </Typography>
      </Grid>

      {/* Right Section: Login Form */}
      <Grid
        item
        xs={12}
        md={6}
        sx={{
          backgroundColor: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Box
          sx={{
            width: "80%",
            maxWidth: 360,
            p: 4,
            boxShadow: 2,
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              mb: 2,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            <span style={{ color: "#6A1B9A", fontSize: "1.5rem" }}>🔒</span> Login
          </Typography>

          {error && (
            <Typography color="error" sx={{ mb: 2, textAlign: "center" }}>
              {error}
            </Typography>
          )}

          <TextField
            label="User ID"
            variant="outlined"
            fullWidth
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                "& input": {
                  padding: "13px",
                },
              },
            }} 
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />

          <TextField
            label="Password"
            variant="outlined"
            type="password"
            fullWidth
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                "& input": {
                  padding: "15px",
                },
              },
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mb: 2 }}
            onClick={handleLogin}
          >
            SIGN IN
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={() => setForgotOpen(true)}
          >
            FORGOT PASSWORD
          </Button>
        </Box>
      </Grid>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)}>
        <DialogTitle>Forgot Password</DialogTitle>
        <DialogContent>
          <Typography>Contact Tech Team</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default LoginPage;
