import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";

const API_BASE = "http://localhost:5001";
const UPLOAD_ENDPOINT = `${API_BASE}/api/upload-image-from-url`;
const PUSH_ENDPOINT = `${API_BASE}/api/diet-image-migration/push-to-db`;
const DEFAULT_PREFIX = "Food-Items";
const DEFAULT_FALLBACK_IMAGE_URL =
  "https://s3.ap-southeast-2.wasabisys.com/60brands.com/invoices/No_image_available.svg.webp";
const PUSH_BATCH_SIZE = 100;

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

const NEW_IMAGE_ID_COLUMN = "New_Image_ID";
const NEW_BRAND_LOGO_COLUMN = "NewBrandLogo";

function getColumnKeyByTrim(headers, target) {
  const normalizedTarget = String(target || "").trim().toLowerCase();
  return headers.find((key) => String(key || "").trim().toLowerCase() === normalizedTarget);
}

function makeOperationKey(rowIndex, sourceColumn, targetColumn) {
  return `${rowIndex}::${sourceColumn}::${targetColumn}`;
}

function stripTransientColumns(data) {
  return data.map((row) => {
    const next = { ...row };
    delete next[NEW_IMAGE_ID_COLUMN];
    delete next[NEW_BRAND_LOGO_COLUMN];
    return next;
  });
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
  const [liveCounts, setLiveCounts] = useState({ success: 0, failed: 0, total: 0 });
  const [updatedRows, setUpdatedRows] = useState([]);
  const [failedRows, setFailedRows] = useState([]);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSummary, setPushSummary] = useState(null);
  const [retryAttemptCount, setRetryAttemptCount] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requiredColumnInfo = useMemo(() => {
    const idKey = getColumnKeyByTrim(headers, "_id");
    const foodKey = getColumnKeyByTrim(headers, "Food");
    const imageIdKey = getColumnKeyByTrim(headers, "imageId");
    const brandLogoKey = getColumnKeyByTrim(headers, "brandLogo");
    return {
      idKey,
      foodKey,
      imageIdKey,
      brandLogoKey,
      isValid: !!idKey && (!!imageIdKey || !!brandLogoKey),
    };
  }, [headers]);

  const displayRows = useMemo(() => {
    const source = updatedRows.length ? updatedRows : rows;
    return source;
  }, [rows, updatedRows]);

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    setMessage("");
    setError("");
    setUpdatedRows([]);
    setFailedRows([]);
    setPushSummary(null);
    setRetryAttemptCount(0);
    setProgress({ done: 0, total: 0 });
    setLiveCounts({ success: 0, failed: 0, total: 0 });

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

  const processRowIndexes = async ({
    sourceRows,
    targetIndexes,
    targetOperations,
    idKey,
    foodKey,
    mappings,
  }) => {
    const nextRows = sourceRows.map((r) => ({ ...r }));
    const failures = [];
    const tasks =
      targetOperations && targetOperations.length
        ? targetOperations
        : targetIndexes.flatMap((rowIndex) =>
            mappings.map(({ sourceKey, targetKey }) => ({ rowIndex, sourceKey, targetKey }))
          );
    const total = tasks.length;

    setProgress({ done: 0, total });
    setLiveCounts({ success: 0, failed: 0, total });

    await runPool(
      tasks,
      async ({ rowIndex, sourceKey, targetKey }) => {
        const row = nextRows[rowIndex];
        const oldUrl = String(row?.[sourceKey] || "").trim();
        const itemId = String(row?.[idKey] || "").trim();
        const food = String(row?.[foodKey] || "").trim();
        const outputRowNumber = rowIndex + 2;

        if (!oldUrl) {
          row[targetKey] = "";
          setLiveCounts((c) => ({ ...c, success: c.success + 1 }));
          setProgress((p) => ({ ...p, done: p.done + 1 }));
          return;
        }

        const ext = inferExtensionFromUrl(oldUrl);
        const fileNameForUpload = itemId ? `${itemId}${ext}` : `row-${outputRowNumber}${ext}`;

        try {
          row[targetKey] = await uploadWithRetry(
            {
              sourceUrl: oldUrl,
              fileName: fileNameForUpload,
              prefix: String(prefix || DEFAULT_PREFIX).trim(),
              deterministic: true,
            },
            3
          );
          setLiveCounts((c) => ({ ...c, success: c.success + 1 }));
        } catch (e) {
          const errorText = `ERROR_${e.message || "UPLOAD"}`;
          row[targetKey] = errorText;
          setLiveCounts((c) => ({ ...c, failed: c.failed + 1 }));
          failures.push({
            rowIndex,
            rowNumber: outputRowNumber,
            _id: itemId,
            Food: food,
            sourceColumn: sourceKey,
            targetColumn: targetKey,
            sourceUrl: oldUrl,
            error: errorText,
          });
        } finally {
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      },
      Number(concurrency) || 6
    );

    return { nextRows, failures, totalTasks: total };
  };

  const applyNewUrlsToSourceColumns = (inputRows, mappings) =>
    inputRows.map((row) => {
      const next = { ...row };
      mappings.forEach(({ sourceKey, targetKey }) => {
        const migratedUrl = String(next[targetKey] || "").trim();
        if (migratedUrl && !migratedUrl.startsWith("ERROR_")) {
          next[sourceKey] = migratedUrl;
        }
      });
      return next;
    });

  const handleProcess = async () => {
    setError("");
    setMessage("");

    if (!rows.length) {
      setError("Please upload a file first.");
      return;
    }

    if (!requiredColumnInfo.isValid) {
      setError('Missing required columns. File must include "_id" and either "imageId" or "brandLogo".');
      return;
    }

    if (!API_BASE) {
      setError("REACT_APP_API_BASE_URL is missing in frontend environment.");
      return;
    }

    const mappings = [
      requiredColumnInfo.imageIdKey
        ? {
            sourceKey: requiredColumnInfo.imageIdKey,
            targetKey: getColumnKeyByTrim(headers, NEW_IMAGE_ID_COLUMN) || NEW_IMAGE_ID_COLUMN,
          }
        : null,
      requiredColumnInfo.brandLogoKey
        ? {
            sourceKey: requiredColumnInfo.brandLogoKey,
            targetKey: getColumnKeyByTrim(headers, NEW_BRAND_LOGO_COLUMN) || NEW_BRAND_LOGO_COLUMN,
          }
        : null,
    ].filter(Boolean);

    const { idKey, foodKey } = requiredColumnInfo;
    setLoading(true);

    try {
      const targetIndexes = rows.map((_, idx) => idx);
      const { nextRows, failures, totalTasks } = await processRowIndexes({
        sourceRows: rows,
        targetIndexes,
        mappings,
        idKey,
        foodKey,
      });

      const mergedRows = applyNewUrlsToSourceColumns(nextRows, mappings);
      const outputHeaders = [...headers];
      if (!outputHeaders.includes(NEW_IMAGE_ID_COLUMN)) outputHeaders.push(NEW_IMAGE_ID_COLUMN);
      if (!outputHeaders.includes(NEW_BRAND_LOGO_COLUMN)) outputHeaders.push(NEW_BRAND_LOGO_COLUMN);
      mappings.forEach(({ targetKey }) => {
        if (!outputHeaders.includes(targetKey)) outputHeaders.push(targetKey);
      });
      const normalizedRows = mergedRows.map((r) => {
        const out = {};
        outputHeaders.forEach((h) => {
          out[h] = r[h] ?? "";
        });
        return out;
      });

      setUpdatedRows(normalizedRows);
      setFailedRows(
        failures.map(({ rowNumber, _id, Food, sourceColumn, targetColumn, sourceUrl, error }) => ({
          rowNumber,
          _id,
          Food,
          sourceColumn,
          targetColumn,
          sourceUrl,
          error,
        }))
      );
      setHeaders(outputHeaders);
      setPushSummary(null);
      setRetryAttemptCount(0);
      setMessage(`Completed. Success: ${totalTasks - failures.length}, Failed: ${failures.length}`);
    } catch (e) {
      setError(e.message || "Migration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    setError("");
    setMessage("");

    if (!failedRows.length) {
      setError("No failed rows to retry.");
      return;
    }

    if (!requiredColumnInfo.isValid) {
      setError('Missing required columns. File must include "_id" and either "imageId" or "brandLogo".');
      return;
    }

    const sourceRows = updatedRows.length ? updatedRows : rows;
    if (!sourceRows.length) {
      setError("No loaded rows to retry.");
      return;
    }

    const mappings = [
      requiredColumnInfo.imageIdKey
        ? {
            sourceKey: requiredColumnInfo.imageIdKey,
            targetKey: getColumnKeyByTrim(headers, NEW_IMAGE_ID_COLUMN) || NEW_IMAGE_ID_COLUMN,
          }
        : null,
      requiredColumnInfo.brandLogoKey
        ? {
            sourceKey: requiredColumnInfo.brandLogoKey,
            targetKey: getColumnKeyByTrim(headers, NEW_BRAND_LOGO_COLUMN) || NEW_BRAND_LOGO_COLUMN,
          }
        : null,
    ].filter(Boolean);
    const validMappingSet = new Set(mappings.map((m) => `${m.sourceKey}::${m.targetKey}`));
    const retryOperations = Array.from(
      new Map(
        failedRows
          .map((f) => {
            const rowIndex = Number(f?.rowNumber) - 2;
            const sourceColumn = String(f?.sourceColumn || "");
            const targetColumn = String(f?.targetColumn || "");
            const isRowValid = Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < sourceRows.length;
            const isMappingValid = validMappingSet.has(`${sourceColumn}::${targetColumn}`);
            if (!isRowValid || !isMappingValid) return null;
            return [
              makeOperationKey(rowIndex, sourceColumn, targetColumn),
              { rowIndex, sourceKey: sourceColumn, targetKey: targetColumn },
            ];
          })
          .filter(Boolean)
      ).values()
    );

    if (!retryOperations.length) {
      setError("Could not map failed uploads for retry. Please run migration again.");
      return;
    }

    setLoading(true);
    setRetryAttemptCount((n) => n + 1);

    try {
      const { nextRows, failures } = await processRowIndexes({
        sourceRows,
        targetIndexes: [],
        targetOperations: retryOperations,
        idKey: requiredColumnInfo.idKey,
        foodKey: requiredColumnInfo.foodKey,
        mappings,
      });

      const mergedRows = applyNewUrlsToSourceColumns(nextRows, mappings);
      const outputHeaders = [...headers];
      if (!outputHeaders.includes(NEW_IMAGE_ID_COLUMN)) outputHeaders.push(NEW_IMAGE_ID_COLUMN);
      if (!outputHeaders.includes(NEW_BRAND_LOGO_COLUMN)) outputHeaders.push(NEW_BRAND_LOGO_COLUMN);
      mappings.forEach(({ targetKey }) => {
        if (!outputHeaders.includes(targetKey)) outputHeaders.push(targetKey);
      });
      const normalizedRows = mergedRows.map((r) => {
        const out = {};
        outputHeaders.forEach((h) => {
          out[h] = r[h] ?? "";
        });
        return out;
      });

      const retryKeySet = new Set(
        retryOperations.map((op) => makeOperationKey(op.rowIndex, op.sourceKey, op.targetKey))
      );
      const untouchedFailures = failedRows.filter((f) => {
        const rowIndex = Number(f?.rowNumber) - 2;
        const sourceColumn = String(f?.sourceColumn || "");
        const targetColumn = String(f?.targetColumn || "");
        return !retryKeySet.has(makeOperationKey(rowIndex, sourceColumn, targetColumn));
      });
      const remainingFailures = failures.map(
        ({ rowNumber, _id, Food, sourceColumn, targetColumn, sourceUrl, error }) => ({
          rowNumber,
          _id,
          Food,
          sourceColumn,
          targetColumn,
          sourceUrl,
          error,
        })
      );
      const combinedFailures = [...untouchedFailures, ...remainingFailures];
      const retriedCount = retryOperations.length;
      const recovered = retriedCount - remainingFailures.length;

      setUpdatedRows(normalizedRows);
      setHeaders(outputHeaders);
      setFailedRows(combinedFailures);
      setPushSummary(null);
      setMessage(
        `Retry completed. Retried: ${retriedCount}, Recovered: ${recovered}, Remaining Failed: ${combinedFailures.length}`
      );
    } catch (e) {
      setError(e.message || "Retry failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseDefaultForFailed = () => {
    setError("");
    setMessage("");
    setPushSummary(null);

    if (!updatedRows.length) {
      setError("Run migration first.");
      return;
    }
    if (!failedRows.length) {
      setError("No failed rows left.");
      return;
    }
    if (retryAttemptCount < 1) {
      setError("Please run at least one retry attempt before using default image.");
      return;
    }

    const shouldUseDefault = window.confirm(
      `Use default image for ${failedRows.length} failed items?`
    );
    if (!shouldUseDefault) return;

    const nextRows = updatedRows.map((r) => ({ ...r }));
    failedRows.forEach((f) => {
      const rowIndex = Number(f?.rowNumber) - 2;
      const sourceColumn = String(f?.sourceColumn || "");
      const targetColumn = String(f?.targetColumn || "");
      if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= nextRows.length) return;
      if (!sourceColumn) return;
      nextRows[rowIndex][sourceColumn] = DEFAULT_FALLBACK_IMAGE_URL;
      if (targetColumn) nextRows[rowIndex][targetColumn] = DEFAULT_FALLBACK_IMAGE_URL;
    });

    setUpdatedRows(nextRows);
    setFailedRows([]);
    setMessage(
      `Applied default image to failed rows. You can now push all rows to database.`
    );
  };

  const downloadXlsx = (data, name) => {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "data");
    XLSX.writeFile(wb, name);
  };

  const handlePushToDatabase = async () => {
    setError("");
    setMessage("");
    setPushSummary(null);

    if (!updatedRows.length) {
      setError("Run migration first so we can preview updated data before pushing.");
      return;
    }

    if (!requiredColumnInfo.idKey) {
      setError('Missing "_id" column. Cannot push to database.');
      return;
    }

    const imageIdKey = requiredColumnInfo.imageIdKey;
    const brandLogoKey = requiredColumnInfo.brandLogoKey;
    const cleanedRows = stripTransientColumns(updatedRows);
    const payloadRows = cleanedRows
      .map((row) => {
        const id = String(row?.[requiredColumnInfo.idKey] || "").trim();
        if (!id) return null;
        return { _id: id, row };
      })
      .filter(Boolean);

    if (!payloadRows.length) {
      setError("No valid rows found to push.");
      return;
    }

    setPushLoading(true);
    try {
      const batches = [];
      for (let i = 0; i < payloadRows.length; i += PUSH_BATCH_SIZE) {
        batches.push(payloadRows.slice(i, i + PUSH_BATCH_SIZE));
      }

      let total = 0;
      let matched = 0;
      let modified = 0;
      const notFound = [];
      const errors = [];

      for (let i = 0; i < batches.length; i += 1) {
        const res = await fetch(PUSH_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ rows: batches[i] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.message || `Push failed on batch ${i + 1} (HTTP ${res.status})`);
        }
        total += Number(data.total || batches[i].length);
        matched += Number(data.matched || 0);
        modified += Number(data.modified || 0);
        notFound.push(...(Array.isArray(data.notFound) ? data.notFound : []));
        errors.push(...(Array.isArray(data.errors) ? data.errors : []));
      }

      setPushSummary({
        total,
        matched,
        modified,
        notFound,
        errors,
      });
      setMessage(
        `Database push completed in ${batches.length} batches. Matched: ${matched}, Modified: ${modified}`
      );
    } catch (e) {
      setError(e.message || "Failed to push to database.");
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "24px auto", padding: "0 16px" }}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Diet Planner Image Migration Admin</h2>
        <p style={{ marginTop: 4, color: "#475569" }}>
          Upload CSV/XLSX with <strong>_id</strong> and image URL in <strong>imageId</strong> and/or{" "}
          <strong>brandLogo</strong>. It uploads to Wasabi, writes migrated URLs into{" "}
          <strong>New_Image_ID</strong> and <strong>NewBrandLogo</strong>, replaces source URLs in preview,
          then lets you push to DB manually.
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
          <button
            onClick={handleRetryFailed}
            disabled={loading || !failedRows.length}
            style={{
              border: "1px solid #cbd5e1",
              background: loading || !failedRows.length ? "#f1f5f9" : "#fff",
              color: "#0f172a",
              padding: "8px 14px",
              borderRadius: 8,
              cursor: loading || !failedRows.length ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Please wait..." : `Retry Failed (${failedRows.length})`}
          </button>
          <button
            onClick={handleUseDefaultForFailed}
            disabled={loading || !failedRows.length || retryAttemptCount < 1}
            style={{
              border: "1px solid #fdba74",
              background: loading || !failedRows.length || retryAttemptCount < 1 ? "#f1f5f9" : "#fff7ed",
              color: "#9a3412",
              padding: "8px 14px",
              borderRadius: 8,
              cursor:
                loading || !failedRows.length || retryAttemptCount < 1 ? "not-allowed" : "pointer",
            }}
          >
            Use Default Image For Failed
          </button>
          <button
            onClick={handlePushToDatabase}
            disabled={pushLoading || loading || !updatedRows.length}
            style={{
              border: "none",
              background:
                pushLoading || loading || !updatedRows.length ? "#94a3b8" : "#047857",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 8,
              cursor: pushLoading || loading || !updatedRows.length ? "not-allowed" : "pointer",
            }}
          >
            {pushLoading ? "Pushing..." : "Push to Database"}
          </button>
        </div>

        {fileName && <p style={{ marginTop: 10, marginBottom: 6 }}>File: {fileName}</p>}
        {(requiredColumnInfo.imageIdKey || requiredColumnInfo.brandLogoKey) && (
          <p style={{ marginTop: 0, marginBottom: 6, color: "#475569" }}>
            Source image columns:{" "}
            <strong>
              {[requiredColumnInfo.imageIdKey, requiredColumnInfo.brandLogoKey].filter(Boolean).join(", ")}
            </strong>
          </p>
        )}
        {progress.total > 0 && (
          <p style={{ marginTop: 0, marginBottom: 6, color: "#334155" }}>
            Progress: {progress.done} / {progress.total}
          </p>
        )}
        {liveCounts.total > 0 && (
          <p style={{ marginTop: 0, color: "#0f766e" }}>
            Live Status: Success {liveCounts.success}, Failed {liveCounts.failed}, Remaining{" "}
            {Math.max(liveCounts.total - progress.done, 0)}
          </p>
        )}
        {message && <p style={{ color: "#047857", marginBottom: 0 }}>{message}</p>}
        {error && <p style={{ color: "#b91c1c", marginBottom: 0 }}>{error}</p>}
        {!!pushSummary && (
          <p style={{ color: "#0f172a", marginBottom: 0 }}>
            Push Summary: Total {pushSummary.total}, Matched {pushSummary.matched}, Modified{" "}
            {pushSummary.modified}, Not Found {pushSummary.notFound.length}, Errors {pushSummary.errors.length}
          </p>
        )}
      </div>

      {!!displayRows.length && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Preview (all rows) {updatedRows.length ? "- with replaced Wasabi URLs" : ""}</h3>
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
                {displayRows.map((row, idx) => (
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
              onClick={() =>
                downloadXlsx(stripTransientColumns(updatedRows), "diet-image-migration-updated.xlsx")
              }
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
