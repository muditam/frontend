import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./RedcliffeDashboardPage.css";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, ""); 

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const initialFilters = {
  bookingId: "",
  phone: "",
};
const PAGE_SIZE = 15;

function formatDate(value) {
  if (!value) return "NA";
  const input = String(value).trim();
  if (!input) return "NA";
  const raw = input.includes("T") ? input.split("T")[0] : input;
  const parts = raw.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day}-${month}-${year.slice(-2)}`;
    }
  }
  return input;
}

function safeLower(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeMember(rawMember) {
  if (!rawMember || typeof rawMember !== "object") return null;
  const customerName = String(
    rawMember.customerName ||
      rawMember.customer_name ||
      rawMember.name ||
      rawMember.member_name ||
      ""
  ).trim();
  const age = String(rawMember.age || rawMember.customer_age || "").trim();
  const gender = String(rawMember.gender || rawMember.customer_gender || "").trim();
  if (!customerName && !age && !gender) return null;
  return {
    customerName: customerName || "NA",
    age: age || "NA",
    gender: gender || "NA",
  };
}

function getBookingMembers(booking) {
  const rawSources = [
    booking?.patients,
    booking?.additionalMembers,
    booking?.additional_members,
    booking?.additional_member,
    booking?.members,
  ];
  const merged = [];
  rawSources.forEach((source) => {
    if (!Array.isArray(source)) return;
    source.forEach((member) => {
      const normalized = normalizeMember(member);
      if (normalized) merged.push(normalized);
    });
  });

  if (!merged.length) {
    const fallback = normalizeMember({
      customerName:
        booking?.customerName || booking?.customer_name || booking?.patientName || "NA",
      age: booking?.age,
      gender: booking?.gender,
    });
    return fallback ? [fallback] : [];
  }

  const seen = new Set();
  return merged.filter((member) => {
    const key = `${safeLower(member.customerName)}|${safeLower(member.age)}|${safeLower(
      member.gender
    )}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getPatientSummary(booking) {
  const patients = getBookingMembers(booking);
  if (!patients.length) {
    return {
      namesLabel: "NA",
      ageGenderLabel: "NA",
      branchMembers: [],
      primaryName: "NA",
    };
  }

  const names = patients.map((patient) => patient.customerName || "NA");
  const ageGenders = patients.map((patient) =>
    patient.age || patient.gender
      ? `${patient.age || "NA"} / ${patient.gender || "NA"}`
      : "NA"
  );
  const primaryName = names[0];
  const additionalCount = Math.max(0, names.length - 1);
  const namesLabel =
    additionalCount > 0 ? `${primaryName} + ${additionalCount}` : primaryName;

  return {
    namesLabel,
    ageGenderLabel: ageGenders.join(" | "),
    branchMembers: names.slice(1),
    primaryName,
  };
}

function formatTimePartTo12Hour(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const timePart = raw.split(" ")[0];
  const parts = timePart.split(":");
  if (parts.length < 2) return raw;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return raw;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const hh = String(hour12).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${hh}:${mm} ${suffix}`;
}

function formatSlotForDisplay(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/\s+/g, "");
  if (normalized.includes("-")) {
    const [start, end] = normalized.split("-");
    const formattedStart = formatTimePartTo12Hour(start);
    const formattedEnd = formatTimePartTo12Hour(end);
    if (formattedStart && formattedEnd) return `${formattedStart} - ${formattedEnd}`;
  }
  return formatTimePartTo12Hour(raw) || raw;
}

function getCollectionSlotLabel(booking) {
  const slot12 = typeof booking?.collectionTime?.slot12Hours === "string"
    ? booking.collectionTime.slot12Hours.trim()
    : "";
  if (slot12) return formatSlotForDisplay(slot12);

  const slot24 = typeof booking?.collectionTime?.slot24Hours === "string"
    ? booking.collectionTime.slot24Hours.trim()
    : "";
  if (slot24) return formatSlotForDisplay(slot24);

  const display = typeof booking?.collectionTime?.display === "string"
    ? booking.collectionTime.display.trim()
    : "";
  if (display) return formatSlotForDisplay(display);

  const objectSources = [
    booking?.collectionSlot && typeof booking.collectionSlot === "object"
      ? booking.collectionSlot
      : null,
    booking?.raw?.collection_slot &&
    typeof booking.raw.collection_slot === "object"
      ? booking.raw.collection_slot
      : null,
    booking?.raw?.slot_time && typeof booking.raw.slot_time === "object"
      ? booking.raw.slot_time
      : null,
    booking?.raw?.collection_time && typeof booking.raw.collection_time === "object"
      ? booking.raw.collection_time
      : null,
  ].filter(Boolean);

  for (const source of objectSources) {
    const text =
      (typeof source.slot_12_hrs === "string" ? source.slot_12_hrs.trim() : "") ||
      (typeof source.slot_24_hrs === "string" ? source.slot_24_hrs.trim() : "") ||
      (typeof source.slot === "string" ? source.slot.trim() : "");
    if (text) return formatSlotForDisplay(text);

    if (source.id !== undefined && source.id !== null && String(source.id).trim() !== "") {
      return `Slot ${String(source.id).trim()}`;
    }
  }

  const slotIdCandidates = [
    booking?.collectionSlotId,
    booking?.collectionSlot,
    booking?.raw?.collection_slot,
    booking?.raw?.slot_time?.id,
    booking?.raw?.collection_time?.id,
  ];
  for (const candidate of slotIdCandidates) {
    if (typeof candidate === "string" || typeof candidate === "number") {
      const value = String(candidate).trim();
      if (value) return `Slot ${value}`;
    }
  }

  return "NA";
}

function getQuickStats(bookings) {
  const stats = {
    total: bookings.length,
    confirmed: 0,
    collected: 0,
    reportsReady: 0,
  };

  bookings.forEach((booking) => {
    const bookingStatus = safeLower(booking.bookingStatus?.value);
    const pickupStatus = safeLower(booking.pickupStatus);
    const reportStatus = safeLower(booking.reportStatus);

    if (bookingStatus.includes("confirm")) stats.confirmed += 1;
    if (pickupStatus.includes("collect")) stats.collected += 1;
    if (
      reportStatus.includes("consolid") ||
      reportStatus.includes("partial") ||
      booking.reportSummary?.available
    ) {
      stats.reportsReady += 1;
    }
  });

  return stats;
}

function hasGeneratedReport(booking) {
  const reportStatus = safeLower(booking?.reportStatus);
  return (
    reportStatus.includes("consolid") ||
    reportStatus.includes("partial") ||
    Boolean(booking?.reportSummary?.available)
  );
}

function getSlotHour(slot) {
  const raw =
    slot?.format_24_hrs?.start_time ||
    slot?.format_12_hrs?.start_time ||
    "";
  const hour = Number(String(raw).split(":")[0]);
  return Number.isFinite(hour) ? hour : -1;
}

function getSlotBucket(slot) {
  const hour = getSlotHour(slot);
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  return "Evening";
}

function prettifyWebhookType(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getReportUrlFromResponse(data) {
  if (!data || typeof data !== "object") return "";
  const queue = [data];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);

    for (const key of [
      "report_url",
      "reportUrl",
      "report_link",
      "reportLink",
      "digital_report_url",
      "consolidated_report_url",
      "url",
      "link",
      "pdf_url",
      "pdfUrl",
      "file_url",
      "fileUrl",
    ]) {
      if (typeof current[key] === "string" && current[key].trim()) {
        return current[key].trim();
      }
    }

    Object.values(current).forEach((value) => {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    });
  }
  return "";
}

function getPhleboTrackingState(booking, lifecycleEvents = []) {
  const phlebo = booking?.phleboDetail || {};
  const lifecycle = lifecycleEvents.map((event) => safeLower(event?.hookType));
  const hasPickup = lifecycle.some((value) => value.includes("pickup"));
  const hasEnded = lifecycle.some((value) => value.includes("phlebo_end_journey"));
  const hasStarted = lifecycle.some((value) => value.includes("phlebo_started_journey"));
  const hasAssigned = lifecycle.some((value) => value.includes("phleboassigned"));
  const hasHold = lifecycle.some((value) => value.includes("pickup_hold"));

  let label = "Not assigned";
  let tone = "slate";

  if (hasHold) {
    label = "Pickup hold";
    tone = "coral";
  } else if (hasPickup) {
    label = "Sample picked";
    tone = "green";
  } else if (hasEnded) {
    label = "Reached location";
    tone = "green";
  } else if (hasStarted) {
    label = "On the way";
    tone = "blue";
  } else if (hasAssigned || phlebo?.name || phlebo?.contact) {
    label = "Assigned";
    tone = "amber";
  }

  return {
    label,
    tone,
    name: String(phlebo?.name || "").trim() || "NA",
    contact: String(phlebo?.contact || "").trim() || "",
  };
}

export default function RedcliffeDashboardPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [searchText, setSearchText] = useState("");
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [openPage, setOpenPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const [loading, setLoading] = useState({
    bookings: false,
  });
  const [pageStatus, setPageStatus] = useState("");
  const [pageError, setPageError] = useState("");
  const [expandedBookingIds, setExpandedBookingIds] = useState({});
  const [lifecycleByBooking, setLifecycleByBooking] = useState({});
  const [reportLoadingByBooking, setReportLoadingByBooking] = useState({});
  const [availablePackages, setAvailablePackages] = useState([]);
  const [packageLookupLoading, setPackageLookupLoading] = useState(false);
  const [packageLookupMessage, setPackageLookupMessage] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlotLoading, setRescheduleSlotLoading] = useState(false);
  const [rescheduleSlotError, setRescheduleSlotError] = useState("");
  const [activeSlotBucket, setActiveSlotBucket] = useState("Morning");
  const [activeActionBookingId, setActiveActionBookingId] = useState(null);
  const [activeActionType, setActiveActionType] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionForms, setActionForms] = useState({
    remark: "",
    collectionDate: "",
    collectionSlot: "",
    memberName: "",
    memberAge: "",
    memberGender: "",
    memberPackageCodes: "",
  });

  const visibleBookings = bookings;
  const openBookings = useMemo(
    () => visibleBookings.filter((booking) => !hasGeneratedReport(booking)),
    [visibleBookings]
  );
  const closedBookings = useMemo(
    () => visibleBookings.filter((booking) => hasGeneratedReport(booking)),
    [visibleBookings]
  );

  const quickStats = useMemo(
    () => getQuickStats(visibleBookings),
    [visibleBookings]
  );
  const openTotalPages = Math.max(1, Math.ceil(openBookings.length / PAGE_SIZE));
  const closedTotalPages = Math.max(
    1,
    Math.ceil(closedBookings.length / PAGE_SIZE)
  );
  const paginatedOpenBookings = useMemo(() => {
    const start = (openPage - 1) * PAGE_SIZE;
    return openBookings.slice(start, start + PAGE_SIZE);
  }, [openBookings, openPage]);
  const paginatedClosedBookings = useMemo(() => {
    const start = (closedPage - 1) * PAGE_SIZE;
    return closedBookings.slice(start, start + PAGE_SIZE);
  }, [closedBookings, closedPage]);
  const groupedRescheduleSlots = useMemo(() => {
    const groups = { Morning: [], Afternoon: [], Evening: [] };
    rescheduleSlots.forEach((slot) => {
      groups[getSlotBucket(slot)].push(slot);
    });
    return groups;
  }, [rescheduleSlots]);

  const clearPageMessages = () => {
    setPageStatus("");
    setPageError("");
  };

  const applyApiError = (error, fallback, setError) => {
    const payload = error?.response?.data || {};
    setError(payload.message || payload.detail || fallback);
  };

  const fetchBookings = useCallback(async (activeFilters = initialFilters) => {
    clearPageMessages();
    setLoading((prev) => ({ ...prev, bookings: true }));

    try {
      const params = {
        booking_id: activeFilters.bookingId || undefined,
        phone: activeFilters.phone || undefined,
      };

      const { data } = await api.get("/api/redcliffe/bookings", { params });
      setBookings(Array.isArray(data?.results) ? data.results : []);
      setSummary(data?.summary || null);
      setPageStatus(data?.message || "Bookings loaded.");
    } catch (error) {
      setBookings([]);
      setSummary(null);
      applyApiError(error, "Failed to load bookings.", setPageError);
    } finally {
      setLoading((prev) => ({ ...prev, bookings: false }));
    }
  }, []);

  const loadPartnerPackages = useCallback(async () => {
    if (availablePackages.length || packageLookupLoading) return;
    setPackageLookupLoading(true);
    setPackageLookupMessage("");
    try {
      const { data } = await api.get("/api/redcliffe/packages");
      const packages = (Array.isArray(data?.results) ? data.results : []).sort((a, b) =>
        `${a.name} ${a.code}`.localeCompare(`${b.name} ${b.code}`)
      );
      setAvailablePackages(packages);
      if (!packages.length) {
        setPackageLookupMessage("No partner packages are available right now.");
      }
    } catch (error) {
      const payload = error?.response?.data || {};
      setPackageLookupMessage(
        payload.message || payload.detail || "Unable to load partner packages."
      );
    } finally {
      setPackageLookupLoading(false);
    }
  }, [availablePackages.length, packageLookupLoading]);

  useEffect(() => {
    fetchBookings(initialFilters);
  }, [fetchBookings]);

  useEffect(() => {
    if (openPage > openTotalPages) setOpenPage(openTotalPages);
  }, [openPage, openTotalPages]);

  useEffect(() => {
    if (closedPage > closedTotalPages) setClosedPage(closedTotalPages);
  }, [closedPage, closedTotalPages]);

  useEffect(() => {
    const bookingIds = bookings
      .map((booking) => String(booking.bookingId || "").trim())
      .filter(Boolean);

    if (!bookingIds.length) {
      setLifecycleByBooking({});
      return;
    }

    let active = true;
    const loadLifecycle = async () => {
      try {
        const { data } = await api.get("/api/redcliffe/bookings/lifecycle", {
          params: {
            booking_ids: bookingIds.join(","),
            limit: 500,
          },
        });
        if (!active) return;
        setLifecycleByBooking(data?.results || {});
      } catch (_error) {
        if (!active) return;
        setLifecycleByBooking({});
      }
    };

    loadLifecycle();
    return () => {
      active = false;
    };
  }, [bookings]);

  useEffect(() => {
    if (activeActionType === "add-member") {
      loadPartnerPackages();
    }
  }, [activeActionType, loadPartnerPackages]);

  useEffect(() => {
    if (activeActionType !== "reschedule" || !activeActionBookingId) return;
    const booking = bookings.find(
      (item) => String(item.bookingId) === String(activeActionBookingId)
    );
    if (!booking) return;
    fetchRescheduleSlots(booking, actionForms.collectionDate || booking.collectionDate);
  }, [activeActionType, activeActionBookingId, actionForms.collectionDate, bookings]);

  const searchBookings = () => {
    const query = String(searchText || "").trim();
    if (!query) {
      resetFilters();
      return;
    }

    const digitsOnly = query.replace(/\D/g, "");
    const isPhoneLike =
      digitsOnly.length === 10 && /^[\d\s()+-]+$/.test(query);

    const nextFilters = {
      bookingId: isPhoneLike ? "" : query,
      phone: isPhoneLike ? digitsOnly : "",
    };

    setOpenPage(1);
    setClosedPage(1);
    setFilters(nextFilters);
    fetchBookings(nextFilters);
  };

  const resetFilters = () => {
    setOpenPage(1);
    setClosedPage(1);
    setSearchText("");
    setFilters(initialFilters);
    fetchBookings(initialFilters);
  };

  const fetchRescheduleSlots = async (booking, collectionDate) => {
    const lat = String(booking?.latitude || "").trim();
    const lng = String(booking?.longitude || "").trim();
    const date = String(collectionDate || "").trim();

    if (!lat || !lng || !date) {
      setRescheduleSlots([]);
      if (!lat || !lng) {
        setRescheduleSlotError(
          "Slot lookup needs booking latitude/longitude. Open this booking from a location-enabled entry."
        );
      } else {
        setRescheduleSlotError("Please select collection date to load slots.");
      }
      return;
    }

    setRescheduleSlotLoading(true);
    setRescheduleSlotError("");
    try {
      const { data } = await api.get("/api/redcliffe/time-slots", {
        params: {
          collection_date: date,
          latitude: lat,
          longitude: lng,
        },
      });

      const results = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setRescheduleSlots(results);
      const firstBucket = ["Morning", "Afternoon", "Evening"].find((name) =>
        results.some((slot) => getSlotBucket(slot) === name)
      );
      setActiveSlotBucket(firstBucket || "Morning");
      if (!results.length) {
        setRescheduleSlotError(data?.message || "No slots available for selected date.");
      }
    } catch (error) {
      setRescheduleSlots([]);
      const payload = error?.response?.data || {};
      setRescheduleSlotError(payload.message || payload.detail || "Failed to fetch time slots.");
    } finally {
      setRescheduleSlotLoading(false);
    }
  };

  const openBookingActions = (booking) => {
    const bookingId = booking?.bookingId;
    if (activeActionBookingId === bookingId) {
      setActiveActionBookingId(null);
      setActiveActionType("");
      setRescheduleSlots([]);
      setRescheduleSlotError("");
      return;
    }
    setActiveActionBookingId(bookingId);
    setActiveActionType("");
    setActionForms({
      remark: "",
      collectionDate: booking?.collectionDate || "",
      collectionSlot: "",
      memberName: "",
      memberAge: "",
      memberGender: "",
      memberPackageCodes: "",
    });
    setRescheduleSlots([]);
    setRescheduleSlotError("");
  };

  const submitReschedule = async (bookingId) => {
    if (!bookingId) return;
    setActionLoading(true);
    setPageError("");
    setPageStatus("");
    try {
      await api.post("/api/redcliffe/bookings/update", {
        booking_id: bookingId,
        booking_status: "rescheduled",
        remark: actionForms.remark,
        collection_date: actionForms.collectionDate,
        collection_slot: Number(actionForms.collectionSlot),
      });
      setPageStatus("Booking reschedule request submitted.");
      setActiveActionBookingId(null);
      setActiveActionType("");
      fetchBookings(filters);
    } catch (error) {
      applyApiError(error, "Failed to reschedule booking.", setPageError);
    } finally {
      setActionLoading(false);
    }
  };

  const submitCancel = async (bookingId) => {
    if (!bookingId) return;
    setActionLoading(true);
    setPageError("");
    setPageStatus("");
    try {
      await api.post("/api/redcliffe/bookings/update", {
        booking_id: bookingId,
        booking_status: "cancelled",
        remark: actionForms.remark,
      });
      setPageStatus("Booking cancellation request submitted.");
      setActiveActionBookingId(null);
      setActiveActionType("");
      fetchBookings(filters);
    } catch (error) {
      applyApiError(error, "Failed to cancel booking.", setPageError);
    } finally {
      setActionLoading(false);
    }
  };

  const submitAddMember = async (bookingId) => {
    if (!bookingId) return;
    setActionLoading(true);
    setPageError("");
    setPageStatus("");
    try {
      await api.post(`/api/redcliffe/bookings/${bookingId}/add-member`, {
        additional_member: [
          {
            customer_name: actionForms.memberName,
            customer_age: actionForms.memberAge,
            customer_gender: actionForms.memberGender,
            package_code: String(actionForms.memberPackageCodes || "")
              .split(",")
              .map((code) => code.trim())
              .filter(Boolean),
          },
        ],
      });
      setPageStatus("Additional member request submitted.");
      setActiveActionBookingId(null);
      setActiveActionType("");
      fetchBookings(filters);
    } catch (error) {
      applyApiError(error, "Failed to add additional member.", setPageError);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleBookingExpansion = (bookingId) => {
    if (!bookingId && bookingId !== 0) return;
    const key = String(bookingId);
    setExpandedBookingIds((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const fetchBookingReport = async (bookingId, reportType) => {
    const safeBookingId = String(bookingId || "").trim();
    if (!safeBookingId) return;
    setReportLoadingByBooking((prev) => ({
      ...prev,
      [`${safeBookingId}-${reportType}`]: true,
    }));
    setPageError("");
    setPageStatus("");

    try {
      const endpoint =
        reportType === "consolidated"
          ? `/api/redcliffe/bookings/${safeBookingId}/reports/consolidated`
          : `/api/redcliffe/bookings/${safeBookingId}/reports/digital`;
      const { data } = await api.get(endpoint);
      const reportUrl = getReportUrlFromResponse(data);

      if (reportUrl) {
        window.open(reportUrl, "_blank", "noopener,noreferrer");
        setPageStatus(
          `${reportType === "consolidated" ? "Consolidated" : "Digital"} report opened for booking ${safeBookingId}.`
        );
      } else {
        setPageError("Report fetched but URL not available in response.");
      }
    } catch (error) {
      applyApiError(error, "Failed to fetch report.", setPageError);
    } finally {
      setReportLoadingByBooking((prev) => ({
        ...prev,
        [`${safeBookingId}-${reportType}`]: false,
      }));
    }
  };

  return (
    <div className="redcliffe-dashboard-page">
      <div className="redcliffe-dashboard-shell">
        <section className="redcliffe-dashboard-hero">
          <div className="redcliffe-dashboard-hero-copy">
            <div className="redcliffe-dashboard-badge">Redcliffe Dashboard</div>
            <h1>Booking operations dashboard.</h1>
            <p>
              Review bookings, check patient and package details, and track
              collection and report progress from one place.
            </p>
          </div>
          <div className="redcliffe-dashboard-hero-count">
            <span>
              Visible bookings
              {summary?.total !== undefined ? ` / fetched ${summary.total}` : ""}
            </span>
            <strong>{quickStats.total}</strong>
          </div>
        </section>

        <section className="redcliffe-dashboard-summary-grid">
          <div className="redcliffe-dashboard-stat-card">
            <div className="redcliffe-dashboard-stat-icon amber">📅</div>
            <div className="redcliffe-dashboard-stat-content">
              <span>Total</span>
              <strong>{quickStats.total}</strong>
            </div>
          </div>
          <div className="redcliffe-dashboard-stat-card">
            <div className="redcliffe-dashboard-stat-icon green">✓</div>
            <div className="redcliffe-dashboard-stat-content">
              <span>Confirmed</span>
              <strong>{quickStats.confirmed}</strong>
            </div>
          </div>
          <div className="redcliffe-dashboard-stat-card">
            <div className="redcliffe-dashboard-stat-icon blue">⚗</div>
            <div className="redcliffe-dashboard-stat-content">
              <span>Collected</span>
              <strong>{quickStats.collected}</strong>
            </div>
          </div>
          <div className="redcliffe-dashboard-stat-card">
            <div className="redcliffe-dashboard-stat-icon purple">📄</div>
            <div className="redcliffe-dashboard-stat-content">
              <span>Reports ready</span>
              <strong>{quickStats.reportsReady}</strong>
            </div>
          </div>
        </section>

        {pageStatus ? (
          <div className="redcliffe-dashboard-banner success">{pageStatus}</div>
        ) : null}
        {pageError ? (
          <div className="redcliffe-dashboard-banner error">{pageError}</div>
        ) : null}

        <div className="redcliffe-dashboard-main">
          <section className="redcliffe-dashboard-card">
            <div className="redcliffe-dashboard-unified-head">
              <div>
                <h2>Bookings</h2>
                <p>
                  Search by mobile number or booking ID. Open bookings: report
                  not generated. Closed bookings: report generated.
                </p>
              </div>
            </div>

            <div className="redcliffe-dashboard-filter-shell">
              <div className="redcliffe-dashboard-search-col">
                <label>Search</label>
                <input
                  className="redcliffe-dashboard-search-input"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") searchBookings();
                  }}
                  placeholder="Search by mobile number or booking ID"
                />
              </div>
              <div className="redcliffe-dashboard-search-actions">
                <button
                  className="redcliffe-dashboard-btn primary"
                  onClick={searchBookings}
                  disabled={loading.bookings}
                >
                  {loading.bookings ? "Loading..." : "Search"}
                </button>
                <button
                  className="redcliffe-dashboard-btn secondary"
                  onClick={() => {
                    resetFilters();
                  }}
                  disabled={loading.bookings}
                >
                  Clear
                </button>
              </div>
            </div>

              <div className="redcliffe-dashboard-group-head">
                <h3>Open Bookings</h3>
                <span>{openBookings.length}</span>
              </div>
              <div className="redcliffe-dashboard-table-wrap">
                <table className="redcliffe-dashboard-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Booking ID</th>
                      <th>Order ID</th>
                      <th>Booking date</th>
                      <th>Patient</th>
                      <th>Collection</th>
                      <th>Slot</th>
                      <th>Status</th>
                      <th>Phlebo</th>
                      <th>Pickup</th>
                      <th>Reports</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOpenBookings.length ? (
                      paginatedOpenBookings.map((booking) => {
                        const patient = getPatientSummary(booking);
                        const additionalMembers = getBookingMembers(booking).slice(1);
                        const isExpanded = Boolean(
                          expandedBookingIds[String(booking.bookingId)]
                        );
                        const lifecycleEvents =
                          lifecycleByBooking[String(booking.bookingId)] || [];
                        const phleboTracking = getPhleboTrackingState(
                          booking,
                          lifecycleEvents
                        );
                        return (
                          <React.Fragment key={`open-${booking.bookingId || Math.random()}`}>
                            <tr>
                              <td>
                                <div className="redcliffe-dashboard-action-stack">
                                  <button
                                    className="redcliffe-dashboard-inline-btn redcliffe-dashboard-inline-btn-mini"
                                    onClick={() => openBookingActions(booking)}
                                  >
                                    Modify
                                  </button>
                                  {additionalMembers.length ? (
                                    <button
                                      className="redcliffe-dashboard-expand-btn"
                                      onClick={() => toggleBookingExpansion(booking.bookingId)}
                                      title={isExpanded ? "Collapse members" : "Expand members"}
                                      aria-label={isExpanded ? "Collapse members" : "Expand members"}
                                    >
                                      {isExpanded ? "▾" : "▸"}
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                              <td>
                                <div className="redcliffe-dashboard-booking-id">
                                  <strong>{booking.bookingId || "NA"}</strong>
                                </div>
                              </td>
                              <td>{booking.orderId || "NA"}</td>
                              <td>{formatDate(booking.bookingDate)}</td>
                              <td>
                                <div>{patient.namesLabel}</div>
                                {isExpanded && additionalMembers.length ? (
                                  <div className="redcliffe-dashboard-inline-members">
                                    {additionalMembers.map((member, index) => (
                                      <small key={`${booking.bookingId}-open-member-inline-${index}`}>
                                        {member.customerName || "NA"} ({member.age || "NA"} /{" "}
                                        {member.gender || "NA"})
                                      </small>
                                    ))}
                                  </div>
                                ) : null}
                              </td>
                              <td>
                                <div>{formatDate(booking.collectionDate)}</div>
                              </td>
                              <td>{getCollectionSlotLabel(booking)}</td>
                              <td>
                              <div className="redcliffe-dashboard-lifecycle">
                                {lifecycleEvents.length ? (
                                  lifecycleEvents
                                    .slice(0, 4)
                                    .map((event, index) => (
                                      <small key={`${booking.bookingId}-open-life-${index}`}>
                                        {prettifyWebhookType(event.hookType)}
                                      </small>
                                    ))
                                ) : (
                                  <span className="redcliffe-dashboard-pill green">
                                    {booking.bookingStatus?.label || "NA"}
                                  </span>
                                )}
                              </div>
                              </td>
                              <td>
                                <div className="redcliffe-dashboard-lifecycle">
                                  <span className={`redcliffe-dashboard-pill ${phleboTracking.tone}`}>
                                    {phleboTracking.label}
                                  </span>
                                  {phleboTracking.name !== "NA" ? (
                                    <small>{phleboTracking.name}</small>
                                  ) : null}
                                  {phleboTracking.contact ? (
                                    <small>{phleboTracking.contact}</small>
                                  ) : null}
                                </div>
                              </td>
                              <td>
                                <span className="redcliffe-dashboard-pill yellow">
                                  {booking.pickupStatus || "NA"}
                                </span>
                              </td>
                              <td>
                              <div className="redcliffe-dashboard-report-actions">
                                <button
                                  className="redcliffe-dashboard-inline-btn redcliffe-dashboard-inline-btn-mini"
                                  onClick={() => fetchBookingReport(booking.bookingId, "consolidated")}
                                  disabled={Boolean(reportLoadingByBooking[`${booking.bookingId}-consolidated`])}
                                >
                                  {reportLoadingByBooking[`${booking.bookingId}-consolidated`]
                                    ? "Loading..."
                                    : "Consolidated PDF"}
                                </button>
                                {String(booking.reportStatus || "").trim().toLowerCase() !== "none" ? (
                                  <span className="redcliffe-dashboard-pill coral">
                                    {booking.reportStatus}
                                  </span>
                                ) : null}
                              </div>
                              </td>
                              <td className="redcliffe-dashboard-more">⋮</td>
                            </tr>
                            {activeActionBookingId === booking.bookingId ? (
                              <tr>
                                <td colSpan="12">
                                  <div className="redcliffe-dashboard-action-panel">
                                    <div className="redcliffe-dashboard-action-menu">
                                      <button
                                        className={`redcliffe-dashboard-btn secondary redcliffe-dashboard-action-tab ${
                                          activeActionType === "reschedule" ? "active" : ""
                                        }`}
                                        onClick={() => setActiveActionType("reschedule")}
                                      >
                                        Reschedule booking
                                      </button>
                                      <button
                                        className={`redcliffe-dashboard-btn secondary redcliffe-dashboard-action-tab ${
                                          activeActionType === "cancel" ? "active" : ""
                                        }`}
                                        onClick={() => setActiveActionType("cancel")}
                                      >
                                        Cancel booking
                                      </button>
                                      <button
                                        className={`redcliffe-dashboard-btn secondary redcliffe-dashboard-action-tab ${
                                          activeActionType === "add-member" ? "active" : ""
                                        }`}
                                        onClick={() => setActiveActionType("add-member")}
                                      >
                                        Add additional member
                                      </button>
                                    </div>

                                    {activeActionType === "reschedule" ? (
                                      <div className="redcliffe-dashboard-action-form">
                                        <div className="redcliffe-dashboard-field">
                                          <span>Remark (required)</span>
                                          <input
                                            value={actionForms.remark}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                remark: event.target.value,
                                              }))
                                            }
                                            placeholder="Reason for reschedule"
                                          />
                                        </div>
                                        <div className="redcliffe-dashboard-field">
                                          <span>Collection date (required)</span>
                                          <input
                                            type="date"
                                            value={actionForms.collectionDate}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                collectionDate: event.target.value,
                                              }))
                                            }
                                          />
                                        </div>
                                        <div className="redcliffe-dashboard-field">
                                          <span>Collection slot id (required)</span>
                                          <select
                                            value={actionForms.collectionSlot}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                collectionSlot: event.target.value,
                                              }))
                                            }
                                          >
                                            <option value="">Select slot from available options</option>
                                            {rescheduleSlots.map((slot) => {
                                              const start =
                                                slot.format_12_hrs?.start_time ||
                                                slot.format_24_hrs?.start_time ||
                                                "NA";
                                              const end =
                                                slot.format_12_hrs?.end_time ||
                                                slot.format_24_hrs?.end_time ||
                                                "NA";
                                              return (
                                                <option key={`open-slot-${slot.id}`} value={slot.id}>
                                                  {slot.id} - {start} to {end}
                                                </option>
                                              );
                                            })}
                                          </select>
                                        </div>
                                        <div className="redcliffe-dashboard-actions">
                                          <button
                                            className="redcliffe-dashboard-btn primary"
                                            onClick={() => submitReschedule(booking.bookingId)}
                                            disabled={actionLoading}
                                          >
                                            {actionLoading ? "Submitting..." : "Submit reschedule"}
                                          </button>
                                        </div>
                                        <div className="redcliffe-dashboard-slot-picker">
                                          <div className="redcliffe-dashboard-slot-buckets">
                                            {["Morning", "Afternoon", "Evening"].map((bucketName) => (
                                              <button
                                                key={`open-bucket-${bucketName}`}
                                                type="button"
                                                className={`redcliffe-dashboard-slot-bucket ${
                                                  activeSlotBucket === bucketName ? "active" : ""
                                                }`}
                                                onClick={() => setActiveSlotBucket(bucketName)}
                                              >
                                                {bucketName}
                                              </button>
                                            ))}
                                          </div>
                                          {rescheduleSlotLoading ? (
                                            <small>Loading slots...</small>
                                          ) : rescheduleSlotError ? (
                                            <small>{rescheduleSlotError}</small>
                                          ) : groupedRescheduleSlots[activeSlotBucket]?.length ? (
                                            <div className="redcliffe-dashboard-slot-grid">
                                              {groupedRescheduleSlots[activeSlotBucket].map((slot) => {
                                                const labelStart =
                                                  slot.format_12_hrs?.start_time ||
                                                  slot.format_24_hrs?.start_time ||
                                                  "NA";
                                                const labelEnd =
                                                  slot.format_12_hrs?.end_time ||
                                                  slot.format_24_hrs?.end_time ||
                                                  "NA";
                                                const isSelected =
                                                  String(actionForms.collectionSlot) === String(slot.id);
                                                const isDisabled = Number(slot.available_slot ?? 0) < 1;
                                                return (
                                                  <button
                                                    type="button"
                                                    key={`open-slot-card-${slot.id}`}
                                                    className={`redcliffe-dashboard-slot-card ${isSelected ? "active" : ""}`}
                                                    disabled={isDisabled}
                                                    onClick={() =>
                                                      setActionForms((prev) => ({
                                                        ...prev,
                                                        collectionSlot: String(slot.id),
                                                      }))
                                                    }
                                                  >
                                                    <strong>{labelStart} - {labelEnd}</strong>
                                                    <small>Slots: {slot.available_slot ?? 0}</small>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <small>No slots available in this bucket.</small>
                                          )}
                                        </div>
                                      </div>
                                    ) : null}

                                    {activeActionType === "cancel" ? (
                                      <div className="redcliffe-dashboard-action-form">
                                        <div className="redcliffe-dashboard-field">
                                          <span>Remark (required)</span>
                                          <input
                                            value={actionForms.remark}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                remark: event.target.value,
                                              }))
                                            }
                                            placeholder="Reason for cancellation"
                                          />
                                        </div>
                                        <div className="redcliffe-dashboard-actions">
                                          <button
                                            className="redcliffe-dashboard-btn primary"
                                            onClick={() => submitCancel(booking.bookingId)}
                                            disabled={actionLoading}
                                          >
                                            {actionLoading ? "Submitting..." : "Submit cancellation"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}

                                    {activeActionType === "add-member" ? (
                                      <div className="redcliffe-dashboard-action-form">
                                        <div className="redcliffe-dashboard-field">
                                          <span>Member name</span>
                                          <input
                                            value={actionForms.memberName}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                memberName: event.target.value,
                                              }))
                                            }
                                            placeholder="Full name"
                                          />
                                        </div>
                                        <div className="redcliffe-dashboard-field">
                                          <span>Age</span>
                                          <input
                                            type="number"
                                            min="0"
                                            value={actionForms.memberAge}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                memberAge: event.target.value,
                                              }))
                                            }
                                            placeholder="30"
                                          />
                                        </div>
                                        <div className="redcliffe-dashboard-field">
                                          <span>Gender</span>
                                          <select
                                            value={actionForms.memberGender}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                memberGender: event.target.value,
                                              }))
                                            }
                                          >
                                            <option value="">Select gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                          </select>
                                        </div>
                                        <div className="redcliffe-dashboard-field">
                                          <span>Package code(s)</span>
                                          <select
                                            value={actionForms.memberPackageCodes}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                memberPackageCodes: event.target.value,
                                              }))
                                            }
                                          >
                                            <option value="">Select available test/package</option>
                                            {availablePackages.map((pkg) => (
                                              <option key={`open-member-pkg-${booking.bookingId}-${pkg.code}`} value={pkg.code}>
                                                {pkg.code}{pkg.name ? ` - ${pkg.name}` : ""}
                                              </option>
                                            ))}
                                          </select>
                                          {packageLookupLoading ? <small>Loading packages...</small> : null}
                                          {packageLookupMessage ? <small>{packageLookupMessage}</small> : null}
                                        </div>
                                        <div className="redcliffe-dashboard-actions">
                                          <button
                                            className="redcliffe-dashboard-btn primary"
                                            onClick={() => submitAddMember(booking.bookingId)}
                                            disabled={actionLoading}
                                          >
                                            {actionLoading ? "Submitting..." : "Submit additional member"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="12">
                          <div className="redcliffe-dashboard-empty">
                            No open bookings matched the current filters.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="redcliffe-dashboard-pagination">
                <button
                  className="redcliffe-dashboard-btn secondary"
                  onClick={() => setOpenPage((prev) => Math.max(1, prev - 1))}
                  disabled={openPage <= 1}
                >
                  Prev
                </button>
                <span>
                  Page {openPage} of {openTotalPages}
                </span>
                <button
                  className="redcliffe-dashboard-btn secondary"
                  onClick={() =>
                    setOpenPage((prev) => Math.min(openTotalPages, prev + 1))
                  }
                  disabled={openPage >= openTotalPages}
                >
                  Next
                </button>
              </div>

              <div className="redcliffe-dashboard-group-head">
                <h3>Closed Bookings</h3>
                <span>{closedBookings.length}</span>
              </div>
              <div className="redcliffe-dashboard-table-wrap">
                <table className="redcliffe-dashboard-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Booking ID</th>
                      <th>Order ID</th>
                      <th>Booking date</th>
                      <th>Patient</th>
                      <th>Collection</th>
                      <th>Slot</th>
                      <th>Status</th>
                      <th>Phlebo</th>
                      <th>Pickup</th>
                      <th>Reports</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedClosedBookings.length ? (
                      paginatedClosedBookings.map((booking) => {
                        const patient = getPatientSummary(booking);
                        const additionalMembers = getBookingMembers(booking).slice(1);
                        const isExpanded = Boolean(
                          expandedBookingIds[String(booking.bookingId)]
                        );
                        const lifecycleEvents =
                          lifecycleByBooking[String(booking.bookingId)] || [];
                        const phleboTracking = getPhleboTrackingState(
                          booking,
                          lifecycleEvents
                        );
                        return (
                          <React.Fragment key={`closed-${booking.bookingId || Math.random()}`}>
                            <tr>
                              <td>
                                <div className="redcliffe-dashboard-action-stack">
                                  <button
                                    className="redcliffe-dashboard-inline-btn redcliffe-dashboard-inline-btn-mini"
                                    onClick={() => openBookingActions(booking)}
                                  >
                                    Modify
                                  </button>
                                  {additionalMembers.length ? (
                                    <button
                                      className="redcliffe-dashboard-expand-btn"
                                      onClick={() => toggleBookingExpansion(booking.bookingId)}
                                      title={isExpanded ? "Collapse members" : "Expand members"}
                                      aria-label={isExpanded ? "Collapse members" : "Expand members"}
                                    >
                                      {isExpanded ? "▾" : "▸"}
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                              <td>
                                <div className="redcliffe-dashboard-booking-id">
                                  <strong>{booking.bookingId || "NA"}</strong>
                                </div>
                              </td>
                              <td>{booking.orderId || "NA"}</td>
                              <td>{formatDate(booking.bookingDate)}</td>
                              <td>
                                <div>{patient.namesLabel}</div>
                                {isExpanded && additionalMembers.length ? (
                                  <div className="redcliffe-dashboard-inline-members">
                                    {additionalMembers.map((member, index) => (
                                      <small key={`${booking.bookingId}-closed-member-inline-${index}`}>
                                        {member.customerName || "NA"} ({member.age || "NA"} /{" "}
                                        {member.gender || "NA"})
                                      </small>
                                    ))}
                                  </div>
                                ) : null}
                              </td>
                              <td>
                                <div>{formatDate(booking.collectionDate)}</div>
                              </td>
                              <td>{getCollectionSlotLabel(booking)}</td>
                              <td>
                              <div className="redcliffe-dashboard-lifecycle">
                                {lifecycleEvents.length ? (
                                  lifecycleEvents
                                    .slice(0, 4)
                                    .map((event, index) => (
                                      <small key={`${booking.bookingId}-closed-life-${index}`}>
                                        {prettifyWebhookType(event.hookType)}
                                      </small>
                                    ))
                                ) : (
                                  <span className="redcliffe-dashboard-pill green">
                                    {booking.bookingStatus?.label || "NA"}
                                  </span>
                                )}
                              </div>
                            </td>
                              <td>
                                <div className="redcliffe-dashboard-lifecycle">
                                  <span className={`redcliffe-dashboard-pill ${phleboTracking.tone}`}>
                                    {phleboTracking.label}
                                  </span>
                                  {phleboTracking.name !== "NA" ? (
                                    <small>{phleboTracking.name}</small>
                                  ) : null}
                                  {phleboTracking.contact ? (
                                    <small>{phleboTracking.contact}</small>
                                  ) : null}
                                </div>
                              </td>
                              <td>
                                <span className="redcliffe-dashboard-pill yellow">
                                  {booking.pickupStatus || "NA"}
                                </span>
                              </td>
                            <td>
                              <div className="redcliffe-dashboard-report-actions">
                                <button
                                  className="redcliffe-dashboard-inline-btn"
                                  onClick={() => fetchBookingReport(booking.bookingId, "consolidated")}
                                  disabled={Boolean(reportLoadingByBooking[`${booking.bookingId}-consolidated`])}
                                >
                                  {reportLoadingByBooking[`${booking.bookingId}-consolidated`]
                                    ? "Loading..."
                                    : "Consolidated PDF"}
                                </button>
                                {String(booking.reportStatus || "").trim().toLowerCase() !== "none" ? (
                                  <span className="redcliffe-dashboard-pill coral">
                                    {booking.reportStatus}
                                  </span>
                                ) : null}
                              </div>
                              </td>
                              <td className="redcliffe-dashboard-more">⋮</td>
                            </tr>
                            {activeActionBookingId === booking.bookingId ? (
                              <tr>
                                <td colSpan="12">
                                  <div className="redcliffe-dashboard-action-panel">
                                    <div className="redcliffe-dashboard-action-menu">
                                      <button
                                        className={`redcliffe-dashboard-btn secondary redcliffe-dashboard-action-tab ${
                                          activeActionType === "reschedule" ? "active" : ""
                                        }`}
                                        onClick={() => setActiveActionType("reschedule")}
                                      >
                                        Reschedule booking
                                      </button>
                                      <button
                                        className={`redcliffe-dashboard-btn secondary redcliffe-dashboard-action-tab ${
                                          activeActionType === "cancel" ? "active" : ""
                                        }`}
                                        onClick={() => setActiveActionType("cancel")}
                                      >
                                        Cancel booking
                                      </button>
                                      <button
                                        className={`redcliffe-dashboard-btn secondary redcliffe-dashboard-action-tab ${
                                          activeActionType === "add-member" ? "active" : ""
                                        }`}
                                        onClick={() => setActiveActionType("add-member")}
                                      >
                                        Add additional member
                                      </button>
                                    </div>

                                    {activeActionType === "reschedule" ? (
                                      <div className="redcliffe-dashboard-action-form">
                                        <div className="redcliffe-dashboard-field">
                                          <span>Remark (required)</span>
                                          <input
                                            value={actionForms.remark}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                remark: event.target.value,
                                              }))
                                            }
                                            placeholder="Reason for reschedule"
                                          />
                                        </div>
                                        <div className="redcliffe-dashboard-field">
                                          <span>Collection date (required)</span>
                                          <input
                                            type="date"
                                            value={actionForms.collectionDate}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                collectionDate: event.target.value,
                                              }))
                                            }
                                          />
                                        </div>
                                        <div className="redcliffe-dashboard-field">
                                          <span>Collection slot id (required)</span>
                                          <select
                                            value={actionForms.collectionSlot}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                collectionSlot: event.target.value,
                                              }))
                                            }
                                          >
                                            <option value="">Select slot from available options</option>
                                            {rescheduleSlots.map((slot) => {
                                              const start =
                                                slot.format_12_hrs?.start_time ||
                                                slot.format_24_hrs?.start_time ||
                                                "NA";
                                              const end =
                                                slot.format_12_hrs?.end_time ||
                                                slot.format_24_hrs?.end_time ||
                                                "NA";
                                              return (
                                                <option key={`closed-slot-${slot.id}`} value={slot.id}>
                                                  {slot.id} - {start} to {end}
                                                </option>
                                              );
                                            })}
                                          </select>
                                        </div>
                                        <div className="redcliffe-dashboard-actions">
                                          <button
                                            className="redcliffe-dashboard-btn primary"
                                            onClick={() => submitReschedule(booking.bookingId)}
                                            disabled={actionLoading}
                                          >
                                            {actionLoading ? "Submitting..." : "Submit reschedule"}
                                          </button>
                                        </div>
                                        <div className="redcliffe-dashboard-slot-picker">
                                          <div className="redcliffe-dashboard-slot-buckets">
                                            {["Morning", "Afternoon", "Evening"].map((bucketName) => (
                                              <button
                                                key={`closed-bucket-${bucketName}`}
                                                type="button"
                                                className={`redcliffe-dashboard-slot-bucket ${
                                                  activeSlotBucket === bucketName ? "active" : ""
                                                }`}
                                                onClick={() => setActiveSlotBucket(bucketName)}
                                              >
                                                {bucketName}
                                              </button>
                                            ))}
                                          </div>
                                          {rescheduleSlotLoading ? (
                                            <small>Loading slots...</small>
                                          ) : rescheduleSlotError ? (
                                            <small>{rescheduleSlotError}</small>
                                          ) : groupedRescheduleSlots[activeSlotBucket]?.length ? (
                                            <div className="redcliffe-dashboard-slot-grid">
                                              {groupedRescheduleSlots[activeSlotBucket].map((slot) => {
                                                const labelStart =
                                                  slot.format_12_hrs?.start_time ||
                                                  slot.format_24_hrs?.start_time ||
                                                  "NA";
                                                const labelEnd =
                                                  slot.format_12_hrs?.end_time ||
                                                  slot.format_24_hrs?.end_time ||
                                                  "NA";
                                                const isSelected =
                                                  String(actionForms.collectionSlot) === String(slot.id);
                                                const isDisabled = Number(slot.available_slot ?? 0) < 1;
                                                return (
                                                  <button
                                                    type="button"
                                                    key={`closed-slot-card-${slot.id}`}
                                                    className={`redcliffe-dashboard-slot-card ${isSelected ? "active" : ""}`}
                                                    disabled={isDisabled}
                                                    onClick={() =>
                                                      setActionForms((prev) => ({
                                                        ...prev,
                                                        collectionSlot: String(slot.id),
                                                      }))
                                                    }
                                                  >
                                                    <strong>{labelStart} - {labelEnd}</strong>
                                                    <small>Slots: {slot.available_slot ?? 0}</small>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <small>No slots available in this bucket.</small>
                                          )}
                                        </div>
                                      </div>
                                    ) : null}

                                    {activeActionType === "cancel" ? (
                                      <div className="redcliffe-dashboard-action-form">
                                        <div className="redcliffe-dashboard-field">
                                          <span>Remark (required)</span>
                                          <input
                                            value={actionForms.remark}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                remark: event.target.value,
                                              }))
                                            }
                                            placeholder="Reason for cancellation"
                                          />
                                        </div>
                                        <div className="redcliffe-dashboard-actions">
                                          <button
                                            className="redcliffe-dashboard-btn primary"
                                            onClick={() => submitCancel(booking.bookingId)}
                                            disabled={actionLoading}
                                          >
                                            {actionLoading ? "Submitting..." : "Submit cancellation"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}

                                    {activeActionType === "add-member" ? (
                                      <div className="redcliffe-dashboard-action-form">
                                        <div className="redcliffe-dashboard-field">
                                          <span>Member name</span>
                                          <input
                                            value={actionForms.memberName}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                memberName: event.target.value,
                                              }))
                                            }
                                            placeholder="Full name"
                                          />
                                        </div>
                                        <div className="redcliffe-dashboard-field">
                                          <span>Age</span>
                                          <input
                                            type="number"
                                            min="0"
                                            value={actionForms.memberAge}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                memberAge: event.target.value,
                                              }))
                                            }
                                            placeholder="30"
                                          />
                                        </div>
                                        <div className="redcliffe-dashboard-field">
                                          <span>Gender</span>
                                          <select
                                            value={actionForms.memberGender}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                memberGender: event.target.value,
                                              }))
                                            }
                                          >
                                            <option value="">Select gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                          </select>
                                        </div>
                                        <div className="redcliffe-dashboard-field">
                                          <span>Package code(s)</span>
                                          <select
                                            value={actionForms.memberPackageCodes}
                                            onChange={(event) =>
                                              setActionForms((prev) => ({
                                                ...prev,
                                                memberPackageCodes: event.target.value,
                                              }))
                                            }
                                          >
                                            <option value="">Select available test/package</option>
                                            {availablePackages.map((pkg) => (
                                              <option key={`closed-member-pkg-${booking.bookingId}-${pkg.code}`} value={pkg.code}>
                                                {pkg.code}{pkg.name ? ` - ${pkg.name}` : ""}
                                              </option>
                                            ))}
                                          </select>
                                          {packageLookupLoading ? <small>Loading packages...</small> : null}
                                          {packageLookupMessage ? <small>{packageLookupMessage}</small> : null}
                                        </div>
                                        <div className="redcliffe-dashboard-actions">
                                          <button
                                            className="redcliffe-dashboard-btn primary"
                                            onClick={() => submitAddMember(booking.bookingId)}
                                            disabled={actionLoading}
                                          >
                                            {actionLoading ? "Submitting..." : "Submit additional member"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="12">
                          <div className="redcliffe-dashboard-empty">
                            No closed bookings matched the current filters.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="redcliffe-dashboard-pagination">
                <button
                  className="redcliffe-dashboard-btn secondary"
                  onClick={() => setClosedPage((prev) => Math.max(1, prev - 1))}
                  disabled={closedPage <= 1}
                >
                  Prev
                </button>
                <span>
                  Page {closedPage} of {closedTotalPages}
                </span>
                <button
                  className="redcliffe-dashboard-btn secondary"
                  onClick={() =>
                    setClosedPage((prev) => Math.min(closedTotalPages, prev + 1))
                  }
                  disabled={closedPage >= closedTotalPages}
                >
                  Next
                </button>
              </div>
          </section>
        </div>

      </div>
    </div>
  );
}

