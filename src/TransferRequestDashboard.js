import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import axios from 'axios';

const TransferRequestDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/transfer-requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId) => {
    try {
      await axios.put(`/api/transfer-requests/${requestId}/approve`);
      // Refresh the list after processing
      fetchRequests();
    } catch (error) {
      console.error('Error approving transfer request:', error);
    }
  };

  const handleOpenRejectDialog = (request) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    try {
      await axios.put(`/api/transfer-requests/${selectedRequest._id}/reject`, {
        rejectionComment: rejectComment,
      });
      setRejectDialogOpen(false);
      setRejectComment('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting transfer request:', error);
    }
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h5" gutterBottom>
        Pending Transfer Requests
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lead Name</TableCell>
              <TableCell>Requested Role</TableCell>
              <TableCell>Requesting Agent</TableCell>
              <TableCell>Comments</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req._id}>
                <TableCell>{req.leadId?.name || 'N/A'}</TableCell>
                <TableCell>{req.requestedRole}</TableCell>
                <TableCell>{req.fromUser?.fullName || 'N/A'}</TableCell>
                <TableCell>{req.comments}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleApprove(req._id)}
                    sx={{ mr: 1 }}
                  >
                    Approve
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => handleOpenRejectDialog(req)}>
                    Reject
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Dialog for rejecting a request */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Reject Transfer Request</DialogTitle>
        <DialogContent>
          <TextField
            label="Rejection Comment (optional)"
            fullWidth
            multiline
            rows={3}
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject}>
            Reject Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransferRequestDashboard;
