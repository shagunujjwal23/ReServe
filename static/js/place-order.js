let listingData = null;

let selectedSlot = null;
let selectedPickupDate = null;

let communitySupport = 0;

/* ==========================================================
   PLATFORM FEE
========================================================== */

const PLATFORM_FEE_RATE = 0.05;
const MAX_PLATFORM_FEE = 20;

/* ==========================================================
   PAGE LOAD
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const listingId = getListingId();

  console.log("Place Order - Listing ID:", listingId);

  if (!listingId || !isValidObjectId(listingId)) {
    showOrderError("Invalid or missing listing ID.");
    return;
  }

  initializeBackButton();
  initializeQuantity();
  initializeInstructions();
  initializeCommunitySupport();
  initializeReserveButton();
  initializeMapButton();
  initializeProfileMenu();

  await loadListing(listingId);
});

/* ==========================================================
   GET LISTING ID
========================================================== */

function getListingId() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);

  const placeOrderIndex = pathParts.indexOf("place-order");

  if (placeOrderIndex === -1) {
    return null;
  }

  return pathParts[placeOrderIndex + 1] || null;
}

/* ==========================================================
   VALIDATE MONGODB OBJECT ID
========================================================== */

function isValidObjectId(id) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/* ==========================================================
   LOAD LISTING
========================================================== */

async function loadListing(listingId) {
  showLoading();

  try {
    const response = await fetch(
      `/api/listings/${encodeURIComponent(listingId)}`,
      {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      },
    );

    let data = {};

    try {
      data = await response.json();
    } catch (jsonError) {
      throw new Error("Invalid server response.");
    }

    console.log("Listing API Response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Unable to load listing.");
    }

    if (!data.success || !data.listing) {
      throw new Error(data.message || "Listing not found.");
    }

    listingData = data.listing;

    console.log("Listing Loaded:", listingData);

    populateListingData();

    hideLoading();
  } catch (error) {
    console.error("Load listing error:", error);

    hideLoading();

    showOrderError(error.message || "Unable to load food details.");
  }
}

/* ==========================================================
   POPULATE LISTING DATA
========================================================== */

function populateListingData() {
  if (!listingData) {
    showOrderError("Listing data is unavailable.");
    return;
  }

  /* --------------------------------------------------------
     BASIC VALUES
  -------------------------------------------------------- */

  const foodName =
    listingData.food_title ||
    listingData.food_name ||
    listingData.food_title ||
    "Food Item";

  const providerName = listingData.provider_name || "Food Provider";

  const quantity = Number(listingData.quantity) || 0;

  const unit = listingData.unit || "Unit";

  const discountedPrice =
    Number(listingData.discounted_price) || Number(listingData.price) || 0;

  const originalPrice = Number(listingData.original_price) || discountedPrice;

  const foodType =
    listingData.food_type || listingData.food_category || "Vegetarian";

  /* --------------------------------------------------------
     FOOD IMAGE
  -------------------------------------------------------- */

  const foodImage = document.getElementById("foodImage");

  if (foodImage) {
    const imagePath =
      listingData.image || "/static/images/food-placeholder.jpg";

    foodImage.src = imagePath;

    foodImage.onerror = () => {
      foodImage.src = "/static/images/food-placeholder.jpg";
    };
  }

  /* --------------------------------------------------------
     FOOD NAME
  -------------------------------------------------------- */

  setText("foodName", foodName);
  setText("summaryFoodName", foodName);

  /* --------------------------------------------------------
     PROVIDER
  -------------------------------------------------------- */

  setText("providerName", providerName);
  setText("pickupProvider", providerName);

  /* --------------------------------------------------------
     FOOD TYPE
  -------------------------------------------------------- */

  setText("foodType", foodType);

  updateFoodTypeIcon(foodType);

  /* --------------------------------------------------------
     PRICE
  -------------------------------------------------------- */

  setText("unitPrice", `₹${formatAmount(discountedPrice)}`);

  setText("priceUnit", getPriceUnitText(unit));

  /* --------------------------------------------------------
     QUANTITY
  -------------------------------------------------------- */

  const quantityInput = document.getElementById("quantity");

  if (quantityInput) {
    quantityInput.max = quantity;

    const requestedQuantity = getRequestedQuantity();

    const initialQuantity = requestedQuantity
      ? Math.min(requestedQuantity, quantity)
      : 1;

    quantityInput.value = Math.max(1, initialQuantity);
  }

  setText("availableInfo", `${quantity} Available`);

  /* --------------------------------------------------------
     QUANTITY QUESTION
  -------------------------------------------------------- */

  setText(
    "quantityQuestion",
    `How many ${getUnitPlural(unit)} would you like to reserve?`,
  );

  setText("servesText", `Available: ${quantity} ${getUnitPlural(unit)}`);

  setText("summaryUnit", getSummaryUnit(unit));

  /* --------------------------------------------------------
   PICKUP DATE + TIME
-------------------------------------------------------- */

  initializePickupDateTime();

  /* --------------------------------------------------------
     PICKUP LOCATION
  -------------------------------------------------------- */

  const address = listingData.address || "";

  const city = listingData.city || "";

  let fullAddress = address;

  if (city && !address.toLowerCase().includes(city.toLowerCase())) {
    fullAddress += fullAddress ? `, ${city}` : city;
  }

  setText("pickupAddress", fullAddress || "Address unavailable");

  /* --------------------------------------------------------
     MAP
  -------------------------------------------------------- */

  initializeMapButton();

  /* --------------------------------------------------------
     PROFILE
  -------------------------------------------------------- */

  updateProfile();

  /* --------------------------------------------------------
     SUMMARY
  -------------------------------------------------------- */

  updateSummary(discountedPrice, originalPrice);
}

/* ==========================================================
   UPDATE SUMMARY
========================================================== */

function updateSummary(priceOverride = null, originalPriceOverride = null) {
  if (!listingData) {
    return;
  }

  const quantityInput = document.getElementById("quantity");

  const quantity = Number(quantityInput?.value) || 1;

  const price =
    priceOverride !== null
      ? Number(priceOverride)
      : Number(listingData.discounted_price || listingData.price || 0);

  const originalPrice =
    originalPriceOverride !== null
      ? Number(originalPriceOverride)
      : Number(listingData.original_price || price);

  /* --------------------------------------------------------
     SUBTOTAL
  -------------------------------------------------------- */

  const subtotal = quantity * price;

  /* --------------------------------------------------------
     PLATFORM FEE
     
     5% of subtotal
     Maximum ₹20
  -------------------------------------------------------- */

  const platformFee = Math.min(subtotal * PLATFORM_FEE_RATE, MAX_PLATFORM_FEE);

  /* --------------------------------------------------------
     TOTAL
  -------------------------------------------------------- */

  const total = subtotal + platformFee + communitySupport;

  /* --------------------------------------------------------
     QUANTITY
  -------------------------------------------------------- */

  setText("summaryQuantity", quantity);

  /* --------------------------------------------------------
     SUBTOTAL
  -------------------------------------------------------- */

  setText("subtotalAmount", `₹${formatAmount(subtotal)}`);

  /* --------------------------------------------------------
     PLATFORM FEE
  -------------------------------------------------------- */

  setText("platformFee", `₹${formatAmount(platformFee)}`);

  /* --------------------------------------------------------
     COMMUNITY SUPPORT
  -------------------------------------------------------- */

  setText("communitySupport", `₹${formatAmount(communitySupport)}`);

  /* --------------------------------------------------------
     TOTAL
  -------------------------------------------------------- */

  setText("totalAmount", `₹${formatAmount(total)}`);

  updateDiscount(price, originalPrice);
}

/* ==========================================================
   DISCOUNT
========================================================== */

function updateDiscount(discountedPrice, originalPrice) {
  const priceElement = document.getElementById("unitPrice");

  if (!priceElement) {
    return;
  }

  if (originalPrice > discountedPrice && originalPrice > 0) {
    priceElement.title = `Original price: ₹${formatAmount(originalPrice)}`;
  } else {
    priceElement.removeAttribute("title");
  }
}

/* ==========================================================
   QUANTITY CONTROLS
========================================================== */

function initializeQuantity() {
  const increaseBtn = document.getElementById("increaseQty");

  const decreaseBtn = document.getElementById("decreaseQty");

  const quantityInput = document.getElementById("quantity");

  if (!increaseBtn || !decreaseBtn || !quantityInput) {
    return;
  }

  /* --------------------------------------------------------
     INCREASE
  -------------------------------------------------------- */

  increaseBtn.addEventListener("click", () => {
    if (!listingData) {
      return;
    }

    const available = Number(listingData.quantity) || 0;

    let value = Number(quantityInput.value) || 1;

    if (value < available) {
      value += 1;

      quantityInput.value = value;

      updateSummary();
    }
  });

  /* --------------------------------------------------------
     DECREASE
  -------------------------------------------------------- */

  decreaseBtn.addEventListener("click", () => {
    let value = Number(quantityInput.value) || 1;

    if (value > 1) {
      value -= 1;

      quantityInput.value = value;

      updateSummary();
    }
  });

  /* --------------------------------------------------------
     MANUAL INPUT
  -------------------------------------------------------- */

  quantityInput.addEventListener("input", () => {
    if (!listingData) {
      return;
    }

    const available = Number(listingData.quantity) || 0;

    let value = Number(quantityInput.value);

    if (!Number.isFinite(value)) {
      value = 1;
    }

    value = Math.floor(value);

    if (value < 1) {
      value = 1;
    }

    if (value > available) {
      value = available;
    }

    quantityInput.value = value;

    updateSummary();
  });
}

/* ==========================================================
   PICKUP DATE
========================================================== */

function formatPickupDate(dateValue) {
  if (!dateValue) {
    return "Not specified";
  }

  const date = parseDate(dateValue);

  if (!date) {
    return "Not specified";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ==========================================================
   FORMAT TIME
========================================================== */

function formatTime(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = dateValue instanceof Date ? dateValue : parseDate(dateValue);

  if (!date) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* ==========================================================
   PARSE DATE
========================================================== */

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/* ==========================================================
   BACK TO FOOD DETAILS
========================================================== */

function initializeBackButton() {
  const button = document.getElementById("backToListing");

  if (!button) {
    return;
  }

  const listingId = getListingId();

  if (listingId) {
    button.href = `/listing/${encodeURIComponent(listingId)}`;
  } else {
    button.href = "/explore-food";
  }
}

/* ==========================================================
   VIEW MAP
========================================================== */

function initializeMapButton() {
  const button = document.getElementById("viewMapBtn");

  if (!button || !listingData) {
    return;
  }

  button.onclick = () => {
    const address = [
      listingData.address,
      listingData.city,
      listingData.state,
      listingData.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    if (!address) {
      alert("Pickup location is unavailable.");

      return;
    }

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    window.open(mapUrl, "_blank", "noopener,noreferrer");
  };
}

/* ==========================================================
   SPECIAL INSTRUCTIONS
========================================================== */

function initializeInstructions() {
  const textarea = document.getElementById("instructions");

  const counter = document.getElementById("characterCount");

  if (!textarea || !counter) {
    return;
  }

  const updateCounter = () => {
    counter.textContent = `${textarea.value.length}/200`;
  };

  textarea.addEventListener("input", updateCounter);

  updateCounter();
}

/* ==========================================================
   RESERVE BUTTON
========================================================== */

function initializeReserveButton() {
  const button = document.getElementById("placeOrderBtn");

  if (!button) {
    return;
  }

  button.addEventListener("click", placeOrder);
}

/* ==========================================================
   PLACE ORDER
========================================================== */

async function placeOrder() {
  const button = document.getElementById("placeOrderBtn");

  if (!listingData) {
    alert("Listing is not loaded yet.");

    return;
  }

  const quantityInput = document.getElementById("quantity");

  const instructions = document.getElementById("instructions");

  const quantity = Number(quantityInput?.value) || 1;

  const listingId = listingData.id || listingData._id;

  /* --------------------------------------------------------
     VALIDATION
  -------------------------------------------------------- */

  if (!listingId) {
    alert("Listing ID is missing.");

    return;
  }

  const available = Number(listingData.quantity) || 0;

  if (quantity < 1) {
    alert("Please select at least 1 unit.");

    return;
  }

  if (quantity > available) {
    alert(
      `Only ${available} ${getUnitPlural(listingData.unit)} are available.`,
    );

    return;
  }

  /* --------------------------------------------------------
   PICKUP DATE REQUIRED
-------------------------------------------------------- */

  if (!selectedPickupDate) {
    alert("Please select a pickup date.");

    const dateSelect = document.getElementById("pickupDate");

    if (dateSelect) {
      dateSelect.focus();

      dateSelect.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    return;
  }

  /* --------------------------------------------------------
   PICKUP TIME REQUIRED
-------------------------------------------------------- */

  if (!selectedSlot) {
    alert("Please select a pickup time.");

    const timeSelect = document.getElementById("pickupTime");

    if (timeSelect) {
      timeSelect.focus();

      timeSelect.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    return;
  }

  /* --------------------------------------------------------
     DISABLE BUTTON
  -------------------------------------------------------- */

  button.disabled = true;

  const originalButtonHTML = button.innerHTML;

  button.innerHTML = `
    <span>Reserving...</span>
    <i class="ri-loader-4-line ri-spin"></i>
  `;

  try {
    const response = await fetch("/api/orders/place", {
      method: "POST",

      credentials: "same-origin",

      headers: {
        "Content-Type": "application/json",

        Accept: "application/json",
      },

      body: JSON.stringify({
        listing_id: listingId,
        quantity: quantity,
        pickup_date: selectedPickupDate,
        pickup_time: selectedSlot,
        instructions: instructions?.value.trim() || "",
        community_support: communitySupport,
      }),
    });

    let result = {};

    try {
      result = await response.json();
    } catch (jsonError) {
      throw new Error("Invalid response from server.");
    }

    console.log("Place Order Response:", result);

    if (!response.ok) {
      throw new Error(result.message || "Unable to reserve food.");
    }

    if (result.success === false) {
      throw new Error(result.message || "Reservation failed.");
    }

    showSuccess(result.message || "Food reserved successfully!");

    /* ------------------------------------------------------
       REDIRECT
    ------------------------------------------------------ */

    setTimeout(() => {
      window.location.href = "/user-dashboard";
    }, 1500);
  } catch (error) {
    console.error("Place order error:", error);

    alert(error.message || "Unable to place reservation.");

    button.disabled = false;

    button.innerHTML = originalButtonHTML;
  }
}

/* ==========================================================
   PROFILE
========================================================== */

function updateProfile() {
  const profileName = document.getElementById("profileName");

  const profileRole = document.getElementById("profileRole");

  if (profileName) {
    if (profileName.textContent.trim() === "Loading...") {
      profileName.textContent = "User";
    }
  }

  if (profileRole) {
    profileRole.textContent = "User";
  }
}

/* ==========================================================
   PROFILE DROPDOWN
========================================================== */

function initializeProfileMenu() {
  const profileButton = document.getElementById("profileMenuBtn");

  const dropdown = document.getElementById("profileDropdown");

  const logoutBtn = document.getElementById("logoutBtn");

  if (profileButton && dropdown) {
    profileButton.addEventListener("click", (event) => {
      event.stopPropagation();

      dropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", () => {
      dropdown.classList.add("hidden");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch (error) {
        console.error("Logout error:", error);
      }

      window.location.href = "/login";
    });
  }
}

/* ==========================================================
   FOOD TYPE ICON
========================================================== */

function updateFoodTypeIcon(foodType) {
  const badge = document.getElementById("foodTypeBadge");

  if (!badge) {
    return;
  }

  const icon = badge.querySelector("i");

  if (!icon) {
    return;
  }

  const type = String(foodType || "").toLowerCase();

  if (
    type.includes("non") ||
    type.includes("chicken") ||
    type.includes("meat") ||
    type.includes("egg") ||
    type.includes("fish")
  ) {
    icon.className = "ri-restaurant-line";
  } else {
    icon.className = "ri-leaf-line";
  }
}

/* ==========================================================
   COMMUNITY SUPPORT
========================================================== */

function initializeCommunitySupport() {
  const options = document.querySelectorAll(".support-option");

  const customButton = document.getElementById("customSupportBtn");

  const customInputBox = document.getElementById("customSupportInput");

  const customInput = document.getElementById("customSupportAmount");

  const applyCustomButton = document.getElementById("applyCustomSupport");

  /* --------------------------------------------------------
     PRESET OPTIONS
  -------------------------------------------------------- */

  options.forEach((option) => {
    option.addEventListener("click", () => {
      const selectedAmount = Number(option.dataset.support) || 0;

      const wasAlreadySelected = option.classList.contains("active");

      /* Remove active state from all presets */
      options.forEach((item) => {
        item.classList.remove("active");
      });

      /* Remove custom state */
      if (customButton) {
        customButton.classList.remove("active");
      }

      if (customInputBox) {
        customInputBox.classList.add("hidden");
      }

      if (customInput) {
        customInput.value = "";
      }

      /* ----------------------------------------------------
         CLICK SAME OPTION AGAIN
         → REMOVE CONTRIBUTION
      ---------------------------------------------------- */

      if (wasAlreadySelected) {
        communitySupport = 0;
      } else {
        option.classList.add("active");

        communitySupport = selectedAmount;
      }

      updateSummary();

      console.log("Community support:", communitySupport);
    });
  });

  /* --------------------------------------------------------
     CUSTOM BUTTON
  -------------------------------------------------------- */

  if (customButton) {
    customButton.addEventListener("click", () => {
      const wasAlreadyActive = customButton.classList.contains("active");

      /* Remove preset selections */
      options.forEach((item) => {
        item.classList.remove("active");
      });

      /* ----------------------------------------------------
         CLICK CUSTOM AGAIN
         → REMOVE CONTRIBUTION
      ---------------------------------------------------- */

      if (wasAlreadyActive) {
        customButton.classList.remove("active");

        if (customInputBox) {
          customInputBox.classList.add("hidden");
        }

        if (customInput) {
          customInput.value = "";
        }

        communitySupport = 0;

        updateSummary();

        return;
      }

      /* ----------------------------------------------------
         ACTIVATE CUSTOM
      ---------------------------------------------------- */

      customButton.classList.add("active");

      if (customInputBox) {
        customInputBox.classList.remove("hidden");
      }

      if (customInput) {
        setTimeout(() => {
          customInput.focus();
        }, 50);
      }
    });
  }

  /* --------------------------------------------------------
     APPLY CUSTOM AMOUNT
  -------------------------------------------------------- */

  if (applyCustomButton) {
    applyCustomButton.addEventListener("click", () => {
      const amount = Number(customInput?.value);

      if (!Number.isFinite(amount)) {
        alert("Please enter a contribution amount.");

        customInput?.focus();

        return;
      }

      if (amount < 5) {
        alert("Minimum custom contribution is ₹5.");

        customInput?.focus();

        return;
      }

      if (amount > 500) {
        alert("Maximum custom contribution is ₹500.");

        customInput?.focus();

        return;
      }

      /* Store whole-number contribution */
      communitySupport = Math.floor(amount);

      /* Keep custom selected */
      customButton?.classList.add("active");

      /* Update summary */
      updateSummary();

      console.log("Custom community support:", communitySupport);
    });
  }

  /* --------------------------------------------------------
     ENTER KEY
  -------------------------------------------------------- */

  if (customInput) {
    customInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();

        applyCustomButton?.click();
      }
    });
  }
}

/* ==========================================================
   LOADING
========================================================== */

function showLoading() {
  const loading = document.getElementById("orderLoading");

  const error = document.getElementById("orderError");

  if (loading) {
    loading.classList.remove("hidden");
  }

  if (error) {
    error.classList.add("hidden");
  }
}

/* ==========================================================
   HIDE LOADING
========================================================== */

function hideLoading() {
  const loading = document.getElementById("orderLoading");

  if (loading) {
    loading.classList.add("hidden");
  }
}

/* ==========================================================
   SHOW ERROR
========================================================== */

function showOrderError(message) {
  hideLoading();

  const error = document.getElementById("orderError");

  const messageElement = document.getElementById("orderErrorMessage");

  if (messageElement) {
    messageElement.textContent = message;
  }

  if (error) {
    error.classList.remove("hidden");
  }
}

/* ==========================================================
   SUCCESS MESSAGE
========================================================== */

function showSuccess(message) {
  alert(message);
}

/* ==========================================================
   SET TEXT HELPER
========================================================== */

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = value ?? "";
  }
}

/* ==========================================================
   FORMAT AMOUNT
========================================================== */

function formatAmount(amount) {
  return Number(amount || 0).toLocaleString("en-IN");
}

/* ==========================================================
   UNIT HELPERS
========================================================== */

function getUnitPlural(unit) {
  if (!unit) {
    return "units";
  }

  const value = String(unit).trim();

  const lower = value.toLowerCase();

  if (lower.endsWith("s")) {
    return value;
  }

  return `${value}s`;
}

function getSummaryUnit(unit) {
  if (!unit) {
    return "Unit";
  }

  return String(unit);
}

function getPriceUnitText(unit) {
  if (!unit) {
    return "per unit";
  }

  return `per ${String(unit).toLowerCase().replace(/s$/, "")}`;
}

/* ==========================================================
   REQUESTED QUANTITY
========================================================== */

function getRequestedQuantity() {
  const params = new URLSearchParams(window.location.search);

  const value = Number(params.get("quantity"));

  if (Number.isInteger(value) && value > 0) {
    return value;
  }

  return null;
}

/* ==========================================================
   PICKUP DATE + TIME
========================================================== */

function initializePickupDateTime() {
  const dateSelect = document.getElementById("pickupDate");
  const timeSelect = document.getElementById("pickupTime");

  if (!dateSelect || !timeSelect || !listingData) {
    return;
  }

  const pickupStart = parseDate(listingData.pickup_start);
  const pickupEnd = parseDate(listingData.pickup_end);

  if (!pickupStart || !pickupEnd || pickupEnd <= pickupStart) {
    dateSelect.innerHTML = `
      <option value="">Pickup date unavailable</option>
    `;

    timeSelect.innerHTML = `
      <option value="">Pickup time unavailable</option>
    `;

    selectedPickupDate = null;
    selectedSlot = null;

    return;
  }

  /* --------------------------------------------------------
     GENERATE DATES
  -------------------------------------------------------- */

  populatePickupDates(pickupStart, pickupEnd, dateSelect, timeSelect);

  /* --------------------------------------------------------
     DATE CHANGE
  -------------------------------------------------------- */

  dateSelect.addEventListener("change", () => {
    selectedPickupDate = dateSelect.value;

    selectedSlot = null;

    populatePickupTimesForDate(
      selectedPickupDate,
      pickupStart,
      pickupEnd,
      timeSelect,
    );
  });
}

/* ==========================================================
   GENERATE PICKUP DATES
========================================================== */

function populatePickupDates(pickupStart, pickupEnd, dateSelect, timeSelect) {
  dateSelect.innerHTML = "";

  const defaultOption = document.createElement("option");

  defaultOption.value = "";
  defaultOption.textContent = "Select a pickup date";

  dateSelect.appendChild(defaultOption);

  const currentDate = new Date(pickupStart);
  currentDate.setHours(0, 0, 0, 0);

  const lastDate = new Date(pickupEnd);
  lastDate.setHours(0, 0, 0, 0);

  while (currentDate <= lastDate) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    /*
      Check whether this day actually
      overlaps the pickup period.
    */

    const hasAvailability = pickupStart <= dayEnd && pickupEnd >= dayStart;

    if (hasAvailability) {
      const option = document.createElement("option");

      const dateKey = formatDateKey(currentDate);

      option.value = dateKey;
      option.textContent = formatDisplayDate(currentDate);

      dateSelect.appendChild(option);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  timeSelect.innerHTML = `
    <option value="">Select a pickup date first</option>
  `;

  selectedPickupDate = null;
  selectedSlot = null;
}

/* ==========================================================
   GENERATE TIME SLOTS FOR SELECTED DATE
========================================================== */

function populatePickupTimesForDate(
  selectedDate,
  pickupStart,
  pickupEnd,
  timeSelect,
) {
  /* --------------------------------------------------------
     RESET TIME FIELD
  -------------------------------------------------------- */

  timeSelect.innerHTML = "";

  /*
    Always keep the first option as the placeholder.
    This means selecting a date does NOT automatically
    select a pickup time.
  */

  const defaultOption = document.createElement("option");

  defaultOption.value = "";
  defaultOption.textContent = "Select a pickup time";
  defaultOption.selected = true;

  timeSelect.appendChild(defaultOption);

  selectedSlot = null;

  /* --------------------------------------------------------
     NO DATE SELECTED
  -------------------------------------------------------- */

  if (!selectedDate) {
    defaultOption.textContent = "Select a pickup date first";
    return;
  }

  /* --------------------------------------------------------
     SELECTED DAY RANGE
  -------------------------------------------------------- */

  const selectedDayStart = new Date(`${selectedDate}T00:00:00`);

  const selectedDayEnd = new Date(`${selectedDate}T23:59:59`);

  /* --------------------------------------------------------
     ACTUAL PICKUP WINDOW FOR THIS DATE
  -------------------------------------------------------- */

  let slotStart =
    pickupStart > selectedDayStart
      ? new Date(pickupStart)
      : new Date(selectedDayStart);

  let slotEnd =
    pickupEnd < selectedDayEnd ? new Date(pickupEnd) : new Date(selectedDayEnd);

  /* --------------------------------------------------------
     SAFETY CHECK
  -------------------------------------------------------- */

  if (slotStart >= slotEnd) {
    defaultOption.textContent = "No pickup time available";
    return;
  }

  /* --------------------------------------------------------
     GENERATE 1-HOUR TIME SLOTS
  -------------------------------------------------------- */

  while (slotStart < slotEnd) {
    let nextSlot = new Date(slotStart);

    nextSlot.setHours(nextSlot.getHours() + 1);

    if (nextSlot > slotEnd) {
      nextSlot = new Date(slotEnd);
    }

    const startLabel = formatTime(slotStart);
    const endLabel = formatTime(nextSlot);

    if (startLabel && endLabel) {
      const option = document.createElement("option");

      const slotValue = `${startLabel} - ${endLabel}`;

      option.value = slotValue;
      option.textContent = slotValue;

      timeSelect.appendChild(option);
    }

    slotStart = new Date(nextSlot);

    if (slotStart >= slotEnd) {
      break;
    }
  }

  /* --------------------------------------------------------
     TIME SELECTION
  -------------------------------------------------------- */

  timeSelect.onchange = () => {
    selectedSlot = timeSelect.value || null;

    console.log("Selected pickup date:", selectedPickupDate);

    console.log("Selected pickup time:", selectedSlot);
  };
}

/* ==========================================================
   DATE KEY
   Example:
   2026-08-14
========================================================== */

function formatDateKey(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* ==========================================================
   DISPLAY DATE
   Example:
   Friday, 14 Aug 2026
========================================================== */

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
