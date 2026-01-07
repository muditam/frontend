// WhatsAppCartDrawer.jsx
import React from "react";
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

const STEPS = ["Ordering", "Cart", "Payment"];

export default function WhatsAppCartDrawer({
  open,
  onClose,
  phone,
  leadId,
  leadName,
}) {
  const [activeStep, setActiveStep] = React.useState(0);

  const goNext = () => setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Typography variant="body2">
            Configure ordering options for this customer.
          </Typography>
        );
      case 1:
        return (
          <Typography variant="body2">
            Review items in the cart and adjust quantities.
          </Typography>
        );
      case 2:
        return (
          <Typography variant="body2">
            Collect payment details and confirm the order.
          </Typography>
        );
      default:
        return null;
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
      }}
      PaperProps={{
        sx: {
          // narrower than main WhatsApp drawer so it looks like a cascading panel
          width: { xs: "80%", sm: 360, md: 380 },
          maxWidth: "100vw",
          display: "flex",
          flexDirection: "column",
          // small shadow overlap to visually stack it over WhatsAppChatDrawer
          boxShadow: 8,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <ShoppingCartIcon color="primary" />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
            Cart & Order
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {leadName || "Customer"} · {phone || "—"}
          </Typography>
        </Box>

        <Box sx={{ ml: "auto" }}>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Divider />

      {/* Steps */}
      <Box sx={{ px: 2, pt: 1 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, p: 2, overflowY: "auto" }}>
        {renderStepContent()}
      </Box>

      {/* Actions */}
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          onClick={goBack}
          disabled={activeStep === 0}
          sx={{ textTransform: "none" }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={goNext}
          disabled={activeStep === STEPS.length - 1}
          sx={{ textTransform: "none" }}
        >
          Next
        </Button>
      </Box>
    </Drawer>
  );
}
