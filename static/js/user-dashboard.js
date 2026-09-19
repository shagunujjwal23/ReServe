/* ==========================================================
   ReServe - Individual User Dashboard
   Final Marketplace Dashboard
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
});

/* ==========================================================
   CONFIGURATION
========================================================== */

const API_BASE = "/api";

/* ==========================================================
   GLOBAL STATE
========================================================== */

let currentUser = null;
let currentLocation = null;

let nearbyListings = [];
let allListings = [];

/* ==========================================================
   DOM ELEMENTS
========================================================== */

const elements = {
  /* Profile */
  profileName: document.getElementById("profileName"),
  profileRole: document.getElementById("profileRole"),
  profileImage: document.getElementById("profileImage"),

  /* Location */
  userLocation: document.getElementById("userLocation"),
  locationBtn: document.getElementById("locationBtn"),

  /* Search */
  foodSearch: document.getElementById("foodSearch"),
  searchBtn: document.getElementById("searchBtn"),
  searchSuggestions: document.getElementById("searchSuggestions"),

  /* Listings */
  nearbyFoodGrid: document.getElementById("nearbyFoodGrid"),
  nearbyEmpty: document.getElementById("nearbyEmpty"),

  /* Notifications */
  notificationCount: document.getElementById("notificationCount"),

  /* Profile menu */
  profileMenuBtn: document.getElementById("profileMenuBtn"),
  profileDropdown: document.getElementById("profileDropdown"),
  logoutBtn: document.getElementById("logoutBtn"),

  /* Notification button */
  notificationBtn: document.getElementById("notificationBtn"),
};

/* ==========================================================
   INITIALIZE DASHBOARD
========================================================== */

async function initDashboard() {
  setupEventListeners();

  await loadUserProfile();

  await loadUserLocation();

  await Promise.all([loadNearbyListings(), loadNotificationCount()]);
}

/* ==========================================================
   EVENT LISTENERS
========================================================== */

function setupEventListeners() {
  /* --------------------------------------------------------
     Search
  -------------------------------------------------------- */

  elements.searchBtn?.addEventListener("click", handleSearch);

  elements.foodSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  });

  elements.foodSearch?.addEventListener("input", handleSearchSuggestions);

  /* --------------------------------------------------------
     Location
  -------------------------------------------------------- */

  elements.locationBtn?.addEventListener("click", changeLocation);

  /* --------------------------------------------------------
     Profile Dropdown
  -------------------------------------------------------- */

  elements.profileMenuBtn?.addEventListener("click", (event) => {
    event.stopPropagation();

    elements.profileDropdown?.classList.toggle("hidden");
  });

  /* Close dropdown */

  document.addEventListener("click", (event) => {
    if (
      elements.profileDropdown &&
      !elements.profileDropdown.contains(event.target) &&
      !elements.profileMenuBtn?.contains(event.target)
    ) {
      elements.profileDropdown.classList.add("hidden");
    }
  });

  /* --------------------------------------------------------
     Logout
  -------------------------------------------------------- */

  elements.logoutBtn?.addEventListener("click", logoutUser);

  /* --------------------------------------------------------
     Notifications
  -------------------------------------------------------- */

  elements.notificationBtn?.addEventListener("click", () => {
    window.location.href = "/notifications";
  });

  /* --------------------------------------------------------
   Close search suggestions on outside click
-------------------------------------------------------- */

  document.addEventListener("click", (event) => {
    if (!elements.foodSearch || !elements.searchSuggestions) {
      return;
    }

    const clickedSearch = elements.foodSearch.contains(event.target);

    const clickedSuggestions = elements.searchSuggestions.contains(
      event.target,
    );

    const clickedSearchButton = elements.searchBtn?.contains(event.target);

    if (!clickedSearch && !clickedSuggestions && !clickedSearchButton) {
      elements.searchSuggestions.classList.add("hidden");
    }
  });
}

/* ==========================================================
   USER PROFILE
========================================================== */

async function loadUserProfile() {
  try {
    const response = await fetch(`${API_BASE}/user/profile`, {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));

      if (data.success && data.profile) {
        currentUser = data.profile;

        localStorage.setItem("user", JSON.stringify(currentUser));

        updateUserProfile();

        return;
      }
    }

    /* ------------------------------------------------------
       Fallback to localStorage
    ------------------------------------------------------ */

    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        if (parsedUser && typeof parsedUser === "object") {
          currentUser = parsedUser;

          updateUserProfile();

          return;
        }
      } catch (error) {
        console.warn("Invalid stored user data.");
      }
    }

    /* Default */

    currentUser = {
      full_name: "User",
      role: "User",
      profile_image: null,
    };

    updateUserProfile();
  } catch (error) {
    console.error("Profile loading error:", error);

    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);

        updateUserProfile();

        return;
      } catch (error) {
        console.warn("Invalid stored user data.");
      }
    }

    currentUser = {
      full_name: "User",
      role: "User",
      profile_image: null,
    };

    updateUserProfile();
  }
}

/* ==========================================================
   UPDATE USER PROFILE
========================================================== */

function updateUserProfile() {
  if (!currentUser) {
    return;
  }

  const name = currentUser.full_name || "User";

  /* Profile name */

  if (elements.profileName) {
    elements.profileName.textContent = name;
  }

  /* Profile role */

  if (elements.profileRole) {
    elements.profileRole.textContent = formatRole(currentUser.role || "User");
  }

  /* Profile image */

  if (elements.profileImage) {
    const image =
      Array.isArray(currentUser.profile_images) &&
      currentUser.profile_images.length
        ? currentUser.profile_images[0]
        : currentUser.profile_image;

    if (image && typeof image === "string" && image.trim()) {
      elements.profileImage.src = image;
    }
  }
}

/* ==========================================================
   ROLE FORMATTER
========================================================== */

function formatRole(role) {
  if (!role) {
    return "User";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

/* ==========================================================
   LOCATION
========================================================== */

async function loadUserLocation() {
  try {
    const response = await fetch(`${API_BASE}/user/profile`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Unable to load profile");
    }

    const data = await response.json();

    if (data.success && data.profile) {
      currentLocation = {
        area: data.profile.area || "",

        city: data.profile.city || "",

        state: data.profile.state || "",

        address: data.profile.address || "",
      };

      updateLocationUI();

      return;
    }
  } catch (error) {
    console.error("Location load error:", error);
  }

  /* Fallback */

  const savedLocation = localStorage.getItem("reserveUserLocation");

  if (savedLocation) {
    try {
      currentLocation = JSON.parse(savedLocation);

      updateLocationUI();

      return;
    } catch (error) {
      console.warn("Invalid saved location.");
    }
  }

  currentLocation = {
    city: "Lucknow",
    state: "Uttar Pradesh",
    country: "India",
  };

  updateLocationUI();
}

/* ==========================================================
   LOCATION UI
========================================================== */

function updateLocationUI() {
  if (!currentLocation) {
    return;
  }

  let locationText = "";

  if (currentLocation.area && currentLocation.city) {
    locationText = `${currentLocation.area}, ${currentLocation.city}`;
  } else if (currentLocation.city) {
    locationText = currentLocation.city;
  } else {
    locationText = "Location not set";
  }

  if (elements.userLocation) {
    elements.userLocation.textContent = locationText;
  }
}

/* ==========================================================
   CHANGE LOCATION
========================================================== */

function changeLocation() {
  const currentCity = currentLocation?.city || "Lucknow";

  const city = prompt("Enter your city:", currentCity);

  if (!city || !city.trim()) {
    return;
  }

  currentLocation = {
    city: city.trim(),

    state: currentLocation?.state || "Uttar Pradesh",

    country: "India",
  };

  localStorage.setItem("reserveUserLocation", JSON.stringify(currentLocation));

  updateLocationUI();

  loadNearbyListings();
}

/* ==========================================================
   LOAD NEARBY LISTINGS
========================================================== */

async function loadNearbyListings() {
  showListingLoading();

  try {
    const response = await fetch(`${API_BASE}/listings`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Unable to load listings");
    }

    const data = await response.json();

    allListings = Array.isArray(data.listings) ? data.listings : [];

    const userArea = (currentLocation?.area || "").trim().toLowerCase();

    const userCity = (currentLocation?.city || "").trim().toLowerCase();

    /* ------------------------------------------------------
       First try area + city
    ------------------------------------------------------ */

    let filtered = allListings.filter((listing) => {
      const listingArea = (listing.area || "").trim().toLowerCase();

      const listingCity = (listing.city || "").trim().toLowerCase();

      if (userArea && listingArea) {
        return listingArea === userArea;
      }

      if (userCity && listingCity) {
        return listingCity === userCity;
      }

      return false;
    });

    /* ------------------------------------------------------
       If location filtering finds nothing,
       show available listings rather than a blank dashboard.
    ------------------------------------------------------ */

    if (!filtered.length) {
      filtered = allListings;
    }

    nearbyListings = filtered;

    renderNearbyListings();
  } catch (error) {
    console.error("Nearby listings error:", error);

    nearbyListings = [];

    renderNearbyListings();
  }
}

/* ==========================================================
   RENDER NEARBY LISTINGS
========================================================== */

function renderNearbyListings() {
  const grid = elements.nearbyFoodGrid;

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  if (!nearbyListings.length) {
    grid.classList.add("hidden");

    elements.nearbyEmpty?.classList.remove("hidden");

    return;
  }

  grid.classList.remove("hidden");

  elements.nearbyEmpty?.classList.add("hidden");

  /*
     Show the first 8 listings.
     CSS automatically creates 4 columns.
  */

  nearbyListings.slice(0, 12).forEach((listing) => {
    grid.appendChild(createFoodCard(listing));
  });
}

/* ==========================================================
   CREATE FOOD CARD
========================================================== */

function createFoodCard(listing) {
  const card = document.createElement("article");

  card.className = "listing-card";

  const id = listing.id || listing._id || "";

  const name = listing.food_title || listing.foodName || "Food Listing";

  const provider =
    listing.provider_name || listing.providerName || "Local Food Provider";

  const image = listing.image || "/static/images/food-placeholder.jpg";

  const listingType = String(listing.listing_type || "sell").toLowerCase();

  const price = Number(listing.discounted_price) || 0;

  const originalPrice = Number(listing.original_price) || 0;

  const quantity = listing.quantity || "";

  const unit = listing.unit || "";

  const pickupStart = listing.pickup_start || "";

  const pickupEnd = listing.pickup_end || "";

  const distance = listing.distance || listing.distance_km || "";

  const discount = calculateDiscount(originalPrice, price, listingType);

  /* --------------------------------------------------------
     Distance
  -------------------------------------------------------- */

  let distanceText = "Nearby";

  if (distance !== "" && distance !== null && distance !== undefined) {
    const numericDistance = Number(distance);

    if (!Number.isNaN(numericDistance)) {
      distanceText = `${numericDistance.toFixed(1)} km`;
    } else {
      distanceText = String(distance);
    }
  }

  /* --------------------------------------------------------
     Pickup text
  -------------------------------------------------------- */

  let pickupText = "";

  if (pickupStart && pickupEnd) {
    pickupText = `${formatTime(pickupStart)} – ${formatTime(pickupEnd)}`;
  } else if (pickupEnd) {
    pickupText = formatTime(pickupEnd);
  } else if (pickupStart) {
    pickupText = formatTime(pickupStart);
  }

  /* --------------------------------------------------------
     Price
  -------------------------------------------------------- */

  let priceHTML = "";

  if (listingType === "donation" || listingType === "donate") {
    priceHTML = `
      <span class="current-price">
        Free
      </span>
    `;
  } else {
    priceHTML = `
      <span class="current-price">
        ₹${formatPrice(price)}
      </span>

      ${
        originalPrice > price
          ? `
            <span class="old-price">
              ₹${formatPrice(originalPrice)}
            </span>
          `
          : ""
      }
    `;
  }

  /* --------------------------------------------------------
     Card
  -------------------------------------------------------- */

  card.innerHTML = `

    <!-- Food Image -->

    <div class="food-image">

      <img
        src="${escapeAttribute(image)}"
        alt="${escapeAttribute(name)}"
        loading="lazy"
        onerror="this.src='/static/images/food-placeholder.jpg'"
      />


      <!-- Distance -->

      <span class="distance-badge">

        <i class="ri-map-pin-line"></i>

        ${escapeHTML(distanceText)}

      </span>


      <!-- Favourite -->

      <button
        type="button"
        class="favorite-btn"
        data-id="${escapeAttribute(id)}"
        title="Add to favorites"
      >

        <i class="ri-heart-3-line"></i>

      </button>

    </div>


    <!-- Card Body -->

    <div class="card-body">


      <!-- Food Name -->

      <h3
        class="food-name"
        title="${escapeAttribute(name)}"
      >
        ${escapeHTML(name)}
      </h3>


      <!-- Provider -->

      <div class="provider-name">

        <i class="ri-store-2-line"></i>

        <span>
          ${escapeHTML(provider)}
        </span>

      </div>


      <!-- Meta -->

     <div class="listing-meta">

  ${
    pickupText
      ? `
        <span>

          <i class="ri-time-line"></i>

          ${escapeHTML(pickupText)}

        </span>
      `
      : ""
  }

</div>

      <!-- Footer -->

      <div class="card-footer">

        <div>

          ${priceHTML}

        </div>


        <button
          type="button"
          class="view-btn"
        >

          View Details

          <i class="ri-arrow-right-line"></i>

        </button>

      </div>

    </div>

  `;

  /* ========================================================
     FAVORITE BUTTON
  ======================================================== */

  const favoriteBtn = card.querySelector(".favorite-btn");

  favoriteBtn?.addEventListener("click", async (event) => {
    event.stopPropagation();

    await toggleFavorite(id, favoriteBtn);
  });

  /* ========================================================
     VIEW DETAILS
  ======================================================== */

  const viewBtn = card.querySelector(".view-btn");

  viewBtn?.addEventListener("click", (event) => {
    event.stopPropagation();

    openListing(id);
  });

  /* ========================================================
     CARD CLICK
  ======================================================== */

  card.addEventListener("click", () => {
    openListing(id);
  });

  return card;
}

/* ==========================================================
   OPEN LISTING
========================================================== */

function openListing(id) {
  if (!id) {
    return;
  }

  /*
     User-facing listing detail route.
  */

  window.location.href = `/listing/${encodeURIComponent(id)}`;
}

/* ==========================================================
   DISCOUNT CALCULATION
========================================================== */

function calculateDiscount(originalPrice, price, listingType) {
  if (
    listingType === "donation" ||
    listingType === "donate" ||
    !originalPrice ||
    !price ||
    price >= originalPrice
  ) {
    return 0;
  }

  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/* ==========================================================
   FORMAT PRICE
========================================================== */

function formatPrice(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "0";
  }

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

/* ==========================================================
   FORMAT TIME
========================================================== */

function formatTime(value) {
  if (!value) {
    return "";
  }

  const stringValue = String(value).trim();

  /*
     Handle time-only values:
     14:30
     14:30:00
     02:30 PM
  */

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(stringValue)) {
    const parts = stringValue.split(":");

    let hours = Number(parts[0]);

    const minutes = parts[1];

    if (hours >= 0 && hours <= 23) {
      const suffix = hours >= 12 ? "PM" : "AM";

      hours = hours % 12 || 12;

      return `${hours}:${minutes} ${suffix}`;
    }
  }

  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(stringValue)) {
    return stringValue;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return stringValue;
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ==========================================================
   SEARCH
========================================================== */

function handleSearch() {
  const query = elements.foodSearch?.value.trim();

  /* Nothing typed */

  if (!query) {
    elements.searchSuggestions?.classList.add("hidden");

    window.location.href = "/marketplace";

    return;
  }

  /* Hide suggestions */

  elements.searchSuggestions?.classList.add("hidden");

  /*
     Send the actual search query
     to Marketplace.
  */

  window.location.href = `/marketplace?search=${encodeURIComponent(query)}`;
}

/* ==========================================================
   SEARCH SUGGESTIONS
========================================================== */

function handleSearchSuggestions() {
  if (!elements.foodSearch || !elements.searchSuggestions) {
    return;
  }

  const query = elements.foodSearch.value.trim().toLowerCase();

  /* Empty search */

  if (!query) {
    elements.searchSuggestions.classList.add("hidden");

    return;
  }

  /* --------------------------------------------------------
     Search ALL loaded listings
  -------------------------------------------------------- */

  const matches = allListings
    .filter((listing) => {
      const foodName = String(
        listing.food_title || listing.foodName || "",
      ).toLowerCase();

      const provider = String(
        listing.provider_name || listing.providerName || "",
      ).toLowerCase();

      const category = String(listing.category || "").toLowerCase();

      const foodType = String(
        listing.food_type || listing.foodType || "",
      ).toLowerCase();

      const area = String(listing.area || "").toLowerCase();

      const city = String(listing.city || "").toLowerCase();

      return (
        foodName.includes(query) ||
        provider.includes(query) ||
        category.includes(query) ||
        foodType.includes(query) ||
        area.includes(query) ||
        city.includes(query)
      );
    })
    .sort((a, b) => {
      const aName = String(a.food_title || a.foodName || "").toLowerCase();

      const bName = String(b.food_title || b.foodName || "").toLowerCase();

      /*
         Exact/starting food-name matches
         come first.
      */

      const aScore =
        aName === query
          ? 4
          : aName.startsWith(query)
            ? 3
            : aName.includes(query)
              ? 2
              : 1;

      const bScore =
        bName === query
          ? 4
          : bName.startsWith(query)
            ? 3
            : bName.includes(query)
              ? 2
              : 1;

      return bScore - aScore;
    })
    .slice(0, 6);

  /* --------------------------------------------------------
     No results
  -------------------------------------------------------- */

  if (!matches.length) {
    elements.searchSuggestions.innerHTML = `

      <div class="search-no-results">

        <i class="ri-search-line"></i>

        <span>
          No matching food or restaurant found
        </span>

      </div>

    `;

    elements.searchSuggestions.classList.remove("hidden");

    return;
  }

  /* --------------------------------------------------------
     Suggestions
  -------------------------------------------------------- */

  elements.searchSuggestions.innerHTML = matches
    .map((listing) => {
      const id = listing.id || listing._id || "";

      const name = listing.food_title || listing.foodName || "Food Listing";

      const provider =
        listing.provider_name || listing.providerName || "Local Provider";

      const category = listing.category || "Food";

      const image = listing.image || "/static/images/food-placeholder.jpg";

      return `

        <button
          type="button"
          class="search-suggestion"
          data-id="${escapeAttribute(id)}"
        >

          <img
            src="${escapeAttribute(image)}"
            alt="${escapeAttribute(name)}"
            onerror="this.src='/static/images/food-placeholder.jpg'"
          />

          <span class="search-suggestion-content">

            <strong>
              ${escapeHTML(name)}
            </strong>

            <small>
              ${escapeHTML(provider)}
            </small>

          </span>

          <span class="search-suggestion-category">
            ${escapeHTML(category)}
          </span>

          <i class="ri-arrow-right-s-line"></i>

        </button>

      `;
    })
    .join("");

  elements.searchSuggestions.classList.remove("hidden");

  /* --------------------------------------------------------
     Suggestion click
  -------------------------------------------------------- */

  elements.searchSuggestions
    .querySelectorAll(".search-suggestion")
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const id = button.dataset.id;

        if (!id) {
          return;
        }

        elements.searchSuggestions.classList.add("hidden");

        openListing(id);
      });
    });
}

/* ==========================================================
   FAVORITES
========================================================== */

async function toggleFavorite(listingId, button) {
  if (!listingId) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/favorites/toggle`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        listingId,
      }),
    });

    if (!response.ok) {
      throw new Error("Favorite update failed");
    }

    const data = await response.json();

    const icon = button.querySelector("i");

    if (data.isFavorite === true) {
      icon.className = "ri-heart-3-fill";

      button.classList.add("active");
    } else {
      icon.className = "ri-heart-3-line";

      button.classList.remove("active");
    }
  } catch (error) {
    console.error("Favorite error:", error);
  }
}

/* ==========================================================
   NOTIFICATION COUNT
========================================================== */

async function loadNotificationCount() {
  try {
    const response = await fetch(`${API_BASE}/notifications/counts`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Unable to load notification count");
    }

    const data = await response.json();

    const count = Number(data.notifications || 0);

    if (elements.notificationCount) {
      elements.notificationCount.textContent = count;

      updateBadgeVisibility(elements.notificationCount, count);
    }
  } catch (error) {
    console.error("Notification count error:", error);
  }
}

/* ==========================================================
   BADGE VISIBILITY
========================================================== */

function updateBadgeVisibility(badge, count) {
  if (!badge) {
    return;
  }

  badge.style.display = Number(count) > 0 ? "flex" : "none";
}

/* ==========================================================
   LOGOUT
========================================================== */

async function logoutUser() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    localStorage.removeItem("reserveUserLocation");

    localStorage.removeItem("user");

    window.location.href = "/";
  }
}

/* ==========================================================
   LISTING LOADING
========================================================== */

function showListingLoading() {
  if (!elements.nearbyFoodGrid) {
    return;
  }

  elements.nearbyFoodGrid.classList.remove("hidden");

  elements.nearbyEmpty?.classList.add("hidden");

  elements.nearbyFoodGrid.innerHTML = `

    <div class="listing-loading">

      <i class="ri-loader-4-line"></i>

      <span>
        Finding fresh food near you...
      </span>

    </div>

  `;
}

/* ==========================================================
   HTML SECURITY HELPERS
========================================================== */

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
