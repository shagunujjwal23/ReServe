/* =========================================================
   ReServe — Provider Food Requests
   ========================================================= */

let allRequests = [];
let currentFilter = "all";

const requestsContainer = document.getElementById("requestsContainer");

let filteredRequests = [];

/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  initializeFilters();
  initializeSearch();
  initializeDateFilter();
  initializeModal();
  initializeClearButtons();
  initializeRetryButton();

  await loadRequests();
});

/* =========================================================
   LOAD REQUESTS
   IMPORTANT:
   /api/requests MUST return only requests belonging
   to the currently logged-in provider.
   ========================================================= */

async function loadRequests() {
  showLoading();

  hideEmptyState();
  hideError();

  try {
    const response = await fetch("/api/requests", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load requests.");
    }

    allRequests = Array.isArray(data.requests) ? data.requests : [];

    updateCounters();

    renderRequests();
  } catch (error) {
    console.error("Load requests error:", error);

    showError(error.message || "Please try again later.");
  } finally {
    hideLoading();
  }
}

/* =========================================================
   RENDER REQUESTS
   ========================================================= */

function renderRequests() {
  if (!requestsContainer) {
    return;
  }

  let requests = [...allRequests];

  /* =====================================================
     STATUS FILTER
     ===================================================== */

  if (currentFilter !== "all") {
    requests = requests.filter((request) => {
      const status = normalizeRawStatus(request.status);

      if (currentFilter === "rejected") {
        return (
          status === "rejected" ||
          status === "cancelled" ||
          status === "canceled"
        );
      }

      return status === currentFilter;
    });
  }

  /* =====================================================
     REQUEST DATE FILTER
     IMPORTANT:
     This uses created_at — when the request was made.
     It does NOT use pickup_date.
     ===================================================== */

  const dateInput = document.getElementById("requestDateFilter");

  const selectedDate = dateInput?.value || "";

  if (selectedDate) {
    requests = requests.filter((request) => {
      return getDateKey(request.created_at) === selectedDate;
    });
  }

  /* =====================================================
     SEARCH
     ===================================================== */

  const searchInput = document.getElementById("searchRequests");

  const searchValue = (searchInput?.value || "").trim().toLowerCase();

  if (searchValue) {
    requests = requests.filter((request) => {
      const foodName = getFoodName(request).toLowerCase();

      const requesterName = String(
        request.requester_name ||
          request.user_name ||
          request.customer_name ||
          "",
      ).toLowerCase();

      const requestId = String(
        request.request_id || request._id || "",
      ).toLowerCase();

      return (
        foodName.includes(searchValue) ||
        requesterName.includes(searchValue) ||
        requestId.includes(searchValue)
      );
    });
  }

  /* =====================================================
     STORE FILTERED RESULTS
     ===================================================== */

  filteredRequests = requests;

  /* =====================================================
     UPDATE SUMMARY
     ===================================================== */

  updateRequestsSummary(requests.length);

  /* =====================================================
     EMPTY
     ===================================================== */

  if (!requests.length) {
    requestsContainer.innerHTML = "";

    showEmptyState(buildEmptyMessage());

    updatePagination(0);

    return;
  }

  hideEmptyState();

  /* =====================================================
     REQUEST CARDS
     ===================================================== */

  requestsContainer.innerHTML = requests
    .map((request) => createRequestCard(request))
    .join("");

  updatePagination(requests.length);
}

/* =========================================================
   CREATE REQUEST CARD
   ========================================================= */

function createRequestCard(request) {
  const status = normalizeStatus(request.status);

  const foodName = getFoodName(request);

  const quantity = request.quantity ?? 0;

  const unit = request.unit || "";

  const requesterName =
    request.requester_name ||
    request.user_name ||
    request.customer_name ||
    "Customer";

  const requesterType =
    request.requester_type || request.user_type || "individual";

  const image =
    request.image ||
    request.food_image ||
    request.listing_image ||
    "/static/images/food-placeholder.jpg";

  const category = request.category || request.food_category || "Food";

  const foodType = request.food_type || request.foodType || "";

  const pickupDate = request.pickup_date || request.pickupDate || "";

  const pickupTime = request.pickup_time || request.pickupTime || "-";

  const instructions =
    request.instructions ||
    request.customer_instructions ||
    "No special instructions provided.";

  const phone = request.phone || request.requester_phone || "";

  const email = request.email || request.requester_email || "";

  const requestTime = formatRelativeTime(request.created_at);

  /* =====================================================
     ACTION BUTTONS
     ===================================================== */

  let actionButtons = "";

  if (status === "pending") {
    actionButtons = `
      <div class="request-action-buttons">

        <button
          type="button"
          class="accept-btn"
          onclick="acceptRequest('${escapeAttribute(request._id)}')"
        >
          <i class="ri-check-line"></i>
          Accept
        </button>

        <button
          type="button"
          class="reject-btn"
          onclick="rejectRequest('${escapeAttribute(request._id)}')"
        >
          <i class="ri-close-line"></i>
          Reject
        </button>

      </div>
    `;
  }

  return `
    <article
      class="request-card ${escapeAttribute(status)}"
      data-id="${escapeAttribute(request._id || "")}"
    >

      <!-- =====================================
           FOOD
      ====================================== -->

      <div class="request-card-column">

        <div class="request-food">

          <div class="request-food-image">

            <img
              src="${escapeAttribute(image)}"
              alt="${escapeAttribute(foodName)}"
              onerror="
                this.src='/static/images/food-placeholder.jpg'
              "
            />

          </div>

          <div class="request-food-info">

            <h3
              title="${escapeAttribute(foodName)}"
            >
              ${escapeHTML(foodName)}
            </h3>

            <div class="request-tags">

              <span class="request-tag category">
                ${escapeHTML(category)}
              </span>

              ${
                foodType
                  ? `
                    <span class="request-tag">
                      ${escapeHTML(foodType)}
                    </span>
                  `
                  : ""
              }

            </div>

            <div class="request-food-quantity">
              Qty:
              ${escapeHTML(quantity)}
              ${escapeHTML(unit)}
            </div>

          </div>

        </div>

      </div>


      <!-- =====================================
           CUSTOMER
      ====================================== -->

      <div class="request-card-column">

        <div class="request-customer">

          <div class="request-customer-avatar">

            ${
              request.requester_image ||
              request.user_image ||
              request.profile_image
                ? `
                  <img
                    src="${escapeAttribute(
                      request.requester_image ||
                        request.user_image ||
                        request.profile_image,
                    )}"
                    alt="${escapeAttribute(requesterName)}"
                  />
                `
                : `
                  <i class="ri-user-line"></i>
                `
            }

          </div>

          <div class="request-customer-info">

            <h4>
              ${escapeHTML(requesterName)}
            </h4>

            <div class="customer-contact">
              <i class="ri-user-line"></i>
              ${escapeHTML(capitalize(requesterType))}
            </div>

            ${
              phone
                ? `
                  <div class="customer-contact">
                    <i class="ri-phone-line"></i>
                    ${escapeHTML(phone)}
                  </div>
                `
                : ""
            }

          </div>

        </div>

      </div>


      <!-- =====================================
           PICKUP INFORMATION
      ====================================== -->

      <div
        class="request-card-column request-pickup"
      >

        <div class="pickup-item">

          <i class="ri-calendar-line"></i>

          <div class="pickup-item-content">

            <span>Pickup Date</span>

            <strong>
              ${escapeHTML(formatPickupDate(pickupDate))}
            </strong>

          </div>

        </div>


        <div class="pickup-item">

          <i class="ri-time-line"></i>

          <div class="pickup-item-content">

            <span>Pickup Time</span>

            <strong>
              ${escapeHTML(pickupTime)}
            </strong>

          </div>

        </div>

      </div>


      <!-- =====================================
           CUSTOMER INSTRUCTIONS
      ====================================== -->

      <div class="request-card-column">

        <div class="request-instructions">

          <div
            class="request-instructions-header"
          >

            <i class="ri-file-text-line"></i>

            <strong>
              Customer Instructions
            </strong>

          </div>

          <p>
            ${escapeHTML(instructions)}
          </p>

          <div class="request-time">

            <span
              class="request-time-dot"
            ></span>

            ${escapeHTML(requestTime)}

          </div>

        </div>

      </div>


      <!-- =====================================
           ACTIONS
      ====================================== -->

      <div class="request-card-column">

        <div class="request-actions">

          ${
            status !== "pending"
              ? `
                <span
                  class="request-status-badge ${escapeAttribute(status)}"
                >

                  <span
                    class="request-status-dot"
                  ></span>

                  ${escapeHTML(getStatusLabel(status))}

                </span>
              `
              : ""
          }

          <button
            type="button"
            class="view-request-btn"
            onclick="viewRequest('${escapeAttribute(request._id)}')"
          >
            <i class="ri-eye-line"></i>
            View Details
          </button>

          ${actionButtons}

        </div>

      </div>

    </article>
  `;
}

/* =========================================================
   STATUS FILTERS
   ========================================================= */

function initializeFilters() {
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach((button) => {
        button.classList.remove("active");
      });

      tab.classList.add("active");

      currentFilter = tab.dataset.filter || "all";

      renderRequests();
    });
  });
}

/* =========================================================
   SEARCH
   ========================================================= */

function initializeSearch() {
  const input = document.getElementById("searchRequests");

  if (!input) {
    return;
  }

  input.addEventListener("input", () => {
    updateSearchClearButton();

    renderRequests();
  });
}

/* =========================================================
   DATE FILTER
   ========================================================= */

function initializeDateFilter() {
  const dateInput = document.getElementById("requestDateFilter");

  if (!dateInput) {
    return;
  }

  dateInput.addEventListener("change", () => {
    updateDateClearButton();

    renderRequests();
  });
}

/* =========================================================
   CLEAR BUTTONS
   ========================================================= */

function initializeClearButtons() {
  const clearDateButton = document.getElementById("clearDateFilter");

  clearDateButton?.addEventListener("click", () => {
    const dateInput = document.getElementById("requestDateFilter");

    if (dateInput) {
      dateInput.value = "";
    }

    updateDateClearButton();

    renderRequests();
  });

  const clearSearchButton = document.getElementById("clearSearchBtn");

  clearSearchButton?.addEventListener("click", () => {
    const searchInput = document.getElementById("searchRequests");

    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }

    updateSearchClearButton();

    renderRequests();
  });
}

/* =========================================================
   CLEAR DATE BUTTON
   ========================================================= */

function updateDateClearButton() {
  const input = document.getElementById("requestDateFilter");

  const button = document.getElementById("clearDateFilter");

  if (!input || !button) {
    return;
  }

  button.classList.toggle("hidden", !input.value);
}

/* =========================================================
   CLEAR SEARCH BUTTON
   ========================================================= */

function updateSearchClearButton() {
  const input = document.getElementById("searchRequests");

  const button = document.getElementById("clearSearchBtn");

  if (!input || !button) {
    return;
  }

  button.classList.toggle("hidden", !input.value.trim());
}

/* =========================================================
   RETRY
   ========================================================= */

function initializeRetryButton() {
  document
    .getElementById("retryRequestsBtn")
    ?.addEventListener("click", loadRequests);
}

/* =========================================================
   ACCEPT REQUEST
   ========================================================= */

async function acceptRequest(requestId) {
  if (!requestId) {
    return;
  }

  try {
    const response = await fetch(
      `/api/requests/${encodeURIComponent(requestId)}/accept`,
      {
        method: "POST",

        credentials: "same-origin",

        headers: {
          Accept: "application/json",
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to accept request.");
    }

    const request = allRequests.find(
      (item) => String(item._id) === String(requestId),
    );

    if (request) {
      request.status = "accepted";
    }

    closeRequestModal();

    updateCounters();

    renderRequests();

    alert(data.message || "Request accepted successfully.");
  } catch (error) {
    console.error("Accept request error:", error);

    alert(error.message || "Failed to accept request.");
  }
}

/* =========================================================
   REJECT REQUEST
   ========================================================= */

async function rejectRequest(requestId) {
  if (!requestId) {
    return;
  }

  try {
    const response = await fetch(
      `/api/requests/${encodeURIComponent(requestId)}/reject`,
      {
        method: "POST",

        credentials: "same-origin",

        headers: {
          Accept: "application/json",
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to reject request.");
    }

    const request = allRequests.find(
      (item) => String(item._id) === String(requestId),
    );

    if (request) {
      request.status = "rejected";
    }

    closeRequestModal();

    updateCounters();

    renderRequests();

    alert(data.message || "Request rejected successfully.");
  } catch (error) {
    console.error("Reject request error:", error);

    alert(error.message || "Failed to reject request.");
  }
}

/* =========================================================
   VIEW REQUEST
   ========================================================= */

function viewRequest(requestId) {
  const request = allRequests.find(
    (item) => String(item._id) === String(requestId),
  );

  if (!request) {
    return;
  }

  const modal = document.getElementById("requestModal");

  if (!modal) {
    return;
  }

  /* =====================================================
     REQUEST INFORMATION
     ===================================================== */

  setModalText("modalRequestId", request.request_id || request._id || "-");

  setModalText("modalRequestedOn", formatDate(request.created_at));

  setModalText("modalStatus", getStatusLabel(normalizeStatus(request.status)));

  /* =====================================================
     FOOD INFORMATION
     ===================================================== */

  const foodName = getFoodName(request);

  setModalText("modalFoodName", foodName);

  setModalText(
    "modalFoodCategory",
    request.category || request.food_category || "-",
  );

  setModalText(
    "modalQuantity",
    `${request.quantity ?? "-"} ${request.unit || ""}`,
  );

  /* =====================================================
   AMOUNT
   Food amount + Community Support
   ===================================================== */

  const foodAmount =
    Number(
      request.amount ??
        request.total_amount ??
        request.total ??
        request.price ??
        0,
    ) || 0;

  const communitySupport = Number(request.community_support || 0) || 0;

  const totalAmount =
    Number(request.total_amount) || foodAmount + communitySupport;

  setModalText("modalAmount", formatCurrency(totalAmount));

  /* =====================================================
     FOOD IMAGE
     ===================================================== */

  setModalImage(
    "modalFoodImage",
    request.image || request.food_image || request.listing_image || "",
  );

  /* =====================================================
     CUSTOMER
     ===================================================== */

  setModalText(
    "modalRequesterName",
    request.requester_name || request.user_name || request.customer_name || "-",
  );

  setModalText(
    "modalRequesterType",
    capitalize(request.requester_type || request.user_type || "individual"),
  );

  setModalText("modalPhone", request.phone || request.requester_phone || "-");

  setModalText("modalEmail", request.email || request.requester_email || "-");

  /* =====================================================
     PICKUP
     ===================================================== */

  const pickupDate = request.pickup_date || request.pickupDate || "";

  const pickupTime = request.pickup_time || request.pickupTime || "-";

  setModalText("modalPickupDate", formatPickupDate(pickupDate));

  setModalText("modalPickupTime", pickupTime);

  setModalText(
    "modalPickupArea",
    request.listing_area ||
      request.area ||
      request.pickup_area ||
      request.pickupArea ||
      "-",
  );

  setModalText(
    "modalPickupAddress",
    request.listing_address ||
      request.address ||
      request.pickup_address ||
      request.pickupAddress ||
      "-",
  );

  /* =====================================================
     INSTRUCTIONS
     ===================================================== */

  setModalText(
    "modalInstructions",
    request.instructions ||
      request.customer_instructions ||
      "No special instructions provided.",
  );

  /* =====================================================
     ACTION BUTTONS
     ===================================================== */

  const acceptButton = document.getElementById("modalAcceptBtn");

  const rejectButton = document.getElementById("modalRejectBtn");

  const status = normalizeStatus(request.status);

  if (acceptButton) {
    acceptButton.style.display = status === "pending" ? "inline-flex" : "none";

    acceptButton.onclick = () => {
      acceptRequest(requestId);
    };
  }

  if (rejectButton) {
    rejectButton.style.display = status === "pending" ? "inline-flex" : "none";

    rejectButton.onclick = () => {
      rejectRequest(requestId);
    };
  }

  modal.classList.remove("hidden");
}

/* =========================================================
   MODAL
   ========================================================= */

function initializeModal() {
  const modal = document.getElementById("requestModal");

  const closeButton = document.getElementById("closeRequestModal");

  const overlay = document.getElementById("modalOverlay");

  closeButton?.addEventListener("click", closeRequestModal);

  overlay?.addEventListener("click", closeRequestModal);

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      modal &&
      !modal.classList.contains("hidden")
    ) {
      closeRequestModal();
    }
  });
}

function closeRequestModal() {
  const modal = document.getElementById("requestModal");

  if (modal) {
    modal.classList.add("hidden");
  }
}

/* =========================================================
   COUNTERS
   ========================================================= */

function updateCounters() {
  const all = allRequests.length;

  const pending = allRequests.filter(
    (request) => normalizeStatus(request.status) === "pending",
  ).length;

  const accepted = allRequests.filter(
    (request) => normalizeStatus(request.status) === "accepted",
  ).length;

  const completed = allRequests.filter(
    (request) => normalizeStatus(request.status) === "completed",
  ).length;

  const rejected = allRequests.filter((request) => {
    const status = normalizeRawStatus(request.status);

    return (
      status === "rejected" || status === "cancelled" || status === "canceled"
    );
  }).length;

  updateCounter("all", all);

  updateCounter("pending", pending);

  updateCounter("accepted", accepted);

  updateCounter("completed", completed);

  updateCounter("rejected", rejected);
}

function updateCounter(filter, count) {
  const element = document.querySelector(`[data-filter="${filter}"] span`);

  if (element) {
    element.textContent = count;
  }
}

/* =========================================================
   REQUEST SUMMARY
   ========================================================= */

function updateRequestsSummary(count) {
  const summary = document.getElementById("requestsSummary");

  if (!summary) {
    return;
  }

  if (count === 0) {
    summary.textContent = "Showing 0 requests";
    return;
  }

  summary.textContent = `Showing ${count} ${
    count === 1 ? "request" : "requests"
  }`;
}

/* =========================================================
   PAGINATION UI
   =========================================================
   Currently visual only.
   All filtered requests are displayed.
   ========================================================= */

function updatePagination(count) {
  const currentPage = document.getElementById("currentPage");

  const previousButton = document.getElementById("previousPageBtn");

  const nextButton = document.getElementById("nextPageBtn");

  if (currentPage) {
    currentPage.textContent = "1";
  }

  if (previousButton) {
    previousButton.disabled = true;
  }

  if (nextButton) {
    nextButton.disabled = true;
  }
}

/* =========================================================
   LOADING / EMPTY / ERROR
   ========================================================= */

function showLoading() {
  document.getElementById("requestsLoading")?.classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("requestsLoading")?.classList.add("hidden");
}

function showEmptyState(message) {
  const emptyState = document.getElementById("emptyState");

  const messageElement = document.getElementById("emptyStateMessage");

  if (messageElement) {
    messageElement.textContent = message;
  }

  emptyState?.classList.remove("hidden");
}

function hideEmptyState() {
  document.getElementById("emptyState")?.classList.add("hidden");
}

function showError(message) {
  const errorBox = document.getElementById("requestsError");

  const messageElement = document.getElementById("requestsErrorMessage");

  if (messageElement) {
    messageElement.textContent = message;
  }

  errorBox?.classList.remove("hidden");
}

function hideError() {
  document.getElementById("requestsError")?.classList.add("hidden");
}

function buildEmptyMessage() {
  const dateInput = document.getElementById("requestDateFilter");

  const searchInput = document.getElementById("searchRequests");

  if (dateInput?.value && searchInput?.value.trim()) {
    return "No requests match the selected date and search.";
  }

  if (dateInput?.value) {
    return "No requests were submitted on this date.";
  }

  if (searchInput?.value.trim()) {
    return "No requests match your search.";
  }

  if (currentFilter === "pending") {
    return "There are no pending requests.";
  }

  if (currentFilter === "accepted") {
    return "There are no accepted requests.";
  }

  if (currentFilter === "rejected") {
    return "There are no rejected or cancelled requests.";
  }

  if (currentFilter === "completed") {
    return "There are no completed requests.";
  }

  return "There are no incoming requests.";
}

/* =========================================================
   DATA HELPERS
   ========================================================= */

function getFoodName(request) {
  return (
    request.food_name ||
    request.food_title ||
    request.foodName ||
    request.name ||
    "Food Item"
  );
}

function normalizeRawStatus(status) {
  return String(status || "pending")
    .trim()
    .toLowerCase();
}

function normalizeStatus(status) {
  const value = normalizeRawStatus(status);

  if (value === "cancelled" || value === "canceled") {
    return "rejected";
  }

  return value;
}

function getStatusLabel(status) {
  const value = normalizeRawStatus(status);

  if (value === "cancelled" || value === "canceled") {
    return "Cancelled";
  }

  if (value === "rejected") {
    return "Rejected";
  }

  return capitalize(value);
}

/* =========================================================
   DATE HELPERS
   ========================================================= */

function getDateKey(date) {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const year = parsedDate.getFullYear();

  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");

  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPickupDate(date) {
  if (!date) {
    return "Not specified";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(date);
  }

  return parsedDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeTime(date) {
  if (!date) {
    return "Time unavailable";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Time unavailable";
  }

  const now = new Date();

  const difference = now.getTime() - parsedDate.getTime();

  /* Future timestamp */
  if (difference < 0) {
    const futureMinutes = Math.floor(Math.abs(difference) / 60000);

    if (futureMinutes < 1) {
      return "Just now";
    }

    if (futureMinutes < 60) {
      return `In ${futureMinutes} ${
        futureMinutes === 1 ? "minute" : "minutes"
      }`;
    }

    const futureHours = Math.floor(futureMinutes / 60);

    if (futureHours < 24) {
      return `In ${futureHours} ${futureHours === 1 ? "hour" : "hours"}`;
    }

    return formatDate(date);
  }

  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  return formatDate(date);
}

/* =========================================================
   MODAL IMAGE
   ========================================================= */

function setModalImage(elementId, imageUrl) {
  const image = document.getElementById(elementId);

  const placeholder = document.getElementById("modalFoodPlaceholder");

  if (!image) {
    return;
  }

  if (!imageUrl) {
    image.removeAttribute("src");

    image.classList.add("hidden");

    placeholder?.classList.remove("hidden");

    return;
  }

  image.src = imageUrl;

  image.classList.remove("hidden");

  placeholder?.classList.add("hidden");

  image.onerror = () => {
    image.removeAttribute("src");

    image.classList.add("hidden");

    placeholder?.classList.remove("hidden");
  };
}

/* =========================================================
   CURRENCY
   ========================================================= */

function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === "") {
    return "—";
  }

  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount)) {
    return "—";
  }

  if (numericAmount === 0) {
    return "Free";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function setModalText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = value ?? "-";
  }
}

function capitalize(value) {
  const text = String(value || "");

  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* =========================================================
   SECURITY HELPERS
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

/* =========================================================
   EXPOSE FUNCTIONS
   ========================================================= */

window.acceptRequest = acceptRequest;

window.rejectRequest = rejectRequest;

window.viewRequest = viewRequest;

window.loadRequests = loadRequests;
