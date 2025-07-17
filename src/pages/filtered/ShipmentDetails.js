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
  styled,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import axios from 'axios';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// Styled TableRow for striped effect
const StripedTableRow = styled(TableRow)(({ theme, index }) => ({
  backgroundColor: index % 2 === 0 ? theme.palette.action.hover : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
    cursor: 'pointer',
  },
}));

// Custom theme with primary set to black
const blackTheme = createTheme({
  palette: {
    primary: { main: '#000000' },
    contrastThreshold: 3,
  },
  typography: { fontFamily: 'Roboto, sans-serif' },
});

const ShipmentDetails = () => {
  const query = useQuery();
  const category = query.get('category') || 'All';
  const agent = query.get('agent') || '';
  const startDate = query.get('startDate') || '';
  const endDate = query.get('endDate') || '';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAndFilter = async () => {
      setLoading(true);
      try {
        const params = {};
        if (agent) params.orderCreatedBy = agent;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const { data } = await axios.get(
          'https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/all',
          { params }
        );

        const filtered = data.filter(r => {
          if (category !== 'Total Orders' && (r.shipway_status || '').trim() !== category)  
            return false;
          return true;
        });

        setRecords(filtered);
      } catch (err) {
        console.error('Error fetching shipment details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndFilter();
  }, [category, agent, startDate, endDate]);

  return (
    <ThemeProvider theme={blackTheme}>
      <Box sx={{ p: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Typography variant="h3" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
          Shipment Details
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">
            Status: <strong>{category}</strong>
          </Typography>
          <Typography variant="subtitle1">
            Total Orders: <strong>{records.length}</strong>
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress color="primary" size={60} />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={4} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ backgroundColor: 'primary.main' }}>
                <TableRow>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Order ID</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Contact Number</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Amount Paid</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((r, idx) => (
                  <StripedTableRow key={r._id} index={idx}>
                    <TableCell>{r.orderId}</TableCell>
                    <TableCell>{r.contactNumber || '—'}</TableCell>
                    <TableCell>₹{Number(r.amountPaid).toFixed(2)}</TableCell>
                    <TableCell>{r.shipway_status || '—'}</TableCell>
                  </StripedTableRow>
                ))}

                {!records.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6, color: '#666' }}>
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default ShipmentDetails;
