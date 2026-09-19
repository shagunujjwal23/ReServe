/* ==========================================================
   ReServe - View Listing
========================================================== */

/* ==========================================================
   API
========================================================== */

const API_BASE_URL = "/api/listings";

/* ==========================================================
   GLOBAL STATE
========================================================== */

let listing = null;

/* ==========================================================
   REUSABLE UI - TOAST
========================================================== */

function showToast(message, type = "success") {
  let container = document.getElementById("reserveToastContainer");

  if (!container) {
    container = document.createElement("div");
    container.id = "reserveToastContainer";
    container.className = "reserve-toast-container";

    document.body.appendChild(container);
  }

  const toast = document.createElement("div");

  toast.className = `reserve-toast ${type}`;

  const icon =
    type === "success"
      ? "ri-checkbox-circle-line"
      : type === "error"
        ? "ri-error-warning-line"
        : "ri-information-line";

  toast.innerHTML = `
    <div class="toast-icon">
      <i class="${icon}"></i>
    </div>

    <div class="toast-content">
      <strong>
        ${type === "success" ? "Success" : type === "error" ? "Error" : "Notice"}
      </strong>

      <span>${escapeHTML(message)}</span>
    </div>

    <button type="button" class="toast-close" aria-label="Close">
      <i class="ri-close-line"></i>
    </button>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  const closeToast = () => {
    toast.classList.remove("show");

    setTimeout(() => {
      toast.remove();
    }, 250);
  };

  toast.querySelector(".toast-close").addEventListener("click", closeToast);

  setTimeout(closeToast, 3500);
}

/* ==========================================================
   CONFIRMATION MODAL
========================================================== */

function showConfirmModal({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
}) {
  return new Promise((resolve) => {
    const existingModal = document.getElementById("reserveConfirmModal");

    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");

    modal.id = "reserveConfirmModal";
    modal.className = "reserve-confirm-overlay";

    const icon =
      type === "danger"
        ? "ri-delete-bin-line"
        : type === "success"
          ? "ri-checkbox-circle-line"
          : "ri-question-line";

    modal.innerHTML = `
      <div class="reserve-confirm-modal">

        <div class="confirm-icon ${type}">
          <i class="${icon}"></i>
        </div>

        <div class="confirm-content">

          <h3>${escapeHTML(title)}</h3>

          <p>${escapeHTML(message)}</p>

        </div>

        <div class="confirm-actions">

          <button
            type="button"
            class="confirm-cancel-btn"
          >
            ${escapeHTML(cancelText)}
          </button>

          <button
            type="button"
            class="confirm-submit-btn ${type}"
          >
            ${escapeHTML(confirmText)}
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(modal);

    requestAnimationFrame(() => {
      modal.classList.add("show");
    });

    const closeModal = (result) => {
      modal.classList.remove("show");

      setTimeout(() => {
        modal.remove();
      }, 200);

      resolve(result);
    };

    modal.querySelector(".confirm-cancel-btn").addEventListener("click", () => {
      closeModal(false);
    });

    modal.querySelector(".confirm-submit-btn").addEventListener("click", () => {
      closeModal(true);
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(false);
      }
    });
  });
}

/* ==========================================================
   DOM ELEMENTS
========================================================== */

/* ----------------------------------------------------------
   Header / Summary
---------------------------------------------------------- */

const breadcrumbTitle = document.getElementById("breadcrumbTitle");

const summaryListingTitle = document.getElementById("summaryListingTitle");

const summaryCategory = document.getElementById("summaryCategory");

const summaryFoodType = document.getElementById("summaryFoodType");

const summaryQuantity = document.getElementById("summaryQuantity");

/* ----------------------------------------------------------
   Image / Main Listing
---------------------------------------------------------- */

const listingImage = document.getElementById("listingImage");

const listingStatusBadge = document.getElementById("listingStatusBadge");

const listingDescription = document.getElementById("listingDescription");

/* ----------------------------------------------------------
   Listing Information
---------------------------------------------------------- */

const foodType = document.getElementById("foodType");

const foodCategory = document.getElementById("foodCategory");

const listingType = document.getElementById("listingType");

const listingQuantity = document.getElementById("listingQuantity");

const listingPrice = document.getElementById("listingPrice");

const unit = document.getElementById("unit");

const preparationTime = document.getElementById("preparationTime");

const expiryDate = document.getElementById("expiryDate");

const pickupEnd = document.getElementById("pickupEnd");

/* ----------------------------------------------------------
   Pickup Information
---------------------------------------------------------- */

const pickupLocation = document.getElementById("pickupLocation");

const pickupStart = document.getElementById("pickupStart");

const pickupEndInfo = document.getElementById("pickupEndInfo");

const pickupInstructions = document.getElementById("pickupInstructions");

const city = document.getElementById("city");

/* ----------------------------------------------------------
   Sidebar - Status
---------------------------------------------------------- */

const sideStatus = document.getElementById("sideStatus");

const listedOn = document.getElementById("listedOn");

const listingId = document.getElementById("listingId");

const sideViews = document.getElementById("sideViews");

const sideReservations = document.getElementById("sideReservations");

const remainingQuantity = document.getElementById("remainingQuantity");

/* ----------------------------------------------------------
   AI Insights
---------------------------------------------------------- */

const performanceRecovery = document.getElementById("performanceRecovery");

const aiRecommendation = document.getElementById("aiRecommendation");

/* ----------------------------------------------------------
   Recent Reservations
---------------------------------------------------------- */

const recentReservations = document.getElementById("recentReservations");

const viewAllReservations = document.querySelector(".view-all-reservations");

/* ----------------------------------------------------------
   Actions
---------------------------------------------------------- */

const editListingBtn = document.getElementById("editListingBtn");

const removeListingBtn = document.getElementById("removeListingBtn");

const pauseListingBtn = document.getElementById("pauseListingBtn");

const duplicateListingBtn = document.getElementById("duplicateListingBtn");

/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener("DOMContentLoaded", init);

function init() {
  console.log("ReServe View Listing Loaded");

  const params = new URLSearchParams(window.location.search);

  const id = params.get("id");

  if (!id) {
    showPageError("Listing ID is missing.");
    return;
  }

  loadListing(id);
}

/* ==========================================================
   LOAD LISTING
========================================================== */

async function loadListing(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
      method: "GET",

      headers: {
        Accept: "application/json",
      },

      credentials: "same-origin",
    });

    const data = await response.json().catch(() => ({}));

    /* ------------------------------------------------------
       Authentication
    ------------------------------------------------------ */

    if (response.status === 401) {
      showToast(
        data.message || "Your session has expired. Please login again.",
        "error",
      );

      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);

      return;
    }

    /* ------------------------------------------------------
       Not Found
    ------------------------------------------------------ */

    if (response.status === 404) {
      showPageError(data.message || "Listing not found.");

      return;
    }

    /* ------------------------------------------------------
       Other Errors
    ------------------------------------------------------ */

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load listing.");
    }

    /* ------------------------------------------------------
       Store Listing
    ------------------------------------------------------ */

    listing = data.listing;

    /* ------------------------------------------------------
       Render Listing
    ------------------------------------------------------ */

    renderListing(listing);

    /* ------------------------------------------------------
       Render Reservations
    ------------------------------------------------------ */

    renderRecentReservations(
      data.recent_reservations ||
        data.reservations ||
        listing.recent_reservations ||
        listing.reservations_data ||
        [],
    );
  } catch (error) {
    console.error("Load Listing Error:", error);

    showPageError(error.message || "Unable to load listing. Please try again.");
  }
}

/* ==========================================================
   RENDER LISTING
========================================================== */

function renderListing(data) {
  /* ========================================================
     BASIC VALUES
  ======================================================== */

  const title = data.food_title || "Untitled Food Listing";

  const category = data.category || "Not specified";

  const foodTypeValue = data.food_type || "Not specified";

  const quantity = Number(data.quantity) || 0;

  const unitValue = data.unit || "—";

  const quantityText = `${quantity} ${unitValue}`.trim();

  /* ========================================================
     BREADCRUMB
  ======================================================== */

  setText(breadcrumbTitle, title);

  /* ========================================================
     SUMMARY TITLE
  ======================================================== */

  setText(summaryListingTitle, title);

  /* ========================================================
     SUMMARY TAGS
  ======================================================== */

  setText(summaryCategory, category);

  setText(summaryFoodType, foodTypeValue);

  setText(summaryQuantity, quantityText);

  /* ========================================================
     IMAGE
  ======================================================== */

  if (listingImage) {
    listingImage.src = data.image || "/static/images/food-placeholder.jpg";

    listingImage.alt = title;

    listingImage.onerror = function () {
      this.onerror = null;

      this.src = "/static/images/food-placeholder.jpg";
    };
  }

  /* ========================================================
     STATUS
  ======================================================== */

  const status = formatStatus(data.status);

  updatePauseResumeButton(data.status);

  if (listingStatusBadge) {
    listingStatusBadge.textContent = status;

    listingStatusBadge.className = "status-badge";

    listingStatusBadge.classList.add(status.toLowerCase());
  }

  if (sideStatus) {
    sideStatus.textContent = status;

    sideStatus.className = "small-status";

    sideStatus.classList.add(status.toLowerCase());
  }

  /* ========================================================
     DESCRIPTION
  ======================================================== */

  setText(listingDescription, data.description || "No description available.");

  /* ========================================================
     LISTING INFORMATION
  ======================================================== */

  setText(foodType, foodTypeValue);

  setText(foodCategory, category);

  setText(listingType, formatListingType(data.listing_type));

  setText(listingQuantity, quantityText);

  setText(unit, unitValue);

  /* ========================================================
     PRICE
  ======================================================== */

const normalizedType = String(data.listing_type || "")
  .trim()
  .toLowerCase();

const discounted =
  Number(
    data.discounted_price ??
    data.selling_price ??
    data.sale_price ??
    data.final_price ??
    data.price ??
    0
  ) || 0;

const original =
  Number(
    data.original_price ??
    data.originalPrice ??
    0
  ) || 0;

if (listingPrice) {

  /* Donation listings */
  if (
    normalizedType === "donation" ||
    normalizedType === "donate"
  ) {
    listingPrice.textContent = "Free";
  }

  /* Sale price */
  else if (discounted > 0) {
    listingPrice.textContent = `₹${discounted}`;
  }

  /* Original price fallback */
  else if (original > 0) {
    listingPrice.textContent = `₹${original}`;
  }

  else {
    listingPrice.textContent = "—";
  }
}

  /* ========================================================
     PREPARATION TIME
  ======================================================== */

  setText(
    preparationTime,
    formatPreparationTime(
      data.preparation_time ??
        data.prepared_at ??
        data.preparation_date ??
        data.preparation_datetime ??
        data.preparationTime,
    ),
  );

  /* ========================================================
     BEST BEFORE
  ======================================================== */

  setText(expiryDate, formatDateTime(data.expiry_date));

  /* ========================================================
     AVAILABLE UNTIL
  ======================================================== */

  setText(pickupEnd, formatDateTime(data.pickup_end));

  /* ========================================================
     PICKUP INFORMATION
  ======================================================== */

  setText(
    pickupLocation,
    data.pickup_location || data.location || data.address || "—",
  );

  setText(city, data.city || "—");

  setText(pickupStart, formatDateTime(data.pickup_start));

  setText(pickupEndInfo, formatDateTime(data.pickup_end));

  setText(
    pickupInstructions,
    data.pickup_instructions || "No special instructions",
  );

  /* ========================================================
     SIDEBAR STATUS
  ======================================================== */

  setText(listedOn, formatListedDate(data.created_at));

  setText(listingId, data.id ? `#${data.id}` : "—");

  /* ========================================================
     VIEWS
  ======================================================== */

  const views = Number(data.views) || 0;

  setText(sideViews, views);

  /* ========================================================
     RESERVATIONS
  ======================================================== */

  const reservations = Number(data.reservations) || 0;

  setText(sideReservations, reservations);

  /* ========================================================
     REMAINING QUANTITY
  ======================================================== */

  const remaining =
    data.remaining_quantity !== undefined && data.remaining_quantity !== null
      ? Number(data.remaining_quantity)
      : quantity;

  setText(remainingQuantity, `${remaining} ${unitValue}`.trim());

  /* ========================================================
     AI INSIGHTS
  ======================================================== */

  renderAIInsights(data);
}

/* ==========================================================
   RENDER AI INSIGHTS
========================================================== */

function renderAIInsights(data) {

  /* --------------------------------------------------------
     Recovery Chance
  -------------------------------------------------------- */

  const recovery =
    data.recovery_probability ??
    data.recoveryProbability ??
    data.recovery_chance ??
    0;

  const recoveryNumber =
    Number(recovery);

  if (!Number.isNaN(recoveryNumber)) {

    setText(
      performanceRecovery,
      `${recoveryNumber}%`
    );

  } else {

    setText(
      performanceRecovery,
      recovery
    );
  }

  /* --------------------------------------------------------
     AI Recommendation
  -------------------------------------------------------- */

  const recommendation =
    data.ai_recommendation ??
    data.aiRecommendation ??
    data.recommendation ??
    data.recommended_action;

  setText(
    aiRecommendation,
    recommendation ||
      "No recommendation available"
  );
}

/* ==========================================================
   RECENT RESERVATIONS
========================================================== */

function renderRecentReservations(reservations) {
  if (!recentReservations) {
    return;
  }

  if (!Array.isArray(reservations)) {
    reservations = [];
  }

  /* --------------------------------------------------------
     Empty State
  -------------------------------------------------------- */

  if (reservations.length === 0) {
    recentReservations.innerHTML = `
      <div class="no-reservations">

        <i class="ri-calendar-event-line"></i>

        <strong>
          No reservations yet
        </strong>

        <p>
          Reservations for this listing will appear here.
        </p>

      </div>
    `;

    return;
  }

  /* --------------------------------------------------------
     Latest 3
  -------------------------------------------------------- */

  const latestReservations = reservations.slice(0, 3);

  recentReservations.innerHTML = latestReservations
    .map((reservation) => createReservationHTML(reservation))
    .join("");
}

/* ==========================================================
   CREATE RESERVATION HTML
========================================================== */

function createReservationHTML(reservation) {
  const name =
    reservation.user_name ||
    reservation.name ||
    reservation.customer_name ||
    "Customer";

  const quantity = Number(reservation.quantity) || 0;

  const status = formatReservationStatus(reservation.status);

  const date =
    reservation.created_at || reservation.reserved_at || reservation.date;

  return `
    <div class="reservation-item">

      <div class="reservation-avatar">
        <i class="ri-user-line"></i>
      </div>

      <div class="reservation-details">

        <strong>
          ${escapeHTML(name)}
        </strong>

        <span>
          ${
            quantity > 0
              ? `${quantity} ${listing?.unit || "items"}`
              : "Reservation"
          }
        </span>

      </div>

      <div class="reservation-meta">

        <span class="reservation-status ${status.toLowerCase()}">
          ${escapeHTML(status)}
        </span>

        ${date ? `<small>${formatListedDate(date)}</small>` : ""}

      </div>

    </div>
  `;
}

/* ==========================================================
   RESERVATION STATUS
========================================================== */

function formatReservationStatus(status) {
  if (!status) {
    return "Pending";
  }

  const normalized = String(status).trim().toLowerCase();

  switch (normalized) {
    case "pending":
      return "Pending";

    case "confirmed":
      return "Confirmed";

    case "reserved":
      return "Reserved";

    case "completed":
      return "Completed";

    case "cancelled":
    case "canceled":
      return "Cancelled";

    case "rejected":
      return "Rejected";

    default:
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}

/* ==========================================================
   UPDATE PAUSE / RESUME BUTTON
========================================================== */

function updatePauseResumeButton(status) {
  if (!pauseListingBtn) {
    return;
  }

  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  const isPaused = normalizedStatus === "paused";

  if (isPaused) {
    pauseListingBtn.innerHTML = `
      <i class="ri-play-circle-line"></i>
      <span>Resume Listing</span>
    `;

    pauseListingBtn.title = "Resume Listing";

    pauseListingBtn.setAttribute("aria-label", "Resume Listing");
  } else {
    pauseListingBtn.innerHTML = `
      <i class="ri-pause-circle-line"></i>
      <span>Pause Listing</span>
    `;

    pauseListingBtn.title = "Pause Listing";

    pauseListingBtn.setAttribute("aria-label", "Pause Listing");
  }
}

/* ==========================================================
   HELPER - SET TEXT
========================================================== */

function setText(element, value) {
  if (!element) {
    return;
  }

  element.textContent =
    value !== undefined && value !== null && value !== "" ? value : "—";
}

/* ==========================================================
   FORMAT STATUS
========================================================== */

function formatStatus(status) {
  if (!status) {
    return "Available";
  }

  const normalized = String(status).trim().toLowerCase();

  switch (normalized) {
    case "available":
    case "active":
      return "Available";

    case "reserved":
      return "Reserved";

    case "completed":
      return "Completed";

    case "expired":
      return "Expired";

    case "cancelled":
    case "canceled":
      return "Cancelled";

    case "paused":
      return "Paused";

    default:
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}

/* ==========================================================
   FORMAT LISTING TYPE
========================================================== */

function formatListingType(type) {
  const normalized = String(type || "")
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "sell":
    case "sale":
    case "for sale":
      return "For Sale";

    case "donation":
    case "donate":
      return "Donation";

    default:
      if (!normalized) {
        return "—";
      }

      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ==========================================================
   FORMAT PREPARATION TIME
========================================================== */

function formatPreparationTime(value) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  const text = String(value).trim();

  /* --------------------------------------------------------
     Time-only value
     Examples:
     14:30
     14:30:00
     02:30 PM
  -------------------------------------------------------- */

  const timeOnly24 = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

  const match24 = text.match(timeOnly24);

  if (match24) {
    let hours = Number(match24[1]);
    const minutes = match24[2];

    const period = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12;

    return `${hours}:${minutes} ${period}`;
  }

  /* --------------------------------------------------------
     12-hour time
     Example:
     02:30 PM
  -------------------------------------------------------- */

  const timeOnly12 = /^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i;

  const match12 = text.match(timeOnly12);

  if (match12) {
    return `${match12[1]}:${match12[2]} ${match12[3].toUpperCase()}`;
  }

  /* --------------------------------------------------------
     Full date + time
  -------------------------------------------------------- */

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  /* --------------------------------------------------------
     Fallback
  -------------------------------------------------------- */

  return text;
}

/* ==========================================================
   FORMAT LISTED DATE
========================================================== */

function formatListedDate(value) {
  if (!value) {
    return "—";
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

/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================
   PAGE ERROR
========================================================== */

function showPageError(message) {
  console.error("View Listing:", message);

  setText(breadcrumbTitle, "Error");

  setText(summaryListingTitle, "Unable to Load Listing");

  setText(listingDescription, message);
}

/* ==========================================================
   EDIT LISTING
========================================================== */

if (editListingBtn) {
  editListingBtn.addEventListener("click", () => {
    if (!listing || !listing.id) {
      return;
    }

    window.location.href = `/add-listings?id=${encodeURIComponent(
      listing.id,
    )}&mode=edit`;
  });
}

/* ==========================================================
   REMOVE LISTING
========================================================== */

if (removeListingBtn) {
  removeListingBtn.addEventListener("click", async () => {
    if (!listing) {
      return;
    }

    const confirmed = await showConfirmModal({
      title: "Remove Listing?",

      message: `Are you sure you want to remove "${listing.food_title}"? This action cannot be undone.`,

      confirmText: "Remove Listing",

      cancelText: "Keep Listing",

      type: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(listing.id)}`,
        {
          method: "DELETE",

          headers: {
            Accept: "application/json",
          },

          credentials: "same-origin",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        showToast(
          data.message || "Your session has expired. Please login again.",
          "error",
        );

        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);

        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to remove listing.");
      }

      showToast(data.message || "Listing removed successfully.", "success");

      setTimeout(() => {
        window.location.href = "/my-listings";
      }, 900);
    } catch (error) {
      console.error("Remove Listing Error:", error);

      showToast(
        error.message || "Unable to remove listing. Please try again.",
        "error",
      );
    }
  });
}

/* ==========================================================
   DUPLICATE LISTING
========================================================== */

if (duplicateListingBtn) {
  duplicateListingBtn.addEventListener("click", async () => {
    if (!listing || !listing.id) {
      return;
    }

    const confirmed = await showConfirmModal({
      title: "Duplicate Listing?",

      message: `A new listing will be created using "${listing.food_title}" as the template.`,

      confirmText: "Duplicate",

      cancelText: "Cancel",

      type: "warning",
    });

    if (!confirmed) {
      return;
    }

    try {
      duplicateListingBtn.disabled = true;

      const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(listing.id)}/duplicate`,
        {
          method: "POST",

          headers: {
            Accept: "application/json",
          },

          credentials: "same-origin",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        showToast(
          data.message || "Your session has expired. Please login again.",
          "error",
        );

        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);

        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to duplicate the listing.");
      }

      showToast(data.message || "Listing duplicated successfully.", "success");

      setTimeout(() => {
        window.location.href = "/my-listings";
      }, 700);
    } catch (error) {
      console.error("Duplicate Listing Error:", error);

      showToast(
        error.message || "Unable to duplicate the listing. Please try again.",
        "error",
      );
    } finally {
      duplicateListingBtn.disabled = false;
    }
  });
}

/* ==========================================================
   PAUSE / RESUME LISTING
========================================================== */

if (pauseListingBtn) {
  pauseListingBtn.addEventListener("click", async () => {
    if (!listing || !listing.id) {
      return;
    }

    const currentStatus = String(listing.status || "")
      .trim()
      .toLowerCase();

    const isPaused = currentStatus === "paused";

    const actionText = isPaused ? "resume" : "pause";

    const confirmed = await showConfirmModal({
      title: isPaused ? "Resume Listing?" : "Pause Listing?",

      message: `Are you sure you want to ${actionText} "${listing.food_title}"?`,

      confirmText: isPaused ? "Resume Listing" : "Pause Listing",

      cancelText: "Cancel",

      type: "warning",
    });

    if (!confirmed) {
      return;
    }

    pauseListingBtn.disabled = true;

    try {
      const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(listing.id)}/pause`,
        {
          method: "PATCH",

          headers: {
            Accept: "application/json",
          },

          credentials: "same-origin",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        showToast(
          data.message || "Your session has expired. Please login again.",
          "error",
        );

        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);

        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update listing status.");
      }

      /* ----------------------------------------------------
           Update local listing
        ---------------------------------------------------- */

      listing.status = data.status;

      const formattedStatus = formatStatus(data.status);

      /* ----------------------------------------------------
           Main Badge
        ---------------------------------------------------- */

      if (listingStatusBadge) {
        listingStatusBadge.textContent = formattedStatus;

        listingStatusBadge.className = "status-badge";

        listingStatusBadge.classList.add(formattedStatus.toLowerCase());
      }

      /* ----------------------------------------------------
           Sidebar Status
        ---------------------------------------------------- */

      if (sideStatus) {
        sideStatus.textContent = formattedStatus;

        sideStatus.className = "small-status";

        sideStatus.classList.add(formattedStatus.toLowerCase());
      }

      /* ----------------------------------------------------
           Pause / Resume Button
        ---------------------------------------------------- */

      updatePauseResumeButton(data.status);

      /* ----------------------------------------------------
           Success
        ---------------------------------------------------- */

      showToast(
        data.message || "Listing status updated successfully.",
        "success",
      );
    } catch (error) {
      console.error("Pause / Resume Listing Error:", error);

      showToast(
        error.message || "Unable to update listing status. Please try again.",
        "error",
      );
    } finally {
      pauseListingBtn.disabled = false;
    }
  });
}

/* ==========================================================
   VIEW ALL RESERVATIONS
========================================================== */

if (viewAllReservations) {
  viewAllReservations.addEventListener("click", () => {
    if (!listing) {
      return;
    }

    console.log("View all reservations for:", listing.id);

    /*
        Connect to reservations page later.
      */
  });
}
