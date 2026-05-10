const DEFAULT_COUNTRY_CODE = "91";

export const toZoomDialNumber = (rawPhone, countryCode = DEFAULT_COUNTRY_CODE) => {
  const raw = String(rawPhone || "").trim();
  if (!raw) return "";

  if (raw.startsWith("+")) {
    const digits = raw.slice(1).replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 10) return `+${countryCode}${digits}`;
  return `+${digits}`;
};

export const openZoomPhoneDialer = (rawPhone, options = {}) => {
  const dialNumber = toZoomDialNumber(rawPhone, options.countryCode);
  if (!dialNumber || typeof window === "undefined") return false;

  const callerId = String(options.callerId || "").trim();
  const uri = callerId
    ? `zoomphonecall://${dialNumber}?callerid=${encodeURIComponent(callerId)}`
    : `zoomphonecall://${dialNumber}`;

  window.location.href = uri;
  return true;
};
