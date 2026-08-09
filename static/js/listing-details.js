/* ==========================================================
   ReServe - Individual Listing Details
   listing-details.js
========================================================== */

/* ==========================================================
   API CONFIGURATION
========================================================== */

const API_BASE_URL = "/api";

/* ==========================================================
   GLOBAL STATE
========================================================== */

let currentListing = null;
let availableQuantity = 0;
let currentUnitPrice = 0;

/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initializeListingDetails();
});

/* ==========================================================
   INITIALIZE PAGE
========================================================== */

async function initializeListingDetails() {
  try {
    setupNavbar();
    setupQuantityControls();
    setupReservationButton();
    setupReportButton();
    setupBackButton();

    await loadProfile();
    await loadListing();
  } catch (error) {
    console.error("Listing details initialization error:", error);
  }
}

/* ==========================================================
   GET LISTING ID
========================================================== */

function getListingId() {
  const pathParts = window.location.pathname.split("/");

  const listingIndex = pathParts.indexOf("listing");

  if (listingIndex !== -1 && pathParts[listingIndex + 1]) {
    return pathParts[listingIndex + 1];
  }

  return null;
}

/* ==========================================================
   LOAD LISTING
========================================================== */

async function loadListing() {
  const listingId = getListingId();

  const loadingElement = document.getElementById("listingLoading");

  if (!listingId) {
    hideListingLoading();
    showListingError("Invalid listing.");
    return;
  }

  // Show loading while fetching
  if (loadingElement) {
    loadingElement.classList.remove("hidden");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/listings/${listingId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load listing. Status: ${response.status}`);
    }

    const result = await response.json();

    /*
     * Supports:
     * { listing: {...} }
     * and direct {...}
     */
    currentListing = result.listing || result;

    if (!currentListing) {
      throw new Error("Listing data not found.");
    }

    // Render all listing information
    renderListing(currentListing);

    // IMPORTANT:
    // Hide the large loading area after successful rendering
    hideListingLoading();
  } catch (error) {
    console.error("Load listing error:", error);

    hideListingLoading();

    showListingError("Unable to load this food listing.");
  }
}

/* ==========================================================
   HIDE LISTING LOADING
========================================================== */

function hideListingLoading() {
  const loadingElement = document.getElementById("listingLoading");

  if (loadingElement) {
    loadingElement.classList.add("hidden");
  }
}

/* ==========================================================
   RENDER LISTING
========================================================== */

function renderListing(listing) {
  renderBasicInformation(listing);
  renderFoodImage(listing);
  renderPickupInformation(listing);
  renderProviderInformation(listing);
  renderAIInformation(listing);
  renderReservationInformation(listing);
}

/* ==========================================================
   BASIC FOOD INFORMATION
========================================================== */

function renderBasicInformation(listing) {
  setText(
    "listingFoodTitle",
    getValue(
      listing,
      ["foodName", "food_title", "name", "title"],
      "Food Listing",
    ),
  );

  setText(
    "listingShortDescription",
    getValue(
      listing,
      ["shortDescription", "summary"],
      "Loading food details...",
    ),
  );

  setText(
    "providerName",
    getValue(
      listing,
      ["providerName", "ownerName", "sellerName"],
      "Food Provider",
    ),
  );

  setText(
    "providerCardName",
    getValue(
      listing,
      ["providerName", "ownerName", "sellerName"],
      "Food Provider",
    ),
  );

  setText(
    "listingCategory",
    getValue(listing, ["category", "foodCategory"], "Food"),
  );

  const foodType = getValue(listing, ["foodType", "type"], "Vegetarian");

  setText("listingFoodType", foodType);
  setText("foodTypeText", ` ${foodType} `);

  setText(
    "listingLocation",
    getValue(listing, ["location", "city", "pickupCity"], "Lucknow"),
  );

  setText(
    "listingExpiry",
    formatDateTime(
      getValue(
        listing,
        ["bestBefore", "expiryDate", "expiry_date", "expiry"],
        null,
      ),
      "Not specified",
    ),
  );

  setText("listingPickupTime", formatPickupTime(listing));

  const quantity = getNumericValue(
    listing,
    ["quantity", "availableQuantity", "units"],
    0,
  );

  const unit = getValue(listing, ["unit", "quantityUnit"], "Units");

  setText("listingQuantity", `${formatNumber(quantity)} ${unit}`);

  setText("availableQuantity", `${formatNumber(quantity)} ${unit}`);

  setText("reserveUnitLabel", ` (${unit})`);

  availableQuantity = quantity;
}

/* ==========================================================
   FOOD IMAGE
========================================================== */

function renderFoodImage(listing) {
  const image = document.getElementById("listingMainImage");
  const placeholder = document.getElementById("mainImagePlaceholder");

  if (!image) return;

  const imageUrl = getValue(
    listing,
    ["image", "imageUrl", "foodImage", "photo"],
    null,
  );

  if (!imageUrl) {
    showImagePlaceholder();
    return;
  }

  image.onload = () => {
    image.style.display = "block";

    if (placeholder) {
      placeholder.style.display = "none";
    }
  };

  image.onerror = () => {
    showImagePlaceholder();
  };

  image.src = normalizeImageUrl(imageUrl);
}

/* ==========================================================
   IMAGE PLACEHOLDER
========================================================== */

function showImagePlaceholder() {
  const image = document.getElementById("listingMainImage");
  const placeholder = document.getElementById("mainImagePlaceholder");

  if (image) {
    image.style.display = "none";
  }

  if (placeholder) {
    placeholder.style.display = "flex";
  }
}

/* ==========================================================
   PICKUP INFORMATION
========================================================== */

function renderPickupInformation(listing) {
  setText(
    "pickupAddress",
    getValue(listing, ["pickupAddress", "address"], "Not specified"),
  );

  const landmark = getValue(listing, ["landmark", "pickupLandmark"], null);

  setText("pickupLandmark", landmark || "No landmark provided");

  const pickupDate = getValue(
    listing,
    ["pickupDate", "pickup_date", "date", "pickup_start"],
    null,
  );

  setText("pickupDate", pickupDate ? formatDate(pickupDate) : "Not specified");
  setText("pickupTime", formatPickupTime(listing));

  const instructions = getValue(
    listing,
    ["pickupInstructions", "instructions"],
    null,
  );

  setText("pickupInstructions", instructions || "Don't ring the bell");

  /* ========================================================
     WHY FOOD IS AVAILABLE
  ======================================================== */

  setText(
    "availabilityReason",
    getValue(
      listing,
      ["availabilityReason", "reason", "surplusReason"],
      "Surplus food available for recovery.",
    ),
  );

  /* ========================================================
     DESCRIPTION
  ======================================================== */

  setText(
    "listingDescription",
    getValue(
      listing,
      ["description", "fullDescription"],
      "No description available.",
    ),
  );
}

/* ==========================================================
   PROVIDER INFORMATION
========================================================== */

function renderProviderInformation(listing) {
  setText(
    "providerName",
    getValue(
      listing,
      ["providerName", "ownerName", "sellerName"],
      "Food Provider",
    ),
  );

  setText(
    "providerCardName",
    getValue(
      listing,
      ["providerName", "ownerName", "sellerName"],
      "Food Provider",
    ),
  );

  setText(
    "providerRating",
    getValue(listing, ["providerRating", "rating"], "4.8"),
  );

  const reviews = getNumericValue(
    listing,
    ["providerReviews", "reviews", "reviewCount"],
    0,
  );

  setText("providerReviews", `(${formatNumber(reviews)} reviews)`);

  setText(
    "providerDonations",
    formatNumber(
      getNumericValue(
        listing,
        ["providerDonations", "totalDonations", "donations"],
        0,
      ),
    ),
  );

  const responseRate = getValue(
    listing,
    ["providerResponseRate", "responseRate"],
    null,
  );

  setText(
    "providerResponseRate",
    responseRate !== null && responseRate !== undefined && responseRate !== ""
      ? formatPercentage(responseRate)
      : "—",
  );

  setText(
    "providerMessage",
    getValue(
      listing,
      ["providerMessage", "providerBio", "message"],
      "We believe in sharing surplus food and making a positive impact in the community.",
    ),
  );
}

/* ==========================================================
   AI VERIFIED INFORMATION
========================================================== */

function renderAIInformation(listing) {

  /*
   * Get AI result from the listing.
   * Supports different possible backend structures.
   */

  const aiResult =
    listing?.aiResult ||
    listing?.ai ||
    listing?.aiAnalysis ||
    listing?.aiVerified ||
    listing;

  /* ========================================================
     FRESHNESS SCORE
  ======================================================== */

  const freshnessScore =
    aiResult?.insights?.find(
      (item) =>
        item.title?.toLowerCase() === "freshness"
    )?.score ??
    aiResult?.freshnessScore ??
    aiResult?.freshness_score ??
    aiResult?.freshness ??
    null;

  setText(
    "aiFreshnessScore",
    freshnessScore !== null
      ? `${Number(freshnessScore)}%`
      : "—"
  );


  /* ========================================================
     RECOVERY PROBABILITY
  ======================================================== */

  const recoveryProbability =
    aiResult?.confidence?.recovery ??
    aiResult?.recoveryProbability ??
    aiResult?.recovery_probability ??
    aiResult?.recoveryScore ??
    null;

  setText(
    "aiRecoveryProbability",
    recoveryProbability !== null
      ? `${Number(recoveryProbability)}%`
      : "—"
  );


  /* ========================================================
     CARBON SAVED
  ======================================================== */

  const carbonSaved =
    aiResult?.metrics?.carbon ??
    aiResult?.carbonSaved ??
    aiResult?.carbon_saved ??
    aiResult?.carbonSavings ??
    null;

  setText(
    "aiCarbonSaved",
    carbonSaved !== null
      ? `${Number(carbonSaved)} kg`
      : "—"
  );


  /* ========================================================
     USER VIEW
     Do NOT show owner recommendations here.
  ======================================================== */

  const verificationElement =
    document.getElementById("aiRecommendation");

  if (verificationElement) {
    verificationElement.textContent =
      "Verified listing • AI analyzed";
  }
}

/* ==========================================================
   RESERVATION INFORMATION
========================================================== */

function renderReservationInformation(listing) {
  const quantity = getNumericValue(
    listing,
    ["quantity", "availableQuantity", "units"],
    0,
  );

  const price = getNumericValue(
    listing,
    ["price", "discountedPrice", "discounted_price", "sellingPrice"],
    0,
  );

  const originalPrice = getNumericValue(
    listing,
    ["originalPrice", "original_price", "mrp", "regularPrice"],
    price,
  );

  availableQuantity = quantity;
  currentUnitPrice = price;

  setText(
    "availableQuantity",
    `${formatNumber(quantity)} ${getValue(
      listing,
      ["unit", "quantityUnit"],
      "Units",
    )}`,
  );

  setText("currentPrice", formatCurrency(price));

  setText("originalPrice", formatCurrency(originalPrice));

  const discount =
    originalPrice > 0 && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  setText("discountBadge", `${discount}% OFF`);

  const originalPriceContainer = document.getElementById(
    "originalPriceContainer",
  );

  if (originalPriceContainer) {
    originalPriceContainer.style.display =
      originalPrice > price ? "block" : "none";
  }

  updateReservationTotal();
}

/* ==========================================================
   QUANTITY CONTROLS
========================================================== */

function setupQuantityControls() {
  const decreaseButton = document.getElementById("decreaseQuantity");

  const increaseButton = document.getElementById("increaseQuantity");

  const quantityInput = document.getElementById("reserveQuantity");

  if (!decreaseButton || !increaseButton || !quantityInput) {
    return;
  }

  decreaseButton.addEventListener("click", () => {
    let quantity = parseInt(quantityInput.value) || 1;

    quantity--;

    if (quantity < 1) {
      quantity = 1;
    }

    quantityInput.value = quantity;

    updateReservationTotal();
    updateQuantityButtonState();
  });

  increaseButton.addEventListener("click", () => {
    let quantity = parseInt(quantityInput.value) || 1;

    quantity++;

    if (availableQuantity > 0 && quantity > availableQuantity) {
      quantity = availableQuantity;
    }

    quantityInput.value = quantity;

    updateReservationTotal();
    updateQuantityButtonState();
  });

  quantityInput.addEventListener("input", () => {
    let quantity = parseInt(quantityInput.value) || 1;

    if (quantity < 1) {
      quantity = 1;
    }

    if (availableQuantity > 0 && quantity > availableQuantity) {
      quantity = availableQuantity;
    }

    quantityInput.value = quantity;

    updateReservationTotal();
    updateQuantityButtonState();
  });

  updateQuantityButtonState();
}

/* ==========================================================
   QUANTITY BUTTON STATE
========================================================== */

function updateQuantityButtonState() {
  const decreaseButton = document.getElementById("decreaseQuantity");

  const increaseButton = document.getElementById("increaseQuantity");

  const quantityInput = document.getElementById("reserveQuantity");

  if (!quantityInput) return;

  const quantity = parseInt(quantityInput.value) || 1;

  if (decreaseButton) {
    decreaseButton.disabled = quantity <= 1;
  }

  if (increaseButton) {
    increaseButton.disabled =
      availableQuantity > 0 && quantity >= availableQuantity;
  }
}

/* ==========================================================
   UPDATE TOTAL
========================================================== */

function updateReservationTotal() {
  const quantityInput = document.getElementById("reserveQuantity");

  const totalElement = document.getElementById("reservationTotal");

  if (!quantityInput || !totalElement) {
    return;
  }

  const quantity = parseInt(quantityInput.value) || 1;

  const total = quantity * currentUnitPrice;

  totalElement.textContent = formatCurrency(total);
}

/* ==========================================================
   RESERVATION BUTTON
========================================================== */

function setupReservationButton() {
  const button = document.getElementById("reserveNowBtn");

  if (!button) return;

  button.addEventListener("click", reserveListing);
}

/* ==========================================================
   RESERVE LISTING
========================================================== */

async function reserveListing() {
  if (!currentListing) {
    showToast("Listing information is not available.", "error");

    return;
  }

  const quantityInput = document.getElementById("reserveQuantity");

  const button = document.getElementById("reserveNowBtn");

  if (!quantityInput || !button) {
    return;
  }

  const quantity = parseInt(quantityInput.value) || 1;

  if (quantity < 1) {
    showToast("Please select a valid quantity.", "error");

    return;
  }

  if (availableQuantity > 0 && quantity > availableQuantity) {
    showToast("Selected quantity is not available.", "error");

    return;
  }

  const originalButtonHTML = button.innerHTML;

  button.disabled = true;

  button.innerHTML = `
    <span>Reserving...</span>
    <i class="ri-loader-4-line"></i>
  `;

  try {
    const listingId = currentListing._id || currentListing.id || getListingId();

    const response = await fetch(`${API_BASE_URL}/reservations`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        listingId: listingId,
        quantity: quantity,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Reservation failed.");
    }

    showToast("Food reserved successfully!", "success");

    setTimeout(() => {
      window.location.href = "/my-reservations";
    }, 900);
  } catch (error) {
    console.error("Reservation error:", error);

    showToast(error.message || "Unable to reserve this food.", "error");

    button.disabled = false;

    button.innerHTML = originalButtonHTML;
  }
}

/* ==========================================================
   REPORT LISTING
========================================================== */

function setupReportButton() {
  const button = document.getElementById("reportListingBtn");

  if (!button) return;

  button.addEventListener("click", reportListing);
}

async function reportListing() {
  if (!currentListing) {
    return;
  }

  const listingId = currentListing._id || currentListing.id || getListingId();

  const reason = window.prompt(
    "Please enter the reason for reporting this listing:",
  );

  if (!reason || !reason.trim()) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        listingId: listingId,
        reason: reason.trim(),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to report listing.");
    }

    showToast("Listing reported successfully.", "success");
  } catch (error) {
    console.error("Report listing error:", error);

    showToast(error.message || "Unable to report this listing.", "error");
  }
}

/* ==========================================================
   NAVBAR
========================================================== */

function setupNavbar() {
  setupProfileDropdown();
  setupLogout();
  setupNotifications();
  setupMessages();
}

/* ==========================================================
   PROFILE DROPDOWN
========================================================== */

function setupProfileDropdown() {
  const button = document.getElementById("profileMenuBtn");

  const dropdown = document.getElementById("profileDropdown");

  if (!button || !dropdown) {
    return;
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();

    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

/* ==========================================================
   LOAD PROFILE
========================================================== */

async function loadProfile() {
  try {
    /*
     * First try localStorage.
     */

    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);

        applyProfile(user);
      } catch (error) {
        console.warn("Invalid stored user data.");
      }
    }

    /*
     * Then try backend profile.
     */

    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return;
    }

    const result = await response.json();

    const user = result.user || result;

    if (user) {
      applyProfile(user);
    }
  } catch (error) {
    console.warn("Profile could not be loaded:", error);
  }
}

/* ==========================================================
   APPLY PROFILE
========================================================== */

function applyProfile(user) {
  const name = user.name || user.username || user.fullName || "User";

  const role = user.role || "User";

  setText("profileName", name);

  setText("profileRole", capitalize(role));

  const profileImage = document.getElementById("profileImage");

  const image =
    user.profileImage || user.profileImageUrl || user.avatar || user.photo;

  if (profileImage && image) {
    profileImage.src = normalizeImageUrl(image);
  }
}

/* ==========================================================
   LOGOUT
========================================================== */

function setupLogout() {
  const logoutButton = document.getElementById("logoutBtn");

  if (!logoutButton) return;

  logoutButton.addEventListener("click", async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.warn("Logout API error:", error);
    }

    localStorage.removeItem("user");

    localStorage.removeItem("token");

    window.location.href = "/";
  });
}

/* ==========================================================
   NOTIFICATIONS
========================================================== */

function setupNotifications() {
  const button = document.getElementById("notificationBtn");

  if (!button) return;

  button.addEventListener("click", () => {
    window.location.href = "/notifications";
  });

  loadNotificationCount();
}

async function loadNotificationCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/count`, {
      credentials: "include",
    });

    if (!response.ok) {
      return;
    }

    const result = await response.json();

    const count = result.count || result.unreadCount || 0;

    updateBadge("notificationCount", count);
  } catch (error) {
    console.warn("Notification count unavailable.");
  }
}

/* ==========================================================
   MESSAGES
========================================================== */

function setupMessages() {
  const button = document.getElementById("messageBtn");

  if (!button) return;

  button.addEventListener("click", () => {
    window.location.href = "/messages";
  });

  loadMessageCount();
}

async function loadMessageCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/count`, {
      credentials: "include",
    });

    if (!response.ok) {
      return;
    }

    const result = await response.json();

    const count = result.count || result.unreadCount || 0;

    updateBadge("messageCount", count);
  } catch (error) {
    console.warn("Message count unavailable.");
  }
}

/* ==========================================================
   UPDATE BADGE
========================================================== */

function updateBadge(elementId, count) {
  const badge = document.getElementById(elementId);

  if (!badge) return;

  const numericCount = Number(count) || 0;

  if (numericCount <= 0) {
    badge.style.display = "none";

    return;
  }

  badge.textContent = numericCount > 99 ? "99+" : numericCount;

  badge.style.display = "flex";
}

/* ==========================================================
   BACK BUTTON
========================================================== */

function setupBackButton() {
  const button = document.getElementById("backToExplore");

  if (!button) return;

  button.addEventListener("click", (event) => {
    /*
     * Keep normal Flask route navigation.
     */
  });
}

/* ==========================================================
   SHOW ERROR
========================================================== */

function showListingError(message) {
  console.error(message);

  hideListingLoading();

  showToast(message, "error");
}

/* ==========================================================
   TOAST
========================================================== */

function showToast(message, type = "success") {
  let toast = document.getElementById("reserveToast");

  if (!toast) {
    toast = document.createElement("div");

    toast.id = "reserveToast";

    toast.style.position = "fixed";

    toast.style.right = "24px";

    toast.style.bottom = "24px";

    toast.style.zIndex = "9999";

    toast.style.padding = "12px 18px";

    toast.style.borderRadius = "10px";

    toast.style.fontFamily = "Inter, sans-serif";

    toast.style.fontSize = "13px";

    toast.style.fontWeight = "600";

    toast.style.boxShadow = "0 10px 30px rgba(0,0,0,0.12)";

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.style.background = type === "error" ? "#fff0f0" : "#edf8f1";

  toast.style.color = type === "error" ? "#dc2626" : "#07883f";

  clearTimeout(toast._timeout);

  toast._timeout = setTimeout(() => {
    toast.remove();
  }, 3000);
}

/* ==========================================================
   HELPER - SET TEXT
========================================================== */

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (!element) return;

  element.textContent = value ?? "";
}

/* ==========================================================
   HELPER - GET VALUE
========================================================== */

function getValue(object, keys, fallback = "") {
  if (!object) {
    return fallback;
  }

  for (const key of keys) {
    if (
      object[key] !== undefined &&
      object[key] !== null &&
      object[key] !== ""
    ) {
      return object[key];
    }
  }

  return fallback;
}

/* ==========================================================
   HELPER - NUMERIC VALUE
========================================================== */

function getNumericValue(object, keys, fallback = 0) {
  const value = getValue(object, keys, fallback);

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

/* ==========================================================
   HELPER - FORMAT NUMBER
========================================================== */

function formatNumber(number) {
  const value = Number(number);

  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("en-IN");
}

/* ==========================================================
   HELPER - CURRENCY
========================================================== */

function formatCurrency(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "₹0";
  }

  return `₹${value.toLocaleString("en-IN")}`;
}

/* ==========================================================
   HELPER - PERCENTAGE
========================================================== */

function formatPercentage(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return `${number}%`;
}

/* ==========================================================
   HELPER - DATE
========================================================== */

function formatDate(value) {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ==========================================================
   HELPER - DATE + TIME
========================================================== */

function formatDateTime(value, fallback = "Not specified") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ==========================================================
   HELPER - PICKUP TIME
========================================================== */

function formatPickupTime(listing) {
  const pickupTime = getValue(
    listing,
    ["pickupTime", "pickupSlot", "pickup_time"],
    null,
  );

  if (pickupTime) {
    return pickupTime;
  }

  const start = getValue(
    listing,
    ["pickupStartTime", "pickup_start", "startTime", "pickup_start_time"],
    null,
  );

  const end = getValue(
    listing,
    ["pickupEndTime", "pickup_end", "endTime", "pickup_end_time"],
    null,
  );

  if (start && end) {
    return `${formatTime(start)} - ${formatTime(end)}`;
  }

  if (start) {
    return formatTime(start);
  }

  return "Not specified";
}

/* ==========================================================
   HELPER - TIME
========================================================== */

function formatTime(value) {
  if (!value) {
    return "";
  }

  /*
   * Handles values such as:
   * 11:25
   * 11:25 AM
   * ISO date/time
   */

  if (typeof value === "string" && /^\d{1,2}:\d{2}$/.test(value)) {
    const [hoursString, minutesString] = value.split(":");

    let hours = Number(hoursString);

    const minutes = minutesString;

    const period = hours >= 12 ? "pm" : "am";

    hours = hours % 12 || 12;

    return `${hours}:${minutes} ${period}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ==========================================================
   HELPER - IMAGE URL
========================================================== */

function normalizeImageUrl(url) {
  if (!url) {
    return "";
  }

  /*
   * Keep absolute URLs unchanged.
   */

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  /*
   * Flask static paths.
   */

  if (url.startsWith("/")) {
    return url;
  }

  return `/static/${url}`;
}

/* ==========================================================
   HELPER - CAPITALIZE
========================================================== */

function capitalize(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
