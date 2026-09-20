/* =========================================================
   ReServe — My Reservations
   User Reservation Management
   ========================================================= */

"use strict";

/* =========================================================
   GLOBAL STATE
   ========================================================= */

let allReservations = [];
let filteredReservations = [];

let currentTab = "all";
let currentSort = "latest";

let currentPage = 1;

const ITEMS_PER_PAGE = 5;

/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initializePage();
});

/* =========================================================
   INITIALIZE PAGE
   ========================================================= */

async function initializePage() {
  try {
    setupNavbar();
    setupProfileMenu();

    setupTabs();
    setupSearch();
    setupSorting();

    setupPagination();
    setupModal();

    await loadReservations();
  } catch (error) {
    console.error("My Reservations initialization error:", error);

    showReservationsError(error.message || "Unable to load reservations.");
  }
}

/* =========================================================
   LOAD RESERVATIONS
   ========================================================= */

async function loadReservations() {
  showReservationsLoading(true);

  hideReservationsError();

  try {
    const response = await fetch("/api/user/reservations", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    const contentType = response.headers.get("content-type") || "";

    let data = {};

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();

      console.error("Unexpected server response:", text);

      throw new Error(
        response.ok
          ? "Unexpected response from server."
          : `Server error (${response.status}).`,
      );
    }

    if (!response.ok) {
      throw new Error(data.message || "Unable to load your reservations.");
    }

    if (data.success === false) {
      throw new Error(data.message || "Unable to load your reservations.");
    }

    allReservations = Array.isArray(data.reservations) ? data.reservations : [];

    filteredReservations = [...allReservations];

    currentPage = 1;

    updateReservationCounters();

    showReservationsLoading(false);

    applyFiltersAndRender();
  } catch (error) {
    console.error("Load reservations error:", error);

    showReservationsLoading(false);

    showReservationsError(error.message || "Unable to load reservations.");
  }
}

/* =========================================================
   TABS
   ========================================================= */

function setupTabs() {
  const tabs = document.querySelectorAll(".reservation-tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const filter = tab.dataset.status || "all";

      currentTab = filter;

      currentPage = 1;

      tabs.forEach((item) => {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      applyFiltersAndRender();
    });
  });
}

/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {
  const searchInput = document.getElementById("reservationSearch");

  const clearButton = document.getElementById("clearSearchBtn");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", () => {
    currentPage = 1;

    if (clearButton) {
      clearButton.classList.toggle("hidden", !searchInput.value.trim());
    }

    applyFiltersAndRender();
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      searchInput.value = "";

      clearButton.classList.add("hidden");

      currentPage = 1;

      applyFiltersAndRender();

      searchInput.focus();
    });
  }
}

/* =========================================================
   SORTING
   ========================================================= */

function setupSorting() {
  const sortSelect = document.getElementById("reservationSort");

  if (!sortSelect) {
    return;
  }

  /*
   * Current options:
   *
   * latest
   * oldest
   */

  currentSort = sortSelect.value || "latest";

  sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value || "latest";

    currentPage = 1;

    applyFiltersAndRender();
  });
}

/* =========================================================
   FILTER + SORT + RENDER
   ========================================================= */

function applyFiltersAndRender() {
  let result = [...allReservations];

  /* -------------------------------------------------------
     TAB FILTER
  ------------------------------------------------------- */

  if (currentTab !== "all") {
    result = result.filter((reservation) => {
      const status = normalizeStatus(reservation.status);

      if (currentTab === "upcoming") {
        return (
          status === "pending" || status === "reserved" || status === "accepted"
        );
      }

      if (currentTab === "completed") {
        return status === "completed";
      }

      if (currentTab === "cancelled") {
        return (
          status === "cancelled" ||
          status === "canceled" ||
          status === "rejected"
        );
      }

      return true;
    });
  }

  /* -------------------------------------------------------
     SEARCH
  ------------------------------------------------------- */

  const searchInput = document.getElementById("reservationSearch");

  const searchTerm = searchInput?.value?.trim().toLowerCase() || "";

  if (searchTerm) {
    result = result.filter((reservation) => {
      const searchableText = [
        reservation.food_name,
        reservation.food_title,
        reservation.provider_name,
        reservation.restaurant_name,
        reservation.category,
        reservation.request_id,
        reservation.order_id,
        reservation.listing_area,
        reservation.listing_city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchTerm);
    });
  }

  /* -------------------------------------------------------
     SORT
  ------------------------------------------------------- */

  result.sort((a, b) => {
    return compareReservations(a, b, currentSort);
  });

  filteredReservations = result;

  renderReservations();
}

/* =========================================================
   SORT COMPARATOR
   ========================================================= */

function compareReservations(a, b, sort) {
  const createdA = getTimestamp(a.created_at);

  const createdB = getTimestamp(b.created_at);

  switch (sort) {
    case "oldest":
      return createdA - createdB;

    case "latest":
    default:
      return createdB - createdA;
  }
}

/* =========================================================
   RENDER RESERVATIONS
   ========================================================= */

function renderReservations() {
  const container = document.getElementById("reservationsContainer");

  const emptyState = document.getElementById("reservationEmpty");

  if (!container) {
    return;
  }

  /* -------------------------------------------------------
     NO RESULTS
  ------------------------------------------------------- */

  if (filteredReservations.length === 0) {
    container.innerHTML = "";

    showEmptyState();

    updateFooter(0);

    updatePagination(0);

    return;
  }

  hideEmptyState();

  /* -------------------------------------------------------
     PAGINATION
  ------------------------------------------------------- */

  const totalPages = Math.ceil(filteredReservations.length / ITEMS_PER_PAGE);

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const start = (currentPage - 1) * ITEMS_PER_PAGE;

  const end = start + ITEMS_PER_PAGE;

  const pageItems = filteredReservations.slice(start, end);

  /* -------------------------------------------------------
     CREATE CARDS
  ------------------------------------------------------- */

  container.innerHTML = pageItems
    .map((reservation) => createReservationCard(reservation))
    .join("");

  bindReservationActions();

  updateFooter(filteredReservations.length);

  updatePagination(totalPages);
}

/* =========================================================
   CREATE RESERVATION CARD
   ========================================================= */

function createReservationCard(reservation) {
  const status = normalizeStatus(reservation.status);

  const statusInfo = getStatusInfo(status);

  const foodName =
    reservation.food_name || reservation.food_title || "Food Item";

  const providerName =
    reservation.provider_name ||
    reservation.restaurant_name ||
    reservation.business_name ||
    reservation.organization_name ||
    reservation.provider_business_name ||
    "Food Provider";

  const category = reservation.category || "Food";

  const foodType = reservation.food_type || "";

  const quantity = Number(reservation.quantity) || 0;

  const unit = reservation.unit || "items";

  const image = reservation.image || "/static/images/food-placeholder.jpg";

  const unitPrice = Number(reservation.unit_price ?? reservation.price ?? 0);

  const reservationTotal = getReservationTotal(reservation);

  const originalPrice = Number(reservation.original_price ?? 0);

  const discount = calculateDiscount(originalPrice, unitPrice);

  const pickupDate = formatPickupDate(reservation.pickup_date);

  const pickupTime = reservation.pickup_time || "Not specified";

  const area = reservation.listing_area || reservation.area || "";

  const city = reservation.listing_city || reservation.city || "";

  const address = reservation.listing_address || reservation.address || "";

  const location =
    [area, city].filter(Boolean).join(", ") ||
    address ||
    "Pickup location not available";

  const reservationId = getReservationId(reservation);

  const canCancel =
    status === "pending" || status === "reserved" || status === "accepted";

  const isCompleted = status === "completed";

  return `
    <article
      class="reservation-card"
      data-id="${escapeHTML(reservationId)}"
    >

      <!-- =============================================
           FOOD
      ============================================== -->

      <div class="reservation-food">

        <div class="reservation-image-wrapper">

          <img
            src="${escapeAttribute(image)}"
            alt="${escapeAttribute(foodName)}"
            onerror="this.src='/static/images/food-placeholder.jpg'"
          >

          <button
            type="button"
            class="reservation-favorite-btn"
            data-action="favorite"
            title="Save food"
          >
            <i class="ri-heart-line"></i>
          </button>

          ${
            isVegetarian(foodType)
              ? `
                <span class="reservation-veg-badge">
                  <i class="ri-leaf-line"></i>
                  Veg
                </span>
              `
              : ""
          }

        </div>

        <div class="reservation-food-info">

          <h3>
            ${escapeHTML(foodName)}
          </h3>

          <div class="reservation-provider">
            ${escapeHTML(providerName)}

            ${
              reservation.provider_verified
                ? `
                  <i
                    class="ri-verified-badge-fill"
                    title="Verified provider"
                  ></i>
                `
                : ""
            }
          </div>

          <div class="reservation-tags">

            <span class="reservation-tag category">
              ${escapeHTML(category)}
            </span>

            ${
              foodType
                ? `
                  <span class="reservation-tag vegetarian">
                    ${escapeHTML(formatFoodType(foodType))}
                  </span>
                `
                : ""
            }

          </div>

         <div class="reservation-price-row">

  <span class="reservation-price">
    ₹${formatMoney(reservationTotal)}
  </span>

  ${
    originalPrice > unitPrice
      ? `
        <span class="reservation-original-price">
          ₹${formatMoney(originalPrice)}
        </span>
      `
      : ""
  }

  ${
    discount > 0
      ? `
        <span class="reservation-discount">
          ${discount}% OFF
        </span>
      `
      : ""
  }

</div>

        </div>

      </div>

      <!-- =============================================
           PICKUP
      ============================================== -->

      <div class="reservation-pickup">

        <div class="pickup-detail">

          <i class="ri-calendar-line"></i>

          <div>

            <span>
              Pickup Date
            </span>

            <strong>
              ${escapeHTML(pickupDate)}
            </strong>

          </div>

        </div>

        <div class="pickup-detail">

          <i class="ri-time-line"></i>

          <div>

            <span>
              Pickup Time
            </span>

            <strong>
              ${escapeHTML(pickupTime)}
            </strong>

          </div>

        </div>

        <div class="pickup-detail">

          <i class="ri-map-pin-line"></i>

          <div>

            <span>
              Pickup Location
            </span>

            <strong>
              ${escapeHTML(location)}
            </strong>

            ${
              address
                ? `
                  <button
                    type="button"
                    class="pickup-map-link"
                    data-action="map"
                    data-address="${escapeAttribute(address)}"
                    data-city="${escapeAttribute(city)}"
                  >
                    <i class="ri-map-2-line"></i>
                    View on Map
                  </button>
                `
                : ""
            }

          </div>

        </div>

      </div>

      <!-- =============================================
           STATUS / ACTIONS
      ============================================== -->

      <div class="reservation-status-area">

        <div>

          <span
            class="reservation-status ${statusInfo.className}"
          >
            <i class="${statusInfo.icon}"></i>

            ${escapeHTML(statusInfo.label)}
          </span>

          <div class="reservation-status-text">
            ${escapeHTML(statusInfo.title)}
          </div>

          <div class="reservation-status-message">
            ${escapeHTML(statusInfo.message)}
          </div>

        </div>

        <div class="reservation-actions">

          <button
            type="button"
            class="reservation-action-btn reservation-view-btn"
            data-action="view"
            data-id="${escapeHTML(reservationId)}"
          >
            <i class="ri-eye-line"></i>
            View Details
          </button>

          ${
            canCancel
              ? `
                <button
                  type="button"
                  class="reservation-action-btn reservation-cancel-btn"
                  data-action="cancel"
                  data-id="${escapeHTML(reservationId)}"
                >
                  <i class="ri-close-line"></i>
                  Cancel Reservation
                </button>
              `
              : ""
          }

          ${
            isCompleted
              ? `
                <button
                  type="button"
                  class="reservation-action-btn reservation-reorder-btn"
                  data-action="reorder"
                  data-id="${escapeHTML(reservationId)}"
                >
                  <i class="ri-refresh-line"></i>
                  Reorder
                </button>
              `
              : ""
          }

        </div>

      </div>

    </article>
  `;
}

/* =========================================================
   STATUS INFORMATION
   ========================================================= */

function getStatusInfo(status) {
  switch (status) {
    case "pending":
      return {
        label: "Pending",
        className: "upcoming",
        icon: "ri-time-line",
        title: "Reservation request sent",
        message: "Waiting for the provider to accept your request.",
      };

    case "reserved":
      return {
        label: "Upcoming",
        className: "upcoming",
        icon: "ri-time-line",
        title: "Your food is reserved!",
        message: "Please arrive on time for pickup.",
      };

    case "accepted":
      return {
        label: "Upcoming",
        className: "upcoming",
        icon: "ri-check-line",
        title: "Your food is reserved!",
        message: "Please arrive on time for pickup.",
      };

    case "completed":
      return {
        label: "Completed",
        className: "completed",
        icon: "ri-checkbox-circle-fill",
        title: "Picked up successfully!",
        message: "Thank you for reducing food waste!",
      };

    case "cancelled":
    case "canceled":
      return {
        label: "Cancelled",
        className: "cancelled",
        icon: "ri-close-circle-fill",
        title: "Reservation cancelled",
        message: "This reservation has been cancelled.",
      };

    case "rejected":
      return {
        label: "Cancelled",
        className: "cancelled",
        icon: "ri-close-circle-fill",
        title: "Reservation not accepted",
        message: "The provider did not accept this request.",
      };

    default:
      return {
        label: "Upcoming",
        className: "upcoming",
        icon: "ri-time-line",
        title: "Reservation",
        message: "Please check your pickup details.",
      };
  }
}

/* =========================================================
   BIND CARD ACTIONS
   ========================================================= */

function bindReservationActions() {
  const buttons = document.querySelectorAll(
    "#reservationsContainer [data-action]",
  );

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action;

      const id = button.dataset.id;

      if (action === "view") {
        viewReservation(id);
        return;
      }

      if (action === "cancel") {
        await cancelReservation(id);
        return;
      }

      if (action === "reorder") {
        reorderReservation(id);
        return;
      }

      if (action === "map") {
        openMap(button.dataset.address, button.dataset.city);
        return;
      }

      if (action === "favorite") {
        toggleFavorite(button);
      }
    });
  });
}

/* =========================================================
   VIEW RESERVATION
   ========================================================= */

function viewReservation(id) {
  const reservation = allReservations.find(
    (item) => getReservationId(item) === id,
  );

  if (!reservation) {
    return;
  }

  populateReservationModal(reservation);

  openReservationModal();
}

/* =========================================================
   CANCEL RESERVATION
   ========================================================= */

async function cancelReservation(id) {
  const reservation = allReservations.find(
    (item) => getReservationId(item) === id,
  );

  if (!reservation) {
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to cancel this reservation?",
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `/api/user/reservations/${encodeURIComponent(id)}/cancel`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      },
    );

    const contentType = response.headers.get("content-type") || "";

    let data = {};

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();

      console.error("Cancel response:", text);

      throw new Error(
        response.ok
          ? "Unexpected response from server."
          : `Server error (${response.status}).`,
      );
    }

    if (!response.ok) {
      throw new Error(data.message || "Unable to cancel reservation.");
    }

    if (data.success === false) {
      throw new Error(data.message || "Unable to cancel reservation.");
    }

    alert(data.message || "Reservation cancelled successfully.");

    await loadReservations();
  } catch (error) {
    console.error("Cancel reservation error:", error);

    alert(error.message || "Unable to cancel reservation.");
  }
}

/* =========================================================
   REORDER
   ========================================================= */

function reorderReservation(id) {
  const reservation = allReservations.find(
    (item) => getReservationId(item) === id,
  );

  if (!reservation) {
    return;
  }

  const listingId = reservation.listing_id || reservation.food_listing_id;

  if (!listingId) {
    alert("This food listing is no longer available for reorder.");

    return;
  }

  window.location.href = `/listing/${encodeURIComponent(listingId)}`;
}

/* =========================================================
   FAVORITE
   ========================================================= */

function toggleFavorite(button) {
  if (!button) {
    return;
  }

  const icon = button.querySelector("i");

  if (!icon) {
    return;
  }

  const active = icon.classList.contains("ri-heart-fill");

  if (active) {
    icon.className = "ri-heart-line";

    button.style.color = "#ef6c73";
  } else {
    icon.className = "ri-heart-fill";

    button.style.color = "#e53955";
  }
}

/* =========================================================
   MAP
   ========================================================= */

function openMap(address, city) {
  const query = [address, city].filter(Boolean).join(", ");

  if (!query) {
    return;
  }

  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

/* =========================================================
   MODAL SETUP
   ========================================================= */

function setupModal() {
  const modal = document.getElementById("reservationModal");

  if (!modal) {
    return;
  }

  const overlay = document.getElementById("reservationModalOverlay");

  const closeButton = document.getElementById("closeReservationModal");

  if (closeButton) {
    closeButton.addEventListener("click", closeReservationModal);
  }

  if (overlay) {
    overlay.addEventListener("click", closeReservationModal);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeReservationModal();
    }
  });
}

/* =========================================================
   POPULATE RESERVATION MODAL
   ========================================================= */

function populateReservationModal(reservation) {
  const foodName =
    reservation.food_name || reservation.food_title || "Food Item";

  const provider =
    reservation.provider_name ||
    reservation.restaurant_name ||
    reservation.business_name ||
    reservation.organization_name ||
    reservation.provider_business_name ||
    "Food Provider";

  const category = reservation.category || "Food";

  const quantity = Number(reservation.quantity) || 0;

  const unit = reservation.unit || "items";

  const reservationTotal = getReservationTotal(reservation);

  const date = formatPickupDate(reservation.pickup_date);

  const time = reservation.pickup_time || "Not specified";

  /* -------------------------------------------------------
     LOCATION
  ------------------------------------------------------- */

  const area = reservation.listing_area || reservation.area || "";

  const city = reservation.listing_city || reservation.city || "";

  const address = reservation.listing_address || reservation.address || "";

  /* -------------------------------------------------------
     REQUEST ID
  ------------------------------------------------------- */

  const requestId =
    reservation.request_id ||
    reservation.order_id ||
    reservation._id ||
    "Not available";

  /* -------------------------------------------------------
     RESERVED ON
     
     created_at = date reservation
     was submitted.
  ------------------------------------------------------- */

  const reservedOn = reservation.created_at
    ? formatReservedDate(reservation.created_at)
    : "Not available";

  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  const status = getStatusInfo(normalizeStatus(reservation.status));

  /* -------------------------------------------------------
     BASIC INFORMATION
  ------------------------------------------------------- */

  setModalText("modalFoodName", foodName);

  setModalText("modalProviderName", provider);

  setModalText("modalFoodCategory", category);

  /* -------------------------------------------------------
     PICKUP
  ------------------------------------------------------- */

  setModalText("modalPickupDate", date);

  setModalText("modalPickupTime", time);

  setModalText("modalPickupArea", area || city || "Not available");

  setModalText("modalPickupAddress", address || "Not available");

  /* -------------------------------------------------------
     RESERVATION SUMMARY
  ------------------------------------------------------- */

  setModalText("modalQuantity", `${quantity} ${unit}`);

  setModalText("modalAmount", `₹${formatMoney(reservationTotal)}`);

  setModalText("modalRequestId", requestId);

  /*
   * IMPORTANT:
   * HTML uses modalCreatedAt.
   */

  setModalText("modalCreatedAt", reservedOn);

  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  setModalText("modalStatus", status.label);

  /* -------------------------------------------------------
     INSTRUCTIONS
  ------------------------------------------------------- */

  setModalText(
    "modalInstructions",
    reservation.instructions || "No special instructions provided.",
  );

  /* -------------------------------------------------------
     FOOD IMAGE
  ------------------------------------------------------- */

  const image = document.getElementById("modalFoodImage");

  if (image) {
    image.src = reservation.image || "/static/images/food-placeholder.jpg";

    image.alt = foodName;

    image.onerror = () => {
      image.src = "/static/images/food-placeholder.jpg";
    };
  }

  /* -------------------------------------------------------
     MODAL MAP BUTTON
  ------------------------------------------------------- */

  const modalMapButton = document.getElementById("modalMapBtn");

  if (modalMapButton) {
    const hasLocation = Boolean(address || city);

    modalMapButton.style.display = hasLocation ? "inline-flex" : "none";

    modalMapButton.onclick = () => {
      openMap(address, city);
    };
  }

  /* -------------------------------------------------------
     MODAL CANCEL BUTTON
  ------------------------------------------------------- */

  const modalCancelButton = document.getElementById("modalCancelBtn");

  if (modalCancelButton) {
    const normalizedStatus = normalizeStatus(reservation.status);

    const canCancel =
      normalizedStatus === "pending" ||
      normalizedStatus === "reserved" ||
      normalizedStatus === "accepted";

    modalCancelButton.classList.toggle("hidden", !canCancel);

    modalCancelButton.onclick = async () => {
      closeReservationModal();

      await cancelReservation(getReservationId(reservation));
    };
  }

  /* -------------------------------------------------------
     MODAL REORDER BUTTON
  ------------------------------------------------------- */

  const modalReorderButton = document.getElementById("modalReorderBtn");

  if (modalReorderButton) {
    const normalizedStatus = normalizeStatus(reservation.status);

    const isCompleted = normalizedStatus === "completed";

    modalReorderButton.classList.toggle("hidden", !isCompleted);

    modalReorderButton.onclick = () => {
      reorderReservation(getReservationId(reservation));
    };
  }
}

/* =========================================================
   OPEN MODAL
   ========================================================= */

function openReservationModal() {
  const modal = document.getElementById("reservationModal");

  if (!modal) {
    return;
  }

  modal.classList.remove("hidden");

  document.body.style.overflow = "hidden";
}

/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeReservationModal() {
  const modal = document.getElementById("reservationModal");

  if (!modal) {
    return;
  }

  modal.classList.add("hidden");

  document.body.style.overflow = "";
}

/* =========================================================
   COUNTERS
   ========================================================= */

function updateReservationCounters() {
  const all = allReservations.length;

  const upcoming = allReservations.filter((item) => {
    const status = normalizeStatus(item.status);

    return (
      status === "pending" || status === "reserved" || status === "accepted"
    );
  }).length;

  const completed = allReservations.filter(
    (item) => normalizeStatus(item.status) === "completed",
  ).length;

  const cancelled = allReservations.filter((item) => {
    const status = normalizeStatus(item.status);

    return (
      status === "cancelled" || status === "canceled" || status === "rejected"
    );
  }).length;

  /* -------------------------------------------------------
     EXACT HTML IDS
  ------------------------------------------------------- */

  updateReservationCounter("all", all, "allReservationCount");

  updateReservationCounter("upcoming", upcoming, "upcomingReservationCount");

  updateReservationCounter("completed", completed, "completedReservationCount");

  updateReservationCounter("cancelled", cancelled, "cancelledReservationCount");
}

/* =========================================================
   UPDATE TAB COUNTER
   ========================================================= */

function updateReservationCounter(filter, count, elementId) {
  /* -------------------------------------------------------
     EXACT COUNTER ID
  ------------------------------------------------------- */

  const counter = document.getElementById(elementId);

  if (counter) {
    counter.textContent = count;
  }

  /* -------------------------------------------------------
     TAB COUNTER
     
     HTML uses data-status, NOT data-filter.
  ------------------------------------------------------- */

  const tabs = document.querySelectorAll(
    `.reservation-tab[data-status="${filter}"]`,
  );

  tabs.forEach((tab) => {
    const tabCounter = tab.querySelector("span");

    if (tabCounter) {
      tabCounter.textContent = count;
    }
  });
}

/* =========================================================
   FOOTER
   ========================================================= */

function updateFooter(total) {
  const resultText = document.getElementById("reservationResultText");

  if (!resultText) {
    return;
  }

  if (total === 0) {
    resultText.textContent = "Showing 0 reservations";

    return;
  }

  const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const end = Math.min(currentPage * ITEMS_PER_PAGE, total);

  resultText.textContent = `Showing ${start}–${end} of ${total} reservations`;
}

/* =========================================================
   PAGINATION SETUP
   ========================================================= */

function setupPagination() {
  const previousButton = document.getElementById("previousPageBtn");

  const nextButton = document.getElementById("nextPageBtn");

  if (previousButton) {
    previousButton.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;

        renderReservations();

        scrollToReservations();
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      const totalPages = Math.ceil(
        filteredReservations.length / ITEMS_PER_PAGE,
      );

      if (currentPage < totalPages) {
        currentPage++;

        renderReservations();

        scrollToReservations();
      }
    });
  }
}

/* =========================================================
   UPDATE PAGINATION
   ========================================================= */

function updatePagination(totalPages) {
  const previousButton = document.getElementById("previousPageBtn");

  const nextButton = document.getElementById("nextPageBtn");

  const pageNumber = document.getElementById("currentPage");

  if (pageNumber) {
    pageNumber.textContent = totalPages > 0 ? currentPage : 1;
  }

  if (previousButton) {
    previousButton.disabled = currentPage <= 1;
  }

  if (nextButton) {
    nextButton.disabled = totalPages === 0 || currentPage >= totalPages;
  }
}

/* =========================================================
   SCROLL
   ========================================================= */

function scrollToReservations() {
  const section = document.querySelector(".reservations-section");

  if (!section) {
    return;
  }

  section.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

/* =========================================================
   LOADING STATE
   ========================================================= */

function showReservationsLoading(show) {
  const loading = document.getElementById("reservationsLoading");

  const container = document.getElementById("reservationsContainer");

  if (loading) {
    loading.classList.toggle("hidden", !show);

    loading.style.display = show ? "flex" : "none";
  }

  if (container) {
    container.classList.toggle("is-loading", show);
  }
}

/* =========================================================
   EMPTY STATE
   ========================================================= */

function showEmptyState() {
  const empty = document.getElementById("reservationEmpty");

  if (!empty) {
    return;
  }

  const title = document.getElementById("emptyTitle");

  const message = document.getElementById("emptyMessage");

  if (title) {
    title.textContent = "No reservations found";
  }

  if (message) {
    if (currentTab === "upcoming") {
      message.textContent = "You don't have any upcoming reservations.";
    } else if (currentTab === "completed") {
      message.textContent = "You don't have any completed reservations yet.";
    } else if (currentTab === "cancelled") {
      message.textContent = "You don't have any cancelled reservations.";
    } else {
      message.textContent = "You haven't made any food reservations yet.";
    }
  }

  empty.classList.remove("hidden");
}

/* =========================================================
   HIDE EMPTY STATE
   ========================================================= */

function hideEmptyState() {
  const empty = document.getElementById("reservationEmpty");

  if (empty) {
    empty.classList.add("hidden");
  }
}

/* =========================================================
   ERROR
   ========================================================= */

function showReservationsError(message) {
  const errorBox = document.getElementById("reservationsError");

  const errorMessage = document.getElementById("reservationsErrorMessage");

  const retryButton = document.getElementById("retryReservationsBtn");

  const container = document.getElementById("reservationsContainer");

  if (container) {
    container.innerHTML = "";
  }

  hideEmptyState();

  if (errorMessage) {
    errorMessage.textContent =
      message || "Something went wrong while loading your reservations.";
  }

  if (errorBox) {
    errorBox.classList.remove("hidden");
  }

  if (retryButton) {
    retryButton.onclick = () => {
      loadReservations();
    };
  }
}

/* =========================================================
   HIDE ERROR
   ========================================================= */

function hideReservationsError() {
  const errorBox = document.getElementById("reservationsError");

  if (errorBox) {
    errorBox.classList.add("hidden");
  }
}

/* =========================================================
   NAVBAR
   ========================================================= */

function setupNavbar() {
  const logoutButton = document.getElementById("logoutBtn");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", async () => {
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

/* =========================================================
   PROFILE MENU
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

  document.addEventListener("click", () => {
    dropdown.classList.add("hidden");
  });
}

/* =========================================================
   HELPERS
   ========================================================= */

function getReservationId(reservation) {
  return String(
    reservation._id ||
      reservation.id ||
      reservation.order_id ||
      reservation.request_id ||
      "",
  );
}

/* =========================================================
   NORMALIZE STATUS
   ========================================================= */

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/* =========================================================
   FORMAT FOOD TYPE
   ========================================================= */

function formatFoodType(foodType) {
  const value = String(foodType || "").toLowerCase();

  if (value.includes("vegetarian") || value === "veg") {
    return "Vegetarian";
  }

  if (value.includes("vegan")) {
    return "Vegan";
  }

  if (value.includes("non")) {
    return "Non-Vegetarian";
  }

  return foodType;
}

/* =========================================================
   VEGETARIAN CHECK
   ========================================================= */

function isVegetarian(foodType) {
  const value = String(foodType || "").toLowerCase();

  return value.includes("vegetarian") || value === "veg";
}

/* =========================================================
   DISCOUNT
   ========================================================= */

function calculateDiscount(original, current) {
  if (!original || original <= current) {
    return 0;
  }

  return Math.round(((original - current) / original) * 100);
}

/* =========================================================
   RESERVATION TOTAL / MONEY
   ========================================================= */

function getReservationTotal(reservation) {
  if (!reservation) {
    return 0;
  }

  /*
   * New reservations:
   * Backend stores the final calculated total.
   */
  const storedTotal = Number(reservation.total_amount);

  if (Number.isFinite(storedTotal) && storedTotal >= 0) {
    return storedTotal;
  }

  /*
   * Older reservations:
   * Calculate the food amount if total_amount
   * was not stored.
   */
  const quantity = Number(reservation.quantity || 0);

  const unitPrice = Number(reservation.unit_price ?? reservation.price ?? 0);

  const foodAmount = Number(reservation.amount) || unitPrice * quantity;

  /*
   * Platform fee:
   * 5% of food amount, maximum ₹20.
   */
  let platformFee = Number(reservation.platform_fee);

  if (!Number.isFinite(platformFee) || platformFee < 0) {
    platformFee = Math.min(foodAmount * 0.05, 20);
  }

  /*
   * Community support.
   */
  const communitySupport = Number(reservation.community_support || 0) || 0;

  return foodAmount + platformFee + communitySupport;
}

function formatMoney(amount) {
  const number = Number(amount) || 0;

  return number.toLocaleString("en-IN", {
    minimumFractionDigits: number % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/* =========================================================
   PICKUP DATE
   ========================================================= */

function formatPickupDate(dateValue) {
  if (!dateValue) {
    return "Not specified";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   RESERVED DATE
   ========================================================= */

function formatReservedDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   TIMESTAMP
   ========================================================= */

function getTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

/* =========================================================
   NORMAL TEXT
   ========================================================= */

function setText(id, value) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.textContent =
    value !== undefined && value !== null && value !== "" ? value : "—";
}

/* =========================================================
   MODAL TEXT
   ========================================================= */

function setModalText(id, value) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.textContent =
    value !== undefined && value !== null && value !== "" ? value : "—";
}

/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   ESCAPE ATTRIBUTE
   ========================================================= */

function escapeAttribute(value) {
  return escapeHTML(value);
}
