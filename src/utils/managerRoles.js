const MANAGER_ROLE_SET = new Set([
  "manager",
  "super admin",
  "admin",
  "developer",
  "team leader",
  "teamleader",
]);

export function normalizeRole(role = "") {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

export function isManagerRole(role = "") {
  return MANAGER_ROLE_SET.has(normalizeRole(role));
}

export function canAccessCallingCenterManagerDashboard(user = {}) {
  const normalizedRole = normalizeRole(user?.role || "");
  const hasTeam = user?.hasTeam === true;

  if (isManagerRole(normalizedRole)) return true;
  if (normalizedRole === "team leader" && hasTeam) return true;
  if (normalizedRole === "retention agent" && hasTeam) return true;

  return false;
}
