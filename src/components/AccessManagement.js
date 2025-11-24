// src/pages/ToolAccessRequests.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Autocomplete, // ⬅️ ADDED
} from "@mui/material";
import axios from "axios";


const API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/access";
const EMPLOYEE_API = "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees";


const getUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};


export default function ToolAccessRequests() {
  const user = getUser();
  const [employeeId, setEmployeeId] = useState(null);
  const [employees, setEmployees] = useState([]);


  const today = new Date().toISOString().slice(0, 10);


  // ---------------- FORM STATE ----------------
  const [form, setForm] = useState({
    toolName: "",
    requestedToId: "",
    reason: "",
    requestedDate: today,
  });


  // ---------------- DATA ----------------
  const [myRequests, setMyRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);


  // viewMode: "none" | "my" | "received"
  const [viewMode, setViewMode] = useState("none");


  // ---------------- SNACKBAR ----------------
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });


  const showSnackbar = (message, severity = "info") =>
    setSnackbar({ open: true, message, severity });


  // Approve / Reject Dialog Controls
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);


  const [approvalType, setApprovalType] = useState("access");
  const [shareChannel, setShareChannel] = useState("whatsapp");
  const [customChannel, setCustomChannel] = useState("");
  const [rejectReason, setRejectReason] = useState("");


  // date input ref (for full-width click open)
  const dateInputRef = useRef(null);


  // ---------------- BUTTON STYLE ----------------
  const headerButtonStyle = (active) => ({
    px: 2.5,
    py: 1,
    fontWeight: 600,
    borderRadius: "999px",
    textTransform: "none",
    border: active ? "1px solid #1976d2" : "1px solid #d0d0d0",
    background: active ? "#e3f2fd" : "#f7f7f7",
    color: active ? "#0d47a1" : "#333",
    boxShadow: active ? "0 0 0 1px rgba(25,118,210,0.15)" : "none",
    "&:hover": {
      background: active ? "#d2e8fc" : "#efefef",
    },
  });


  // ---------------- LOAD EMPLOYEE ID ----------------
  useEffect(() => {
    const resolveEmp = async () => {
      if (!user) return;


      if (user._id || user.id || user.employeeId) {
        setEmployeeId(user._id || user.id || user.employeeId);
        return;
      }


      try {
        const res = await axios.get(EMPLOYEE_API, {
          params: { fullName: user.fullName, email: user.email },
        });


        if (res.data?.[0]?._id) setEmployeeId(res.data[0]._id);
      } catch {
        showSnackbar("Error mapping employee", "error");
      }
    };


    resolveEmp();
  }, [user]);


  // ---------------- LOAD EMPLOYEES ----------------
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await axios.get(EMPLOYEE_API, {
          params: { status: "active" },
        });
        setEmployees(res.data || []);
      } catch {
        // ignore
      }
    };


    loadEmployees();
  }, []);


  // ---------------- FETCH REQUESTS ----------------
  const fetchMy = async (id) => {
    try {
      const res = await axios.get(`${API}/requests/mine`, {
        params: { employeeId: id },
      });
      if (res.data.success) setMyRequests(res.data.data);
    } catch {
      // ignore
    }
  };


  const fetchReceived = async (id) => {
    try {
      const res = await axios.get(`${API}/requests/received`, {
        params: { employeeId: id },
      });
      if (res.data.success) setReceivedRequests(res.data.data);
    } catch {
      // ignore
    }
  };


  useEffect(() => {
    if (employeeId) {
      fetchMy(employeeId);
      fetchReceived(employeeId);
    }
  }, [employeeId]);


  // ---------------- SUBMIT REQUEST ----------------
  const handleSubmit = async () => {
    if (!form.toolName.trim())
      return showSnackbar("Tool name is required", "warning");
    if (!form.requestedToId)
      return showSnackbar("Select Requested To", "warning");


    try {
      await axios.post(`${API}/requests`, {
        requestedById: employeeId,
        requestedFromId: form.requestedToId,
        toolName: form.toolName,
        reason: form.reason,
        requestedDate: form.requestedDate,
      });


      showSnackbar("Request Submitted", "success");


      setForm({
        toolName: "",
        requestedToId: "",
        reason: "",
        requestedDate: today,
      });


      if (employeeId) fetchMy(employeeId);
    } catch {
      showSnackbar("Error submitting request", "error");
    }
  };


  // ---------------- APPROVE / REJECT ----------------
  const openApprove = (req) => {
    setSelectedRequest(req);
    setApproveDialogOpen(true);
  };


  const openReject = (req) => {
    setSelectedRequest(req);
    setRejectDialogOpen(true);
  };


  const handleApproveConfirm = async () => {
    try {
      let finalChannel = null;


      if (approvalType === "password") {
        if (shareChannel === "other") {
          finalChannel = customChannel.trim() || "Other";
        } else {
          finalChannel = shareChannel;
        }
      }


      await axios.patch(
        `${API}/tool-requests/${selectedRequest._id}/approve`,
        {
          adminId: employeeId,
          approvalType,
          passwordChannel: finalChannel,
        }
      );


      showSnackbar("Request approved", "success");
      setApproveDialogOpen(false);


      // reset local state for next time
      setShareChannel("whatsapp");
      setCustomChannel("");


      if (employeeId) {
        fetchReceived(employeeId);
        fetchMy(employeeId);
      }
    } catch {
      showSnackbar("Approve failed", "error");
    }
  };


  const handleRejectConfirm = async () => {
    if (!rejectReason.trim())
      return showSnackbar("Rejection remark required", "warning");


    try {
      await axios.patch(
        `${API}/tool-requests/${selectedRequest._id}/reject`,
        {
          reason: rejectReason,
          adminId: employeeId,
        }
      );


      showSnackbar("Request rejected", "success");
      setRejectDialogOpen(false);


      if (employeeId) {
        fetchReceived(employeeId);
        fetchMy(employeeId);
      }
    } catch {
      showSnackbar("Reject failed", "error");
    }
  };


  // ---------------- STATUS CHIP ----------------
  const renderStatus = (status) => {
    const colorMap = {
      Pending: "warning",
      Completed: "success",
      Rejected: "error",
    };


    const labelMap = {
      Pending: "Pending",
      Completed: "Approved", // Completed ko Approved dikhao
      Rejected: "Rejected",
    };


    return (
      <Chip
        label={labelMap[status] || status}
        size="small"
        color={colorMap[status] || "default"}
      />
    );
  };


  if (!user)
    return (
      <Box p={3}>
        <Typography>Please login.</Typography>
      </Box>
    );


  // derive Autocomplete value from id
  const requestedToValue =
    employees.find((e) => e._id === form.requestedToId) || null;


  return (
    <Box p={3}>
      {/* ---------------- TOP HEADER ---------------- */}
      <Stack direction="row" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Access / Password Requests
        </Typography>


        <Stack direction="row" spacing={1}>
          <Button
            onClick={() => {
              setViewMode("my");
              if (employeeId) fetchMy(employeeId);
            }}
            sx={headerButtonStyle(viewMode === "my")}
          >
            My Requests
          </Button>


          <Button
            onClick={() => {
              setViewMode("received");
              if (employeeId) fetchReceived(employeeId);
            }}
            sx={headerButtonStyle(viewMode === "received")}
          >
            Requests Received
          </Button>
        </Stack>
      </Stack>


      {/* ---------------- FORM ---------------- */}
      <Box sx={{ maxWidth: 900, mx: "auto" }}>
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: "14px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Request Access / Password
          </Typography>


          <Stack spacing={2.2}>
            {/* Row 1: From + To */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Request From"
                fullWidth
                value={user.fullName}
                disabled
                sx={{ background: "#f9f9f9" }}
              />


              {/* Requested To - Autocomplete with search */}
              <Autocomplete
                fullWidth
                options={employees.filter((e) => e._id !== employeeId)}
                getOptionLabel={(option) => option.fullName || ""}
                value={requestedToValue}
                onChange={(_, newValue) =>
                  setForm({
                    ...form,
                    requestedToId: newValue?._id || "",
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Requested To"
                    placeholder="Search by name"
                  />
                )}
                isOptionEqualToValue={(option, value) =>
                  option._id === value._id
                }
              />
            </Stack>


            {/* Row 2: Tool + Date */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Tool / Resource Name"
                fullWidth
                value={form.toolName}
                onChange={(e) =>
                  setForm({ ...form, toolName: e.target.value })
                }
              />


              {/* DATE – full-width clickable date picker */}
              <Box
                sx={{ width: { xs: "100%", sm: "50%" } }}
                onClick={() => {
                  if (
                    dateInputRef.current &&
                    dateInputRef.current.showPicker
                  ) {
                    dateInputRef.current.showPicker();
                  } else if (dateInputRef.current) {
                    dateInputRef.current.focus();
                  }
                }}
              >
                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputRef={dateInputRef}
                  value={form.requestedDate}
                  onChange={(e) =>
                    setForm({ ...form, requestedDate: e.target.value })
                  }
                  sx={{
                    pointerEvents: "none",
                    "& .MuiInputBase-input": {
                      pointerEvents: "none",
                      textAlign: "center",
                    },
                  }}
                />
              </Box>
            </Stack>


            {/* Reason */}
            <TextField
              label="Reason"
              multiline
              minRows={3}
              fullWidth
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />


            <Box textAlign="right">
              <Button
                variant="contained"
                size="large"
                sx={{
                  px: 4,
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 600,
                }}
                onClick={handleSubmit}
              >
                Submit Request
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Box>


      {/* ---------------- TABLE SECTION ---------------- */}
      <Box sx={{ maxWidth: 900, mx: "auto" }}>
        {viewMode === "my" && (
          <MyRequestsTable
            myRequests={myRequests}
            renderStatus={renderStatus}
            onRefresh={() => employeeId && fetchMy(employeeId)}
          />
        )}


        {viewMode === "received" && (
          <ReceivedRequestsTable
            receivedRequests={receivedRequests}
            renderStatus={renderStatus}
            openApprove={openApprove}
            openReject={openReject}
            onRefresh={() => employeeId && fetchReceived(employeeId)}
          />
        )}
      </Box>


      {/* ---------------- APPROVE DIALOG ---------------- */}
      <Dialog
        open={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
      >
        <DialogTitle>Approve Request</DialogTitle>


        <DialogContent sx={{ minWidth: 350 }}>
          <TextField
            select
            fullWidth
            label="Method"
            value={approvalType}
            onChange={(e) => setApprovalType(e.target.value)}
            sx={{ mt: 2 }}
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
                value={shareChannel}
                onChange={(e) => setShareChannel(e.target.value)}
                sx={{ mt: 2 }}
              >
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="teams">Teams</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="phone">Phone</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>


              {shareChannel === "other" && (
                <TextField
                  fullWidth
                  label="Channel (Specify)"
                  value={customChannel}
                  onChange={(e) => setCustomChannel(e.target.value)}
                  sx={{ mt: 2 }}
                  placeholder="e.g. Discord, Slack, Zoom…"
                />
              )}
            </>
          )}
        </DialogContent>


        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleApproveConfirm}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>


      {/* ---------------- REJECT DIALOG ---------------- */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
      >
        <DialogTitle>Reject Request</DialogTitle>


        <DialogContent sx={{ minWidth: 350 }}>
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
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>


          <Button
            variant="contained"
            color="error"
            onClick={handleRejectConfirm}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>


      {/* ---------------- SNACKBAR ---------------- */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          sx={{ fontWeight: 600 }}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


/* ---------------- COMPONENT — My Requests ---------------- */


function MyRequestsTable({ myRequests, renderStatus, onRefresh }) {
  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        borderRadius: "14px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="h6" fontWeight={700}>
          Requests I Raised
        </Typography>


        <Button size="small" variant="outlined" onClick={onRefresh}>
          Refresh
        </Button>
      </Stack>


      {myRequests.length === 0 ? (
        <Typography>No requests yet.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  fontWeight: 700,
                  background: "#fafafa",
                  fontSize: "0.9rem",
                },
              }}
            >
              <TableCell>Tool</TableCell>
              <TableCell>Requested To</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Channel</TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>


          <TableBody>
            {myRequests.map((r) => {
              const isRejected = r.status === "Rejected";


              return (
                <TableRow key={r._id}>
                  <TableCell sx={{ fontWeight: 600 }}>{r.toolName}</TableCell>


                  <TableCell>{r.requestedFrom?.fullName}</TableCell>


                  <TableCell>
                    {new Date(r.requestedDate).toLocaleDateString()}
                  </TableCell>


                  <TableCell>{renderStatus(r.status)}</TableCell>


                  <TableCell>
                    {r.status === "Completed" ? r.shareType || "-" : "-"}
                  </TableCell>


                  <TableCell>
                    {r.status === "Completed" ? r.shareChannel || "-" : "-"}
                  </TableCell>


                  <TableCell
                    sx={{
                      color: isRejected ? "error.main" : "text.primary",
                      fontWeight: isRejected ? 600 : 400,
                    }}
                  >
                    {isRejected ? r.rejectionReason || "-" : r.reason || "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}


/* ---------------- COMPONENT — Requests Received ---------------- */


function ReceivedRequestsTable({
  receivedRequests,
  renderStatus,
  openApprove,
  openReject,
  onRefresh,
}) {
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: "14px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="h6" fontWeight={700}>
          Requests Received
        </Typography>


        <Button size="small" variant="outlined" onClick={onRefresh}>
          Refresh
        </Button>
      </Stack>


      {receivedRequests.length === 0 ? (
        <Typography>No incoming requests.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  fontWeight: 700,
                  background: "#fafafa",
                  fontSize: "0.9rem",
                },
              }}
            >
              <TableCell>Requested By</TableCell>
              <TableCell>Tool</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Channel</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>


          <TableBody>
            {receivedRequests.map((r) => {
              const isRejected = r.status === "Rejected";


              return (
                <TableRow key={r._id}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {r.requestedBy?.fullName}
                  </TableCell>


                  <TableCell>{r.toolName}</TableCell>


                  <TableCell>
                    {new Date(r.requestedDate).toLocaleDateString()}
                  </TableCell>


                  <TableCell>{renderStatus(r.status)}</TableCell>


                  <TableCell>
                    {r.status === "Completed" ? r.shareType || "-" : "-"}
                  </TableCell>


                  <TableCell>
                    {r.status === "Completed" ? r.shareChannel || "-" : "-"}
                  </TableCell>


                  <TableCell
                    sx={{
                      color: isRejected ? "error.main" : "text.primary",
                      fontWeight: isRejected ? 600 : 400,
                    }}
                  >
                    {isRejected ? r.rejectionReason || "-" : r.reason || "-"}
                  </TableCell>


                  <TableCell align="right">
                    {r.status === "Pending" ? (
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
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
                    ) : (
                      <Chip
                        label="Completed"
                        size="small"
                        color="success"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}



