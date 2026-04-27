import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Grid,
  Autocomplete,
} from "@mui/material";
import axios from "axios";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const Incentives = () => {
  const [agents, setAgents] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ----------------------------------
  // FETCH AGENTS
  // ----------------------------------
  useEffect(() => {
    const fetchAgents = async () => {
      const res = await axios.get(`${API_BASE}/api/employees`);
      setAgents(
        res.data.filter((e) =>
          ["Sales Agent", "Retention Agent"].includes(e.role)
        )
      );
    };
    fetchAgents();
  }, []);

  // ----------------------------------
  // FETCH INCENTIVES (MULTI AGENT)
  // ----------------------------------
  const fetchIncentives = async () => {
    if (!selectedAgents.length) return;

    setLoading(true);
    try {
      const allResults = [];

      for (const agent of selectedAgents) {
        const res = await axios.get(`${API_BASE}/api/incentives`, {
          params: {
            agentName: agent.fullName,
            startDate,
            endDate,
          },
        });

        const withAgent = (res.data || []).map((r) => ({
          ...r,
          agentName: agent.fullName,
        }));

        allResults.push(...withAgent);
      }

      setRows(allResults);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------
  // SUMMARY CALCULATIONS
  // ----------------------------------
  const summary = useMemo(() => {
    const base = {
      total: { amount: 0, count: 0 },
      delivered: { amount: 0, count: 0 },
      rto: { amount: 0, count: 0 },
      rtoDelivered: { amount: 0, count: 0 },
      others: { amount: 0, count: 0 },
    };

    rows.forEach((r) => {
      const amount = Number(r.amount || r.amountPaid || 0);
      const status = (r.deliveryStatus || "").toUpperCase();

      base.total.amount += amount;
      base.total.count += 1;

      const isDelivered = status.includes("DELIVERED");
      const isRTO = status.includes("RTO");

      if (isRTO && isDelivered) {
        base.rtoDelivered.amount += amount;
        base.rtoDelivered.count += 1;
      } else if (isRTO) {
        base.rto.amount += amount;
        base.rto.count += 1;
      } else if (isDelivered) {
        base.delivered.amount += amount;
        base.delivered.count += 1;
      } else {
        base.others.amount += amount;
        base.others.count += 1;
      }
    });

    return base;
  }, [rows]);

  // ----------------------------------
  // EXPORT TO CSV
  // ----------------------------------
  const exportToCSV = () => {
    if (!rows.length) return;

    const headers = [
      "Agent",
      "Date",
      "Name",
      "Order ID",
      "Phone",
      "Payment Mode",
      "Delivery Status",
      "Amount",
    ];

    const csvRows = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.agentName,
          r.date,
          r.name,
          r.orderId,
          r.phone,
          r.modeOfPayment,
          r.deliveryStatus,
          r.amount || r.amountPaid || 0,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "incentives.csv";
    a.click();

    window.URL.revokeObjectURL(url);
  };

  const renderCard = (label, obj) => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2">{label}</Typography>
      <Typography variant="h6">
        ₹ {obj.amount.toLocaleString()}{" "}
        <Typography component="span" variant="body2" color="text.secondary">
          ({obj.count})
        </Typography>
      </Typography>
    </Paper>
  );

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Incentive Calculation
      </Typography>

      {/* ================= FILTER BAR ================= */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Autocomplete
              multiple
              options={agents}
              getOptionLabel={(o) => `${o.fullName} (${o.role})`}
              value={selectedAgents}
              onChange={(_, v) => setSelectedAgents(v)}
              renderInput={(params) => (
                <TextField {...params} label="Select Experts" />
              )}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              type="date"
              label="From"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              type="date"
              label="To"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                onClick={fetchIncentives}
                disabled={!selectedAgents.length}
              >
                Fetch
              </Button>

              <Button
                variant="outlined"
                onClick={exportToCSV}
                disabled={!rows.length}
              >
                Export CSV
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* ================= SUMMARY ================= */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={2.4}>{renderCard("Total", summary.total)}</Grid>
        <Grid item xs={12} md={2.4}>{renderCard("Delivered", summary.delivered)}</Grid>
        <Grid item xs={12} md={2.4}>{renderCard("RTO", summary.rto)}</Grid>
        <Grid item xs={12} md={2.4}>{renderCard("RTO Delivered", summary.rtoDelivered)}</Grid>
        <Grid item xs={12} md={2.4}>{renderCard("Others", summary.others)}</Grid>
      </Grid>

      {/* ================= TABLE ================= */}
      <Paper>
        {loading ? (
          <Box p={3} textAlign="center">
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Expert</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Order ID</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Delivery</TableCell>
                <TableCell align="right">Amount (₹)</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell>{r.agentName}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.orderId}</TableCell>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell>{r.modeOfPayment}</TableCell>
                  <TableCell>{r.deliveryStatus || "—"}</TableCell>
                  <TableCell align="right">
                    ₹ {Number(r.amount || r.amountPaid || 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}

              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No data found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default Incentives;
