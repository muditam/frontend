import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Card,
  Typography,
  Stack,
  TextField,
  Divider,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Button,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

const BASE_STORE_URL = "https://muditam.com";
const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

function safeStr(v) {
  return v == null ? "" : String(v);
}

const UtmLinkGenerator = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Multi-select products
  const [selectedProducts, setSelectedProducts] = useState([]);

  // For each productId -> chosen variantId + qty
  const [variantByProduct, setVariantByProduct] = useState({});
  const [qtyByProduct, setQtyByProduct] = useState({});

  const [utm, setUtm] = useState({
    source: "LMS",
    medium: "BOB_Team_Whatsapp",
    campaign: user?.name || user?._id || "",
  });

  const [snack, setSnack] = useState(false);

  // -------------------------
  // Fetch Shopify products
  // -------------------------
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/utm/shopify-products`);

        console.log("✅ products payload:", res.data);

        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("❌ Failed to fetch products:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // -------------------------
  // When selectedProducts changes, auto-pick first variant + qty=1
  // -------------------------
  useEffect(() => {
    const nextVariantMap = { ...variantByProduct };
    const nextQtyMap = { ...qtyByProduct };

    // add defaults for new selections
    selectedProducts.forEach((p) => {
      const pid = safeStr(p.productId);
      if (!nextQtyMap[pid]) nextQtyMap[pid] = 1;

      if (!nextVariantMap[pid]) {
        // pick first variant (prefer available)
        const v =
          p.variants.find((x) => x.available) || p.variants[0] || null;
        if (v) nextVariantMap[pid] = safeStr(v.variantId);
      }
    });

    // remove stale keys for removed products
    const selectedSet = new Set(selectedProducts.map((p) => safeStr(p.productId)));
    Object.keys(nextVariantMap).forEach((pid) => {
      if (!selectedSet.has(pid)) delete nextVariantMap[pid];
    });
    Object.keys(nextQtyMap).forEach((pid) => {
      if (!selectedSet.has(pid)) delete nextQtyMap[pid];
    });

    setVariantByProduct(nextVariantMap);
    setQtyByProduct(nextQtyMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProducts]);

  // -------------------------
  // Build final link
  // -------------------------
  const generatedLink = useMemo(() => {
    if (!selectedProducts.length) return "";

    const params = new URLSearchParams();
    params.set("utm_source", utm.source);
    params.set("utm_medium", utm.medium);
    params.set("utm_campaign", utm.campaign);

    // 1 product -> product page link + variant query
    if (selectedProducts.length === 1) {
      const p = selectedProducts[0];
      const pid = safeStr(p.productId);
      const vId = safeStr(variantByProduct[pid] || "");
      const variantObj = p.variants.find((v) => safeStr(v.variantId) === vId);

      params.set("utm_term", p.title);

      if (variantObj) {
        params.set("variant", safeStr(variantObj.variantId));
        params.set("utm_content", variantObj.title);
      }

      return `${BASE_STORE_URL}/products/${p.handle}?${params.toString()}`;
    }

    // multi-product -> cart permalink with variants:qty
    // format: /cart/variant1:qty,variant2:qty
    const parts = [];
    selectedProducts.forEach((p) => {
      const pid = safeStr(p.productId);
      const vId = safeStr(variantByProduct[pid] || "");
      const qty = Math.max(1, Number(qtyByProduct[pid] || 1));

      if (vId) parts.push(`${vId}:${qty}`);
    });

    // if somehow variant not selected yet
    if (!parts.length) return "";

    params.set("utm_term", "Multi_Product_Cart");

    return `${BASE_STORE_URL}/cart/${parts.join(",")}?${params.toString()}`;
  }, [selectedProducts, utm, variantByProduct, qtyByProduct]);

  const copy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setSnack(true);
  };

  const open = () => {
    if (!generatedLink) return;
    window.open(generatedLink, "_blank");
  };

  // -------------------------
  // UI
  // -------------------------
  return (
    <Box sx={{ p: 3, maxWidth: 1000 }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        UTM / Cart Link Generator
      </Typography>

      <Card sx={{ p: 3, borderRadius: 2 }}>
        <Stack spacing={2.5}>
          {/* Products Multi-select */}
          <Stack spacing={1}>
            <Typography fontWeight={600}>Products (Multi Select)</Typography>

            <Autocomplete
              multiple
              options={products}
              value={selectedProducts}
              loading={loading}
              onChange={(e, newVal) => setSelectedProducts(newVal)}
              getOptionLabel={(opt) => opt?.title || ""}
              isOptionEqualToValue={(opt, val) =>
                safeStr(opt.productId) === safeStr(val.productId)
              }
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.title}
                    {...getTagProps({ index })}
                    key={safeStr(option.productId)}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search products..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Stack>

          {/* Variant UI */}
          {selectedProducts.length === 1 && (
            <Stack spacing={1}>
              <Typography fontWeight={600}>Variant (Single Product)</Typography>
              <Autocomplete
                options={selectedProducts[0]?.variants || []}
                value={
                  selectedProducts[0]?.variants?.find(
                    (v) =>
                      safeStr(v.variantId) ===
                      safeStr(variantByProduct[safeStr(selectedProducts[0].productId)])
                  ) || null
                }
                onChange={(e, v) => {
                  const pid = safeStr(selectedProducts[0].productId);
                  setVariantByProduct((p) => ({
                    ...p,
                    [pid]: v ? safeStr(v.variantId) : "",
                  }));
                }}
                getOptionLabel={(v) =>
                  `${v.title}${v.price ? ` — ₹${v.price}` : ""}${v.available ? "" : " (OOS)"}`
                }
                isOptionEqualToValue={(a, b) =>
                  safeStr(a.variantId) === safeStr(b.variantId)
                }
                renderInput={(params) => (
                  <TextField {...params} placeholder="Select variant..." />
                )}
              />
            </Stack>
          )}

          {selectedProducts.length > 1 && (
            <Stack spacing={1.5}>
              <Typography fontWeight={600}>Variants + Qty (Multi Product Cart)</Typography>

              {selectedProducts.map((p) => {
                const pid = safeStr(p.productId);
                const selectedVar =
                  p.variants.find((v) => safeStr(v.variantId) === safeStr(variantByProduct[pid])) ||
                  null;

                return (
                  <Card key={pid} sx={{ p: 2, borderRadius: 2, bgcolor: "#fafafa" }}>
                    <Stack spacing={1}>
                      <Typography fontWeight={600}>{p.title}</Typography>

                      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                        <Autocomplete
                          sx={{ flex: 1 }}
                          options={p.variants || []}
                          value={selectedVar}
                          onChange={(e, v) => {
                            setVariantByProduct((prev) => ({
                              ...prev,
                              [pid]: v ? safeStr(v.variantId) : "",
                            }));
                          }}
                          getOptionLabel={(v) =>
                            `${v.title}${v.price ? ` — ₹${v.price}` : ""}${v.available ? "" : " (OOS)"}`
                          }
                          isOptionEqualToValue={(a, b) =>
                            safeStr(a.variantId) === safeStr(b.variantId)
                          }
                          renderInput={(params) => (
                            <TextField {...params} label="Variant" />
                          )}
                        />

                        <TextField
                          sx={{ width: 140 }}
                          label="Qty"
                          type="number"
                          value={qtyByProduct[pid] || 1}
                          onChange={(e) => {
                            const n = Math.max(1, Number(e.target.value || 1));
                            setQtyByProduct((prev) => ({ ...prev, [pid]: n }));
                          }}
                          inputProps={{ min: 1 }}
                        />
                      </Stack>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          )}

          <Divider />

          {/* UTM fields */}
          <Typography fontWeight={700}>UTM Parameters</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="utm_source"
              value={utm.source}
              onChange={(e) => setUtm((p) => ({ ...p, source: e.target.value }))}
              fullWidth
            />
            <TextField
              label="utm_medium"
              value={utm.medium}
              onChange={(e) => setUtm((p) => ({ ...p, medium: e.target.value }))}
              fullWidth
            />
            <TextField
              label="utm_campaign"
              value={utm.campaign}
              onChange={(e) => setUtm((p) => ({ ...p, campaign: e.target.value }))}
              fullWidth
            />
          </Stack>

          <Divider />

          {/* Generated Link */}
          <Stack spacing={1}>
            <Typography fontWeight={600}>Generated Link</Typography>
            <TextField
              multiline
              minRows={3}
              value={generatedLink}
              fullWidth
              InputProps={{ readOnly: true }}
              placeholder="Select product(s) to generate link"
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={copy}
                disabled={!generatedLink}
                startIcon={<ContentCopyIcon />}
              >
                Copy
              </Button>
              <Button
                variant="contained"
                onClick={open}
                disabled={!generatedLink}
                startIcon={<OpenInNewIcon />}
              >
                Open
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Card>

      <Snackbar
        open={snack}
        autoHideDuration={2000}
        onClose={() => setSnack(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success">Link copied</Alert>
      </Snackbar>
    </Box>
  );
};

export default UtmLinkGenerator;
