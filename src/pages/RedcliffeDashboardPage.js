import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./RedcliffeDashboardPage.css";

const API_BASE = "http://localhost:5001";

const api = axios.create({
  baseURL: API_BASE,
});

const initialFilters = {
  bookingId: "",
  bookingDate: "",
  collectionDate: "",
  bookingStatus: "",
  packageCode: "",
  phone: "",
};

function DashboardSectionTitle({ step, title, subtitle, action }) {
  return (
    <div className="redcliffe-dashboard-section-head">
      <div className="redcliffe-dashboard-step">{step}</div>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

function CompactField({ label, children }) {
  return (
    <label className="redcliffe-dashboard-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function formatDate(value) {
  if (!value) return "NA";
  return value;
}

function safeLower(value) {
  return String(value || "").trim().toLowerCase();
}

function getPatientSummary(booking) {
  const patient = booking?.patients?.[0];
  if (!patient) {
    return {
      name: "NA",
      ageGender: "NA",
    };
  }

  return {
    name: patient.customerName || "NA",
    ageGender:
      patient.age || patient.gender
        ? `${patient.age || "NA"} / ${patient.gender || "NA"}`
        : "NA",
  };
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

function getFilteredBookings(bookings, bookingStatusQuery) {
  const query = safeLower(bookingStatusQuery);
  if (!query) return bookings;
  return bookings.filter((booking) =>
    safeLower(booking.bookingStatus?.value).includes(query)
  );
}

export default function RedcliffeDashboardPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedTestStatus, setSelectedTestStatus] = useState(null);
  const [selectedPackageDetails, setSelectedPackageDetails] = useState({});
  const [loading, setLoading] = useState({
    bookings: false,
    testStatus: false,
    packageDetails: false,
  });
  const [pageStatus, setPageStatus] = useState("");
  const [pageError, setPageError] = useState("");

  const visibleBookings = useMemo(
    () => getFilteredBookings(bookings, filters.bookingStatus),
    [bookings, filters.bookingStatus]
  );

  const quickStats = useMemo(
    () => getQuickStats(visibleBookings),
    [visibleBookings]
  );

  const clearPageMessages = () => {
    setPageStatus("");
    setPageError("");
  };

  const applyApiError = (error, fallback, setError) => {
    const payload = error?.response?.data || {};
    setError(payload.message || payload.detail || fallback);
  };

  const fetchBookings = useCallback(async (overrideFilters) => {
    const activeFilters = overrideFilters || filters;
    clearPageMessages();
    setLoading((prev) => ({ ...prev, bookings: true }));

    try {
      const params = {
        booking_id: activeFilters.bookingId || undefined,
        booking_date: activeFilters.bookingDate || undefined,
        collection_date: activeFilters.collectionDate || undefined,
        package_code: activeFilters.packageCode || undefined,
        phone: activeFilters.phone || undefined,
      };

      const { data } = await api.get("/api/redcliffe/bookings", { params });
      setBookings(Array.isArray(data?.results) ? data.results : []);
      setSummary(data?.summary || null);
      setPageStatus(data?.message || "Bookings loaded.");
    } catch (error) {
      setBookings([]);
      setSummary(null);
      setSelectedBooking(null);
      applyApiError(error, "Failed to load bookings.", setPageError);
    } finally {
      setLoading((prev) => ({ ...prev, bookings: false }));
    }
  }, [filters]);

  useEffect(() => {
    fetchBookings(initialFilters);
  }, [fetchBookings]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    fetchBookings(filters);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    fetchBookings(initialFilters);
  };

  const openBooking = (booking) => {
    setSelectedBooking(booking);
    setSelectedTestStatus(null);
    setSelectedPackageDetails({});
  };

  const closeBooking = () => {
    setSelectedBooking(null);
    setSelectedTestStatus(null);
    setSelectedPackageDetails({});
  };

  const fetchTestStatus = async (bookingId) => {
    if (!bookingId) return;
    setLoading((prev) => ({ ...prev, testStatus: true }));

    try {
      const { data } = await api.get(
        `/api/redcliffe/bookings/${bookingId}/test-status`
      );
      setSelectedTestStatus(data?.data || null);
    } catch (error) {
      applyApiError(error, "Failed to fetch test status.", setPageError);
    } finally {
      setLoading((prev) => ({ ...prev, testStatus: false }));
    }
  };

  const fetchPackageDetails = async (code) => {
    if (!code) return;
    setLoading((prev) => ({ ...prev, packageDetails: true }));

    try {
      const { data } = await api.get(`/api/redcliffe/packages/${code}/details`);
      setSelectedPackageDetails((prev) => ({
        ...prev,
        [code]: data?.package || null,
      }));
    } catch (error) {
      applyApiError(
        error,
        "Failed to fetch package details.",
        setPageError
      );
    } finally {
      setLoading((prev) => ({ ...prev, packageDetails: false }));
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
            <span>Total</span>
            <strong>{quickStats.total}</strong>
          </div>
          <div className="redcliffe-dashboard-stat-card">
            <span>Confirmed</span>
            <strong>{quickStats.confirmed}</strong>
          </div>
          <div className="redcliffe-dashboard-stat-card">
            <span>Collected</span>
            <strong>{quickStats.collected}</strong>
          </div>
          <div className="redcliffe-dashboard-stat-card">
            <span>Reports ready</span>
            <strong>{quickStats.reportsReady}</strong>
          </div>
        </section>

        {pageStatus ? (
          <div className="redcliffe-dashboard-banner success">{pageStatus}</div>
        ) : null}
        {pageError ? (
          <div className="redcliffe-dashboard-banner error">{pageError}</div>
        ) : null}

        <div className="redcliffe-dashboard-layout">
          <div className="redcliffe-dashboard-main">
            <section className="redcliffe-dashboard-card">
              <DashboardSectionTitle
                step="1"
                title="Find bookings"
                subtitle="Filter by booking details, dates, package code, or phone number."
              />

              <div className="redcliffe-dashboard-filter-grid">
                <CompactField label="Booking ID">
                  <input
                    value={filters.bookingId}
                    onChange={(event) =>
                      handleFilterChange("bookingId", event.target.value)
                    }
                    placeholder="1384873"
                  />
                </CompactField>

                <CompactField label="Booking date">
                  <input
                    type="date"
                    value={filters.bookingDate}
                    onChange={(event) =>
                      handleFilterChange("bookingDate", event.target.value)
                    }
                  />
                </CompactField>

                <CompactField label="Collection date">
                  <input
                    type="date"
                    value={filters.collectionDate}
                    onChange={(event) =>
                      handleFilterChange("collectionDate", event.target.value)
                    }
                  />
                </CompactField>

                <CompactField label="Booking status">
                  <input
                    value={filters.bookingStatus}
                    onChange={(event) =>
                      handleFilterChange("bookingStatus", event.target.value)
                    }
                    placeholder="confirmed / rescheduled"
                  />
                </CompactField>

                <CompactField label="Package code">
                  <input
                    value={filters.packageCode}
                    onChange={(event) =>
                      handleFilterChange("packageCode", event.target.value)
                    }
                    placeholder="PL98"
                  />
                </CompactField>

                <CompactField label="Phone">
                  <input
                    value={filters.phone}
                    onChange={(event) =>
                      handleFilterChange("phone", event.target.value)
                    }
                    placeholder="10-digit mobile"
                  />
                </CompactField>
              </div>

              <div className="redcliffe-dashboard-actions">
                <button
                  className="redcliffe-dashboard-btn primary"
                  onClick={applyFilters}
                  disabled={loading.bookings}
                >
                  {loading.bookings ? "Loading..." : "Apply filters"}
                </button>
                <button
                  className="redcliffe-dashboard-btn secondary"
                  onClick={resetFilters}
                  disabled={loading.bookings}
                >
                  Reset
                </button>
              </div>
            </section>

            <section className="redcliffe-dashboard-card">
              <DashboardSectionTitle
                step="2"
                title="Bookings"
                subtitle="Open any booking to review patient, collection, payment, and report details."
                action={
                  <button
                    className="redcliffe-dashboard-btn subtle"
                    onClick={() => fetchBookings(filters)}
                    disabled={loading.bookings}
                  >
                    Refresh
                  </button>
                }
              />

              <div className="redcliffe-dashboard-table-wrap">
                <table className="redcliffe-dashboard-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Booking ID</th>
                      <th>Reference</th>
                      <th>Booking date</th>
                      <th>Patient</th>
                      <th>Age / gender</th>
                      <th>Phone</th>
                      <th>Collection</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Pickup</th>
                      <th>Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBookings.length ? (
                      visibleBookings.map((booking) => {
                        const patient = getPatientSummary(booking);
                        return (
                          <tr key={booking.bookingId || Math.random()}>
                            <td>
                              <button
                                className="redcliffe-dashboard-inline-btn"
                                onClick={() => openBooking(booking)}
                              >
                                View
                              </button>
                            </td>
                            <td>{booking.bookingId || "NA"}</td>
                            <td>{booking.referenceData || "NA"}</td>
                            <td>{formatDate(booking.bookingDate)}</td>
                            <td>{patient.name}</td>
                            <td>{patient.ageGender}</td>
                            <td>{booking.customerPhone || "NA"}</td>
                            <td>
                              <div>{formatDate(booking.collectionDate)}</div>
                              <small>
                                {booking.collectionTime?.slot12Hours || "NA"}
                              </small>
                            </td>
                            <td>
                              <div>{booking.address || "NA"}</div>
                              <small>{booking.landmark || booking.city || "NA"}</small>
                            </td>
                            <td>
                              <span className="redcliffe-dashboard-pill green">
                                {booking.bookingStatus?.label || "NA"}
                              </span>
                            </td>
                            <td>
                              <span className="redcliffe-dashboard-pill yellow">
                                {booking.pickupStatus || "NA"}
                              </span>
                            </td>
                            <td>
                              <span className="redcliffe-dashboard-pill coral">
                                {booking.reportStatus || "none"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="12">
                          <div className="redcliffe-dashboard-empty">
                            No bookings matched the current filters.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className={`redcliffe-dashboard-detail ${selectedBooking ? "open" : ""}`}>
            {selectedBooking ? (
              <>
                <div className="redcliffe-dashboard-detail-head">
                  <div>
                    <div className="redcliffe-dashboard-detail-label">Booking details</div>
                    <h3>Booking #{selectedBooking.bookingId || "NA"}</h3>
                  </div>
                  <button
                    className="redcliffe-dashboard-close"
                    onClick={closeBooking}
                  >
                    Close
                  </button>
                </div>

                <div className="redcliffe-dashboard-detail-body">
                  <div className="redcliffe-dashboard-detail-block">
                    <h4>Overview</h4>
                    <div className="redcliffe-dashboard-detail-grid">
                      <div><span>Status</span><strong>{selectedBooking.bookingStatus?.label || "NA"}</strong></div>
                      <div><span>Pickup</span><strong>{selectedBooking.pickupStatus || "NA"}</strong></div>
                      <div><span>Booking date</span><strong>{selectedBooking.bookingDate || "NA"}</strong></div>
                      <div><span>Collection date</span><strong>{selectedBooking.collectionDate || "NA"}</strong></div>
                      <div><span>Phone</span><strong>{selectedBooking.customerPhone || "NA"}</strong></div>
                      <div><span>Reference</span><strong>{selectedBooking.referenceData || "NA"}</strong></div>
                    </div>
                  </div>

                  <div className="redcliffe-dashboard-detail-block">
                    <h4>Patients & packages</h4>
                    {selectedBooking.patients?.length ? (
                      selectedBooking.patients.map((patient, index) => (
                        <div className="redcliffe-dashboard-patient-card" key={`${patient.patientId || patient.customerName}-${index}`}>
                          <strong>{patient.customerName || "NA"}</strong>
                          <p>{patient.age || "NA"} / {patient.gender || "NA"}</p>
                          <div className="redcliffe-dashboard-package-row">
                            {patient.packages?.length ? (
                              patient.packages.map((pkg) => (
                                <button
                                  key={`${patient.patientId || patient.customerName}-${pkg.code}`}
                                  className="redcliffe-dashboard-chip"
                                  onClick={() => fetchPackageDetails(pkg.code)}
                                >
                                  {pkg.code || "NA"}
                                </button>
                              ))
                            ) : (
                              <span className="redcliffe-dashboard-muted">No packages</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="redcliffe-dashboard-empty">No patient details.</div>
                    )}
                  </div>

                  <div className="redcliffe-dashboard-detail-block">
                    <div className="redcliffe-dashboard-inline-head">
                      <h4>Test status</h4>
                      <button
                        className="redcliffe-dashboard-btn subtle"
                        onClick={() => fetchTestStatus(selectedBooking.bookingId)}
                        disabled={loading.testStatus}
                      >
                        {loading.testStatus ? "Loading..." : "Fetch test status"}
                      </button>
                    </div>
                    {selectedTestStatus ? (
                      <div className="redcliffe-dashboard-test-grid">
                        <div>
                          <span>Pending</span>
                          <strong>{selectedTestStatus.pendingTests?.join(", ") || "None"}</strong>
                        </div>
                        <div>
                          <span>Completed</span>
                          <strong>{selectedTestStatus.completedTests?.join(", ") || "None"}</strong>
                        </div>
                        <div>
                          <span>Rejected</span>
                          <strong>{selectedTestStatus.rejectedTests?.join(", ") || "None"}</strong>
                        </div>
                        <div>
                          <span>Dismissed</span>
                          <strong>{selectedTestStatus.dismissedTests?.join(", ") || "None"}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="redcliffe-dashboard-empty">
                        Test status will appear here when it is available from Redcliffe.
                      </div>
                    )}
                  </div>

                  <div className="redcliffe-dashboard-detail-block">
                    <h4>Package parameter detail</h4>
                    {Object.keys(selectedPackageDetails).length ? (
                      Object.entries(selectedPackageDetails).map(([code, pkg]) => (
                        <div className="redcliffe-dashboard-package-detail" key={code}>
                          <strong>{pkg?.name || "Package detail unavailable"} ({code})</strong>
                          {pkg?.groups?.length ? (
                            pkg.groups.map((group) => (
                              <div key={`${code}-${group.name}`} className="redcliffe-dashboard-package-group">
                                <span>{group.name}</span>
                                <p>{group.tests.join(", ") || "No parameters listed."}</p>
                              </div>
                            ))
                          ) : (
                            <p className="redcliffe-dashboard-muted">
                              This package detail may only be available on Redcliffe production.
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="redcliffe-dashboard-empty">
                        Click a package code above to fetch its parameter list.
                      </div>
                    )}
                  </div>

                  <div className="redcliffe-dashboard-detail-block">
                    <h4>Phlebo, payment, reports</h4>
                    <div className="redcliffe-dashboard-detail-grid">
                      <div>
                        <span>Phlebo</span>
                        <strong>{selectedBooking.phleboDetail?.name || "NA"}</strong>
                      </div>
                      <div>
                        <span>Phlebo contact</span>
                        <strong>{selectedBooking.phleboDetail?.contact || "NA"}</strong>
                      </div>
                      <div>
                        <span>Payable</span>
                        <strong>{selectedBooking.paymentDetail?.final_price || "NA"}</strong>
                      </div>
                      <div>
                        <span>Report links</span>
                        <strong>{selectedBooking.reportSummary?.links?.length || 0}</strong>
                      </div>
                    </div>
                    {selectedBooking.reportSummary?.links?.length ? (
                      <div className="redcliffe-dashboard-link-list">
                        {selectedBooking.reportSummary.links.map((link) => (
                          <a key={link} href={link} target="_blank" rel="noreferrer">
                            Open report
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>

                </div>
              </>
            ) : (
              <div className="redcliffe-dashboard-detail-placeholder">
                <h3>Open a booking</h3>
                <p>Select any booking row to inspect nested data, fetch test status, and review package parameters.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
