import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, MenuItem, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material';

const api = axios.create({ baseURL: (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, ''), withCredentials: true, timeout: 60000 });
const rupees = value => Number(value).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function CoachCheckoutDialog({ lead, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [step, setStep] = useState(0);
  const [variantId, setVariantId] = useState('');
  const [withoutBloodTest, setWithoutBloodTest] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);
  const [linkMessage, setLinkMessage] = useState('');
  const linkRequestId = useRef(null);
  const [received, setReceived] = useState(false);
  const [completed, setCompleted] = useState(null);
  const [customer, setCustomer] = useState(() => {
    const [firstName = '', ...rest] = String(lead.name || '').trim().split(/\s+/);
    return { firstName, lastName: rest.join(' '), email: '' };
  });
  const busy = useRef(false);
  const mounted = useRef(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get(`/api/health-expert/leads/${lead._id}/coach-checkout`);
      if (!mounted.current) return;
      setData(response.data);
      if (response.data.item) setCompleted(response.data.item);
      setVariantId(response.data.product?.variants?.[0]?.id || '');
    } catch (err) {
      if (mounted.current) setError(err.response?.data?.message || 'Could not load checkout. Please retry.');
    } finally { if (mounted.current) setLoading(false); }
  }, [lead._id]);
  useEffect(() => { mounted.current = true; load(); return () => { mounted.current = false; }; }, [load]);
  const variant = data?.product?.variants?.find(item => item.id === variantId);
  const discount = withoutBloodTest ? (data?.discountWithoutBloodTest || 0) : 0;
  const total = Math.round((Number(variant?.price || 0) - discount) * 100) / 100;
  const validCustomer = Boolean(data?.customer || (customer.firstName.trim() && (!customer.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))));
  const resetLink = () => {
    if (paymentLink) setLinkMessage('Amount changed. Generate a new link below; do not use the previous link.');
    setPaymentLink(null); setPaymentId(''); setReceived(false);
  };
  const generateLink = async () => {
    if (busy.current) return;
    busy.current = true; setGeneratingLink(true); setError(''); setLinkMessage('');
    try {
      linkRequestId.current ||= window.crypto.randomUUID();
      const { data: response } = await api.post(`/api/health-expert/leads/${lead._id}/coach-payment-link`, {
        requestId: linkRequestId.current, variantId, withoutBloodTest, expectedTotal: total,
      });
      if (mounted.current) setPaymentLink(response);
    } catch (err) {
      if (mounted.current) setError(err.response?.data?.message || 'Could not generate the Razorpay link. Please retry.');
    } finally { busy.current = false; if (mounted.current) setGeneratingLink(false); }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(paymentLink.paymentLink); setLinkMessage('Payment link copied.'); }
    catch { setLinkMessage('Could not copy automatically. Select and copy the link above.'); }
  };
  const submit = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const { data: response } = await api.post(`/api/health-expert/leads/${lead._id}/coach-purchase`, {
        paymentMode: 'Prepaid', paymentId: paymentId.trim(), variantId, withoutBloodTest, expectedTotal: total, customer,
      });
      if (mounted.current) { setCompleted(response.item); onSaved(response.item); }
    } catch (err) {
      if (mounted.current) {
        setError(err.response?.data?.message || 'The response was interrupted. Retry to check the existing checkout.');
        // Ask the server whether a checkout is already in flight before allowing a fresh submission.
        try {
          const response = await api.get(`/api/health-expert/leads/${lead._id}/coach-checkout`);
          if (mounted.current && response.data.recovering) setData({ recovering: true });
          if (mounted.current && response.data.item) { setCompleted(response.data.item); onSaved(response.data.item); }
        } catch { /* Keep the original error; server-side retry protection still applies. */ }
      }
    } finally { busy.current = false; if (mounted.current) setSaving(false); }
  };
  const close = () => { if (!busy.current) { if (completed) onSaved(completed); onClose(); } };
  return <Dialog open onClose={close} fullWidth maxWidth="sm" disableEscapeKeyDown={saving || generatingLink}>
    <DialogTitle>Purchase Sugar Control Coach</DialogTitle>
    <DialogContent dividers>
      {loading ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /><Typography sx={{ mt: 2 }}>Getting customer and product details from Shopify…</Typography></Box>
        : completed ? <Stack spacing={2}><Alert severity="success">Coach purchase confirmed{completed.healthExpertCoachPurchase?.shopifyOrderName ? ` — ${completed.healthExpertCoachPurchase.shopifyOrderName}` : ''}.</Alert>
          {completed.healthExpertCoachPurchase?.paymentId && <><Typography>Payment ID: {completed.healthExpertCoachPurchase.paymentId}</Typography><Typography>Paid: {rupees(completed.healthExpertCoachPurchase.amount)}</Typography></>}
        </Stack> : <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          {data?.recovering ? <Alert severity="info">A checkout has already been submitted for this customer. Check its status to retrieve the Shopify confirmation.</Alert>
            : data?.product && <>
              <Stepper activeStep={step}>{['Customer details', 'Coach & payment'].map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
              {step === 0 ? <Stack spacing={2}>
                <Alert severity={data.customer ? 'success' : 'info'}>{data.customer ? 'Customer found in Shopify.' : 'No Shopify customer found. Add the customer details below.'}</Alert>
                <TextField label="Phone" value={data.phone} size="small" InputProps={{ readOnly: true }} fullWidth />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="First name" required size="small" fullWidth value={data.customer?.firstName ?? customer.firstName} InputProps={{ readOnly: Boolean(data.customer) }} inputProps={{ maxLength: 100 }} onChange={e => setCustomer({ ...customer, firstName: e.target.value })} />
                  <TextField label="Last name" size="small" fullWidth value={data.customer?.lastName ?? customer.lastName} InputProps={{ readOnly: Boolean(data.customer) }} inputProps={{ maxLength: 100 }} onChange={e => setCustomer({ ...customer, lastName: e.target.value })} />
                </Stack>
                <TextField label="Email (optional)" type="email" size="small" value={data.customer ? (data.customer.email || '') : customer.email} InputProps={{ readOnly: Boolean(data.customer) }} inputProps={{ maxLength: 254 }} onChange={e => setCustomer({ ...customer, email: e.target.value })} />
                <Typography variant="body2" color="text.secondary">This is a service order. No shipping address is required.</Typography>
              </Stack> : <Stack spacing={2}>
                <Typography fontWeight={600}>{data.product.title}</Typography>
                {data.product.variants.length > 1 && <TextField select label="Coach option" size="small" value={variantId} disabled={saving || generatingLink} onChange={e => { setVariantId(e.target.value); resetLink(); }}>{data.product.variants.map(item => <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>)}</TextField>}
                <FormControlLabel control={<Checkbox checked={withoutBloodTest} disabled={saving || generatingLink} onChange={e => { setWithoutBloodTest(e.target.checked); resetLink(); }} />} label="Without blood test — ₹1,000 discount" />
                <Box sx={{ p: 2, bgcolor: '#f6f8fc', borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between"><Typography>Product price</Typography><Typography>{rupees(variant?.price)}</Typography></Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography>Discount</Typography><Typography>−{rupees(discount)}</Typography></Stack>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}><Typography fontWeight={700}>Amount paid</Typography><Typography fontWeight={700}>{rupees(total)}</Typography></Stack>
                </Box>
                <TextField label="Payment option" size="small" value="Prepaid" InputProps={{ readOnly: true }} />
                <Stack spacing={1}>
                  <Button variant="outlined" onClick={generateLink} disabled={saving || generatingLink || Boolean(paymentLink) || !variant || total <= 0}>{generatingLink ? 'Generating Razorpay link…' : paymentLink ? 'Razorpay link generated' : `Generate Razorpay link · ${rupees(total)}`}</Button>
                  {paymentLink && <>
                    <TextField label="Razorpay payment link" size="small" value={paymentLink.paymentLink} InputProps={{ readOnly: true }} onFocus={e => e.target.select()} />
                    <Stack direction="row" spacing={1}><Button onClick={copyLink}>Copy link</Button><Button component="a" href={paymentLink.paymentLink} target="_blank" rel="noopener noreferrer">Open link</Button></Stack>
                    <Typography variant="caption" color="text.secondary">New links are sent by Razorpay SMS to {data.phone} for {rupees(paymentLink.amount)}. After payment, enter the Payment ID below.</Typography>
                  </>}
                  {linkMessage && <Typography variant="caption" role="status">{linkMessage}</Typography>}
                </Stack>
                <TextField label="Payment ID" required size="small" value={paymentId} disabled={saving || generatingLink} inputProps={{ maxLength: 120 }} onChange={e => { setPaymentId(e.target.value); setReceived(false); }} helperText="Enter the reference for the payment already received." />
                <FormControlLabel control={<Checkbox checked={received} disabled={saving || generatingLink} onChange={e => setReceived(e.target.checked)} />} label={`I confirm that ${rupees(total)} has been received for this order.`} />
                <Typography variant="caption" color="text.secondary">This records the prepaid payment in Shopify; it does not charge the customer or verify the payment with the gateway.</Typography>
              </Stack>}
            </>}
        </Stack>}
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 2 }}>
      <Button onClick={close} disabled={saving || generatingLink}>{completed ? 'Done' : 'Cancel'}</Button>
      {!loading && !completed && (data?.recovering ? <Button variant="contained" disabled={saving || generatingLink} onClick={submit}>{saving ? 'Checking…' : 'Check order status'}</Button>
        : !data?.product ? <Button onClick={load}>Retry</Button>
          : step === 0 ? <Button variant="contained" disabled={!validCustomer} onClick={() => setStep(1)}>Continue</Button>
            : <><Button disabled={saving || generatingLink} onClick={() => setStep(0)}>Back</Button><Button variant="contained" onClick={submit} disabled={saving || generatingLink || !received || !variant || total <= 0 || !/^[A-Za-z0-9][A-Za-z0-9._/-]{2,119}$/.test(paymentId.trim())}>{saving ? 'Creating order…' : `Create prepaid order · ${rupees(total)}`}</Button></>)}
    </DialogActions>
  </Dialog>;
}
