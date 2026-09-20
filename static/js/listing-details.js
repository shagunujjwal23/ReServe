/* ==========================================================
   ReServe - Individual Listing Details + Reservation
   listing-details.js
========================================================== */

const API_BASE_URL = "/api";

/* ==========================================================
   GLOBAL STATE
========================================================== */

let currentListing = null;

let availableQuantity = 0;
let currentUnitPrice = 0;

let selectedSlot = null;
let selectedPickupDate = null;

let communitySupport = 0;

/* ==========================================================
   PLATFORM FEE
========================================================== */

const PLATFORM_FEE_RATE = 0.05;
const MAX_PLATFORM_FEE = 20;

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
    setupInstructions();
    setupCommunitySupport();

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
  const pathParts = window.location.pathname.split("/").filter(Boolean);

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

  if (!listingId) {
    hideListingLoading();
    showListingError("Invalid listing.");
    return;
  }

  const loadingElement = document.getElementById("listingLoading");

  if (loadingElement) {
    loadingElement.classList.remove("hidden");
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/listings/${encodeURIComponent(listingId)}`,
      {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      },
    );

    let result = {};

    try {
      result = await response.json();
    } catch {
      throw new Error("Invalid server response.");
    }

    if (!response.ok) {
      throw new Error(
        result.message || `Failed to load listing. Status: ${response.status}`,
      );
    }

    currentListing = result.listing || result;

    if (!currentListing) {
      throw new Error("Listing data not found.");
    }

    console.log("Listing Loaded:", JSON.stringify(currentListing, null, 2));

    renderListing(currentListing);

    hideListingLoading();
  } catch (error) {
    console.error("Load listing error:", error);

    hideListingLoading();

    showListingError(error.message || "Unable to load this food listing.");
  }
}

/* ==========================================================
   HIDE LOADING
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
  const foodTitle = getValue(
    listing,
    ["food_title", "foodName", "food_name", "name", "title"],
    "Food Listing",
  );

  const shortDescription = getValue(
    listing,
    ["shortDescription", "short_description", "summary", "description"],
    "Loading food details...",
  );

  const providerName = getValue(
    listing,
    ["provider_name", "providerName", "ownerName", "sellerName"],
    "Food Provider",
  );

  const category = getValue(listing, ["category", "foodCategory"], "Food");

  const foodType = getValue(
    listing,
    ["food_type", "foodType", "type"],
    "Vegetarian",
  );
  /* ==========================================================
   ReServe - Individual Listing Details + Reservation
   listing-details.js
========================================================== */

  const API_BASE_URL = "/api";

  /* ==========================================================
   GLOBAL STATE
========================================================== */

  let currentListing = null;

  let availableQuantity = 0;
  let currentUnitPrice = 0;

  let selectedSlot = null;
  let selectedPickupDate = null;

  let communitySupport = 0;

  /* ==========================================================
   PLATFORM FEE
========================================================== */

  const PLATFORM_FEE_RATE = 0.05;
  const MAX_PLATFORM_FEE = 20;

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
      setupInstructions();
      setupCommunitySupport();

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
    const pathParts = window.location.pathname.split("/").filter(Boolean);

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

    if (!listingId) {
      hideListingLoading();
      showListingError("Invalid listing.");
      return;
    }

    const loadingElement = document.getElementById("listingLoading");

    if (loadingElement) {
      loadingElement.classList.remove("hidden");
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/listings/${encodeURIComponent(listingId)}`,
        {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
        },
      );

      let result = {};

      try {
        result = await response.json();
      } catch {
        throw new Error("Invalid server response.");
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Failed to load listing. Status: ${response.status}`,
        );
      }

      currentListing = result.listing || result;

      if (!currentListing) {
        throw new Error("Listing data not found.");
      }

      console.log("Listing Loaded:", JSON.stringify(currentListing, null, 2));

      renderListing(currentListing);

      hideListingLoading();
    } catch (error) {
      console.error("Load listing error:", error);

      hideListingLoading();

      showListingError(error.message || "Unable to load this food listing.");
    }
  }

  /* ==========================================================
   HIDE LOADING
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
    const foodTitle = getValue(
      listing,
      ["food_title", "foodName", "food_name", "name", "title"],
      "Food Listing",
    );

    const shortDescription = getValue(
      listing,
      ["shortDescription", "short_description", "summary", "description"],
      "Loading food details...",
    );

    const providerName = getValue(
      listing,
      ["provider_name", "providerName", "ownerName", "sellerName"],
      "Food Provider",
    );

    const category = getValue(listing, ["category", "foodCategory"], "Food");

    const foodType = getValue(
      listing,
      ["food_type", "foodType", "type"],
      "Vegetarian",
    );

    const area = getValue(listing, ["area", "pickup_area"], "");

    const city = getValue(listing, ["city", "pickupCity"], "");

    let location = "";

    if (area && city) {
      location = `${area}, ${city}`;
    } else {
      location = area || city || "Location unavailable";
    }

    setText("listingFoodTitle", foodTitle);

    setText("listingShortDescription", shortDescription);

    setText("providerName", providerName);

    setText("providerCardName", providerName);

    setText("listingCategory", category);

    setText("listingFoodType", foodType);

    setText("foodTypeText", foodType);

    setText("listingLocation", location);

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

    setText("listingPickupTime", getPickupWindowText(listing));

    const quantity = getNumericValue(
      listing,
      ["quantity", "availableQuantity", "units"],
      0,
    );

    const unit = getValue(listing, ["unit", "quantityUnit"], "Units");

    setText("listingQuantity", `${formatNumber(quantity)} ${unit}`);

    availableQuantity = quantity;
  }

  /* ==========================================================
   FOOD IMAGE
========================================================== */

  function renderFoodImage(listing) {
    const image = document.getElementById("listingMainImage");
    const placeholder = document.getElementById("mainImagePlaceholder");

    if (!image) {
      return;
    }

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
    const address = getValue(listing, ["address", "pickupAddress"], "");

    const area = getValue(listing, ["area", "pickup_area"], "");

    const city = getValue(listing, ["city", "pickupCity"], "");

    let fullAddress = address;

    if (area && !fullAddress.toLowerCase().includes(area.toLowerCase())) {
      fullAddress += fullAddress ? `, ${area}` : area;
    }

    if (city && !fullAddress.toLowerCase().includes(city.toLowerCase())) {
      fullAddress += fullAddress ? `, ${city}` : city;
    }

    setText("pickupAddress", fullAddress || "Address unavailable");

    /* --------------------------------------------------------
     PROVIDER INSTRUCTIONS
  -------------------------------------------------------- */

    const providerInstructions = getValue(
      listing,
      [
        "pickup_instructions",
        "pickupInstructions",
        "providerInstructions",
        "instructions",
      ],
      "",
    );

    setText(
      "pickupInstructions",
      providerInstructions || "No special instructions.",
    );

    /* --------------------------------------------------------
     DESCRIPTION
  -------------------------------------------------------- */

    setText(
      "listingDescription",
      getValue(
        listing,
        ["description", "fullDescription"],
        "No description available.",
      ),
    );

    /* --------------------------------------------------------
     PICKUP DATE + TIME
  -------------------------------------------------------- */

    initializePickupDateTime();
  }

  /* ==========================================================
   PROVIDER INFORMATION
========================================================== */

  function renderProviderInformation(listing) {
    const providerName = getValue(
      listing,
      ["provider_name", "providerName", "ownerName", "sellerName"],
      "Food Provider",
    );

    setText("providerName", providerName);

    setText("providerCardName", providerName);

    const providerRating = getValue(
      listing,
      ["providerRating", "rating"],
      null,
    );

    if (providerRating !== null) {
      setText("providerRating", providerRating);
    }

    const reviews = getNumericValue(
      listing,
      ["providerReviews", "reviews", "reviewCount"],
      0,
    );

    setText("providerReviews", `(${formatNumber(reviews)} reviews)`);

    setText(
      "providerMessage",
      getValue(
        listing,
        ["providerMessage", "providerBio", "message"],
        "We believe in sharing surplus food and making a positive impact in the community.",
      ),
    );

    const providerVerified = document.getElementById("providerVerified");

    if (providerVerified) {
      const verified =
        listing.provider_verified ?? listing.providerVerified ?? true;

      providerVerified.style.display = verified ? "inline-block" : "none";
    }
  }

  /* ==========================================================
   AI INFORMATION
========================================================== */

  function renderAIInformation(listing) {
    const aiResult =
      listing?.aiResult ||
      listing?.ai ||
      listing?.aiAnalysis ||
      listing?.aiVerified ||
      listing;

    /* --------------------------------------------------------
     FRESHNESS
  -------------------------------------------------------- */

    const freshnessScore =
      aiResult?.insights?.find(
        (item) => item.title?.toLowerCase() === "freshness",
      )?.score ??
      aiResult?.freshnessScore ??
      aiResult?.freshness_score ??
      aiResult?.freshness ??
      null;

    setText(
      "aiFreshnessScore",
      freshnessScore !== null ? `${Number(freshnessScore)}%` : "—",
    );

    /* --------------------------------------------------------
     RECOVERY
  -------------------------------------------------------- */

    const recoveryProbability =
      aiResult?.confidence?.recovery ??
      aiResult?.recoveryProbability ??
      aiResult?.recovery_probability ??
      aiResult?.recoveryScore ??
      null;

    setText(
      "aiRecoveryProbability",
      recoveryProbability !== null ? `${Number(recoveryProbability)}%` : "—",
    );

    /* --------------------------------------------------------
     CARBON
  -------------------------------------------------------- */

    const carbonSaved =
      aiResult?.metrics?.carbon ??
      aiResult?.carbonSaved ??
      aiResult?.carbon_saved ??
      aiResult?.carbonSavings ??
      null;

    setText(
      "aiCarbonSaved",
      carbonSaved !== null ? `${Number(carbonSaved)} kg` : "—",
    );

    /* --------------------------------------------------------
     AI VERIFICATION
  -------------------------------------------------------- */

    const verificationElement = document.getElementById("aiRecommendation");

    if (verificationElement) {
      verificationElement.textContent = "Verified listing • AI analyzed";
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
      ["discounted_price", "discountedPrice", "price", "sellingPrice"],
      0,
    );

    const originalPrice = getNumericValue(
      listing,
      ["original_price", "originalPrice", "mrp", "regularPrice"],
      price,
    );

    const unit = getValue(listing, ["unit", "quantityUnit"], "Units");

    availableQuantity = quantity;
    currentUnitPrice = price;

    setText("availableQuantity", formatNumber(quantity));

    setText("reserveUnitLabel", unit);

    setText("currentPrice", formatCurrency(price));

    setText("originalPrice", formatCurrency(originalPrice));

    const discount =
      originalPrice > 0 && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    setText("discountBadge", `${discount}% OFF`);

    updatePriceVisibility(originalPrice, price);

    updateReservationTotal();
    updateQuantityButtonState();
  }

  /* ==========================================================
   ORIGINAL PRICE VISIBILITY
========================================================== */

  function updatePriceVisibility(originalPrice, currentPrice) {
    const originalPriceElement = document.getElementById("originalPrice");

    if (!originalPriceElement) {
      return;
    }

    if (originalPrice > currentPrice && originalPrice > 0) {
      originalPriceElement.style.display = "inline";
    } else {
      originalPriceElement.style.display = "none";
    }
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

    if (!quantityInput) {
      return;
    }

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
   UPDATE RESERVATION TOTAL
========================================================== */

  function updateReservationTotal() {
    const quantityInput = document.getElementById("reserveQuantity");

    if (!quantityInput) {
      return;
    }

    const quantity = parseInt(quantityInput.value) || 1;

    const subtotal = quantity * currentUnitPrice;

    const platformFee = Math.min(
      subtotal * PLATFORM_FEE_RATE,
      MAX_PLATFORM_FEE,
    );

    const total = subtotal + platformFee + communitySupport;

    setText("summaryQuantity", quantity);

    setText("subtotalAmount", formatCurrency(subtotal));

    setText("platformFee", formatCurrency(platformFee));

    setText("communitySupport", formatCurrency(communitySupport));

    setText("totalAmount", formatCurrency(total));
  }

  /* ==========================================================
   RESERVATION BUTTON
========================================================== */

  function setupReservationButton() {
    const button = document.getElementById("reserveNowBtn");

    if (!button) {
      return;
    }

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

    const button = document.getElementById("reserveNowBtn");

    const quantityInput = document.getElementById("reserveQuantity");

    const instructions = document.getElementById("instructions");

    if (!button || !quantityInput) {
      return;
    }

    const quantity = parseInt(quantityInput.value) || 1;

    /* --------------------------------------------------------
     QUANTITY VALIDATION
  -------------------------------------------------------- */

    if (quantity < 1) {
      showToast("Please select a valid quantity.", "error");
      return;
    }

    if (availableQuantity > 0 && quantity > availableQuantity) {
      showToast(`Only ${availableQuantity} units are available.`, "error");
      return;
    }

    /* --------------------------------------------------------
     DATE VALIDATION
  -------------------------------------------------------- */

    if (!selectedPickupDate) {
      showToast("Please select a pickup date.", "error");

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
     TIME VALIDATION
  -------------------------------------------------------- */

    if (!selectedSlot) {
      showToast("Please select a pickup time.", "error");

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

    const listingId = currentListing._id || currentListing.id || getListingId();

    if (!listingId) {
      showToast("Listing information is not available.", "error");
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
      const response = await fetch(`${API_BASE_URL}/orders/place`, {
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
      } catch {
        throw new Error("Invalid response from server.");
      }

      console.log("Reservation Response:", result);

      if (!response.ok) {
        throw new Error(result.message || "Unable to reserve food.");
      }

      if (result.success === false) {
        throw new Error(result.message || "Reservation failed.");
      }

      showToast(
        result.message || "Reservation request sent successfully.",
        "success",
      );

      /* ------------------------------------------------------
       REDIRECT AFTER SUCCESS
    ------------------------------------------------------ */

      setTimeout(() => {
        window.location.href = "/my-reservations";
      }, 1500);
    } catch (error) {
      console.error("Reservation error:", error);

      showToast(error.message || "Unable to place reservation.", "error");

      button.disabled = false;

      button.innerHTML = originalButtonHTML;
    }
  }

  /* ==========================================================
   PICKUP DATE + TIME
========================================================== */

  function initializePickupDateTime() {
    const dateSelect = document.getElementById("pickupDate");

    const timeSelect = document.getElementById("pickupTime");

    if (!dateSelect || !timeSelect || !currentListing) {
      return;
    }

    const pickupStart = parseDate(currentListing.pickup_start);

    const pickupEnd = parseDate(currentListing.pickup_end);

    if (!pickupStart || !pickupEnd || pickupEnd <= pickupStart) {
      dateSelect.innerHTML = `
      <option value="">
        Pickup date unavailable
      </option>
    `;

      timeSelect.innerHTML = `
      <option value="">
        Pickup time unavailable
      </option>
    `;

      selectedPickupDate = null;
      selectedSlot = null;

      return;
    }

    populatePickupDates(pickupStart, pickupEnd, dateSelect, timeSelect);

    dateSelect.onchange = () => {
      selectedPickupDate = dateSelect.value || null;

      selectedSlot = null;

      populatePickupTimesForDate(
        selectedPickupDate,
        pickupStart,
        pickupEnd,
        timeSelect,
      );

      updatePickupWindowDisplay();
    };
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
    <option value="">
      Select a pickup date first
    </option>
  `;

    selectedPickupDate = null;
    selectedSlot = null;

    updatePickupWindowDisplay();
  }

  /* ==========================================================
   GENERATE TIME SLOTS
========================================================== */

  function populatePickupTimesForDate(
    selectedDate,
    pickupStart,
    pickupEnd,
    timeSelect,
  ) {
    timeSelect.innerHTML = "";

    const defaultOption = document.createElement("option");

    defaultOption.value = "";

    defaultOption.textContent = "Select a pickup time";

    defaultOption.selected = true;

    timeSelect.appendChild(defaultOption);

    selectedSlot = null;

    if (!selectedDate) {
      defaultOption.textContent = "Select a pickup date first";

      return;
    }

    const selectedDayStart = new Date(`${selectedDate}T00:00:00`);

    const selectedDayEnd = new Date(`${selectedDate}T23:59:59`);

    let slotStart =
      pickupStart > selectedDayStart
        ? new Date(pickupStart)
        : new Date(selectedDayStart);

    let slotEnd =
      pickupEnd < selectedDayEnd
        ? new Date(pickupEnd)
        : new Date(selectedDayEnd);

    if (slotStart >= slotEnd) {
      defaultOption.textContent = "No pickup time available";

      return;
    }

    /*
     * Generate 1-hour slots.
     */

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

    timeSelect.onchange = () => {
      selectedSlot = timeSelect.value || null;

      updatePickupWindowDisplay();

      console.log("Selected pickup date:", selectedPickupDate);

      console.log("Selected pickup time:", selectedSlot);
    };
  }

  /* ==========================================================
   UPDATE PICKUP WINDOW TEXT
========================================================== */

  function updatePickupWindowDisplay() {
    const element = document.getElementById("listingPickupTime");

    if (!element) {
      return;
    }

    if (selectedPickupDate && selectedSlot) {
      const dateText = formatDisplayDateFromKey(selectedPickupDate);

      element.textContent = `${dateText} • ${selectedSlot}`;
    } else {
      element.textContent = "Select date & time below";
    }
  }

  /* ==========================================================
   GET ORIGINAL PICKUP WINDOW
========================================================== */

  function getPickupWindowText(listing) {
    const start = getValue(
      listing,
      ["pickup_start", "pickupStart", "pickupStartTime"],
      null,
    );

    const end = getValue(
      listing,
      ["pickup_end", "pickupEnd", "pickupEndTime"],
      null,
    );

    if (!start || !end) {
      return "Select date & time below";
    }

    const startDate = parseDate(start);

    const endDate = parseDate(end);

    if (!startDate || !endDate) {
      return "Select date & time below";
    }

    if (formatDateKey(startDate) === formatDateKey(endDate)) {
      return `${formatTime(startDate)} - ${formatTime(endDate)}`;
    }

    return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
  }

  /* ==========================================================
   DATE KEY
========================================================== */

  function formatDateKey(date) {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /* ==========================================================
   DISPLAY DATE
========================================================== */

  function formatDisplayDate(date) {
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  /* ==========================================================
   DISPLAY DATE FROM KEY
========================================================== */

  function formatDisplayDateFromKey(dateKey) {
    if (!dateKey) {
      return "";
    }

    const date = new Date(`${dateKey}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return dateKey;
    }

    return formatDisplayDate(date);
  }

  /* ==========================================================
   DATE PARSER
========================================================== */

  function parseDate(value) {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  /* ==========================================================
   TIME FORMATTER
========================================================== */

  function formatTime(value) {
    if (!value) {
      return "";
    }

    const date = value instanceof Date ? value : parseDate(value);

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
   DATE FORMATTER
========================================================== */

  function formatDate(value) {
    if (!value) {
      return "Not specified";
    }

    const date = parseDate(value);

    if (!date) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /* ==========================================================
   DATE + TIME FORMATTER
========================================================== */

  function formatDateTime(value, fallback = "Not specified") {
    if (!value) {
      return fallback;
    }

    const date = parseDate(value);

    if (!date) {
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
   MAP
========================================================== */

  function initializeMapButton() {
    const button = document.getElementById("viewMapBtn");

    if (!button) {
      return;
    }

    button.onclick = () => {
      if (!currentListing) {
        return;
      }

      const address = [
        currentListing.address,
        currentListing.area,
        currentListing.city,
        currentListing.state,
        currentListing.pincode,
      ]
        .filter(Boolean)
        .join(", ");

      if (!address) {
        showToast("Pickup location is unavailable.", "error");
        return;
      }

      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

      window.open(mapUrl, "_blank", "noopener,noreferrer");
    };
  }

  /* ==========================================================
   INSTRUCTIONS
========================================================== */

  function setupInstructions() {
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
   COMMUNITY SUPPORT
========================================================== */

  function setupCommunitySupport() {
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
        const amount = Number(option.dataset.support) || 0;

        const alreadySelected = option.classList.contains("active");

        options.forEach((item) => {
          item.classList.remove("active");
        });

        customButton?.classList.remove("active");

        customInputBox?.classList.add("hidden");

        if (customInput) {
          customInput.value = "";
        }

        if (alreadySelected) {
          communitySupport = 0;
        } else {
          option.classList.add("active");

          communitySupport = amount;
        }

        updateReservationTotal();
      });
    });

    /* --------------------------------------------------------
     CUSTOM BUTTON
  -------------------------------------------------------- */

    if (customButton) {
      customButton.addEventListener("click", () => {
        const alreadyActive = customButton.classList.contains("active");

        options.forEach((item) => {
          item.classList.remove("active");
        });

        if (alreadyActive) {
          customButton.classList.remove("active");

          customInputBox?.classList.add("hidden");

          if (customInput) {
            customInput.value = "";
          }

          communitySupport = 0;

          updateReservationTotal();

          return;
        }

        customButton.classList.add("active");

        customInputBox?.classList.remove("hidden");

        setTimeout(() => {
          customInput?.focus();
        }, 50);
      });
    }

    /* --------------------------------------------------------
     APPLY CUSTOM
  -------------------------------------------------------- */

    if (applyCustomButton) {
      applyCustomButton.addEventListener("click", () => {
        const amount = Number(customInput?.value);

        if (!Number.isFinite(amount)) {
          showToast("Please enter a contribution amount.", "error");

          customInput?.focus();

          return;
        }

        if (amount < 5) {
          showToast("Minimum custom contribution is ₹5.", "error");

          customInput?.focus();

          return;
        }

        if (amount > 500) {
          showToast("Maximum custom contribution is ₹500.", "error");

          customInput?.focus();

          return;
        }

        communitySupport = Math.floor(amount);

        customButton?.classList.add("active");

        updateReservationTotal();
      });
    }

    /* --------------------------------------------------------
     ENTER KEY
  -------------------------------------------------------- */

    customInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();

        applyCustomButton?.click();
      }
    });
  }

  /* ==========================================================
   REPORT LISTING
========================================================== */

  function setupReportButton() {
    const button = document.getElementById("reportListingBtn");

    if (!button) {
      return;
    }

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

        credentials: "same-origin",

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
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);

          applyProfile(user);
        } catch {
          console.warn("Invalid stored user data.");
        }
      }

      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json();

      const user = result.user || result.profile || result;

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

    if (!logoutButton) {
      return;
    }

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

      window.location.href = "/login";
    });
  }

  /* ==========================================================
   NOTIFICATIONS
========================================================== */

  function setupNotifications() {
    const button = document.getElementById("notificationBtn");

    if (!button) {
      return;
    }

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
    } catch {
      console.warn("Notification count unavailable.");
    }
  }

  /* ==========================================================
   MESSAGES
========================================================== */

  function setupMessages() {
    const button = document.getElementById("messageBtn");

    if (!button) {
      return;
    }

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
    } catch {
      console.warn("Message count unavailable.");
    }
  }

  /* ==========================================================
   BADGE
========================================================== */

  function updateBadge(elementId, count) {
    const badge = document.getElementById(elementId);

    if (!badge) {
      return;
    }

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

    if (!button) {
      return;
    }

    button.href = "/explore-food";
  }

  /* ==========================================================
   ERROR
========================================================== */

  function showListingError(message) {
    console.error(message);

    hideListingLoading();

    const error = document.getElementById("listingError");

    const messageElement = document.getElementById("listingErrorMessage");

    if (messageElement) {
      messageElement.textContent = message;
    }

    if (error) {
      error.classList.remove("hidden");
    }

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
   SET TEXT
========================================================== */

  function setText(elementId, value) {
    const element = document.getElementById(elementId);

    if (!element) {
      return;
    }

    element.textContent = value ?? "";
  }

  /* ==========================================================
   GET VALUE
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
   NUMERIC VALUE
========================================================== */

  function getNumericValue(object, keys, fallback = 0) {
    const value = getValue(object, keys, fallback);

    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
  }

  /* ==========================================================
   FORMAT NUMBER
========================================================== */

  function formatNumber(number) {
    const value = Number(number);

    if (!Number.isFinite(value)) {
      return "0";
    }

    return value.toLocaleString("en-IN");
  }

  /* ==========================================================
   CURRENCY
========================================================== */

  function formatCurrency(amount) {
    const value = Number(amount);

    if (!Number.isFinite(value)) {
      return "₹0";
    }

    return `₹${value.toLocaleString("en-IN")}`;
  }

  /* ==========================================================
   IMAGE URL
========================================================== */

  function normalizeImageUrl(url) {
    if (!url) {
      return "";
    }

    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:")
    ) {
      return url;
    }

    if (url.startsWith("/")) {
      return url;
    }

    return `/static/${url}`;
  }

  /* ==========================================================
   CAPITALIZE
========================================================== */

  function capitalize(value) {
    if (!value) {
      return "";
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  const area = getValue(listing, ["area", "pickup_area"], "");

  const city = getValue(listing, ["city", "pickupCity"], "");

  let location = "";

  if (area && city) {
    location = `${area}, ${city}`;
  } else {
    location = area || city || "Location unavailable";
  }

  setText("listingFoodTitle", foodTitle);

  setText("listingShortDescription", shortDescription);

  setText("providerName", providerName);

  setText("providerCardName", providerName);

  setText("listingCategory", category);

  setText("listingFoodType", foodType);

  setText("foodTypeText", foodType);

  setText("listingLocation", location);

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

  setText("listingPickupTime", getPickupWindowText(listing));

  const quantity = getNumericValue(
    listing,
    ["quantity", "availableQuantity", "units"],
    0,
  );

  const unit = getValue(listing, ["unit", "quantityUnit"], "Units");

  setText("listingQuantity", `${formatNumber(quantity)} ${unit}`);

  availableQuantity = quantity;
}

/* ==========================================================
   FOOD IMAGE
========================================================== */

function renderFoodImage(listing) {
  const image = document.getElementById("listingMainImage");
  const placeholder = document.getElementById("mainImagePlaceholder");

  if (!image) {
    return;
  }

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
  const address = getValue(listing, ["address", "pickupAddress"], "");

  const area = getValue(listing, ["area", "pickup_area"], "");

  const city = getValue(listing, ["city", "pickupCity"], "");

  let fullAddress = address;

  if (area && !fullAddress.toLowerCase().includes(area.toLowerCase())) {
    fullAddress += fullAddress ? `, ${area}` : area;
  }

  if (city && !fullAddress.toLowerCase().includes(city.toLowerCase())) {
    fullAddress += fullAddress ? `, ${city}` : city;
  }

  setText("pickupAddress", fullAddress || "Address unavailable");

  /* --------------------------------------------------------
     PROVIDER INSTRUCTIONS
  -------------------------------------------------------- */

  const providerInstructions = getValue(
    listing,
    [
      "pickup_instructions",
      "pickupInstructions",
      "providerInstructions",
      "instructions",
    ],
    "",
  );

  setText(
    "pickupInstructions",
    providerInstructions || "No special instructions.",
  );

  /* --------------------------------------------------------
     DESCRIPTION
  -------------------------------------------------------- */

  setText(
    "listingDescription",
    getValue(
      listing,
      ["description", "fullDescription"],
      "No description available.",
    ),
  );

  /* --------------------------------------------------------
     PICKUP DATE + TIME
  -------------------------------------------------------- */

  initializePickupDateTime();
}

/* ==========================================================
   PROVIDER INFORMATION
========================================================== */

function renderProviderInformation(listing) {
  const providerName = getValue(
    listing,
    ["provider_name", "providerName", "ownerName", "sellerName"],
    "Food Provider",
  );

  setText("providerName", providerName);

  setText("providerCardName", providerName);

  const providerRating = getValue(listing, ["providerRating", "rating"], null);

  if (providerRating !== null) {
    setText("providerRating", providerRating);
  }

  const reviews = getNumericValue(
    listing,
    ["providerReviews", "reviews", "reviewCount"],
    0,
  );

  setText("providerReviews", `(${formatNumber(reviews)} reviews)`);

  setText(
    "providerMessage",
    getValue(
      listing,
      ["providerMessage", "providerBio", "message"],
      "We believe in sharing surplus food and making a positive impact in the community.",
    ),
  );

  const providerVerified = document.getElementById("providerVerified");

  if (providerVerified) {
    const verified =
      listing.provider_verified ?? listing.providerVerified ?? true;

    providerVerified.style.display = verified ? "inline-block" : "none";
  }
}

/* ==========================================================
   AI INFORMATION
========================================================== */

function renderAIInformation(listing) {
  const aiResult =
    listing?.aiResult ||
    listing?.ai ||
    listing?.aiAnalysis ||
    listing?.aiVerified ||
    listing;

  /* --------------------------------------------------------
     FRESHNESS
  -------------------------------------------------------- */

  const freshnessScore =
    aiResult?.insights?.find(
      (item) => item.title?.toLowerCase() === "freshness",
    )?.score ??
    aiResult?.freshnessScore ??
    aiResult?.freshness_score ??
    aiResult?.freshness ??
    null;

  setText(
    "aiFreshnessScore",
    freshnessScore !== null ? `${Number(freshnessScore)}%` : "—",
  );

  /* --------------------------------------------------------
     RECOVERY
  -------------------------------------------------------- */

  const recoveryProbability =
    aiResult?.confidence?.recovery ??
    aiResult?.recoveryProbability ??
    aiResult?.recovery_probability ??
    aiResult?.recoveryScore ??
    null;

  setText(
    "aiRecoveryProbability",
    recoveryProbability !== null ? `${Number(recoveryProbability)}%` : "—",
  );

  /* --------------------------------------------------------
     CARBON
  -------------------------------------------------------- */

  const carbonSaved =
    aiResult?.metrics?.carbon ??
    aiResult?.carbonSaved ??
    aiResult?.carbon_saved ??
    aiResult?.carbonSavings ??
    null;

  setText(
    "aiCarbonSaved",
    carbonSaved !== null ? `${Number(carbonSaved)} kg` : "—",
  );

  /* --------------------------------------------------------
     AI VERIFICATION
  -------------------------------------------------------- */

  const verificationElement = document.getElementById("aiRecommendation");

  if (verificationElement) {
    verificationElement.textContent = "Verified listing • AI analyzed";
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
    ["discounted_price", "discountedPrice", "price", "sellingPrice"],
    0,
  );

  const originalPrice = getNumericValue(
    listing,
    ["original_price", "originalPrice", "mrp", "regularPrice"],
    price,
  );

  const unit = getValue(listing, ["unit", "quantityUnit"], "Units");

  availableQuantity = quantity;
  currentUnitPrice = price;

  setText("availableQuantity", formatNumber(quantity));

  setText("reserveUnitLabel", unit);

  setText("currentPrice", formatCurrency(price));

  setText("originalPrice", formatCurrency(originalPrice));

  const discount =
    originalPrice > 0 && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  setText("discountBadge", `${discount}% OFF`);

  updatePriceVisibility(originalPrice, price);

  updateReservationTotal();
  updateQuantityButtonState();
}

/* ==========================================================
   ORIGINAL PRICE VISIBILITY
========================================================== */

function updatePriceVisibility(originalPrice, currentPrice) {
  const originalPriceElement = document.getElementById("originalPrice");

  if (!originalPriceElement) {
    return;
  }

  if (originalPrice > currentPrice && originalPrice > 0) {
    originalPriceElement.style.display = "inline";
  } else {
    originalPriceElement.style.display = "none";
  }
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

  if (!quantityInput) {
    return;
  }

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
   UPDATE RESERVATION TOTAL
========================================================== */

function updateReservationTotal() {
  const quantityInput = document.getElementById("reserveQuantity");

  if (!quantityInput) {
    return;
  }

  const quantity = parseInt(quantityInput.value) || 1;

  const subtotal = quantity * currentUnitPrice;

  const platformFee = Math.min(subtotal * PLATFORM_FEE_RATE, MAX_PLATFORM_FEE);

  const total = subtotal + platformFee + communitySupport;

  setText("summaryQuantity", quantity);

  setText("subtotalAmount", formatCurrency(subtotal));

  setText("platformFee", formatCurrency(platformFee));

  setText("communitySupport", formatCurrency(communitySupport));

  setText("totalAmount", formatCurrency(total));
}

/* ==========================================================
   RESERVATION BUTTON
========================================================== */

function setupReservationButton() {
  const button = document.getElementById("reserveNowBtn");

  if (!button) {
    return;
  }

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

  const button = document.getElementById("reserveNowBtn");

  const quantityInput = document.getElementById("reserveQuantity");

  const instructions = document.getElementById("instructions");

  if (!button || !quantityInput) {
    return;
  }

  const quantity = parseInt(quantityInput.value) || 1;

  /* --------------------------------------------------------
     QUANTITY VALIDATION
  -------------------------------------------------------- */

  if (quantity < 1) {
    showToast("Please select a valid quantity.", "error");
    return;
  }

  if (availableQuantity > 0 && quantity > availableQuantity) {
    showToast(`Only ${availableQuantity} units are available.`, "error");
    return;
  }

  /* --------------------------------------------------------
     DATE VALIDATION
  -------------------------------------------------------- */

  if (!selectedPickupDate) {
    showToast("Please select a pickup date.", "error");

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
     TIME VALIDATION
  -------------------------------------------------------- */

  if (!selectedSlot) {
    showToast("Please select a pickup time.", "error");

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

  const listingId = currentListing._id || currentListing.id || getListingId();

  if (!listingId) {
    showToast("Listing information is not available.", "error");
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
    const response = await fetch(`${API_BASE_URL}/orders/place`, {
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
    } catch {
      throw new Error("Invalid response from server.");
    }

    console.log("Reservation Response:", result);

    if (!response.ok) {
      throw new Error(result.message || "Unable to reserve food.");
    }

    if (result.success === false) {
      throw new Error(result.message || "Reservation failed.");
    }

    showToast(
      result.message || "Reservation request sent successfully.",
      "success",
    );

    /* ------------------------------------------------------
       REDIRECT AFTER SUCCESS
    ------------------------------------------------------ */

    setTimeout(() => {
      window.location.href = "/my-reservations";
    }, 1500);
  } catch (error) {
    console.error("Reservation error:", error);

    showToast(error.message || "Unable to place reservation.", "error");

    button.disabled = false;

    button.innerHTML = originalButtonHTML;
  }
}

/* ==========================================================
   PICKUP DATE + TIME
========================================================== */

function initializePickupDateTime() {
  const dateSelect = document.getElementById("pickupDate");

  const timeSelect = document.getElementById("pickupTime");

  if (!dateSelect || !timeSelect || !currentListing) {
    return;
  }

  const pickupStart = parseDate(currentListing.pickup_start);

  const pickupEnd = parseDate(currentListing.pickup_end);

  if (!pickupStart || !pickupEnd || pickupEnd <= pickupStart) {
    dateSelect.innerHTML = `
      <option value="">
        Pickup date unavailable
      </option>
    `;

    timeSelect.innerHTML = `
      <option value="">
        Pickup time unavailable
      </option>
    `;

    selectedPickupDate = null;
    selectedSlot = null;

    return;
  }

  populatePickupDates(pickupStart, pickupEnd, dateSelect, timeSelect);

  dateSelect.onchange = () => {
    selectedPickupDate = dateSelect.value || null;

    selectedSlot = null;

    populatePickupTimesForDate(
      selectedPickupDate,
      pickupStart,
      pickupEnd,
      timeSelect,
    );

    updatePickupWindowDisplay();
  };
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

  /*
   * TODAY
   * Only today and future dates are allowed.
   */
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  /*
   * Start from the later of:
   * 1. Listing pickup start date
   * 2. Today
   */
  const listingStartDate = new Date(pickupStart);

  listingStartDate.setHours(0, 0, 0, 0);

  const currentDate =
    listingStartDate > today ? new Date(listingStartDate) : new Date(today);

  /*
   * Last available date from listing
   */
  const lastDate = new Date(pickupEnd);

  lastDate.setHours(0, 0, 0, 0);

  /*
   * If the complete pickup window is already over,
   * no dates should be available.
   */
  if (lastDate < today) {
    dateSelect.innerHTML = `
      <option value="">
        Pickup date has expired
      </option>
    `;

    timeSelect.innerHTML = `
      <option value="">
        Pickup time unavailable
      </option>
    `;

    selectedPickupDate = null;
    selectedSlot = null;

    updatePickupWindowDisplay();

    return;
  }

  /*
   * Generate only TODAY + FUTURE dates.
   */
  while (currentDate <= lastDate) {
    const dayStart = new Date(currentDate);

    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(currentDate);

    dayEnd.setHours(23, 59, 59, 999);

    /*
     * Make sure this date actually intersects
     * the listing's pickup window.
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

  /*
   * If no future dates were generated.
   */
  if (dateSelect.options.length === 1) {
    dateSelect.innerHTML = `
      <option value="">
        No pickup dates available
      </option>
    `;

    timeSelect.innerHTML = `
      <option value="">
        Pickup time unavailable
      </option>
    `;

    selectedPickupDate = null;
    selectedSlot = null;

    updatePickupWindowDisplay();

    return;
  }

  timeSelect.innerHTML = `
    <option value="">
      Select a pickup date first
    </option>
  `;

  selectedPickupDate = null;
  selectedSlot = null;

  updatePickupWindowDisplay();
}

/* ==========================================================
   GENERATE TIME SLOTS
========================================================== */

function populatePickupTimesForDate(
  selectedDate,
  pickupStart,
  pickupEnd,
  timeSelect,
) {
  timeSelect.innerHTML = "";

  const defaultOption = document.createElement("option");

  defaultOption.value = "";

  defaultOption.textContent = "Select a pickup time";

  defaultOption.selected = true;

  timeSelect.appendChild(defaultOption);

  selectedSlot = null;

  if (!selectedDate) {
    defaultOption.textContent = "Select a pickup date first";
    return;
  }

  /*
   * Selected day
   */
  const selectedDayStart = new Date(`${selectedDate}T00:00:00`);

  const selectedDayEnd = new Date(`${selectedDate}T23:59:59`);

  /*
   * Start of the actual pickup window for this day.
   */
  let slotStart =
    pickupStart > selectedDayStart
      ? new Date(pickupStart)
      : new Date(selectedDayStart);

  /*
   * End of the actual pickup window for this day.
   */
  let slotEnd =
    pickupEnd < selectedDayEnd ? new Date(pickupEnd) : new Date(selectedDayEnd);

  /*
   * IMPORTANT:
   * If selected date is TODAY, don't show
   * pickup times that have already passed.
   */
  const now = new Date();

  const todayKey = formatDateKey(now);

  if (selectedDate === todayKey) {
    if (now > slotStart) {
      slotStart = new Date(now);
    }
  }

  /*
   * No valid time remaining.
   */
  if (slotStart >= slotEnd) {
    defaultOption.textContent = "No pickup time available";

    return;
  }

  /*
   * Generate 1-hour slots.
   */
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

  /*
   * No slots were generated.
   */
  if (timeSelect.options.length === 1) {
    defaultOption.textContent = "No pickup time available";

    return;
  }

  timeSelect.onchange = () => {
    selectedSlot = timeSelect.value || null;

    updatePickupWindowDisplay();

    console.log("Selected pickup date:", selectedPickupDate);

    console.log("Selected pickup time:", selectedSlot);
  };
}

/* ==========================================================
   UPDATE PICKUP WINDOW TEXT
========================================================== */

function updatePickupWindowDisplay() {
  const element = document.getElementById("listingPickupTime");

  if (!element) {
    return;
  }

  if (selectedPickupDate && selectedSlot) {
    const dateText = formatDisplayDateFromKey(selectedPickupDate);

    element.textContent = `${dateText} • ${selectedSlot}`;
  } else {
    element.textContent = "Select date & time below";
  }
}

/* ==========================================================
   GET ORIGINAL PICKUP WINDOW
========================================================== */

function getPickupWindowText(listing) {
  const start = getValue(
    listing,
    ["pickup_start", "pickupStart", "pickupStartTime"],
    null,
  );

  const end = getValue(
    listing,
    ["pickup_end", "pickupEnd", "pickupEndTime"],
    null,
  );

  if (!start || !end) {
    return "Select date & time below";
  }

  const startDate = parseDate(start);

  const endDate = parseDate(end);

  if (!startDate || !endDate) {
    return "Select date & time below";
  }

  if (formatDateKey(startDate) === formatDateKey(endDate)) {
    return `${formatTime(startDate)} - ${formatTime(endDate)}`;
  }

  return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
}

/* ==========================================================
   DATE KEY
========================================================== */

function formatDateKey(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* ==========================================================
   DISPLAY DATE
========================================================== */

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ==========================================================
   DISPLAY DATE FROM KEY
========================================================== */

function formatDisplayDateFromKey(dateKey) {
  if (!dateKey) {
    return "";
  }

  const date = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return formatDisplayDate(date);
}

/* ==========================================================
   DATE PARSER
========================================================== */

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/* ==========================================================
   TIME FORMATTER
========================================================== */

function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : parseDate(value);

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
   DATE FORMATTER
========================================================== */

function formatDate(value) {
  if (!value) {
    return "Not specified";
  }

  const date = parseDate(value);

  if (!date) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ==========================================================
   DATE + TIME FORMATTER
========================================================== */

function formatDateTime(value, fallback = "Not specified") {
  if (!value) {
    return fallback;
  }

  const date = parseDate(value);

  if (!date) {
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
   MAP
========================================================== */

function initializeMapButton() {
  const button = document.getElementById("viewMapBtn");

  if (!button) {
    return;
  }

  button.onclick = () => {
    if (!currentListing) {
      return;
    }

    const address = [
      currentListing.address,
      currentListing.area,
      currentListing.city,
      currentListing.state,
      currentListing.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    if (!address) {
      showToast("Pickup location is unavailable.", "error");
      return;
    }

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    window.open(mapUrl, "_blank", "noopener,noreferrer");
  };
}

/* ==========================================================
   INSTRUCTIONS
========================================================== */

function setupInstructions() {
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
   COMMUNITY SUPPORT
========================================================== */

function setupCommunitySupport() {
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
      const amount = Number(option.dataset.support) || 0;

      const alreadySelected = option.classList.contains("active");

      options.forEach((item) => {
        item.classList.remove("active");
      });

      customButton?.classList.remove("active");

      customInputBox?.classList.add("hidden");

      if (customInput) {
        customInput.value = "";
      }

      if (alreadySelected) {
        communitySupport = 0;
      } else {
        option.classList.add("active");

        communitySupport = amount;
      }

      updateReservationTotal();
    });
  });

  /* --------------------------------------------------------
     CUSTOM BUTTON
  -------------------------------------------------------- */

  if (customButton) {
    customButton.addEventListener("click", () => {
      const alreadyActive = customButton.classList.contains("active");

      options.forEach((item) => {
        item.classList.remove("active");
      });

      if (alreadyActive) {
        customButton.classList.remove("active");

        customInputBox?.classList.add("hidden");

        if (customInput) {
          customInput.value = "";
        }

        communitySupport = 0;

        updateReservationTotal();

        return;
      }

      customButton.classList.add("active");

      customInputBox?.classList.remove("hidden");

      setTimeout(() => {
        customInput?.focus();
      }, 50);
    });
  }

  /* --------------------------------------------------------
     APPLY CUSTOM
  -------------------------------------------------------- */

  if (applyCustomButton) {
    applyCustomButton.addEventListener("click", () => {
      const amount = Number(customInput?.value);

      if (!Number.isFinite(amount)) {
        showToast("Please enter a contribution amount.", "error");

        customInput?.focus();

        return;
      }

      if (amount < 5) {
        showToast("Minimum custom contribution is ₹5.", "error");

        customInput?.focus();

        return;
      }

      if (amount > 500) {
        showToast("Maximum custom contribution is ₹500.", "error");

        customInput?.focus();

        return;
      }

      communitySupport = Math.floor(amount);

      customButton?.classList.add("active");

      updateReservationTotal();
    });
  }

  /* --------------------------------------------------------
     ENTER KEY
  -------------------------------------------------------- */

  customInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      applyCustomButton?.click();
    }
  });
}

/* ==========================================================
   REPORT LISTING
========================================================== */

function setupReportButton() {
  const button = document.getElementById("reportListingBtn");

  if (!button) {
    return;
  }

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

      credentials: "same-origin",

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
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);

        applyProfile(user);
      } catch {
        console.warn("Invalid stored user data.");
      }
    }

    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return;
    }

    const result = await response.json();

    const user = result.user || result.profile || result;

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

  if (!logoutButton) {
    return;
  }

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

    window.location.href = "/login";
  });
}

/* ==========================================================
   NOTIFICATIONS
========================================================== */

function setupNotifications() {
  const button = document.getElementById("notificationBtn");

  if (!button) {
    return;
  }

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
  } catch {
    console.warn("Notification count unavailable.");
  }
}

/* ==========================================================
   MESSAGES
========================================================== */

function setupMessages() {
  const button = document.getElementById("messageBtn");

  if (!button) {
    return;
  }

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
  } catch {
    console.warn("Message count unavailable.");
  }
}

/* ==========================================================
   BADGE
========================================================== */

function updateBadge(elementId, count) {
  const badge = document.getElementById(elementId);

  if (!badge) {
    return;
  }

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

  if (!button) {
    return;
  }

  button.href = "/explore-food";
}

/* ==========================================================
   ERROR
========================================================== */

function showListingError(message) {
  console.error(message);

  hideListingLoading();

  const error = document.getElementById("listingError");

  const messageElement = document.getElementById("listingErrorMessage");

  if (messageElement) {
    messageElement.textContent = message;
  }

  if (error) {
    error.classList.remove("hidden");
  }

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
   SET TEXT
========================================================== */

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.textContent = value ?? "";
}

/* ==========================================================
   GET VALUE
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
   NUMERIC VALUE
========================================================== */

function getNumericValue(object, keys, fallback = 0) {
  const value = getValue(object, keys, fallback);

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

/* ==========================================================
   FORMAT NUMBER
========================================================== */

function formatNumber(number) {
  const value = Number(number);

  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("en-IN");
}

/* ==========================================================
   CURRENCY
========================================================== */

function formatCurrency(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "₹0";
  }

  return `₹${value.toLocaleString("en-IN")}`;
}

/* ==========================================================
   IMAGE URL
========================================================== */

function normalizeImageUrl(url) {
  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  if (url.startsWith("/")) {
    return url;
  }

  return `/static/${url}`;
}

/* ==========================================================
   CAPITALIZE
========================================================== */

function capitalize(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
