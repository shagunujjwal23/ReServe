const requestsContainer = document.getElementById("requestsContainer");

let allRequests = [];

// All requests should be visible when the page first opens.
let currentFilter = "all";

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

    requestsContainer.innerHTML = `
      <div class="empty-requests">
        <i class="ri-error-warning-line"></i>
        <h3>Unable to load requests</h3>
        <p>
          ${error.message || "Please try again later."}
        </p>
      </div>
    `;
  }
}

/* =========================================
   RENDER REQUESTS
========================================= */

function renderRequests() {
  let requests = [...allRequests];

  /* -----------------------------------------
     FILTER
  ----------------------------------------- */

  if (currentFilter !== "all") {
    requests = requests.filter((request) => request.status === currentFilter);
  }

  /* -----------------------------------------
     SEARCH
  ----------------------------------------- */

  const searchInput = document.getElementById("searchRequests");

  const searchValue = (searchInput?.value || "").trim().toLowerCase();

  if (searchValue) {
    requests = requests.filter((request) => {
      const foodName = String(request.food_name || "").toLowerCase();

      const requesterName = String(request.requester_name || "").toLowerCase();

      const requestId = String(request.request_id || "").toLowerCase();

      return (
        foodName.includes(searchValue) ||
        requesterName.includes(searchValue) ||
        requestId.includes(searchValue)
      );
    });
  }

  /* -----------------------------------------
     EMPTY
  ----------------------------------------- */

  if (!requests.length) {
    requestsContainer.innerHTML = `
      <div class="empty-requests">

        <i class="ri-inbox-line"></i>

        <h3>No Requests Found</h3>

        <p>
          No requests match the selected filter.
        </p>

      </div>
    `;

    return;
  }

  /* -----------------------------------------
     REQUEST CARDS
  ----------------------------------------- */

  requestsContainer.innerHTML = requests
    .map((request) => {
      const status = request.status || "pending";

      const priority = request.priority || "normal";

      return `
        <div
          class="request-card ${status}"
          data-id="${request._id}"
        >

          <!-- FOOD -->

          <div class="request-food">

            <img
              src="${request.image || "/static/images/food-placeholder.jpg"}"
              alt="${request.food_name || "Food Item"}"
              onerror="
                this.src='/static/images/food-placeholder.jpg'
              "
            />

            <div class="request-food-details">

              <div class="request-header-row">

                <h3>
                  ${request.food_name || "Food Item"}
                </h3>

                <span
                  class="priority ${priority}"
                >
                  ${capitalize(priority)}
                </span>

              </div>

              <div class="food-meta">

                <span>
                  Quantity:
                  ${request.quantity || 0}
                  ${request.unit || ""}
                </span>

                <span>
                  Serves:
                  ${request.serves || "-"}
                </span>

              </div>

              <div class="request-user">

                <i class="ri-user-line"></i>

                <strong>
                  ${request.requester_name || "User"}
                </strong>

                <span
                  class="
                    request-type
                    ${request.requester_type || "individual"}
                  "
                >
                  ${request.requester_type || "individual"}
                </span>

              </div>

              <div class="distance">

                <i class="ri-map-pin-line"></i>

                ${request.distance || "Not available"}

              </div>

            </div>

          </div>


          <!-- REQUEST INFORMATION -->

          <div class="request-info">

            <div class="info-item">

              <i class="ri-hashtag"></i>

              <div>

                <span>
                  Request ID
                </span>

                <strong>
                  ${request.request_id || "-"}
                </strong>

              </div>

            </div>


            <div class="info-item">

              <i class="ri-calendar-line"></i>

              <div>

                <span>
                  Requested On
                </span>

                <strong>
                  ${formatDate(request.created_at)}
                </strong>

              </div>

            </div>


            <div class="info-item">

              <i class="ri-time-line"></i>

              <div>

                <span>
                  Pickup Time
                </span>

                <strong>
                  ${request.pickup_time || "-"}
                </strong>

              </div>

            </div>

          </div>


          <!-- ACTIONS -->

          <div class="request-actions">

            <button
              class="view-details-btn"
              onclick="
                viewRequest('${request._id}')
              "
            >
              <i class="ri-eye-line"></i>
              View Details
            </button>


            ${
              status === "pending"
                ? `
                  <button
                    class="accept-btn"
                    onclick="
                      acceptRequest('${request._id}')
                    "
                  >
                    <i class="ri-check-line"></i>
                    Accept
                  </button>

                  <button
                    class="reject-btn"
                    onclick="
                      rejectRequest('${request._id}')
                    "
                  >
                    <i class="ri-close-line"></i>
                    Reject
                  </button>
                `
                : ""
            }

          </div>

        </div>
      `;
    })
    .join("");
}

/* =========================================
   FILTERS
========================================= */

function initializeFilters() {
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach((btn) => {
        btn.classList.remove("active");
      });

      tab.classList.add("active");

      currentFilter = tab.dataset.filter || "all";

      renderRequests();
    });
  });
}

/* =========================================
   SEARCH
========================================= */

function initializeSearch() {
  const input = document.getElementById("searchRequests");

  if (!input) {
    return;
  }

  input.addEventListener("input", renderRequests);
}

/* =========================================
   ACCEPT REQUEST
========================================= */

async function acceptRequest(requestId) {
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

    const request = allRequests.find((item) => item._id === requestId);

    if (request) {
      request.status = "accepted";
    }

    /* Close modal */

    const requestModal = document.getElementById("requestModal");

    if (requestModal) {
      requestModal.classList.add("hidden");
    }

    updateCounters();
    renderRequests();

    alert(data.message || "Request accepted successfully.");
  } catch (error) {
    console.error("Accept request error:", error);

    alert(error.message || "Failed to accept request.");
  }
}

/* =========================================
   REJECT REQUEST
========================================= */

async function rejectRequest(requestId) {
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

    const request = allRequests.find((item) => item._id === requestId);

    if (request) {
      request.status = "rejected";
    }

    /* Close modal */

    const requestModal = document.getElementById("requestModal");

    if (requestModal) {
      requestModal.classList.add("hidden");
    }

    updateCounters();
    renderRequests();

    alert(data.message || "Request rejected successfully.");
  } catch (error) {
    console.error("Reject request error:", error);

    alert(error.message || "Failed to reject request.");
  }
}

/* =========================================
   VIEW DETAILS
========================================= */

function viewRequest(requestId) {
  const request = allRequests.find((item) => item._id === requestId);

  if (!request) {
    return;
  }

  const modal = document.getElementById("requestModal");

  if (!modal) {
    return;
  }

  modal.classList.remove("hidden");

  /* -----------------------------------------
     REQUEST INFORMATION
  ----------------------------------------- */

  setModalText("modalRequestId", request.request_id || "-");

  setModalText("modalRequestedOn", formatDate(request.created_at));

  setModalText("modalStatus", capitalize(request.status || "pending"));

  /* -----------------------------------------
     REQUESTER
  ----------------------------------------- */

  setModalText("modalRequesterName", request.requester_name || "-");

  setModalText("modalRequesterType", request.requester_type || "-");

  setModalText("modalDistance", request.distance || "-");

  setModalText("modalPhone", request.phone || "-");

  /* -----------------------------------------
     FOOD
  ----------------------------------------- */

  setModalText("modalFoodName", request.food_name || "-");

  setModalText("modalQuantity", request.quantity || "-");

  setModalText("modalPeopleServed", request.serves || "-");

  setModalText("modalPickupTime", request.pickup_time || "-");

  /* -----------------------------------------
     PURPOSE
  ----------------------------------------- */

  setModalText("modalPurpose", request.purpose || "Food reservation");

  /* -----------------------------------------
     INSTRUCTIONS
  ----------------------------------------- */

  setModalText(
    "modalInstructions",
    request.instructions || "No special instructions provided.",
  );

  /* -----------------------------------------
     MODAL BUTTONS
  ----------------------------------------- */

  const acceptButton = document.getElementById("modalAcceptBtn");

  const rejectButton = document.getElementById("modalRejectBtn");

  if (acceptButton) {
    acceptButton.style.display = request.status === "pending" ? "" : "none";

    acceptButton.onclick = () => acceptRequest(requestId);
  }

  if (rejectButton) {
    rejectButton.style.display = request.status === "pending" ? "" : "none";

    rejectButton.onclick = () => rejectRequest(requestId);
  }
}

/* =========================================
   MODAL
========================================= */

const modal = document.getElementById("requestModal");

document.getElementById("closeRequestModal")?.addEventListener("click", () => {
  modal?.classList.add("hidden");
});

document.querySelector(".modal-overlay")?.addEventListener("click", () => {
  modal?.classList.add("hidden");
});

/* =========================================
   COUNTERS
========================================= */

function updateCounters() {
  const all = allRequests.length;

  const pending = allRequests.filter((r) => r.status === "pending").length;

  const accepted = allRequests.filter((r) => r.status === "accepted").length;

  const rejected = allRequests.filter((r) => r.status === "rejected").length;

  const completed = allRequests.filter((r) => r.status === "completed").length;

  /* -----------------------------------------
     ALL
  ----------------------------------------- */

  const allTab = document.querySelector('[data-filter="all"] span');

  if (allTab) {
    allTab.textContent = all;
  }

  /* -----------------------------------------
     PENDING
  ----------------------------------------- */

  const pendingTab = document.querySelector('[data-filter="pending"] span');

  if (pendingTab) {
    pendingTab.textContent = pending;
  }

  /* -----------------------------------------
     ACCEPTED
  ----------------------------------------- */

  const acceptedTab = document.querySelector('[data-filter="accepted"] span');

  if (acceptedTab) {
    acceptedTab.textContent = accepted;
  }

  /* -----------------------------------------
     REJECTED
  ----------------------------------------- */

  const rejectedTab = document.querySelector('[data-filter="rejected"] span');

  if (rejectedTab) {
    rejectedTab.textContent = rejected;
  }

  /* -----------------------------------------
     COMPLETED
  ----------------------------------------- */

  const completedTab = document.querySelector('[data-filter="completed"] span');

  if (completedTab) {
    completedTab.textContent = completed;
  }
}

/* =========================================
   HELPERS
========================================= */

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

function formatDate(date) {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleString("en-IN");
}
