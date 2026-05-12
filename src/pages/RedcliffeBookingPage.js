import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./RedcliffeBookingPage.css";
import CreateOrderPopup from "./retention/CreateOrderPopup";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, ""); 

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
  orderId: "",
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

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `Rs ${amount.toFixed(Number.isInteger(amount) ? 0 : 2)}`;
}

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

function cleanAddressText(value) {
  return String(value || "")
    .replace(/^[,\s.-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickAddressPart(address = {}, keys = []) {
  for (const key of keys) {
    const value = cleanAddressText(address?.[key]);
    if (value) return value;
  }
  return "";
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
  const [slotStatus, setSlotStatus] = useState("");
  const [slotError, setSlotError] = useState("");
  const [activeSlotBucket, setActiveSlotBucket] = useState("Morning");
  const [availablePackages, setAvailablePackages] = useState([]);
  const [showPackagePicker, setShowPackagePicker] = useState(false);
  const [packageSearch, setPackageSearch] = useState("");
  const [packageLookupMessage, setPackageLookupMessage] = useState("");
  const [additionalMembers, setAdditionalMembers] = useState([]);
  const [memberPackageSearch, setMemberPackageSearch] = useState({});
  const [showMemberPackagePicker, setShowMemberPackagePicker] = useState({});
  const [temporaryBooking, setTemporaryBooking] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [areaStatus, setAreaStatus] = useState("");
  const [areaError, setAreaError] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [packageError, setPackageError] = useState("");
  const [mobileLookupPhone, setMobileLookupPhone] = useState("");
  const [mobileLookupStatus, setMobileLookupStatus] = useState("");
  const [mobileLookupError, setMobileLookupError] = useState("");
  const [mobileLookupAddresses, setMobileLookupAddresses] = useState([]);
  const [mobileLookupCustomerEmail, setMobileLookupCustomerEmail] = useState("");
  const [selectedMobileAddressKey, setSelectedMobileAddressKey] = useState("");
  const [serviceabilityState, setServiceabilityState] = useState("idle");
  const [isWhatsappSameAsPhone, setIsWhatsappSameAsPhone] = useState(false);
  const [shopifyOrderPopupOpen, setShopifyOrderPopupOpen] = useState(false);
  const [shopifyOrderOpenError, setShopifyOrderOpenError] = useState("");
  const [loading, setLoading] = useState({
    locations: false,
    slots: false,
    packages: false,
    create: false,
    confirm: false,
    phoneLookup: false,
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
    if (!isLocationFieldFocused || !showLocationSuggestions || query.length < 3) {
      if (!query) {
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
  }, [form.placeQuery, isLocationFieldFocused, showLocationSuggestions]);

  useEffect(() => {
    if (!mobileLookupStatus) return undefined;
    const timer = window.setTimeout(() => {
      setMobileLookupStatus("");
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [mobileLookupStatus]);

  useEffect(() => {
    if (!areaStatus) return undefined;
    const timer = window.setTimeout(() => {
      setAreaStatus("");
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [areaStatus]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (event.target.closest(".redcliffe-picker")) return;
      setShowPackagePicker(false);
      setShowMemberPackagePicker({});
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (customerError) setCustomerError("");
  };

  useEffect(() => {
    if (!isWhatsappSameAsPhone) return;
    setForm((prev) => {
      if (prev.customerWhatsappPhone === prev.customerPhone) return prev;
      return { ...prev, customerWhatsappPhone: prev.customerPhone };
    });
  }, [form.customerPhone, isWhatsappSameAsPhone]);

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
    setServiceabilityState("checking");
    setShowLocationSuggestions(false);
    setIsLocationFieldFocused(false);

    if (!eloc) {
      setField("latitude", "");
      setField("longitude", "");
      setServiceabilityState("idle");
      return;
    }

    try {
      const { data } = await api.get("/api/redcliffe/location-by-eloc", {
        params: { eloc },
      });

      const matched = locationItem || locations.find((item) => item.eloc === eloc);
      const resolvedLatitude = data?.latitude ?? "";
      const resolvedLongitude = data?.longitude ?? "";
      const isServiceable = resolvedLatitude !== "" && resolvedLongitude !== "";

      setForm((prev) => ({
        ...prev,
        placeQuery: matched ? formatLocationOption(matched) : prev.placeQuery,
        latitude: resolvedLatitude,
        longitude: resolvedLongitude,
        pincode: getLocationPincode(matched) || prev.pincode,
        customerAddress: getHouseAddress(matched) || prev.customerAddress,
        addressLine2: buildSecondaryAddress(matched) || prev.addressLine2,
        customerLandmark: getLandmarkValue(matched) || prev.customerLandmark,
      }));
      if (isServiceable) {
        setAreaStatus("Locality is serviceable.");
        setAreaError("");
        setServiceabilityState("serviceable");
      } else {
        setAreaStatus("");
        setAreaError("Locality is not serviceable.");
        setServiceabilityState("unserviceable");
      }
      setSlotStatus("");
      setSlotError("");
    } catch (err) {
      setAreaError(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          "Failed to fetch coordinates."
      );
      setAreaStatus("");
      setServiceabilityState("unserviceable");
    }
  };

  const handleStep1Continue = () => {
    const house = String(form.customerAddress || "").trim();
    const landmark = String(form.customerLandmark || "").trim();
    const pincode = String(form.pincode || "").trim();

    const missingFields = [];
    if (!house) missingFields.push("House/Plot/Flat Number");
    if (!landmark) missingFields.push("Landmark/Sublocality");
    if (!pincode) missingFields.push("Pincode");

    if (missingFields.length) {
      const message =
        missingFields.length === 1
          ? `Please fill ${missingFields[0]}.`
          : `Please fill: ${missingFields.join(", ")}.`;
      setAreaStatus("");
      setAreaError(message);
      return;
    }

    if (!form.selectedEloc || !form.latitude || !form.longitude) {
      setAreaStatus("");
      setAreaError("Please select a serviceable locality first.");
      return;
    }

    setAreaError("");
    setActiveStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const handleStep3Continue = () => {
    const missingPrimary = [];
    if (!String(form.customerName || "").trim()) missingPrimary.push("Customer name");
    if (!String(form.customerAge || "").trim()) missingPrimary.push("Customer age");
    if (!String(form.customerGender || "").trim()) missingPrimary.push("Customer gender");
    if (!String(form.customerPhone || "").replace(/\D/g, "").trim()) missingPrimary.push("Phone");
    if (!String(form.customerEmail || "").trim()) missingPrimary.push("Customer email");

    if (missingPrimary.length) {
      setCustomerError(`Please fill: ${missingPrimary.join(", ")}.`);
      return;
    }

    const phoneDigits = String(form.customerPhone || "").replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setCustomerError("Please enter a valid 10-digit phone number.");
      return;
    }

    const emailValue = String(form.customerEmail || "").trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailValue)) {
      setCustomerError("Please enter a valid customer email.");
      return;
    }

    const incompleteMemberIndex = additionalMembers.findIndex((member) => {
      const hasAnyValue =
        String(member.customerName || "").trim() ||
        String(member.customerAge || "").trim() ||
        String(member.customerGender || "").trim();
      if (!hasAnyValue) return false;
      return !(
        String(member.customerName || "").trim() &&
        String(member.customerAge || "").trim() &&
        String(member.customerGender || "").trim()
      );
    });

    if (incompleteMemberIndex >= 0) {
      setCustomerError(
        `Please complete all required fields for Additional Member ${incompleteMemberIndex + 1}.`
      );
      return;
    }

    setCustomerError("");
    goNextStep();
  };

  const canContinueFromSlotStep = useMemo(
    () => Boolean(String(form.selectedSlotId || "").trim()),
    [form.selectedSlotId]
  );

  const handleStep2Continue = () => {
    if (!String(form.selectedSlotId || "").trim()) {
      setSlotError("Please select an available slot.");
      return;
    }
    setSlotError("");
    goNextStep();
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
      const { data } = await api.get("/api/redcliffe/packages");
      const packages = (Array.isArray(data?.results) ? data.results : []).sort((a, b) =>
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
    setShowMemberPackagePicker((prev) => {
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

  const toggleMemberPackagePicker = (memberId) => {
    setShowMemberPackagePicker((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const lookupCustomerByMobile = async () => {
    const digits = String(mobileLookupPhone || "").replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) {
      setMobileLookupError("Enter a valid 10-digit mobile number.");
      setMobileLookupStatus("");
      return;
    }

    setMobileLookupError("");
    setMobileLookupStatus("");
    setMobileLookupAddresses([]);
    setMobileLookupCustomerEmail("");
    setSelectedMobileAddressKey("");
    setLoading((prev) => ({ ...prev, phoneLookup: true }));

    try {
      const { data } = await api.get("/api/shopify/customer-orders", {
        params: { phone: digits },
      });

      const addresses = Array.isArray(data?.addresses) ? data.addresses : [];
      const lookupEmail = String(
        data?.customerEmail || data?.email || data?.customer_email || ""
      ).trim();
      setMobileLookupCustomerEmail(lookupEmail);

      if (!addresses.length) {
        setMobileLookupStatus("No customer found for this mobile number.");
        if (lookupEmail) {
          setForm((prev) => ({
            ...prev,
            customerEmail: prev.customerEmail || lookupEmail,
          }));
        }
        return;
      }

      if (lookupEmail) {
        setForm((prev) => ({
          ...prev,
          customerEmail: prev.customerEmail || lookupEmail,
        }));
      }
      setMobileLookupAddresses(addresses);
      setMobileLookupStatus("Customer found. Select an address below.");
    } catch (_err) {
      setMobileLookupError("Unable to fetch customer details right now.");
    } finally {
      setLoading((prev) => ({ ...prev, phoneLookup: false }));
    }
  };

  const selectCustomerAddress = (address, optionKey) => {
    const line1 = String(address?.address1 || "").trim();
    const line2Parts = [address?.address2, address?.city, address?.state]
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const line2 = line2Parts.join(", ");
    const selectedPincode = String(address?.pincode || "").trim();
    const selectedEmail = String(
      address?.email || address?.customerEmail || address?.customer_email || ""
    ).trim();

    setForm((prev) => ({
      ...prev,
      customerName: String(address?.fullName || prev.customerName || "").trim(),
      customerPhone: String(mobileLookupPhone || prev.customerPhone).replace(/\D/g, "").slice(-10),
      customerWhatsappPhone: String(mobileLookupPhone || prev.customerWhatsappPhone).replace(/\D/g, "").slice(-10),
      customerEmail: selectedEmail || mobileLookupCustomerEmail || prev.customerEmail,
      customerAddress: line1 || prev.customerAddress,
      addressLine2: line2 || prev.addressLine2,
      customerLandmark: String(address?.address2 || prev.customerLandmark || "").trim(),
      pincode: selectedPincode || prev.pincode,
    }));
    setMobileLookupStatus("Address selected and applied.");
    setSelectedMobileAddressKey(optionKey);
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
        order_id: String(form.orderId || "").trim(),
        reference_data: String(form.orderId || form.referenceData || "").trim(),
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
      return data;
    } catch (err) {
      applyRequestError(err, "Failed to create booking.");
      return null;
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

  const createAndConfirmBooking = async () => {
    if (confirmedBooking) return;
    resetBookingMessages();
    const created = await createBooking();
    const bookingId = created?.booking_id || created?.pk;
    if (!bookingId) return;

    setLoading((prev) => ({ ...prev, confirm: true }));
    try {
      const { data } = await api.post("/api/redcliffe/bookings/confirm", {
        booking_id: bookingId,
        is_confirmed: true,
      });
      setConfirmedBooking(data);
      setBookingStatus(data?.message || "Booking confirmed.");
    } catch (err) {
      applyRequestError(err, "Failed to confirm booking.");
    } finally {
      setLoading((prev) => ({ ...prev, confirm: false }));
    }
  };

  const openShopifyOrderPopup = () => {
    const name = String(form.customerName || "").trim();
    const phone = String(form.customerPhone || "").replace(/\D/g, "").slice(-10);
    if (!name || phone.length !== 10) {
      setShopifyOrderOpenError(
        "Please fill customer name and valid 10-digit phone before creating Shopify order."
      );
      return;
    }
    setShopifyOrderOpenError("");
    setShopifyOrderPopupOpen(true);
  };

  const startNewBooking = () => {
    setForm(initialForm);
    setLocations([]);
    setSlots([]);
    setShowLocationSuggestions(false);
    setIsLocationFieldFocused(false);
    setSlotStatus("");
    setSlotError("");
    setActiveSlotBucket("Morning");
    setAvailablePackages([]);
    setShowPackagePicker(false);
    setPackageSearch("");
    setPackageLookupMessage("");
    setAdditionalMembers([]);
    setMemberPackageSearch({});
    setShowMemberPackagePicker({});
    setTemporaryBooking(null);
    setConfirmedBooking(null);
    setAreaStatus("");
    setAreaError("");
    setBookingStatus("");
    setBookingError("");
    setCustomerError("");
    setMobileLookupPhone("");
    setMobileLookupStatus("");
    setMobileLookupError("");
    setMobileLookupAddresses([]);
    setMobileLookupCustomerEmail("");
    setSelectedMobileAddressKey("");
    setServiceabilityState("idle");
    setIsWhatsappSameAsPhone(false);
    setShopifyOrderPopupOpen(false);
    setShopifyOrderOpenError("");
    setActiveStep(1);
  };

  const [activeStep, setActiveStep] = useState(1);
  const totalSteps = 5;
  const progressPercent = Math.round((activeStep / totalSteps) * 100);
  const isBookingConfirmed = Boolean(confirmedBooking);

  const stepperItems = [
    { index: 1, title: "Collection area", subtitle: "Locality & address" },
    { index: 2, title: "Date & slot", subtitle: "Pick available time" },
    { index: 3, title: "Customer", subtitle: "Patient & members" },
    { index: 4, title: "Packages", subtitle: "Tests to run" },
    { index: 5, title: "Confirm", subtitle: "Payment & book" },
  ];

  const goNextStep = () => setActiveStep((prev) => Math.min(totalSteps, prev + 1));
  const goPrevStep = () => setActiveStep((prev) => Math.max(1, prev - 1));

  const canContinueFromPackages = useMemo(() => {
    const hasPrimaryPackage = toArray(form.packageCodes).length > 0;
    if (!hasPrimaryPackage) return false;
    return additionalMembers.every(
      (member) => toArray(member.packageCodes).length > 0
    );
  }, [form.packageCodes, additionalMembers]);

  const handleStep4Continue = () => {
    if (!toArray(form.packageCodes).length) {
      setPackageError("Select at least one package for the primary customer.");
      return;
    }
    const incompleteMember = additionalMembers.find(
      (member) => !toArray(member.packageCodes).length
    );
    if (incompleteMember) {
      setPackageError(
        `Select at least one package for ${incompleteMember.customerName || "each additional member"}.`
      );
      return;
    }
    setPackageError("");
    goNextStep();
  };

  return (
    <div className="redcliffe-page">
      <div className="redcliffe-shell">
        <section className="redcliffe-hero redcliffe-hero-flat">
          <div>
            <h1>Book a Redcliffe lab test</h1>
          </div>
          <div className="redcliffe-top-actions">
            <button
              type="button"
              className="redcliffe-btn redcliffe-btn-outline"
              onClick={startNewBooking}
            >
              Create new booking
            </button>
          </div>
        </section>
        <div className="redcliffe-layout">
          <aside className="redcliffe-steps-rail">
            {stepperItems.map((item) => (
              <button
                type="button"
                key={item.index}
                className={`redcliffe-rail-item${activeStep === item.index ? " active" : ""}`}
                onClick={() => setActiveStep(item.index)}
              >
                <span className="redcliffe-rail-index">{item.index}</span>
                <span className="redcliffe-rail-copy">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
              </button>
            ))}
            <div className="redcliffe-rail-progress">
              <div>Progress</div>
              <div className="redcliffe-rail-progress-track">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <p>{progressPercent}% complete</p>
            </div>
          </aside>

          <div className="redcliffe-main">
            {activeStep === 1 ? (
            <section className="redcliffe-card">
              <div className="redcliffe-card-body">
                <div className="redcliffe-content-head">
                  <h2>Where are we collecting?</h2>
                  <p>Search customer by mobile, then enter locality and verify serviceability.</p>
                </div>

                <div className="redcliffe-grid">
                  <Field className="span-12" label="Search by mobile number">
                    <div className="redcliffe-mobile-lookup">
                      <input
                        value={mobileLookupPhone}
                        onChange={(event) => {
                          setMobileLookupPhone(event.target.value);
                          if (mobileLookupError) setMobileLookupError("");
                        }}
                        placeholder="Enter mobile number"
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        className="redcliffe-btn redcliffe-btn-accent"
                        onClick={lookupCustomerByMobile}
                        disabled={loading.phoneLookup}
                      >
                        {loading.phoneLookup ? "Searching..." : "Search"}
                      </button>
                    </div>
                    {mobileLookupStatus ? (
                      <div className="redcliffe-inline-note success">
                        {mobileLookupStatus}
                      </div>
                    ) : null}
                    {mobileLookupError ? (
                      <div className="redcliffe-inline-note error">
                        {mobileLookupError}
                      </div>
                    ) : null}
                    {mobileLookupAddresses.length ? (
                      <div className="redcliffe-mobile-address-panel" style={{ marginTop: 8 }}>
                        <div className="redcliffe-mobile-address-list">
                          {mobileLookupAddresses.map((address, index) => {
                            const line1 = pickAddressPart(address, [
                              "address1",
                              "address",
                              "line1",
                              "customer_address",
                              "house",
                            ]);
                            const line2 = [
                              pickAddressPart(address, ["address2", "line2", "street"]),
                              pickAddressPart(address, ["city", "district", "locality"]),
                              pickAddressPart(address, ["state", "province"]),
                            ]
                              .map((item) => cleanAddressText(item))
                              .filter(Boolean)
                              .join(", ");
                            const pincode = pickAddressPart(address, [
                              "pincode",
                              "pin",
                              "postal_code",
                              "zipcode",
                            ]);
                            const title = cleanAddressText(
                              address?.fullName || address?.name || address?.customerName || "Address"
                            );
                            const combinedAddress = [line1, line2, pincode].filter(Boolean).join(" | ");
                            const optionKey = `${address?.id || "addr"}-${index}`;
                            return (
                              <div
                                key={optionKey}
                                className={`redcliffe-mobile-address-option${selectedMobileAddressKey === optionKey ? " selected" : ""}`}
                                role="radio"
                                aria-checked={selectedMobileAddressKey === optionKey}
                                tabIndex={0}
                                onClick={() => selectCustomerAddress(address, optionKey)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    selectCustomerAddress(address, optionKey);
                                  }
                                }}
                              >
                                <input
                                  type="radio"
                                  name="mobile_address_select"
                                  checked={selectedMobileAddressKey === optionKey}
                                  onChange={() => selectCustomerAddress(address, optionKey)}
                                />
                                <div className="redcliffe-mobile-address-copy">
                                  <div className="redcliffe-mobile-address-name">{title || "Address"}</div>
                                  <div className="redcliffe-mobile-address-line">
                                    {combinedAddress || "Address unavailable"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </Field>

                  <Field className="span-6" label="House/Plot/Flat Number *">
                    <input
                      value={form.customerAddress}
                      onChange={(event) => setField("customerAddress", event.target.value)}
                      placeholder="Type here..."
                    />
                  </Field>

                  <Field className="span-6" label="Apartment/Building /Colony">
                    <input
                      value={form.addressLine2}
                      onChange={(event) => setField("addressLine2", event.target.value)}
                      placeholder="Type here..."
                    />
                  </Field>

                  <Field className="span-8" label="Landmark/Sublocality *">
                    <input
                      value={form.customerLandmark}
                      onChange={(event) => setField("customerLandmark", event.target.value)}
                      placeholder="Ex: School/College/Restaurant/Shop/Bank"
                    />
                  </Field>

                  <Field className="span-4" label="Pincode *">
                    <input
                      value={form.pincode}
                      onChange={(event) => {
                        setField("pincode", event.target.value);
                      }}
                      placeholder="Enter pincode"
                    />
                  </Field>

                  <Field className="span-12" label="Search locality, area or pincode *">
                    <div className="redcliffe-location-search">
                      <input
                        value={form.placeQuery}
                        onChange={(e) => {
                          setField("placeQuery", e.target.value);
                          setField("selectedEloc", "");
                          setField("latitude", "");
                          setField("longitude", "");
                          setServiceabilityState("idle");
                          setAreaStatus("");
                          setAreaError("");
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
                      {serviceabilityState === "serviceable" ? (
                        <span className="redcliffe-serviceability-indicator ok" title="Serviceable">
                          ✓
                        </span>
                      ) : null}
                      {serviceabilityState === "unserviceable" ? (
                        <span className="redcliffe-serviceability-indicator bad" title="Not serviceable">
                          ✕
                        </span>
                      ) : null}
                      {isLocationFieldFocused &&
                      showLocationSuggestions &&
                      locations.length ? (
                        <div className="redcliffe-location-suggestion-list">
                          {locations.map((item) => (
                            <button
                              type="button"
                              key={item.eloc}
                              className="redcliffe-location-suggestion"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                selectLocation(item.eloc, item);
                              }}
                            >
                              {formatLocationOption(item)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <small style={{ color: "#627279", fontSize: 12 }}>
                      Start typing locality and select one suggestion to check serviceability.
                    </small>
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
                <div className="redcliffe-step-actions">
                  <button type="button" className="redcliffe-btn redcliffe-btn-outline" disabled>Back</button>
                  <button
                    type="button"
                    className="redcliffe-btn redcliffe-btn-accent"
                    onClick={handleStep1Continue}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </section>
            ) : null}

            {activeStep === 2 ? (
            <section className="redcliffe-card">
              <div className="redcliffe-card-body">
                <div className="redcliffe-content-head">
                  <h2>Pick a collection date & time</h2>
                  <p>Slots fill up fast. Pick the best available time.</p>
                </div>

                <div className="redcliffe-grid">
                  <Field className="span-4" label="Collection date *">
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
                    <label>Available slot *</label>
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
                <div className="redcliffe-step-actions">
                  <button type="button" className="redcliffe-btn redcliffe-btn-outline" onClick={goPrevStep}>Back</button>
                  <button
                    type="button"
                    className="redcliffe-btn redcliffe-btn-accent"
                    onClick={handleStep2Continue}
                    disabled={!canContinueFromSlotStep}
                  >
                    Continue
                  </button>
                </div>
                {packageError ? <p className="redcliffe-inline-error">{packageError}</p> : null}
              </div>
            </section>
            ) : null}

            {activeStep === 3 ? (
            <section className="redcliffe-card">
              <div className="redcliffe-card-body">
                <div className="redcliffe-content-head">
                  <h2>Customer details</h2>
                  <p>Add patient and member details.</p>
                </div>

                <div className="redcliffe-grid">
                  <Field className="span-4" label="Customer name *">
                    <input
                      value={form.customerName}
                      onChange={(e) => setField("customerName", e.target.value)}
                    />
                  </Field>

                  <Field className="span-4" label="Customer age *">
                    <input
                      value={form.customerAge}
                      onChange={(e) => setField("customerAge", e.target.value)}
                    />
                  </Field>

                  <Field className="span-4" label="Customer gender *">
                    <select
                      value={form.customerGender}
                      onChange={(e) => setField("customerGender", e.target.value)}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </Field>

                  <Field className="span-4" label="Phone *">
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
                      disabled={isWhatsappSameAsPhone}
                    />
                    <label className="redcliffe-checkbox-inline">
                      <input
                        type="checkbox"
                        checked={isWhatsappSameAsPhone}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsWhatsappSameAsPhone(checked);
                          if (checked) {
                            setField("customerWhatsappPhone", form.customerPhone);
                          }
                        }}
                      />
                      Same as phone
                    </label>
                  </Field>

                  <Field className="span-4" label="Customer email *">
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

                      </div>
                    </div>
                  ))}
                </div>
                {customerError ? (
                  <div className="redcliffe-inline-note error" style={{ marginTop: 14 }}>
                    {customerError}
                  </div>
                ) : null}
                <div className="redcliffe-step-actions">
                  <button type="button" className="redcliffe-btn redcliffe-btn-outline" onClick={goPrevStep}>Back</button>
                  <button type="button" className="redcliffe-btn redcliffe-btn-accent" onClick={handleStep3Continue}>Continue</button>
                </div>
              </div>
            </section>
            ) : null}

            {activeStep === 4 ? (
            <section className="redcliffe-card">
              <div className="redcliffe-card-body">
                <div className="redcliffe-content-head">
                  <h2>Packages to run</h2>
                  <p>Search by code or name. Selected packages stack as chips.</p>
                </div>
                <div className="redcliffe-grid">
                  <Field
                    className="span-12"
                    label={`Select blood test for ${form.customerName || "Customer"} *`}
                  >
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
                          <div className="redcliffe-picker-panel-head">
                            <button
                              type="button"
                              className="redcliffe-picker-close"
                              onClick={() => setShowPackagePicker(false)}
                              aria-label="Close package list"
                            >
                              ×
                            </button>
                          </div>
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
                                  <strong>
                                    {pkg.code}
                                    {formatCurrency(pkg.price) ? (
                                      <small style={{ display: "block", marginTop: 4 }}>
                                        {formatCurrency(pkg.price)}
                                      </small>
                                    ) : null}
                                  </strong>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </Field>
                  {additionalMembers.length ? (
                    <Field className="span-12" label="Member packages (optional)">
                      <div className="redcliffe-member-packages">
                        {additionalMembers.map((member) => (
                          <div key={`mp-${member.id}`} className="redcliffe-member-package-card">
                            <strong className="redcliffe-member-package-name">{member.customerName || "Member"}</strong>
                            <div className="redcliffe-picker">
                              <button
                                type="button"
                                className="redcliffe-picker-trigger"
                                onClick={() => toggleMemberPackagePicker(member.id)}
                              >
                                <span>
                                  {toArray(member.packageCodes).length
                                    ? `${toArray(member.packageCodes).length} package(s) selected`
                                    : "Select package(s)"}
                                </span>
                                <strong>Choose</strong>
                              </button>
                              {showMemberPackagePicker[member.id] ? (
                                <div className="redcliffe-picker-panel">
                                  <div className="redcliffe-picker-panel-head">
                                    <button
                                      type="button"
                                      className="redcliffe-picker-close"
                                      onClick={() =>
                                        setShowMemberPackagePicker((prev) => ({
                                          ...prev,
                                          [member.id]: false,
                                        }))
                                      }
                                      aria-label="Close member package list"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  <input
                                    value={String(memberPackageSearch[member.id] || "")}
                                    onChange={(e) =>
                                      setMemberPackageSearch((prev) => ({
                                        ...prev,
                                        [member.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Search package name or code"
                                  />
                                  <div className="redcliffe-picker-results">
                                    {getFilteredMemberPackages(member.id).map((pkg) => {
                                      const checked = toArray(member.packageCodes).includes(pkg.code);
                                      return (
                                        <label
                                          key={`${member.id}-${pkg.code}`}
                                          className={`redcliffe-picker-option checkbox${checked ? " selected" : ""}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleMemberPackage(member.id, pkg.code)}
                                          />
                                          <span>{pkg.name}</span>
                                          <strong>
                                            {pkg.code}
                                            {formatCurrency(pkg.price) ? (
                                              <small style={{ display: "block", marginTop: 4 }}>
                                                {formatCurrency(pkg.price)}
                                              </small>
                                            ) : null}
                                          </strong>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Field>
                  ) : null}
                </div>
                <div className="redcliffe-step-actions">
                  <button type="button" className="redcliffe-btn redcliffe-btn-outline" onClick={goPrevStep}>Back</button>
                  <button type="button" className="redcliffe-btn redcliffe-btn-accent" onClick={goNextStep}>Continue</button>
                </div>
              </div>
            </section>
            ) : null}

            {activeStep === 5 ? (
            <section className="redcliffe-card">
              <div className="redcliffe-card-body">
                <div className="redcliffe-content-head">
                  <h2>Confirm & book</h2>
                  <p>Create Shopify order, select payment mode, then create booking.</p>
                </div>

                <div className="redcliffe-grid">
                  <Field className="span-6" label="Create order">
                    <button
                      type="button"
                      className="redcliffe-btn redcliffe-btn-outline redcliffe-btn-block"
                      onClick={openShopifyOrderPopup}
                      disabled={shopifyOrderPopupOpen}
                    >
                      Create Order on Shopify
                    </button>
                  </Field>

                  <Field className="span-6" label="Payment mode">
                    <select
                      value={form.isCredit === "true" ? "prepaid" : "cash_on_collection"}
                      onChange={(e) =>
                        setField(
                          "isCredit",
                          e.target.value === "prepaid" ? "true" : "false"
                        )
                      }
                    >
                      <option value="prepaid">Prepaid</option>
                      <option value="cash_on_collection">Cash on collection</option>
                    </select>
                  </Field>

                  <Field className="span-12" label="Order ID">
                    <input
                      value={form.orderId}
                      onChange={(e) => setField("orderId", e.target.value)}
                      placeholder="Enter Shopify order ID"
                    />
                  </Field>
                </div>

                <div className="redcliffe-actions" style={{ marginTop: 14 }}>
                  <button
                    className={`redcliffe-btn ${isBookingConfirmed ? "redcliffe-btn-confirmed" : "redcliffe-btn-accent"}`}
                    onClick={createAndConfirmBooking}
                    disabled={loading.create || loading.confirm || isBookingConfirmed}
                  >
                    {isBookingConfirmed
                      ? "Confirmed ✓"
                      : loading.create || loading.confirm
                      ? "Processing..."
                      : "Create & confirm"}
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
                {shopifyOrderOpenError ? (
                  <div className="redcliffe-inline-note error" style={{ marginTop: 14 }}>
                    {shopifyOrderOpenError}
                  </div>
                ) : null}
                <div className="redcliffe-step-actions">
                  <button type="button" className="redcliffe-btn redcliffe-btn-outline" onClick={goPrevStep}>Back</button>
                </div>
              </div>
            </section>
            ) : null}

          </div>

          <aside className="redcliffe-side">
            <section className="redcliffe-summary-box">
              <div className="redcliffe-summary-head">
                <h3>Summary</h3>
                <span>Draft</span>
              </div>
              <p className="redcliffe-summary-sub">Auto-fills as you go.</p>
              <div className="redcliffe-summary-row">
                <span>Locality</span>
                <span>{selectedLocation?.placeName || selectedLocation?.placeAddress || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Coordinates</span>
                <span>{form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Booking date</span>
                <span>{todayIso()}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Date</span>
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
                <span>Customer age</span>
                <span>{form.customerAge || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Customer gender</span>
                <span>{form.customerGender || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Customer email</span>
                <span>{form.customerEmail || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Phone</span>
                <span>{form.customerPhone || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Address</span>
                <span>{form.customerAddress || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Landmark</span>
                <span>{form.customerLandmark || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Pincode</span>
                <span>{form.pincode || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Members</span>
                <span>{additionalMembers.length || "—"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Payment</span>
                <span>{form.isCredit === "true" ? "Credit / prepaid" : "Cash on collection"}</span>
              </div>
              <div className="redcliffe-summary-row">
                <span>Order ID</span>
                <span>{form.orderId || "—"}</span>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <CreateOrderPopup
        open={shopifyOrderPopupOpen}
        onClose={() => setShopifyOrderPopupOpen(false)}
        prefillCustomer={{
          name: String(form.customerName || "").trim(),
          phone: String(form.customerPhone || "").replace(/\D/g, "").slice(-10),
        }}
      />

    </div>
  );
}
