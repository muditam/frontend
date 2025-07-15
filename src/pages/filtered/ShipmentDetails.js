// src/pages/ShipmentDetails.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ShipmentDetails = () => {
  const query = useQuery();
  const category  = query.get('category')  || '';
  const agent     = query.get('agent')     || '';
  const startDate = query.get('startDate') || '';
  const endDate   = query.get('endDate')   || '';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAndFilter = async () => {
      setLoading(true);
      try {
        // Build params for the server to filter by date & agent
        const params = {};
        if (agent)     params.orderCreatedBy = agent;
        if (startDate) params.startDate      = startDate;
        if (endDate)   params.endDate        = endDate;

        const { data } = await axios.get(
          'https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/all',
          { params }
        );

        // Now client‑side filter out "Total Orders" if you're drilling down
        const filtered = data.filter(r => {
          if (category !== 'Total Orders'
              && (r.shipway_status || '').trim() !== category
          ) return false;
          return true;
        });

        setRecords(filtered);
      } catch (err) {
        console.error("Error fetching shipment details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndFilter();
  }, [category, agent, startDate, endDate]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Shipment Details
      </Typography>

      {/* Always show current status & total count */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1">
          Status: <strong>{category}</strong>
        </Typography>
        <Typography variant="subtitle1">
          Total Orders: <strong>{records.length}</strong>
        </Typography>
      </Box>

      {loading
        ? <CircularProgress />
        : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell> 
                  <TableCell>Contact Number</TableCell>
                  <TableCell align="right">Amount Paid</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map(r => (
                  <TableRow key={r._id}>
                    <TableCell>{r.orderId}</TableCell> 
                    <TableCell>{r.contactNumber || '—'}</TableCell>
                    <TableCell align="right">
                      ₹{Number(r.amountPaid).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}

                {!records.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#888' }}>
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )
      }
    </Box>
  );
};

export default ShipmentDetails;
