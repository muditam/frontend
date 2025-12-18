

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Select,
  MenuItem,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Skeleton,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  LinearProgress,
  Tabs,
  Tab
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";




const COMMON_COLORS = ['#2C5F6F', '#3A8F9F', '#5FB8A8', '#80CBC4'];
const PRIMARY_COLOR = '#2C5F6F';
const SECONDARY_COLOR = '#3A8F9F';
const SUCCESS_COLOR = '#5FB8A8';
const LIGHT_COLOR = '#80CBC4';
const DANGER_COLOR = '#F28B82';




const todayISO = () => new Date().toISOString().slice(0, 10);
const yesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};
const daysAgoISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};


const AbandonedAnalyticsPage = () => {
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [rangeType, setRangeType] = useState("Today");
  const [activeTab, setActiveTab] = useState(0);


  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openContacts, setOpenContacts] = useState(false);


  const fetchData = async (s = start, e = end) => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/abandoned-analytics/summary",
        { params: { start: s, end: e } }
      );
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load abandoned checkout analytics.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData(start, end);
  }, []);




  const handleRangeChange = (value) => {
    setRangeType(value);
    let s = start;
    let e = end;


    if (value === "Today") {
      s = todayISO(); e = todayISO();
    } else if (value === "Yesterday") {
      s = yesterdayISO(); e = yesterdayISO();
    } else if (value === "Last 7 Days") {
      s = daysAgoISO(6); e = todayISO();
    } else if (value === "Last 30 Days") {
      s = daysAgoISO(29); e = todayISO();
    }


    if (value !== "Custom Range") {
      setStart(s);
      setEnd(e);
      fetchData(s, e);
    }
  };


  const applyCustomRange = (s, e) => {
    setStart(s);
    setEnd(e);
    fetchData(s, e);
  };


  const totals = data?.totals ?? {
    totalAbands: 0,
    convertedAbands: 0,
    conversionRate: 0,
    convertedContacts: []
  };


  const daily = data?.daily || [];
  const agents = data?.agents || [];
  const convertedContacts = totals.convertedContacts || [];




  const totalConvertedFromAgents = agents.reduce(
    (sum, a) => sum + (a.convertedAbands || 0),
    0
  );




  const donutData = [
    { name: "Total Abandons", value: totals.totalAbands, color: PRIMARY_COLOR },
    { name: "Converted", value: totalConvertedFromAgents, color: SUCCESS_COLOR }
  ];


  const agentBarData = agents.map(a => ({
    name: a.fullName || "Unassigned",
    converted: a.convertedAbands || 0,
    total: a.totalAbands || 0,
    rate: parseFloat(a.conversionRate) || 0
  }));




  const SummaryCard = ({ label, value, sub, color = PRIMARY_COLOR, icon }) => (
    <Card sx={{
      flex: 1,
      borderRadius: 3,
      boxShadow: 3,
      background: '#FFFEF7',
      border: `2px solid ${color}40`,
      transition: 'transform 0.3s, box-shadow 0.3s',
      '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: 6,
        border: `2px solid ${color}60`
      }
    }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="start">
          <Box>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
              {label}
            </Typography>
            <Typography variant="h3" fontWeight={800} color={color} sx={{ mb: 1 }}>
              {loading ? <Skeleton width={80} /> : value}
            </Typography>
            {!loading && sub && (
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {sub}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box sx={{
              backgroundColor: `${color}25`,
              borderRadius: 3,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${color}30`
            }}>
              {icon}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );




  const OverviewTab = () => (
    <Box>
   
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <SummaryCard
            label="Total Abandons"
            value={totals.totalAbands}
            sub={`${start} → ${end}`}
            color={PRIMARY_COLOR}
            icon={<Typography fontSize={36}>🛍️</Typography>}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SummaryCard
            label="Converted"
            value={totalConvertedFromAgents}
            sub={totalConvertedFromAgents > 0 ? "From expert conversions" : "OrderId present"}
            color={SUCCESS_COLOR}
            icon={<Typography fontSize={36}>✅</Typography>}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SummaryCard
            label="Conversion Rate"
            value={`${totals.conversionRate}%`}
            sub="Converted / Total abandons"
            color={SECONDARY_COLOR}
            icon={<Typography fontSize={36}>📊</Typography>}
          />
        </Grid>
      </Grid>




      <Grid container spacing={3} mb={4}>
  
        <Grid item xs={12} md={6}>
          <Card sx={{
            borderRadius: 3,
            boxShadow: 3,
            height: '100%',
            border: `2px solid ${PRIMARY_COLOR}20`
          }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2} color={PRIMARY_COLOR}>
                🍩 Conversion Overview
              </Typography>
              {loading ? (
                <Skeleton variant="circular" width={250} height={250} sx={{ mx: 'auto' }} />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <Stack direction="row" spacing={3} justifyContent="center" mt={2}>
                    <Stack alignItems="center">
                      <Typography variant="h4" fontWeight={800} color={PRIMARY_COLOR}>
                        {totals.totalAbands}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Total Abandons
                      </Typography>
                    </Stack>
                    <Divider orientation="vertical" flexItem />
                    <Stack alignItems="center">
                      <Typography variant="h4" fontWeight={800} color={SUCCESS_COLOR}>
                        {totalConvertedFromAgents}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Converted
                      </Typography>
                    </Stack>
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>


        <Grid item xs={12} md={6}>
          <Card sx={{
            borderRadius: 3,
            boxShadow: 3,
            height: '100%',
            border: `2px solid ${PRIMARY_COLOR}20`
          }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2} color={PRIMARY_COLOR}>
                📊 Expert Performance
              </Typography>
              {loading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agentBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 11, fill: PRIMARY_COLOR }}
                    />
                    <YAxis tick={{ fill: PRIMARY_COLOR }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: `2px solid ${PRIMARY_COLOR}`,
                        boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="total"
                      fill={PRIMARY_COLOR}
                      name="Total Abandoned"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="converted"
                      fill={SUCCESS_COLOR}
                      name="Converted"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );




  const DetailedTableTab = () => (
    <Box>
      <Card sx={{ borderRadius: 3, boxShadow: 3, border: `2px solid ${PRIMARY_COLOR}20` }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2} color={PRIMARY_COLOR}>
            📋 Detailed Performance Table
          </Typography>
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: PRIMARY_COLOR }}>Expert</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: PRIMARY_COLOR }}>Email</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: PRIMARY_COLOR }}>Abandons</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: PRIMARY_COLOR }}>Converted</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: PRIMARY_COLOR }}>Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {agents.map((a, idx) => {
                  return (
                    <TableRow
                      key={a.expertId || a.fullName}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#f9fafb'
                        }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, color: '#1f2937' }}>
                        {a.fullName || "Unassigned"}
                      </TableCell>
                      <TableCell sx={{ color: '#4b5563', fontWeight: 500 }}>
                        {a.email || "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={a.totalAbands}
                          size="small"
                          sx={{
                            backgroundColor: `${PRIMARY_COLOR}20`,
                            color: PRIMARY_COLOR,
                            fontWeight: 700
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={a.convertedAbands}
                          size="small"
                          sx={{
                            backgroundColor: `${SUCCESS_COLOR}20`,
                            color: SUCCESS_COLOR,
                            fontWeight: 700
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${a.conversionRate}%`}
                          size="small"
                          sx={{
                            backgroundColor: parseFloat(a.conversionRate) > 50
                              ? `${SUCCESS_COLOR}30`
                              : `${SECONDARY_COLOR}30`,
                            color: parseFloat(a.conversionRate) > 50 ? SUCCESS_COLOR : SECONDARY_COLOR,
                            fontWeight: 800
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );


  return (
    <Box sx={{ p: 3, backgroundColor: '#FFFEF7', minHeight: '100vh' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} color={PRIMARY_COLOR} sx={{ letterSpacing: '-0.5px' }}>
            🛒 Abandoned Checkout Analytics
          </Typography>
   
        </Box>
      </Stack>


      {/* DATE FILTER */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2, border: `2px solid ${PRIMARY_COLOR}20` }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Select
              size="small"
              value={rangeType}
              onChange={(e) => handleRangeChange(e.target.value)}
              sx={{
                minWidth: 150,
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: PRIMARY_COLOR
                }
              }}
            >
              <MenuItem value="Today">📅 Today</MenuItem>
              <MenuItem value="Yesterday">⏮️ Yesterday</MenuItem>
              <MenuItem value="Last 7 Days">📊 Last 7 Days</MenuItem>
              <MenuItem value="Last 30 Days">📈 Last 30 Days</MenuItem>
              <MenuItem value="Custom Range">🔧 Custom Range</MenuItem>
            </Select>
            <Chip
              label={`${start} → ${end}`}
              sx={{
                fontWeight: 700,
                backgroundColor: `${PRIMARY_COLOR}15`,
                color: PRIMARY_COLOR,
                border: `2px solid ${PRIMARY_COLOR}40`
              }}
            />
          </Stack>


          {rangeType === "Custom Range" && (
            <Stack direction="row" spacing={2} mt={2}>
              <TextField
                type="date"
                value={start}
                onChange={(e) => applyCustomRange(e.target.value, end)}
                size="small"
                sx={{ borderRadius: 2 }}
              />
              <TextField
                type="date"
                value={end}
                onChange={(e) => applyCustomRange(start, e.target.value)}
                size="small"
                sx={{ borderRadius: 2 }}
              />
            </Stack>
          )}
        </CardContent>
      </Card>


      {error && (
        <Card sx={{ mb: 3, borderRadius: 3, backgroundColor: '#fee', border: '2px solid #fcc' }}>
          <CardContent>
            <Typography color="error" fontWeight={600}>❌ {error}</Typography>
          </CardContent>
        </Card>
      )}


      {/* TABS */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: '1rem',
              color: PRIMARY_COLOR,
              '&.Mui-selected': {
                color: PRIMARY_COLOR
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: PRIMARY_COLOR,
              height: 3
            }
          }}
        >
          <Tab label="📊 Overview" />
          <Tab label="📋 Detailed Performance Table" />
        </Tabs>
      </Box>


      {/* TAB CONTENT */}
      {activeTab === 0 && <OverviewTab />}
      {activeTab === 1 && <DetailedTableTab />}


      {/* CONTACTS DIALOG */}
      <Dialog
        open={openContacts}
        onClose={() => setOpenContacts(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, border: `2px solid ${PRIMARY_COLOR}40` }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: PRIMARY_COLOR }}>
          ✅ Converted Abandoned Contacts
        </DialogTitle>
        <DialogContent>
          {convertedContacts.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={3} fontWeight={500}>
              No converted contacts found
            </Typography>
          ) : (
            convertedContacts.map((c, i) => (
              <Stack
                key={i}
                direction="row"
                justifyContent="space-between"
                py={1.5}
                sx={{
                  borderBottom: i < convertedContacts.length - 1 ? `1px solid ${PRIMARY_COLOR}20` : 'none'
                }}
              >
                <Typography fontWeight={700}>{c.phone}</Typography>
                <Chip
                  size="small"
                  label={c.expert || "Unassigned"}
                  sx={{
                    backgroundColor: `${PRIMARY_COLOR}20`,
                    color: PRIMARY_COLOR,
                    fontWeight: 700
                  }}
                />
              </Stack>
            ))
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};


export default AbandonedAnalyticsPage;
