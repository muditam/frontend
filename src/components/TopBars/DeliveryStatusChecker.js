import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Link,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import axios from "axios";

const CUT_OFF_DATE = new Date("2026-03-06T00:00:00");

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

  const isBeforeCutoff = (orderDate) => {
    if (!orderDate) return false;
    const parsedDate = new Date(orderDate);
    if (Number.isNaN(parsedDate.getTime())) return false;
    return parsedDate < CUT_OFF_DATE;
  };

  const getTrackingLink = (item) => {
    const trackingNumber = String(item?.tracking_number || "").trim();
    if (!trackingNumber) return "";

    if (isBeforeCutoff(item?.order_date)) {
      return `https://track.shipway.com/t/${encodeURIComponent(trackingNumber)}`;
    }

    // After 6 March 2026:
    // Delhivery => numeric and more than 13 digits
    if (/^\d+$/.test(trackingNumber) && trackingNumber.length > 13) {
      return `https://www.delhivery.com/track-v2/package/${encodeURIComponent(
        trackingNumber
      )}`;
    }

    // DTDC => alphanumeric pattern like 7X112735948
    if (/^[A-Za-z0-9]+$/.test(trackingNumber) && /[A-Za-z]/.test(trackingNumber)) {
      return `https://www.dtdc.com/track-your-shipment/?awb=${encodeURIComponent(
        trackingNumber
      )}`;
    }

    // Fallback => Blue Dart
    return `https://www.bluedart.com/web/guest/trackdartresultthirdparty?trackFor=0&&trackNo=${encodeURIComponent(
      trackingNumber
    )}`;
  };

  const handleSearch = async () => {
    const normalized = normalizeInput(input);
    if (!normalized) return;

    setLoading(true);
    setResults([]);
    setNotFound(false);

    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/delivery/status",
        {
          params: { query: input },
        }
      );

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

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const formatOrderDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const statusMeta = (status = "") => {
    const s = String(status).toLowerCase();
    if (s.includes("deliver")) {
      return { label: status, color: "#047857", dot: "#10b981" };
    }
    if (s.includes("rto") || s.includes("return") || s.includes("cancel")) {
      return { label: status, color: "#b91c1c", dot: "#ef4444" };
    }
    if (s.includes("transit") || s.includes("out for delivery")) {
      return { label: status, color: "#1d4ed8", dot: "#3b82f6" };
    }
    return { label: status || "Unknown", color: "#334155", dot: "#94a3b8" };
  };

  return (
    <Box sx={{ position: "relative", p: { xs: 1.5, sm: 2 } }}>
      {onClose && (
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "#64748b",
            border: "1px solid #e2e8f0",
            backgroundColor: "#fff",
            "&:hover": { backgroundColor: "#f8fafc", color: "#0f172a" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2, pr: 5 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "10px",
            display: "grid",
            placeItems: "center",
            bgcolor: "#0f172a",
            color: "#fff",
          }}
        >
          <LocalShippingIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box>
          <Typography
            sx={{
              fontSize: "1.02rem",
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.2,
            }}
          >
            Delivery Status Checker
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>
            Search by order ID or contact number
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 2,
          p: 1.2,
          backgroundColor: "#fff",
        }}
      >
        <TextField
          fullWidth
          placeholder="Enter order ID or contact number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          inputProps={{ maxLength: 30 }}
          sx={{
            mb: 1,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#f8fafc",
              borderRadius: 1.5,
              "& fieldset": { borderColor: "#d1d5db" },
              "&:hover fieldset": { borderColor: "#94a3b8" },
              "&.Mui-focused fieldset": { borderColor: "#0f172a" },
            },
          }}
        />

        <Button
          variant="contained"
          fullWidth
          onClick={handleSearch}
          disabled={loading}
          sx={{
            textTransform: "none",
            borderRadius: 1.5,
            py: 1,
            fontWeight: 700,
            fontSize: "0.9rem",
            backgroundColor: "#0f172a",
            "&:hover": { backgroundColor: "#111827" },
          }}
        >
          {loading ? (
            <CircularProgress size={18} sx={{ color: "#fff" }} />
          ) : (
            "Check Delivery"
          )}
        </Button>
      </Box>

      {notFound && (
        <Box
          sx={{
            mt: 1.5,
            borderRadius: 1.5,
            border: "1px solid #fecaca",
            backgroundColor: "#fff1f2",
            px: 1.2,
            py: 0.9,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.84rem",
              color: "#b91c1c",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            No matching record found.
          </Typography>
        </Box>
      )}

      {results.length > 0 && (
        <Box sx={{ mt: 1.5, display: "grid", gap: 1 }}>
          {results.map((item, idx) => {
            const trackingLink = getTrackingLink(item);
            const status = statusMeta(item.shipment_status);

            return (
              <Box
                key={idx}
                sx={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  backgroundColor: "#fff",
                  p: 1.2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.9,
                  }}
                >
                  <Typography
                    sx={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}
                  >
                    {item.order_id || "-"}
                  </Typography>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: status.dot,
                      }}
                    />
                    <Typography
                      sx={{ fontSize: "0.76rem", fontWeight: 700, color: status.color }}
                    >
                      {status.label}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 0.5,
                    mb: trackingLink ? 1 : 0,
                  }}
                >
                  <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Date:{" "}
                    <Box component="span" sx={{ color: "#0f172a", fontWeight: 700 }}>
                      {formatOrderDate(item.order_date)}
                    </Box>
                  </Typography>

                  <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Tracking:{" "}
                    <Box component="span" sx={{ color: "#0f172a", fontWeight: 700 }}>
                      {item.tracking_number || "-"}
                    </Box>
                  </Typography>
                </Box>

                {trackingLink && (
                  <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                    <Link
                      href={trackingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.45,
                        px: 0.9,
                        py: 0.45,
                        border: "1px solid #cbd5e1",
                        borderRadius: 1.5,
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        textDecoration: "none",
                        "&:hover": { backgroundColor: "#f8fafc" },
                      }}
                    >
                      Track <LaunchRoundedIcon sx={{ fontSize: 14 }} />
                    </Link>

                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleCopy(trackingLink)}
                      sx={{
                        textTransform: "none",
                        px: 0.9,
                        py: 0.35,
                        minWidth: "auto",
                        borderRadius: 1.5,
                        border: "1px solid #e2e8f0",
                        color: "#334155",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                      }}
                    >
                      <ContentCopyRoundedIcon sx={{ fontSize: 14, mr: 0.4 }} />
                      Copy
                    </Button>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default DeliveryStatusChecker;