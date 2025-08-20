import React, { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Stack, CircularProgress, Alert, Button
} from "@mui/material";
import axios from "axios";

const currency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

const percent = (n) => `${(n || 0).toFixed(2)}%`;

const Section = ({ title, data }) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ background: "#e6eef6" }}>
          <TableCell sx={{ fontWeight: 700 }}>Order Status</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Count</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>(%)</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Order Amount</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Received Amount</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Balance Amount</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.rows.map((r) => (
          <TableRow key={r.label}>
            <TableCell>{r.label}</TableCell>
            <TableCell>{r.count}</TableCell>
            <TableCell>{percent(r.pct)}</TableCell>
            <TableCell>{currency(r.orderAmount)}</TableCell>
            <TableCell>{currency(r.receivedAmount)}</TableCell>
            <TableCell>{currency(r.balanceAmount)}</TableCell>
          </TableRow>
        ))}
        <TableRow sx={{ background: "#eef7ea" }}>
          <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>{data.totals.count || 0}</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>100.00%</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>{currency(data.totals.orderAmount || 0)}</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>{currency(data.totals.receivedAmount || 0)}</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>{currency(data.totals.balanceAmount || 0)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
    {typeof data.rtoRate === "number" && (
      <Typography sx={{ mt: 1, fontWeight: 700 }}>
        Total RTO % Rate {percent(data.rtoRate)}
      </Typography>
    )}
  </Paper>
);

const FinanceDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [prepaid, setPrepaid] = useState({ rows: [], totals: {}, rtoRate: 0 });
  const [cod, setCod] = useState({ rows: [], totals: {} });
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/finance/dashboard");
      setPrepaid(res.data.prepaid || { rows: [], totals: {}, rtoRate: 0 });
      setCod(res.data.cod || { rows: [], totals: {} });
    } catch (e) {
      console.error(e);
      setError("Failed to load dashboard. Check server logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Finance Dashboard</Typography>
        <Button
          variant="contained"
          onClick={load}
          sx={{ textTransform: "none", backgroundColor: "black" }}
        >
          Refresh
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          <Section title="Prepaid" data={prepaid} />
          <Section title="COD" data={cod} />
        </Stack>
      )}
    </Box>
  );
};

export default FinanceDashboard;
