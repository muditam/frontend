import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";

// =====================================
// Helpers & Formatting
// =====================================
function normalizePhone(phone) {
  if (!phone) return "";
  const d = String(phone).replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : d;
}

function monthDiff(baseISO, dateISO) {
  const s = new Date(baseISO);
  const d = new Date(dateISO);
  s.setDate(1);
  d.setDate(1);
  return (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth());
}

function firstOfMonth(iso) {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function monthLabelFromIndex(baseISO, idx) {
  if (!baseISO) return "";
  const base = new Date(baseISO);
  const y = base.getFullYear();
  const m = base.getMonth();
  const dt = new Date(y, m + idx, 1);
  // e.g., Oct 24
  return dt.toLocaleString("en-US", { month: "short" }) + " " + String(dt.getFullYear()).slice(-2);
}

// =====================================
// Span from schema's product.month
// Supported values (case-insensitive):
// "10 Days", "20 Days"  -> 1 (treated as 1 month block on grid)
// "1 Month", "2 Month", "3 Month", "4 Month", "6 Month"
// =====================================
function spanFromSchemaMonth(monthField) {
  if (!monthField || typeof monthField !== "string") return 1;
  const t = monthField.trim().toLowerCase();

  if (t.includes("day")) return 1; // visual minimum
  const m = t.match(/(\d+)\s*month/);
  if (m) {
    const n = parseInt(m[1], 10);
    return isNaN(n) || n < 1 ? 1 : n;
  }
  return 1;
}

// Abbreviation for product label column (e.g., "Karela Jamun Fizz" -> "KJF")
function productAbbr(title) {
  if (!title) return "";
  return String(title)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ordinal text (1 -> 1st, 2 -> 2nd, 3 -> 3rd, 4 -> 4th, ...)
function ordinal(n) {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

// =====================================
// Coverage builder
// - Uses product.month to span blocks across month columns
// - Color by ORDER, but we use a single light color (not bright green) per block
// - Also compute each product's first month index (for "Start Date" column)
// =====================================
function buildCoverage(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return { baseISO: null, maxIndex: -1, blocks: {}, products: [], starts: {} };
  }
  const sorted = [...orders].sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
  const baseISO = firstOfMonth(sorted[0].orderDate);

  let maxIndex = -1;
  const blocks = {};    // productTitle -> [{ start, span, orderSeq, amount, items, cohort }]
  const productSet = new Set();
  const starts = {};    // productTitle -> first month index seen

  sorted.forEach((o, idx) => {
    const orderSeq = idx + 1; // global 1-based sequence across all orders
    const idxMonth = monthDiff(baseISO, o.orderDate);

    (o.productsOrdered || []).forEach((it) => {
      const productTitle = (it.title || it.sku || "").trim();
      if (!productTitle) return;

      const span = spanFromSchemaMonth(it.month);
      productSet.add(productTitle);

      if (starts[productTitle] === undefined || idxMonth < starts[productTitle]) {
        starts[productTitle] = idxMonth;
      }
      if (!blocks[productTitle]) blocks[productTitle] = [];
      blocks[productTitle].push({
        start: idxMonth,
        span: Math.max(1, Number(span) || 1),
        orderSeq,
        amount: Number(o.amount || 0),
        items: (o.productsOrdered || []).length,
        cohort: it.cohort || "",
      });

      const lastIdx = idxMonth + Math.max(1, Number(span) || 1) - 1;
      if (lastIdx > maxIndex) maxIndex = lastIdx;
    });
  });

  const products = Array.from(productSet).sort();
  return { baseISO, maxIndex, blocks, products, starts };
}

function computeStats(orders) {
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const aov = totalOrders ? Math.round((totalSpent / totalOrders) * 100) / 100 : 0;
  return { totalOrders, totalSpent, aov };
}

function computeExpiry(blocks, baseISO) {
  if (!baseISO) return { expiring: [], finished: [], currentIdx: 0 };
  const now = new Date();
  const currentIdx = monthDiff(firstOfMonth(baseISO), now.toISOString());
  const expiring = [];
  const finished = [];
  Object.keys(blocks).forEach((p) => {
    const lastMonth = blocks[p].reduce((mx, b) => Math.max(mx, b.start + b.span - 1), -1);
    if (lastMonth === currentIdx) expiring.push(p);
    if (lastMonth > -1 && lastMonth < currentIdx) finished.push(p);
  });
  return { expiring, finished, currentIdx };
}

// =====================================
// Timeline (table-style like your mock)
// Layout:
//  [Product] [Start Date] [Jul] [Aug] [Sep] [Oct] [Nov] ...
//  [       ] [          ]  M0     M1     M2     M3     M4 ...
// =====================================
function Timeline({ baseISO, span, blocks, products, starts }) {
  const colW = 140;                               // column width to match mock feel
  const minWidth = 2 * colW + colW * span;        // product + start + months
  const BAR_COLOR = "#E8F0FE";                    // light color (not green)
  const BAR_BORDER = "#90CAF9";

  return (
    <Box sx={{ overflowX: "auto", borderRadius: 2 }}>
      {/* Header Row: Month names (Jul, Aug, ...) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `140px 140px repeat(${span}, ${colW}px)`,
          gap: 1,
          minWidth,
          px: 0.5,
        }}
      >
        <Box sx={{ fontWeight: 700, textAlign: "left", p: 1 }}>Product</Box>
        <Box sx={{ fontWeight: 700, textAlign: "left", p: 1 }}>Start Date</Box>
        {Array.from({ length: span }).map((_, i) => (
          <Box key={`mname-${i}`} sx={{ textAlign: "center", p: 1, fontWeight: 700 }}>
            {baseISO ? monthLabelFromIndex(baseISO, i).split(" ")[0] : ""}
          </Box>
        ))}
      </Box>

      {/* Subheader Row: M0..Mx */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `140px 140px repeat(${span}, ${colW}px)`,
          gap: 1,
          minWidth,
          mb: 1,
          px: 0.5,
        }}
      >
        <Box sx={{ p: 1 }} />
        <Box sx={{ p: 1 }} />
        {Array.from({ length: span }).map((_, i) => (
          <Box key={`midx-${i}`} sx={{ textAlign: "center", p: 1, color: "#555" }}>{`M${i}`}</Box>
        ))}
      </Box>

      {/* Product Rows */}
      {products.map((p) => (
        <Box
          key={p}
          sx={{
            display: "grid",
            gridTemplateColumns: `140px 140px repeat(${span}, ${colW}px)`,
            gap: 1,
            minWidth,
            alignItems: "center",
            px: 0.5,
            mb: 0.5,
          }}
        >
          {/* Left columns */}
          <Box sx={{ fontWeight: 700, p: 1 }}>{productAbbr(p)}</Box>
          <Box sx={{ p: 1, color: "#555" }}>
            {baseISO && starts[p] !== undefined ? monthLabelFromIndex(baseISO, starts[p]) : "—"}
          </Box>

          {/* Month cells & merged bars */}
          {Array.from({ length: span }).map((_, i) => {
            const block = blocks[p]?.find((b) => b.start === i);
            if (block) {
              const labelMonths = block.span === 1 ? "1 Month" : `${block.span} Month`;
              const txt = `${ordinal(block.orderSeq)} Order- ${productAbbr(p)}- ${labelMonths}`;
              return (
                <Box
                  key={`${p}-${i}`}
                  sx={{
                    gridColumn: `span ${block.span}`,
                    height: 40,
                    bgcolor: BAR_COLOR,
                    border: `1px solid ${BAR_BORDER}`,
                    display: "flex",
                    alignItems: "center",
                    px: 1,
                    fontSize: 12,
                    borderRadius: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={txt}
                >
                  {txt}
                </Box>
              );
            }
            // Skip interior cells of a spanned block
            if (blocks[p]?.some((b) => i > b.start && i < b.start + b.span)) {
              return null;
            }
            // Empty cell
            return (
              <Box
                key={`${p}-${i}`}
                sx={{ height: 40, border: "1px dashed #e0e0e0", bgcolor: "#fff" }}
              />
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

// =====================================
// Section + Container
// =====================================
export function CustomerRetentionSection({ customerName = "Customer", orders = [] }) {
  const { baseISO, maxIndex, blocks, products, starts } = buildCoverage(orders);

  // Span goes up to CURRENT month index (no extra future month)
  const now = new Date();
  const span = baseISO ? Math.max(maxIndex, monthDiff(firstOfMonth(baseISO), now.toISOString())) + 1 : 0;

  const { totalOrders, totalSpent, aov } = computeStats(orders);
  const { expiring, finished } = computeExpiry(blocks, baseISO);

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 6 }}>
      <CardContent>
        {/* Header + KPIs */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Retention Overview — {customerName}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={`Total Orders: ${totalOrders}`} />
            <Chip size="small" label={`Total Spent: ₹${totalSpent}`} />
            <Chip size="small" label={`AOV: ₹${aov}`} />
          </Stack>
        </Stack>

        {/* Expiry states */}
        {expiring.length > 0 && (
          <Typography variant="body2" sx={{ mb: 0.5, color: "#D84315", fontWeight: 700 }}>
            About to finish this month: {expiring.join(", ")}
          </Typography>
        )}
        {finished.length > 0 && (
          <Typography variant="body2" sx={{ mb: 1.5, color: "#6D6D6D", fontWeight: 600 }}>
            Already finished: {finished.join(", ")}
          </Typography>
        )}

        {/* Timeline with single horizontal scroll */}
        {baseISO && span > 0 ? (
          <Timeline
            baseISO={baseISO}
            span={span}
            blocks={blocks}
            products={products}
            starts={starts}
          />
        ) : (
          <Typography variant="body2" sx={{ color: "#757575" }}>
            No timeline data.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function CohortDataCustomer({
  contactNumber,
  customerName = "Customer",
  fetchOrders, // optional override
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const phone = useMemo(() => normalizePhone(contactNumber), [contactNumber]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function run() {
      if (!phone) {
        setOrders([]);
        return;
      }
      setLoading(true);
      setError("");
      try { 
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://muditamleads-14f32a10d7f7.herokuapp.com";
        const doFetch =
          fetchOrders ||
          (async (p) => {
            const res = await fetch(
              `${API_BASE}/cohart-dataApi/records?phone=${encodeURIComponent(p)}`,
              { signal: controller.signal }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          });

        const data = await doFetch(phone);
        if (!ignore) setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!ignore) setError(String(e.message || e));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    run();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [phone, fetchOrders]);

  return (
    <Box sx={{ p: 2, bgcolor: "#fafafa" }}>
      {loading ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading orders…</Typography>
        </Stack>
      ) : error ? (
        <Typography variant="body2" color="error">
          Failed to load: {error}
        </Typography>
      ) : (
        <CustomerRetentionSection customerName={customerName} orders={orders} />
      )}
    </Box>
  );
}

