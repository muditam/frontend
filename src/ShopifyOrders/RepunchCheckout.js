import React, { useState } from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "../features/cart/cartSlice";
import CartDrawer from "./CartDrawer";

export function createRepunchStore(source) {
  const initial = cartReducer(undefined, { type: "@@INIT" });
  const address = source.customerAddress || {};
  return configureStore({
    reducer: { cart: cartReducer },
    preloadedState: { cart: {
      ...initial,
      phoneNumber: source.contactNumber || address.phone || "",
      customerName: source.customerName || address.name || "",
      addressCategory: "new",
      newAddress: {
        ...initial.newAddress,
        fullName: source.customerName || address.name || "",
        phone: source.contactNumber || address.phone || "",
        address1: address.address1 || "", address2: address.address2 || "",
        city: address.city || "", state: address.province || "",
        pincode: address.zip || "", country: address.country || "India",
      },
    } },
  });
}

export default function RepunchCheckout({ source, ...props }) {
  // This provider is deliberately separate from the normal navbar cart.
  const [store] = useState(() => createRepunchStore(source));
  return <Provider store={store}><CartDrawer repunchSource={source} {...props} /></Provider>;
}
