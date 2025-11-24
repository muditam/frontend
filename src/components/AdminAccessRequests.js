// src/pages/AdminToolAccessRequests.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Chip,
  Button,
  Stack,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  TextField,
  MenuItem,
  Autocomplete, // ⬅️ added
} from "@mui/material";
import axios from "axios";


const API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/access";
const EMP_API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees";


const ADMINS = ["madhur@muditam.com", "abhay@muditam.com"];


const getUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};


const isAdminUser = (u) =>
  u?.email && ADMINS.includes(u.email.toLowerCase());


export default function AdminToolAccessRequests() {
  const user = getUser();
  const isAdmin = isAdminUser(user);


  const [employeeId, setEmployeeId] = useState(null);


  const [view, setView] = useState(isAdmin ? "pending" : "my");


  const [pending, setPending] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [received, setReceived] = useState([]);
  const [history, setHistory] = useState([]);


  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);


  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");


  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });


  const showSnack = (m, s = "info") =>
    setSnackbar({ open: true, message: m, severity: s });


  // dialogs
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selected, setSelected] = useState(null);


  const [approvalType, setApprovalType] = useState("access");
  const [passwordChannel, setPasswordChannel] = useState("whatsapp");
  const [otherChannel, setOtherChannel] = useState(""); // custom channel when "Other"
  const [rejectReason, setRejectReason] = useState("");


  // ---------------------------------------------------------------------
  // Resolve logged-in Employee ID
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;


    if (user._id || user.id || user.employeeId) {
      setEmployeeId(user._id || user.id || user.employeeId);
      return;
    }


    const resolve = async () => {
      try {
        const res = await axios.get(EMP_API, {
          params: { fullName: user.fullName, email: user.email },
        });


        if (res.data && res.data[0]?._id) {
          setEmployeeId(res.data[0]._id);
        }
      } catch (e) {
        console.error("Admin mapping error:", e);
      }
    };


    resolve();
  }, [user]);


  // ---------------------------------------------------------------------
  // Fetch Functions
  // ---------------------------------------------------------------------
  const fetchPending = async () => {
    if (!isAdmin) return;


    try {
      setLoading(true);
      const res = await axios.get(`${API}/tool-requests/pending`);
      if (res.data.success) setPending(res.data.data);
    } catch (e) {
      console.error(e);
      showSnack("Error loading pending requests", "error");
    }
    setLoading(false);
  };


  const fetchMy = async (id) => {
    try {
      const res = await axios.get(`${API}/requests/mine`, {
        params: { employeeId: id },
      });
      if (res.data.success) setMyRequests(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };


  const fetchReceived = async (id) => {
    try {
      const res = await axios.get(`${API}/requests/received`, {
        params: { employeeId: id },
      });
      if (res.data.success) setReceived(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };


  const fetchHistory = async () => {
    if (!isAdmin) return;


    try {
      const params = {};
      if (employeeFilter !== "all") params.employeeId = employeeFilter;
      if (statusFilter !== "All") params.status = statusFilter;


      const res = await axios.get(`${API}/tool-requests/history`, { params });
      if (res.data.success) setHistory(res.data.data);
    } catch (e) {
      console.error(e);
      showSnack("Error loading history", "error");
    }
  };


  const loadEmployees = async () => {
    try {
      const res = await axios.get(EMP_API);
      setEmployees(res.data);
    } catch (e) {
      console.error(e);
    }
  };


  useEffect(() => {
    if (employeeId) {
      fetchMy(employeeId);
      fetchReceived(employeeId);


      if (isAdmin) {
        fetchPending();
        fetchHistory();
        loadEmployees();
      }
    }
  }, [employeeId]);


  useEffect(() => {
    if (isAdmin) fetchHistory();
  }, [employeeFilter, statusFilter]);


  // ---------------------------------------------------------------------
  // Approve / Reject Logic
  // ---------------------------------------------------------------------
  const openApprove = (r) => {
    setSelected(r);
    setApprovalType("access");
    setPasswordChannel("whatsapp");
    setOtherChannel("");
    setApproveOpen(true);
  };


  const confirmApprove = async () => {
    try {
      let finalChannel = null;


      if (approvalType === "password") {
        if (passwordChannel === "other") {
          finalChannel = otherChannel.trim() || null;
        } else {
          finalChannel = passwordChannel;
        }
      }


      await axios.patch(`${API}/tool-requests/${selected.requestId}/approve`, {
        adminId: employeeId,
        approvalType,
        passwordChannel: finalChannel, // goes into shareChannel in backend
      });


      showSnack("Request Approved", "success");
      setApproveOpen(false);


      fetchPending();
      fetchHistory();
      fetchMy(employeeId);
      fetchReceived(employeeId);
    } catch (e) {
      console.error(e);
      showSnack("Approve error", "error");
    }
  };


  const openReject = (r) => {
    setSelected(r);
    setRejectReason("");
    setRejectOpen(true);
  };


  const confirmReject = async () => {
    if (!rejectReason.trim())
      return showSnack("Rejection remark required", "warning");


    try {
      await axios.patch(`${API}/tool-requests/${selected.requestId}/reject`, {
        adminId: employeeId,
        reason: rejectReason,
      });


      showSnack("Request Rejected", "success");
      setRejectOpen(false);


      fetchPending();
      fetchHistory();
      fetchMy(employeeId);
      fetchReceived(employeeId);
    } catch (e) {
      console.error(e);
      showSnack("Reject error", "error");
    }
  };


  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  const chip = (status) => {
    const colorMap = {
      Pending: "warning",
      Completed: "success",
      Rejected: "error",
    };


    const labelMap = {
      Pending: "Pending",
      Completed: "Approved",
      Rejected: "Rejected",
    };


    return (
      <Chip
        size="small"
        label={labelMap[status] || status}
        color={colorMap[status] || "default"}
      />
    );
  };


  const formatChannel = (ch) => {
    if (!ch || ch === "-") return "-";
    return ch.charAt(0).toUpperCase() + ch.slice(1);
  };


  if (!user) return <Typography>No user</Typography>;


  // ---------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------
  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Access / Password Requests</Typography>


        <Stack direction="row" spacing={1}>
          {isAdmin ? (
            <>
              <Button
                variant={view === "pending" ? "contained" : "outlined"}
                onClick={() => setView("pending")}
              >
                Pending
              </Button>
              <Button
                variant={view === "history" ? "contained" : "outlined"}
                onClick={() => setView("history")}
              >
                History
              </Button>
            </>
          ) : (
            <>
              <Button
                variant={view === "my" ? "contained" : "outlined"}
                onClick={() => setView("my")}
              >
                My Requests
              </Button>


              <Button
                variant={view === "received" ? "contained" : "outlined"}
                onClick={() => setView("received")}
              >
                Requests Received
              </Button>
            </>
          )}
        </Stack>
      </Stack>


      {/* ADMIN — PENDING */}
      {isAdmin && view === "pending" && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" mb={1}>
            Pending Requests
          </Typography>


          {!pending.length ? (
            <Typography>No pending requests.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>S.No</TableCell>
                  <TableCell>Requested By</TableCell>
                  <TableCell>Requested To</TableCell>
                  <TableCell>Tool</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pending.map((r, i) => (
                  <TableRow key={r.requestId}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{r.requestedByName}</TableCell>
                    <TableCell>{r.requestedToName}</TableCell>
                    <TableCell>{r.toolName}</TableCell>


                    <TableCell>
                      <Tooltip title={r.reason}>
                        <Typography
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            overflow: "hidden",
                          }}
                        >
                          {r.reason}
                        </Typography>
                      </Tooltip>
                    </TableCell>


                    <TableCell>
                      {new Date(r.requestDate).toLocaleDateString()}
                    </TableCell>


                    <TableCell align="right">
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => openApprove(r)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => openReject(r)}
                        >
                          Reject
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}


      {/* ADMIN — HISTORY */}
      {isAdmin && view === "history" && (
        <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 3 }}>
          <Stack direction="row" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight="600">
              History (Approved / Rejected)
            </Typography>


            <Stack direction="row" spacing={2}>
              {/* Employee filter with search (Autocomplete) */}
              <Autocomplete
                size="small"
                sx={{ minWidth: 220 }}
                options={[{ _id: "all", fullName: "All" }, ...employees]}
                getOptionLabel={(option) => option.fullName || "All"}
                value={
                  employeeFilter === "all"
                    ? { _id: "all", fullName: "All" }
                    : employees.find((e) => e._id === employeeFilter) || null
                }
                onChange={(e, newValue) => {
                  setEmployeeFilter(newValue?._id || "all");
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Employee" />
                )}
                isOptionEqualToValue={(option, value) =>
                  option._id === value._id
                }
              />


              <TextField
                select
                size="small"
                label="Status"
                sx={{ minWidth: 140 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="Completed">Approved</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </TextField>
            </Stack>
          </Stack>


          {!history.length ? (
            <Typography>No history available.</Typography>
          ) : (
            <Table
              size="small"
              sx={{ borderCollapse: "separate", borderSpacing: "0 6px" }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    "& th": {
                      fontWeight: 700,
                      background: "#f5f5f5",
                      borderBottom: "2px solid #e0e0e0",
                      py: 1,
                    },
                  }}
                >
                  <TableCell>S.No</TableCell>
                  <TableCell>Req By</TableCell>
                  <TableCell>Req To</TableCell>
                  <TableCell>Tool</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Channel</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Remark</TableCell>
                  <TableCell>Approved By</TableCell>
                  <TableCell>Requested</TableCell>
                  <TableCell>Action At</TableCell>
                </TableRow>
              </TableHead>


              <TableBody>
                {history.map((r, i) => (
                  <TableRow
                    key={i}
                    sx={{
                      background: "#ffffff",
                      borderRadius: 2,
                      "&:hover": { background: "#f9f9f9" },
                    }}
                  >
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{r.requestedByName}</TableCell>
                    <TableCell>{r.requestedToName}</TableCell>
                    <TableCell>{r.toolName}</TableCell>
                    <TableCell>{chip(r.status)}</TableCell>


                    <TableCell>{r.approvalMethod || "-"}</TableCell>


                    {/* CHANNEL – shows even after approval */}
                    <TableCell>{formatChannel(r.passwordChannel)}</TableCell>


                    {/* REASON – original request reason */}
                    <TableCell>{r.reason || "-"}</TableCell>


                    {/* REMARK – only for rejected */}
                    <TableCell>
                      {r.status === "Rejected"
                        ? r.rejectionRemark || "-"
                        : "-"}
                    </TableCell>


                    <TableCell>{r.approvedByName || "—"}</TableCell>


                    <TableCell>
                      {new Date(r.requestDate).toLocaleString()}
                    </TableCell>


                    <TableCell>
                      {r.actionAt
                        ? new Date(r.actionAt).toLocaleString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}


      {/* EMPLOYEE — MY REQUESTS */}
      {!isAdmin && view === "my" && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" mb={1}>
            My Requests
          </Typography>


          {!myRequests.length ? (
            <Typography>No requests</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tool</TableCell>
                  <TableCell>Requested To</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reason / Rejection</TableCell>
                </TableRow>
              </TableHead>


              <TableBody>
                {myRequests.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>{r.toolName}</TableCell>
                    <TableCell>{r.requestedFrom?.fullName}</TableCell>
                    <TableCell>{chip(r.status)}</TableCell>
                    <TableCell>
                      {r.status === "Rejected"
                        ? r.rejectionReason || "-"
                        : r.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}


      {/* EMPLOYEE — REQUESTS RECEIVED */}
      {!isAdmin && view === "received" && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" mb={1}>
            Requests Received
          </Typography>


          {!received.length ? (
            <Typography>No incoming requests</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Requested By</TableCell>
                  <TableCell>Tool</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reason / Remark</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>


              <TableBody>
                {received.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>{r.requestedBy?.fullName}</TableCell>
                    <TableCell>{r.toolName}</TableCell>
                    <TableCell>{chip(r.status)}</TableCell>
                    <TableCell>
                      {r.status === "Rejected"
                        ? r.rejectionReason || "-"
                        : r.reason}
                    </TableCell>


                    <TableCell align="right">
                      {r.status === "Pending" && (
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() =>
                              openApprove({
                                requestId: r._id,
                                requestedByName: r.requestedBy.fullName,
                                requestedToName: user.fullName,
                                toolName: r.toolName,
                                reason: r.reason,
                                requestDate: r.requestedDate,
                              })
                            }
                          >
                            Approve
                          </Button>


                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() =>
                              openReject({
                                requestId: r._id,
                              })
                            }
                          >
                            Reject
                          </Button>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}


      {/* APPROVE dialog */}
      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)}>
        <DialogTitle>Approve Request</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Method"
            value={approvalType}
            onChange={(e) => setApprovalType(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          >
            <MenuItem value="access">Access Shared</MenuItem>
            <MenuItem value="password">Password Shared</MenuItem>
          </TextField>


          {approvalType === "password" && (
            <>
              <TextField
                select
                fullWidth
                label="Shared Via"
                value={passwordChannel}
                onChange={(e) => setPasswordChannel(e.target.value)}
                sx={{ mb: passwordChannel === "other" ? 2 : 0 }}
              >
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="teams">MS Teams</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="phone">Phone Call</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>


              {passwordChannel === "other" && (
                <TextField
                  fullWidth
                  label="Specify Channel"
                  value={otherChannel}
                  onChange={(e) => setOtherChannel(e.target.value)}
                  sx={{ mb: 1 }}
                />
              )}
            </>
          )}
        </DialogContent>


        <DialogActions>
          <Button onClick={() => setApproveOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmApprove}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>


      {/* REJECT dialog */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)}>
        <DialogTitle>Reject Request</DialogTitle>
        <DialogContent>
          <TextField
            label="Rejection Remark"
            fullWidth
            multiline
            minRows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmReject}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>


      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}



