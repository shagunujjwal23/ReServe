/* =========================================================
   ReServe - Provider Pickup
   =========================================================

   FLOW:

   Provider accepts request
          ↓
   status = "accepted"
          ↓
   Provider Pickup shows "Accepted"
          ↓
   Preferred pickup date arrives
          ↓
   lifecycle.py changes status to "ready_for_pickup"
          ↓
   Provider Pickup shows "To Be Picked Up"
          ↓
   Customer completes pickup
          ↓
   status = "completed"
          ↓
   Provider Pickup shows "Completed"

   IMPORTANT:
   This JS NEVER changes the reservation status.
   Backend / MongoDB is the source of truth.
========================================================= */

/* =========================================================
   GLOBAL STATE
========================================================= */

let allPickups = [];

let currentStatus = "all";

let currentSearch = "";

let currentSort = "date_desc";

let refreshTimer = null;

/* =========================================================
   DOM ELEMENTS
========================================================= */

const pickupList = document.getElementById("pickupList");

const pickupLoading = document.getElementById("pickupLoading");

const pickupEmpty = document.getElementById("pickupEmpty");

const pickupNoResults = document.getElementById("pickupNoResults");

const pickupSearch = document.getElementById("pickupSearch");

const clearSearch = document.getElementById("clearSearch");

const resetSearchBtn = document.getElementById("resetSearchBtn");

const pickupSort = document.getElementById("pickupSort");

const pickupTabs = document.getElementById("pickupTabs");

const pickupTotalCount = document.getElementById("pickupTotalCount");

const allCount = document.getElementById("allCount");

const acceptedCount = document.getElementById("acceptedCount");

const readyCount = document.getElementById("readyCount");

const completedCount = document.getElementById("completedCount");

const pickupCardTemplate = document.getElementById("pickupCardTemplate");

/* =========================================================
   PROFILE DROPDOWN
========================================================= */

const profileMenuBtn = document.getElementById("profileMenuBtn");

const profileDropdown = document.getElementById("profileDropdown");

if (profileMenuBtn && profileDropdown) {
  profileMenuBtn.addEventListener("click", function (event) {
    event.stopPropagation();

    profileDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", function (event) {
    if (
      !profileDropdown.contains(event.target) &&
      !profileMenuBtn.contains(event.target)
    ) {
      profileDropdown.classList.add("hidden");
    }
  });
}

/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  setupPickupTabs();

  setupSearch();

  setupSorting();

  loadPickups();

  /*
      Refresh periodically so that when the backend lifecycle
      changes a reservation from accepted → ready_for_pickup
      or the customer changes it to completed, the Provider
      Pickup page can display the latest database status.
    */
  startAutoRefresh();
});

/* =========================================================
   LOAD PICKUPS
========================================================= */

async function loadPickups(showLoading = true) {
  if (showLoading) {
    showLoadingState();
  }

  try {
    const response = await fetch("/api/requests", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "same-origin",
    });

    if (response.status === 401) {
      window.location.href = "/login";

      return;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load pickup requests.");
    }

    /*
      Backend returns:

      {
        success: true,
        requests: [...]
      }
    */

    const requests = Array.isArray(data.requests) ? data.requests : [];

    /*
      Provider Pickup only shows:

      accepted
      ready_for_pickup
      completed

      Pending / rejected / cancelled requests do NOT
      belong on this page.
    */

    allPickups = requests.filter(function (request) {
      const status = normalizeStatus(request.status);

      return (
        status === "accepted" ||
        status === "ready_for_pickup" ||
        status === "completed"
      );
    });
    updateCounts();
    renderPickups();
    hideLoadingState();
  } catch (error) {
    console.error("Provider Pickup Error:", error);

    showErrorState(error.message || "Unable to load pickups.");
  }
}

/* =========================================================
   STATUS NORMALIZATION
========================================================= */

function normalizeStatus(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  /*
    Existing backend status:

    accepted
    ready_for_pickup
    completed

    We intentionally do NOT convert statuses such as
    "pending" into pickup statuses.
  */

  if (normalized === "accepted") {
    return "accepted";
  }

  if (normalized === "ready_for_pickup") {
    return "ready_for_pickup";
  }

  if (normalized === "completed") {
    return "completed";
  }

  return normalized;
}

/* =========================================================
   STATUS LABEL
========================================================= */

function getStatusLabel(status) {
  switch (normalizeStatus(status)) {
    case "accepted":
      return "Accepted";

    case "ready_for_pickup":
      return "To Be Picked Up";

    case "completed":
      return "Completed";

    default:
      return "Accepted";
  }
}

/* =========================================================
   STATUS CARD CLASS
========================================================= */

function getStatusClass(status) {
  switch (normalizeStatus(status)) {
    case "accepted":
      return "status-accepted";

    case "ready_for_pickup":
      return "status-ready";

    case "completed":
      return "status-completed";

    default:
      return "status-accepted";
  }
}

/* =========================================================
   STATUS ICON
========================================================= */

function getStatusIcon(status) {
  switch (normalizeStatus(status)) {
    case "accepted":
      return "ri-check-line";

    case "ready_for_pickup":
      return "ri-shopping-bag-3-line";

    case "completed":
      return "ri-checkbox-circle-line";

    default:
      return "ri-check-line";
  }
}

/* =========================================================
   UPDATE COUNTS
========================================================= */

function updateCounts() {
  const accepted = allPickups.filter(function (pickup) {
    return normalizeStatus(pickup.status) === "accepted";
  }).length;

  const ready = allPickups.filter(function (pickup) {
    return normalizeStatus(pickup.status) === "ready_for_pickup";
  }).length;

  const completed = allPickups.filter(function (pickup) {
    return normalizeStatus(pickup.status) === "completed";
  }).length;

  if (allCount) {
    allCount.textContent = allPickups.length;
  }

  if (acceptedCount) {
    acceptedCount.textContent = accepted;
  }

  if (readyCount) {
    readyCount.textContent = ready;
  }

  if (completedCount) {
    completedCount.textContent = completed;
  }
}

/* =========================================================
   SETUP STATUS TABS
========================================================= */

function setupPickupTabs() {
  if (!pickupTabs) {
    return;
  }

  const tabs = pickupTabs.querySelectorAll(".pickup-tab");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (item) {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      currentStatus = tab.dataset.status || "all";

      renderPickups();
    });
  });
}

/* =========================================================
   SETUP SEARCH
========================================================= */

function setupSearch() {
  if (!pickupSearch) {
    return;
  }

  pickupSearch.addEventListener("input", function () {
    currentSearch = pickupSearch.value.trim().toLowerCase();

    if (clearSearch) {
      clearSearch.classList.toggle("hidden", currentSearch.length === 0);
    }

    renderPickups();
  });

  if (clearSearch) {
    clearSearch.addEventListener("click", clearPickupSearch);
  }

  if (resetSearchBtn) {
    resetSearchBtn.addEventListener("click", clearPickupSearch);
  }
}

/* =========================================================
   CLEAR SEARCH
========================================================= */

function clearPickupSearch() {
  currentSearch = "";

  if (pickupSearch) {
    pickupSearch.value = "";
  }

  if (clearSearch) {
    clearSearch.classList.add("hidden");
  }

  renderPickups();
}

/* =========================================================
   SETUP SORTING
========================================================= */

function setupSorting() {
  if (!pickupSort) {
    return;
  }

  pickupSort.addEventListener("change", function () {
    currentSort = pickupSort.value || "date_asc";

    renderPickups();
  });
}

/* =========================================================
   FILTER PICKUPS
========================================================= */

function getFilteredPickups() {
  let filtered = [...allPickups];

  /* -------------------------------------------------------
     STATUS FILTER
  ------------------------------------------------------- */

  if (currentStatus !== "all") {
    filtered = filtered.filter(function (pickup) {
      return normalizeStatus(pickup.status) === currentStatus;
    });
  }

  /* -------------------------------------------------------
     SEARCH FILTER
  ------------------------------------------------------- */

  if (currentSearch) {
    filtered = filtered.filter(function (pickup) {
      const customerName = String(pickup.requester_name || "").toLowerCase();

      const foodName = String(pickup.food_name || "").toLowerCase();

      const requestId = String(pickup.request_id || "").toLowerCase();

      return (
        customerName.includes(currentSearch) ||
        foodName.includes(currentSearch) ||
        requestId.includes(currentSearch)
      );
    });
  }

  /* -------------------------------------------------------
     SORT
  ------------------------------------------------------- */

  filtered.sort(function (a, b) {
    if (currentSort === "date_asc") {
      return getPickupDateValue(a) - getPickupDateValue(b);
    }

    if (currentSort === "date_desc") {
      return getPickupDateValue(b) - getPickupDateValue(a);
    }

    if (currentSort === "created_desc") {
      return getCreatedDateValue(b) - getCreatedDateValue(a);
    }

    if (currentSort === "created_asc") {
      return getCreatedDateValue(a) - getCreatedDateValue(b);
    }

    return 0;
  });

  return filtered;
}

/* =========================================================
   RENDER PICKUPS
========================================================= */

function renderPickups() {
  if (!pickupList) {
    return;
  }

  hideElement(pickupEmpty);

  hideElement(pickupNoResults);

  const filtered = getFilteredPickups();

  pickupList.innerHTML = "";

  /*
    No pickup records at all.
  */

  if (allPickups.length === 0) {
    showElement(pickupEmpty);

    updateTotalCount(0);

    return;
  }

  /*
    Records exist but current filter/search
    has no matching results.
  */

  if (filtered.length === 0) {
    showElement(pickupNoResults);

    updateTotalCount(0);

    return;
  }

  /*
    Render every matching reservation.
  */

  filtered.forEach(function (pickup) {
    const card = createPickupCard(pickup);

    if (card) {
      pickupList.appendChild(card);
    }
  });

  updateTotalCount(filtered.length);
}

/* =========================================================
   CREATE PICKUP CARD
========================================================= */

function createPickupCard(pickup) {
  if (!pickupCardTemplate) {
    return null;
  }

  const fragment = pickupCardTemplate.content.cloneNode(true);

  const card = fragment.querySelector(".pickup-card");

  if (!card) {
    return null;
  }

  /* -------------------------------------------------------
     CARD STATUS
  ------------------------------------------------------- */

  const status = normalizeStatus(pickup.status);

  const statusClass = getStatusClass(status);

  card.classList.add(statusClass);

  card.dataset.requestId = pickup._id || pickup.request_id || "";

  card.dataset.status = status;

  /* -------------------------------------------------------
     FOOD IMAGE
  ------------------------------------------------------- */

  const foodImage = card.querySelector(".pickup-food-image");

  if (foodImage) {
    foodImage.src = getImageUrl(pickup.image);

    foodImage.alt = pickup.food_name || "Food";
  }

  /* -------------------------------------------------------
     FOOD NAME
  ------------------------------------------------------- */

  setText(card, ".pickup-food-name", pickup.food_name || "Food Item");

  /* -------------------------------------------------------
     QUANTITY
  ------------------------------------------------------- */

  const quantity = formatQuantity(pickup.quantity, pickup.unit);

  setText(card, ".food-quantity", quantity);

  /* -------------------------------------------------------
     CATEGORY
  ------------------------------------------------------- */

  const category = pickup.category || "Food";

  setText(card, ".food-category", formatCategory(category));

  /* -------------------------------------------------------
     FOOD TYPE
  ------------------------------------------------------- */

  const foodType = pickup.food_type || "";

  const foodTypeElement = card.querySelector(".food-type");

  if (foodTypeElement) {
    if (foodType) {
      foodTypeElement.textContent = formatFoodType(foodType);

      foodTypeElement.style.display = "inline-flex";
    } else {
      foodTypeElement.style.display = "none";
    }
  }

  /* -------------------------------------------------------
     PRICE
  ------------------------------------------------------- */

  const price = getNumber(pickup.unit_price);

  const amount = getNumber(pickup.amount);

  const totalAmount = getNumber(pickup.total_amount);

  const priceElement = card.querySelector(".pickup-price");

  const originalPriceElement = card.querySelector(".pickup-original-price");

  const discountElement = card.querySelector(".pickup-discount");

  /*
    Display the reservation amount.

    The backend stores:
      unit_price
      amount
      total_amount
  */

  if (priceElement) {
    priceElement.textContent = formatCurrency(amount || totalAmount || price);
  }

  /*
    If we have both unit price and amount,
    calculate an approximate original total.
  */

  if (
    originalPriceElement &&
    price > 0 &&
    amount > 0 &&
    amount < price * getQuantityNumber(pickup.quantity)
  ) {
    const original = price * getQuantityNumber(pickup.quantity);

    originalPriceElement.textContent = formatCurrency(original);

    originalPriceElement.style.display = "inline";
  } else {
    originalPriceElement.style.display = "none";
  }

  /*
    Discount.

    If original price is available,
    calculate the percentage.
  */

  if (discountElement && originalPriceElement.style.display !== "none") {
    const originalValue = price * getQuantityNumber(pickup.quantity);

    const currentValue = amount;

    if (
      originalValue > 0 &&
      currentValue >= 0 &&
      currentValue < originalValue
    ) {
      const discount = Math.round(
        ((originalValue - currentValue) / originalValue) * 100,
      );

      discountElement.textContent = `${discount}% OFF`;

      discountElement.style.display = "inline-flex";
    } else {
      discountElement.style.display = "none";
    }
  } else if (discountElement) {
    discountElement.style.display = "none";
  }

  /* -------------------------------------------------------
     CUSTOMER
  ------------------------------------------------------- */

  setText(card, ".customer-name", pickup.requester_name || "Customer");

  setText(card, ".customer-phone", pickup.phone || "Phone not available");

  /* -------------------------------------------------------
     PICKUP DATE
  ------------------------------------------------------- */

  setText(card, ".pickup-date", formatPickupDate(pickup.pickup_date));

  /* -------------------------------------------------------
     PICKUP TIME
  ------------------------------------------------------- */

  setText(card, ".pickup-time", pickup.pickup_time || "Time not specified");

  /* -------------------------------------------------------
     LOCATION
  ------------------------------------------------------- */

  const location = buildLocation(pickup);

  setText(card, ".pickup-location", location);

  /* -------------------------------------------------------
     INSTRUCTIONS
  ------------------------------------------------------- */

  setText(
    card,
    ".pickup-instructions",
    pickup.instructions || "No special instructions",
  );

  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  const statusBadge = card.querySelector(".pickup-status-badge");

  const statusIcon = card.querySelector(".pickup-status-badge i");

  const statusText = card.querySelector(".status-text");

  if (statusText) {
    statusText.textContent = getStatusLabel(status);
  }

  if (statusIcon) {
    statusIcon.className = getStatusIcon(status);
  }

  /*
    Keep badge itself updated too.
  */

  if (statusBadge) {
    statusBadge.setAttribute("data-status", status);
  }

  /* -------------------------------------------------------
     REQUESTED TIME
  ------------------------------------------------------- */

  setText(card, ".requested-time-value", formatRelativeTime(pickup.created_at));

  /* -------------------------------------------------------
     REMINDER TEXT
  ------------------------------------------------------- */

  const reminder = card.querySelector(".pickup-reminder-text");

  if (reminder) {
    if (status === "accepted") {
      reminder.textContent = "Customer will pick up during the scheduled time.";
    } else if (status === "ready_for_pickup") {
      reminder.textContent =
        "Pickup date has arrived. Keep the food ready for collection.";
    } else if (status === "completed") {
      reminder.textContent =
        "This reservation has been completed by the customer.";
    }
  }

  return card;
}

/* =========================================================
   BUILD LOCATION
========================================================= */

function buildLocation(pickup) {
  const parts = [];

  if (pickup.listing_area) {
    parts.push(String(pickup.listing_area).trim());
  }

  if (pickup.listing_address) {
    parts.push(String(pickup.listing_address).trim());
  }

  if (pickup.listing_city) {
    parts.push(String(pickup.listing_city).trim());
  }

  /*
    Remove duplicate values.
  */

  const uniqueParts = [...new Set(parts.filter(Boolean))];

  if (uniqueParts.length === 0) {
    return "Location not available";
  }

  return uniqueParts.join(", ");
}

/* =========================================================
   FORMAT QUANTITY
========================================================= */

function formatQuantity(quantity, unit) {
  if (quantity === undefined || quantity === null || quantity === "") {
    return "—";
  }

  const value = String(quantity).trim();

  if (!unit) {
    return value;
  }

  return `${value} ${unit}`;
}

/* =========================================================
   QUANTITY NUMBER
========================================================= */

function getQuantityNumber(quantity) {
  const value = parseFloat(quantity);

  if (Number.isFinite(value)) {
    return value;
  }

  return 1;
}

/* =========================================================
   FORMAT CATEGORY
========================================================= */

function formatCategory(category) {
  const value = String(category || "")
    .trim()
    .replace(/[_-]+/g, " ");

  if (!value) {
    return "Food";
  }

  return value.replace(/\b\w/g, function (letter) {
    return letter.toUpperCase();
  });
}

/* =========================================================
   FORMAT FOOD TYPE
========================================================= */

function formatFoodType(type) {
  const value = String(type || "")
    .trim()
    .replace(/[_-]+/g, " ");

  if (!value) {
    return "";
  }

  return value.replace(/\b\w/g, function (letter) {
    return letter.toUpperCase();
  });
}

/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "₹0";
  }

  return `₹${Math.round(number).toLocaleString("en-IN")}`;
}

/* =========================================================
   GET NUMBER
========================================================= */

function getNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

/* =========================================================
   FORMAT PICKUP DATE
========================================================= */

function formatPickupDate(dateValue) {
  if (!dateValue) {
    return "Date not specified";
  }

  /*
    Backend stores pickup date as:

    YYYY-MM-DD
  */

  const value = String(dateValue).trim();

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return value;
  }

  const year = Number(match[1]);

  const month = Number(match[2]);

  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   PICKUP DATE VALUE FOR SORTING
========================================================= */

function getPickupDateValue(pickup) {
  if (!pickup.pickup_date) {
    return Number.MAX_SAFE_INTEGER;
  }

  const date = new Date(`${pickup.pickup_date}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return Number.MAX_SAFE_INTEGER;
  }

  return date.getTime();
}

/* =========================================================
   CREATED DATE VALUE
========================================================= */

function getCreatedDateValue(pickup) {
  if (!pickup.created_at) {
    return 0;
  }

  const date = new Date(pickup.created_at);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
}

/* =========================================================
   RELATIVE TIME
========================================================= */

function formatRelativeTime(dateValue) {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const now = new Date();

  const difference = now.getTime() - date.getTime();

  if (difference < 0) {
    return "just now";
  }

  const seconds = Math.floor(difference / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   IMAGE URL
========================================================= */

function getImageUrl(image) {
  if (!image) {
    return "/static/images/food/default-food.png";
  }

  const value = String(image).trim();

  if (!value) {
    return "/static/images/food/default-food.png";
  }

  /*
    Absolute URL
  */

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  /*
    Already an absolute application path.
  */

  if (value.startsWith("/")) {
    return value;
  }

  /*
    Existing static/uploads paths.
  */

  if (value.startsWith("static/")) {
    return `/${value}`;
  }

  /*
    If backend gives only an image filename,
    assume it belongs to the uploads folder.
  */

  return `/static/uploads/${value}`;
}

/* =========================================================
   SAFE TEXT SETTER
========================================================= */

function setText(parent, selector, value) {
  if (!parent) {
    return;
  }

  const element = parent.querySelector(selector);

  if (!element) {
    return;
  }

  element.textContent =
    value === undefined || value === null || value === "" ? "—" : String(value);
}

/* =========================================================
   SHOW LOADING
========================================================= */

function showLoadingState() {
  if (pickupLoading) {
    pickupLoading.classList.remove("hidden");
  }

  if (pickupList) {
    pickupList.innerHTML = "";
  }

  hideElement(pickupEmpty);

  hideElement(pickupNoResults);
}

/* =========================================================
   HIDE LOADING
========================================================= */

function hideLoadingState() {
  if (pickupLoading) {
    pickupLoading.classList.add("hidden");
  }
}

/* =========================================================
   SHOW ERROR
========================================================= */

function showErrorState(message) {
  hideLoadingState();

  if (!pickupList) {
    return;
  }

  pickupList.innerHTML = `

    <div class="pickup-empty">

      <div class="empty-icon">
        <i class="ri-error-warning-line"></i>
      </div>

      <h2>
        Unable to load pickups
      </h2>

      <p>
        ${escapeHtml(
          message || "Something went wrong while loading your pickups.",
        )}
      </p>

      <button
        type="button"
        class="reset-search-btn"
        onclick="loadPickups()"
      >
        Try Again
      </button>

    </div>

  `;

  updateTotalCount(0);
}

/* =========================================================
   HIDE ELEMENT
========================================================= */

function hideElement(element) {
  if (element) {
    element.classList.add("hidden");
  }
}

/* =========================================================
   SHOW ELEMENT
========================================================= */

function showElement(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}

/* =========================================================
   UPDATE TOTAL COUNT
========================================================= */

function updateTotalCount(count) {
  if (pickupTotalCount) {
    pickupTotalCount.textContent = count;
  }
}

/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   AUTO REFRESH
========================================================= */

function startAutoRefresh() {
  /*
    Clear an existing timer first.
  */

  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  /*
    Refresh every 60 seconds.

    IMPORTANT:
    The browser is NOT changing any status.

    It simply asks the backend for the current
    database state again.

    Therefore:

    accepted
        ↓
    lifecycle.py updates DB
        ↓
    next API request
        ↓
    JS displays ready_for_pickup
  */

  refreshTimer = setInterval(function () {
    loadPickups(false);
  }, 60 * 1000);
}

/* =========================================================
   STOP AUTO REFRESH
========================================================= */

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);

    refreshTimer = null;
  }
}

/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener("beforeunload", function () {
  stopAutoRefresh();
});
