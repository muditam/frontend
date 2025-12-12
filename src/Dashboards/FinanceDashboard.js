import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Grid,
} from "@mui/material";
import axios from "axios";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const currency = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);

const percent = (n) => `${(n || 0).toFixed(2)}%`;

const STATUS_COLORS = {
  Delivered: "#4caf50",
  "RTO Delivered": "#f44336",
  intransit: "#ff9800",
};

const Section = React.memo(({ title, data }) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
      {title}
    </Typography>
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
          <TableCell sx={{ fontWeight: 700 }}>
            {data.totals.count || 0}
          </TableCell>
          <TableCell sx={{ fontWeight: 700 }}>100.00%</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>
            {currency(data.totals.orderAmount || 0)}
          </TableCell>
          <TableCell sx={{ fontWeight: 700 }}>
            {currency(data.totals.receivedAmount || 0)}
          </TableCell>
          <TableCell sx={{ fontWeight: 700 }}>
            {currency(data.totals.balanceAmount || 0)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    {typeof data.rtoRate === "number" && (
      <Typography sx={{ mt: 1, fontWeight: 700 }}>
        Total RTO % Rate: {percent(data.rtoRate)}
      </Typography>
    )}
  </Paper>
));

const FinanceDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [prepaid, setPrepaid] = useState(null);
  const [cod, setCod] = useState(null);
  const [error, setError] = useState("");
  const [cached, setCached] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/finance/dashboard",
        {
          params: force ? { force: 1 } : {},
        }
      );

      setPrepaid(res.data.prepaid);
      setCod(res.data.cod);
      setCached(!!res.data.cached);
      setGeneratedAt(res.data.generatedAt || null);
    } catch (e) {
      console.error(e);
      setError("Failed to load dashboard. Check server logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const summaryCards = useMemo(() => {
    if (!prepaid || !cod) return null;

    const totalPrepaid = prepaid.totals;
    const totalCod = cod.totals;

    const totalOrderAmount =
      (totalPrepaid.orderAmount || 0) + (totalCod.orderAmount || 0);
    const totalReceived =
      (totalPrepaid.receivedAmount || 0) + (totalCod.receivedAmount || 0);
    const totalBalance =
      (totalPrepaid.balanceAmount || 0) + (totalCod.balanceAmount || 0);

    return [
      {
        label: "Prepaid Revenue",
        value: currency(totalPrepaid.receivedAmount || 0),
        sub: `${totalPrepaid.count || 0} orders`,
      },
      {
        label: "COD Revenue",
        value: currency(totalCod.receivedAmount || 0),
        sub: `${totalCod.count || 0} orders`,
      },
      {
        label: "Total Order Amount",
        value: currency(totalOrderAmount),
        sub: `Received: ${currency(totalReceived)}`,
      },
      {
        label: "Outstanding Balance",
        value: currency(totalBalance),
        sub: "Prepaid + COD combined",
      },
    ];
  }, [prepaid, cod]);

  const prepaidChartData = useMemo(() => {
    if (!prepaid) return [];
    return prepaid.rows.map((r) => ({
      status: r.label,
      Count: r.count,
      OrderAmount: r.orderAmount,
      ReceivedAmount: r.receivedAmount,
      BalanceAmount: r.balanceAmount,
    }));
  }, [prepaid]);

  const codChartData = useMemo(() => {
    if (!cod) return [];
    return cod.rows.map((r) => ({
      status: r.label,
      Count: r.count,
      OrderAmount: r.orderAmount,
      ReceivedAmount: r.receivedAmount,
      BalanceAmount: r.balanceAmount,
    }));
  }, [cod]);

  const prepaidPie = useMemo(() => {
    if (!prepaid) return [];
    return prepaid.rows.map((r) => ({
      name: r.label,
      value: r.count,
    }));
  }, [prepaid]);

  const codPie = useMemo(() => {
    if (!cod) return [];
    return cod.rows.map((r) => ({
      name: r.label,
      value: r.count,
    }));
  }, [cod]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Finance Dashboard
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
            {cached && (
              <Chip
                size="small"
                label="Cached"
                color="default"
                variant="outlined"
              />
            )}
            {generatedAt && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Last updated: {new Date(generatedAt).toLocaleString()}
              </Typography>
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => load(false)}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Soft Refresh
          </Button>
          <Button
            variant="contained"
            onClick={() => load(true)}
            disabled={loading}
            sx={{ textTransform: "none", backgroundColor: "black" }}
          >
            Hard Refresh
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (!prepaid || !cod) ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : prepaid && cod ? (
        <Stack spacing={3}>
          {/* Summary cards */}
          {summaryCards && (
            <Grid container spacing={2}>
              {summaryCards.map((card) => (
                <Grid item xs={12} sm={6} md={3} key={card.label}>
                  <Paper
                    sx={{
                      p: 2,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "text.secondary", mb: 0.5 }}
                    >
                      {card.label}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {card.value}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", mt: 0.5 }}
                    >
                      {card.sub}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Charts Row */}
          <Grid container spacing={2}>
            {/* Prepaid Bar Chart */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 320 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                  Prepaid – Status Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepaidChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <ReTooltip />
                    <Legend />
                    <Bar dataKey="Count" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* COD Bar Chart */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 320 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                  COD – Status Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={codChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <ReTooltip />
                    <Legend />
                    <Bar dataKey="Count" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Pie charts Row */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 320 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                  Prepaid – Status Mix
                </Typography>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepaidPie}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      {prepaidPie.map((entry, index) => (
                        <Cell
                          key={`cell-prepaid-${index}`}
                          fill={STATUS_COLORS[entry.name] || "#8884d8"}
                        />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 320 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                  COD – Status Mix
                </Typography>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={codPie}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      {codPie.map((entry, index) => (
                        <Cell
                          key={`cell-cod-${index}`}
                          fill={STATUS_COLORS[entry.name] || "#82ca9d"}
                        />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Detailed tables */}
          <Section title="Prepaid – Detailed" data={prepaid} />
          <Section title="COD – Detailed" data={cod} />
        </Stack>
      ) : null}
    </Box>
  );
};

export default FinanceDashboard;
