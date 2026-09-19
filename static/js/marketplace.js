/* ==========================================================
   ReServe Marketplace / Explore Food
========================================================== */

const MARKETPLACE_API = "/api/listings";
const PROFILE_API = "/api/user/profile";

/* ==========================================================
   Global State
========================================================== */

let listings = [];
let filteredListings = [];

let currentUser = null;
let selectedCity = "";

let visibleListingCount = 12;
const LISTINGS_PER_LOAD = 12;

/* ==========================================================
   DOM Elements
========================================================== */

const listingsContainer = document.getElementById("listingsContainer");

const listingTemplate = document.getElementById("listingTemplate");

const listingSearch = document.getElementById("listingSearch");

const searchBtn = document.getElementById("searchBtn");

const searchClearBtn = document.getElementById("searchClearBtn");

const searchSuggestions = document.getElementById("searchSuggestions");

const categoryFilter = document.getElementById("categoryFilter");

const providerFilter = document.getElementById("providerFilter");

const locationFilter = document.getElementById("locationFilter");

const foodTypeFilter = document.getElementById("foodTypeFilter");

const priceFilter = document.getElementById("priceFilter");

const sortBy = document.getElementById("sortBy");

const vegOnlyToggle = document.getElementById("vegOnlyToggle");

const clearFilters = document.getElementById("clearFilters");

const filterToggle = document.getElementById("filterToggle");

const filterPanel = document.getElementById("advancedFilterPanel");

const filterPanelClose = document.getElementById("filterPanelClose");

const activeFilters = document.getElementById("activeFilters");

const emptyState = document.getElementById("emptyState");

const emptyResetBtn = document.getElementById("emptyResetBtn");

const loadingState = document.getElementById("loadingState");

const loadMoreWrapper = document.getElementById("loadMoreWrapper");

const loadMoreBtn = document.getElementById("loadMoreBtn");

const listingLocationText = document.getElementById("listingLocationText");

/* ==========================================================
   INIT
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  attachEventListeners();

  await loadUserProfile();

  await loadListings();

  setupProfileDropdown();
  setupLogout();
});

/* ==========================================================
   LOAD USER PROFILE
========================================================== */

async function loadUserProfile() {
  try {
    const response = await fetch(PROFILE_API, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load user profile");
    }

    currentUser = data.user || {};

    /* ------------------------------------------
       Profile information
    ------------------------------------------ */

    const profileName = document.getElementById("profileName");

    const profileRole = document.getElementById("profileRole");

    const profileImage = document.getElementById("profileImage");

    if (profileName) {
      profileName.textContent = currentUser.name || "User";
    }

    if (profileRole) {
      profileRole.textContent = currentUser.role || "User";
    }

    if (profileImage && currentUser.profile_image) {
      profileImage.src = currentUser.profile_image;
    }

    /* ------------------------------------------
       IMPORTANT:
       Get city from Dashboard/User Profile
    ------------------------------------------ */

    selectedCity = getUserCity(currentUser);

    updateLocationText();
  } catch (error) {
    console.error("Profile Load Error:", error);

    selectedCity = "";

    updateLocationText();
  }
}

/* ==========================================================
   GET USER CITY
========================================================== */

function getUserCity(user) {
  if (!user) {
    return "";
  }

  return String(user.city || user.current_city || user.location_city || "")
    .trim()
    .toLowerCase();
}

/* ==========================================================
   UPDATE CITY TEXT
========================================================== */

function updateLocationText() {
  if (!listingLocationText) {
    return;
  }

  if (selectedCity) {
    const formattedCity = formatCityName(selectedCity);

    listingLocationText.textContent = `Fresh food available in ${formattedCity}`;
  } else {
    listingLocationText.textContent =
      "Fresh food available in your selected city";
  }
}

/* ==========================================================
   CITY NAME FORMAT
========================================================== */

function formatCityName(city) {
  return String(city)
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

    const rawListings = Array.isArray(data.listings) ? data.listings : [];

    /* ------------------------------------------
   Marketplace shows ONLY food for sale
   Donations are handled separately by NGOs.
------------------------------------------ */

    const saleListings = rawListings.filter((listing) => {
      const listingType = String(listing.listing_type || "sell")
        .trim()
        .toLowerCase();

      return listingType === "sell";
    });

    /* ------------------------------------------
   Normalize sale listings only
------------------------------------------ */

    const normalizedListings = saleListings.map(normalizeListing);

    /* ------------------------------------------
       CITY FILTER
       
       Dashboard city controls Marketplace.
       
       Example:
       User City = Lucknow
       → only Lucknow listings
       
       User City = Delhi
       → only Delhi listings
    ------------------------------------------ */

    if (selectedCity) {
      listings = normalizedListings.filter(
        (listing) => normalizeLocation(listing.city) === selectedCity,
      );
    } else {
      /*
       If no city is available yet,
       keep listings rather than showing
       a completely blank marketplace.
      */

      listings = normalizedListings;
    }

    filteredListings = [...listings];

    /* ------------------------------------------
       Populate filters AFTER city filtering
       
       This is important.
       
       If user is in Lucknow,
       Area dropdown should contain
       Lucknow areas only.
    ------------------------------------------ */

    populateCategoryFilter();
    populateProviderFilter();
    populateLocationFilter();
    populateFoodTypeFilter();

    applyFilters();
  } catch (error) {
    console.error("Marketplace Load Error:", error);

    listings = [];
    filteredListings = [];

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
    id: listing.id || listing._id || "",

    title: listing.food_title || listing.foodName || "Food Item",

    description:
      listing.description || "Fresh surplus food available for pickup.",

    category: listing.category || "Other",

    foodType: String(listing.food_type || listing.foodType || "")
      .trim()
      .toLowerCase(),

    quantity:
      listing.quantity && listing.unit
        ? `${listing.quantity} ${listing.unit}`
        : "N/A",

    providerName:
      listing.provider_name ||
      listing.providerName ||
      listing.business_name ||
      "Food Provider",

    /*
      IMPORTANT:
      Keep city and area separately.
    */

    city: listing.city || "",

    area: listing.area || listing.location || listing.address || "",

    providerLocation:
      listing.area ||
      listing.location ||
      listing.address ||
      "Location unavailable",

    image: listing.image || "/static/images/food-placeholder.jpg",

    discountedPrice: Number(listing.discounted_price) || 0,

    originalPrice: Number(listing.original_price) || 0,

    listingType: String(listing.listing_type || "sell")
      .trim()
      .toLowerCase(),

    pickupTime: formatPickupTime(listing.pickup_start, listing.pickup_end),

    expiryDate: listing.expiry_date || "",

    createdAt: listing.created_at || "",

    status: listing.status || "Available",

    distance: Number(listing.distance) || 0,

    views: Number(listing.views) || 0,

    isFavorite: Boolean(listing.is_favorite || listing.isFavorite),
  };
}

/* ==========================================================
   LOCATION NORMALIZATION
========================================================== */

function normalizeLocation(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/* ==========================================================
   POPULATE CATEGORY FILTER
========================================================== */

function populateCategoryFilter() {
  if (!categoryFilter) {
    return;
  }

  const categories = [
    ...new Set(listings.map((listing) => listing.category).filter(Boolean)),
  ].sort();

  categoryFilter.innerHTML = '<option value="">All Categories</option>';

  categories.forEach((category) => {
    const option = document.createElement("option");

    option.value = category;
    option.textContent = category;

    categoryFilter.appendChild(option);
  });
}

/* ==========================================================
   POPULATE PROVIDER FILTER
========================================================== */

function populateProviderFilter() {
  if (!providerFilter) {
    return;
  }

  const providers = [
    ...new Set(listings.map((listing) => listing.providerName).filter(Boolean)),
  ].sort();

  providerFilter.innerHTML = '<option value="">All Partners</option>';

  providers.forEach((provider) => {
    const option = document.createElement("option");

    option.value = provider;
    option.textContent = provider;

    providerFilter.appendChild(option);
  });
}

/* ==========================================================
   POPULATE AREA FILTER
========================================================== */

function populateLocationFilter() {
  if (!locationFilter) {
    return;
  }

  const locations = [
    ...new Set(listings.map((listing) => listing.area).filter(Boolean)),
  ].sort();

  locationFilter.innerHTML = '<option value="">All Areas</option>';

  locations.forEach((location) => {
    const option = document.createElement("option");

    option.value = location;
    option.textContent = location;

    locationFilter.appendChild(option);
  });
}

/* ==========================================================
   POPULATE FOOD TYPE FILTER
========================================================== */

function populateFoodTypeFilter() {
  if (!foodTypeFilter) {
    return;
  }

  const foodTypes = [
    ...new Set(listings.map((listing) => listing.foodType).filter(Boolean)),
  ];

  foodTypeFilter.innerHTML = '<option value="">All Food Types</option>';

  foodTypes.forEach((type) => {
    const option = document.createElement("option");

    option.value = type;
    option.textContent = formatFoodType(type);

    foodTypeFilter.appendChild(option);
  });
}

/* ==========================================================
   FORMAT FOOD TYPE
========================================================== */

function formatFoodType(type) {
  return String(type)
    .split(/[\s-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* ==========================================================
   APPLY FILTERS
========================================================== */

function applyFilters() {
  const searchValue = listingSearch?.value.trim().toLowerCase() || "";

  const categoryValue = categoryFilter?.value || "";

  const providerValue = providerFilter?.value || "";

  const locationValue = locationFilter?.value || "";

  const foodTypeValue = foodTypeFilter?.value || "";

  const priceValue = priceFilter?.value || "";

  const sortValue = sortBy?.value || "nearest";

  const vegOnly = Boolean(vegOnlyToggle?.checked);

  filteredListings = listings.filter((listing) => {
    /* --------------------------------------
         Search
      -------------------------------------- */

    const searchableText = [
      listing.title,
      listing.providerName,
      listing.category,
      listing.foodType,
      listing.area,
      listing.city,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !searchValue || searchableText.includes(searchValue);

    /* --------------------------------------
         Category
      -------------------------------------- */

    const matchesCategory =
      !categoryValue ||
      normalizeLocation(listing.category) === normalizeLocation(categoryValue);

    /* --------------------------------------
         Provider
      -------------------------------------- */

    const matchesProvider =
      !providerValue ||
      normalizeLocation(listing.providerName) ===
        normalizeLocation(providerValue);

    /* --------------------------------------
         Area
      -------------------------------------- */

    const matchesLocation =
      !locationValue ||
      normalizeLocation(listing.area) === normalizeLocation(locationValue);

    /* --------------------------------------
         Food Type
      -------------------------------------- */

    const matchesFoodType =
      !foodTypeValue ||
      normalizeLocation(listing.foodType) === normalizeLocation(foodTypeValue);

    /* --------------------------------------
         Vegetarian
      -------------------------------------- */

    const matchesVeg = !vegOnly || listing.foodType.includes("veg");

    /* --------------------------------------
         Price
      -------------------------------------- */

    const price = listing.discountedPrice;

    let matchesPrice = true;

    switch (priceValue) {
      case "under50":
        matchesPrice = price < 50;
        break;

      case "50to100":
        matchesPrice = price >= 50 && price <= 100;
        break;

      case "100to250":
        matchesPrice = price > 100 && price <= 250;
        break;

      case "above250":
        matchesPrice = price > 250;
        break;
    }

    return (
      matchesSearch &&
      matchesCategory &&
      matchesProvider &&
      matchesLocation &&
      matchesFoodType &&
      matchesVeg &&
      matchesPrice
    );
  });

  sortListings(sortValue);

  visibleListingCount = LISTINGS_PER_LOAD;

  updateActiveFilters();

  renderListings();
}

/* ==========================================================
   SORT LISTINGS
========================================================== */

function sortListings(sortValue) {
  switch (sortValue) {
    case "newest":
      filteredListings.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

      break;

    case "expiry":
      filteredListings.sort((a, b) => {
        const dateA = a.expiryDate
          ? new Date(a.expiryDate).getTime()
          : Infinity;

        const dateB = b.expiryDate
          ? new Date(b.expiryDate).getTime()
          : Infinity;

        return dateA - dateB;
      });

      break;

    case "priceLow":
      filteredListings.sort((a, b) => a.discountedPrice - b.discountedPrice);

      break;

    case "priceHigh":
      filteredListings.sort((a, b) => b.discountedPrice - a.discountedPrice);

      break;

    case "nearest":
      filteredListings.sort((a, b) => a.distance - b.distance);

      break;
  }
}

/* ==========================================================
   RENDER LISTINGS
========================================================== */

function renderListings() {
  if (!listingsContainer) {
    return;
  }

  listingsContainer.innerHTML = "";

  if (!filteredListings.length) {
    emptyState?.classList.remove("hidden");

    loadMoreWrapper?.classList.add("hidden");

    return;
  }

  emptyState?.classList.add("hidden");

  const visibleListings = filteredListings.slice(0, visibleListingCount);

  visibleListings.forEach((listing) => {
    const clone = listingTemplate.content.cloneNode(true);

    const card = clone.querySelector(".listing-card");

    card.dataset.id = listing.id;

    /* --------------------------------------
         Image
      -------------------------------------- */

    const image = clone.querySelector(".food-image");

    image.src = listing.image;

    image.alt = listing.title;

    image.onerror = () => {
      image.src = "/static/images/food-placeholder.jpg";
    };

    /* --------------------------------------
         Food name
      -------------------------------------- */

    clone.querySelector(".food-name").textContent = listing.title;

    /* --------------------------------------
         Provider
      -------------------------------------- */

    const providerName = clone.querySelector(".provider-text");

    if (providerName) {
      providerName.textContent = listing.providerName;
    }

    /* --------------------------------------
         Category
      -------------------------------------- */

    const categoryTag = clone.querySelector(".category-tag");

    if (categoryTag) {
      categoryTag.textContent = listing.category;
    }

    /* --------------------------------------
         Food type
      -------------------------------------- */

    const foodTypeTag = clone.querySelector(".food-type-tag");

    if (foodTypeTag) {
      const foodType = normalizeLocation(listing.foodType);

      foodTypeTag.classList.remove("veg", "nonveg");

      if (foodType === "vegetarian" || foodType === "veg") {
        foodTypeTag.classList.add("veg");
        foodTypeTag.title = "Vegetarian";
      } else {
        foodTypeTag.classList.add("nonveg");
        foodTypeTag.title = "Non-Vegetarian";
      }
    }

    /* --------------------------------------
         Distance
      -------------------------------------- */

    const distance = clone.querySelector(".distance");

    if (distance) {
      if (listing.distance && listing.distance > 0) {
        distance.textContent = `${listing.distance.toFixed(1)} km`;
      } else {
        distance.textContent = listing.area || "Local pickup";
      }
    }

    /* --------------------------------------
         Pickup
      -------------------------------------- */

    const pickupTime = clone.querySelector(".pickup-time");

    if (pickupTime) {
      pickupTime.textContent = listing.pickupTime;
    }

    /* --------------------------------------
         Status
      -------------------------------------- */

    const statusBadge = clone.querySelector(".status-badge");

    if (statusBadge) {
      statusBadge.textContent = formatStatus(listing.status);
    }

    /* --------------------------------------
         Price
      -------------------------------------- */

    const currentPrice = clone.querySelector(".current-price");

    const oldPrice = clone.querySelector(".old-price");

    const discountBadge = clone.querySelector(".discount-badge");

    if (listing.listingType === "donation") {
      currentPrice.textContent = "Free";

      oldPrice.style.display = "none";

      discountBadge.style.display = "none";
    } else {
      currentPrice.textContent =
        listing.discountedPrice > 0 ? `₹${listing.discountedPrice}` : "Free";

      if (listing.originalPrice > listing.discountedPrice) {
        oldPrice.textContent = `₹${listing.originalPrice}`;

        oldPrice.style.display = "";

        const discount = Math.round(
          ((listing.originalPrice - listing.discountedPrice) /
            listing.originalPrice) *
            100,
        );

        if (discountBadge && discount > 0) {
          discountBadge.textContent = `${discount}% OFF`;

          discountBadge.style.display = "";
        }
      } else {
        oldPrice.style.display = "none";

        if (discountBadge) {
          discountBadge.style.display = "none";
        }
      }
    }

    /* --------------------------------------
         Favorite
      -------------------------------------- */

    const favoriteBtn = clone.querySelector(".favorite-btn");

    if (favoriteBtn) {
      if (listing.isFavorite) {
        favoriteBtn.classList.add("active");

        favoriteBtn.innerHTML = '<i class="ri-heart-3-fill"></i>';
      }

      favoriteBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        toggleFavorite(listing, favoriteBtn);
      });
    }

    /* --------------------------------------
         View Details
      -------------------------------------- */

    const viewBtn = clone.querySelector(".view-btn");

    if (viewBtn) {
      viewBtn.addEventListener("click", () => {
        window.location.href = `/listing/${encodeURIComponent(listing.id)}`;
      });
    }

    listingsContainer.appendChild(clone);
  });

  /* ----------------------------------------
     Load More
  ---------------------------------------- */

  if (loadMoreWrapper && loadMoreBtn) {
    if (visibleListingCount < filteredListings.length) {
      loadMoreWrapper.classList.remove("hidden");
    } else {
      loadMoreWrapper.classList.add("hidden");
    }
  }
}

/* ==========================================================
   SEARCH SUGGESTIONS
========================================================== */

function showSearchSuggestions() {
  if (!searchSuggestions || !listingSearch) {
    return;
  }

  const query = listingSearch.value.trim().toLowerCase();

  if (!query) {
    searchSuggestions.classList.add("hidden");

    return;
  }

  const matches = listings
    .filter((listing) => {
      const text = [
        listing.title,
        listing.providerName,
        listing.category,
        listing.foodType,
        listing.area,
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    })
    .sort((a, b) => {
      const aTitle = a.title.toLowerCase();

      const bTitle = b.title.toLowerCase();

      const aScore =
        aTitle === query
          ? 4
          : aTitle.startsWith(query)
            ? 3
            : aTitle.includes(query)
              ? 2
              : 1;

      const bScore =
        bTitle === query
          ? 4
          : bTitle.startsWith(query)
            ? 3
            : bTitle.includes(query)
              ? 2
              : 1;

      return bScore - aScore;
    })
    .slice(0, 6);

  if (!matches.length) {
    searchSuggestions.innerHTML = `
      <div class="search-no-results">
        <i class="ri-search-line"></i>
        <span>No matching food or restaurant found</span>
      </div>
    `;

    searchSuggestions.classList.remove("hidden");

    return;
  }

  searchSuggestions.innerHTML = matches
    .map((listing) => {
      return `
          <button
            type="button"
            class="search-suggestion"
            data-id="${escapeAttribute(listing.id)}"
          >

            <img
              src="${escapeAttribute(listing.image)}"
              alt="${escapeAttribute(listing.title)}"
              onerror="this.src='/static/images/food-placeholder.jpg'"
            />

            <span class="search-suggestion-content">

              <strong>
                ${escapeHTML(listing.title)}
              </strong>

              <small>
                ${escapeHTML(listing.providerName)}
              </small>

            </span>

            <span class="search-suggestion-category">
              ${escapeHTML(listing.category)}
            </span>

            <i class="ri-arrow-right-s-line"></i>

          </button>
        `;
    })
    .join("");

  searchSuggestions.classList.remove("hidden");

  searchSuggestions.querySelectorAll(".search-suggestion").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const id = button.dataset.id;

      if (!id) {
        return;
      }

      searchSuggestions.classList.add("hidden");

      window.location.href = `/listing/${encodeURIComponent(id)}`;
    });
  });
}

/* ==========================================================
   SEARCH BUTTON
========================================================== */

function performSearch() {
  const query = listingSearch?.value.trim();

  if (!query) {
    searchSuggestions?.classList.add("hidden");

    applyFilters();

    return;
  }

  searchSuggestions?.classList.add("hidden");

  applyFilters();
}

/* ==========================================================
   SEARCH CLEAR
========================================================== */

function updateSearchClearButton() {
  if (!searchClearBtn) {
    return;
  }

  if (listingSearch?.value.trim()) {
    searchClearBtn.classList.remove("hidden");
  } else {
    searchClearBtn.classList.add("hidden");
  }
}

/* ==========================================================
   LOAD MORE
========================================================== */

function loadMoreListings() {
  visibleListingCount += LISTINGS_PER_LOAD;

  renderListings();
}

/* ==========================================================
   UPDATE ACTIVE FILTERS
========================================================== */

function updateActiveFilters() {
  if (!activeFilters) {
    return;
  }

  activeFilters.innerHTML = "";

  const filters = [];

  if (categoryFilter?.value) {
    filters.push(`Category: ${categoryFilter.value}`);
  }

  if (providerFilter?.value) {
    filters.push(`Partner: ${providerFilter.value}`);
  }

  if (locationFilter?.value) {
    filters.push(`Area: ${locationFilter.value}`);
  }

  if (foodTypeFilter?.value) {
    filters.push(`Food Type: ${formatFoodType(foodTypeFilter.value)}`);
  }

  if (priceFilter?.value) {
    filters.push(`Price: ${getPriceLabel(priceFilter.value)}`);
  }

  if (vegOnlyToggle?.checked) {
    filters.push("Vegetarian Only");
  }

  if (!filters.length) {
    activeFilters.classList.add("hidden");

    return;
  }

  filters.forEach((filter) => {
    const span = document.createElement("span");

    span.className = "active-filter";

    span.textContent = filter;

    activeFilters.appendChild(span);
  });

  activeFilters.classList.remove("hidden");
}

/* ==========================================================
   PRICE LABEL
========================================================== */

function getPriceLabel(value) {
  switch (value) {
    case "under50":
      return "Under ₹50";

    case "50to100":
      return "₹50 – ₹100";

    case "100to250":
      return "₹100 – ₹250";

    case "above250":
      return "Above ₹250";

    default:
      return "Any Price";
  }
}

/* ==========================================================
   RESET FILTERS
========================================================== */

function resetFilters() {
  if (listingSearch) {
    listingSearch.value = "";
  }

  if (categoryFilter) {
    categoryFilter.value = "";
  }

  if (providerFilter) {
    providerFilter.value = "";
  }

  if (locationFilter) {
    locationFilter.value = "";
  }

  if (foodTypeFilter) {
    foodTypeFilter.value = "";
  }

  if (priceFilter) {
    priceFilter.value = "";
  }

  if (sortBy) {
    sortBy.value = "nearest";
  }

  if (vegOnlyToggle) {
    vegOnlyToggle.checked = false;
  }

  updateSearchClearButton();

  applyFilters();
}

/* ==========================================================
   FAVORITES
========================================================== */

async function toggleFavorite(listing, button) {
  try {
    const response = await fetch("/api/favorites/toggle", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        listing_id: listing.id,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to update favorite");
    }

    listing.isFavorite = !listing.isFavorite;

    if (listing.isFavorite) {
      button.classList.add("active");

      button.innerHTML = '<i class="ri-heart-3-fill"></i>';
    } else {
      button.classList.remove("active");

      button.innerHTML = '<i class="ri-heart-3-line"></i>';
    }
  } catch (error) {
    console.error("Favorite Error:", error);
  }
}

/* ==========================================================
   FILTER PANEL
========================================================== */

function toggleFilterPanel() {
  if (!filterPanel) {
    return;
  }

  filterPanel.classList.toggle("hidden");
}

function closeFilterPanel() {
  filterPanel?.classList.add("hidden");
}

/* ==========================================================
   EVENTS
========================================================== */

function attachEventListeners() {
  /* Search typing */

  listingSearch?.addEventListener("input", () => {
    updateSearchClearButton();

    showSearchSuggestions();
  });

  /* Enter key */

  listingSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      performSearch();
    }
  });

  /* Search button */

  searchBtn?.addEventListener("click", performSearch);

  /* Clear search */

  searchClearBtn?.addEventListener("click", () => {
    listingSearch.value = "";

    updateSearchClearButton();

    searchSuggestions?.classList.add("hidden");

    applyFilters();
  });

  /* Filters */

  categoryFilter?.addEventListener("change", applyFilters);

  providerFilter?.addEventListener("change", applyFilters);

  locationFilter?.addEventListener("change", applyFilters);

  foodTypeFilter?.addEventListener("change", applyFilters);

  priceFilter?.addEventListener("change", applyFilters);

  sortBy?.addEventListener("change", applyFilters);

  vegOnlyToggle?.addEventListener("change", applyFilters);

  /* Clear filters */

  clearFilters?.addEventListener("click", resetFilters);

  emptyResetBtn?.addEventListener("click", resetFilters);

  /* Filter panel */

  filterToggle?.addEventListener("click", toggleFilterPanel);

  filterPanelClose?.addEventListener("click", closeFilterPanel);

  /* Load more */

  loadMoreBtn?.addEventListener("click", loadMoreListings);

  /* Close search suggestions
     when clicking elsewhere */

  document.addEventListener("click", (event) => {
    const clickedSearch = listingSearch?.contains(event.target);

    const clickedSuggestions = searchSuggestions?.contains(event.target);

    const clickedSearchButton = searchBtn?.contains(event.target);

    if (!clickedSearch && !clickedSuggestions && !clickedSearchButton) {
      searchSuggestions?.classList.add("hidden");
    }
  });
}

/* ==========================================================
   PROFILE DROPDOWN
========================================================== */

function setupProfileDropdown() {
  const profileMenuBtn = document.getElementById("profileMenuBtn");

  const profileDropdown = document.getElementById("profileDropdown");

  if (!profileMenuBtn || !profileDropdown) {
    return;
  }

  profileMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    profileDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (
      !profileDropdown.contains(event.target) &&
      !profileMenuBtn.contains(event.target)
    ) {
      profileDropdown.classList.add("hidden");
    }
  });
}

/* ==========================================================
   LOGOUT
========================================================== */

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) {
    return;
  }

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout Error:", error);
    } finally {
      window.location.href = "/login";
    }
  });
}

/* ==========================================================
   FORMAT PICKUP TIME
========================================================== */

function formatPickupTime(start, end) {
  if (!start && !end) {
    return "Pickup time unavailable";
  }

  const formatTime = (value) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const startTime = formatTime(start);

  const endTime = formatTime(end);

  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }

  return startTime || endTime || "Pickup time unavailable";
}

/* ==========================================================
   FORMAT STATUS
========================================================== */

function formatStatus(status) {
  const value = String(status || "")
    .replace(/_/g, " ")
    .trim();

  if (!value) {
    return "Available";
  }

  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================
   ESCAPE ATTRIBUTE
========================================================== */

function escapeAttribute(value) {
  return escapeHTML(value);
}

/* ==========================================================
   LOADING
========================================================== */

function showLoading(show) {
  if (!loadingState) {
    return;
  }

  if (show) {
    loadingState.classList.remove("hidden");
  } else {
    loadingState.classList.add("hidden");
  }
}

/* ==========================================================
   EMPTY STATE
========================================================== */

function showEmptyState(message) {
  if (!emptyState) {
    return;
  }

  emptyState.classList.remove("hidden");

  const text = emptyState.querySelector("p");

  if (text) {
    text.textContent = message;
  }

  loadMoreWrapper?.classList.add("hidden");
}
