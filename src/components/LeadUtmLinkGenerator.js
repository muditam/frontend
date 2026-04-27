import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  Grid,
  InputAdornment,
  IconButton,
  Divider,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  DeleteOutline as DeleteIcon,
} from "@mui/icons-material";

const API = "http://localhost:5001/api/shopify-catalog/products";
const DOMAIN = "https://muditam.com";

function buildCheckoutLink({
  items,
  agentName,
  agentCode,
  utmSource,
  utmMedium,
  utmCampaign,
  discount,
}) {
  const validItems = items.filter(
    (item) => item.variantId && Number(item.quantity) > 0
  );

  if (!validItems.length) return "";

  const cartPart = validItems
    .map((item) => `${item.variantId}:${item.quantity}`)
    .join(",");

  const params = new URLSearchParams();

  if (agentName) params.set("attributes[sales_agent]", agentName);
  if (agentCode) params.set("attributes[agent_code]", agentCode);
  if (utmSource) params.set("utm_source", utmSource);
  if (utmMedium) params.set("utm_medium", utmMedium);
  if (utmCampaign) params.set("utm_campaign", utmCampaign);
  if (agentCode) params.set("ref", agentCode);
  if (discount) params.set("discount", discount);

  return `${DOMAIN}/cart/${cartPart}?${params.toString()}`;
}

export default function LeadUtmLinkGenerator() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);

  const [agentName, setAgentName] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [utmSource, setUtmSource] = useState("sales-agent");
  const [utmMedium, setUtmMedium] = useState("lead-management");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [discount, setDiscount] = useState("");

  const [selectedItems, setSelectedItems] = useState([]);

  const fetchProducts = async (value = "") => {
    try {
      setLoading(true);
      setError("");

      const { data } = await axios.get(API, {
        params: {
          search: value || undefined,
          limit: 50,
        },
      });

      setProducts(data.products || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchProducts(search.trim());
    }, 350);

    return () => clearTimeout(t);
  }, [search]);

  const isVariantSelected = (variantId) => {
    return selectedItems.some((item) => item.variantId === variantId);
  };

  const toggleVariant = (product, variant) => {
    setSelectedItems((prev) => {
      const exists = prev.find((x) => x.variantId === variant.variantId);

      if (exists) {
        return prev.filter((x) => x.variantId !== variant.variantId);
      }

      return [
        ...prev,
        {
          productTitle: product.title,
          variantTitle: variant.displayName || variant.title,
          variantId: variant.variantId,
          price: variant.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (variantId, qty) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: Math.max(1, Number(qty || 1)) }
          : item
      )
    );
  };

  const removeItem = (variantId) => {
    setSelectedItems((prev) => prev.filter((x) => x.variantId !== variantId));
  };

  const checkoutLink = useMemo(() => {
    return buildCheckoutLink({
      items: selectedItems,
      agentName,
      agentCode,
      utmSource,
      utmMedium,
      utmCampaign,
      discount,
    });
  }, [
    selectedItems,
    agentName,
    agentCode,
    utmSource,
    utmMedium,
    utmCampaign,
    discount,
  ]);

  const copyLink = async () => {
    if (!checkoutLink) return;
    await navigator.clipboard.writeText(checkoutLink);
    alert("Link copied");
  };

  return (
    <Box sx={{ p: 2, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <Stack spacing={2.5}>
        <Paper
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
          }}
        >
          <Typography sx={{ fontSize: 22, fontWeight: 700, mb: 2.5, color: "#111827" }}>
            Product Checkout Link Generator
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                label="Expert Name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Expert Code"
                value={agentCode}
                onChange={(e) => setAgentCode(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                label="UTM Source"
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                label="UTM Medium"
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                label="UTM Campaign"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Discount Code"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
          }}
        >
          <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 2, color: "#111827" }}>
            Selected Products
          </Typography>

          {!selectedItems.length ? (
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>
              No variant selected
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {selectedItems.map((item) => (
                <Box
                  key={item.variantId}
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    p: 1.5,
                    backgroundColor: "#fff",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ md: "center" }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                        {item.productTitle}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: "#6b7280", mt: 0.35 }}>
                        {item.variantTitle}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: "#6b7280", mt: 0.35 }}>
                        Variant ID: {item.variantId} | ₹{Number(item.price || 0).toFixed(2)}
                      </Typography>
                    </Box>

                    <TextField
                      label="Qty"
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) => updateQty(item.variantId, e.target.value)}
                      sx={{ width: 110 }}
                    />

                    <IconButton color="error" onClick={() => removeItem(item.variantId)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          <Divider sx={{ my: 2.25 }} />

          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1.25, color: "#111827" }}>
            Generated Checkout Link
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="stretch">
            <TextField
              value={checkoutLink}
              fullWidth
              size="small"
              placeholder="Generated checkout link will appear here"
              InputProps={{
                readOnly: true,
                sx: {
                  height: 42,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
            />

            <Button
              variant="contained"
              startIcon={<CopyIcon />}
              onClick={copyLink}
              disabled={!checkoutLink}
              sx={{
                minWidth: 130,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                boxShadow: "none",
              }}
            >
              Copy Link
            </Button>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: 1.5,
            borderRadius: 3,
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
          }}
        >
          <TextField
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#9ca3af" }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                backgroundColor: "#fff",
              },
            }}
          />
        </Paper>

        {loading && (
          <Paper
            sx={{
              p: 4,
              borderRadius: 3,
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
              textAlign: "center",
            }}
          >
            <CircularProgress />
          </Paper>
        )}

        {!!error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && (
          <Grid container spacing={2}>
            {products.map((product) => (
              <Grid item xs={12} md={6} key={product.id}>
                <Accordion
                  expanded={expanded === product.id}
                  onChange={() =>
                    setExpanded((prev) => (prev === product.id ? null : product.id))
                  }
                  disableGutters
                  elevation={0}
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px !important",
                    overflow: "hidden",
                    backgroundColor: "#fff",
                    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: "#7b7b7b" }} />}
                    sx={{
                      px: 2,
                      py: 1.5,
                      minHeight: 78,
                      "& .MuiAccordionSummary-content": {
                        margin: "0 !important",
                      },
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                      <Box
                        component="img"
                        src={product.image || "https://via.placeholder.com/56?text=No+Image"}
                        alt={product.title}
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1.5,
                          objectFit: "cover",
                          border: "1px solid #f1f1f1",
                          backgroundColor: "#fff",
                          flexShrink: 0,
                        }}
                      />

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: 18,
                            color: "#222",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {product.title}
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: "#6b7280", mt: 0.25 }}>
                          {product.variants?.length || 0} variant(s)
                        </Typography>
                      </Box>
                    </Stack>
                  </AccordionSummary>

                  <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
                    <Grid container spacing={1.5}>
                      {(product.variants || []).map((variant) => {
                        const checked = isVariantSelected(variant.variantId);

                        return (
                          <Grid item xs={12} sm={6} key={variant.variantId}>
                            <Box
                              onClick={() =>
                                variant.availableForSale && toggleVariant(product, variant)
                              }
                              sx={{
                                border: checked
                                  ? "1.5px solid #111827"
                                  : "1px solid #dedede",
                                borderRadius: 2,
                                px: 2,
                                py: 1.75,
                                cursor: variant.availableForSale ? "pointer" : "not-allowed",
                                opacity: variant.availableForSale ? 1 : 0.55,
                                backgroundColor: checked ? "#fcfcfc" : "#fff",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                  borderColor: "#111827",
                                },
                              }}
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                spacing={2}
                              >
                                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                                  <Checkbox
                                    checked={checked}
                                    disableRipple
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => {
                                      if (variant.availableForSale) {
                                        toggleVariant(product, variant);
                                      }
                                    }}
                                    sx={{
                                      p: 0,
                                      pt: 0.25,
                                      color: "#666",
                                      "&.Mui-checked": {
                                        color: "#111827",
                                      },
                                    }}
                                  />

                                  <Box>
                                    <Typography
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: 18,
                                        color: "#222",
                                        lineHeight: 1.25,
                                      }}
                                    >
                                      {variant.displayName || variant.title}
                                    </Typography>

                                    <Typography
                                      sx={{
                                        mt: 2,
                                        fontSize: 14,
                                        color: "#6b7280",
                                      }}
                                    >
                                      {variant.inventoryQuantity} available
                                    </Typography>
                                  </Box>
                                </Stack>

                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: 16,
                                    color: "#222",
                                    whiteSpace: "nowrap",
                                    mt: 0.5,
                                  }}
                                >
                                  ₹{Number(variant.price || 0).toFixed(2)} INR
                                </Typography>
                              </Stack>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
    </Box>
  );
}
