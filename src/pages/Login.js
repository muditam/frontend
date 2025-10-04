import React, { useState, useEffect } from "react";
import { Grid, Box, Typography, TextField, Button } from "@mui/material";
import { Typewriter } from "react-simple-typewriter";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";


import { useNavigate } from "react-router-dom";
import axios from "axios";


const LoginPage = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPassMessage, setForgotPassMessage] = useState(false);

  const navigate = useNavigate();

  const spinnerStyles = {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    display: "inline-block",
    borderTop: "3px solid #fff",
    borderRight: "3px solid transparent",
    boxSizing: "border-box",
    animation: "rotation 1s linear infinite",
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Using userId as email for login
      const response = await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/login", 
        { email: userId, password } 
      );
      if (response.status === 200) {
        sessionStorage.setItem("user", JSON.stringify(response.data.user)); 
        window.dispatchEvent(new Event("session:user:set")); 
        navigate("/");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false); // Set loading state to false once the request is done
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
          backgroundColor: "black",
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

        <div
          style={{
            color: "#fff",
            background: "#000",
            padding: "10px",
            whiteSpace: "pre-line",
            minHeight: "70px",
          }}
        >
          <Typewriter
            words={[
              `“Focus on solving the customer's problems,\nand sales will follow automatically.”`,
            ]}
            loop={false}
            cursor
            cursorStyle="|"
            typeSpeed={70}
            deleteSpeed={50}
            delaySpeed={1000}
          />
        </div>
      </Grid>


      {/* Right Section: Login Form */}
      <Grid
        item
        xs={12}
        md={6}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f7f7f7", // Light background for contrast
        }}
      >
        <Box
          sx={{
            width: "80%",
            maxWidth: 380,
            p: 4,
            borderRadius: 3,
            backgroundColor: "#fff",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.1)", // Soft shadow
          }}
        >
          <Typography
            variant="h5"
            sx={{
              mb: 1,
              fontWeight: "bold",
              textAlign: "center",
              color: "#333",
            }}
          >
            Sign In
          </Typography>


          <Box
            sx={{
              height: "2px",
              backgroundColor: "#FFC107",
              width: "100%",
              borderRadius: "2px",
              mb: 4,
            }}
          />

          {error && (
            <Typography color="error" sx={{ mb: 2, textAlign: "center" }}>
              {error}
            </Typography>
          )}
          <TextField
            label="User ID"
            variant="outlined"
            type="email"
            fullWidth
            sx={{
              mb: 2,
              "& .MuiInputLabel-root": {
                top: "50%",
                transform: "translateY(-50%)",
                transition: "all 0.2s ease-in-out",
                fontSize: "1rem",
                paddingLeft: "16px",
              },
              "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
                {
                  top: 0,
                  color: "black",
                  transform: "translateY(-50%) translateX(8px)",
                  paddingLeft: "8px",
                  fontSize: "0.75rem",
                },
              "& .MuiOutlinedInput-root": {
                "& input": {
                  padding: "8px !important",
                },
                "&.Mui-focused fieldset": { borderColor: "black" },
                "&:hover fieldset": { borderColor: "black" },
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
              "& .MuiInputLabel-root": {
                top: "50%",
                transform: "translateY(-50%)",
                transition: "all 0.2s ease-in-out",
                fontSize: "1rem",
                paddingLeft: "16px",
              },
              "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled":
                {
                  top: 0,
                  color: "black",
                  transform: "translateY(-50%) translateX(8px)",
                  paddingLeft: "8px",
                  fontSize: "0.75rem",
                },
              "& .MuiOutlinedInput-root": {
                "& input": {
                  padding: "8px !important",
                },
                "&.Mui-focused fieldset": { borderColor: "black" },
                "&:hover fieldset": {
                  borderColor: "black",
                },
              },
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            variant="contained"
            fullWidth
            sx={{
              mb: 2,
              bgcolor: "#333",
              color: "white",
              borderRadius: 2,
              textTransform: "none",
              fontSize: "1rem",
              "&:hover": { bgcolor: "#222" },
            }}
            onClick={handleLogin}
          >
            {loading ? <span style={spinnerStyles}></span> : "Sign In"}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            sx={{
              color: "#333",
              borderColor: "#333",
              borderRadius: 2,
              textTransform: "none",
              fontSize: "1rem",
              "&:hover": {
                borderColor: "#222",
                backgroundColor: "#f9f9f9",
              },
            }}
            onClick={() => setForgotPassMessage(true)}
          >
            Forgot Password
          </Button>
          {forgotPassMessage && (
            <Typography
              sx={{
                color: "red",
                fontSize: "0.9rem",
                marginTop: "6px",
                textAlign: "center", 
              }}
            >
              <ErrorOutlineIcon
                sx={{ color: "red", fontSize: "1rem", paddingRight: "2px" }}
              />
              Please contact the Tech Team!.
            </Typography>
          )}
        </Box>
      </Grid>
    </Grid>
  );
};

export default LoginPage;

