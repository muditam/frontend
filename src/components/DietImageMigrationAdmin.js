import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const UPLOAD_ENDPOINT = `${API_BASE}/api/upload-image-from-url`;
const DEFAULT_PREFIX = "diet-images-migration-v1";

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

function getColumnKeyByTrim(headers, target) {
  const normalizedTarget = String(target || "").trim().toLowerCase();
  return headers.find((key) => String(key || "").trim().toLowerCase() === normalizedTarget);
}

function inferExtensionFromUrl(url) {
  try {
    const clean = String(url || "").split("?")[0];
    const ext = clean.slice(clean.lastIndexOf(".")).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return ext;
  } catch (e) {
    // no-op: fallback below
  }
  return ".jpg";
}

async function runPool(items, worker, concurrency = 6) {
  const results = new Array(items.length);
  let index = 0;

  async function runner() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const size = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: size }, () => runner()));
  return results;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function uploadWithRetry(payload, maxAttempts = 3) {
  let lastError = new Error("Failed to upload");

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.url) return data.url;

      const statusText = data?.message || `HTTP ${res.status}`;
      lastError = new Error(statusText);

      if (!shouldRetryStatus(res.status) || attempt === maxAttempts) {
        throw lastError;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Failed to fetch");
      if (attempt === maxAttempts) throw lastError;
    }

    // Exponential backoff with small jitter: ~600ms, 1200ms, 2400ms
    const backoffMs = 600 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 150);
    await delay(backoffMs);
  }

  throw lastError;
}

const DietImageMigrationAdmin = () => {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [prefix, setPrefix] = useState(DEFAULT_PREFIX);
  const [concurrency, setConcurrency] = useState(6);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [updatedRows, setUpdatedRows] = useState([]);
  const [failedRows, setFailedRows] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requiredColumnInfo = useMemo(() => {
    const idKey = getColumnKeyByTrim(headers, "_id");
    const foodKey = getColumnKeyByTrim(headers, "Food");
    const imageKey = getColumnKeyByTrim(headers, "imageId");
    return { idKey, foodKey, imageKey, isValid: !!idKey && !!foodKey && !!imageKey };
  }, [headers]);

  const previewRows = useMemo(() => rows.slice(0, 8), [rows]);

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    setMessage("");
    setError("");
    setUpdatedRows([]);
    setFailedRows([]);

    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const parsedHeaders = parsed.length ? Object.keys(parsed[0]) : [];

      setFileName(file.name);
      setRows(parsed);
      setHeaders(parsedHeaders);
      setMessage(`Loaded ${parsed.length} rows from ${file.name}`);
    } catch (e) {
      setError("Could not parse file. Please upload CSV/XLSX with headers.");
    }
  };

  const handleProcess = async () => {
    setError("");
    setMessage("");

    if (!rows.length) {
      setError("Please upload a file first.");
      return;
    }

    if (!requiredColumnInfo.isValid) {
      setError('Missing required columns. File must include "_id", "Food", and "imageId".');
      return;
    }

    if (!API_BASE) {
      setError("REACT_APP_API_BASE_URL is missing in frontend environment.");
      return;
    }

    const { idKey, foodKey, imageKey } = requiredColumnInfo;
    const newImageKey = getColumnKeyByTrim(headers, "New_Image_ID") || "New_Image_ID";
    const total = rows.length;
    const nextRows = rows.map((r) => ({ ...r }));
    const failures = [];

    setLoading(true);
    setProgress({ done: 0, total });

    try {
      await runPool(
        nextRows,
        async (row, rowIndex) => {
          const oldUrl = String(row[imageKey] || "").trim();
          const itemId = String(row[idKey] || "").trim();
          const food = String(row[foodKey] || "").trim();

          if (!oldUrl) {
            row[newImageKey] = "";
            setProgress((p) => ({ ...p, done: p.done + 1 }));
            return;
          }

          const ext = inferExtensionFromUrl(oldUrl);
          const fileNameForUpload = itemId ? `${itemId}${ext}` : `row-${rowIndex + 2}${ext}`;

          try {
            row[newImageKey] = await uploadWithRetry(
              {
                sourceUrl: oldUrl,
                fileName: fileNameForUpload,
                prefix: String(prefix || DEFAULT_PREFIX).trim(),
                deterministic: true,
              },
              3
            );
          } catch (e) {
            row[newImageKey] = `ERROR_${e.message || "UPLOAD"}`;
            failures.push({
              rowNumber: rowIndex + 2,
              _id: itemId,
              Food: food,
              imageId: oldUrl,
              error: row[newImageKey],
            });
          } finally {
            setProgress((p) => ({ ...p, done: p.done + 1 }));
          }
        },
        Number(concurrency) || 6
      );

      const outputHeaders = headers.includes(newImageKey) ? headers : [...headers, newImageKey];
      const normalizedRows = nextRows.map((r) => {
        const out = {};
        outputHeaders.forEach((h) => {
          out[h] = r[h] ?? "";
        });
        return out;
      });

      setUpdatedRows(normalizedRows);
      setFailedRows(failures);
      setHeaders(outputHeaders);
      setMessage(
        `Completed. Success: ${normalizedRows.length - failures.length}, Failed: ${failures.length}`
      );
    } catch (e) {
      setError(e.message || "Migration failed.");
    } finally {
      setLoading(false);
    }
  };

  const downloadXlsx = (data, name) => {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "data");
    XLSX.writeFile(wb, name);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "24px auto", padding: "0 16px" }}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Diet Planner Image Migration Admin</h2>
        <p style={{ marginTop: 4, color: "#475569" }}>
          Upload CSV/XLSX with <strong>_id</strong>, <strong>Food</strong>, and{" "}
          <strong>imageId</strong>. This tool uploads images to your Wasabi folder and fills{" "}
          <strong>New_Image_ID</strong>.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} />
          <label>
            Prefix:
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              style={{ marginLeft: 8, padding: "6px 10px", minWidth: 240 }}
            />
          </label>
          <label>
            Concurrency:
            <input
              type="number"
              min={1}
              max={20}
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              style={{ marginLeft: 8, padding: "6px 10px", width: 80 }}
            />
          </label>
          <button
            onClick={handleProcess}
            disabled={loading || !rows.length}
            style={{
              border: "none",
              background: loading ? "#94a3b8" : "#2563eb",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Processing..." : "Start Migration"}
          </button>
        </div>

        {fileName && <p style={{ marginTop: 10, marginBottom: 6 }}>File: {fileName}</p>}
        {progress.total > 0 && (
          <p style={{ marginTop: 0, color: "#334155" }}>
            Progress: {progress.done} / {progress.total}
          </p>
        )}
        {message && <p style={{ color: "#047857", marginBottom: 0 }}>{message}</p>}
        {error && <p style={{ color: "#b91c1c", marginBottom: 0 }}>{error}</p>}
      </div>

      {!!previewRows.length && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Preview (first 8 rows)</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th
                      key={h}
                      style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left", background: "#f8fafc" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx}>
                    {headers.map((h) => (
                      <td key={`${idx}-${h}`} style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                        {String(row[h] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!!updatedRows.length && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Download Output</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => downloadXlsx(updatedRows, "diet-image-migration-updated.xlsx")}
              style={{ border: "1px solid #cbd5e1", background: "#fff", padding: "8px 12px", borderRadius: 8 }}
            >
              Download Updated File
            </button>
            <button
              disabled={!failedRows.length}
              onClick={() => downloadXlsx(failedRows, "diet-image-migration-failed.xlsx")}
              style={{
                border: "1px solid #cbd5e1",
                background: failedRows.length ? "#fff" : "#f1f5f9",
                padding: "8px 12px",
                borderRadius: 8,
                cursor: failedRows.length ? "pointer" : "not-allowed",
              }}
            >
              Download Failed Rows
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DietImageMigrationAdmin;
