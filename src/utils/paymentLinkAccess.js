const PAYMENT_LINK_USERS = new Set([
  "deepti gupta",
  "devanshi priyanka",
  "pushpa tiwari",
]);

export const normalizeEmployeeName = (user = {}) =>
  String(user.fullName || user.name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export const canAccessPaymentLinks = (user = {}) =>
  PAYMENT_LINK_USERS.has(normalizeEmployeeName(user));
