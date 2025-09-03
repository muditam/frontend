// pages/SmartfloCallLogs.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, TextField, Button, MenuItem, Typography,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TablePagination, IconButton, Stack
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";

import dayjs from "dayjs";
import axios from "axios";

// helper to format to `YYYY-MM-DD HH:mm:ss` as required by Smartflo CDR API
const fmt = (d) => dayjs(d).format("YYYY-MM-DD HH:mm:ss");

const defaultRange = () => {
  const end = dayjs().endOf("day");
  const start = end.subtract(7, "day").startOf("day");
  return { start, end };
};

const DIRECTIONS = [
  { label: "All", value: "" },
  { label: "Inbound", value: "inbound" },
  { label: "Outbound", value: "outbound" },
];

const CALL_TYPES = [
  { label: "All", value: "" },
  { label: "Answered", value: "c" },  // 'c' in docs
  { label: "Missed", value: "m" },    // 'm' in docs
];

export default function SmartfloCallLogs() {
  const { start, end } = useMemo(defaultRange, []);
  const [fromDate, setFromDate] = useState(start.format("YYYY-MM-DDTHH:mm"));
  const [toDate, setToDate] = useState(end.format("YYYY-MM-DDTHH:mm"));

  const [direction, setDirection] = useState("");
  const [callType, setCallType] = useState("");
  const [searchClient, setSearchClient] = useState("");  // callerid
  const [searchDid, setSearchDid] = useState("");        // did_number

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        from_date: fmt(dayjs(fromDate)),
        to_date: fmt(dayjs(toDate)),
        page: page + 1,   
        limit,
      };
      if (direction) params.direction = direction;
      if (callType) params.call_type = callType;
      if (searchClient) params.callerid = searchClient;
      if (searchDid) params.did_number = searchDid;

      const { data } = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/smartflo/call-records", { params });
      setRows(data?.results || []);
      setTotal(data?.count || 0);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch call logs. Check server logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const onSearch = () => {
    setPage(0);
    fetchLogs();
  };

  const exportCsv = () => {
    if (!rows?.length) return;
    const headers = [
      "date","time","direction","status","agent_name","agent_number","client_number",
      "did_number","call_duration","answered_seconds","recording_url","description","hangup_cause"
    ];
    const lines = [
      headers.join(","),
      ...rows.map(r => ([
        r.date, r.time, r.direction, r.status, wrap(r.agent_name), wrap(r.agent_number),
        wrap(r.client_number), wrap(r.did_number), r.call_duration, r.answered_seconds,
        wrap(r.recording_url), wrap(r.description), wrap(r.hangup_cause)
      ].join(",")))
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `smartflo-cdr-${dayjs().format("YYYYMMDD-HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wrap = (v) => {
    if (v == null) return "";
    const s = String(v).replaceAll('"','""');
    return `"${s}"`;
  };

  return (
    <Box p={2}>
      <Typography variant="h6" mb={2}>Smartflo — Call Logs</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
          <TextField
            label="From"
            type="datetime-local"
            size="small"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="datetime-local"
            size="small"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select size="small" label="Direction"
            value={direction} onChange={(e)=>setDirection(e.target.value)} sx={{ minWidth: 140 }}
          >
            {DIRECTIONS.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
          </TextField>

          <TextField
            select size="small" label="Call Type"
            value={callType} onChange={(e)=>setCallType(e.target.value)} sx={{ minWidth: 160 }}
          >
            {CALL_TYPES.map(ct => <MenuItem key={ct.value} value={ct.value}>{ct.label}</MenuItem>)}
          </TextField>

          <TextField
            label="Client Number (callerid)"
            placeholder="91XXXXXXXXXX"
            size="small"
            value={searchClient}
            onChange={(e) => setSearchClient(e.target.value)}
          />

          <TextField
            label="DID Number"
            placeholder="+91XXXXXXXXXX"
            size="small"
            value={searchDid}
            onChange={(e) => setSearchDid(e.target.value)}
          />

          <Button
            variant="contained"
            onClick={onSearch}
            disabled={loading}
            startIcon={<RefreshIcon />}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>

          <Button
            variant="outlined"
            onClick={exportCsv}
            startIcon={<DownloadIcon />}
          >
            Export CSV
          </Button>
        </Stack>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Dir</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Agent Ext</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>DID</TableCell>
                <TableCell align="right">Dur (s)</TableCell>
                <TableCell>Recording</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Hangup</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.time}</TableCell>
                  <TableCell>{r.direction}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.agent_name || "-"}</TableCell>
                  <TableCell>{r.agent_number || "-"}</TableCell>
                  <TableCell>{r.client_number || "-"}</TableCell>
                  <TableCell>{r.did_number || "-"}</TableCell>
                  <TableCell align="right">{r.call_duration ?? 0}</TableCell>
                  <TableCell>
                    {r.recording_url ? (
                      <audio controls preload="none" style={{ width: 180 }}>
                        <source src={r.recording_url} type="audio/mpeg" />
                      </audio>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{r.description || ""}</TableCell>
                  <TableCell>{r.hangup_cause || ""}</TableCell>
                </TableRow>
              ))}

              {!rows.length && !loading && (
                <TableRow>
                  <TableCell colSpan={12}>
                    <Box p={2} textAlign="center">No records</Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={limit}
          rowsPerPageOptions={[20, 50, 100]}
          onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Paper>
    </Box>
  );
}
