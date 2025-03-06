import { useState, useEffect } from "react";
import axios from "axios";

const OrderForm = () => {
  const [orderData, setOrderData] = useState({
    email: "",
    line_items: [],
    first_name: "",
    last_name: "",
    billing_address: {
      first_name: "",
      last_name: "",
      address1: "",
      city: "",
      province: "",
      country: "",
      zip: "",
    },
    shipping_address: {
      first_name: "",
      last_name: "",
      address1: "",
      city: "",
      province: "",
      country: "",
      zip: "",
    },
    language: "English",
    country: "India",
    company: "",
    address: "",
    apartment_suite: "",
    city: "",
    state: "",
    pinCode: "",
    phone: "",
    subTotal_price: "",
    current_total_discounts: "",
    current_total_tax: "",
    total_price: "",
    payment_gateway_names:'',
    countryCode:'+91',
  });

  const [orderCreated, setOrderCreated] = useState(false);
  const [products, setProducts] = useState([]); // List of Shopify products
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [subTotalBeforeDiscount, setSubTotalBeforeDiscount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [subTotalAfterDiscount, setSubTotalAfterDiscount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [customShipping, setCustomShipping] = useState(false);

  const [newTag, setNewTag] = useState(""); // Input field for new tag
  const [isEditing, setIsEditing] = useState(false); // Toggle input visibility

  const [selectedVariants, setSelectedVariants] = useState({});
  const [selectedVariantForProduct, setSelectedVariantForProduct] = useState(
    {}
  );
  const [paymentLink, setPaymentLink] = useState("");

  const [searchQuery, setSearchQuery] = useState(""); // State for search query
  const [currentPage, setCurrentPage] = useState(1); // State for current page

  const [financialStatus, setFinancialStatus] = useState("pending");

  const productsPerPage = 6; 
  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

   const countryCodes = [
     { label: "IN (+91)", value: "+91" },
     { label: "US (+1)", value: "+1-US" },
     { label: "UK (+44)", value: "+44" },
     { label: "AUS (+61)", value: "+61" },
     { label: "CAN (+1)", value: "+1-CAN" },
     { label: "GER (+49)", value: "+49" },
     { label: "FRA (+33)", value: "+33" },
     { label: "ITA (+39)", value: "+39" },
     { label: "ESP (+34)", value: "+34" },
     { label: "BRA (+55)", value: "+55" },
     { label: "SA (+27)", value: "+27" },
     { label: "JPN (+81)", value: "+81" },
     { label: "CHN (+86)", value: "+86" },
     { label: "MEX (+52)", value: "+52" },
     { label: "RUS (+7)", value: "+7" }, 
   ];

  const handleCountryCodeChange = (e) => {
    const { value } = e.target;
    setOrderData((prevState) => ({
      ...prevState,
      countryCode: value,
    }));
  };

  // Handle search query change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when search query changes
  };

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calculate total number of pages
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);


  // Packaging charges (example: 2% of subtotal)
  const packagingCharges = subTotalAfterDiscount * 0.02;

  // Final amount calculation
  const finalAmount =
    subTotalAfterDiscount +  
    Number(shippingCharge);


  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "payment_gateway_names") { 
    setOrderData((prevData) => ({
      ...prevData,
      [name]: [value], 
    }));
  } else if (
      name.startsWith("billing_address.") ||
      name.startsWith("shipping_address.")
    ) {
      const [section, field] = name.split(".");
      setOrderData((prevData) => ({
        ...prevData,
        [section]: {
          ...prevData[section],
          [field]: value,
        },
      }));
    } else {
      setOrderData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  // Handle adding a new custom tag
  const handleAddTag = (e) => {
    if (e.key === "Enter" && newTag.trim() !== "") {
      setOrderData((prevData) => ({
        ...prevData,
        tags: [...(prevData.tags || []), newTag.trim()], // Add custom tag to orderData
      }));
      setNewTag(""); // Reset input
      setIsEditing(false); // Hide input
    }
  };

  useEffect(() => {
    // Fetch products from backend
    const fetchProducts = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/products");
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();

    const newSubTotalBeforeDiscount = orderData.line_items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    setSubTotalBeforeDiscount(newSubTotalBeforeDiscount);

    // Calculate discount
    const newDiscountAmount =
      newSubTotalBeforeDiscount * (discountPercentage / 100);
    const newSubTotalAfterDiscount =
      newSubTotalBeforeDiscount - newDiscountAmount;
    setDiscountAmount(newDiscountAmount);
    setSubTotalAfterDiscount(newSubTotalAfterDiscount);

    // Calculate tax (18% GST)
    const newTaxAmount = newSubTotalAfterDiscount * 0.18;
    setTaxAmount(newTaxAmount);

    // Packaging charges (2% of subtotal after discount)
    const newPackagingCharges = newSubTotalAfterDiscount * 0.02;

    // Final amount calculation
    const newFinalAmount =
      newSubTotalAfterDiscount +
      newTaxAmount +
      newPackagingCharges +
      Number(shippingCharge);

    setOrderData((prev) => ({
      ...prev,
      subTotal_price: newSubTotalBeforeDiscount.toFixed(2),
      current_total_discounts: newDiscountAmount.toFixed(2),
      current_total_tax: newTaxAmount.toFixed(2),
      total_price: newFinalAmount.toFixed(2),
    }));
  }, [
    orderData.line_items,
    discountPercentage,
    packagingCharges,
    shippingCharge,
    customShipping,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!orderData.line_items || orderData.line_items.length === 0) {
      alert(" Error: No items selected.");
      return;
    }

    console.log(
      " Debug: Current `line_items` before submission:",
      JSON.stringify(orderData.line_items, null, 2)
    );

    const validLineItems = orderData.line_items
      .map((item) => {
        if (!item.variant_id || !item.quantity || !item.price) {
          console.error(
            " ERROR: Missing `variant_id`, `quantity`, or `price` for item:",
            item
          );
          return null;
        }
        return {
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: parseFloat(item.price),
          name: item.name,
          title: item.title,
        };
      })
      .filter(Boolean);

    // console.log(
    //   " Debug: `validLineItems` after filtering:",
    //   JSON.stringify(validLineItems, null, 2)
    // );

    if (validLineItems.length === 0) {
      alert("Error: No valid line items found. Please select a valid product.");
      return;
    }

    const orderDetails = {
      order: {
        line_items: validLineItems,
        customer: {
          email: orderData.email,
          first_name: orderData.first_name,
          last_name: orderData.last_name,
        },
        billing_address: orderData.billing_address,
        shipping_address: orderData.shipping_address,
        subtotal_price: subTotalAfterDiscount.toFixed(2),
        current_total_discounts: discountAmount.toFixed(2),
        current_total_tax: taxAmount.toFixed(2),
        total_price: finalAmount.toFixed(2),
        financial_status: "pending",
        payment_gateway_names: orderData.payment_gateway_names,
      },
    };

    try {
      // console.log("Sending order:", JSON.stringify(orderDetails, null, 2));

      const response = await axios.post(
        "http://localhost:5000/api/create-order",
        orderDetails
      );
      // console.log(" Order Created:", response.data);


      if (response.data.success) {
        alert("Order created successfully!");

        if (
          orderData.payment_gateway_names &&
          orderData.payment_gateway_names[0] === "razorpay" &&
          response.data.paymentLink
        ) {
          setPaymentLink(response.data.paymentLink);
        }
      }

      console.log(response.data)
    
      setOrderData({
        email: "",
        line_items: [],
        billing_address: {
          first_name: "",
          last_name: "",
          address1: "",
          city: "",
          province: "",
          country: "",
          zip: "",
        },
        shipping_address: {
          first_name: "",
          last_name: "",
          address1: "",
          city: "",
          province: "",
          country: "",
          zip: "",
        },
        subtotal_price: "",
        current_total_discounts: "",
        current_total_tax: "",
        total_price: "",
        payment_gateway_names:'',
      });
      setOrderCreated(true);
    } catch (error) {
      console.error(
        "Error creating order:",
        error.response?.data || error.message
      );
      alert("Error creating order. Check console for details.");
    }
  };


  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    alert("Payment link copied to clipboard!");
  };

  const handleSelection = (product) => {
    setSelectedVariantForProduct((prev) => {
      const variant = prev[product.id]; 

      if (!variant) {
        alert("Please select a variant for this product before adding it.");
        return prev;  
      }

      return {
        ...prev,
        [product.id]: {
          variant_id: variant.id,
          quantity: 1,
          price: variant.price || 0,
          title: variant.title || "Unknown Product",
          name: product.title || "Unknown Product",
        },
      };
    });

    // Ensure orderData updates after state change
    setSelectedVariantForProduct((updatedVariants) => {
      setOrderData((prev) => ({
        ...prev,
        line_items:[...Object.values(updatedVariants)],  
      }));
      return updatedVariants;
    });
  };

  const handleQuantityChange = (variant_id, change) => {
    setOrderData((prevOrderData) => {
      const updatedLineItems = prevOrderData.line_items.map((item) => {
        if (item.variant_id === variant_id) {
          const updatedQuantity = item.quantity + change;
          return {
            ...item,
            quantity: updatedQuantity > 0 ? updatedQuantity : 1,  
          };
        }
        return item;
      });

      return {
        ...prevOrderData,
        line_items: updatedLineItems,
      };
    });
  };

  const handleVariantChange = (e, product) => {
    const selectedTitle = e.target.value;
 
    if (!selectedTitle) {
      setSelectedVariantForProduct((prev) => {
        const updatedVariants = { ...prev };
        delete updatedVariants[product.id];  
        return updatedVariants;
      });
      return;
    }

    // Otherwise, find and set the selected variant
    const variant = product.variants.find((v) => v.title === selectedTitle);
    setSelectedVariantForProduct((prev) => ({
      ...prev,
      [product.id]: variant,
    }));
  };

  return (
    <div className=" mx-auto p-8 bg-gray-100 rounded-lg shadow-lg">
      <h2
        className="text-3xl font-extrabold bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent 
             tracking-wide uppercase text-center drop-shadow-lg animate-fadeIn font-montserrat "
      >
        Create Your Order
      </h2>

      <div className="flex flex-col md:flex-row gap-10">
        {/* product section */}

        <div className="p-4 w-1/2">
          <h2
            className="text-lg font-semibold text-center mb-2 mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 
               text-transparent bg-clip-text border-b pb-2"
          >
            Available products
          </h2>

          {/* Search Bar */}

          <div className="mb-4 flex justify-center">
            <div className="relative w-2/3 sm:w-1/2">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full p-2 pl-9 border border-gray-300 rounded-full text-sm shadow-sm 
                 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 
                 transition-all outline-none"
              />
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-4.35-4.35m1.55-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* products */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {currentProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white p-2 rounded-xl shadow-md transform transition duration-300 hover:scale-105 hover:shadow-lg"
              >
                {/* Title */}
                <h3 className="text-xs font-semibold mt-2 mb-2 text-center bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">
                  {product.title}
                </h3>

                {/* Product Image */}
                <div className="flex justify-center">
                  <img
                    src={
                      product.image?.src || "https://via.placeholder.com/100"
                    }
                    alt={product.title}
                    className="w-16 h-16 object-cover rounded-lg transition duration-300 hover:scale-110 shadow-sm"
                  />
                </div>

                {/* Variant Selection */}
                <div className="sm:col-span-2 mt-2 flex justify-center">
                  <select
                    name={`variants-${product.id}`}
                    value={selectedVariantForProduct[product.id]?.title || ""}
                    onChange={(e) => handleVariantChange(e, product)}
                    required
                    className="w-2/3 border border-gray-300 p-1 text-xs rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value="">Select variant</option>
                    {product.variants.map((variant) => (
                      <option key={variant.id} value={variant.title}>
                        {variant.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div className="text-xs font-semibold text-gray-700 text-center mt-1">
                  ₹{selectedVariantForProduct[product.id]?.price || "0.00"}
                </div>

                {/* Select Button */}
                <div className="flex justify-center mt-3">
                  <button
                    onClick={() => handleSelection(product)}
                    className="px-3 py-1 text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-lg shadow-md transition duration-300 transform hover:scale-105 hover:shadow-lg focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  >
                    ADD
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* pagination */}

          <div className="flex justify-center items-center mt-6 space-x-2">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs font-medium rounded-md shadow-sm transition-all 
               bg-gradient-to-r from-gray-400 to-gray-500 text-white 
               hover:from-gray-500 hover:to-gray-600 focus:ring-2 focus:ring-gray-400 
               disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>

            {/* Page Number Display */}
            <span className="mx-1 text-xs font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded-md shadow-sm">
              Page {currentPage} of {totalPages}
            </span>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs font-medium rounded-md shadow-sm transition-all 
               bg-gradient-to-r from-purple-500 to-indigo-600 text-white 
               hover:from-purple-600 hover:to-indigo-700 focus:ring-2 focus:ring-purple-400 
               disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>

          {/* Order summary */}

          <table className="w-full mt-6 border-collapse shadow-lg rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm">
                <th className="p-2">Product</th>
                <th className="p-2">Variant</th>
                <th className="p-2">Quantity</th>
                <th className="p-2">Amount</th> 
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white text-gray-700 text-sm">
              {orderData.line_items.length > 0 ? (
                orderData.line_items.map((item) => (
                  <tr
                    key={item.variant_id}
                    className="border-b hover:bg-gray-100 transition duration-200 text-center"
                  >
                    <td className="p-2">{item.name || "N/A"}</td>
                    <td className="p-2">{item.title}</td>
                    <td className="p-2">
                      <div className="flex justify-center items-center">
                        <button
                          onClick={() =>
                            handleQuantityChange(item.variant_id, -1)
                          }
                          className="px-2 py-1 text-xs rounded-md bg-gray-200 hover:bg-gray-300 transition"
                        >
                          −
                        </button>
                        <span className="mx-2">{item.quantity}</span>
                        <button
                          onClick={() =>
                            handleQuantityChange(item.variant_id, 1)
                          }
                          className="px-2 py-1 text-xs rounded-md bg-gray-200 hover:bg-gray-300 transition"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-3">₹{item.price}</td>
                    <td className="p-3">
                      <button
                        onClick={() => {
                          setSelectedVariants((prev) => {
                            const updated = { ...prev };
                            delete updated[item.variant_id];
                            return updated;
                          });

                          setOrderData((prevOrderData) => ({
                            ...prevOrderData,
                            line_items: prevOrderData.line_items.filter(
                              (i) => i.variant_id !== item.variant_id
                            ),
                          }));
                        }}
                        className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded-md 
                         shadow-sm hover:bg-red-600 transition"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="text-center">
                  <td colSpan="7" className="p-3 text-gray-500 italic">
                    No items selected
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Payment Details */}
          <div className="mt-6">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">
              Payment Details
            </h2>

            <div className="mt-3">
              <div className="flex justify-between">
                <span>Sub Total (₹ before discount)</span>
                {subTotalBeforeDiscount ? (
                  <span>₹{subTotalBeforeDiscount}</span>
                ) : (
                  <span>₹0.00</span>
                )}
              </div>

              {/* Discount Field */}
              <div className="flex justify-between items-center mt-2">
                <span>Discount</span>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                    className="border border-gray-300 p-1 w-16 text-left"
                    min="0"
                    max="100"
                  />
                  <span className="mr-1 ml-1">%</span>
                  {discountAmount ? (
                    <span className="ml-4">₹{discountAmount.toFixed(2)}</span>
                  ) : (
                    <span>₹0.00</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-2">
                <span>Sub Total (after discount)</span>
                {subTotalAfterDiscount ? (
                  <span>₹{subTotalAfterDiscount.toFixed(2)}</span>
                ) : (
                  <span>₹0.00</span>
                )}
              </div>

              {/* Shipping Charges */}
              <div className="flex justify-between items-center mt-2">
                <span>Shipping Charges</span>
                {customShipping ? (
                  <input
                    type="text"
                    value={shippingCharge}
                    onChange={(e) => setShippingCharge(e.target.value)}
                    className="border border-gray-300 p-1 w-20 text-left"
                    min="0"
                  />
                ) : (
                  <span>₹0.00</span>
                )}
              </div>
              <div className="mt-1">
                <label className="flex items-center text-blue-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customShipping}
                    onChange={() => setCustomShipping(!customShipping)}
                    className="mr-2"
                  />
                  Shipping Charges?
                </label>
              </div>

              {/* Final Amount */}
              <div className="flex justify-between mt-4 font-bold text-lg">
                <span>Final Amount</span>
                {finalAmount ? (
                  <span>₹{finalAmount.toFixed(2)}</span>
                ) : (
                  <span>₹0.00</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:block w-[2px] bg-gray-300"></div>
        {/*  Order Form */}
        <div className="w-full md:w-1/2 p-8 rounded-lg">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent  sm:col-span-2 text-center border-b pb-2">
              Customer Details
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={orderData.first_name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={orderData.last_name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
 

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={orderData.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
 

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">
                Country/Region
              </label>
              <select
                name="country"
                value={orderData.country}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="India">India</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={orderData.address}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">
                Apartment, suite, etc
              </label>
              <input
                type="text"
                name="apartment_suite"
                value={orderData.apartment_suite}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                City
              </label>
              <input
                type="text"
                name="city"
                value={orderData.city}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                State
              </label>
              <input
                type="text"
                name="state"
                value={orderData.state}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Pin Code
              </label>
              <input
                type="text"
                name="pinCode"
                value={orderData.pinCode}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className=" flex items-center space-x-1">
              <div className="flex mt-5 flex-col w-1/4">
                <select
                  name="countryCode"
                  value={orderData.countryCode}
                  onChange={handleCountryCodeChange}
                  className="w-full border border-gray-300 p-2 text-xs rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {countryCodes.map((code) => (
                    <option key={code.value} value={code.value}>
                      {code.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col w-full">
                <label className="block text-sm font-medium text-gray-600">
                  Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={orderData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
                    if (value.length <= 10) {
                      handleChange({ target: { name: "phone", value } });
                    }
                  }}
                  maxLength={10}
                  required
                  className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <h3 className="text-md font-semibold text-gray-800 sm:col-span-2 border-b pb-2">
              Billing Address
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                First Name
              </label>
              <input
                type="text"
                name="billing_address.first_name"
                value={orderData.billing_address.first_name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Last Name
              </label>
              <input
                type="text"
                name="billing_address.last_name"
                value={orderData.billing_address.last_name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Address
              </label>
              <input
                type="text"
                name="billing_address.address1"
                value={orderData.billing_address.address1}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                City
              </label>
              <input
                type="text"
                name="billing_address.city"
                value={orderData.billing_address.city}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Province
              </label>
              <input
                type="text"
                name="billing_address.province"
                value={orderData.billing_address.province}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Country
              </label>
              <input
                type="text"
                name="billing_address.country"
                value={orderData.billing_address.country}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Zip Code
              </label>
              <input
                type="text"
                name="billing_address.zip"
                value={orderData.billing_address.zip}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <h3 className="text-md font-semibold text-gray-800 sm:col-span-2 border-b pb-2">
              Shipping Address
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                First Name
              </label>
              <input
                type="text"
                name="shipping_address.first_name"
                value={orderData.shipping_address.first_name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Last Name
              </label>
              <input
                type="text"
                name="shipping_address.last_name"
                value={orderData.shipping_address.last_name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Address
              </label>
              <input
                type="text"
                name="shipping_address.address1"
                value={orderData.shipping_address.address1}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                City
              </label>
              <input
                type="text"
                name="shipping_address.city"
                value={orderData.shipping_address.city}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Province
              </label>
              <input
                type="text"
                name="shipping_address.province"
                value={orderData.shipping_address.province}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Country
              </label>
              <input
                type="text"
                name="shipping_address.country"
                value={orderData.shipping_address.country}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Zip Code
              </label>
              <input
                type="text"
                name="shipping_address.zip"
                value={orderData.shipping_address.zip}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">
                Payment Gateways
              </label>
              <select
                name="payment_gateway_names"
                value={orderData.payment_gateway_names[0]}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Select payment method</option>
                <option value="razorpay">Razorpay</option>
                <option value="cod">Cash On Delivery(COD)</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-2 flex justify-center">
              <button
                type="submit"
                className="w-2/3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-semibold py-3 px-6 rounded-lg shadow-md transform transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 active:scale-95"
              >
                Create Order
              </button>
            </div>
          </form>

         

            {paymentLink && orderData.payment_gateway_names[0] === "razorpay" ?  ( 
            <div className="mt-4 p-4 bg-gray-50 border border-gray-300 rounded-lg shadow-md">
              <p className="text-sm font-medium text-gray-700 flex items-center">
                🔗 Payment Link:&nbsp;
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-semibold hover:underline transition duration-200"
                >
                  {paymentLink}
                </a>
              </p>

              {/* Copy Button */}
              <button
                onClick={handleCopyLink}
                className="mt-3 px-4 py-2 text-xs font-semibold text-white rounded-lg 
                 bg-gradient-to-r from-green-500 to-green-600 shadow-md 
                 hover:from-green-600 hover:to-green-700 hover:shadow-lg 
                 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                📋 Copy Link
              </button>
            </div>
          ):null}  
          
        </div>
      </div>
    </div>
  );
};

export default OrderForm;