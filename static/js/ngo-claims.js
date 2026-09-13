/* =========================================================
   NGO CLAIMS
   ReServe — My Claims
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =======================================================
     CONFIG
     ======================================================= */

  const API_URL = "/api/ngo/claims";

  let allClaims = [];
  let filteredClaims = [];
  let currentFilter = "all";
  let currentSort = "newest";

  /* =======================================================
     DOM ELEMENTS
     ======================================================= */

  const claimsList = document.getElementById("claimsList");
  const claimsLoading = document.getElementById("claimsLoading");
  const claimsEmpty = document.getElementById("claimsEmpty");

  /* IMPORTANT: IDs matching your HTML */
  const searchInput = document.getElementById("claimSearch");
  const sortSelect = document.getElementById("claimSort");

  const claimTabs = document.querySelectorAll(".claim-tab");

  const resultCount = document.getElementById("resultCount");

  /* =======================================================
     SUMMARY + TAB COUNTS
     ======================================================= */

  /* Donut */
  const summaryDonut = document.getElementById("summaryDonut");

  /* Donut center */
  const summaryTotal = document.getElementById("totalClaims");

  /* Top tabs */
  const allCount = document.getElementById("allCount");
  const pendingCount = document.getElementById("pendingCount");
  const confirmedCount = document.getElementById("confirmedCount");
  const pickedUpCount = document.getElementById("pickedUpCount");
  const completedCount = document.getElementById("completedCount");
  const cancelledCount = document.getElementById("cancelledCount");

  /* Claim Summary legend */
  const summaryPending = document.getElementById("summaryPending");
  const summaryConfirmed = document.getElementById("summaryConfirmed");
  const summaryCompleted = document.getElementById("summaryCompleted");
  const summaryCancelled = document.getElementById("summaryCancelled");

  const summaryPeriod = document.getElementById("summaryPeriod");

  /* =======================================================
     UPCOMING PICKUPS
     ======================================================= */

  const upcomingPickups = document.getElementById("upcomingPickups");

  /* =======================================================
     CLAIM DETAILS MODAL
     ======================================================= */

  /*
   * IMPORTANT:
   * These IDs match your current HTML.
   */

  const claimModal = document.getElementById("claimDetailsModal");

  const modalCloseBtn = document.getElementById("closeClaimDetails");

  const modalCloseBottom = document.getElementById("closeClaimDetailsBottom");

  const modalOverlay = claimModal
    ? claimModal.querySelector(".claim-modal-overlay")
    : null;

  const modalClaimImage = document.getElementById("modalClaimImage");
  const modalClaimCategory = document.getElementById("modalClaimCategory");
  const modalClaimStatus = document.getElementById("modalClaimStatus");
  const modalClaimTitle = document.getElementById("modalClaimTitle");
  const modalClaimProvider = document.getElementById("modalClaimProvider");
  const modalClaimLocation = document.getElementById("modalClaimLocation");
  const modalClaimPickup = document.getElementById("modalClaimPickup");
  const modalClaimQuantity = document.getElementById("modalClaimQuantity");
  const modalClaimInstructions = document.getElementById(
    "modalClaimInstructions",
  );

  const pickupClaimBtn = document.getElementById("pickupClaimBtn");
  const completeClaimBtn = document.getElementById("completeClaimBtn");

  let activeModalClaim = null;

  /* =======================================================
     NAVBAR
     ======================================================= */

  const notificationBtn = document.getElementById("notificationBtn");

  const notificationPanel = document.getElementById("notificationPanel");

  const closeNotificationPanel = document.getElementById(
    "closeNotificationPanel",
  );

  const ngoProfileBtn = document.getElementById("ngoProfileBtn");

  const ngoProfileDropdown = document.getElementById("ngoProfileDropdown");

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  loadClaims();

  /* =======================================================
     LOAD CLAIMS
     ======================================================= */

  async function loadClaims() {
    showLoading();

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();

      allClaims = normalizeClaims(data);

      console.log("NGO CLAIMS:", allClaims);

      updateSummary();

      updateUpcomingPickups();

      applyFilters();
    } catch (error) {
      console.error("Error loading NGO claims:", error);

      hideLoading();

      allClaims = [];

      filteredClaims = [];

      updateSummary();

      updateUpcomingPickups();

      renderClaims([]);

      showToast("Unable to load your claims. Please try again.", "error");
    }
  }

  /* =======================================================
     NORMALIZE API RESPONSE
     ======================================================= */

  function normalizeClaims(data) {
    let claims = [];

    if (Array.isArray(data)) {
      claims = data;
    } else if (Array.isArray(data.claims)) {
      claims = data.claims;
    } else if (Array.isArray(data.data)) {
      claims = data.data;
    } else if (Array.isArray(data.results)) {
      claims = data.results;
    }

    return claims.map((claim) => normalizeClaim(claim));
  }

  function normalizeClaim(claim) {
    const donation = claim.donation || claim.donation_data || claim.food || {};

    const provider = claim.provider || donation.provider || {};

    const location =
      claim.location || donation.location || provider.location || {};

    return {
      id: claim.id || claim._id || claim.claim_id || "",

      donationId:
        claim.donation_id ||
        claim.donationId ||
        donation.id ||
        donation._id ||
        "",

      foodTitle:
        claim.food_title ||
        claim.foodTitle ||
        donation.food_title ||
        donation.title ||
        donation.food_name ||
        "Food Donation",

      description: claim.description || donation.description || "",

      category:
        claim.category || donation.category || donation.food_type || "Other",

      image:
        claim.image ||
        claim.food_image ||
        donation.image ||
        donation.image_url ||
        donation.food_image ||
        "/static/images/food-placeholder.jpg",

      providerName:
        claim.provider_name ||
        claim.providerName ||
        donation.provider_name ||
        donation.business_name ||
        provider.business_name ||
        provider.name ||
        "Food Provider",

      providerType:
        claim.provider_type ||
        donation.provider_type ||
        provider.provider_type ||
        "",

      city: claim.city || donation.city || location.city || "",

      address: claim.address || donation.address || location.address || "",

      pickupStart:
        claim.pickup_start ||
        claim.pickupStart ||
        donation.pickup_start ||
        donation.donation_pickup_start ||
        donation.pickupStart ||
        null,

      pickupEnd:
        claim.pickup_end ||
        claim.pickupEnd ||
        donation.pickup_end ||
        donation.donation_pickup_end ||
        donation.pickupEnd ||
        null,

      pickupTime: claim.pickup_time || donation.pickup_time || "",

      quantity: Number(
        claim.quantity ?? claim.claimed_quantity ?? donation.quantity ?? 0,
      ),

      unit: claim.unit || donation.unit || "packs",

      status: normalizeStatus(claim.status || claim.claim_status || "pending"),

      claimedAt:
        claim.claimed_at || claim.created_at || claim.claimedAt || null,

      pickedUpAt: claim.picked_up_at || claim.pickedUpAt || null,

      completedAt: claim.completed_at || claim.completedAt || null,

      cancelledAt: claim.cancelled_at || claim.cancelledAt || null,

      createdAt:
        claim.created_at || claim.claimed_at || claim.claimedAt || null,

      instructions:
        claim.instructions ||
        donation.pickup_instructions ||
        donation.instructions ||
        "Please collect the food during the specified pickup time.",
    };
  }

  /* =======================================================
     STATUS NORMALIZATION
     ======================================================= */

  function normalizeStatus(status) {
    const value = String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (
      value === "pending" ||
      value === "requested" ||
      value === "request_pending"
    ) {
      return "pending";
    }

    if (value === "confirmed" || value === "approved" || value === "accepted") {
      return "confirmed";
    }

    if (value === "picked_up" || value === "pickup" || value === "collected") {
      return "picked_up";
    }

    if (value === "completed" || value === "complete") {
      return "completed";
    }

    if (value === "cancelled" || value === "canceled" || value === "rejected") {
      return "cancelled";
    }

    /* IMPORTANT: preserve expired status */
    if (value === "expired" || value === "expire") {
      return "expired";
    }

    return "pending";
  }

  /* =======================================================
     FILTER + SEARCH
     ======================================================= */

  function applyFilters() {
    const searchTerm = searchInput
      ? searchInput.value.trim().toLowerCase()
      : "";

    filteredClaims = allClaims.filter((claim) => {
      /* Status */
      if (currentFilter !== "all" && claim.status !== currentFilter) {
        return false;
      }

      /* Search */
      if (searchTerm) {
        const searchableText = [
          claim.foodTitle,
          claim.category,
          claim.providerName,
          claim.city,
          claim.address,
          claim.status,
          claim.unit,
        ]
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });

    sortClaims();

    renderClaims(filteredClaims);
  }

  /* =======================================================
     SORT
     ======================================================= */

  function sortClaims() {
    filteredClaims.sort((a, b) => {
      if (currentSort === "newest") {
        return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
      }

      if (currentSort === "oldest") {
        return getTimestamp(a.createdAt) - getTimestamp(b.createdAt);
      }

      if (currentSort === "pickup") {
        return getTimestamp(a.pickupStart) - getTimestamp(b.pickupStart);
      }

      if (currentSort === "quantity") {
        return b.quantity - a.quantity;
      }

      return 0;
    });
  }

  /* =======================================================
     RENDER CLAIMS
     ======================================================= */

  function renderClaims(claims) {
    hideLoading();

    if (!claimsList) {
      return;
    }

    claimsList.innerHTML = "";

    if (!claims.length) {
      if (claimsEmpty) {
        claimsEmpty.classList.remove("hidden");
      }

      if (resultCount) {
        resultCount.textContent = "0";
      }

      return;
    }

    if (claimsEmpty) {
      claimsEmpty.classList.add("hidden");
    }

    claims.forEach((claim) => {
      claimsList.appendChild(createClaimCard(claim));
    });

    if (resultCount) {
      resultCount.textContent = claims.length.toString();
    }
  }

  /* =======================================================
     CREATE CLAIM CARD
     ======================================================= */

  function createClaimCard(claim) {
    const card = document.createElement("article");

    card.className = "claim-card";

    const locationText = claim.city || claim.address || "Location unavailable";

    const pickupText = formatPickupDateTime(
      claim.pickupStart,
      claim.pickupEnd,
      claim.pickupTime,
    );

    const statusLabel = formatStatus(claim.status);

    const action = getPrimaryAction(claim);

    card.innerHTML = `
      <div class="claim-card-image">
        <img
          src="${escapeAttribute(claim.image)}"
          alt="${escapeAttribute(claim.foodTitle)}"
          class="claim-image"
          onerror="this.onerror=null;this.src='/static/images/food-placeholder.jpg';"
        />
      </div>

      <div class="claim-card-info">

        <div class="claim-card-title-row">

          <span class="claim-category">
            ${escapeHTML(claim.category)}
          </span>

          <h3 class="claim-food-title">
            ${escapeHTML(claim.foodTitle)}
          </h3>

        </div>

        <div class="claim-provider">
          <i class="ri-store-2-line"></i>

          <span class="claim-provider-name">
            ${escapeHTML(claim.providerName)}
          </span>
        </div>

        <div class="claim-location">
          <i class="ri-map-pin-line"></i>

          <span class="claim-location-text">
            ${escapeHTML(locationText)}
          </span>
        </div>

        <div class="claim-meta">

          <div class="claim-meta-item">
            <i class="ri-calendar-event-line"></i>

            <span>
              ${escapeHTML(pickupText)}
            </span>
          </div>

          <div class="claim-meta-item">
            <i class="ri-inbox-archive-line"></i>

            <span>
              ${formatNumber(claim.quantity)}
              ${escapeHTML(claim.unit)}
            </span>
          </div>

        </div>

      </div>

      <div class="claim-card-status">

        <span class="claim-status ${escapeAttribute(claim.status)}">
          ${statusLabel}
        </span>

      </div>

      <div class="claim-card-actions">

        <button
          type="button"
          class="view-claim-btn"
          data-action="details"
        >
          View Details
        </button>

        ${
          action
            ? `
              <button
                type="button"
                class="claim-action-btn ${action.className || ""}"
                data-action="${escapeAttribute(action.action)}"
              >
                ${escapeHTML(action.label)}
              </button>
            `
            : ""
        }

      </div>

      <div class="claim-card-arrow">
        <i class="ri-arrow-right-s-line"></i>
      </div>
    `;

    /* Details */
    const detailsButton = card.querySelector('[data-action="details"]');

    if (detailsButton) {
      detailsButton.addEventListener("click", () => openClaimModal(claim));
    }

    /* Action */
    const actionButton = card.querySelector(".claim-action-btn");

    if (actionButton && action) {
      actionButton.addEventListener("click", () => {
        handleClaimAction(action.action, claim);
      });
    }

    return card;
  }

  /* =======================================================
     PRIMARY ACTION
     ======================================================= */

  function getPrimaryAction(claim) {
    switch (claim.status) {
      case "pending":
        return {
          action: "cancel",
          label: "Cancel Request",
        };

      case "confirmed":
        return {
          action: "pickup",
          label: "Mark Picked Up",
        };

      case "picked_up":
        return {
          action: "complete",
          label: "Mark Completed",
        };

      case "completed":
        return {
          action: "feedback",
          label: "Give Feedback",
          className: "feedback",
        };

      case "cancelled":
        return {
          action: "reorder",
          label: "Explore Food",
        };

      case "expired":
        return {
          action: "reorder",
          label: "Explore Food",
        };

      default:
        return null;
    }
  }

  /* =======================================================
     CLAIM ACTION HANDLER
     ======================================================= */

  async function handleClaimAction(action, claim) {
    if (action === "feedback") {
      showToast("Feedback feature will be available soon.", "success");

      return;
    }

    if (action === "reorder") {
      window.location.href = "/ngo-explore-food";

      return;
    }

    if (action === "cancel") {
      const confirmed = window.confirm(
        `Cancel your claim for "${claim.foodTitle}"?`,
      );

      if (!confirmed) {
        return;
      }

      await updateClaimStatus(claim, "cancel");

      return;
    }

    if (action === "pickup") {
      const confirmed = window.confirm(
        `Mark "${claim.foodTitle}" as picked up?`,
      );

      if (!confirmed) {
        return;
      }

      await updateClaimStatus(claim, "pickup");

      return;
    }

    if (action === "complete") {
      const confirmed = window.confirm(
        `Mark "${claim.foodTitle}" claim as completed?`,
      );

      if (!confirmed) {
        return;
      }

      await updateClaimStatus(claim, "complete");
    }
  }

  /* =======================================================
     UPDATE CLAIM STATUS
     ======================================================= */

  async function updateClaimStatus(claim, action) {
    if (!claim.id) {
      showToast("Claim ID is missing.", "error");

      return;
    }

    let endpoint = "";

    let body = {};

    /*
     * Match the backend endpoints.
     */

    if (action === "pickup") {
      endpoint = `/api/donation-claims/${encodeURIComponent(claim.id)}/pickup`;

      body = {};
    }

    if (action === "complete") {
      endpoint = `/api/donation-claims/${encodeURIComponent(
        claim.id,
      )}/complete`;

      body = {};
    }

    /*
     * IMPORTANT:
     * Cancel uses the dedicated backend endpoint.
     */
    if (action === "cancel") {
      endpoint = `/api/donation-claims/${encodeURIComponent(claim.id)}/cancel`;

      body = {};
    }

    if (!endpoint) {
      showToast("Invalid claim action.", "error");

      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Accept: "application/json",
        },

        credentials: "same-origin",

        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Unable to update claim.",
        );
      }

      showToast(getActionSuccessMessage(action), "success");

      closeClaimModal();

      await loadClaims();
    } catch (error) {
      console.error("Claim status update error:", error);

      showToast(error.message || "Unable to update claim.", "error");
    }
  }

  /* =======================================================
     SUCCESS MESSAGE
     ======================================================= */

  function getActionSuccessMessage(action) {
    if (action === "pickup") {
      return "Claim marked as picked up.";
    }

    if (action === "complete") {
      return "Claim completed successfully.";
    }

    if (action === "cancel") {
      return "Claim cancelled.";
    }

    return "Claim updated.";
  }

  /* =======================================================
     UPDATE SUMMARY
     ======================================================= */

  function updateSummary() {
    const counts = {
      pending: 0,
      confirmed: 0,
      picked_up: 0,
      completed: 0,
      cancelled: 0,
      expired: 0,
    };

    allClaims.forEach((claim) => {
      const status = normalizeStatus(claim.status);

      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status]++;
      }
    });

    const confirmedTotal = counts.confirmed + counts.picked_up;

    /*
     * ALL CLAIMS
     * Includes Pickup Closed claims as well.
     */
    const total =
      counts.pending +
      counts.confirmed +
      counts.picked_up +
      counts.completed +
      counts.cancelled +
      counts.expired;

    /* =====================================================
     TOP TABS
     ===================================================== */

    if (allCount) {
      allCount.textContent = String(total);
    }

    if (pendingCount) {
      pendingCount.textContent = String(counts.pending);
    }

    if (confirmedCount) {
      confirmedCount.textContent = String(counts.confirmed);
    }

    if (pickedUpCount) {
      pickedUpCount.textContent = String(counts.picked_up);
    }

    if (completedCount) {
      completedCount.textContent = String(counts.completed);
    }

    if (cancelledCount) {
      cancelledCount.textContent = String(counts.cancelled);
    }

    /* =====================================================
     CLAIM SUMMARY
     ===================================================== */

    if (summaryTotal) {
      summaryTotal.textContent = String(total);
    }

    if (summaryPending) {
      summaryPending.textContent = String(counts.pending);
    }

    if (summaryConfirmed) {
      summaryConfirmed.textContent = String(confirmedTotal);
    }

    if (summaryCompleted) {
      summaryCompleted.textContent = String(counts.completed);
    }

    if (summaryCancelled) {
      summaryCancelled.textContent = String(counts.cancelled);
    }

    /* =====================================================
     DONUT
     ===================================================== */

    updateDonut({
      pending: counts.pending,
      confirmed: confirmedTotal,
      completed: counts.completed,
      cancelled: counts.cancelled,
      expired: counts.expired,
    });

    console.log("NGO CLAIM SUMMARY:", {
      total,
      pending: counts.pending,
      confirmed: counts.confirmed,
      picked_up: counts.picked_up,
      completed: counts.completed,
      cancelled: counts.cancelled,
      pickup_closed: counts.expired,
    });
  }

  /* =======================================================
     DONUT CHART
     ======================================================= */

  function updateDonut(counts) {
    if (!summaryDonut) {
      console.warn("summaryDonut element not found.");

      return;
    }

    const pending = Number(counts.pending) || 0;

    const confirmed = Number(counts.confirmed) || 0;

    const completed = Number(counts.completed) || 0;

    const cancelled = Number(counts.cancelled) || 0;

    const total = pending + confirmed + completed + cancelled;

    if (total === 0) {
      summaryDonut.style.background = "conic-gradient(#e5ebe7 0deg 360deg)";

      return;
    }

    const pendingDeg = (pending / total) * 360;

    const confirmedDeg = (confirmed / total) * 360;

    const completedDeg = (completed / total) * 360;

    const cancelledDeg = (cancelled / total) * 360;

    const pendingEnd = pendingDeg;

    const confirmedEnd = pendingEnd + confirmedDeg;

    const completedEnd = confirmedEnd + completedDeg;

    const cancelledEnd = completedEnd + cancelledDeg;

    summaryDonut.style.background = `
      conic-gradient(
        #f4b62d 0deg ${pendingEnd}deg,
        #48cf91 ${pendingEnd}deg ${confirmedEnd}deg,
        #258fe8 ${confirmedEnd}deg ${completedEnd}deg,
        #ef7777 ${completedEnd}deg ${cancelledEnd}deg
      )
    `;
  }

  /* =======================================================
   UPCOMING PICKUPS
   ======================================================= */

  function updateUpcomingPickups() {
    if (!upcomingPickups) {
      return;
    }

    const now = new Date();

    const upcoming = allClaims
      .filter((claim) => {
        /* Only active claims can have upcoming pickups */
        if (claim.status !== "confirmed" && claim.status !== "pending") {
          return false;
        }

        const pickupStart = parseDate(claim.pickupStart);

        const pickupEnd = parseDate(claim.pickupEnd);

        /*
         * If an end time exists, consider the pickup
         * upcoming until the END of the pickup window.
         *
         * Example:
         * 9:27 AM - 9:40 AM
         *
         * At 9:39 AM -> still upcoming
         * At 9:41 AM -> no longer upcoming
         */
        if (pickupEnd) {
          return pickupEnd >= now;
        }

        /*
         * If there is no pickup end time,
         * fall back to the start time.
         */
        if (pickupStart) {
          return pickupStart >= now;
        }

        return false;
      })
      .sort((a, b) => {
        /*
         * Sort using pickup START time.
         */
        return getTimestamp(a.pickupStart) - getTimestamp(b.pickupStart);
      })
      .slice(0, 3);

    /* =====================================================
     EMPTY STATE
     ===================================================== */

    if (!upcoming.length) {
      upcomingPickups.innerHTML = `
      <div class="upcoming-empty">
        <i class="ri-calendar-check-line"></i>
        <p>No upcoming pickups.</p>
      </div>
    `;

      return;
    }

    /* =====================================================
     RENDER UPCOMING PICKUPS
     ===================================================== */

    upcomingPickups.innerHTML = "";

    upcoming.forEach((claim) => {
      const pickupDate =
        parseDate(claim.pickupStart) || parseDate(claim.pickupEnd);

      const day = pickupDate ? pickupDate.getDate() : "--";

      const month = pickupDate
        ? pickupDate.toLocaleDateString("en-IN", {
            month: "short",
          })
        : "---";

      const time = formatTime(
        claim.pickupStart,
        claim.pickupEnd,
        claim.pickupTime,
      );

      const item = document.createElement("div");

      item.className = "upcoming-item";

      item.innerHTML = `
      <div class="upcoming-date">
        <strong>${day}</strong>
        <span>${escapeHTML(month)}</span>
      </div>

      <div class="upcoming-details">

        <strong>
          ${escapeHTML(claim.foodTitle)}
        </strong>

        <span>
          ${escapeHTML(claim.providerName)}
        </span>

        <span>
          ${escapeHTML(time)}
        </span>

      </div>

      <button
        type="button"
        class="upcoming-view-btn"
      >
        View
      </button>
    `;

      const button = item.querySelector(".upcoming-view-btn");

      if (button) {
        button.addEventListener("click", () => openClaimModal(claim));
      }

      upcomingPickups.appendChild(item);
    });
  }

  /* =======================================================
     CLAIM DETAILS MODAL
     ======================================================= */

  function openClaimModal(claim) {
    if (!claimModal) {
      console.warn("claimDetailsModal not found.");

      return;
    }

    activeModalClaim = claim;

    /* Image */
    if (modalClaimImage) {
      modalClaimImage.src =
        claim.image || "/static/images/food-placeholder.jpg";

      modalClaimImage.alt = claim.foodTitle || "Food";
    }

    /* Category */
    if (modalClaimCategory) {
      modalClaimCategory.textContent = claim.category || "Other";
    }

    /* Status */
    if (modalClaimStatus) {
      modalClaimStatus.textContent = formatStatus(claim.status);

      modalClaimStatus.className = `modal-status ${claim.status}`;
    }

    /* Title */
    if (modalClaimTitle) {
      modalClaimTitle.textContent = claim.foodTitle;
    }

    /* Provider */
    if (modalClaimProvider) {
      modalClaimProvider.textContent = claim.providerName;
    }

    /* Location */
    if (modalClaimLocation) {
      modalClaimLocation.textContent =
        claim.city || claim.address || "Location unavailable";
    }

    /* Pickup */
    if (modalClaimPickup) {
      modalClaimPickup.textContent = formatPickupDateTime(
        claim.pickupStart,
        claim.pickupEnd,
        claim.pickupTime,
      );
    }

    /* Quantity */
    if (modalClaimQuantity) {
      modalClaimQuantity.textContent = `${formatNumber(
        claim.quantity,
      )} ${claim.unit}`;
    }

    /* Instructions */
    if (modalClaimInstructions) {
      modalClaimInstructions.textContent =
        claim.instructions ||
        "Please collect the food during the specified pickup time.";
    }

    /* =====================================================
       MODAL ACTION BUTTONS
       ===================================================== */

    /*
     * Hide both buttons first.
     */
    if (pickupClaimBtn) {
      pickupClaimBtn.classList.add("hidden");

      pickupClaimBtn.onclick = null;
    }

    if (completeClaimBtn) {
      completeClaimBtn.classList.add("hidden");

      completeClaimBtn.onclick = null;
    }

    /*
     * Confirmed -> Mark Picked Up
     */
    if (claim.status === "confirmed" && pickupClaimBtn) {
      pickupClaimBtn.classList.remove("hidden");

      pickupClaimBtn.onclick = () => {
        handleClaimAction("pickup", claim);
      };
    }

    /*
     * Picked Up -> Mark Completed
     */
    if (claim.status === "picked_up" && completeClaimBtn) {
      completeClaimBtn.classList.remove("hidden");

      completeClaimBtn.onclick = () => {
        handleClaimAction("complete", claim);
      };
    }

    /* Open modal */
    claimModal.classList.remove("hidden");

    document.body.style.overflow = "hidden";
  }

  /* =======================================================
     CLOSE MODAL
     ======================================================= */

  function closeClaimModal() {
    if (!claimModal) {
      return;
    }

    claimModal.classList.add("hidden");

    document.body.style.overflow = "";

    activeModalClaim = null;
  }

  /* =======================================================
     MODAL EVENTS
     ======================================================= */

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeClaimModal);
  }

  if (modalCloseBottom) {
    modalCloseBottom.addEventListener("click", closeClaimModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener("click", closeClaimModal);
  }

  /* =======================================================
     ESCAPE KEY
     ======================================================= */

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      claimModal &&
      !claimModal.classList.contains("hidden")
    ) {
      closeClaimModal();
    }

    if (
      event.key === "Escape" &&
      notificationPanel &&
      !notificationPanel.classList.contains("hidden")
    ) {
      closeNotifications();
    }
  });

  /* =======================================================
     TAB EVENTS
     ======================================================= */

  claimTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      claimTabs.forEach((item) => {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      currentFilter = tab.dataset.status || tab.dataset.filter || "all";

      applyFilters();
    });
  });

  /* =======================================================
     SEARCH
     ======================================================= */

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      applyFilters();
    });
  }

  /* =======================================================
     SORT
     ======================================================= */

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSort = sortSelect.value || "newest";

      applyFilters();
    });
  }

  /* =======================================================
     SUMMARY PERIOD
     ======================================================= */

  if (summaryPeriod) {
    summaryPeriod.addEventListener("change", () => {
      /*
       * Currently summary is calculated
       * from all loaded claims.
       */
      updateSummary();
    });
  }

  /* =======================================================
     NOTIFICATIONS
     ======================================================= */

  if (notificationBtn) {
    notificationBtn.addEventListener("click", (event) => {
      event.stopPropagation();

      if (!notificationPanel) {
        return;
      }

      notificationPanel.classList.toggle("hidden");
    });
  }

  if (closeNotificationPanel) {
    closeNotificationPanel.addEventListener("click", closeNotifications);
  }

  function closeNotifications() {
    if (notificationPanel) {
      notificationPanel.classList.add("hidden");
    }
  }

  /* =======================================================
     OUTSIDE CLICK
     ======================================================= */

  document.addEventListener("click", (event) => {
    /* Notifications */
    if (
      notificationPanel &&
      !notificationPanel.classList.contains("hidden") &&
      !notificationPanel.contains(event.target) &&
      notificationBtn &&
      !notificationBtn.contains(event.target)
    ) {
      closeNotifications();
    }

    /* Profile */
    if (
      ngoProfileDropdown &&
      !ngoProfileDropdown.classList.contains("hidden") &&
      ngoProfileBtn &&
      !ngoProfileBtn.contains(event.target) &&
      !ngoProfileDropdown.contains(event.target)
    ) {
      ngoProfileDropdown.classList.add("hidden");
    }
  });

  /* =======================================================
     PROFILE DROPDOWN
     ======================================================= */

  if (ngoProfileBtn) {
    ngoProfileBtn.addEventListener("click", (event) => {
      event.stopPropagation();

      if (!ngoProfileDropdown) {
        return;
      }

      ngoProfileDropdown.classList.toggle("hidden");
    });
  }

  /* =======================================================
     LOADING
     ======================================================= */

  function showLoading() {
    if (claimsLoading) {
      claimsLoading.classList.remove("hidden");
    }

    if (claimsEmpty) {
      claimsEmpty.classList.add("hidden");
    }

    if (claimsList) {
      claimsList.innerHTML = "";
    }
  }

  function hideLoading() {
    if (claimsLoading) {
      claimsLoading.classList.add("hidden");
    }
  }

  /* =======================================================
     TOAST
     ======================================================= */

  function showToast(message, type = "success") {
    const existing = document.querySelector(".ngo-toast");

    if (existing) {
      existing.remove();
    }

    const toast = document.createElement("div");

    toast.className = `ngo-toast ${type}`;

    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";

      toast.style.transform = "translateY(8px)";

      toast.style.transition = "all 0.25s ease";

      setTimeout(() => {
        toast.remove();
      }, 250);
    }, 3000);
  }

  /* =======================================================
     DATE HELPERS
     ======================================================= */

  function parseDate(value) {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  function getTimestamp(value) {
    const date = parseDate(value);

    return date ? date.getTime() : 0;
  }

  /* =======================================================
     FORMAT PICKUP DATE + TIME
     ======================================================= */

  function formatPickupDateTime(start, end, fallbackTime) {
    const startDate = parseDate(start);

    if (!startDate) {
      return fallbackTime || "Pickup time unavailable";
    }

    const dateText = startDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const timeText = formatTime(start, end, fallbackTime);

    return `${dateText}, ${timeText}`;
  }

  function formatTime(start, end, fallback) {
    const startDate = parseDate(start);

    const endDate = parseDate(end);

    if (!startDate) {
      return fallback || "Time unavailable";
    }

    const startTime = startDate.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });

    if (!endDate) {
      return startTime;
    }

    const endTime = endDate.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });

    return `${startTime} - ${endTime}`;
  }

  /* =======================================================
     STATUS LABEL
     ======================================================= */

  function formatStatus(status) {
    const labels = {
      pending: "Pending",
      confirmed: "Confirmed",
      picked_up: "Picked Up",
      completed: "Completed",
      cancelled: "Cancelled",
      expired: "Pickup Closed",
    };

    return labels[status] || "Pending";
  }

  /* =======================================================
     NUMBER
     ======================================================= */

  function formatNumber(value) {
    const number = Number(value);

    if (Number.isNaN(number)) {
      return "0";
    }

    return number.toLocaleString("en-IN");
  }

  /* =======================================================
     HTML ESCAPING
     ======================================================= */

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHTML(value);
  }

  /* =======================================================
     GLOBAL IMAGE FALLBACK
     ======================================================= */

  document.addEventListener(
    "error",
    (event) => {
      const target = event.target;

      if (
        target &&
        target.tagName === "IMG" &&
        !target.dataset.fallbackApplied
      ) {
        target.dataset.fallbackApplied = "true";

        target.src = "/static/images/food-placeholder.jpg";
      }
    },
    true,
  );
});
