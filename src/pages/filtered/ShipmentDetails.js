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
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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

  const FIXED_STATUS_OPTIONS = ['Delivered', 'RTO', 'RTO Delivered'];

  useEffect(() => {
    const fetchAndFilter = async () => {
      setLoading(true);
      try {
        const params = {};
        if (agent) params.orderCreatedBy = agent;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const { data } = await axios.get(
          'https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/allnew',
          { params }
        );

        const filtered = data.filter((r) => {
          if (category !== 'Total Orders' && (r.shipway_status || '').trim() !== category) return false;
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

  const handleStatusChange = async (idx, orderId, newStatus) => {
    try {
      await axios.post('https://muditamleads-14f32a10d7f7.herokuapp.com/api/shipway/update-status', {
        orderId,
        newStatus,
        selfUpdated: true,
      });

      setRecords((prev) =>
        prev.map((item, i) =>
          i === idx ? { ...item, shipway_status: newStatus } : item
        )
      );
    } catch (error) {
      console.error('Error updating shipment status:', error);
    }
  };

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
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ backgroundColor: 'primary.main' }}>
                <TableRow>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Order Date</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Order ID</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Contact Number</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Amount Paid</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Shipment Status</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Tracking Number</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Carrier</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((r, idx) => {
                  const currentStatus = r.shipway_status || 'Not Available';
                  const statusOptions = FIXED_STATUS_OPTIONS.includes(currentStatus)
                    ? FIXED_STATUS_OPTIONS
                    : [currentStatus, ...FIXED_STATUS_OPTIONS];

                  return (
                    <StripedTableRow key={r._id || `${r.orderId}-${idx}`} index={idx}>
                      <TableCell>{r.date || '—'}</TableCell>
                      <TableCell>{r.orderId || '—'}</TableCell>
                      <TableCell>{r.contactNumber || '—'}</TableCell>
                      <TableCell>₹{Number(r.amountPaid || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(idx, r.orderId, e.target.value)}
                          sx={{ minWidth: 160 }}
                        >
                          {statusOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        {r.tracking_number ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <a
                              href={`https://track.shipway.com/t/${r.tracking_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 500 }}
                            >
                              {r.tracking_number}
                            </a>
                            <Tooltip title="Copy Tracking Link">
                              <ContentCopyIcon
                                fontSize="small"
                                sx={{ cursor: 'pointer', color: '#555' }}
                                onClick={() =>
                                  navigator.clipboard.writeText(`https://track.shipway.com/t/${r.tracking_number}`)
                                }
                              />
                            </Tooltip>
                          </Box>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{r.carrier_title || '—'}</TableCell>
                    </StripedTableRow>
                  );
                })}

                {!records.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#666' }}>
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
