/* ==========================================================
   ReServe - Individual User Dashboard
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

let recommendedListings = [];
let nearbyListings = [];

let upcomingReservation = null;

/* ==========================================================
   DOM ELEMENTS
========================================================== */

const elements = {
  profileName: document.getElementById("profileName"),
  profileRole: document.getElementById("profileRole"),
  profileImage: document.getElementById("profileImage"),

  welcomeUserName: document.getElementById("welcomeUserName"),

  userLocation: document.getElementById("userLocation"),
  currentLocation: document.getElementById("currentLocation"),

  changeLocationBtn: document.getElementById("changeLocationBtn"),
  locationBtn: document.getElementById("locationBtn"),

  foodSearch: document.getElementById("foodSearch"),
  searchBtn: document.getElementById("searchBtn"),
  searchSuggestions: document.getElementById("searchSuggestions"),

  exploreFoodBtn: document.getElementById("exploreFoodBtn"),

  recommendedFoodGrid: document.getElementById("recommendedFoodGrid"),
  recommendedEmpty: document.getElementById("recommendedEmpty"),

  nearbyFoodGrid: document.getElementById("nearbyFoodGrid"),
  nearbyEmpty: document.getElementById("nearbyEmpty"),

  upcomingReservation: document.getElementById("upcomingReservation"),
  noReservation: document.getElementById("noReservation"),

  notificationCount: document.getElementById("notificationCount"),
  messageCount: document.getElementById("messageCount"),

  profileMenuBtn: document.getElementById("profileMenuBtn"),
  profileDropdown: document.getElementById("profileDropdown"),

  logoutBtn: document.getElementById("logoutBtn"),

  notificationBtn: document.getElementById("notificationBtn"),
  messageBtn: document.getElementById("messageBtn"),
};

/* ==========================================================
   INITIALIZE DASHBOARD
========================================================== */

async function initDashboard() {
  setupEventListeners();

  await loadUserProfile();
  await loadUserLocation();

  await Promise.all([
    loadRecommendedListings(),
    loadNearbyListings(),
    loadUpcomingReservation(),
    loadNotificationCounts(),
  ]);
}

/* ==========================================================
   EVENT LISTENERS
========================================================== */

function setupEventListeners() {
  /* Search */
  elements.searchBtn?.addEventListener("click", handleSearch);

  elements.foodSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  });

  elements.foodSearch?.addEventListener("input", handleSearchSuggestions);

  /* Explore */
  elements.exploreFoodBtn?.addEventListener("click", () => {
    window.location.href = "/explore-food";
  });

  /* Location */
  elements.changeLocationBtn?.addEventListener("click", changeLocation);

  elements.locationBtn?.addEventListener("click", changeLocation);

  /* Profile */
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

  /* Logout */
  elements.logoutBtn?.addEventListener("click", logoutUser);

  /* Notifications */
  elements.notificationBtn?.addEventListener("click", () => {
    window.location.href = "/notifications";
  });

  /* Messages */
  elements.messageBtn?.addEventListener("click", () => {
    window.location.href = "/messages";
  });
}

/* ==========================================================
   USER PROFILE
========================================================== */

async function loadUserProfile() {
  try {
    /* ========================================================
       1. FETCH FRESH USER DATA FROM BACKEND FIRST
       This prevents stale provider/restaurant profile images
       from appearing on the user dashboard.
    ======================================================== */

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

    /* ========================================================
       2. FALL BACK TO SAVED USER DATA ONLY IF BACKEND FAILS
    ======================================================== */

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

    if (!currentUser) {
      currentUser = {
        full_name: "User",
        role: "User",
        profile_image: null,
      };

      updateUserProfile();
    }
  } catch (error) {
    console.error("Profile loading error:", error);

    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        if (parsedUser && typeof parsedUser === "object") {
          currentUser = parsedUser;
          updateUserProfile();
        }
      } catch (error) {
        console.warn("Invalid stored user data.");
      }
    }

    if (!currentUser) {
      currentUser = {
        full_name: "User",
        role: "User",
        profile_image: null,
      };

      updateUserProfile();
    }

    currentLocation = {
      city: "Unknown",
      country: "India",
      address: "",
    };

    updateLocationUI();
  }
}

/* ==========================================================
   UPDATE USER PROFILE
========================================================== */

function updateUserProfile() {
  if (!currentUser) return;

  const name = currentUser.full_name || "User";

  if (elements.profileName) {
    elements.profileName.textContent = name;
  }

  if (elements.welcomeUserName) {
    elements.welcomeUserName.textContent = name.split(" ")[0];
  }

  if (elements.profileRole) {
    const role = currentUser.role || "User";
    elements.profileRole.textContent = formatRole(role);
  }

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
   NAME HELPERS
========================================================== */

function getFirstName(name) {
  if (!name) {
    return "there";
  }

  return name.trim().split(/\s+/)[0];
}

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
      console.log(data.profile);

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

  currentLocation = {
    city: "Lucknow",
    country: "India",
  };

  updateLocationUI();
}

/* ==========================================================
   LOCATION UI
========================================================== */

function updateLocationUI() {
  if (!currentLocation) return;

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

  if (elements.currentLocation) {
    elements.currentLocation.textContent = locationText;
  }
}

/* ==========================================================
   CHANGE LOCATION
========================================================== */

function changeLocation() {
  const city = prompt("Enter your city:", currentLocation?.city || "Lucknow");

  if (!city || !city.trim()) {
    return;
  }

  currentLocation = {
    city: city.trim(),
    country: "India",
  };

  localStorage.setItem("reserveUserLocation", JSON.stringify(currentLocation));

  updateLocationUI();

  loadNearbyListings();
  loadRecommendedListings();
}

/* ==========================================================
   RECOMMENDED LISTINGS
========================================================== */

async function loadRecommendedListings() {
  showListingLoading(elements.recommendedFoodGrid);

  try {
    const response = await fetch(`${API_BASE}/listings`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Unable to load recommendations");
    }

    const data = await response.json();

    const allListings = data.listings || [];

    const userCity = (currentLocation?.city || "").toLowerCase();

    recommendedListings = allListings.filter((listing) => {
      return listing.city && listing.city.toLowerCase() === userCity;
    });

    renderRecommendedListings();
  } catch (error) {
    console.error("Recommended listings error:", error);

    recommendedListings = [];

    renderRecommendedListings();
  }
}

/* ==========================================================
   NEARBY LISTINGS
========================================================== */

async function loadNearbyListings() {
  showListingLoading(elements.nearbyFoodGrid);

  try {
    const response = await fetch(`${API_BASE}/listings`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Unable to load nearby listings");
    }

    const data = await response.json();

    const allListings = data.listings || [];

    const userArea = (currentLocation?.area || "").toLowerCase();

    nearbyListings = allListings.filter((listing) => {
      return listing.area && listing.area.toLowerCase() === userArea;
    });

    renderNearbyListings();
  } catch (error) {
    console.error("Nearby listings error:", error);

    nearbyListings = [];

    renderNearbyListings();
  }
}

/* ==========================================================
   RENDER RECOMMENDED
========================================================== */

function renderRecommendedListings() {
  if (!elements.recommendedFoodGrid) {
    return;
  }

  elements.recommendedFoodGrid.innerHTML = "";

  if (!recommendedListings.length) {
    elements.recommendedFoodGrid.classList.add("hidden");

    elements.recommendedEmpty?.classList.remove("hidden");

    return;
  }

  elements.recommendedFoodGrid.classList.remove("hidden");

  elements.recommendedEmpty?.classList.add("hidden");

  recommendedListings.slice(0, 4).forEach((listing) => {
    elements.recommendedFoodGrid.appendChild(createFoodCard(listing));
  });
}

/* ==========================================================
   RENDER NEARBY
========================================================== */

function renderNearbyListings() {
  if (!elements.nearbyFoodGrid) {
    return;
  }

  elements.nearbyFoodGrid.innerHTML = "";

  if (!nearbyListings.length) {
    elements.nearbyFoodGrid.classList.add("hidden");

    elements.nearbyEmpty?.classList.remove("hidden");

    return;
  }

  elements.nearbyFoodGrid.classList.remove("hidden");

  elements.nearbyEmpty?.classList.add("hidden");

  nearbyListings.slice(0, 4).forEach((listing) => {
    elements.nearbyFoodGrid.appendChild(createFoodCard(listing));
  });
}

/* ==========================================================
   CREATE FOOD CARD
========================================================== */

function createFoodCard(listing) {
  const card = document.createElement("article");

  card.className = "food-card";

  /* ========================================================
     LISTING DATA
  ======================================================== */

  const id = listing.id || "";

  const name = listing.food_title || "Food Listing";

  const category = listing.category || "Food";

  /* ========================================================
     PROVIDER DATA
  ======================================================== */

  const provider = listing.provider_name || "Local Food Provider";

  const providerImage = listing.provider_image || "";

  const providerVerified = listing.provider_verified !== false;

  /* ========================================================
     FOOD DATA
  ======================================================== */

  const image = listing.image || "/static/images/food-placeholder.jpg";

  const listingType = listing.listing_type || "sell";

  const price = Number(listing.discounted_price) || 0;

  const originalPrice = Number(listing.original_price) || 0;

  const quantity = listing.quantity || "";

  const unit = listing.unit || "";

  const city = listing.city || "";

  const pickupStart = listing.pickup_start || "";

  const pickupEnd = listing.pickup_end || "";

  const discount = calculateDiscount(originalPrice, price, listingType);

  /* ========================================================
     PROVIDER DISPLAY
     Do not render the provider profile image inside the user
     dashboard listing cards. We want the listing's food photo
     to remain the main visual, not the restaurant avatar.
  ======================================================== */

  const providerHTML = "";

  /* ========================================================
     CARD HTML
  ======================================================== */

  card.innerHTML = `

    <div class="food-card-image">

      <img
        src="${escapeAttribute(image)}"
        alt="${escapeAttribute(name)}"
        loading="lazy"
        onerror="this.src='/static/images/food-placeholder.jpg'"
      >

      ${
        discount
          ? `
            <span class="food-discount">
              ${discount}% OFF
            </span>
          `
          : ""
      }

      <button
        type="button"
        class="food-favorite"
        data-id="${escapeAttribute(id)}"
        title="Add to favorites"
      >
        <i class="ri-heart-3-line"></i>
      </button>

    </div>


    <div class="food-card-content">

      <h3
        title="${escapeAttribute(name)}"
      >
        ${escapeHTML(name)}
      </h3>


      <div class="food-provider">

        ${providerHTML}

        <span>
          ${escapeHTML(provider)}
        </span>

        ${
          providerVerified
            ? `
              <i
                class="ri-verified-badge-fill verified-icon"
                title="Verified provider"
              ></i>
            `
            : ""
        }

      </div>


      <div class="food-meta">

        ${
          quantity && unit
            ? `
              <span>
                <i class="ri-archive-line"></i>
                ${escapeHTML(quantity)} ${escapeHTML(unit)}
              </span>
            `
            : ""
        }

        ${
          pickupEnd
            ? `
              <span>
                <i class="ri-time-line"></i>
                ${formatPickupTime(pickupEnd)}
              </span>
            `
            : ""
        }

      </div>


     <div class="food-card-bottom">

  <span
    class="food-price ${listingType === "donate" ? "donation" : ""}"
  >
    ${listingType === "donate" ? "Free" : `₹${price}`}
  </span>

</div>

    </div>
  `;

  /* ========================================================
     FAVORITE
  ======================================================== */

  const favoriteBtn = card.querySelector(".food-favorite");

  favoriteBtn?.addEventListener("click", (event) => {
    event.stopPropagation();

    toggleFavorite(id, favoriteBtn);
  });

  /* ========================================================
     CARD CLICK
     
     UPDATED ROUTE:
     /listing/<listing_id>
  ======================================================== */

  card.addEventListener("click", () => {
    if (!id) return;

    window.location.href = `/listing/${encodeURIComponent(id)}`;
  });

  return card;
}

/* ==========================================================
   DISCOUNT
========================================================== */

function calculateDiscount(originalPrice, price, listingType) {
  if (
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
   FORMAT PICKUP TIME
========================================================== */

function formatPickupTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();

  const sameDay = date.toDateString() === today.toDateString();

  const time = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) {
    return `Today ${time}`;
  }

  return (
    date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }) + ` ${time}`
  );
}

/* ==========================================================
   RESERVATION
========================================================== */

async function loadUpcomingReservation() {
  showReservationLoading();

  try {
    const response = await fetch(`${API_BASE}/reservations/upcoming`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Unable to load reservation");
    }

    const data = await response.json();

    upcomingReservation = data.reservation || data || null;

    renderUpcomingReservation();
  } catch (error) {
    console.error("Reservation error:", error);

    upcomingReservation = null;

    renderUpcomingReservation();
  }
}

/* ==========================================================
   RENDER RESERVATION
========================================================== */

function renderUpcomingReservation() {
  if (!elements.upcomingReservation) {
    return;
  }

  if (!upcomingReservation) {
    elements.upcomingReservation.classList.add("hidden");

    elements.noReservation?.classList.remove("hidden");

    return;
  }

  elements.noReservation?.classList.add("hidden");

  elements.upcomingReservation.classList.remove("hidden");

  const reservation = upcomingReservation;

  const listing = reservation.listing || reservation;

  const name =
    listing.foodName || listing.food_title || listing.name || "Food Listing";

  const image =
    listing.imageUrl || listing.image || "/static/images/food-placeholder.jpg";

  const provider =
    listing.providerName ||
    listing.provider_name ||
    listing.ownerName ||
    listing.restaurantName ||
    "Food Provider";

  const pickupTime =
    reservation.pickupTime ||
    listing.availableUntil ||
    listing.pickup_end ||
    "";

  const status = reservation.status || "Reserved";

  const reservationId = reservation._id || reservation.id || "";

  elements.upcomingReservation.innerHTML = `

    <div class="reservation-card">

      <div class="reservation-image">

        <img
          src="${escapeAttribute(image)}"
          alt="${escapeAttribute(name)}"
          onerror="this.src='/static/images/food-placeholder.jpg'"
        >

      </div>


      <div class="reservation-details">

        <span class="reservation-status">
          ${escapeHTML(status)}
        </span>

        <h3>
          ${escapeHTML(name)}
        </h3>

        <p>
          ${escapeHTML(provider)}
        </p>


        <div class="reservation-meta">

          <span>
            <i class="ri-calendar-line"></i>
            ${formatPickupTime(pickupTime)}
          </span>

          ${
            reservation.location
              ? `
                <span>
                  <i class="ri-map-pin-line"></i>
                  ${escapeHTML(reservation.location)}
                </span>
              `
              : ""
          }

        </div>

      </div>


      <button
        type="button"
        class="reservation-action"
        data-id="${escapeAttribute(reservationId)}"
      >
        View Details
      </button>

    </div>
  `;

  elements.upcomingReservation
    .querySelector(".reservation-action")
    ?.addEventListener("click", () => {
      if (!reservationId) {
        return;
      }

      window.location.href = `/reservation/${encodeURIComponent(
        reservationId,
      )}`;
    });
}

/* ==========================================================
   RESERVATION LOADING
========================================================== */

function showReservationLoading() {
  if (!elements.upcomingReservation) {
    return;
  }

  elements.upcomingReservation.classList.remove("hidden");

  elements.noReservation?.classList.add("hidden");

  elements.upcomingReservation.innerHTML = `

    <div class="reservation-loading">

      <i class="ri-loader-4-line"></i>

      <span>
        Loading reservation...
      </span>

    </div>

  `;
}

/* ==========================================================
   LISTING LOADING
========================================================== */

function showListingLoading(grid) {
  if (!grid) return;

  grid.classList.remove("hidden");

  grid.innerHTML = `

    <div class="listing-loading">

      <i class="ri-loader-4-line"></i>

      <span>
        Finding food near you...
      </span>

    </div>

  `;
}

/* ==========================================================
   SEARCH
========================================================== */

function handleSearch() {
  const query = elements.foodSearch?.value.trim();

  if (!query) {
    window.location.href = "/explore-food";

    return;
  }

  window.location.href = `/explore-food?search=${encodeURIComponent(query)}`;
}

/* ==========================================================
   SEARCH SUGGESTIONS
========================================================== */

function handleSearchSuggestions() {
  if (!elements.foodSearch || !elements.searchSuggestions) {
    return;
  }

  const query = elements.foodSearch.value.trim().toLowerCase();

  if (query.length < 2) {
    elements.searchSuggestions.classList.add("hidden");

    return;
  }

  const allListings = [...recommendedListings, ...nearbyListings];

  const unique = new Map();

  allListings.forEach((listing) => {
    const name = listing.food_title || "";

    if (name.toLowerCase().includes(query)) {
      unique.set(listing.id || name, listing);
    }
  });

  const matches = [...unique.values()].slice(0, 5);

  if (!matches.length) {
    elements.searchSuggestions.classList.add("hidden");

    return;
  }

  elements.searchSuggestions.innerHTML = matches
    .map((listing) => {
      const id = listing.id || "";

      const name = listing.food_title || "Food";

      return `

          <button
            type="button"
            class="search-suggestion"
            data-id="${escapeAttribute(id)}"
          >

            <i class="ri-search-line"></i>

            <span>
              ${escapeHTML(name)}
            </span>

          </button>

        `;
    })
    .join("");

  elements.searchSuggestions.classList.remove("hidden");

  elements.searchSuggestions
    .querySelectorAll(".search-suggestion")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;

        if (!id) return;

        /*
            UPDATED ROUTE
          */

        window.location.href = `/listing/${encodeURIComponent(id)}`;
      });
    });
}

/* ==========================================================
   FAVORITES
========================================================== */

async function toggleFavorite(listingId, button) {
  if (!listingId) return;

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
   NOTIFICATIONS
========================================================== */

async function loadNotificationCounts() {
  try {
    const response = await fetch(`${API_BASE}/notifications/counts`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Unable to load notification counts");
    }

    const data = await response.json();

    if (elements.notificationCount) {
      elements.notificationCount.textContent = Number(data.notifications || 0);

      updateBadgeVisibility(elements.notificationCount, data.notifications);
    }

    if (elements.messageCount) {
      elements.messageCount.textContent = Number(data.messages || 0);

      updateBadgeVisibility(elements.messageCount, data.messages);
    }
  } catch (error) {
    console.error("Notification count error:", error);
  }
}

/* ==========================================================
   BADGE VISIBILITY
========================================================== */

function updateBadgeVisibility(badge, count) {
  if (!badge) return;

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

    window.location.href = "/";
  }
}

/* ==========================================================
   SECURITY / HTML HELPERS
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
