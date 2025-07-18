import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Link,
  Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import axios from "axios";

const DeliveryStatusChecker = ({ onClose }) => {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const normalizeInput = (value) =>
    value
      .replace(/#/g, "")
      .replace(/^(\+91|91)/, "")
      .trim()
      .toLowerCase();

  const handleSearch = async () => {
    const normalized = normalizeInput(input);
    if (!normalized) return;

    setLoading(true);
    setResults([]);
    setNotFound(false);

    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/delivery/status", {
        params: { query: input },
      });

      if (response.data && response.data.length > 0) {
        setResults(response.data);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error("Error fetching delivery status:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard function
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => { 
    });
  };

  return (
    <Box sx={{ position: "relative", p: 2 }}>
      {/* Top-right Close Button */}
      {onClose && (
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            color: "#000",
          }}
        >
          <CloseIcon />
        </IconButton>
      )}

      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 2 }}>
        <LocalShippingIcon sx={{ fontSize: "1.6rem", color: "#000" }} />
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: "1.2rem",
            color: "#000",
          }}
        >
          Delivery Status
        </Typography>
        <Box
          sx={{
            height: 3,
            mt: 1,
            width: "90%",
            mx: "auto",
            backgroundColor: "#FFD700",
            borderRadius: "20px",
          }}
        />
      </Box>

      <Typography
        variant="body2"
        sx={{
          textAlign: "center",
          color: "#6a6868",
          fontSize: "14px",
          mb: 2,
          mx: 2,
        }}
      >
        Enter Order ID or Contact Number to check delivery status.
      </Typography>

      <TextField
        fullWidth
        placeholder="Enter Order ID or Contact Number"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        variant="outlined"
        inputProps={{
          maxLength: 30,
          style: {
            padding: "10px 12px",
            fontSize: "14px",
          },
        }}
        sx={{
          background: "#fafbfc",
          borderRadius: 2,
          mb: 2,
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "#ccc",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#000",
            },
            "&:hover fieldset": {
              borderColor: "#000",
            },
          },
        }}
      />

      <Button
        variant="contained"
        fullWidth
        onClick={handleSearch}
        disabled={loading}
        sx={{
          backgroundColor: "#000",
          color: "#fff",
          borderRadius: 2,
          py: 1,
          fontWeight: "bold",
          mb: 1.5,
          "&:hover": {
            backgroundColor: "#222", 
          },
        }}
      >
        {loading ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "CHECK"}
      </Button>

      {notFound && (
        <Typography sx={{ textAlign: "center", mt: 2, color: "red", fontWeight: 500 }}>
          No matching record found.
        </Typography>
      )}

      {results.length > 0 && (
        <List dense sx={{ mt: 2 }}>
          {results.map((item, idx) => (
            <React.Fragment key={idx}>
              <ListItem>
                {/* Order Date, Order ID, and Shipment Status in one row */}
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={4}>
                    {/* Order Date */}
                    <Typography sx={{ fontSize: "0.85rem", color: "#444" }}>
                      Order Date:{" "}
                      <span style={{ fontWeight: 600 }}>
                        {new Date(item.order_date).toLocaleDateString()}
                      </span>
                    </Typography>
                  </Grid>

                  <Grid item xs={4}>
                    {/* Order ID */}
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      Order ID:{" "}
                      <span style={{ color: "#000", fontWeight: 700 }}>
                        {item.order_id}
                      </span>
                    </Typography>
                  </Grid>

                  <Grid item xs={4}>
                    {/* Shipment Status */}
                    <Typography sx={{ fontSize: "0.85rem", color: "#444" }}>
                      Status:{" "}
                      <span style={{ fontWeight: 600 }}>
                        {item.shipment_status}
                      </span>
                    </Typography>
                  </Grid>
                </Grid>

                {/* Tracking Number with Link */}
                <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
                  {item.tracking_number && (
                    <>
                      <Link
                        href={`https://track.shipway.com/t/${item.tracking_number}`}
                        target="_blank"
                        sx={{
                          fontSize: "0.85rem",
                          color: "#000",
                          textDecoration: "none",
                          mr: 1,
                        }}
                      >
                        Track Here
                      </Link>
                      <IconButton
                        onClick={() => handleCopy(`https://track.shipway.com/t/${item.tracking_number}`)} 
                        sx={{
                          color: "#000",
                          fontSize: "1rem",
                        }}
                      >
                        <FileCopyIcon />
                      </IconButton>
                    </>
                  )}
                </Box>
              </ListItem>
              {idx < results.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default DeliveryStatusChecker;
