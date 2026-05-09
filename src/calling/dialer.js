export const ZOOM_DIAL_EVENT = "zoom:dial-request";

export function requestZoomDial(phoneNumber, meta = {}) {
  const clean = String(phoneNumber || "").trim();
  if (!clean) return false;

  window.dispatchEvent(
    new CustomEvent(ZOOM_DIAL_EVENT, {
      detail: {
        phoneNumber: clean,
        meta,
      },
    })
  );

  if (!window.location.pathname.startsWith("/calling-center")) {
    window.location.href = `/calling-center?dial=${encodeURIComponent(clean)}`;
  }
  return true;
}
