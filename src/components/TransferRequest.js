// TransferRequests.js
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
      const response = await axios.get("http://localhost:5000/api/leads/transfer-requests");
      // Sort requests descending by createdAt so that new requests appear on top
      const sortedRequests = response.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setRequests(sortedRequests);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching transfer requests:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId) => {
    try {
      await axios.post("http://localhost:5000/api/leads/transfer-approve", { requestId });
      fetchRequests(); // refresh the list after approval
    } catch (error) {
      console.error("Error approving transfer request:", error);
    }
  };

  const handleReject = async (requestId) => {
    try {
      // Assuming you have an endpoint to reject transfer requests.
      await axios.post("http://localhost:5000/api/leads/transfer-reject", { requestId });
      fetchRequests(); // refresh the list after rejection
    } catch (error) {
      console.error("Error rejecting transfer request:", error);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h5" gutterBottom>
        Pending Transfer Requests
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Number</TableCell>
              <TableCell>Agent Assigned</TableCell>
              <TableCell>Health Expert Assigned</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req._id}>
                <TableCell>
                  {new Date(req.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {req.leadId && req.leadId.name ? req.leadId.name : "N/A"}
                </TableCell>
                <TableCell>
                  {req.leadId && req.leadId.contactNumber ? req.leadId.contactNumber : "N/A"}
                </TableCell>
                <TableCell>
                  {req.leadId && req.leadId.agentAssigned ? req.leadId.agentAssigned : "N/A"}
                </TableCell>
                <TableCell>
                  {req.leadId && req.leadId.healthExpertAssigned ? req.leadId.healthExpertAssigned : "N/A"}
                </TableCell>
                <TableCell>{req.requestedBy}</TableCell>
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
    </Box>
  );
};

export default TransferRequests;
