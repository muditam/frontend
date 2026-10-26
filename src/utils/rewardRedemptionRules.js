// Redemption validation does not fetch product pages or follow redirects.
function validateRedemption({ links, amount }) {
  if (!Number.isFinite(Number(amount)) || Number(amount) < 1000) {
    return "Minimum order value is ₹1,000.";
  }
  const products = String(links || "").trim().split(/\s+/).filter(Boolean);
  if (!products.length) return "Please enter an Amazon or Flipkart product link.";
  for (const link of products) {
    try {
      const url = new URL(link);
      const host = url.hostname.toLowerCase();
      const allowed = ["amazon.in", "amazon.com", "flipkart.com"].some((domain) => host === domain || host.endsWith(`.${domain}`))
        || ["amzn.in", "amzn.to", "fkrt.it"].includes(host);
      if (!["http:", "https:"].includes(url.protocol) || !allowed || url.username || url.password || url.port) {
        return "Only Amazon and Flipkart product links are allowed.";
      }
    } catch {
      return "Enter valid Amazon or Flipkart links, one per line.";
    }
  }
  return "";
}

export { validateRedemption };
