export default function getOrderLinkUtm() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return ["source", "medium", "campaign", "term", "content"].reduce((utm, key) => {
    const value = params.get(`utm_${key}`);
    if (value) utm[key] = value.slice(0, 200);
    return utm;
  }, {});
}
