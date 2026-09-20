/* ==========================================================
   ReServe - My Listings
========================================================== */

/* ==========================================================
   API Configuration
========================================================== */

const MY_LISTINGS_API = "/api/listings/my";

/* ==========================================================
   SURPLUS FOOD / NGO DONATION (V1 additive panel)
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const panel = document.getElementById("surplusListings");
  const dialog = document.getElementById("surplusDialog");
  if (!panel || !dialog) return;
  const $ = (id) => document.getElementById(id);
  const escapeText = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[char]));
  let active = null;

  async function loadSurplus() {
    try {
      const response = await fetch("/api/provider/surplus", {credentials:"same-origin"});
      const data = await response.json();
      const records = data.surplus || [];
      panel.innerHTML = records.length ? records.map(item => `<article class="surplus-card"><h3>${escapeText(item.food_title)}</h3><p>${escapeText(item.quantity)} ${escapeText(item.unit)} currently unallocated</p><p>${item.surplus_quantity === null || item.surplus_quantity === undefined ? 'Awaiting provider confirmation' : `${escapeText(item.surplus_quantity)} confirmed for donation`}</p>${item.donation_id ? '<p><strong>Donation published</strong></p>' : `<button class="primary-btn surplus-action" data-id="${item.id}">${item.surplus_quantity === null || item.surplus_quantity === undefined ? 'Confirm Remaining Food' : 'Publish Donation'}</button>`}</article>`).join("") : '<p>No surplus food awaiting action.</p>';
      panel.querySelectorAll('.surplus-action').forEach(button => button.addEventListener('click', () => open(records.find(item => item.id === button.dataset.id))));
    } catch (error) { panel.innerHTML = '<p>Unable to load surplus food.</p>'; }
  }
  function open(item) {
    active=item; $('surplusListingId').value=item.id; $('surplusQuantity').max=item.quantity; $('surplusQuantity').value=item.surplus_quantity ?? '';
    const confirmed=item.surplus_quantity !== null && item.surplus_quantity !== undefined;
    $('surplusDialogTitle').textContent=confirmed?'Publish NGO Donation':'Confirm Remaining Food';
    $('surplusDialogHelp').textContent=confirmed?'Set a short pickup window for verified NGOs.':`Confirm the actual surplus, from 0 to ${item.quantity} ${item.unit}.`;
    $('surplusQuantity').disabled=confirmed; $('donationFields').hidden=!confirmed; $('confirmSurplusBtn').hidden=confirmed; $('publishDonationBtn').hidden=!confirmed; dialog.showModal();
  }
  $('confirmSurplusBtn').addEventListener('click', async () => {
    const amount=Number($('surplusQuantity').value); if(!Number.isInteger(amount)||amount<0||amount>Number(active.quantity)) return alert('Enter a valid remaining quantity.');
    const response=await fetch(`/api/listings/${encodeURIComponent(active.id)}/confirm-surplus`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({surplus_quantity:amount})}); const data=await response.json(); if(!response.ok)return alert(data.message||'Unable to confirm surplus.'); dialog.close(); loadSurplus(); if(typeof loadListings==='function') loadListings();
  });
  $('publishDonationBtn').addEventListener('click', async () => {
    const payload={donation_pickup_start:$('donationPickupStart').value,donation_pickup_end:$('donationPickupEnd').value,donation_instructions:$('donationInstructions').value};
    const response=await fetch(`/api/listings/${encodeURIComponent(active.id)}/donate`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const data=await response.json(); if(!response.ok)return alert(data.message||'Unable to publish donation.'); dialog.close(); loadSurplus();
  });
  loadSurplus();
});

/* ==========================================================
   Global State
========================================================== */

let listings = [];
let filteredListings = [];

let currentPage = 1;
const listingsPerPage = 12;

let selectedListing = null;

/* ==========================================================
   DOM Elements
========================================================== */

/* Listings */

const listingsContainer = document.getElementById("listingsContainer");
const listingTemplate = document.getElementById("listingTemplate");

/* Filters */

const listingSearch = document.getElementById("listingSearch");
const statusFilter = document.getElementById("statusFilter");
const categoryFilter = document.getElementById("categoryFilter");
const listingTypeFilter = document.getElementById("listingTypeFilter");
const sortBy = document.getElementById("sortBy");

/* Buttons */

const refreshListings = document.getElementById("refreshListings");
const clearFilters = document.getElementById("clearFilters");

/* States */

const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");

/* Listing Counter */

const visibleListings = document.getElementById("visibleListings");
const totalListingsCount = document.getElementById("totalListingsCount");

/* Pagination */

const pageStart = document.getElementById("pageStart");
const pageEnd = document.getElementById("pageEnd");
const totalRecords = document.getElementById("totalRecords");
const pagination = document.getElementById("pagination");

/* ==========================================================
   CONFIRMATION MODAL
========================================================== */

const confirmOverlay = document.getElementById("confirmOverlay");

const confirmIcon = document.getElementById("confirmIcon");

const confirmTitle = document.getElementById("confirmTitle");

const confirmMessage = document.getElementById("confirmMessage");

const confirmCancelBtn = document.getElementById("confirmCancelBtn");

const confirmSubmitBtn = document.getElementById("confirmSubmitBtn");

let confirmResolve = null;

/* ==========================================================
   SHOW CONFIRMATION MODAL
========================================================== */

function showConfirmModal({
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  type = "warning",
}) {
  return new Promise((resolve) => {
    confirmResolve = resolve;

    confirmTitle.textContent = title;

    confirmMessage.textContent = message;

    confirmSubmitBtn.textContent = confirmText;

    confirmIcon.className = `confirm-icon ${type}`;

    confirmSubmitBtn.className = `confirm-submit-btn ${type}`;

    confirmOverlay.classList.add("show");
  });
}

/* ==========================================================
   CLOSE CONFIRMATION MODAL
========================================================== */

function closeConfirmModal(result) {
  confirmOverlay.classList.remove("show");

  if (confirmResolve) {
    confirmResolve(result);

    confirmResolve = null;
  }
}

/* ==========================================================
   MODAL EVENTS
========================================================== */

if (confirmCancelBtn) {
  confirmCancelBtn.addEventListener("click", () => {
    closeConfirmModal(false);
  });
}

if (confirmSubmitBtn) {
  confirmSubmitBtn.addEventListener("click", () => {
    closeConfirmModal(true);
  });
}

if (confirmOverlay) {
  confirmOverlay.addEventListener("click", (event) => {
    if (event.target === confirmOverlay) {
      closeConfirmModal(false);
    }
  });
}

/* ==========================================================
   TOAST
========================================================== */

const reserveToast = document.getElementById("reserveToast");

const toastIcon = document.getElementById("toastIcon");

const toastTitle = document.getElementById("toastTitle");

const toastMessage = document.getElementById("toastMessage");

const toastClose = document.getElementById("toastClose");

let toastTimer = null;

/* ==========================================================
   SHOW TOAST
========================================================== */

function showToast(message, type = "success", title = null) {
  if (!reserveToast) {
    return;
  }

  clearTimeout(toastTimer);

  if (type === "error") {
    toastIcon.className = "ri-error-warning-line";

    toastTitle.textContent = title || "Something went wrong";
  } else {
    toastIcon.className = "ri-check-line";

    toastTitle.textContent = title || "Success";
  }

  toastMessage.textContent = message;

  reserveToast.classList.add("show");

  toastTimer = setTimeout(() => {
    reserveToast.classList.remove("show");
  }, 3500);
}

/* ==========================================================
   CLOSE TOAST
========================================================== */

if (toastClose) {
  toastClose.addEventListener("click", () => {
    clearTimeout(toastTimer);

    reserveToast.classList.remove("show");
  });
}

/* ==========================================================
   Initialize Application
========================================================== */

document.addEventListener("DOMContentLoaded", init);

function init() {
  console.log("ReServe My Listings Loaded");

  setupProfileDropdown();

  attachEventListeners();

  loadHeaderProfileImage();

  loadListings();
}

async function loadHeaderProfileImage() {
  const profileImage = document.getElementById("headerProfileImage");
  const profileName = document.getElementById("profileName");
  const profileRole = document.getElementById("profileRole");

  if (!profileImage && !profileName && !profileRole) return;

  try {
    const response = await fetch("/api/provider/profile", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => ({}));
    const profile = data.profile;

    if (!response.ok || data.success === false || !profile) return;

    if (profileName) {
      const displayName = profile.business_name || profile.name || profile.full_name;
      if (displayName) profileName.textContent = displayName;
    }

    if (profileRole && profile.role) {
      profileRole.textContent = profile.role
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const images = Array.isArray(profile.profile_images)
      ? profile.profile_images
      : profile.profile_image
        ? [profile.profile_image]
        : [];
    const imageUrl = images.find(
      (image) => typeof image === "string" && image.trim(),
    );

    if (imageUrl && profileImage) profileImage.src = imageUrl;
  } catch (error) {
    console.error("My Listings profile image error:", error);
  }
}

/* ==========================================================
   LOAD LISTINGS FROM BACKEND
========================================================== */

async function loadListings() {
  showLoading(true);

  try {
    const response = await fetch(MY_LISTINGS_API, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "same-origin",
    });

    const data = await response.json().catch(() => ({}));

    /* ------------------------------------------------------
       Authentication Error
    ------------------------------------------------------ */

    if (response.status === 401) {
      showToast(
        data.message || "Your session has expired. Please login again.",
        "error",
        "Session Expired",
      );

      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);

      return;
    }

    /* ------------------------------------------------------
       Other API Errors
    ------------------------------------------------------ */

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load your listings.");
    }

    /* ------------------------------------------------------
       Store Real MongoDB Listings
    ------------------------------------------------------ */

    listings = Array.isArray(data.listings)
      ? data.listings.map(normalizeListing).filter((listing) => listing.rawStatus !== "surplus_pending")
      : [];

    filteredListings = [...listings];

    console.log(`Loaded ${listings.length} listing(s) from MongoDB.`);

    /* ------------------------------------------------------
       Update UI
    ------------------------------------------------------ */

    populateCategoryFilter();

    refreshPage();

    updateLastUpdated();
  } catch (error) {
    console.error("Load Listings Error:", error);

    listings = [];
    filteredListings = [];

    showErrorMessage(
      error.message || "Unable to load listings. Please try again later.",
    );
  } finally {
    showLoading(false);
  }
}

/* ==========================================================
   NORMALIZE BACKEND LISTING
========================================================== */

function normalizeListing(listing) {
  return {
    /* MongoDB ID */

    id: listing.id,

    /* Food */

    title: listing.food_title || "Untitled Food Listing",

    category: listing.category || "Other",

    foodType: listing.food_type || "Not specified",

    type: listing.listing_type || "",

    quantity:
      listing.quantity !== undefined && listing.quantity !== null
        ? `${listing.quantity} ${listing.unit || ""}`.trim()
        : "—",

    /* Status */

    rawStatus: String(listing.status || "available").toLowerCase(),
    status: formatStatus(listing.status),

    /* Location */

    location: listing.address || listing.city || "Location not specified",

    /* Pickup */

    pickup: formatPickupTime(listing.pickup_start, listing.pickup_end),

    /* Price */

    price: Number(listing.discounted_price) || 0,

    originalPrice: Number(listing.original_price) || 0,

    /* Image */

    image: listing.image || "/static/images/food-placeholder.jpg",

    /* Statistics */

    views: Number(listing.views) || 0,

    reservations: Number(listing.reservations) || 0,

    /* AI */

    aiScore: Number(listing.freshness_score) || 0,

    recoveryProbability: Number(listing.recovery_probability) || 0,

    carbonSaved: Number(listing.carbon_saved) || 0,

    aiRecommendation: listing.ai_recommendation || "",

    /* Dates */

    createdAt: listing.created_at || null,

    updated: formatUpdatedTime(listing.updated_at),

    updatedAt: listing.updated_at || null,

    expiryDate: listing.expiry_date || null,
  };
}

/* ==========================================================
   STATUS FORMAT
========================================================== */

function formatStatus(status) {
  if (!status) {
    return "Active";
  }

  const normalized = String(status).toLowerCase();

  switch (normalized) {
    case "available":
    case "active":
      return "Active";

    case "reserved":
      return "Reserved";

    case "completed":
      return "Completed";

    case "expired":
      return "Expired";

    case "cancelled":
      return "Cancelled";

    case "paused":
      return "Paused";

    case "surplus_pending":
      return "Surplus Pending";

    default:
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}

/* ==========================================================
   FORMAT PICKUP TIME
========================================================== */

function formatPickupTime(start, end) {
  if (!start && !end) {
    return "Pickup time not specified";
  }

  if (start && end) {
    return `${formatDateTime(start)} - ${formatDateTime(end)}`;
  }

  if (start) {
    return formatDateTime(start);
  }

  return formatDateTime(end);
}

/* ==========================================================
   FORMAT DATE / TIME
========================================================== */

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ==========================================================
   FORMAT EXPIRY DATE
========================================================== */

function formatExpiryDate(value) {
  if (!value) {
    return "Expiry not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ==========================================================
   FORMAT UPDATED TIME
========================================================== */

function formatUpdatedTime(value) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const now = new Date();

  const difference = now.getTime() - date.getTime();

  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ==========================================================
   RENDER LISTINGS
========================================================== */

function renderListings() {
  listingsContainer.innerHTML = "";

  /* ------------------------------------------------------
     No Results
  ------------------------------------------------------ */

  if (filteredListings.length === 0) {
    emptyState.classList.remove("hidden");
    listingsContainer.classList.add("hidden");

    return;
  }

  emptyState.classList.add("hidden");
  listingsContainer.classList.remove("hidden");

  /* ------------------------------------------------------
     Current Page
  ------------------------------------------------------ */

  const currentListings = paginateListings();

  currentListings.forEach((listing) => {
    const clone = listingTemplate.content.cloneNode(true);

    /* ====================================================
       CARD
    ==================================================== */

    const card = clone.querySelector(".listing-card");

    if (!card) {
      console.error("listing-card not found in listingTemplate.");
      return;
    }

    card.dataset.id = listing.id;

    /* ====================================================
       IMAGE
    ==================================================== */

    const foodImage = clone.querySelector(".food-image");

    if (foodImage) {
      foodImage.src = listing.image;
      foodImage.alt = listing.title;

      foodImage.onerror = function () {
        this.onerror = null;
        this.src = "/static/images/food-placeholder.jpg";
      };
    }

    /* ====================================================
       FOOD TITLE
    ==================================================== */

    const foodName = clone.querySelector(".food-name");

    if (foodName) {
      foodName.textContent = listing.title;
    }

    /* ====================================================
       CATEGORY
    ==================================================== */

    const category = clone.querySelector(".food-category");

    if (category) {
      category.textContent = listing.category;
    }

    /* ====================================================
       QUANTITY
    ==================================================== */

    const quantity = clone.querySelector(".quantity");

    if (quantity) {
      quantity.textContent = listing.quantity;
    }

    /* ====================================================
       FOOD TYPE
    ==================================================== */

   const foodType = clone.querySelector(".dietary-type");

    if (foodType) {
      foodType.textContent = listing.foodType;
    }

    /* ====================================================
       LOCATION
    ==================================================== */

    const location = clone.querySelector(".location");

    if (location) {
      location.textContent = listing.location;
    }

    /* ====================================================
       PICKUP TIME
    ==================================================== */

    const pickupTime = clone.querySelector(".pickup-time");

    if (pickupTime) {
      pickupTime.textContent = listing.pickup;
    }

    /* ====================================================
       EXPIRY
    ==================================================== */

    const expiryDate = clone.querySelector(".expiry-date");

    if (expiryDate) {
      expiryDate.textContent = formatExpiryDate(listing.expiryDate);
    }

    /* ====================================================
       PRICE
    ==================================================== */

    const currentPrice = clone.querySelector(".current-price");

    if (currentPrice) {
      if (listing.price > 0) {
        currentPrice.textContent = `₹${listing.price}`;
      } else {
        currentPrice.textContent = "Free";
      }
    }

    /* ====================================================
       ORIGINAL PRICE
    ==================================================== */

    const oldPrice = clone.querySelector(".old-price");

    if (oldPrice) {
      if (listing.originalPrice > 0 && listing.originalPrice > listing.price) {
        oldPrice.textContent = `₹${listing.originalPrice}`;
        oldPrice.classList.remove("hidden");
      } else {
        oldPrice.textContent = "";
        oldPrice.classList.add("hidden");
      }
    }

    /* ====================================================
       AI SCORE
    ==================================================== */

    const aiScore = clone.querySelector(".ai-score");

    if (aiScore) {
      aiScore.textContent = `${listing.aiScore}%`;
    }

    /* ====================================================
       VIEWS
    ==================================================== */

    const views = clone.querySelector(".views-count");

    if (views) {
      views.textContent = listing.views;
    }

    /* ====================================================
       RESERVATIONS
    ==================================================== */

    const reservations = clone.querySelector(".reservations-count");

    if (reservations) {
      reservations.textContent = listing.reservations;
    }

    /* ====================================================
       STATUS
    ==================================================== */

    const badge = clone.querySelector(".status-badge");

    if (badge) {
      const statusClass = listing.status.toLowerCase();

      badge.textContent = listing.status;

      badge.className = "status-badge";

      badge.classList.add(statusClass);

      badge.dataset.status = statusClass;
    }

    /* ====================================================
       AI BADGE
    ==================================================== */

    const aiBadge = clone.querySelector(".ai-badge");

    if (aiBadge) {
      if (listing.aiScore > 0) {
        aiBadge.classList.remove("hidden");
      } else {
        aiBadge.classList.add("hidden");
      }
    }

    /* ====================================================
       ACTION BUTTON IDs
    ==================================================== */

    const viewButton = clone.querySelector(".view-btn");

    if (viewButton) {
      viewButton.dataset.id = listing.id;
    }

    const duplicateButton = clone.querySelector(".duplicate-btn");

    if (duplicateButton) {
      duplicateButton.dataset.id = listing.id;
    }

    const pauseButton = clone.querySelector(".pause-btn");

    if (pauseButton) {
      pauseButton.dataset.id = listing.id;

      const isPaused = String(listing.status).toLowerCase() === "paused";

      if (isPaused) {
        pauseButton.innerHTML = '<i class="ri-play-circle-line"></i>';

        pauseButton.title = "Resume Listing";

        pauseButton.setAttribute("aria-label", "Resume Listing");
      } else {
        pauseButton.innerHTML = '<i class="ri-pause-circle-line"></i>';

        pauseButton.title = "Pause Listing";

        pauseButton.setAttribute("aria-label", "Pause Listing");
      }
    }

    /* ====================================================
       APPEND CARD
    ==================================================== */

    listingsContainer.appendChild(clone);
  });
}

/* ==========================================================
   POPULATE CATEGORY FILTER
========================================================== */

function populateCategoryFilter() {
  if (!categoryFilter) {
    return;
  }

  categoryFilter.innerHTML =
    '<option value="" disabled selected>Categories</option>';

  const categories = [
    ...new Set(listings.map((listing) => listing.category).filter(Boolean)),
  ];

  categories.sort((a, b) => a.localeCompare(b));

  categories.forEach((category) => {
    const option = document.createElement("option");

    option.value = category;
    option.textContent = category;

    categoryFilter.appendChild(option);
  });
}

/* ==========================================================
   FILTER LISTINGS
========================================================== */

function filterListings() {
  const searchValue = listingSearch
    ? listingSearch.value.trim().toLowerCase()
    : "";

  const selectedStatus = statusFilter ? statusFilter.value : "";

  const selectedCategory = categoryFilter ? categoryFilter.value : "";

  const selectedType = listingTypeFilter ? listingTypeFilter.value : "";

  filteredListings = listings.filter((listing) => {
    /* Search */

    const matchesSearch = listing.title.toLowerCase().includes(searchValue);

    /* Status */

    const matchesStatus =
      selectedStatus === "" ||
      selectedStatus === "status" ||
      listing.status === selectedStatus;

    /* Category */

    const matchesCategory =
      selectedCategory === "" ||
      selectedCategory === "categories" ||
      listing.category === selectedCategory;

    /* Listing Type */

    const matchesType =
      selectedType === "" ||
      selectedType === "types" ||
      normalizeListingType(listing.type) === normalizeListingType(selectedType);

    return matchesSearch && matchesStatus && matchesCategory && matchesType;
  });
}

/* ==========================================================
   NORMALIZE LISTING TYPE
========================================================== */

function normalizeListingType(type) {
  const normalized = String(type || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "sell" ||
    normalized === "sale" ||
    normalized === "for sale"
  ) {
    return "sale";
  }

  if (normalized === "donation" || normalized === "donate") {
    return "donation";
  }

  return normalized;
}

/* ==========================================================
   SORT LISTINGS
========================================================== */

function sortListings() {
  const sortValue = sortBy ? sortBy.value : "newest";

  switch (sortValue) {
    case "newest":
      filteredListings.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );
      break;

    case "oldest":
      filteredListings.sort(
        (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      );
      break;

    case "priceLow":
      filteredListings.sort((a, b) => a.price - b.price);
      break;

    case "priceHigh":
      filteredListings.sort((a, b) => b.price - a.price);
      break;

    case "expiry":
      filteredListings.sort(
        (a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0),
      );
      break;
  }
}

/* ==========================================================
   PAGINATION
========================================================== */

function paginateListings() {
  const startIndex = (currentPage - 1) * listingsPerPage;

  const endIndex = startIndex + listingsPerPage;

  return filteredListings.slice(startIndex, endIndex);
}

/* ==========================================================
   RENDER PAGINATION
========================================================== */

function renderPagination() {
  if (!pagination) {
    return;
  }

  pagination.innerHTML = "";

  const totalPages = Math.ceil(filteredListings.length / listingsPerPage);

  if (totalPages <= 1) {
    return;
  }

  /* Previous */

  if (currentPage > 1) {
    const previousButton = document.createElement("button");

    previousButton.innerHTML = '<i class="ri-arrow-left-s-line"></i>';

    previousButton.addEventListener("click", () => {
      currentPage--;

      renderListings();
      renderPagination();
      updatePaginationInfo();
    });

    pagination.appendChild(previousButton);
  }

  /* Page Numbers */

  for (let page = 1; page <= totalPages; page++) {
    const button = document.createElement("button");

    button.textContent = page;

    if (page === currentPage) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      currentPage = page;

      renderListings();
      renderPagination();
      updatePaginationInfo();
    });

    pagination.appendChild(button);
  }

  /* Next */

  if (currentPage < totalPages) {
    const nextButton = document.createElement("button");

    nextButton.innerHTML = '<i class="ri-arrow-right-s-line"></i>';

    nextButton.addEventListener("click", () => {
      currentPage++;

      renderListings();
      renderPagination();
      updatePaginationInfo();
    });

    pagination.appendChild(nextButton);
  }
}

/* ==========================================================
   PAGINATION INFORMATION
========================================================== */

function updatePaginationInfo() {
  if (!pageStart || !pageEnd || !totalRecords) {
    return;
  }

  const total = filteredListings.length;

  if (total === 0) {
    pageStart.textContent = 0;
    pageEnd.textContent = 0;
    totalRecords.textContent = 0;

    return;
  }

  const start = (currentPage - 1) * listingsPerPage + 1;

  const end = Math.min(currentPage * listingsPerPage, total);

  pageStart.textContent = start;
  pageEnd.textContent = end;
  totalRecords.textContent = total;
}

/* ==========================================================
   UPDATE LISTING COUNT
========================================================== */

function updateListingCount() {
  if (visibleListings) {
    visibleListings.textContent = filteredListings.length;
  }

  if (totalListingsCount) {
    totalListingsCount.textContent = listings.length;
  }
}

/* ==========================================================
   REFRESH PAGE
========================================================== */

function refreshPage() {
  currentPage = 1;

  filterListings();

  sortListings();

  updateListingCount();

  renderListings();

  renderPagination();

  updatePaginationInfo();
}

/* ==========================================================
   EVENT LISTENERS
========================================================== */

function attachEventListeners() {
  /* Search */

  if (listingSearch) {
    listingSearch.addEventListener("input", refreshPage);
  }

  /* Status */

  if (statusFilter) {
    statusFilter.addEventListener("change", refreshPage);
  }

  /* Category */

  if (categoryFilter) {
    categoryFilter.addEventListener("change", refreshPage);
  }

  /* Listing Type */

  if (listingTypeFilter) {
    listingTypeFilter.addEventListener("change", refreshPage);
  }

  /* Sort */

  if (sortBy) {
    sortBy.addEventListener("change", refreshPage);
  }

  /* Refresh */

  if (refreshListings) {
    refreshListings.addEventListener("click", loadListings);
  }

  /* Reset */

  if (clearFilters) {
    clearFilters.addEventListener("click", resetFilters);
  }

  /* Listing actions */

  if (listingsContainer) {
    listingsContainer.addEventListener("click", handleListingAction);
  }
}

/* ==========================================================
   HANDLE LISTING ACTION
========================================================== */

function handleListingAction(event) {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  const card = button.closest(".listing-card");

  if (!card) {
    return;
  }

  const listingId = card.dataset.id;

  if (!listingId) {
    console.error("Listing ID not found.");
    return;
  }

  /* ========================================================
     VIEW DETAILS
  ======================================================== */

  if (button.classList.contains("view-btn")) {
    viewListing(listingId);
    return;
  }

  /* ========================================================
     DUPLICATE
  ======================================================== */

  if (button.classList.contains("duplicate-btn")) {
    duplicateListing(listingId);
    return;
  }

  /* ========================================================
     PAUSE / RESUME
  ======================================================== */

  if (button.classList.contains("pause-btn")) {
    pauseListing(listingId);
    return;
  }
}

/* ==========================================================
   RESET FILTERS
========================================================== */

function resetFilters() {
  if (listingSearch) {
    listingSearch.value = "";
  }

  if (statusFilter) {
    statusFilter.value = "";
  }

  if (categoryFilter) {
    categoryFilter.value = "";
  }

  if (listingTypeFilter) {
    listingTypeFilter.value = "";
  }

  if (sortBy) {
    sortBy.value = "newest";
  }

  refreshPage();
}

/* ==========================================================
   VIEW LISTING
========================================================== */

function viewListing(id) {
  window.location.href = `/view-listing?id=${encodeURIComponent(id)}`;
}

/* ==========================================================
   EDIT LISTING
========================================================== */

function editListing(id) {
  const listing = listings.find((item) => String(item.id) === String(id));

  if (!listing) {
    return;
  }

  console.log("Edit Listing:", listing);

  /*
     Edit API/page will be
     connected later.
  */
}

/* ==========================================================
   DUPLICATE LISTING
========================================================== */

async function duplicateListing(id) {
  const listing = listings.find((item) => String(item.id) === String(id));

  if (!listing) {
    return;
  }

  const confirmed = await showConfirmModal({
    title: "Duplicate Listing?",

    message: `Create a new listing using the same details as "${listing.title}"?`,

    confirmText: "Duplicate",

    type: "warning",
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `/api/listings/${encodeURIComponent(id)}/duplicate`,
      {
        method: "POST",

        headers: {
          Accept: "application/json",
        },

        credentials: "same-origin",
      },
    );

    const data = await response.json().catch(() => ({}));

    /* Authentication */

    if (response.status === 401) {
      showToast(
        data.message || "Your session has expired.",
        "error",
        "Session Expired",
      );

      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);

      return;
    }

    /* API Error */

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to duplicate the listing.");
    }

    /* Success */

    showToast(data.message || "Listing duplicated successfully.");

    await loadListings();
  } catch (error) {
    console.error("Duplicate Listing Error:", error);

    showToast(
      error.message || "Unable to duplicate the listing. Please try again.",
      "error",
    );
  }
}

/* ==========================================================
   PAUSE / RESUME LISTING
========================================================== */

async function pauseListing(id) {
  const listing = listings.find((item) => String(item.id) === String(id));

  if (!listing) {
    console.error("Listing not found:", id);
    return;
  }

  const isPaused = String(listing.status).trim().toLowerCase() === "paused";

  const actionText = isPaused ? "resume" : "pause";

  const confirmed = await showConfirmModal({
    title: isPaused ? "Resume Listing?" : "Pause Listing?",

    message: `Are you sure you want to ${actionText} "${listing.title}"?`,

    confirmText: isPaused ? "Resume Listing" : "Pause Listing",

    type: "warning",
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `/api/listings/${encodeURIComponent(id)}/pause`,
      {
        method: "PATCH",

        headers: {
          Accept: "application/json",
        },

        credentials: "same-origin",
      },
    );

    const data = await response.json().catch(() => ({}));

    /* Authentication */

    if (response.status === 401) {
      showToast(
        data.message || "Your session has expired.",
        "error",
        "Session Expired",
      );

      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);

      return;
    }

    /* API Error */

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to update listing status.");
    }

    /* ======================================================
       UPDATE LOCAL STATUS
    ====================================================== */

    const newStatus = String(data.status || "").toLowerCase();

    listing.status = newStatus === "paused" ? "Paused" : "Active";

    console.log("Listing status changed to:", listing.status);

    /* ======================================================
       RE-RENDER
    ====================================================== */

    refreshPage();

    /* ======================================================
       SUCCESS
    ====================================================== */

    showToast(data.message || `Listing ${actionText}d successfully.`);
  } catch (error) {
    console.error("Pause / Resume Listing Error:", error);

    showToast(
      error.message || "Unable to update listing status. Please try again.",
      "error",
    );
  }
}

/* ==========================================================
   DELETE LISTING
========================================================== */

async function deleteListing(id) {
  const listing = listings.find((item) => String(item.id) === String(id));

  if (!listing) {
    return;
  }

  const confirmed = await showConfirmModal({
    title: "Delete Listing?",

    message: `Are you sure you want to delete "${listing.title}"? This action cannot be undone.`,

    confirmText: "Delete Listing",

    type: "danger",
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/listings/${encodeURIComponent(id)}`, {
      method: "DELETE",

      headers: {
        Accept: "application/json",
      },

      credentials: "same-origin",
    });

    const data = await response.json().catch(() => ({}));

    /* Authentication */

    if (response.status === 401) {
      showToast(
        data.message || "Your session has expired.",
        "error",
        "Session Expired",
      );

      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);

      return;
    }

    /* API Error */

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to delete the listing.");
    }

    /* Success */

    showToast(data.message || "Listing deleted successfully.");

    /* Reload listings */

    await loadListings();
  } catch (error) {
    console.error("Delete Listing Error:", error);

    showToast(
      error.message || "Unable to delete the listing. Please try again.",
      "error",
    );
  }
}

/* ==========================================================
   LOADING STATE
========================================================== */

function showLoading(show) {
  if (!loadingState) {
    return;
  }

  if (show) {
    loadingState.classList.remove("hidden");

    listingsContainer.classList.add("hidden");

    emptyState.classList.add("hidden");
  } else {
    loadingState.classList.add("hidden");
  }
}

/* ==========================================================
   ERROR MESSAGE
========================================================== */

function showErrorMessage(message) {
  listingsContainer.innerHTML = "";

  listingsContainer.classList.add("hidden");

  emptyState.classList.remove("hidden");

  const title = emptyState.querySelector("h2");

  const paragraph = emptyState.querySelector("p");

  if (title) {
    title.textContent = "Unable to Load Listings";
  }

  if (paragraph) {
    paragraph.textContent = message;
  }

  console.error(message);
}

/* ==========================================================
   LAST UPDATED
========================================================== */

function updateLastUpdated() {
  const element = document.getElementById("lastUpdated");

  if (!element) {
    return;
  }

  element.textContent = "Just now";
}

/* ==========================================================
   PROFILE DROPDOWN
========================================================== */

function setupProfileDropdown() {
  const profileMenuBtn = document.getElementById("profileMenuBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  const profileWrapper = document.querySelector(".profile-wrapper");

  if (!profileMenuBtn || !profileDropdown) {
    return;
  }

  profileMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const isHidden = profileDropdown.classList.contains("hidden");
    if (isHidden) {
      profileDropdown.classList.remove("hidden");
      profileWrapper?.classList.add("active");
    } else {
      profileDropdown.classList.add("hidden");
      profileWrapper?.classList.remove("active");
    }
  });

  profileDropdown.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", (event) => {
    if (
      !profileDropdown.contains(event.target) &&
      !profileMenuBtn.contains(event.target)
    ) {
      profileDropdown.classList.add("hidden");
      profileWrapper?.classList.remove("active");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      profileDropdown.classList.add("hidden");
      profileWrapper?.classList.remove("active");
    }
  });
}
