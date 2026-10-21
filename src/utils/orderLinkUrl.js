const configuredBase = String(process.env.REACT_APP_ORDER_LINK_PUBLIC_BASE_URL || "").trim();

const defaultBase = (() => {
  if (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
    return window.location.origin;
  }
  return "https://order.muditam.com";
})();

const PUBLIC_ORDER_LINK_BASE = (configuredBase || defaultBase).replace(/\/+$/, "");

export function getPublicOrderLinkUrl(linkOrToken) {
  if (linkOrToken && typeof linkOrToken === "object" && linkOrToken.url) {
    return linkOrToken.url;
  }

  const token = typeof linkOrToken === "object" ? linkOrToken?.token : linkOrToken;
  return token ? `${PUBLIC_ORDER_LINK_BASE}/order-link/${token}` : "";
}

export default getPublicOrderLinkUrl;
