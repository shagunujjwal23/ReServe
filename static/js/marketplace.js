/* ==========================================================
   ReServe Marketplace
========================================================== */

const MARKETPLACE_API = "/api/listings";

/* ==========================================================
   Global State
========================================================== */

let listings = [];
let filteredListings = [];

/* ==========================================================
   DOM Elements
========================================================== */

const listingsContainer = document.getElementById("listingsContainer");
const listingTemplate = document.getElementById("listingTemplate");

const listingSearch = document.getElementById("listingSearch");
const categoryFilter = document.getElementById("categoryFilter");
const providerFilter = document.getElementById("providerFilter");
const locationFilter = document.getElementById("locationFilter");
const sortBy = document.getElementById("sortBy");
const vegOnlyToggle = document.getElementById("vegOnlyToggle");
const clearFilters = document.getElementById("clearFilters");

const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");

/* ==========================================================
   INIT
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  attachEventListeners();
  loadListings();
  loadUserProfile();
});

/* ==========================================================
   LOAD USER PROFILE
========================================================== */

async function loadUserProfile() {
  try {
    const response = await fetch("/api/user/profile", {
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok || !data.success) return;

    document.getElementById("profileName").textContent =
      data.user?.name || "User";

    document.getElementById("profileRole").textContent =
      data.user?.role || "User";

    if (data.user?.profile_image) {
      document.getElementById("profileImage").src = data.user.profile_image;
    }
  } catch (error) {
    console.error("Profile Load Error:", error);
  }
}

/* ==========================================================
   LOAD LISTINGS
========================================================== */

async function loadListings() {
  showLoading(true);

  try {
    const response = await fetch(MARKETPLACE_API, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load listings");
    }

    listings = Array.isArray(data.listings)
      ? data.listings.map(normalizeListing)
      : [];

    filteredListings = [...listings];

    populateCategoryFilter();
    populateProviderFilter();
    populateLocationFilter();
    applyFilters();
  } catch (error) {
    console.error(error);
    showEmptyState("Unable to load food listings. Please try again later.");
  } finally {
    showLoading(false);
  }
}

/* ==========================================================
   NORMALIZE LISTING
========================================================== */

function normalizeListing(listing) {
  return {
    id: listing.id,

    title: listing.food_title || "Food Item",

    description:
      listing.description || "Fresh surplus food available for pickup.",

    category: listing.category || "Other",

    foodType: (listing.food_type || "").trim().toLowerCase(),

    quantity:
      listing.quantity && listing.unit
        ? `${listing.quantity} ${listing.unit}`
        : "N/A",

    providerName:
      listing.provider_name || listing.business_name || "Food Provider",

    providerLocation: listing.city || listing.address || "Location unavailable",

    image: listing.image || "/static/images/food-placeholder.jpg",

    discountedPrice: Number(listing.discounted_price) || 0,

    originalPrice: Number(listing.original_price) || 0,

    pickupTime: formatPickupTime(listing.pickup_start, listing.pickup_end),

    expiryDate: listing.expiry_date,

    createdAt: listing.created_at,

    status: listing.status || "Available",
  };
}

/* ==========================================================
   POPULATE CATEGORY FILTER
========================================================== */

function populateCategoryFilter() {
  const categories = [
    ...new Set(listings.map((listing) => listing.category).filter(Boolean)),
  ];

  categoryFilter.innerHTML = '<option value="">All Categories</option>';

  categories.forEach((category) => {
    const option = document.createElement("option");

    option.value = category;
    option.textContent = category;

    categoryFilter.appendChild(option);
  });
}

/* ==========================================================
   APPLY FILTERS
========================================================== */

function applyFilters() {
  const searchValue = listingSearch.value.trim().toLowerCase();

  const categoryValue = categoryFilter.value;

  const providerValue = providerFilter.value;

  const locationValue = locationFilter.value;

  const sortValue = sortBy.value;

  const vegOnly = vegOnlyToggle.checked;

  filteredListings = listings.filter((listing) => {
    const matchesSearch =
      listing.title.toLowerCase().includes(searchValue) ||
      listing.providerName.toLowerCase().includes(searchValue) ||
      listing.category.toLowerCase().includes(searchValue);

    const matchesCategory =
      !categoryValue || listing.category === categoryValue;

    const matchesProvider =
      !providerValue || listing.providerName === providerValue;

    const matchesLocation =
      !locationValue || listing.providerLocation === locationValue;

    const matchesVeg = !vegOnly || listing.foodType.includes("veg");

    return (
      matchesSearch &&
      matchesCategory &&
      matchesProvider &&
      matchesLocation &&
      matchesVeg
    );
  });

  sortListings(sortValue);

  renderListings();
}

/* ==========================================================
   SORT
========================================================== */

function sortListings(sortValue) {
  switch (sortValue) {
    case "newest":
      filteredListings.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      break;

    case "expiry":
      filteredListings.sort(
        (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate),
      );
      break;

    case "priceLow":
      filteredListings.sort((a, b) => a.discountedPrice - b.discountedPrice);
      break;

    case "priceHigh":
      filteredListings.sort((a, b) => b.discountedPrice - a.discountedPrice);
      break;
  }
}

/* ==========================================================
   RENDER LISTINGS
========================================================== */

function renderListings() {
  listingsContainer.innerHTML = "";

  if (!filteredListings.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  filteredListings.forEach((listing) => {
    const clone = listingTemplate.content.cloneNode(true);

    const card = clone.querySelector(".listing-card");

    card.dataset.id = listing.id;

    clone.querySelector(".food-image").src = listing.image;

    clone.querySelector(".food-name").textContent = listing.title;

    clone.querySelector(".provider-name").innerHTML = `
  <span class="provider-text">${listing.providerName}</span>
  <i class="ri-verified-badge-fill verified-icon"></i>
`;

    const providerImage = clone.querySelector(".provider-image");

    if (providerImage) {
      providerImage.remove();
    }

    clone.querySelector(".quantity").textContent = listing.quantity;

    clone.querySelector(".pickup-time").textContent = listing.pickupTime;

    const locationElement = clone.querySelector(".listing-location");

    if (locationElement) {
      locationElement.textContent = listing.providerLocation;
    }

    clone.querySelector(".status-badge").textContent = listing.status;

    const currentPrice = clone.querySelector(".current-price");

    currentPrice.textContent =
      listing.discountedPrice > 0 ? `₹${listing.discountedPrice}` : "Free";

    const oldPrice = clone.querySelector(".old-price");

    if (listing.originalPrice > listing.discountedPrice) {
      oldPrice.textContent = `₹${listing.originalPrice}`;
    } else {
      oldPrice.style.display = "none";
    }

    const viewBtn = clone.querySelector(".view-btn");

    viewBtn.addEventListener("click", () => {
      window.location.href = `/listing/${listing.id}`;
    });

    listingsContainer.appendChild(clone);
  });
}

/* ==========================================================
   EVENTS
========================================================== */

function attachEventListeners() {
  listingSearch?.addEventListener("input", applyFilters);

  categoryFilter?.addEventListener("change", applyFilters);

  providerFilter?.addEventListener("change", applyFilters);

  locationFilter?.addEventListener("change", applyFilters);

  sortBy?.addEventListener("change", applyFilters);

  vegOnlyToggle?.addEventListener("change", applyFilters);

  clearFilters?.addEventListener("click", resetFilters);
}

/* ==========================================================
   RESET FILTERS
========================================================== */

function resetFilters() {
  listingSearch.value = "";
  categoryFilter.value = "";
  providerFilter.value = "";
  locationFilter.value = "";
  sortBy.value = "";
  vegOnlyToggle.checked = false;

  applyFilters();
}

/* ==========================================================
   UTILITIES
========================================================== */

function formatPickupTime(start, end) {
  if (!start && !end) {
    return "Pickup Time Not Available";
  }

  const startTime = start
    ? new Date(start).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const endTime = end
    ? new Date(end).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return `${startTime} - ${endTime}`;
}

function showLoading(show) {
  if (!loadingState) return;

  if (show) {
    loadingState.classList.remove("hidden");
  } else {
    loadingState.classList.add("hidden");
  }
}

function showEmptyState(message) {
  emptyState.classList.remove("hidden");

  const text = emptyState.querySelector("p");

  if (text) {
    text.textContent = message;
  }
}

function populateProviderFilter() {
  const providers = [
    ...new Set(listings.map((listing) => listing.providerName).filter(Boolean)),
  ];

  providerFilter.innerHTML = '<option value="">All Providers</option>';

  providers.forEach((provider) => {
    const option = document.createElement("option");

    option.value = provider;
    option.textContent = provider;

    providerFilter.appendChild(option);
  });
}

function populateLocationFilter() {
  const locations = [
    ...new Set(
      listings.map((listing) => listing.providerLocation).filter(Boolean),
    ),
  ];

  locationFilter.innerHTML = '<option value="">All Locations</option>';

  locations.forEach((location) => {
    const option = document.createElement("option");

    option.value = location;
    option.textContent = location;

    locationFilter.appendChild(option);
  });
}
