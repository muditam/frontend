import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import axios from "axios";

const TransferRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/transfer-requests"
      );
      const sortedRequests = response.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setRequests(sortedRequests);
    } catch (error) {
      console.error("Error fetching transfer requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId) => {
    try {
      await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/transfer-approve",
        { requestId }
      );
      fetchRequests();
    } catch (error) {
      console.error("Error approving transfer request:", error);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await axios.post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/transfer-reject",
        { requestId }
      );
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting transfer request:", error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ color: "black", textAlign: "center", fontWeight: "bold" }}>
        Pending Transfer Requests
      </Typography>

      {requests.length === 0 ? (
        <Typography
          variant="h6"
          sx={{ color: "black", textAlign: "center", mt: 4 }}
        >
          No Pending Request Available
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "black" }}>
                {[
                  "Date",
                  "Name",
                  "Number",
                  "Agent Assigned",
                  "Health Expert Assigned",
                  "Requested By",
                  "Actions",
                ].map((header) => (
                  <TableCell
                    key={header}
                    align="center"
                    sx={{ color: "white", fontWeight: "bold" }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req._id}>
                  <TableCell align="center">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    {req.leadId?.name || "N/A"}
                  </TableCell>
                  <TableCell align="center">
                    {req.leadId?.contactNumber || "N/A"}
                  </TableCell>
                  <TableCell align="center">
                    {req.leadId?.agentAssigned || "N/A"}
                  </TableCell>
                  <TableCell align="center">
                    {req.leadId?.healthExpertAssigned || "N/A"}
                  </TableCell>
                  <TableCell align="center">{req.requestedBy}</TableCell>
                  <TableCell align="center">
                    <IconButton color="success" onClick={() => handleApprove(req._id)}>
                      <CheckCircleIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleReject(req._id)}>
                      <CancelIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default TransferRequests;
