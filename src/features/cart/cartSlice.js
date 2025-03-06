import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Global order/cart data
  cart: [],
  selection: {},
  discountModalOpen: false,
  discountType: "",
  discountValue: "",
  appliedDiscount: 0,
  shippingInput: "",
  shippingCost: 0,
  phoneNumber: "",
  addresses: [],
  addressCategory: "existing",
  selectedAddressIndex: null,
  newAddress: {
    fullName: "",
    phone: "",
    email: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
  },
  confirmedAddress: null,
  addressConfirmed: false,
  paymentMethod: "",
  razorpayLink: "",
  transactionId: "",
  customerName: "",
  customerId: "",
  billingSameAsShipping: true,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Cart and selection
    addToCart: (state, action) => {
      state.cart.push(action.payload);
    },
    removeFromCart: (state, action) => {
      state.cart.splice(action.payload, 1);
    },
    setSelection: (state, action) => {
      state.selection = { ...state.selection, ...action.payload };
    },

    // Discount & Shipping
    setDiscountModalOpen: (state, action) => {
      state.discountModalOpen = action.payload;
    },
    setDiscountType: (state, action) => {
      state.discountType = action.payload;
    },
    setDiscountValue: (state, action) => {
      state.discountValue = action.payload;
    },
    setAppliedDiscount: (state, action) => {
      state.appliedDiscount = action.payload;
    },
    setShippingInput: (state, action) => {
      state.shippingInput = action.payload;
    },
    setShippingCost: (state, action) => {
      state.shippingCost = action.payload;
    },

    // Payment & Customer Info
    setPhoneNumber: (state, action) => {
      state.phoneNumber = action.payload;
    },
    setAddresses: (state, action) => {
      state.addresses = action.payload;
    },
    setAddressCategory: (state, action) => {
      state.addressCategory = action.payload;
    },
    setSelectedAddressIndex: (state, action) => {
      state.selectedAddressIndex = action.payload;
    },
    setNewAddress: (state, action) => {
      state.newAddress = { ...state.newAddress, ...action.payload };
    },
    setConfirmedAddress: (state, action) => {
      state.confirmedAddress = action.payload;
    },
    setAddressConfirmed: (state, action) => {
      state.addressConfirmed = action.payload;
    },
    setPaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
    },
    setRazorpayLink: (state, action) => {
      state.razorpayLink = action.payload;
    },
    setTransactionId: (state, action) => {
      state.transactionId = action.payload;
    },
    setCustomerName: (state, action) => {
      state.customerName = action.payload;
    },
    setCustomerId: (state, action) => {
      state.customerId = action.payload;
    },
    setBillingSameAsShipping: (state, action) => {
      state.billingSameAsShipping = action.payload;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  setSelection,
  setDiscountModalOpen,
  setDiscountType,
  setDiscountValue,
  setAppliedDiscount,
  setShippingInput,
  setShippingCost,
  setPhoneNumber,
  setAddresses,
  setAddressCategory,
  setSelectedAddressIndex,
  setNewAddress,
  setConfirmedAddress,
  setAddressConfirmed,
  setPaymentMethod,
  setRazorpayLink,
  setTransactionId,
  setCustomerName,
  setCustomerId,
  setBillingSameAsShipping,
} = cartSlice.actions;

export default cartSlice.reducer;
