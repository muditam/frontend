import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import "./RedcliffePriceDashboard.css";

const API_BASE = "http://localhost:5001"; // Replace with your actual API base URL

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const PRICE_CATEGORY_OPTIONS = [
  { value: "", label: "Select" },
  { value: "R1", label: "R1" },
  { value: "R2", label: "R2" },
  { value: "R4", label: "R4" },
  { value: "Home Collection Charges", label: "Home Collection Charges" },
];

const CATEGORY_DISCOUNTS = {
  R1: "40",
  R2: "20",
  R4: "25",
  "Home Collection Charges": "0",
};

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeNumber(value) {
  const raw = String(value ?? "").replace(/,/g, "").trim();
  if (!raw) return "";
  const number = Number(raw);
  return Number.isFinite(number) ? String(number) : "";
}

function toMoney(value) {
  const number = Number(normalizeNumber(value));
  if (!Number.isFinite(number)) return "";
  return number.toFixed(2);
}

function getDiscount(mrp, ourPrice, manualDiscount) {
  const normalizedManual = normalizeNumber(manualDiscount);
  const manual = Number(normalizedManual);
  if (normalizedManual !== "" && Number.isFinite(manual) && manual >= 0) {
    return Math.min(manual, 100).toFixed(2);
  }
  const mrpValue = Number(normalizeNumber(mrp));
  const normalizedPrice = normalizeNumber(ourPrice);
  const priceValue = Number(normalizedPrice);
  if (!mrpValue || normalizedPrice === "" || !Number.isFinite(priceValue) || priceValue > mrpValue) {
    return "0.00";
  }
  return (((mrpValue - priceValue) / mrpValue) * 100).toFixed(2);
}

function normalizePriceCategory(value) {
  const text = cleanText(value);
  const normalized = text.toLowerCase();
  if (!normalized) return "";
  if (normalized === "r1" || normalized.includes("routine")) return "R1";
  if (normalized === "r2" || normalized.includes("speciality") || normalized.includes("specialty")) return "R2";
  if (normalized === "r4" || normalized.includes("package")) return "R4";
  if (normalized.includes("home") || normalized.includes("collection")) return "Home Collection Charges";
  return PRICE_CATEGORY_OPTIONS.some((option) => option.value === text) ? text : "";
}

function getCategoryDiscount(category) {
  return CATEGORY_DISCOUNTS[normalizePriceCategory(category)] ?? "";
}

function normalizeCatalogItem(item) {
  const mrp = normalizeNumber(item.mrp ?? item.MRP ?? item.price);
  return {
    key: cleanText(item.code || item.id || item.name),
    code: cleanText(item.code),
    testName: cleanText(item.name || item.testName || item.test_name),
    category: normalizePriceCategory(item.pricingCategory || item.price_category),
    mrp,
    b2bPrice: "",
    ourPrice: "",
    discount: "",
    saving: false,
    saved: false,
    error: "",
  };
}

function rowFromSheet(rawRow) {
  const lowerMap = Object.entries(rawRow || {}).reduce((acc, [key, value]) => {
    acc[cleanText(key).toLowerCase()] = value;
    return acc;
  }, {});

  const testName =
    lowerMap["test name"] ||
    lowerMap.test_name ||
    lowerMap.name ||
    lowerMap.package ||
    lowerMap["package name"];
  const mrp = lowerMap.mrp || lowerMap.price || lowerMap["redcliffe price"];
  const category =
    lowerMap.category ||
    lowerMap["pricing category"] ||
    lowerMap["price category"] ||
    lowerMap["category name"] ||
    lowerMap.package_category;
  const b2bPrice =
    lowerMap["b2b price"] ||
    lowerMap.b2b_price ||
    lowerMap.b2b ||
    lowerMap["after discount price"];
  const finalPrice =
    lowerMap["final price"] ||
    lowerMap.final_price ||
    lowerMap["our price"] ||
    lowerMap.our_price ||
    lowerMap.selling_price;
  const discount = lowerMap["discount in %"] || lowerMap.discount || lowerMap["discount %"];
  const code = lowerMap.code || lowerMap["test code"] || lowerMap.package_code;

  return {
    key: `${cleanText(code)}-${cleanText(testName)}`,
    code: cleanText(code),
    testName: cleanText(testName),
    category: normalizePriceCategory(category),
    mrp: normalizeNumber(mrp),
    b2bPrice: normalizeNumber(b2bPrice),
    ourPrice: normalizeNumber(finalPrice),
    discount: normalizeNumber(discount),
    saving: false,
    saved: false,
    error: "",
  };
}

function mergeShopifyVariants(rows, variants) {
  const byName = new Map();
  const byCode = new Map();
  variants.forEach((variant) => {
    const title = cleanText(variant.selectedOptions?.[0]?.value || variant.title).toLowerCase();
    if (title) byName.set(title, variant);
    if (variant.sku) byCode.set(cleanText(variant.sku).toLowerCase(), variant);
  });

  return rows.map((row) => {
    const match =
      (row.code && byCode.get(row.code.toLowerCase())) ||
      byName.get(row.testName.toLowerCase());
    if (!match) return row;
    return {
      ...row,
      ourPrice: normalizeNumber(match.price) || row.ourPrice,
      b2bPrice: normalizeNumber(match.redcliffe?.b2b_price) || row.b2bPrice,
      discount: normalizeNumber(match.redcliffe?.discount_percent) || row.discount,
      category: normalizePriceCategory(match.redcliffe?.category) || row.category,
      saved: true,
    };
  });
}

export default function RedcliffePriceDashboard() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);

  const addVariantDraft = () => {
    const key = `custom-${Date.now()}`;
    setRows((prevRows) => [
      {
        key,
        code: "",
        testName: "",
        category: "",
        mrp: "",
        b2bPrice: "",
        ourPrice: "",
        discount: "",
        saving: false,
        saved: false,
        error: "",
        isCustom: true,
      },
      ...prevRows,
    ]);
    setQuery("");
    setError("");
  };

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      `${row.testName} ${row.category} ${row.code}`.toLowerCase().includes(needle)
    );
  }, [query, rows]);

  const pricedCount = useMemo(
    () => rows.filter((row) => Number(normalizeNumber(row.ourPrice)) > 0).length,
    [rows]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catalogResponse, productResponse] = await Promise.all([
        api.get("/api/redcliffe/packages"),
        api.get("/api/shopify-catalog/redcliffe-price-product"),
      ]);
      const catalogRows = (catalogResponse.data?.results || [])
        .map(normalizeCatalogItem)
        .filter((row) => row.testName);
      const variants = productResponse.data?.product?.variants || [];
      setProduct(productResponse.data?.product || null);
      setRows(mergeShopifyVariants(catalogRows, variants));
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          loadError.message ||
          "Unable to load Redcliffe price catalog"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateRow = (key, changes) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.key === key
          ? {
              ...row,
              ...changes,
              saved: false,
              error: "",
            }
          : row
      )
    );
  };

  const updateCategory = (row, category) => {
    const normalizedCategory = normalizePriceCategory(category);
    const nextDiscount = getCategoryDiscount(normalizedCategory);
    const previousDefault = getCategoryDiscount(row.category);
    const shouldUseDefault =
      row.discount === "" || (previousDefault !== "" && row.discount === previousDefault);

    updateRow(row.key, {
      category: normalizedCategory,
      ...(shouldUseDefault ? { discount: nextDiscount } : {}),
    });
  };

  const saveRow = async (row) => {
    const discount = getDiscount(row.mrp, row.ourPrice, row.discount);
    setRows((prevRows) =>
      prevRows.map((item) =>
        item.key === row.key ? { ...item, saving: true, error: "" } : item
      )
    );
    setError("");
    try {
      const { data } = await api.post("/api/shopify-catalog/redcliffe-price-variants", {
        row: {
          testName: row.testName,
          code: row.code,
          category: row.category,
          mrp: row.mrp,
          b2bPrice: row.b2bPrice,
          ourPrice: row.ourPrice,
          discount,
        },
      });
      const result = data.results?.[0];
      if (!result?.ok) throw new Error(result?.message || "Save failed");
      setRows((prevRows) =>
        prevRows.map((item) =>
          item.key === row.key
            ? { ...item, discount, saving: false, saved: true, error: "" }
            : item
        )
      );
    } catch (saveError) {
      const message =
        saveError.response?.data?.message ||
        saveError.message ||
        "Unable to save this variant";
      setRows((prevRows) =>
        prevRows.map((item) =>
          item.key === row.key ? { ...item, saving: false, error: message } : item
        )
      );
      setError(message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const importedRows = XLSX.utils
        .sheet_to_json(sheet, { defval: "" })
        .map(rowFromSheet)
        .filter((row) => row.testName && row.ourPrice);

      if (!importedRows.length) {
        setError("No valid rows found. Use columns: Test Name, Code, MRP, Category, B2B Price, Final Price.");
        return;
      }

      setRows((prevRows) => {
        const byKey = new Map(prevRows.map((row) => [row.key, row]));
        importedRows.forEach((row) => {
          const existing =
            byKey.get(row.key) ||
            prevRows.find(
              (item) =>
                item.testName.toLowerCase() === row.testName.toLowerCase() ||
                (item.code && row.code && item.code.toLowerCase() === row.code.toLowerCase())
            );
          byKey.set(existing?.key || row.key, {
            ...(existing || row),
            ...row,
            key: existing?.key || row.key,
            discount: row.discount || getCategoryDiscount(row.category) || getDiscount(row.mrp, row.ourPrice, ""),
            saved: false,
            error: "",
          });
        });
        return Array.from(byKey.values());
      });
    } catch (uploadError) {
      setError(uploadError.message || "Unable to read uploaded file");
    }
  };

  const bulkSave = async () => {
    const rowsToSave = rows
      .filter((row) => Number(normalizeNumber(row.ourPrice)) > 0)
      .map((row) => ({
        testName: row.testName,
        code: row.code,
        category: row.category,
        mrp: row.mrp,
        b2bPrice: row.b2bPrice,
        ourPrice: row.ourPrice,
        discount: getDiscount(row.mrp, row.ourPrice, row.discount || getCategoryDiscount(row.category)),
      }));

    if (!rowsToSave.length) {
      setError("Add Final Price for at least one test before bulk save.");
      return;
    }

    setBulkSaving(true);
    setError("");
    try {
      const { data } = await api.post("/api/shopify-catalog/redcliffe-price-variants", {
        rows: rowsToSave,
      });
      const failedNames = new Map(
        (data.results || [])
          .filter((result) => !result.ok)
          .map((result) => [cleanText(result.row?.testName).toLowerCase(), result.message])
      );
      setRows((prevRows) =>
        prevRows.map((row) => {
          if (!Number(normalizeNumber(row.ourPrice))) return row;
          const message = failedNames.get(row.testName.toLowerCase());
          return {
            ...row,
            discount: getDiscount(row.mrp, row.ourPrice, row.discount || getCategoryDiscount(row.category)),
            saved: !message,
            error: message || "",
          };
        })
      );
      if (data.failed) setError("Some rows failed. Check row messages in the table.");
    } catch (saveError) {
      setError(
        saveError.response?.data?.message ||
          saveError.message ||
          "Bulk save failed"
      );
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="redcliffe-price-page">
      <div className="redcliffe-price-shell">
        <header className="redcliffe-price-header">
          <div>
            <h1>Redcliffe Prices</h1>
            <span>{product?.title || "Shopify product 9495156556086"}</span>
          </div>
          <div className="redcliffe-price-metrics">
            <span>
              Tests <strong>{rows.length}</strong>
            </span>
            <span>
              Priced <strong>{pricedCount}</strong>
            </span> 
          </div>
        </header>

        {error ? <div className="redcliffe-price-banner error">{error}</div> : null}

        <section className="redcliffe-price-card">
          <div className="redcliffe-price-toolbar">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search test, category or code"
            />
            <label className="redcliffe-price-upload">
              Bulk Upload
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
            </label>
            <button type="button" className="accent" onClick={addVariantDraft}>
              Add Variant
            </button>
            <button type="button" onClick={bulkSave} disabled={bulkSaving || loading}>
              {bulkSaving ? "Saving..." : "Bulk Save"}
            </button>
            <button type="button" className="secondary" onClick={loadData} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="redcliffe-price-table-wrap">
            <table className="redcliffe-price-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Code</th>
                  <th>MRP</th>
                  <th>Category</th>
                  <th>B2B Price</th>
                  <th>Final Price</th>
                  <th>Status</th>
                  <th>Save</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const discount = getDiscount(
                    row.mrp,
                    row.ourPrice,
                    row.discount || getCategoryDiscount(row.category)
                  );
                  return (
                    <tr key={row.key}>
                      <td>
                        {row.isCustom ? (
                          <div className="redcliffe-price-name-edit">
                            <input
                              type="text"
                              value={row.testName}
                              placeholder="Test name"
                              onChange={(event) =>
                                updateRow(row.key, { testName: event.target.value })
                              }
                            />
                          </div>
                        ) : (
                          <>
                            <strong>{row.testName}</strong>
                          </>
                        )}
                        {row.error ? <em>{row.error}</em> : null}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.code}
                          placeholder="Code"
                          onChange={(event) =>
                            updateRow(row.key, { code: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        {row.isCustom ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.mrp}
                            onChange={(event) =>
                              updateRow(row.key, { mrp: event.target.value })
                            }
                          />
                        ) : row.mrp ? (
                          `Rs ${toMoney(row.mrp)}`
                        ) : (
                          "NA"
                        )}
                      </td>
                      <td>
                        <select
                          value={row.category}
                          onChange={(event) => updateCategory(row, event.target.value)}
                        >
                          {PRICE_CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value || "empty"} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.b2bPrice}
                          onChange={(event) =>
                            updateRow(row.key, { b2bPrice: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.ourPrice}
                          onChange={(event) =>
                            updateRow(row.key, { ourPrice: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <span className={`redcliffe-price-pill ${row.saved ? "saved" : ""}`}>
                          {row.saved ? "Synced" : "Draft"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => saveRow({ ...row, discount })}
                          disabled={row.saving || !row.ourPrice || !cleanText(row.testName)}
                        >
                          {row.saving ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan="8" className="redcliffe-price-empty">
                      {loading ? "Loading Redcliffe tests..." : "No tests found."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
