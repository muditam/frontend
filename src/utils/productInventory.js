export function isVariantSellable(variant) {
  const rawQuantity = variant?.inventory_quantity;
  if (rawQuantity === undefined || rawQuantity === null || rawQuantity === "") {
    return true;
  }

  const quantity = Number(rawQuantity);
  return Number.isFinite(quantity) && quantity > 0;
}

export function withSellableInventory(products) {
  return (Array.isArray(products) ? products : [])
    .map((product) => ({
      ...product,
      variants: (Array.isArray(product?.variants) ? product.variants : []).filter(isVariantSellable),
    }))
    .filter((product) => product.variants.length > 0);
}
