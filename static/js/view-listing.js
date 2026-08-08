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
   DOM ELEMENTS
========================================================== */

/* ----------------------------------------------------------
   Main
---------------------------------------------------------- */

const listingImage = document.getElementById("listingImage");

const listingStatusBadge = document.getElementById("listingStatusBadge");

const listingTitle = document.getElementById("listingTitle");

const listingDescription = document.getElementById("listingDescription");

/* ----------------------------------------------------------
   Basic Information
---------------------------------------------------------- */

const foodType = document.getElementById("foodType");

const foodCategory = document.getElementById("foodCategory");

const listingType = document.getElementById("listingType");

const pickupTime = document.getElementById("pickupTime");

const expiryDate = document.getElementById("expiryDate");

const listingQuantity = document.getElementById("listingQuantity");

const listingPrice = document.getElementById("listingPrice");

/* ----------------------------------------------------------
   Pickup
---------------------------------------------------------- */

const pickupStart = document.getElementById("pickupStart");

const pickupEnd = document.getElementById("pickupEnd");

const pickupInstructions = document.getElementById("pickupInstructions");

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
   Performance
---------------------------------------------------------- */

const performanceViews = document.getElementById("performanceViews");

const performanceReservations = document.getElementById(
  "performanceReservations",
);

const performanceRecovery = document.getElementById("performanceRecovery");

/* ----------------------------------------------------------
   Food Information
---------------------------------------------------------- */

const originalPrice = document.getElementById("originalPrice");

const discountedPrice = document.getElementById("discountedPrice");

const unit = document.getElementById("unit");

const city = document.getElementById("city");

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

const moreActionsBtn = document.querySelector(".more-actions-btn");

/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener("DOMContentLoaded", init);

function init() {
  console.log("ReServe View Listing Loaded");

  /* --------------------------------------------------------
     Get listing ID from URL
  -------------------------------------------------------- */

  const params = new URLSearchParams(window.location.search);

  const id = params.get("id");

  /* --------------------------------------------------------
     ID is required
  -------------------------------------------------------- */

  if (!id) {
    showPageError("Listing ID is missing.");

    return;
  }

  /* --------------------------------------------------------
     Load listing
  -------------------------------------------------------- */

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
      alert(data.message || "Your session has expired. Please login again.");

      window.location.href = "/login";

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
       Store listing
    ------------------------------------------------------ */

    listing = data.listing;

    /* ------------------------------------------------------
       Render listing
    ------------------------------------------------------ */

    renderListing(listing);

    /* ------------------------------------------------------
       Render reservations
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
     IMAGE
  ======================================================== */

  if (listingImage) {
    listingImage.src = data.image || "/static/images/food-placeholder.jpg";

    listingImage.alt = data.food_title || "Food Image";

    listingImage.onerror = function () {
      this.onerror = null;

      this.src = "/static/images/food-placeholder.jpg";
    };
  }

  /* ========================================================
     STATUS
  ======================================================== */

  const status = formatStatus(data.status);

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
     BASIC INFORMATION
  ======================================================== */

  setText(listingTitle, data.food_title || "Untitled Food Listing");

  setText(listingDescription, data.description || "No description available.");

  setText(foodType, data.food_type || "Not specified");

  setText(foodCategory, data.category || "Not specified");

  setText(listingType, formatListingType(data.listing_type));

  /* ========================================================
     PICKUP
  ======================================================== */

  setText(pickupTime, formatPickupRange(data.pickup_start, data.pickup_end));

  setText(pickupStart, formatDateTime(data.pickup_start));

  setText(pickupEnd, formatDateTime(data.pickup_end));

  /* ========================================================
     EXPIRY
  ======================================================== */

  setText(expiryDate, formatDateTime(data.expiry_date));

  /* ========================================================
     QUANTITY
  ======================================================== */

  const quantity = Number(data.quantity) || 0;

  const quantityText = `${quantity} ${data.unit || ""}`.trim();

  setText(listingQuantity, quantityText);

  setText(
    remainingQuantity,
    data.remaining_quantity !== undefined
      ? `${Number(data.remaining_quantity) || 0} ${data.unit || ""}`.trim()
      : quantityText,
  );

  setText(unit, data.unit || "—");

  /* ========================================================
     PRICE
  ======================================================== */

  const discounted = Number(data.discounted_price) || 0;

  const original = Number(data.original_price) || 0;

  if (listingPrice) {
    if (String(data.listing_type || "").toLowerCase() === "donation") {
      listingPrice.textContent = "Free";
    } else if (discounted > 0) {
      listingPrice.textContent = `₹${discounted}`;
    } else {
      listingPrice.textContent = "—";
    }
  }

  setText(originalPrice, original > 0 ? `₹${original}` : "Free");

  setText(discountedPrice, discounted > 0 ? `₹${discounted}` : "Free");

  /* ========================================================
     PICKUP INSTRUCTIONS
  ======================================================== */

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

  setText(performanceViews, views);

  /* ========================================================
     RESERVATIONS
  ======================================================== */

  const reservations = Number(data.reservations) || 0;

  setText(sideReservations, reservations);

  setText(performanceReservations, reservations);

  /* ========================================================
     RECOVERY
  ======================================================== */

  const recovery = Number(data.recovery_probability) || 0;

  setText(performanceRecovery, `${recovery}%`);

  /* ========================================================
     CITY
  ======================================================== */

  setText(city, data.city || "—");
}

/* ==========================================================
   RECENT RESERVATIONS
========================================================== */

function renderRecentReservations(reservations) {
  if (!recentReservations) {
    return;
  }

  /* --------------------------------------------------------
     Make sure we have an array
  -------------------------------------------------------- */

  if (!Array.isArray(reservations)) {
    reservations = [];
  }

  /* --------------------------------------------------------
     Empty state
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
     Show latest reservations
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
   FORMAT PICKUP RANGE
========================================================== */

function formatPickupRange(start, end) {
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

  if (listingTitle) {
    listingTitle.textContent = "Unable to Load Listing";
  }

  if (listingDescription) {
    listingDescription.textContent = message;
  }
}

/* ==========================================================
   EDIT LISTING
========================================================== */

if (editListingBtn) {
  editListingBtn.addEventListener("click", () => {
    if (!listing) {
      return;
    }

    console.log("Edit Listing:", listing);

    /*
        Edit page will be connected later.
      */
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

    const confirmed = confirm(
      `Are you sure you want to remove "${listing.food_title}"?\n\nThis action cannot be undone.`,
    );

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
        alert(data.message || "Your session has expired. Please login again.");

        window.location.href = "/login";

        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to remove listing.");
      }

      alert(data.message || "Listing removed successfully.");

      window.location.href = "/my-listings";
    } catch (error) {
      console.error("Remove Listing Error:", error);

      alert(error.message || "Unable to remove listing. Please try again.");
    }
  });
}

/* ==========================================================
   MORE ACTIONS
========================================================== */

if (moreActionsBtn) {
  moreActionsBtn.addEventListener("click", () => {
    console.log("More Actions clicked.");

    /*
        More actions menu will be
        connected later.
      */
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
