const MANAGER_ROLE_SET = new Set(["manager", "super admin", "admin", "developer"]);

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
