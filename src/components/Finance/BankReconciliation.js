// TransactionsTable.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import TablePagination from "@mui/material/TablePagination";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

/** Columns */
const COLUMNS = [
  { key: "valueDate1", label: "Value Date" },
  { key: "valueDate2", label: "Value Date" },
  { key: "description", label: "Description" },
  { key: "refNo", label: "Ref No./Cheque No." },
  { key: "branchCode", label: "Branch Code" },
  { key: "debit", label: "Debit (Exp)" },
  { key: "credit", label: "Credit (income)" },
  { key: "balance", label: "Balance" },
  { key: "remark", label: "Remark" },
  { key: "orderIds", label: "Order Ids" }, 
];

const BASE_MIN_W = 140;
const REFNO_MIN_W = BASE_MIN_W * 2;  // 280
const DESC_MIN_W = BASE_MIN_W * 4;   // 560
const cellMinStyle = (key) =>
  key === "description"
    ? { minWidth: `${DESC_MIN_W}px` }
    : key === "refNo"
    ? { minWidth: `${REFNO_MIN_W}px` }
    : { minWidth: `${BASE_MIN_W}px` };

const EMPTY_ROW = () =>
  COLUMNS.reduce((acc, c) => {
    acc[c.key] = "";
    return acc;
  }, { __bg: "" });

/* ---------------- mapping helpers ---------------- */
const toDateInputValue = (v) => {
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
};

const mapBackendToFe = (item) => ({
  _id: item._id,
  valueDate1: item.valueDate ? toDateInputValue(item.valueDate) : "",
  valueDate2: item.txnDate ? toDateInputValue(item.txnDate) : "",
  description: item.description ?? "",
  refNo: item.refNoChequeNo ?? "",
  branchCode: item.branchCode ?? "",
  debit: item.debit ?? "",
  credit: item.credit ?? "",
  balance: item.balance ?? "",
  remark: item.remark ?? "",
  orderIds: item.orderIds ?? "",
  remarks3: item.remarks3 ?? "",
  __bg: item.rowColor ?? "", // persisted color
});

const mapFeToBackend = (row) => ({
  valueDate: row.valueDate1 || null,
  txnDate: row.valueDate2 || null,
  description: row.description ?? "",
  refNoChequeNo: row.refNo ?? "",
  branchCode: row.branchCode ?? "",
  debit: row.debit === "" ? null : row.debit,
  credit: row.credit === "" ? null : row.credit,
  balance: row.balance === "" ? null : row.balance,
  remark: row.remark ?? "",
  orderIds: row.orderIds ?? "",
  remarks3: row.remarks3 ?? "",
  rowColor: row.__bg || "",
});

/* ------------- EditableCell component (per-cell draft) ------------- */
function EditableCell({
  valueFromServer,
  type,
  placeholder,
  onCommit,         // (finalValue) => Promise|void
  onKeyDown,        // keyboard nav
  inputRef,
}) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState(valueFromServer ?? "");

  // When server value changes, only update if NOT focused (avoid overwriting draft)
  useEffect(() => {
    if (!focused) setLocalValue(valueFromServer ?? "");
  }, [valueFromServer, focused]);

  return (
    <input
      ref={inputRef}
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={async () => {
        setFocused(false);
        await onCommit(localValue); // save on blur
      }}
      onKeyDown={onKeyDown}
      className="w-full px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
      placeholder={placeholder}
      inputMode={type === "number" ? "decimal" : undefined}
    />
  );
}

/* ---------------- component ---------------- */
export default function TransactionsTable() {
  // server-backed pagination
  const [serverRows, setServerRows] = useState([]); // FE shape for current page
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(0); // MUI 0-based
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // selection (store ORIGINAL indices of serverRows)
  const [selected, setSelected] = useState(new Set());

  // Filters
  const [dateMin, setDateMin] = useState("");
  const [dateMax, setDateMax] = useState("");
  const [descFilter, setDescFilter] = useState("");
  const [remarksFilter, setRemarksFilter] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  // saving status by row (for small chip)
  const savingStateRef = useRef(new Map()); // origIdx -> 'idle'|'saving'|'saved'|'error'
  const [, force] = useState(0);
  const setRowStatus = (idx, st) => { savingStateRef.current.set(idx, st); force((n) => n + 1); };
  const rowStatus = (idx) => savingStateRef.current.get(idx) || "idle";

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page + 1));
    params.set("limit", String(rowsPerPage));
    if (dateMin) params.set("dateMin", dateMin);
    if (dateMax) params.set("dateMax", dateMax);

    const textParts = [];
    if (descFilter.trim()) textParts.push(descFilter.trim());
    if (remarksFilter.trim()) textParts.push(remarksFilter.trim());
    if (textParts.length) params.set("q", textParts.join(" "));

    if (amountMin !== "") params.set("amountMin", amountMin);
    if (amountMax !== "") params.set("amountMax", amountMax);

    return params.toString();
  }, [page, rowsPerPage, dateMin, dateMax, descFilter, remarksFilter, amountMin, amountMax]);

  const fetchPage = useCallback(async () => {
    const query = buildQuery();
    const resp = await fetch(`${API_BASE}/api/bank-entries?${query}`);
    const json = await resp.json();
    if (!json.ok) throw new Error(json.error || "Fetch failed");
    setTotal(json.total || 0);
    setServerRows((json.items || []).map(mapBackendToFe));
    savingStateRef.current = new Map();
    setSelected(new Set());
    force((n) => n + 1);
  }, [buildQuery]);

  useEffect(() => {
    fetchPage().catch((e) => console.error(e));
  }, [fetchPage]);

  const visibleIndex = useMemo(() => serverRows.map((_, i) => i), [serverRows]);
  const rowsToRender = useMemo(() => visibleIndex.map((i) => serverRows[i]), [visibleIndex, serverRows]);

  /** Save a single row (full payload) */
  const saveRow = async (origIdx, payloadOverride = null) => {
    try {
      setRowStatus(origIdx, "saving");
      const row = serverRows[origIdx];
      if (!row) return;
      const payload = payloadOverride ?? mapFeToBackend(row);
      let json;

      if (row._id) {
        const resp = await fetch(`${API_BASE}/api/bank-entries/${row._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        json = await resp.json();
        if (!json.ok) throw new Error(json.error || "Update failed");
      } else {
        const resp = await fetch(`${API_BASE}/api/bank-entries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        json = await resp.json();
        if (!json.ok) throw new Error(json.error || "Create failed");
      }

      setServerRows((prev) => {
        const next = [...prev];
        // merge server-normalized item, preserve existing __bg until server echoes rowColor
        const merged = { ...next[origIdx], ...mapBackendToFe(json.item) };
        if (payload.rowColor !== undefined && payload.rowColor !== merged.__bg) {
          merged.__bg = payload.rowColor || "";
        }
        next[origIdx] = merged;
        return next;
      });

      setRowStatus(origIdx, "saved");
      setTimeout(() => {
        if (rowStatus(origIdx) === "saved") setRowStatus(origIdx, "idle");
      }, 600);
    } catch (e) {
      console.error("saveRow error:", e);
      setRowStatus(origIdx, "error");
    }
  };

  /** Commit a single cell (only that field) */
  const commitCell = async (origIdx, key, finalValue) => {
    const full = { ...serverRows[origIdx], [key]: finalValue };
    setServerRows((prev) => {
      const next = [...prev];
      next[origIdx] = full;
      return next;
    });
    await saveRow(origIdx, mapFeToBackend(full));
  };

  const addRow = () => {
    setServerRows((prev) => [{ ...EMPTY_ROW() }, ...prev]);
    setPage(0);
    // focus first editable cell quickly
    setTimeout(() => focusCell(0, 2), 0);
  };

  const deleteRow = async (origIdx) => {
    const row = serverRows[origIdx];
    if (row?._id) {
      try {
        const resp = await fetch(`${API_BASE}/api/bank-entries/${row._id}`, { method: "DELETE" });
        const json = await resp.json();
        if (!json.ok) throw new Error(json.error || "Delete failed");
      } catch (e) {
        console.error(e);
      }
    }
    setServerRows((prev) => prev.filter((_, i) => i !== origIdx));
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(origIdx);
      return n;
    });
  };

  // Upload to server so it persists across refresh
  const fileInputRef = useRef(null);
  const triggerUpload = () => fileInputRef.current?.click();
  const handleFile = async (file) => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch(`${API_BASE}/api/bank-entries/upload`, { method: "POST", body: form });
      const json = await resp.json();
      if (!json.ok) throw new Error(json.error || "Upload failed");
      await fetchPage();
    } catch (e) {
      console.error("Upload error:", e);
      alert(e.message || "Upload failed");
    }
  };
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
    e.target.value = "";
  };

  // keyboard grid nav
  const inputsGridRef = useRef({});
  const setInputRef = (r, c) => (el) => {
    inputsGridRef.current[`${r}-${c}`] = el;
  };
  const focusCell = (r, c) => {
    const el = inputsGridRef.current[`${r}-${c}`];
    if (el) el.focus();
  };
  const onKeyDown = (e, r, c) => {
    const lastColIdx = COLUMNS.length - 1 + 2; // +2 for checkbox and row number columns
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) focusCell(Math.max(0, r - 1), c);
      else focusCell(Math.min(rowsToRender.length - 1, r + 1), c);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(Math.min(rowsToRender.length - 1, r + 1), c);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(Math.max(0, r - 1), c);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusCell(r, Math.min(lastColIdx, c + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusCell(r, Math.max(0, c - 1));
    }
  };

  // selection helpers (use ORIGINAL indices)
  const toggleRow = (origIdx) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(origIdx)) n.delete(origIdx);
      else n.add(origIdx);
      return n;
    });
  };
  const toggleAll = (checked) => {
    if (checked) setSelected(new Set(visibleIndex));
    else setSelected(new Set());
  };
  const allSelected = visibleIndex.length > 0 && selected.size === visibleIndex.length;
  const someSelected = selected.size > 0 && !allSelected;

  // apply lighter colors & persist
  const LIGHT_GREEN = "#DCFCE7"; // tailwind emerald-100
  const LIGHT_RED = "#FEE2E2";   // tailwind red-100

  const saveRowColor = async (origIdx, hex) => {
    const row = serverRows[origIdx];
    if (!row?._id) return; // skip unsaved rows
    try {
      const resp = await fetch(`${API_BASE}/api/bank-entries/${row._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowColor: hex }),
      });
      const json = await resp.json();
      if (!json.ok) throw new Error(json.error || "Color save failed");
      setServerRows((prev) => {
        const next = [...prev];
        next[origIdx] = { ...next[origIdx], ...mapBackendToFe(json.item) };
        return next;
      });
    } catch (e) {
      console.error("Color save error:", e);
    }
  };

  const applyRowColor = (hex) => {
    if (!selected.size) return;
    setServerRows((prev) => {
      const next = [...prev];
      selected.forEach((origIdx) => {
        if (next[origIdx]) next[origIdx].__bg = hex;
      });
      return next;
    });
    selected.forEach((origIdx) => saveRowColor(origIdx, hex));
  };
  const clearRowColor = () => applyRowColor("");

  // pagination
  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const StatusChip = ({ status }) => {
    const map = { idle: "", saving: "⏳", saved: "✅", error: "⚠️" };
    return <span className="text-xs opacity-70">{map[status] || ""}</span>;
  };
  const Swatch = ({ color, onClick, title }) => (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-md border shadow-sm"
      style={{ background: color }}
    />
  );

  return (
    <div className="w-full p-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={addRow}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50"
            title="Add a new row (at top)"
          >
            + Add Row
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            onClick={triggerUpload}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50"
            title="Upload Sheet (CSV/XLSX)"
          >
            📄 Upload Sheet
          </button>

          {/* Color controls (lighter shades) */}
          <div className="flex items-center gap-2 ml-2">
            <Swatch color={LIGHT_GREEN} onClick={() => applyRowColor(LIGHT_GREEN)} title="Apply to selected" />
            <Swatch color={LIGHT_RED} onClick={() => applyRowColor(LIGHT_RED)} title="Apply to selected" />
            <button
              onClick={clearRowColor}
              className="px-2 py-1 rounded-lg border hover:bg-gray-50"
              title="Clear color from selected rows"
            >
              ⟲
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">From</span>
            <input
              type="date"
              value={dateMin}
              onChange={(e) => setDateMin(e.target.value)}
              className="px-2 py-1 border rounded-lg"
            />
            <span className="text-sm text-gray-600">To</span>
            <input
              type="date"
              value={dateMax}
              onChange={(e) => setDateMax(e.target.value)}
              className="px-2 py-1 border rounded-lg"
            />
          </div>

          <input
            type="text"
            placeholder="Description contains…"
            value={descFilter}
            onChange={(e) => setDescFilter(e.target.value)}
            className="px-2 py-1 border rounded-lg min-w-[200px]"
          />
          <input
            type="text"
            placeholder="Remarks contains…"
            value={remarksFilter}
            onChange={(e) => setRemarksFilter(e.target.value)}
            className="px-2 py-1 border rounded-lg min-w-[200px]"
          />
          <input
            type="number"
            placeholder="Amount min"
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
            className="px-2 py-1 border rounded-lg w-28"
          />
          <input
            type="number"
            placeholder="Amount max"
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
            className="px-2 py-1 border rounded-lg w-28"
          />

          <button
            onClick={() => { setPage(0); fetchPage().catch((e) => console.error(e)); }}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50"
            title="Apply server filters"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setDateMin(""); setDateMax(""); setDescFilter(""); setRemarksFilter("");
              setAmountMin(""); setAmountMax(""); setPage(0);
              fetchPage().catch((e) => console.error(e));
            }}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50"
            title="Clear all filters"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {/* Select-all */}
              <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="px-3 py-2 text-left">#</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-3 py-2 text-left whitespace-nowrap" style={cellMinStyle(c.key)}>
                  {c.label}
                </th>
              ))} 
            </tr>
          </thead>
          <tbody>
            {rowsToRender.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 3} className="px-3 py-6 text-center text-gray-500">
                  No rows on this page.
                </td>
              </tr>
            ) : (
              rowsToRender.map((row, rIdx) => {
                const origIdx = visibleIndex[rIdx];
                const status = rowStatus(origIdx);
                const isChecked = selected.has(origIdx);

                return (
                  <tr key={row._id || `local-${origIdx}`} className="border-t" style={{ background: row.__bg || "" }}>
                    {/* checkbox */}
                    <td className="px-3 py-2 sticky left-0 bg-white">
                      <input type="checkbox" checked={isChecked} onChange={() => toggleRow(origIdx)} />
                    </td>

                    {/* # */}
                    <td className="px-3 py-2 sticky left-0 bg-white">
                      {page * rowsPerPage + rIdx + 1}
                    </td>

                    {/* cells */}
                    {COLUMNS.map((c, cIdx) => {
                      const isDate = c.key === "valueDate1" || c.key === "valueDate2";
                      const gridColIndex = cIdx + 2; // +2 for checkbox + #
                      return (
                        <td key={c.key} className="px-2 py-2" style={cellMinStyle(c.key)}>
                          <EditableCell
                            inputRef={setInputRef(rIdx, gridColIndex)}
                            type={isDate ? "date" : (["debit","credit","balance"].includes(c.key) ? "number" : "text")}
                            valueFromServer={row[c.key] ?? ""}
                            placeholder={c.label}
                            onCommit={(finalValue) => commitCell(origIdx, c.key, finalValue)}
                            onKeyDown={(e) => onKeyDown(e, rIdx, gridColIndex)}
                          />
                        </td>
                      );
                    })}

                    
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-2">
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100, 250, 500]}
          labelRowsPerPage="Rows per page:"
          showFirstButton
          showLastButton
        />
      </div>
    </div>
  );
}

