import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./RedcliffeBookingPage.css";

const API_BASE = "http://localhost:5001";

const api = axios.create({
  baseURL: API_BASE,
});

const todayIso = () => new Date().toISOString().slice(0, 10);

const initialForm = {
  placeQuery: "",
  selectedEloc: "",
  latitude: "",
  longitude: "",
  collectionDate: "",
  selectedSlotId: "",
  packageCodes: [],
  customerName: "",
  customerAge: "",
  customerGender: "",
  customerEmail: "",
  customerPhone: "",
  customerAltPhone: "",
  customerWhatsappPhone: "",
  customerAddress: "",
  addressLine2: "",
  customerLandmark: "",
  pincode: "",
  isCredit: "true",
  centerDiscount: "",
  referenceData: "",
};

const createAdditionalMember = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  customerName: "",
  customerAge: "",
  customerGender: "",
  packageCodes: [],
});

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

function normalizeSlotTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parts = raw.split(":");
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return raw;
}

const initialAddressDraft = {
  localityQuery: "",
  selectedEloc: "",
  localityLabel: "",
  placeAddress: "",
  houseNumber: "",
  addressLine2: "",
  landmark: "",
  pincode: "",
};

function SectionTitle({ step, title, subtitle }) {
  return (
    <div className="redcliffe-section-head">
      <div className="redcliffe-step">{step}</div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ className = "", label, children }) {
  return (
    <div className={`redcliffe-field ${className}`.trim()}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function parsePincodeFromText(text) {
  const match = String(text || "").match(/\b\d{6}\b/);
  return match ? match[0] : "";
}

function getLocationPincode(location) {
  return (
    String(location?.address?.pincode || "").trim() ||
    parsePincodeFromText(location?.placeAddress) ||
    ""
  );
}

function uniqueParts(parts) {
  const seen = new Set();
  const output = [];
  parts.forEach((raw) => {
    const value = String(raw || "").trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(value);
  });
  return output;
}

function buildSecondaryAddress(location) {
  const structuredParts = uniqueParts([
    location?.address?.street,
    location?.address?.subSubLocality,
    location?.address?.subLocality,
    location?.address?.locality,
    location?.address?.city,
    location?.address?.state,
  ]);

  if (structuredParts.length) {
    return structuredParts.join(", ");
  }

  const fallback = uniqueParts(
    String(location?.placeAddress || "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && !/^\d{6}$/.test(item))
  );
  return fallback.join(", ");
}

function getHouseAddress(location) {
  return String(
    location?.address?.houseNumber || location?.address?.houseName || ""
  ).trim();
}

function getLandmarkValue(location) {
  return String(
    location?.address?.subSubLocality || location?.address?.poi || ""
  ).trim();
}

function formatLocationOption(item) {
  const locality = String(item?.placeName || "").trim();
  const address = String(item?.placeAddress || "").trim();
  if (locality && address && locality.toLowerCase() !== address.toLowerCase()) {
    return `${locality} - ${address}`;
  }
  return locality || address || String(item?.eloc || "").trim();
}

export default function RedcliffeBookingPage() {
  const [form, setForm] = useState(initialForm);
  const [locations, setLocations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isLocationFieldFocused, setIsLocationFieldFocused] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [addressDraft, setAddressDraft] = useState(initialAddressDraft);
  const [addressMatches, setAddressMatches] = useState([]);
  const [addressSearchMessage, setAddressSearchMessage] = useState("");
  const [isAddressLocalityFocused, setIsAddressLocalityFocused] = useState(false);
  const [slotStatus, setSlotStatus] = useState("");
  const [slotError, setSlotError] = useState("");
  const [activeSlotBucket, setActiveSlotBucket] = useState("Morning");
  const [availablePackages, setAvailablePackages] = useState([]);
  const [showPackagePicker, setShowPackagePicker] = useState(false);
  const [packageSearch, setPackageSearch] = useState("");
  const [packageLookupMessage, setPackageLookupMessage] = useState("");
  const [additionalMembers, setAdditionalMembers] = useState([]);
  const [memberPackageSearch, setMemberPackageSearch] = useState({});
  const [temporaryBooking, setTemporaryBooking] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [areaStatus, setAreaStatus] = useState("");
  const [areaError, setAreaError] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [loading, setLoading] = useState({
    locations: false,
    addressSearch: false,
    addressApply: false,
    slots: false,
    packages: false,
    create: false,
    confirm: false,
  });

  const selectedLocation = useMemo(
    () => locations.find((item) => item.eloc === form.selectedEloc) || null,
    [locations, form.selectedEloc]
  );

  const selectedSlot = useMemo(
    () =>
      slots.find((item) => String(item.id) === String(form.selectedSlotId)) ||
      null,
    [slots, form.selectedSlotId]
  );

  const selectedPackages = useMemo(() => {
    const selectedSet = new Set(toArray(form.packageCodes).map((code) => String(code).trim()));
    return availablePackages.filter((item) => selectedSet.has(String(item.code || "").trim()));
  }, [availablePackages, form.packageCodes]);

  const filteredPackages = useMemo(() => {
    const query = packageSearch.trim().toLowerCase();
    if (!query) return availablePackages;
    return availablePackages.filter((item) => {
      const code = String(item.code || "").toLowerCase();
      const name = String(item.name || "").toLowerCase();
      return code.includes(query) || name.includes(query);
    });
  }, [availablePackages, packageSearch]);

  const groupedSlots = useMemo(() => {
    const groups = { Morning: [], Afternoon: [], Evening: [] };
    slots.forEach((slot) => {
      groups[getSlotBucket(slot)].push(slot);
    });
    return groups;
  }, [slots]);

  const addressPreview = useMemo(
    () => ({
      locality:
        selectedLocation?.placeName ||
        selectedLocation?.placeAddress ||
        form.placeQuery ||
        "Not selected",
      houseNumber: form.customerAddress || "Not added",
      addressLine2: form.addressLine2 || "Not added",
      landmark: form.customerLandmark || "Not added",
    }),
    [form.addressLine2, form.customerAddress, form.customerLandmark, form.placeQuery, selectedLocation]
  );

  useEffect(() => {
    const query = form.placeQuery.trim();
    if (
      showAddressDialog ||
      !isLocationFieldFocused ||
      !showLocationSuggestions ||
      query.length < 3
    ) {
      if (!showAddressDialog && !query) {
        setLocations([]);
        setShowLocationSuggestions(false);
      }
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading((prev) => ({ ...prev, locations: true }));
      try {
        const { data } = await api.get("/api/redcliffe/location-search", {
          params: { place_query: query },
        });

        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
            ? data.data
            : [];
        setLocations(results);
      } catch (_error) {
        setLocations([]);
        setShowLocationSuggestions(false);
      } finally {
        setLoading((prev) => ({ ...prev, locations: false }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [form.placeQuery, isLocationFieldFocused, showAddressDialog, showLocationSuggestions]);

  useEffect(() => {
    if (!showAddressDialog || !isAddressLocalityFocused) return undefined;

    const query = addressDraft.localityQuery.trim();
    if (query.length < 3) {
      setAddressMatches([]);
      setAddressSearchMessage(query ? "Enter at least 3 characters." : "");
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading((prev) => ({ ...prev, addressSearch: true }));
      setAddressSearchMessage("");
      try {
        const { data } = await api.get("/api/redcliffe/location-search", {
          params: { place_query: query },
        });

        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
            ? data.data
            : [];
        setAddressMatches(results);
        setAddressSearchMessage(
          results.length ? "Select a matching locality." : "No localities found."
        );
      } catch (_error) {
        setAddressMatches([]);
        setAddressSearchMessage("Unable to search localities.");
      } finally {
        setLoading((prev) => ({ ...prev, addressSearch: false }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [addressDraft.localityQuery, isAddressLocalityFocused, showAddressDialog]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetBookingMessages = () => {
    setBookingStatus("");
    setBookingError("");
  };

  const applyRequestError = (err, fallbackMessage) => {
    const payload = err?.response?.data || {};
    setBookingError(payload.message || payload.detail || fallbackMessage);
  };

  const selectLocation = async (eloc, locationItem = null) => {
    setField("selectedEloc", eloc);
    setField("selectedSlotId", "");
    setSlots([]);
    setSlotStatus("");
    setSlotError("");
    setAreaStatus("");
    setAreaError("");
    setShowLocationSuggestions(false);
    setIsLocationFieldFocused(false);

    if (!eloc) {
      setField("latitude", "");
      setField("longitude", "");
      return;
    }

    try {
      const { data } = await api.get("/api/redcliffe/location-by-eloc", {
        params: { eloc },
      });

      const matched = locationItem || locations.find((item) => item.eloc === eloc);
      if (matched?.placeName || matched?.placeAddress) {
        setField("placeQuery", matched.placeName || matched.placeAddress);
      }
      setField("latitude", data?.latitude ?? "");
      setField("longitude", data?.longitude ?? "");
      setField("pincode", getLocationPincode(matched));
      setField("customerAddress", getHouseAddress(matched));
      setField("addressLine2", buildSecondaryAddress(matched));
      setField("customerLandmark", getLandmarkValue(matched));
      setAreaStatus("Location selected and coordinates fetched.");
      setAreaError("");
      setSlotStatus("");
      setSlotError("");
    } catch (err) {
      setAreaError(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          "Failed to fetch coordinates."
      );
      setAreaStatus("");
    }
  };

  const openAddressDialog = () => {
    setAddressDraft({
      localityQuery: form.placeQuery || "",
      selectedEloc: form.selectedEloc || "",
      localityLabel:
        selectedLocation?.placeName ||
        selectedLocation?.placeAddress ||
        form.placeQuery ||
        "",
      placeAddress: selectedLocation?.placeAddress || "",
      houseNumber: form.customerAddress || "",
      addressLine2: form.addressLine2 || "",
      landmark: form.customerLandmark || "",
      pincode: form.pincode || getLocationPincode(selectedLocation) || "",
    });
    setAddressMatches([]);
    setAddressSearchMessage("");
    setIsAddressLocalityFocused(false);
    setShowAddressDialog(true);
  };

  const closeAddressDialog = () => {
    setShowAddressDialog(false);
    setAddressMatches([]);
    setAddressSearchMessage("");
    setIsAddressLocalityFocused(false);
  };

  const selectAddressCandidate = (item) => {
    setAddressDraft((prev) => ({
      ...prev,
      selectedEloc: item.eloc,
      localityLabel: item.placeName || item.placeAddress || item.eloc,
      placeAddress: item.placeAddress || "",
      pincode: getLocationPincode(item) || prev.pincode || "",
      localityQuery: item.placeName || item.placeAddress || item.eloc,
      houseNumber: getHouseAddress(item),
      addressLine2: buildSecondaryAddress(item),
      landmark: getLandmarkValue(item),
    }));
    setIsAddressLocalityFocused(false);
  };

  const applyAddressDraft = async () => {
    if (!addressDraft.selectedEloc) {
      setAreaError("Select a locality before saving the address.");
      return;
    }

    setAreaStatus("");
    setAreaError("");
    setLoading((prev) => ({ ...prev, addressApply: true }));

    try {
      await selectLocation(addressDraft.selectedEloc, {
        eloc: addressDraft.selectedEloc,
        placeName: addressDraft.localityLabel,
        placeAddress: addressDraft.placeAddress,
        address: { pincode: addressDraft.pincode },
      });

      setForm((prev) => ({
        ...prev,
        customerAddress: addressDraft.houseNumber || prev.customerAddress,
        addressLine2: addressDraft.addressLine2,
        customerLandmark: addressDraft.landmark,
        pincode: addressDraft.pincode || prev.pincode,
      }));
      closeAddressDialog();
      setAreaStatus("Address updated successfully.");
      setAreaError("");
    } catch (_error) {
      setAreaError("Unable to update the address.");
    } finally {
      setLoading((prev) => ({ ...prev, addressApply: false }));
    }
  };

  const fetchSlots = async () => {
    if (!form.collectionDate || !form.latitude || !form.longitude) {
      setSlotError("Select a location and collection date first.");
      return;
    }

    setSlotStatus("");
    setSlotError("");
    setAreaStatus("");
    setAreaError("");
    setBookingStatus("");
    setBookingError("");
    setLoading((prev) => ({ ...prev, slots: true }));

    try {
      const { data } = await api.get("/api/redcliffe/time-slots", {
        params: {
          collection_date: form.collectionDate,
          latitude: form.latitude,
          longitude: form.longitude,
          customer_gender: form.customerGender || undefined,
        },
      });

      const results = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setSlots(results);
      if (results.length) {
        const firstBucket = ["Morning", "Afternoon", "Evening"].find((name) =>
          results.some((slot) => getSlotBucket(slot) === name)
        );
        if (firstBucket) setActiveSlotBucket(firstBucket);
      }
      setSlotStatus(data?.message || (results.length ? "Slots loaded." : ""));
      if (!results.length) {
        setSlotError(data?.message || "No slots available.");
      }
    } catch (err) {
      setSlots([]);
      const payload = err?.response?.data || {};
      setSlotError(payload.message || payload.detail || "Failed to fetch slots.");
    } finally {
      setLoading((prev) => ({ ...prev, slots: false }));
    }
  };

  const loadPartnerPackages = async () => {
    setShowPackagePicker(true);
    setPackageLookupMessage("");

    if (availablePackages.length) return;

    setLoading((prev) => ({ ...prev, packages: true }));
    try {
      const { data } = await api.get("/api/redcliffe/bookings");
      const records = Array.isArray(data?.results) ? data.results : [];
      const packageMap = new Map();

      records.forEach((record) => {
        toArray(record?.packages).forEach((pkg) => {
          const code = String(pkg?.code || "").trim();
          if (!code || packageMap.has(code)) return;
          packageMap.set(code, {
            code,
            name: String(pkg?.name || code).trim(),
          });
        });
      });

      const packages = Array.from(packageMap.values()).sort((a, b) =>
        `${a.name} ${a.code}`.localeCompare(`${b.name} ${b.code}`)
      );

      setAvailablePackages(packages);
      if (!packages.length) {
        setPackageLookupMessage("No partner packages are available right now.");
      }
    } catch (err) {
      const payload = err?.response?.data || {};
      setPackageLookupMessage(
        payload.message || payload.detail || "Unable to load partner packages."
      );
    } finally {
      setLoading((prev) => ({ ...prev, packages: false }));
    }
  };

  const togglePrimaryPackage = (pkgCode) => {
    const current = new Set(toArray(form.packageCodes).map((code) => String(code).trim()));
    if (current.has(pkgCode)) current.delete(pkgCode);
    else current.add(pkgCode);
    setField("packageCodes", Array.from(current));
  };

  const addAdditionalMember = () => {
    setAdditionalMembers((prev) => {
      if (prev.length >= 4) return prev;
      return [...prev, createAdditionalMember()];
    });
  };

  const removeAdditionalMember = (memberId) => {
    setAdditionalMembers((prev) => prev.filter((member) => member.id !== memberId));
    setMemberPackageSearch((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  };

  const setMemberField = (memberId, field, value) => {
    setAdditionalMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, [field]: value } : member
      )
    );
  };

  const toggleMemberPackage = (memberId, pkgCode) => {
    setAdditionalMembers((prev) =>
      prev.map((member) => {
        if (member.id !== memberId) return member;
        const current = new Set(
          toArray(member.packageCodes).map((code) => String(code).trim())
        );
        if (current.has(pkgCode)) current.delete(pkgCode);
        else current.add(pkgCode);
        return { ...member, packageCodes: Array.from(current) };
      })
    );
  };

  const getFilteredMemberPackages = (memberId) => {
    const query = String(memberPackageSearch[memberId] || "").trim().toLowerCase();
    if (!query) return availablePackages;
    return availablePackages.filter((pkg) => {
      const code = String(pkg.code || "").toLowerCase();
      const name = String(pkg.name || "").toLowerCase();
      return code.includes(query) || name.includes(query);
    });
  };

  const createBooking = async () => {
    resetBookingMessages();
    setLoading((prev) => ({ ...prev, create: true }));

    try {
      const payload = {
        booking_date: todayIso(),
        collection_date: form.collectionDate,
        collection_slot: form.selectedSlotId,
        package_code: form.packageCodes,
        customer_name: form.customerName,
        customer_age: form.customerAge,
        customer_gender: form.customerGender,
        customer_email: form.customerEmail,
        customer_phonenumber: form.customerPhone,
        customer_whatsappnumber:
          form.customerWhatsappPhone || form.customerPhone,
        customer_address: form.customerAddress,
        address_line2: form.addressLine2,
        customer_landmark: form.customerLandmark,
        pincode: form.pincode,
        is_credit: form.isCredit === "true",
        customer_longitude: form.longitude,
        customer_latitude: form.latitude,
        booking_type: "Homedx",
        additional_member: additionalMembers
          .filter(
            (member) =>
              member.customerName &&
              member.customerAge &&
              member.customerGender &&
              toArray(member.packageCodes).length
          )
          .map((member) => ({
            customerName: member.customerName,
            customerAge: member.customerAge,
            customerGender: member.customerGender,
            packageCode: member.packageCodes,
          })),
      };

      const { data } = await api.post("/api/redcliffe/bookings/create", payload);
      setTemporaryBooking(data);
      setConfirmedBooking(null);
      setBookingStatus(data?.message || "Temporary booking created.");
    } catch (err) {
      applyRequestError(err, "Failed to create booking.");
    } finally {
      setLoading((prev) => ({ ...prev, create: false }));
    }
  };

  const confirmBooking = async (isConfirmed) => {
    const bookingId = temporaryBooking?.booking_id || temporaryBooking?.pk;

    if (!bookingId) {
      setBookingError("Create a temporary booking first.");
      return;
    }

    resetBookingMessages();
    setLoading((prev) => ({ ...prev, confirm: true }));

    try {
      const { data } = await api.post("/api/redcliffe/bookings/confirm", {
        booking_id: bookingId,
        is_confirmed: isConfirmed,
      });

      setConfirmedBooking(data);
      setBookingStatus(
        data?.message ||
          (isConfirmed ? "Booking confirmed." : "Booking cancelled.")
      );
    } catch (err) {
      applyRequestError(err, "Failed to confirm booking.");
    } finally {
      setLoading((prev) => ({ ...prev, confirm: false }));
    }
  };

  return (
    <div className="redcliffe-page">
      <div className="redcliffe-shell">
        <section className="redcliffe-hero">
          <div className="redcliffe-badge">Redcliffe Booking</div>
          <h1>Book Lab Test</h1> 
        </section>

        <div className="redcliffe-layout">
          <div className="redcliffe-main">
            <section className="redcliffe-card">
              <div className="redcliffe-card-body">
                <SectionTitle
                  step="1"
                  title="Collection Area"
                  subtitle="Search the serviceable area and confirm the collection location."
                />

                <div className="redcliffe-grid">
                  <Field className="span-12" label="Search area">
                    <div className="redcliffe-location-search">
                      <input
                        value={form.placeQuery}
                        onChange={(e) => {
                          setField("placeQuery", e.target.value);
                          setField("selectedEloc", "");
                          setShowLocationSuggestions(true);
                          setIsLocationFieldFocused(true);
                        }}
                        onFocus={() => {
                          setIsLocationFieldFocused(true);
                          setShowLocationSuggestions(true);
                        }}
                        onBlur={() => {
                          window.setTimeout(() => {
                            setIsLocationFieldFocused(false);
                          }, 120);
                        }}
                        placeholder="Search locality"
                      />
                      {isLocationFieldFocused &&
                      showLocationSuggestions &&
                      locations.length ? (
                        <div className="redcliffe-location-suggestion-list">
                          {locations.map((item) => (
                            <button
                              type="button"
                              key={item.eloc}
                              className="redcliffe-location-suggestion"
                              onClick={() => selectLocation(item.eloc, item)}
                            >
                              {formatLocationOption(item)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Field>

                </div>

                {selectedLocation ? (
                <div className="redcliffe-location-card" style={{ marginTop: 18 }}>
                    <div className="redcliffe-location-card-grid">
                      <div className="redcliffe-location-card-line">
                        <span>Locality</span>
                        <strong>
                          {selectedLocation?.placeName ||
                            selectedLocation?.placeAddress ||
                            selectedLocation?.eloc}
                        </strong>
                      </div>
                      <div className="redcliffe-location-card-line">
                        <span>House No./Flat No./Door No.</span>
                        <strong>{addressPreview.houseNumber}</strong>
                      </div>
                      <div className="redcliffe-location-card-line">
                        <span>Apartment/Building/Block/Street</span>
                        <strong>{addressPreview.addressLine2}</strong>
                      </div>
                      <div className="redcliffe-location-card-line">
                        <span>Landmark/Sub-locality</span>
                        <strong>{addressPreview.landmark}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="redcliffe-location-edit-btn"
                      onClick={openAddressDialog}
                    >
                      Edit address
                    </button>
                  </div>
                ) : null}
                {areaStatus ? (
                  <div className="redcliffe-inline-note success" style={{ marginTop: 14 }}>
                    {areaStatus}
                  </div>
                ) : null}
                {areaError ? (
                  <div className="redcliffe-inline-note error" style={{ marginTop: 14 }}>
                    {areaError}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="redcliffe-card">
              <div className="redcliffe-card-body">
                <SectionTitle
                  step="2"
                  title="Get Collection Slot"
                  subtitle="Use the selected location and date to fetch available slots."
                />

                <div className="redcliffe-grid">
                  <Field className="span-4" label="Collection date">
                    <input
                      type="date"
                      value={form.collectionDate}
                      onChange={(e) =>
                        setField("collectionDate", e.target.value)
                      }
                    />
                  </Field>

                  <Field className="span-4" label="Action">
                    <button
                      className="redcliffe-btn redcliffe-btn-accent"
                      onClick={fetchSlots}
                      disabled={loading.slots}
                    >
                      {loading.slots ? "Loading..." : "Get slots"}
                    </button>
                  </Field>

                  <div className="redcliffe-field span-12">
                    <label>Available slot</label>
                    {slots.length ? (
                      <div className="redcliffe-slot-buckets">
                        <div className="redcliffe-slot-tabs" role="tablist" aria-label="Slot time buckets">
                          {["Morning", "Afternoon", "Evening"].map((bucketName) => (
                            <button
                              key={bucketName}
                              type="button"
                              role="tab"
                              aria-selected={activeSlotBucket === bucketName}
                              className={`redcliffe-slot-tab${activeSlotBucket === bucketName ? " active" : ""}`}
                              onClick={() => setActiveSlotBucket(bucketName)}
                            >
                              {bucketName}
                              <span>{groupedSlots[bucketName].length}</span>
                            </button>
                          ))}
                        </div>

                        <div className="redcliffe-slot-bucket">
                            <div className="redcliffe-slot-bucket-title">{activeSlotBucket}</div>
                            <div className="redcliffe-slot-grid compact" role="list">
                              {groupedSlots[activeSlotBucket].map((slot) => {
                                const slotId = String(slot.id);
                                const isSelected =
                                  String(form.selectedSlotId) === slotId;
                                const startTime =
                                  slot.format_24_hrs?.start_time ||
                                  slot.format_12_hrs?.start_time ||
                                  slot.id;
                                const endTime =
                                  slot.format_24_hrs?.end_time ||
                                  slot.format_12_hrs?.end_time ||
                                  "";
                                const isDisabled = Number(slot.available_slot ?? 0) < 1;

                                return (
                                  <button
                                    type="button"
                                    key={slot.id}
                                    className={`redcliffe-slot-card${isSelected ? " selected" : ""}`}
                                    onClick={() => setField("selectedSlotId", slotId)}
                                    disabled={isDisabled}
                                  >
                                    <span className="redcliffe-slot-time">
                                      {`${normalizeSlotTime(startTime)}-${normalizeSlotTime(endTime)}`}
                                    </span>
                                    <span className="redcliffe-slot-label">
                                      Available slots:
                                    </span>
                                    <span className="redcliffe-slot-count">
                                      {slot.available_slot ?? 0}
                                    </span>
                                  </button>
                                );
                              })}
                              {!groupedSlots[activeSlotBucket].length ? (
                                <div className="redcliffe-slot-empty small">No slots</div>
                              ) : null}
                            </div>
                          </div>
                      </div>
                    ) : (
                      <div className="redcliffe-slot-empty">
                        {loading.slots
                          ? "Loading slots..."
                          : "No slots loaded yet."}
                      </div>
                    )}
                    {slotStatus ? (
                      <div className="redcliffe-inline-note success">{slotStatus}</div>
                    ) : null}
                    {slotError ? (
                      <div className="redcliffe-inline-note error">{slotError}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="redcliffe-card">
              <div className="redcliffe-card-body">
                <SectionTitle
                  step="3"
                  title="Create Booking"
                  subtitle="Fill only the required details needed to create the booking."
                />

                <div className="redcliffe-grid">
                  <Field className="span-12" label="Package details">
                    <div className="redcliffe-picker">
                      <button
                        type="button"
                        className="redcliffe-picker-trigger"
                        onClick={loadPartnerPackages}
                      >
                        <span>
                          {selectedPackages.length
                            ? `${selectedPackages.length} package(s) selected`
                            : "Select package(s)"}
                        </span>
                        <strong>{loading.packages ? "Loading..." : "Choose"}</strong>
                      </button>

                      {showPackagePicker ? (
                        <div className="redcliffe-picker-panel">
                          <input
                            value={packageSearch}
                            onChange={(e) => setPackageSearch(e.target.value)}
                            placeholder="Search package name or code"
                          />

                          <div className="redcliffe-picker-results">
                            {filteredPackages.map((pkg) => {
                              const checked = toArray(form.packageCodes).includes(pkg.code);
                              return (
                                <label
                                  key={pkg.code}
                                  className={`redcliffe-picker-option checkbox${checked ? " selected" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePrimaryPackage(pkg.code)}
                                  />
                                  <span>{pkg.name}</span>
                                  <strong>{pkg.code}</strong>
                                </label>
                              );
                            })}
                            {!loading.packages && !filteredPackages.length ? (
                              <div className="redcliffe-picker-empty">
                                {packageLookupMessage || "No packages found."}
                              </div>
                            ) : null}
                          </div>
                          <div className="redcliffe-picker-actions">
                            <button
                              type="button"
                              className="redcliffe-btn redcliffe-btn-outline"
                              onClick={() => setShowPackagePicker(false)}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </Field>

                  <Field className="span-4" label="Customer name">
                    <input
                      value={form.customerName}
                      onChange={(e) => setField("customerName", e.target.value)}
                    />
                  </Field>

                  <Field className="span-4" label="Customer age">
                    <input
                      value={form.customerAge}
                      onChange={(e) => setField("customerAge", e.target.value)}
                    />
                  </Field>

                  <Field className="span-4" label="Customer gender">
                    <select
                      value={form.customerGender}
                      onChange={(e) => setField("customerGender", e.target.value)}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </Field>

                  <Field className="span-4" label="Phone">
                    <input
                      value={form.customerPhone}
                      onChange={(e) => setField("customerPhone", e.target.value)}
                    />
                  </Field>

                  <Field className="span-4" label="WhatsApp phone">
                    <input
                      value={form.customerWhatsappPhone}
                      onChange={(e) =>
                        setField("customerWhatsappPhone", e.target.value)
                      }
                    />
                  </Field>

                  <Field className="span-4" label="Customer email">
                    <input
                      value={form.customerEmail}
                      onChange={(e) => setField("customerEmail", e.target.value)}
                    />
                  </Field>

                  <div className="span-12 redcliffe-member-head">
                    <button
                      type="button"
                      className="redcliffe-add-member-btn"
                      onClick={addAdditionalMember}
                      disabled={additionalMembers.length >= 4}
                    >
                      <span>+</span>
                      Add Additional Member ({additionalMembers.length}/4)
                    </button>
                  </div>

                  {additionalMembers.map((member, index) => (
                    <div key={member.id} className="span-12 redcliffe-member-card">
                      <div className="redcliffe-member-card-top">
                        <h4>Additional Member {index + 1}</h4>
                        <button
                          type="button"
                          className="redcliffe-member-remove"
                          onClick={() => removeAdditionalMember(member.id)}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="redcliffe-grid">
                        <Field className="span-4" label="Customer name">
                          <input
                            value={member.customerName}
                            onChange={(e) =>
                              setMemberField(member.id, "customerName", e.target.value)
                            }
                          />
                        </Field>

                        <Field className="span-4" label="Customer age">
                          <input
                            value={member.customerAge}
                            onChange={(e) =>
                              setMemberField(member.id, "customerAge", e.target.value)
                            }
                          />
                        </Field>

                        <Field className="span-4" label="Customer gender">
                          <select
                            value={member.customerGender}
                            onChange={(e) =>
                              setMemberField(member.id, "customerGender", e.target.value)
                            }
                          >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </Field>

                        <Field className="span-12" label="Package details (multi-select)">
                          <div className="redcliffe-member-packages">
                            {availablePackages.length ? (
                              <>
                                <input
                                  className="redcliffe-member-search"
                                  value={memberPackageSearch[member.id] || ""}
                                  onChange={(e) =>
                                    setMemberPackageSearch((prev) => ({
                                      ...prev,
                                      [member.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Search package name or code"
                                />
                                {getFilteredMemberPackages(member.id).map((pkg) => {
                                  const checked = toArray(member.packageCodes).includes(pkg.code);
                                  return (
                                    <label key={`${member.id}-${pkg.code}`} className="redcliffe-member-pkg-chip">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleMemberPackage(member.id, pkg.code)}
                                    />
                                    <span>{pkg.name}</span>
                                    <strong>{pkg.code}</strong>
                                    </label>
                                  );
                                })}
                              </>
                            ) : (
                              <div className="redcliffe-picker-empty">
                                Load package details first from the primary package selector.
                              </div>
                            )}
                          </div>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="redcliffe-card">
              <div className="redcliffe-card-body">
                <SectionTitle
                  step="4"
                  title="Booking Confirmation"
                  subtitle="Create the booking request and then confirm or cancel it."
                />

                <div className="redcliffe-actions">
                  <div className="redcliffe-action-field">
                    <label>Payment mode</label>
                    <select
                      value={form.isCredit}
                      onChange={(e) => setField("isCredit", e.target.value)}
                    >
                      <option value="true">Credit / prepaid</option>
                      <option value="false">COD / collect at Redcliffe</option>
                    </select>
                  </div>
                  <button
                    className="redcliffe-btn redcliffe-btn-primary"
                    onClick={createBooking}
                    disabled={loading.create}
                  >
                    {loading.create
                      ? "Creating temporary booking..."
                      : "Create temporary booking"}
                  </button>

                  <button
                    className="redcliffe-btn redcliffe-btn-outline"
                    onClick={() => confirmBooking(true)}
                    disabled={loading.confirm}
                  >
                    {loading.confirm ? "Confirming..." : "Confirm booking"}
                  </button>

                  <button
                    className="redcliffe-btn redcliffe-btn-danger"
                    onClick={() => confirmBooking(false)}
                    disabled={loading.confirm}
                  >
                    Cancel booking
                  </button>
                </div>
                {bookingStatus ? (
                  <div className="redcliffe-inline-note success" style={{ marginTop: 14 }}>
                    {bookingStatus}
                  </div>
                ) : null}
                {bookingError ? (
                  <div className="redcliffe-inline-note error" style={{ marginTop: 14 }}>
                    {bookingError}
                  </div>
                ) : null}
              </div>
            </section>

          </div>

          <aside className="redcliffe-side">
            <section className="redcliffe-summary-box">
              <h3>Booking Summary</h3>
              <div className="redcliffe-summary-row">
                <span>Area query</span>
                <span>{form.placeQuery || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Location</span>
                <span>{selectedLocation?.placeName || selectedLocation?.placeAddress || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Collection date</span>
                <span>{form.collectionDate || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Slot</span>
                <span>
                  {selectedSlot
                    ? `${selectedSlot.format_12_hrs?.start_time || selectedSlot.format_24_hrs?.start_time} - ${selectedSlot.format_12_hrs?.end_time || selectedSlot.format_24_hrs?.end_time}`
                    : "—"}
                </span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Packages</span>
                <span>
                  {selectedPackages.length
                    ? selectedPackages.map((pkg) => pkg.code).join(", ")
                    : "—"}
                </span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Customer</span>
                <span>{form.customerName || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Phone</span>
                <span>{form.customerPhone || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Temp booking ID</span>
                <span>
                  {temporaryBooking?.booking_id || temporaryBooking?.pk || "—"}
                </span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Confirmed booking ID</span>
                <span>{confirmedBooking?.booking_id || "—"}</span>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {showAddressDialog ? (
        <div className="redcliffe-address-modal-backdrop">
          <div className="redcliffe-address-modal">
            <div className="redcliffe-address-modal-head">
              <h3>Add New Address</h3>
            </div>

            <label className="redcliffe-address-field">
              <span>Locality</span>
              <input
                value={addressDraft.localityQuery}
                onFocus={() => setIsAddressLocalityFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => {
                    setIsAddressLocalityFocused(false);
                  }, 120);
                }}
                onChange={(event) =>
                  setAddressDraft((prev) => ({
                    ...prev,
                    localityQuery: event.target.value,
                    selectedEloc: "",
                    localityLabel: "",
                    placeAddress: "",
                  }))
                }
                placeholder="Search Locality"
              />
            </label>

            {loading.addressSearch ? (
              <div className="redcliffe-address-search-note">Searching localities...</div>
            ) : null}

            {isAddressLocalityFocused && addressMatches.length ? (
              <div className="redcliffe-address-result-list">
                {addressMatches.map((item) => {
                  const isSelected = addressDraft.selectedEloc === item.eloc;
                  return (
                    <button
                      type="button"
                      key={item.eloc}
                      className={`redcliffe-address-result${isSelected ? " selected" : ""}`}
                      onClick={() => selectAddressCandidate(item)}
                    >
                      {formatLocationOption(item)}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {addressSearchMessage && !addressMatches.length ? (
              <div className="redcliffe-address-search-note">{addressSearchMessage}</div>
            ) : null}

            <div className="redcliffe-address-modal-grid">
              <label className="redcliffe-address-field">
                <span>House No./Plot No./Flat No./Door No./Shop/c/o</span>
                <input
                  value={addressDraft.houseNumber}
                  onChange={(event) =>
                    setAddressDraft((prev) => ({
                      ...prev,
                      houseNumber: event.target.value,
                    }))
                  }
                  placeholder="Type Here..."
                />
                <small>Max Length 30</small>
              </label>

              <label className="redcliffe-address-field">
                <span>Apartment/Building /Colony/Block/Sector/Street/ Gali/Road/Chawl</span>
                <input
                  value={addressDraft.addressLine2}
                  onChange={(event) =>
                    setAddressDraft((prev) => ({
                      ...prev,
                      addressLine2: event.target.value,
                    }))
                  }
                  placeholder="Type Here..."
                />
                <small>Max Length 30</small>
              </label>
            </div>

            <label className="redcliffe-address-field">
              <span>Landmark/Sublocality</span>
              <input
                value={addressDraft.landmark}
                onChange={(event) =>
                  setAddressDraft((prev) => ({
                    ...prev,
                    landmark: event.target.value,
                  }))
                }
                placeholder="Ex: School/College/Restaurant/Shop/Bank/Government Office"
              />
              <small>Max Length 100</small>
            </label>

            <label className="redcliffe-address-field">
              <span>Pincode</span>
              <input
                value={addressDraft.pincode}
                onChange={(event) =>
                  setAddressDraft((prev) => ({
                    ...prev,
                    pincode: event.target.value,
                  }))
                }
                placeholder="Enter pincode"
              />
            </label>

            <div className="redcliffe-address-modal-actions">
              <button
                type="button"
                className="redcliffe-address-dialog-btn ghost"
                onClick={closeAddressDialog}
              >
                Cancel
              </button>
              <button
                type="button"
                className="redcliffe-address-dialog-btn primary"
                onClick={applyAddressDraft}
                disabled={loading.addressApply}
              >
                {loading.addressApply ? "Saving..." : "Select"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
