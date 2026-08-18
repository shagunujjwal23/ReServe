const requestsContainer = document.getElementById("requestsContainer");

let allRequests = [];
let currentFilter = "pending";

/* =========================================
   INIT
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  initializeFilters();
  initializeSearch();

  await loadRequests();
});

/* =========================================
   LOAD REQUESTS
========================================= */

async function loadRequests() {
  try {
    requestsContainer.innerHTML = `
      <div class="requests-loading">
        <i class="ri-loader-4-line"></i>
        <span>Loading requests...</span>
      </div>
    `;

    const response = await fetch("/api/requests");

    const data = await response.json();

    allRequests = data.requests || [];

    updateCounters();

    renderRequests();
  } catch (error) {
    console.error(error);

    requestsContainer.innerHTML = `
      <div class="empty-requests">
        <i class="ri-error-warning-line"></i>
        <h3>Unable to load requests</h3>
        <p>Please try again later.</p>
      </div>
    `;
  }
}

/* =========================================
   RENDER REQUESTS
========================================= */

function renderRequests() {
  let requests = [...allRequests];

  if (currentFilter !== "all") {
    requests = requests.filter((request) => request.status === currentFilter);
  }

  const searchValue = document
    .getElementById("searchRequests")
    .value.toLowerCase();

  if (searchValue) {
    requests = requests.filter((request) => {
      return (
        request.food_name.toLowerCase().includes(searchValue) ||
        request.requester_name.toLowerCase().includes(searchValue) ||
        request.request_id.toLowerCase().includes(searchValue)
      );
    });
  }

  if (!requests.length) {
    requestsContainer.innerHTML = `
      <div class="empty-requests">
        <i class="ri-inbox-line"></i>
        <h3>No Requests Found</h3>
        <p>No requests match the selected filter.</p>
      </div>
    `;

    return;
  }

  requestsContainer.innerHTML = requests
    .map(
      (request) => `
      <div class="request-card ${request.status}"
           data-id="${request._id}">

        <div class="request-food">

          <img
            src="${request.image || "/static/images/food-placeholder.jpg"}"
            alt="${request.food_name}"
          />

          <div class="request-food-details">

            <div class="request-header-row">
              <h3>${request.food_name}</h3>

              <span class="priority ${request.priority}">
                ${capitalize(request.priority)}
              </span>
            </div>

            <div class="food-meta">
              <span>Quantity: ${request.quantity}</span>
              <span>Serves: ${request.serves}</span>
            </div>

            <div class="request-user">
              <i class="ri-user-line"></i>

              <strong>${request.requester_name}</strong>

              <span class="request-type ${request.requester_type}">
                ${request.requester_type}
              </span>
            </div>

            <div class="distance">
              <i class="ri-map-pin-line"></i>
              ${request.distance}
            </div>
          </div>
        </div>

        <div class="request-info">

          <div class="info-item">
            <i class="ri-hashtag"></i>

            <div>
              <span>Request ID</span>
              <strong>${request.request_id}</strong>
            </div>
          </div>

          <div class="info-item">
            <i class="ri-calendar-line"></i>

            <div>
              <span>Requested On</span>
              <strong>${formatDate(request.created_at)}</strong>
            </div>
          </div>

          <div class="info-item">
            <i class="ri-time-line"></i>

            <div>
              <span>Pickup Time</span>
              <strong>${request.pickup_time}</strong>
            </div>
          </div>
        </div>

        <div class="request-actions">

          <button
            class="view-details-btn"
            onclick="viewRequest('${request._id}')"
          >
            <i class="ri-eye-line"></i>
            View Details
          </button>

          ${
            request.status === "pending"
              ? `
            <button
              class="accept-btn"
              onclick="acceptRequest('${request._id}')"
            >
              <i class="ri-check-line"></i>
              Accept
            </button>

            <button
              class="reject-btn"
              onclick="rejectRequest('${request._id}')"
            >
              <i class="ri-close-line"></i>
              Reject
            </button>
          `
              : ""
          }

        </div>
      </div>
    `,
    )
    .join("");
}

/* =========================================
   FILTERS
========================================= */

function initializeFilters() {
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-tab")
        .forEach((btn) => btn.classList.remove("active"));

      tab.classList.add("active");

      currentFilter = tab.dataset.filter;

      renderRequests();
    });
  });
}

/* =========================================
   SEARCH
========================================= */

function initializeSearch() {
  const input = document.getElementById("searchRequests");

  input.addEventListener("input", renderRequests);
}

/* =========================================
   ACCEPT REQUEST
========================================= */

async function acceptRequest(requestId) {
  try {
    const response = await fetch(`/api/requests/${requestId}/accept`, {
      method: "POST",
    });

    if (!response.ok) throw new Error();

    const request = allRequests.find((item) => item._id === requestId);

    request.status = "accepted";

    updateCounters();
    renderRequests();
  } catch (error) {
    alert("Failed to accept request");
  }
}

/* =========================================
   REJECT REQUEST
========================================= */

async function rejectRequest(requestId) {
  try {
    const response = await fetch(`/api/requests/${requestId}/reject`, {
      method: "POST",
    });

    if (!response.ok) throw new Error();

    const request = allRequests.find((item) => item._id === requestId);

    request.status = "rejected";

    updateCounters();
    renderRequests();
  } catch (error) {
    alert("Failed to reject request");
  }
}

/* =========================================
   VIEW DETAILS
========================================= */

function viewRequest(requestId) {
  const request = allRequests.find((item) => item._id === requestId);

  if (!request) return;

  const modal = document.getElementById("requestModal");

  modal.classList.remove("hidden");

  // Request Info
  document.getElementById("modalRequestId").textContent =
    request.request_id || "-";

  document.getElementById("modalRequestedOn").textContent = formatDate(
    request.created_at,
  );

  document.getElementById("modalStatus").textContent = capitalize(
    request.status,
  );

  // Requester
  document.getElementById("modalRequesterName").textContent =
    request.requester_name || "-";

  document.getElementById("modalRequesterType").textContent =
    request.requester_type || "-";

  document.getElementById("modalDistance").textContent =
    request.distance || "-";

  document.getElementById("modalPhone").textContent = request.phone || "-";

  // Food
  document.getElementById("modalFoodName").textContent =
    request.food_name || "-";

  document.getElementById("modalQuantity").textContent =
    request.quantity || "-";

  document.getElementById("modalPeopleServed").textContent =
    request.serves || "-";

  document.getElementById("modalPickupTime").textContent =
    request.pickup_time || "-";

  // Purpose
  document.getElementById("modalPurpose").textContent =
    request.purpose || "Not provided";

  // Instructions
  document.getElementById("modalInstructions").textContent =
    request.instructions || "No special instructions provided.";

  // Modal buttons
  document.getElementById("modalAcceptBtn").onclick = () =>
    acceptRequest(requestId);

  document.getElementById("modalRejectBtn").onclick = () =>
    rejectRequest(requestId);
}

/* =========================================
   MODAL
========================================= */

const modal = document.getElementById("requestModal");

document.getElementById("closeRequestModal")?.addEventListener("click", () => {
  modal.classList.add("hidden");
});

document.querySelector(".modal-overlay")?.addEventListener("click", () => {
  modal.classList.add("hidden");
});

async function acceptRequest(requestId) {
  try {
    const response = await fetch(`/api/requests/${requestId}/accept`, {
      method: "POST",
    });

    if (!response.ok) throw new Error();

    const request = allRequests.find((item) => item._id === requestId);

    if (request) {
      request.status = "accepted";
    }

    document.getElementById("requestModal").classList.add("hidden");

    updateCounters();
    renderRequests();
  } catch (error) {
    alert("Failed to accept request");
  }
}

/* =========================================
   COUNTERS
========================================= */

function updateCounters() {
  const pending = allRequests.filter((r) => r.status === "pending").length;

  const accepted = allRequests.filter((r) => r.status === "accepted").length;

  const rejected = allRequests.filter((r) => r.status === "rejected").length;

  const completed = allRequests.filter((r) => r.status === "completed").length;

  document.querySelector('[data-filter="pending"] span').textContent = pending;

  document.querySelector('[data-filter="accepted"] span').textContent =
    accepted;

  document.querySelector('[data-filter="rejected"] span').textContent =
    rejected;

  document.querySelector('[data-filter="completed"] span').textContent =
    completed;
}

/* =========================================
   HELPERS
========================================= */

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}
