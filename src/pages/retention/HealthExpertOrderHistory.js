import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';

const date = value => value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
const money = order => `${order.currency || 'INR'} ${Number(order.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function HealthExpertOrderHistory({ customer, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setOrders([]);
    axios.get(`${(process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '')}/api/health-expert/leads/${customer._id}/orders`, { withCredentials: true, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setOrders(data.orders || []); })
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load Shopify order history. Please retry.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [customer._id, attempt]);
  return <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="he-order-history-title">
    <DialogTitle id="he-order-history-title">Shopify order history<Typography variant="body2" color="text.secondary">{customer.name || 'Customer'} · {customer.contactNumber}</Typography></DialogTitle>
    <DialogContent dividers>
      {loading && <Stack alignItems="center" spacing={2} py={5} role="status"><CircularProgress size={28} /><Typography>Loading order history…</Typography></Stack>}
      {error && <Alert severity="error" action={<Button onClick={() => setAttempt(value => value + 1)}>Retry</Button>}>{error}</Alert>}
      {!loading && !error && <>
        <Typography variant="body2" color="text.secondary" mb={2}>{orders.length} orders · Newest first · Times in IST</Typography>
        {!orders.length && <Alert severity="info">No Shopify orders found for this customer’s phone number.</Alert>}
        <Stack spacing={2}>{orders.map(order => <Box component="article" key={order.id} sx={{ p: 2, border: '1px solid #dce5f0', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
            <Typography fontWeight={700}>{order.name}</Typography><Typography fontWeight={700}>{money(order)}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{date(order.created_at)}</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap" my={1.5}>
            <Chip size="small" label={`Payment: ${(order.financial_status || 'Not recorded').replace(/_/g, ' ')}`} />
            <Chip size="small" label={`Fulfillment: ${order.fulfillment_status || 'Unfulfilled'}`} />
            {order.cancelled_at && <Chip size="small" color="error" variant="outlined" label="Cancelled" />}
          </Stack>
          {(order.line_items || []).map((item, index) => <Typography key={item.id || index} variant="body2" sx={{ overflowWrap: 'anywhere' }}>{item.quantity} × {item.name || item.title}{item.sku ? ` · ${item.sku}` : ''}</Typography>)}
          {order.note && <Typography variant="body2" color="text.secondary" mt={1.5} sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>Notes: {order.note}</Typography>}
          {order.shipping_address && <Box component="details" mt={1.5}><Typography component="summary" variant="body2" sx={{ cursor: 'pointer' }}>Shipping address</Typography><Typography variant="body2" color="text.secondary">{['name', 'address1', 'address2', 'city', 'province', 'zip', 'country'].map(field => order.shipping_address[field]).filter(Boolean).join(', ')}</Typography></Box>}
        </Box>)}</Stack>
      </>}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
  </Dialog>;
}
