/* =========================================================
   ReServe - My Pickups
   ========================================================= */

const API_BASE_URL = "/api";

let allPickups = [];
let filteredPickups = [];

let currentFilter = "all";
let currentSearch = "";
let currentSort = "pickup_date_desc";

let selectedPickup = null;

const PICKUP_REFRESH_INTERVAL = 60000;

let pickupRefreshTimer = null;

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeMyPickups();
});

function initializeMyPickups() {
  setupProfileMenu();
  setupNotifications();
  setupFilters();
  setupSearch();
  setupSort();
  setupModals();
  setupRetry();

  loadProfile();
  loadPickups();

  startPickupAutoRefresh();
}

/* =========================================================
   AUTOMATIC PICKUP REFRESH
   ========================================================= */

function startPickupAutoRefresh() {
  stopPickupAutoRefresh();

  pickupRefreshTimer = setInterval(() => {
    const confirmModal = document.getElementById("confirmPickupModal");

    const detailsModal = document.getElementById("pickupDetailsModal");

    const confirmOpen = confirmModal && confirmModal.style.display !== "none";

    const detailsOpen = detailsModal && detailsModal.style.display !== "none";

    /*
     * Do not refresh while the user is interacting
     * with a modal.
     */
    if (confirmOpen || detailsOpen) {
      return;
    }

    loadPickups({
      silent: true,
    });
  }, PICKUP_REFRESH_INTERVAL);
}

function stopPickupAutoRefresh() {
  if (pickupRefreshTimer) {
    clearInterval(pickupRefreshTimer);
    pickupRefreshTimer = null;
  }
}

window.addEventListener("beforeunload", () => {
  stopPickupAutoRefresh();
});

/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      credentials: "same-origin",
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();

    if (!data.success && !data.profile) {
      return;
    }

    const profile = data.profile || data.user || {};

    setText(
      "profileName",
      profile.full_name || profile.name || profile.email || "User",
    );

    setText(
      "profileRole",
      profile.role ? capitalizeFirstLetter(profile.role) : "User",
    );

    const images = Array.isArray(profile.profile_images)
      ? profile.profile_images
      : profile.profile_image
        ? [profile.profile_image]
        : [];
    const imageUrl = images.find(
      (img) => typeof img === "string" && img.trim(),
    );
    if (imageUrl) {
      const image = document.getElementById("profileImage");
      if (image) image.src = imageUrl;
    }
  } catch (error) {
    console.error("Profile loading error:", error);
  }
}

/* =========================================================
   LOAD PICKUPS
   ========================================================= */

async function loadPickups(options = {}) {
  const silent = Boolean(options.silent);

  if (!silent) {
    showLoading();
  }

  try {
    const response = await fetch(`${API_BASE_URL}/user/reservations`, {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load reservations (${response.status})`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Unable to load reservations.");
    }

    /*
     * My Pickups must ONLY contain reservations that
     * were accepted by the provider.
     *
     * pending:
     *      NOT SHOWN
     *
     * rejected:
     *      NOT SHOWN
     *
     * accepted:
     *      SHOWN
     *
     * ready_for_pickup:
     *      SHOWN
     *
     * completed:
     *      SHOWN
     *
     * cancelled:
     *      SHOWN ONLY if it was accepted before
     *      cancellation.
     */
    allPickups = Array.isArray(data.reservations)
      ? data.reservations.map(normalizePickup).filter((pickup) => {
          if (
            pickup.status === "accepted" ||
            pickup.status === "ready_for_pickup" ||
            pickup.status === "completed"
          ) {
            return true;
          }

          if (pickup.status === "cancelled") {
            return Boolean(pickup.accepted_at);
          }

          return false;
        })
      : [];

    updateCounts();

    applyFiltersAndRender();
  } catch (error) {
    console.error("Pickup loading error:", error);

    /*
     * During silent refresh, keep the current UI.
     */
    if (!silent) {
      showError(error.message || "Unable to load your pickups.");
    }
  }
}

/* =========================================================
   NORMALIZE PICKUP
   ========================================================= */

function normalizePickup(item) {
  const status = normalizeStatus(
    item.status || item.request_status || "pending",
  );

  return {
    ...item,

    id: item._id || item.id || item.request_id || item.order_id,

    request_id: item.request_id || item._id || item.id,

    listing_id: item.listing_id || "",

    food_name: item.food_name || item.foodName || "Food Item",

    provider_name:
      item.provider_name ||
      item.providerName ||
      item.restaurant_name ||
      "Food Provider",

    provider_verified: Boolean(item.provider_verified || item.providerVerified),

    image:
      item.image ||
      item.food_image ||
      item.image_url ||
      "/static/images/food-placeholder.jpg",

    category: item.category || "Food",

    food_type: item.food_type || item.foodType || "",

    quantity: Number(item.quantity || 1),

    unit: item.unit || "pack",

    unit_price: Number(item.unit_price || 0),

    amount: Number(item.amount || item.subtotal || 0),

    platform_fee: Number(item.platform_fee || 0),

    community_support: Number(item.community_support || 0),

    total_amount: Number(item.total_amount || item.total || 0),

    original_price: Number(
      item.original_price || item.original_unit_price || 0,
    ),

    pickup_date: item.pickup_date || "",

    pickup_time: item.pickup_time || "",

    listing_address: item.listing_address || item.address || "",

    listing_area: item.listing_area || item.area || "",

    listing_city: item.listing_city || item.city || "",

    instructions: item.instructions || "",

    created_at: item.created_at || "",

    updated_at: item.updated_at || "",

    accepted_at: item.accepted_at || "",

    ready_for_pickup_at: item.ready_for_pickup_at || "",

    completed_at: item.completed_at || "",

    status,
  };
}

/* =========================================================
   STATUS NORMALIZATION
   ========================================================= */

function normalizeStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  if (
    value === "completed" ||
    value === "picked_up" ||
    value === "picked-up" ||
    value === "pickup_completed"
  ) {
    return "completed";
  }

  if (
    value === "ready_for_pickup" ||
    value === "ready-for-pickup" ||
    value === "ready"
  ) {
    return "ready_for_pickup";
  }

  if (
    value === "cancelled" ||
    value === "canceled" ||
    value === "cancelled_by_user"
  ) {
    return "cancelled";
  }

  if (value === "accepted") {
    return "accepted";
  }

  if (value === "rejected") {
    return "rejected";
  }

  if (value === "pending") {
    return "pending";
  }

  return value || "pending";
}

/* =========================================================
   COUNTS
   ========================================================= */

function updateCounts() {
  const allCount = allPickups.length;

  const acceptedCount = allPickups.filter(
    (pickup) => pickup.status === "accepted",
  ).length;

  const readyCount = allPickups.filter(
    (pickup) => pickup.status === "ready_for_pickup",
  ).length;

  const pickedUpCount = allPickups.filter(
    (pickup) => pickup.status === "completed",
  ).length;

  const cancelledCount = allPickups.filter(
    (pickup) => pickup.status === "cancelled",
  ).length;

  setText("allPickupCount", allCount);

  setText("acceptedPickupCount", acceptedCount);

  setText("readyPickupCount", readyCount);

  setText("pickedUpCount", pickedUpCount);

  setText("cancelledCount", cancelledCount);
}

/* =========================================================
   FILTERS
   ========================================================= */

function setupFilters() {
  const tabs = document.querySelectorAll(".pickup-tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));

      tab.classList.add("active");

      currentFilter = tab.dataset.filter || "all";

      applyFiltersAndRender();
    });
  });
}

/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {
  const searchInput = document.getElementById("pickupSearch");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener(
    "input",
    debounce(() => {
      currentSearch = searchInput.value.trim().toLowerCase();

      applyFiltersAndRender();
    }, 250),
  );
}

/* =========================================================
   SORT
   ========================================================= */

function setupSort() {
  const sortSelect = document.getElementById("pickupSort");

  if (!sortSelect) {
    return;
  }

  sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;

    applyFiltersAndRender();
  });
}

/* =========================================================
   FILTER + SORT + RENDER
   ========================================================= */

function applyFiltersAndRender() {
  let results = [...allPickups];

  /*
   * Status filter
   */
  if (currentFilter !== "all") {
    results = results.filter((pickup) => pickup.status === currentFilter);
  }

  /*
   * Search
   */
  if (currentSearch) {
    results = results.filter((pickup) => {
      const foodName = String(pickup.food_name || "").toLowerCase();

      const provider = String(pickup.provider_name || "").toLowerCase();

      const category = String(pickup.category || "").toLowerCase();

      return (
        foodName.includes(currentSearch) ||
        provider.includes(currentSearch) ||
        category.includes(currentSearch)
      );
    });
  }

  /*
   * Sort
   */
  results.sort(sortPickups);

  filteredPickups = results;

  renderPickups();
}

/* =========================================================
   SORT FUNCTION
   ========================================================= */

function sortPickups(a, b) {
  switch (currentSort) {
    case "pickup_date_desc":
      return getPickupTimestamp(b) - getPickupTimestamp(a);

    case "created_desc":
      return getTimestamp(b.created_at) - getTimestamp(a.created_at);

    case "food_asc":
      return String(a.food_name || "").localeCompare(String(b.food_name || ""));

    case "pickup_date_asc":

    default:
      return getPickupTimestamp(a) - getPickupTimestamp(b);
  }
}

/* =========================================================
   RENDER PICKUPS
   ========================================================= */

function renderPickups() {
  const list = document.getElementById("pickupList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  hideElement("pickupLoading");

  hideElement("pickupError");

  if (!filteredPickups.length) {
    showElement("pickupEmpty");

    const message = document.getElementById("pickupEmptyMessage");

    if (message) {
      if (currentSearch) {
        message.textContent = "No pickups match your search.";
      } else if (currentFilter === "accepted") {
        message.textContent =
          "You have no accepted reservations waiting for pickup.";
      } else if (currentFilter === "ready_for_pickup") {
        message.textContent = "You have no food waiting for pickup.";
      } else if (currentFilter === "completed") {
        message.textContent = "You have not completed any pickups yet.";
      } else if (currentFilter === "cancelled") {
        message.textContent = "You have no cancelled pickups.";
      } else {
        message.textContent =
          "Your accepted food reservations will appear here.";
      }
    }

    return;
  }

  hideElement("pickupEmpty");

  filteredPickups.forEach((pickup) => {
    const card = createPickupCard(pickup);

    list.appendChild(card);
  });
}

/* =========================================================
   CREATE PICKUP CARD
   ========================================================= */

function createPickupCard(pickup) {
  const template = document.getElementById("pickupCardTemplate");

  if (!template) {
    return document.createElement("article");
  }

  const fragment = template.content.cloneNode(true);

  const card = fragment.querySelector(".pickup-card");

  if (!card) {
    return document.createElement("article");
  }

  card.dataset.pickupId = pickup.id || "";

  card.dataset.status = pickup.status;

  card.classList.add(`status-${pickup.status}`);

  /* =====================================================
       IMAGE
    ===================================================== */

  const image = card.querySelector(".pickup-image");

  if (image) {
    image.src = pickup.image || "/static/images/food-placeholder.jpg";

    image.alt = pickup.food_name;

    image.onerror = () => {
      image.src = "/static/images/food-placeholder.jpg";
    };
  }

  /* =====================================================
       CATEGORY
    ===================================================== */

  setElementText(card, ".category-text", pickup.category);

  /* =====================================================
       FOOD INFORMATION
    ===================================================== */

  setElementText(card, ".food-name", pickup.food_name);

  setElementText(card, ".provider-text", pickup.provider_name);

  /* =====================================================
       VERIFIED PROVIDER
    ===================================================== */

  const verifiedIcon = card.querySelector(".verified-icon");

  if (verifiedIcon) {
    verifiedIcon.style.display = pickup.provider_verified
      ? "inline-block"
      : "none";
  }

  /* =====================================================
       CATEGORY TAG
    ===================================================== */

  const categoryTag = card.querySelector(".category-tag");

  if (categoryTag) {
    categoryTag.textContent = pickup.category || "Food";
  }

  /* =====================================================
       VEGETARIAN TAG
    ===================================================== */

  const vegetarianTag = card.querySelector(".vegetarian-tag");

  if (vegetarianTag) {
    const isVegetarian = String(pickup.food_type || "")
      .toLowerCase()
      .includes("vegetarian");

    if (isVegetarian) {
      vegetarianTag.textContent = "Vegetarian";

      vegetarianTag.style.display = "inline-flex";
    } else {
      vegetarianTag.style.display = "none";
    }
  }

  /* =====================================================
       QUANTITY
    ===================================================== */

  setElementText(card, ".quantity-value", pickup.quantity);

  setElementText(card, ".quantity-unit", pickup.unit || "pack");

  /* =====================================================
       PRICE
    ===================================================== */

const currentPrice = Number(
  pickup.total_amount ??
    (
      Number(pickup.amount || 0) +
      Number(pickup.platform_fee || 0) +
      Number(pickup.community_support || 0)
    )
);

  setElementText(card, ".current-price", formatCurrency(currentPrice));

  /* =====================================================
       ORIGINAL PRICE
    ===================================================== */

  const originalPrice = Number(pickup.original_price || 0);

  const originalPriceElement = card.querySelector(".original-price");

  if (originalPriceElement) {
    const originalTotal = originalPrice * Number(pickup.quantity || 0);

    if (originalPrice > 0 && originalTotal > currentPrice) {
      originalPriceElement.textContent = formatCurrency(originalTotal);

      originalPriceElement.style.display = "inline";
    } else {
      originalPriceElement.style.display = "none";
    }
  }

  /* =====================================================
       DISCOUNT
    ===================================================== */

  const discountElement = card.querySelector(".discount-badge");

  if (discountElement) {
    const originalTotal = originalPrice * Number(pickup.quantity || 0);

    if (originalPrice > 0 && originalTotal > currentPrice) {
      const discount = Math.round((1 - currentPrice / originalTotal) * 100);

      discountElement.textContent = `${discount}% OFF`;

      discountElement.style.display = "inline-flex";
    } else {
      discountElement.style.display = "none";
    }
  }

  /* =====================================================
       PICKUP DATE
    ===================================================== */

  setElementText(card, ".pickup-date", formatPickupDate(pickup.pickup_date));

  /* =====================================================
       PICKUP TIME
    ===================================================== */

  setElementText(
    card,
    ".pickup-time",
    pickup.pickup_time || "Pickup time not specified",
  );

  /* =====================================================
       LOCATION
    ===================================================== */

  setElementText(card, ".pickup-location", buildPickupLocation(pickup));

  /* =====================================================
       STATUS
    ===================================================== */

  applyStatusToCard(card, pickup);

  /* =====================================================
       MAP
    ===================================================== */

  const mapButton = card.querySelector(".map-btn");

  if (mapButton) {
    mapButton.addEventListener("click", (event) => {
      event.stopPropagation();

      openPickupMap(pickup);
    });
  }

  /* =====================================================
       VIEW DETAILS
    ===================================================== */

  const detailsButton = card.querySelector(".view-details-btn");

  if (detailsButton) {
    detailsButton.addEventListener("click", () => {
      openDetailsModal(pickup);
    });
  }

  /* =====================================================
       CONFIRM PICKUP
    ===================================================== */

  const confirmButton = card.querySelector(".confirm-pickup-btn");

  if (confirmButton) {
    confirmButton.addEventListener("click", () => {
      if (pickup.status !== "ready_for_pickup") {
        return;
      }

      openConfirmPickupModal(pickup);
    });
  }

  /* =====================================================
       FAVORITE
    ===================================================== */

  const favoriteButton = card.querySelector(".image-favorite-btn");

  if (favoriteButton) {
    favoriteButton.addEventListener("click", (event) => {
      event.stopPropagation();

      favoriteButton.classList.toggle("active");
    });
  }

  return card;
}

/* =========================================================
   APPLY STATUS TO CARD
   ========================================================= */

function applyStatusToCard(card, pickup) {
  const statusText = card.querySelector(".status-text");

  const statusMessage = card.querySelector(".status-message");

  const statusDescription = card.querySelector(".status-description");

  const confirmButton = card.querySelector(".confirm-pickup-btn");

  /* =====================================================
       READY
    ===================================================== */

  if (pickup.status === "ready_for_pickup") {
    if (statusText) {
      statusText.textContent = "Ready for Pickup";
    }

    if (statusMessage) {
      statusMessage.textContent = "Your food is ready!";
    }

    if (statusDescription) {
      statusDescription.textContent =
        "Please collect it during your selected pickup time.";
    }

    if (confirmButton) {
      confirmButton.style.display = "flex";
    }

    return;
  }

  /* =====================================================
       COMPLETED
    ===================================================== */

  if (pickup.status === "completed") {
    if (statusText) {
      statusText.textContent = "Picked Up";
    }

    if (statusMessage) {
      statusMessage.textContent = "Pickup completed successfully.";
    }

    if (statusDescription) {
      statusDescription.textContent =
        "Thank you for helping reduce food waste!";
    }

    if (confirmButton) {
      confirmButton.style.display = "none";
    }

    addReorderButton(card, pickup);

    return;
  }

  /* =====================================================
       CANCELLED
    ===================================================== */

  if (pickup.status === "cancelled") {
    if (statusText) {
      statusText.textContent = "Cancelled by You";
    }

    if (statusMessage) {
      statusMessage.textContent = "You cancelled this pickup.";
    }

    if (statusDescription) {
      statusDescription.textContent =
        "This reservation was previously accepted by the provider.";
    }

    if (confirmButton) {
      confirmButton.style.display = "none";
    }

    addReorderButton(card, pickup);

    return;
  }

  /* =====================================================
       ACCEPTED
    ===================================================== */

  if (pickup.status === "accepted") {
    if (statusText) {
      statusText.textContent = "Accepted";
    }

    if (statusMessage) {
      statusMessage.textContent = "Your reservation has been accepted.";
    }

    if (statusDescription) {
      statusDescription.textContent = "It will shortly ready for pickup.";
    }

    if (confirmButton) {
      confirmButton.style.display = "none";
    }

    return;
  }

  /* =====================================================
       REJECTED
    ===================================================== */

  if (pickup.status === "rejected") {
    if (statusText) {
      statusText.textContent = "Rejected";
    }

    if (statusMessage) {
      statusMessage.textContent = "This reservation was rejected.";
    }

    if (statusDescription) {
      statusDescription.textContent = "Please explore other available food.";
    }

    if (confirmButton) {
      confirmButton.style.display = "none";
    }

    return;
  }

  /* =====================================================
       PENDING
    ===================================================== */

  if (pickup.status === "pending") {
    if (statusText) {
      statusText.textContent = "Pending";
    }

    if (statusMessage) {
      statusMessage.textContent = "Waiting for provider approval.";
    }

    if (statusDescription) {
      statusDescription.textContent =
        "Your reservation request has been sent to the provider.";
    }

    if (confirmButton) {
      confirmButton.style.display = "none";
    }
  }
}

/* =========================================================
   REORDER BUTTON
   ========================================================= */

function addReorderButton(card, pickup) {
  const actions = card.querySelector(".pickup-actions");

  if (!actions) {
    return;
  }

  if (actions.querySelector(".reorder-btn")) {
    return;
  }

  const button = document.createElement("button");

  button.type = "button";

  button.className = "reorder-btn";

  button.innerHTML = `
        <i class="fa-solid fa-rotate-right"></i>
        Reorder
    `;

  Object.assign(button.style, {
    height: "41px",
    borderRadius: "8px",
    border: "1px solid #087f68",
    background: "#ffffff",
    color: "#087561",
    fontFamily: "Poppins, sans-serif",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  });

  button.addEventListener("click", () => {
    if (pickup.listing_id) {
      window.location.href = `/listing-details?listing_id=${encodeURIComponent(
        pickup.listing_id,
      )}`;
    } else {
      window.location.href = "/explore-food";
    }
  });

  actions.appendChild(button);
}

/* =========================================================
   MODALS
   ========================================================= */

function setupModals() {
  const closeConfirm = document.getElementById("closeConfirmPickupModal");

  const cancelConfirm = document.getElementById("cancelConfirmPickup");

  const confirmAction = document.getElementById("confirmPickupAction");

  const closeDetails = document.getElementById("closePickupDetailsModal");

  if (closeConfirm) {
    closeConfirm.addEventListener("click", closeConfirmPickupModal);
  }

  if (cancelConfirm) {
    cancelConfirm.addEventListener("click", closeConfirmPickupModal);
  }

  if (confirmAction) {
    confirmAction.addEventListener("click", confirmPickup);
  }

  if (closeDetails) {
    closeDetails.addEventListener("click", closeDetailsModal);
  }

  /*
   * Close modal when clicking outside.
   */

  document.addEventListener("click", (event) => {
    const confirmModal = document.getElementById("confirmPickupModal");

    const detailsModal = document.getElementById("pickupDetailsModal");

    if (event.target === confirmModal) {
      closeConfirmPickupModal();
    }

    if (event.target === detailsModal) {
      closeDetailsModal();
    }
  });

  /*
   * Escape key.
   */

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    closeConfirmPickupModal();

    closeDetailsModal();
  });
}

/* =========================================================
   OPEN CONFIRM MODAL
   ========================================================= */

function openConfirmPickupModal(pickup) {
  if (!pickup || pickup.status !== "ready_for_pickup") {
    return;
  }

  selectedPickup = pickup;

  setText("confirmFoodName", pickup.food_name);

  setText("confirmProviderName", pickup.provider_name);

  showElement("confirmPickupModal");
}

/* =========================================================
   CLOSE CONFIRM MODAL
   ========================================================= */

function closeConfirmPickupModal() {
  hideElement("confirmPickupModal");

  selectedPickup = null;
}

/* =========================================================
   CONFIRM PICKUP
   ========================================================= */

async function confirmPickup() {
  if (!selectedPickup) {
    return;
  }

  if (selectedPickup.status !== "ready_for_pickup") {
    showToast("This pickup is not ready yet.", "error");

    return;
  }

  const pickup = selectedPickup;

  const confirmButton = document.getElementById("confirmPickupAction");

  const originalText = confirmButton ? confirmButton.innerHTML : "";

  if (confirmButton) {
    confirmButton.disabled = true;

    confirmButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Confirming...
        `;
  }

  try {
    /*
     * Backend transition:
     *
     * ready_for_pickup
     *        ↓
     * completed
     */

    const response = await fetch(
      `${API_BASE_URL}/user/reservations/${encodeURIComponent(
        pickup.id,
      )}/confirm-pickup`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "same-origin",

        body: JSON.stringify({
          pickup_id: pickup.id,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to confirm pickup.");
    }

    /*
     * Close modal.
     */

    closeConfirmPickupModal();

    /*
     * Update local state immediately.
     */

    const index = allPickups.findIndex(
      (item) => String(item.id) === String(pickup.id),
    );

    if (index !== -1) {
      allPickups[index].status = "completed";

      allPickups[index].completed_at = new Date().toISOString();

      allPickups[index].updated_at = new Date().toISOString();
    }

    updateCounts();

    applyFiltersAndRender();

    showToast("Pickup confirmed successfully!");
  } catch (error) {
    console.error("Confirm pickup error:", error);

    showToast(error.message || "Unable to confirm pickup.", "error");
  } finally {
    if (confirmButton) {
      confirmButton.disabled = false;

      confirmButton.innerHTML = originalText;
    }
  }
}

/* =========================================================
   DETAILS MODAL
   ========================================================= */

function openDetailsModal(pickup) {
  selectedPickup = pickup;

  setText("modalPickupStatus", getStatusLabel(pickup.status));

  setText("modalFoodName", pickup.food_name);

  setText("modalProviderName", pickup.provider_name);

  const modalImage = document.getElementById("modalFoodImage");

  if (modalImage) {
    modalImage.src = pickup.image || "/static/images/food-placeholder.jpg";

    modalImage.alt = pickup.food_name;

    modalImage.onerror = () => {
      modalImage.src = "/static/images/food-placeholder.jpg";
    };
  }

  setText("modalPickupDate", formatPickupDate(pickup.pickup_date));

  setText("modalPickupTime", pickup.pickup_time || "Not specified");

  setText("modalPickupLocation", buildPickupLocation(pickup));

  setText("modalPickupQuantity", `${pickup.quantity} ${pickup.unit || "pack"}`);

  /* =====================================================
   PRICE DETAILS
===================================================== */

  const foodAmount = Number(pickup.amount ?? 0);

  const platformFee = Number(pickup.platform_fee ?? 0);

  const communitySupport = Number(pickup.community_support ?? 0);

  const totalAmount = Number(
    pickup.total_amount ?? foodAmount + platformFee + communitySupport,
  );

  setText("modalFoodAmount", formatCurrency(foodAmount));

  setText("modalPlatformFee", formatCurrency(platformFee));

  setText("modalCommunitySupport", formatCurrency(communitySupport));

  setText("modalTotalAmount", formatCurrency(totalAmount));

  const instructionsSection = document.getElementById(
    "modalInstructionsSection",
  );

  const instructions = document.getElementById("modalPickupInstructions");

  if (instructions) {
    if (pickup.instructions) {
      instructions.textContent = pickup.instructions;
    } else {
      instructions.textContent = "No pickup instructions provided.";
    }

    if (instructionsSection) {
      instructionsSection.style.display = "block";
    }
  }

  showElement("pickupDetailsModal");
}

/* =========================================================
   CLOSE DETAILS MODAL
   ========================================================= */

function closeDetailsModal() {
  hideElement("pickupDetailsModal");

  selectedPickup = null;
}

/* =========================================================
   STATUS LABEL
   ========================================================= */

function getStatusLabel(status) {
  switch (status) {
    case "ready_for_pickup":
      return "Ready for Pickup";

    case "completed":
      return "Picked Up";

    case "cancelled":
      return "Cancelled by You";

    case "accepted":
      return "Accepted";

    case "rejected":
      return "Rejected";

    case "pending":
      return "Pending";

    default:
      return capitalizeWords(String(status || ""));
  }
}

/* =========================================================
   LOCATION
   ========================================================= */

function buildPickupLocation(pickup) {
  const parts = [];

  if (pickup.listing_address) {
    parts.push(pickup.listing_address);
  }

  if (
    pickup.listing_area &&
    !parts.some((part) =>
      part.toLowerCase().includes(pickup.listing_area.toLowerCase()),
    )
  ) {
    parts.push(pickup.listing_area);
  }

  if (
    pickup.listing_city &&
    !parts.some((part) =>
      part.toLowerCase().includes(pickup.listing_city.toLowerCase()),
    )
  ) {
    parts.push(pickup.listing_city);
  }

  return parts.length ? parts.join(", ") : "Pickup location not available";
}

/* =========================================================
   MAP
   ========================================================= */

function openPickupMap(pickup) {
  const location = buildPickupLocation(pickup);

  if (!location || location === "Pickup location not available") {
    showToast("Pickup location is not available.", "error");

    return;
  }

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location,
  )}`;

  window.open(mapUrl, "_blank", "noopener,noreferrer");
}

/* =========================================================
   RETRY
   ========================================================= */

function setupRetry() {
  const button = document.getElementById("retryPickupBtn");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    loadPickups();
  });
}

/* =========================================================
   PROFILE DROPDOWN
   ========================================================= */

function setupProfileMenu() {
  const button = document.getElementById("profileMenuBtn");
  const dropdown = document.getElementById("profileDropdown");

  if (!button || !dropdown) {
    return;
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    dropdown.classList.toggle("hidden");
  });

  dropdown.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      dropdown.classList.add("hidden");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      dropdown.classList.add("hidden");
    }
  });

  const logoutButton = document.getElementById("logoutBtn");

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", {
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
    });
  }
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function setupNotifications() {
  const button = document.getElementById("notificationBtn");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    window.location.href = "/notifications";
  });
}

/* =========================================================
   UI STATES
   ========================================================= */

function showLoading() {
  showElement("pickupLoading");

  hideElement("pickupError");

  hideElement("pickupEmpty");

  const list = document.getElementById("pickupList");

  if (list) {
    list.innerHTML = "";
  }
}

function showError(message) {
  hideElement("pickupLoading");

  hideElement("pickupEmpty");

  showElement("pickupError");

  setText("pickupErrorMessage", message);
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "success") {
  let toast = document.getElementById("reserveToast");

  if (!toast) {
    toast = document.createElement("div");

    toast.id = "reserveToast";

    document.body.appendChild(toast);

    Object.assign(toast.style, {
      position: "fixed",
      right: "25px",
      bottom: "25px",
      zIndex: "5000",
      padding: "13px 18px",
      borderRadius: "10px",
      fontFamily: "Poppins, sans-serif",
      fontSize: "12px",
      fontWeight: "600",
      boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
      transition: "all 0.25s ease",
    });
  }

  toast.textContent = message;

  if (type === "error") {
    toast.style.background = "#ffe9e9";

    toast.style.color = "#c72b2b";

    toast.style.border = "1px solid #f2caca";
  } else {
    toast.style.background = "#e4f7ed";

    toast.style.color = "#087b5b";

    toast.style.border = "1px solid #c8eadc";
  }

  toast.style.opacity = "1";

  toast.style.transform = "translateY(0)";

  clearTimeout(toast._timer);

  toast._timer = setTimeout(() => {
    toast.style.opacity = "0";

    toast.style.transform = "translateY(8px)";
  }, 3000);
}

/* =========================================================
   DATE / TIME HELPERS
   ========================================================= */

function formatPickupDate(dateValue) {
  if (!dateValue) {
    return "Date not specified";
  }

  const date = parseDateValue(dateValue);

  if (!date) {
    return String(dateValue);
  }

  const today = new Date();

  const tomorrow = new Date();

  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateKey = formatDateKey(date);

  const todayKey = formatDateKey(today);

  const tomorrowKey = formatDateKey(tomorrow);

  const formatted = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (dateKey === todayKey) {
    return `Today, ${formatted}`;
  }

  if (dateKey === tomorrowKey) {
    return `Tomorrow, ${formatted}`;
  }

  const yesterday = new Date();

  yesterday.setDate(yesterday.getDate() - 1);

  if (dateKey === formatDateKey(yesterday)) {
    return `Yesterday, ${formatted}`;
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const stringValue = String(value);

  /*
   * Handle YYYY-MM-DD without
   * timezone shifting.
   */

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    const parts = stringValue.split("-").map(Number);

    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  const date = new Date(value);

  return isNaN(date.getTime()) ? null : date;
}

function formatDateKey(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPickupTimestamp(pickup) {
  if (!pickup.pickup_date) {
    return Number.MAX_SAFE_INTEGER;
  }

  const date = parseDateValue(pickup.pickup_date);

  if (!date) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timeText = pickup.pickup_time || "";

  /*
   * Supports:
   *
   * 5:00 PM - 6:00 PM
   * 17:00 - 18:00
   * 5:00 PM
   */

  const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);

  if (timeMatch) {
    let hours = Number(timeMatch[1]);

    const minutes = Number(timeMatch[2]);

    const meridiem = timeMatch[3];

    if (meridiem && meridiem.toUpperCase() === "PM" && hours < 12) {
      hours += 12;
    }

    if (meridiem && meridiem.toUpperCase() === "AM" && hours === 12) {
      hours = 0;
    }

    date.setHours(hours, minutes, 0, 0);
  }

  return date.getTime();
}

function getTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return isNaN(timestamp) ? 0 : timestamp;
}

/* =========================================================
   FORMATTING
   ========================================================= */

function formatCurrency(amount) {
  const number = Number(amount || 0);

  return number.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function capitalizeFirstLetter(value) {
  const text = String(value || "");

  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function capitalizeWords(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/* =========================================================
   DOM HELPERS
   ========================================================= */

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function setElementText(parent, selector, value) {
  const element = parent.querySelector(selector);

  if (element) {
    element.textContent = value ?? "";
  }
}

function showElement(id) {
  const element = document.getElementById(id);

  if (element) {
    element.style.display = "";
  }
}

function hideElement(id) {
  const element = document.getElementById(id);

  if (element) {
    element.style.display = "none";
  }
}

/* =========================================================
   DEBOUNCE
   ========================================================= */

function debounce(callback, delay) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);

    timeout = setTimeout(() => callback(...args), delay);
  };
}
