import React, { useMemo, useState } from "react";
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  TextField,
  Chip,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function WhatsAppCartDrawer({
  open,
  onClose,
  chatWidthPx = 0,     // passed from chat drawer (520/620)
  phone10 = "",
  leadName = "",
}) {
  const steps = useMemo(() => ["Ordering", "Cart", "Payment"], []);
  const [activeStep, setActiveStep] = useState(0);

  // demo states (replace with your real cart/order states later)
  const [query, setQuery] = useState("");
  const [cartItems, setCartItems] = useState([
    { id: "p1", name: "Karela Jamun Fizz", qty: 1, price: 499 },
    { id: "p2", name: "Liver Fix", qty: 1, price: 599 },
  ]);

  const subtotal = useMemo(
    () => cartItems.reduce((s, it) => s + it.qty * it.price, 0),
    [cartItems]
  );

  const next = () => setActiveStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setActiveStep((s) => Math.max(0, s - 1));

  const incQty = (id) => {
    setCartItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x))
    );
  };

  const decQty = (id) => {
    setCartItems((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))
        .filter(Boolean)
    );
  };

  const removeItem = (id) => {
    setCartItems((prev) => prev.filter((x) => x.id !== id));
  };

  // ✅ Positioning:
  // Drawer is anchored "right", but shifted LEFT by chat drawer width
  // so it appears attached to the left side of the open chat drawer.
  const paperSx = {
    width: { xs: "100%", sm: 420, md: 460 },
    maxWidth: "100vw",
    display: "flex",
    flexDirection: "column",
    // key part:
    right: { xs: 0, sm: `${chatWidthPx}px`, md: `${chatWidthPx}px` },
    borderRight: "1px solid rgba(0,0,0,0.08)",
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      hideBackdrop
      ModalProps={{
        keepMounted: true,
        disableAutoFocus: true,
        disableEnforceFocus: true,
      }}
      PaperProps={{ sx: paperSx }}
    >
      {/* Header */}
      <Box sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
          Order / Cart
        </Typography>

        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="Close">
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 1 }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {leadName ? `${leadName} · ` : ""}{phone10 || "—"}
        </Typography>
      </Box>

      <Divider />

      {/* Stepper */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel sx={{ "& .MuiStepLabel-label": { fontWeight: 800, fontSize: 12 } }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Divider />

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "#FAFAFA" }}>
        {/* STEP 1: ORDERING */}
        {activeStep === 0 && (
          <Box>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Ordering</Typography>

            <TextField
              fullWidth
              size="small"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products to add…"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "#fff" } }}
            />

            <Paper variant="outlined" sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: "#fff" }}>
              <Typography sx={{ fontWeight: 800, mb: 0.75 }}>Quick Add</Typography>

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {[
                  { id: "p3", name: "ACV Effervescent", price: 549 },
                  { id: "p4", name: "Vitamin D3", price: 399 },
                  { id: "p5", name: "Shilajit", price: 799 },
                ].map((p) => (
                  <Chip
                    key={p.id}
                    label={`${p.name} · ₹${p.price}`}
                    onClick={() =>
                      setCartItems((prev) => {
                        const found = prev.find((x) => x.id === p.id);
                        if (found) return prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x));
                        return [...prev, { id: p.id, name: p.name, qty: 1, price: p.price }];
                      })
                    }
                    sx={{ fontWeight: 800 }}
                    variant="outlined"
                  />
                ))}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                (Connect this with your real product search later)
              </Typography>
            </Paper>
          </Box>
        )}

        {/* STEP 2: CART */}
        {activeStep === 1 && (
          <Box>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Cart</Typography>

            {cartItems.length === 0 ? (
              <Typography color="text.secondary">Cart is empty.</Typography>
            ) : (
              <Box sx={{ display: "grid", gap: 1 }}>
                {cartItems.map((it) => (
                  <Paper
                    key={it.id}
                    variant="outlined"
                    sx={{ p: 1.25, borderRadius: 2, bgcolor: "#fff" }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900 }} noWrap>
                          {it.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ₹{it.price} each
                        </Typography>
                      </Box>

                      <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => decQty(it.id)}
                          sx={{ minWidth: 34, px: 0 }}
                        >
                          -
                        </Button>
                        <Typography sx={{ fontWeight: 900, width: 24, textAlign: "center" }}>
                          {it.qty}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => incQty(it.id)}
                          sx={{ minWidth: 34, px: 0 }}
                        >
                          +
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="text"
                          onClick={() => removeItem(it.id)}
                          sx={{ fontWeight: 900, textTransform: "none" }}
                        >
                          Remove
                        </Button>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 0.75, display: "flex", justifyContent: "flex-end" }}>
                      <Typography sx={{ fontWeight: 900 }}>
                        ₹{it.qty * it.price}
                      </Typography>
                    </Box>
                  </Paper>
                ))}

                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, bgcolor: "#fff" }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography color="text.secondary">Subtotal</Typography>
                    <Typography sx={{ ml: "auto", fontWeight: 900 }}>₹{subtotal}</Typography>
                  </Box>
                </Paper>
              </Box>
            )}
          </Box>
        )}

        {/* STEP 3: PAYMENT */}
        {activeStep === 2 && (
          <Box>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Payment</Typography>

            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, bgcolor: "#fff" }}>
              <Typography sx={{ fontWeight: 800, mb: 0.75 }}>Summary</Typography>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography color="text.secondary">Total</Typography>
                <Typography sx={{ ml: "auto", fontWeight: 900 }}>₹{subtotal}</Typography>
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: "grid", gap: 1 }}>
                <Button variant="contained" sx={{ fontWeight: 900, textTransform: "none" }}>
                  Collect Payment (Prepaid)
                </Button>
                <Button variant="outlined" sx={{ fontWeight: 900, textTransform: "none" }}>
                  Mark as COD
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                (Hook these buttons to your actual order/payment flows)
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Footer controls */}
      <Box sx={{ p: 1.25, display: "flex", alignItems: "center", gap: 1, bgcolor: "#fff" }}>
        <Button
          variant="outlined"
          onClick={back}
          disabled={activeStep === 0}
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: "none", fontWeight: 900 }}
        >
          Back
        </Button>

        <Box sx={{ ml: "auto" }}>
          <Button
            variant="contained"
            onClick={next}
            disabled={activeStep === steps.length - 1}
            endIcon={<ArrowForwardIcon />}
            sx={{ textTransform: "none", fontWeight: 900 }}
          >
            Next
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
