import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import RefreshIcon from "@mui/icons-material/Refresh";
import { canAccessPaymentLinks } from "../utils/paymentLinkAccess";
import "./PaymentLinkPage.css";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

const requestIsRetryable = (error) => {
  if (typeof error?.response?.data?.retryable === "boolean") {
    return error.response.data.retryable;
  }
  const status = Number(error?.response?.status || 0);
  return !status || status === 408 || status === 425 || status === 429 || status >= 500;
};

const indiaDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";

const readUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export default function PaymentLinkPage() {
  const user = useMemo(() => readUser(), []);
  const today = useMemo(() => indiaDateKey(), []);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [activeTab, setActiveTab] = useState("unlinked");
  const [payments, setPayments] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [linkedPayments, setLinkedPayments] = useState([]);
  const [linkedTotalCount, setLinkedTotalCount] = useState(0);
  const [linkedTotalAmount, setLinkedTotalAmount] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [errorRetryable, setErrorRetryable] = useState(false);
  const [notice, setNotice] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [activePayment, setActivePayment] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [reason, setReason] = useState("");
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [candidateErrorStage, setCandidateErrorStage] = useState("");
  const [candidateRetryable, setCandidateRetryable] = useState(false);
  const [saving, setSaving] = useState(false);
  const paymentRequestSequence = useRef(0);
  const candidateRequestSequence = useRef(0);

  const loadPayments = useCallback(
    async ({ quiet = false } = {}) => {
      const requestSequence = paymentRequestSequence.current + 1;
      paymentRequestSequence.current = requestSequence;
      if (quiet) setRefreshing(true);
      else setLoading(true);
      setError("");
      setErrorRetryable(false);
      setNotice(null);
      try {
        const endpoint =
          activeTab === "linked"
            ? "/api/ticketing-integration/payment-links/manual-history"
            : "/api/ticketing-integration/payment-links";
        const response = await api.get(endpoint, {
          params: { dateFrom, dateTo },
        });
        if (requestSequence !== paymentRequestSequence.current) return;
        const items = Array.isArray(response.data?.items) ? response.data.items : [];
        if (activeTab === "linked") {
          setLinkedPayments(items);
          setLinkedTotalCount(Number(response.data?.total || items.length));
          setLinkedTotalAmount(Number(response.data?.totalAmount || 0));
          const reconciliation = response.data?.reconciliation;
          if (Number(reconciliation?.recovered || 0) > 0) {
            setNotice({
              severity: "success",
              message: `${reconciliation.recovered} pending payment operation${reconciliation.recovered === 1 ? " was" : "s were"} recovered from Shiptrack.`,
            });
          } else if (reconciliation?.warning) {
            setNotice({
              severity: "warning",
              message: `Linked history is available, but pending-operation recovery will retry later: ${reconciliation.warning}`,
            });
          }
        } else {
          setPayments(items);
          setTotalAmount(Number(response.data?.totalAmount || 0));
        }
      } catch (requestError) {
        if (requestSequence !== paymentRequestSequence.current) return;
        setError(
          requestError.response?.data?.error ||
            requestError.message ||
            `Could not load ${activeTab} payments.`
        );
        setErrorRetryable(requestIsRetryable(requestError));
      } finally {
        if (requestSequence === paymentRequestSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [activeTab, dateFrom, dateTo]
  );

  useEffect(() => {
    if (!canAccessPaymentLinks(user)) return undefined;
    loadPayments();
    const interval = window.setInterval(() => loadPayments({ quiet: true }), 30000);
    return () => window.clearInterval(interval);
  }, [loadPayments, user]);

  const currentPayments = activeTab === "linked" ? linkedPayments : payments;
  const currentTotalCount = activeTab === "linked" ? linkedTotalCount : payments.length;
  const currentTotalAmount = activeTab === "linked" ? linkedTotalAmount : totalAmount;

  const filteredPayments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return currentPayments;
    return currentPayments.filter((record) => {
      const payment = activeTab === "linked" ? record.payment || {} : record;
      const order = activeTab === "linked" ? record.order || {} : {};
      return `${payment.id || record.paymentId || ""} ${payment.phone || ""} ${
        payment.amount || ""
      } ${payment.method || ""} ${order.orderId || ""} ${order.customerName || ""} ${
        record.linkedBy?.name || ""
      }`
        .toLowerCase()
        .includes(normalized);
    });
  }, [activeTab, currentPayments, query]);

  const visiblePayments = useMemo(
    () =>
      filteredPayments.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [filteredPayments, page, rowsPerPage]
  );

  const visibleCandidates = useMemo(() => {
    const normalized = candidateQuery.trim().toLowerCase();
    if (!normalized) return candidates;
    return candidates.filter((candidate) =>
      `${candidate.orderId || ""} ${candidate.customerName || ""} ${
        candidate.contactNumber || ""
      } ${candidate.amount || ""} ${candidate.createdBy || ""}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [candidateQuery, candidates]);

  if (!canAccessPaymentLinks(user)) return <Navigate to="/403" replace />;

  const loadCandidateOrders = async (paymentContext) => {
    if (!paymentContext) return;
    const requestSequence = candidateRequestSequence.current + 1;
    candidateRequestSequence.current = requestSequence;
    setCandidateError("");
    setCandidateErrorStage("");
    setCandidateRetryable(false);
    setCandidateLoading(true);
    try {
      const response = await api.get(
        `/api/ticketing-integration/payment-links/${encodeURIComponent(
          paymentContext.id
        )}/order-candidates`,
        {
          params: {
            dateFrom: paymentContext._dateFrom,
            dateTo: paymentContext._dateTo,
          },
        }
      );
      if (requestSequence !== candidateRequestSequence.current) return;
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      setCandidates(items);
      if (paymentContext._targetId) {
        setSelectedCandidate(
          items.find(
            (candidate) =>
              String(candidate.targetId || "") === String(paymentContext._targetId) &&
              String(candidate.targetType || "") === String(paymentContext._targetType || "")
          ) || null
        );
      }
    } catch (requestError) {
      if (requestSequence !== candidateRequestSequence.current) return;
      setCandidateError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Could not load candidate orders."
      );
      setCandidateErrorStage("load");
      setCandidateRetryable(requestIsRetryable(requestError));
    } finally {
      if (requestSequence === candidateRequestSequence.current) {
        setCandidateLoading(false);
      }
    }
  };

  const openLinkDialog = (payment, auditRecord = null) => {
    const lookupDateFrom = auditRecord?.sourceDateFrom || dateFrom;
    const lookupDateTo = auditRecord?.sourceDateTo || dateTo;
    const paymentContext = {
      ...payment,
      _dateFrom: lookupDateFrom,
      _dateTo: lookupDateTo,
      _isChange: Boolean(auditRecord),
      _targetId: auditRecord?.targetId || "",
      _targetType: auditRecord?.targetType || "",
    };
    setActivePayment(paymentContext);
    setCandidates([]);
    setSelectedCandidate(null);
    setCandidateQuery("");
    setReason(auditRecord?.reason || "");
    setCandidateError("");
    setCandidateErrorStage("");
    setCandidateRetryable(false);
    loadCandidateOrders(paymentContext);
  };

  const linkPayment = async () => {
    if (!activePayment || !selectedCandidate || saving) return;
    const exactMatch = selectedCandidate.amountMatch && selectedCandidate.phoneMatch;
    if (!exactMatch && reason.trim().length < 3) {
      setCandidateError("Add a reason before linking an amount or phone mismatch.");
      setCandidateErrorStage("");
      setCandidateRetryable(false);
      return;
    }
    setSaving(true);
    setCandidateError("");
    setCandidateErrorStage("");
    setCandidateRetryable(false);
    try {
      const response = await api.post(
        `/api/ticketing-integration/payment-links/${encodeURIComponent(
          activePayment.id
        )}/link-order`,
        {
          targetType: selectedCandidate.targetType,
          targetId: selectedCandidate.targetId,
          reason: reason.trim(),
          dateFrom: activePayment._dateFrom || dateFrom,
          dateTo: activePayment._dateTo || dateTo,
        }
      );
      setActivePayment(null);
      await loadPayments({ quiet: true });
      if (response.data?.recovered) {
        setNotice({
          severity: "success",
          message: response.data.message || "The payment link was recovered after an interrupted response.",
        });
      }
    } catch (requestError) {
      setCandidateError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Could not link this payment."
      );
      setCandidateErrorStage("save");
      setCandidateRetryable(requestIsRetryable(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box className="payment-link-page">
      <Box className="payment-link-heading">
        <Box>
          <Typography className="payment-link-eyebrow">PAYMENT OPERATIONS</Typography>
          <Typography variant="h4">Link Payments</Typography>
          <Typography color="text.secondary">
            Review unlinked Razorpay payments and connect them to the correct order.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
          disabled={loading || refreshing}
          onClick={() => loadPayments({ quiet: true })}
        >
          Refresh
        </Button>
      </Box>

      <Paper className="payment-link-tabs">
        <Tabs
          value={activeTab}
          onChange={(_, nextTab) => {
            setActiveTab(nextTab);
            setQuery("");
            setPage(0);
            setError("");
          }}
        >
          <Tab value="unlinked" label="Unlinked" />
          <Tab value="linked" label="Linked from LMS" />
        </Tabs>
      </Paper>

      <Box className="payment-link-controls">
        <TextField
          label="From"
          type="date"
          size="small"
          value={dateFrom}
          onChange={(event) => {
            setDateFrom(event.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          inputProps={{ max: dateTo }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={dateTo}
          onChange={(event) => {
            setDateTo(event.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: dateFrom, max: today }}
        />
        <TextField
          className="payment-link-search"
          label={
            activeTab === "linked"
              ? "Search payment, phone, order, customer or employee"
              : "Search payment, phone, amount or method"
          }
          size="small"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
      </Box>

      {error && (
        <Alert
          severity="error"
          action={errorRetryable ? (
            <Button
              color="inherit"
              size="small"
              disabled={loading || refreshing}
              onClick={() => loadPayments({ quiet: currentPayments.length > 0 })}
            >
              Retry
            </Button>
          ) : null}
        >
          {error} Existing rows, if any, have been kept on screen.
        </Alert>
      )}
      {notice && <Alert severity={notice.severity}>{notice.message}</Alert>}

      <Box className="payment-link-metrics">
        <Paper className="payment-link-count-card">
          <Typography>{activeTab === "linked" ? "LINKED FROM LMS" : "UNLINKED PAYMENTS"}</Typography>
          <strong>{currentTotalCount}</strong>
          <span>
            {activeTab === "linked"
              ? "Manually linked through this LMS page"
              : "Updated automatically every 30 seconds"}
          </span>
        </Paper>
        <Paper className="payment-link-amount-card">
          <Typography>{activeTab === "linked" ? "LINKED VALUE" : "UNLINKED VALUE"}</Typography>
          <strong>{money(currentTotalAmount)}</strong>
          <span>
            {activeTab === "linked"
              ? "Filtered by the manual link completion date"
              : "For the selected payment date range"}
          </span>
        </Paper>
      </Box>

      <Paper className="payment-link-table-card">
        <Box className="payment-link-table-title">
          <Box>
            <Typography className="payment-link-eyebrow">RAZORPAY</Typography>
            <Typography variant="h6">
              {activeTab === "linked"
                ? "Payments manually linked from LMS"
                : "Payments awaiting an order link"}
            </Typography>
          </Box>
          <Typography color="text.secondary">
            {filteredPayments.length} result{filteredPayments.length === 1 ? "" : "s"}
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Payment ID</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>{activeTab === "linked" ? "Linked date" : "Settlement date"}</TableCell>
                {activeTab === "linked" && <TableCell>Linked by</TableCell>}
                <TableCell align="right">Order</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={activeTab === "linked" ? 8 : 7} align="center" className="payment-link-empty">
                    <CircularProgress size={28} />
                    <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
                      Loading {activeTab === "linked" ? "LMS-linked" : "unlinked"} payments…
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visiblePayments.map((record) => {
                  const payment = activeTab === "linked" ? record.payment || {} : record;
                  const paymentId = payment.id || record.paymentId;
                  const order = activeTab === "linked" ? record.order || {} : null;
                  return (
                  <TableRow key={paymentId} hover>
                    <TableCell className="payment-link-id">{paymentId}</TableCell>
                    <TableCell className="payment-link-money">{money(payment.amount)}</TableCell>
                    <TableCell>{payment.phone || "—"}</TableCell>
                    <TableCell>{payment.method || "—"}</TableCell>
                    <TableCell>
                      <span className="payment-link-status">
                        {activeTab === "linked" && record.operationStatus === "PENDING"
                          ? "CHANGE PENDING"
                          : payment.status || "LINKED"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatDateTime(
                        activeTab === "linked"
                          ? record.linkedAt
                          : payment.settlementDate || payment.createdAt
                      )}
                    </TableCell>
                    {activeTab === "linked" && (
                      <TableCell>
                        {record.linkedBy?.name || "—"}
                        {record.changeCount > 0 && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Changed {record.changeCount} time{record.changeCount === 1 ? "" : "s"}
                          </Typography>
                        )}
                      </TableCell>
                    )}
                    <TableCell align="right">
                      {activeTab === "linked" && order?.orderId && (
                        <Box sx={{ mb: 0.75 }}>
                          <Typography variant="body2" fontWeight={700}>{order.orderId}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {order.customerName || ""}
                          </Typography>
                        </Box>
                      )}
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<LinkIcon />}
                        disabled={activeTab === "linked" && record.operationStatus === "PENDING"}
                        onClick={() => openLinkDialog(
                          { ...payment, id: paymentId },
                          activeTab === "linked" ? record : null
                        )}
                      >
                        {activeTab === "linked" ? "Change" : "Link order"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
              {!loading && !visiblePayments.length && (
                <TableRow>
                  <TableCell colSpan={activeTab === "linked" ? 8 : 7} align="center" className="payment-link-empty">
                    No {activeTab === "linked" ? "manually linked" : "unlinked"} payments found for the selected dates.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredPayments.length}
          page={Math.min(page, Math.max(0, Math.ceil(filteredPayments.length / rowsPerPage) - 1))}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      <Dialog
        open={Boolean(activePayment)}
        onClose={() => !saving && setActivePayment(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {activePayment?._isChange ? "Change linked order" : "Link Order"}
          {activePayment && (
            <Typography variant="body2" color="text.secondary">
              {activePayment.id} · {money(activePayment.amount)} · {activePayment.phone || "No phone"}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            size="small"
            label="Search order, customer, phone, amount or creator"
            value={candidateQuery}
            onChange={(event) => setCandidateQuery(event.target.value)}
            sx={{ mb: 2 }}
          />
          {candidateError && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={candidateErrorStage && candidateRetryable ? (
                <Button
                  color="inherit"
                  size="small"
                  disabled={candidateLoading || saving}
                  onClick={() => candidateErrorStage === "load" ? loadCandidateOrders(activePayment) : linkPayment()}
                >
                  Retry
                </Button>
              ) : null}
            >
              {candidateError}
            </Alert>
          )}
          <Box className="payment-link-candidates">
            {candidateLoading ? (
              <Box className="payment-link-empty">
                <CircularProgress size={28} />
                <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
                  Finding and validating order candidates…
                </Typography>
              </Box>
            ) : (
              visibleCandidates.map((candidate) => {
                const selected = selectedCandidate?.id === candidate.id;
                const exactMatch = candidate.amountMatch && candidate.phoneMatch;
                return (
                  <button
                    type="button"
                    key={candidate.id}
                    className={`payment-link-candidate ${selected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setCandidateError("");
                    }}
                  >
                    <span>
                      <strong>{candidate.orderId || "No order ID"}</strong>
                      <small>{candidate.customerName || "Unknown customer"} · {candidate.contactNumber || "No phone"}</small>
                    </span>
                    <span>
                      <strong>{money(candidate.amount)}</strong>
                      <small>{candidate.transactionId || candidate.source}</small>
                    </span>
                    <span>
                      <strong>{candidate.createdBy || "—"}</strong>
                      <small>Created by</small>
                    </span>
                    <em className={exactMatch ? "match" : "mismatch"}>
                      {exactMatch
                        ? "Amount + phone match"
                        : candidate.amountMatch
                          ? "Phone mismatch"
                          : candidate.phoneMatch
                            ? "Amount mismatch"
                            : "Mismatch"}
                    </em>
                  </button>
                );
              })
            )}
            {!candidateLoading && !visibleCandidates.length && (
              <Box className="payment-link-empty">No orders match this search.</Box>
            )}
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 2 }}
            label={
              selectedCandidate && !(selectedCandidate.amountMatch && selectedCandidate.phoneMatch)
                ? "Reason required (minimum 3 characters)"
                : "Reason (optional)"
            }
            placeholder="For example: customer paid using another phone"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setCandidateError("");
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setActivePayment(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!selectedCandidate || saving}
            onClick={linkPayment}
          >
            {saving
              ? activePayment?._isChange
                ? "Saving change…"
                : "Linking…"
              : activePayment?._isChange
                ? "Save change"
                : "Link order"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
