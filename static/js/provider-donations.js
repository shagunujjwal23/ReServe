/* ==========================================================
   PROVIDER DONATIONS
   ReServe
========================================================== */

"use strict";

const API_BASE = "/api";

let surplusListings = [];
let providerDonations = [];

let currentSurplusListing = null;

/* ==========================================================
   DOM HELPERS
========================================================== */

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================
   API
========================================================== */

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

/* ==========================================================
   INITIALIZATION
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  setupProfileDropdown();
  loadHeaderProfileImage();
  initializeTabs();
  initializeSurplusDialog();
  initializeToast();

  loadProviderDonationData();

  /*
   * Refresh periodically so changes made by NGOs
   * or donation expiry are reflected automatically.
   */
  setInterval(loadProviderDonationData, 30000);
});

/* ==========================================================
   TABS
========================================================== */

function initializeTabs() {
  const tabs = document.querySelectorAll(".donation-tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      if (!target) return;

      tabs.forEach((item) => {
        item.classList.toggle("active", item === tab);
      });

      document.querySelectorAll(".donation-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === `${target}Panel`);
      });
    });
  });
}

/* ==========================================================
   LOAD DATA
========================================================== */

async function loadProviderDonationData() {
  try {
    const [surplusResponse, donationsResponse] = await Promise.all([
      apiRequest(`${API_BASE}/provider/surplus`),
      apiRequest(`${API_BASE}/provider/donations`),
    ]);

    surplusListings = Array.isArray(surplusResponse.surplus)
      ? surplusResponse.surplus
      : [];

    providerDonations = Array.isArray(donationsResponse.donations)
      ? donationsResponse.donations
      : [];

    renderSurplusListings();
    renderActiveDonations();
    renderDonationHistory();
  } catch (error) {
    console.error("Unable to load donation data:", error);

    showLoadError();
  }
}

/* ==========================================================
   SURPLUS LISTINGS
========================================================== */

function renderSurplusListings() {
  const container = $("#surplusListings");

  if (!container) return;

  /*
   * Only listings that have NOT yet been published
   * as donations should appear here.
   */
  const pending = surplusListings.filter((item) => !item.donation_id);

  if (!pending.length) {
    container.innerHTML = `
      <div class="donation-empty">
        <div class="empty-icon">
          <i class="ri-restaurant-2-line"></i>
        </div>

        <h3>No surplus food right now</h3>

        <p>
          Listings that still have food remaining after their normal
          pickup window will appear here for donation.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = pending.map(createSurplusCard).join("");

  container.querySelectorAll("[data-surplus-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.surplusId;

      if (id) {
        openSurplusDialog(id);
      }
    });
  });
}

/* ==========================================================
   SURPLUS CARD
========================================================== */

function createSurplusCard(item) {
  const image = item.image || "/static/images/food-placeholder.jpg";

  const quantity = Number(item.quantity || 0);
  const confirmedQuantity = Number(item.surplus_quantity);
  const isConfirmed = Number.isInteger(confirmedQuantity) && confirmedQuantity > 0;
  const actionLabel = isConfirmed ? "Set NGO Pickup & Publish" : "Confirm Surplus";
  const actionIcon = isConfirmed ? "ri-send-plane-line" : "ri-hand-coin-line";
  const statusLabel = isConfirmed ? "Ready to Publish" : "Surplus Pending";
  const description = isConfirmed
    ? `${confirmedQuantity} ${item.unit || "units"} confirmed. Set a short NGO pickup window to publish this donation.`
    : "Normal pickup has ended. Confirm how much food is actually remaining before offering it to an NGO.";

  return `
    <article class="donation-card">

      <div class="donation-card-image">

        <img
          src="${escapeHtml(image)}"
          alt="${escapeHtml(item.food_title || "Food")}"
          onerror="this.src='/static/images/food-placeholder.jpg'"
        >

        <span class="donation-status surplus">
          <i class="ri-time-line"></i>
          ${escapeHtml(statusLabel)}
        </span>

      </div>

      <div class="donation-card-body">

        <h3 class="donation-card-title">
          ${escapeHtml(item.food_title || "Food Listing")}
        </h3>

        <p class="donation-card-description">
          ${escapeHtml(description)}
        </p>

        <div class="donation-details">

          <div class="donation-detail">
            <i class="ri-box-3-line"></i>

            <div>
              <span>${isConfirmed ? "Confirmed surplus" : "Remaining"}</span>

              <strong>
                ${isConfirmed ? confirmedQuantity : quantity}
                ${escapeHtml(item.unit || "units")}
              </strong>
            </div>
          </div>

          <div class="donation-detail">
            <i class="ri-time-line"></i>

            <div>
              <span>Normal pickup ended</span>

              <strong>
                ${formatDateTime(item.pickup_end)}
              </strong>
            </div>
          </div>

        </div>

        <div class="donation-card-footer">

          <div class="donation-quantity">
            ${isConfirmed ? "Ready to donate:" : "Available to donate:"}
            <strong>
              ${isConfirmed ? confirmedQuantity : quantity}
              ${escapeHtml(item.unit || "units")}
            </strong>
          </div>

          <button
            type="button"
            class="donation-action primary"
            data-surplus-id="${escapeHtml(item.id)}"
          >
            <i class="${escapeHtml(actionIcon)}"></i>
            ${escapeHtml(actionLabel)}
          </button>

        </div>

      </div>

    </article>
  `;
}

/* ==========================================================
   ACTIVE DONATIONS
========================================================== */

function renderActiveDonations() {
  const container = $("#activeDonations");

  if (!container) return;

  /*
   * Active donation lifecycle:
   *
   * available  → waiting for NGO
   * claimed    → NGO claimed it
   * picked_up  → NGO collected it
   */
  const active = providerDonations.filter((item) =>
    ["available", "claimed", "picked_up"].includes(item.status),
  );

  if (!active.length) {
    container.innerHTML = `
      <div class="donation-empty">
        <div class="empty-icon">
          <i class="ri-hand-heart-line"></i>
        </div>

        <h3>No active donations</h3>

        <p>
          Once you publish surplus food to NGOs, it will appear here
          until the donation is completed.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = active.map(createActiveDonationCard).join("");
}

/* ==========================================================
   ACTIVE DONATION CARD
========================================================== */

function createActiveDonationCard(item) {
  const image = item.image || "/static/images/food-placeholder.jpg";

  const status = formatDonationStatus(item.status);

  let footerMessage = "Waiting for NGO claim";

  if (item.status === "claimed") {
    footerMessage = "Claimed by NGO";
  }

  if (item.status === "picked_up") {
    footerMessage = "Food picked up by NGO";
  }

  return `
    <article class="donation-card">

      <div class="donation-card-image">

        <img
          src="${escapeHtml(image)}"
          alt="${escapeHtml(item.food_title || "Food")}"
          onerror="this.src='/static/images/food-placeholder.jpg'"
        >

        <span class="donation-status ${escapeHtml(item.status)}">
          <i class="${escapeHtml(status.icon)}"></i>
          ${escapeHtml(status.label)}
        </span>

      </div>

      <div class="donation-card-body">

        <h3 class="donation-card-title">
          ${escapeHtml(item.food_title || "Food Donation")}
        </h3>

        <p class="donation-card-description">
          ${escapeHtml(
            item.donation_instructions ||
              "Food donation published for NGO rescue.",
          )}
        </p>

        <div class="donation-details">

          <div class="donation-detail">
            <i class="ri-box-3-line"></i>

            <div>
              <span>Quantity</span>

              <strong>
                ${Number(item.surplus_quantity || 0)}
                ${escapeHtml(item.unit || "units")}
              </strong>
            </div>
          </div>

          <div class="donation-detail">
            <i class="ri-calendar-event-line"></i>

            <div>
              <span>Pickup ends</span>

              <strong>
                ${formatDateTime(item.donation_pickup_end)}
              </strong>
            </div>
          </div>

        </div>

        <div class="donation-card-footer">

          <div class="donation-quantity">
            ${escapeHtml(footerMessage)}
          </div>

          <button
            type="button"
            class="donation-action secondary"
            onclick="viewDonation('${escapeHtml(item.id)}')"
          >
            <i class="ri-eye-line"></i>
            View Details
          </button>

        </div>

      </div>

    </article>
  `;
}

/* ==========================================================
   DONATION HISTORY
========================================================== */

function renderDonationHistory() {
  const container = $("#donationHistory");

  if (!container) return;

  const history = providerDonations.filter((item) =>
    ["completed", "expired"].includes(item.status),
  );

  if (!history.length) {
    container.innerHTML = `
      <div class="donation-empty">
        <div class="empty-icon">
          <i class="ri-history-line"></i>
        </div>

        <h3>No donation history yet</h3>

        <p>
          Completed and expired donations will be recorded here.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = history.map(createHistoryRow).join("");
}

/* ==========================================================
   HISTORY ROW
========================================================== */

function createHistoryRow(item) {
  const status = formatDonationStatus(item.status);

  const date =
    item.completed_at || item.expired_at || item.updated_at || item.created_at;

  return `
    <article class="history-row">

      <div class="history-food">

        <img
          src="${escapeHtml(
            item.image || "/static/images/food-placeholder.jpg",
          )}"
          alt="${escapeHtml(item.food_title || "Food")}"
          onerror="this.src='/static/images/food-placeholder.jpg'"
        >

        <div>
          <strong>
            ${escapeHtml(item.food_title || "Food Donation")}
          </strong>

          <span>
            ${escapeHtml(item.category || "Food")}
          </span>
        </div>

      </div>

      <div class="history-column">

        <span>Quantity</span>

        <strong>
          ${Number(item.surplus_quantity || 0)}
          ${escapeHtml(item.unit || "units")}
        </strong>

      </div>

      <div class="history-column">

        <span>NGO</span>

        <strong>
          ${item.ngo_id ? "Claimed NGO" : "Not Claimed"}
        </strong>

      </div>

      <div class="history-column">

        <span>Date</span>

        <strong>
          ${formatDateTime(date)}
        </strong>

      </div>

      <div class="history-column">

        <span>Status</span>

        <strong>
          ${escapeHtml(status.label)}
        </strong>

      </div>

    </article>
  `;
}

/* ==========================================================
   SURPLUS DIALOG
========================================================== */

function initializeSurplusDialog() {
  const dialog = $("#surplusDialog");

  if (!dialog) return;

  const form = $("#surplusForm");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  }

  const confirmButton = $("#confirmSurplusBtn");

  if (confirmButton) {
    confirmButton.addEventListener("click", confirmSurplus);
  }

  const publishButton = $("#publishDonationBtn");

  if (publishButton) {
    publishButton.addEventListener("click", publishDonation);
  }

  const closeButton = $("#closeSurplusDialog");

  if (closeButton) {
    closeButton.addEventListener("click", closeSurplusDialog);
  }

  const cancelButton = $("#cancelSurplusBtn");

  if (cancelButton) {
    cancelButton.addEventListener("click", closeSurplusDialog);
  }

  /*
   * Close when pressing Escape.
   * Native dialog normally handles this, but we also
   * clear the current listing.
   */
  dialog.addEventListener("close", () => {
    currentSurplusListing = null;
  });
}

/* ==========================================================
   OPEN SURPLUS DIALOG
========================================================== */

function openSurplusDialog(listingId) {
  const listing = surplusListings.find((item) => item.id === listingId);

  if (!listing) return;

  currentSurplusListing = listing;
  const confirmedQuantity = Number(listing.surplus_quantity);
  const isConfirmed = Number.isInteger(confirmedQuantity) && confirmedQuantity > 0;

  const dialog = $("#surplusDialog");

  if (!dialog) return;

  const quantityInput = $("#surplusQuantity");
  const listingIdInput = $("#surplusListingId");

  if (listingIdInput) {
    listingIdInput.value = listing.id;
  }

  if (quantityInput) {
    quantityInput.value = isConfirmed ? String(confirmedQuantity) : "";
    quantityInput.max = Number(listing.quantity || 0);
    quantityInput.disabled = isConfirmed;
  }

  const title = $("#surplusDialogTitle");
  const help = $("#surplusDialogHelp");

  if (title) {
    title.textContent = isConfirmed ? "Publish Donation" : "Confirm Surplus";
  }

  if (help) {
    help.textContent = isConfirmed
      ? `${confirmedQuantity} ${listing.unit || "units"} is confirmed. Set the NGO pickup window and publish the donation.`
      : `${listing.food_title || "This food"} has ${listing.quantity || 0} ${listing.unit || "units"} remaining. Enter the actual quantity still available after pickup.`;
  }

  const donationFields = $("#donationFields");
  const publishButton = $("#publishDonationBtn");
  const confirmButton = $("#confirmSurplusBtn");

  if (donationFields) {
    donationFields.hidden = !isConfirmed;
  }

  if (publishButton) {
    publishButton.hidden = !isConfirmed;
    publishButton.disabled = false;
    publishButton.style.pointerEvents = "";
  }

  if (confirmButton) {
    confirmButton.hidden = isConfirmed;
    if (!isConfirmed) {
      confirmButton.disabled = false;
      confirmButton.style.pointerEvents = "";
    }
  }

  clearDonationFields();

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

/* ==========================================================
   CONFIRM SURPLUS
========================================================== */

async function confirmSurplus() {
  if (!currentSurplusListing) return;

  const input = $("#surplusQuantity");

  if (!input) return;

  /*
   * IMPORTANT:
   *
   * Do NOT use only Number(input.value).
   * Number("") returns 0, which previously caused
   * an empty quantity to be treated as zero surplus.
   */

  const rawValue = input.value.trim();

  if (rawValue === "") {
    showToast(
      "Quantity required",
      "Please enter the remaining quantity before confirming.",
      "error",
    );

    input.focus();

    return;
  }

  const value = Number(rawValue);
  const maximum = Number(currentSurplusListing.quantity || 0);

  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    showToast(
      "Invalid quantity",
      `Enter a whole number between 0 and ${maximum}.`,
      "error",
    );

    input.focus();

    return;
  }

  const button = $("#confirmSurplusBtn");

  setButtonLoading(button, true, "Confirming...");

  try {
    await apiRequest(
      `${API_BASE}/listings/${currentSurplusListing.id}/confirm-surplus`,
      {
        method: "POST",

        body: JSON.stringify({
          surplus_quantity: value,
        }),
      },
    );

    /*
     * ZERO SURPLUS
     *
     * Explicitly entering 0 means there is no food
     * available for donation.
     */
    if (value === 0) {
      closeSurplusDialog();

      showToast(
        "Listing completed",
        "No surplus food was available for donation.",
        "success",
      );

      await loadProviderDonationData();

      return;
    }

    /*
     * POSITIVE SURPLUS
     *
     * The surplus is confirmed, but it is NOT yet
     * an active donation.
     *
     * The provider must now define the NGO pickup
     * window and click "Publish to NGOs".
     */
    const confirmedListingId = currentSurplusListing.id;
    currentSurplusListing.surplus_quantity = value;

    // Refresh from the server immediately. If the provider closes this
    // dialog, the saved listing is still shown as "Ready to Publish" rather
    // than looking like it disappeared.
    await loadProviderDonationData();

    /*
     * Reload the dialog state from the authoritative provider-surplus API.
     * Confirmation is intentionally only the first step: the provider still
     * needs to choose the NGO pickup window and publish the donation.
     */
    currentSurplusListing =
      surplusListings.find((item) => item.id === confirmedListingId) ||
      currentSurplusListing;

    const title = $("#surplusDialogTitle");
    const help = $("#surplusDialogHelp");

    if (title) {
      title.textContent = "Publish Donation";
    }

    if (help) {
      help.textContent =
        `${value} ` +
        `${currentSurplusListing.unit || "units"} confirmed. ` +
        `Set the NGO pickup window and publish the donation.`;
    }

    const donationFields = $("#donationFields");
    const publishButton = $("#publishDonationBtn");
    const confirmButton = $("#confirmSurplusBtn");

    if (donationFields) {
      donationFields.hidden = false;
    }

    if (confirmButton) {
      confirmButton.hidden = true;
      confirmButton.disabled = false;
    }

    if (publishButton) {
      publishButton.hidden = false;
      publishButton.disabled = false;
      publishButton.style.pointerEvents = "";
    }

    showToast(
      "Surplus confirmed",
      "Set the NGO pickup window, then select Publish to NGOs. The food is not visible to NGOs until it is published.",
      "success",
    );

    setButtonLoading(button, false, "Confirm Surplus");
  } catch (error) {
    console.error("Unable to confirm surplus:", error);

    showToast("Unable to confirm surplus", error.message, "error");

    setButtonLoading(button, false, "Confirm Surplus");
  }
}

/* ==========================================================
   PUBLISH DONATION
========================================================== */

async function publishDonation() {
  if (!currentSurplusListing) return;

  const startInput = $("#donationPickupStart");
  const endInput = $("#donationPickupEnd");
  const instructionsInput = $("#donationInstructions");

  if (!startInput || !endInput) return;

  const start = startInput.value.trim();
  const end = endInput.value.trim();

  /*
   * Pickup dates are required.
   */

  if (!start || !end) {
    showToast(
      "Pickup window required",
      "Please provide both donation pickup start and end times.",
      "error",
    );

    return;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  const now = new Date();

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    showToast(
      "Invalid pickup time",
      "Please enter valid pickup dates and times.",
      "error",
    );

    return;
  }

  if (startDate <= now) {
    showToast(
      "Invalid start time",
      "Donation pickup must start in the future.",
      "error",
    );

    return;
  }

  if (endDate <= startDate) {
    showToast(
      "Invalid pickup window",
      "Pickup end time must be after the start time.",
      "error",
    );

    return;
  }

  /*
   * Make sure there is actually a confirmed surplus
   * before attempting to publish.
   */

  const confirmedQuantity = Number(currentSurplusListing.surplus_quantity);

  if (!Number.isInteger(confirmedQuantity) || confirmedQuantity <= 0) {
    showToast(
      "Surplus not confirmed",
      "Please confirm a positive surplus quantity first.",
      "error",
    );

    return;
  }

  const button = $("#publishDonationBtn");

  setButtonLoading(button, true, "Publishing...");

  try {
    await apiRequest(
      `${API_BASE}/listings/${currentSurplusListing.id}/donate`,
      {
        method: "POST",

        body: JSON.stringify({
          donation_pickup_start: start,

          donation_pickup_end: end,

          donation_instructions: instructionsInput
            ? instructionsInput.value.trim()
            : "",
        }),
      },
    );

    /*
     * Donation is now:
     *
     * available
     *
     * It will therefore appear under Active Donations.
     */

    closeSurplusDialog();

    showToast(
      "Donation published",
      `${confirmedQuantity} ${
        currentSurplusListing.unit || "units"
      } is now available for NGOs.`,
      "success",
    );

    /*
     * Reload immediately so:
     *
     * Surplus Food:
     * donation disappears
     *
     * Active Donations:
     * donation appears
     */
    await loadProviderDonationData();

    /*
     * Automatically switch to Active Donations
     * after successful publishing.
     */
    activateTab("active");
  } catch (error) {
    console.error("Unable to publish donation:", error);

    showToast("Unable to publish donation", error.message, "error");

    setButtonLoading(button, false, "Publish Donation");
  }
}

/* ==========================================================
   ACTIVATE TAB
========================================================== */

function activateTab(tabName) {
  const tabs = document.querySelectorAll(".donation-tab");

  const targetPanel = `${tabName}Panel`;

  let targetTab = null;

  tabs.forEach((tab) => {
    const isTarget = tab.dataset.tab === tabName;

    tab.classList.toggle("active", isTarget);

    if (isTarget) {
      targetTab = tab;
    }
  });

  document.querySelectorAll(".donation-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === targetPanel);
  });

  return targetTab;
}

/* ==========================================================
   CLEAR DIALOG
========================================================== */

function clearDonationFields() {
  const fields = [
    "#donationPickupStart",
    "#donationPickupEnd",
    "#donationInstructions",
  ];

  fields.forEach((selector) => {
    const element = $(selector);

    if (element) {
      element.value = "";
    }
  });
}

/* ==========================================================
   CLOSE DIALOG
========================================================== */

function closeSurplusDialog() {
  const dialog = $("#surplusDialog");

  if (!dialog) return;

  if (typeof dialog.close === "function") {
    /*
     * Only close if the dialog is actually open.
     */
    if (dialog.open) {
      dialog.close();
    }
  } else {
    dialog.removeAttribute("open");
  }

  currentSurplusListing = null;
}

/* ==========================================================
   VIEW DONATION
========================================================== */

function viewDonation(donationId) {
  const donation = providerDonations.find((item) => item.id === donationId);

  if (!donation) return;

  const status = formatDonationStatus(donation.status);

  const pickupStart = formatDateTime(donation.donation_pickup_start);

  const pickupEnd = formatDateTime(donation.donation_pickup_end);

  showToast(
    status.label,

    `${donation.food_title || "Food"} · ` +
      `${donation.surplus_quantity || 0} ` +
      `${donation.unit || "units"} · ` +
      `Pickup: ${pickupStart} – ${pickupEnd}`,

    "success",
  );
}

/* ==========================================================
   DONATION STATUS
========================================================== */

function formatDonationStatus(status) {
  const statuses = {
    available: {
      label: "Available for NGO",
      icon: "ri-heart-add-line",
    },

    claimed: {
      label: "Claimed by NGO",
      icon: "ri-user-heart-line",
    },

    picked_up: {
      label: "Picked Up",
      icon: "ri-truck-line",
    },

    completed: {
      label: "Completed",
      icon: "ri-checkbox-circle-line",
    },

    expired: {
      label: "Expired",
      icon: "ri-time-line",
    },
  };

  return (
    statuses[status] || {
      label: "Donation",
      icon: "ri-heart-line",
    }
  );
}

/* ==========================================================
   DATE FORMATTING
========================================================== */

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* ==========================================================
   BUTTON LOADING
========================================================== */

function setButtonLoading(button, loading, text) {
  if (!button) return;

  if (loading) {
    /*
     * Save the original HTML only once.
     */
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.innerHTML;
    }

    button.disabled = true;

    button.innerHTML = `
      <i class="ri-loader-4-line"></i>
      ${escapeHtml(text)}
    `;

    button.style.pointerEvents = "none";
  } else {
    button.disabled = false;

    button.innerHTML = button.dataset.originalText || escapeHtml(text);

    button.style.pointerEvents = "";
  }
}

/* ==========================================================
   TOAST
========================================================== */

let toastTimer = null;

function initializeToast() {
  const closeButton = $("#toastClose");

  if (closeButton) {
    closeButton.addEventListener("click", hideToast);
  }
}

function showToast(title, message, type = "success") {
  const toast = $("#reserveToast");

  if (!toast) return;

  const titleElement = $("#toastTitle");
  const messageElement = $("#toastMessage");
  const icon = $("#toastIcon");

  if (titleElement) {
    titleElement.textContent = title;
  }

  if (messageElement) {
    messageElement.textContent = message;
  }

  if (icon) {
    icon.className =
      type === "error" ? "ri-error-warning-line" : "ri-check-line";
  }

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(hideToast, 4500);
}

function hideToast() {
  const toast = $("#reserveToast");

  if (toast) {
    toast.classList.remove("show");
  }
}

/* ==========================================================
   LOAD ERROR
========================================================== */

function showLoadError() {
  const containers = [
    "#surplusListings",
    "#activeDonations",
    "#donationHistory",
  ];

  containers.forEach((selector) => {
    const container = $(selector);

    if (!container) return;

    container.innerHTML = `
      <div class="donation-empty">

        <div class="empty-icon">
          <i class="ri-error-warning-line"></i>
        </div>

        <h3>Unable to load donations</h3>

        <p>
          Please try again in a moment.
        </p>

        <button
          type="button"
          class="donation-action primary"
          onclick="loadProviderDonationData()"
        >
          <i class="ri-refresh-line"></i>
          Try Again
        </button>

      </div>
    `;
  });
}

/* ==========================================================
   EXPOSE REQUIRED FUNCTIONS
========================================================== */

window.openSurplusDialog = openSurplusDialog;

window.viewDonation = viewDonation;

window.loadProviderDonationData = loadProviderDonationData;

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

/* ==========================================================
   HEADER PROFILE IMAGE
========================================================== */

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
    console.error("Provider donations profile image error:", error);
  }
}

