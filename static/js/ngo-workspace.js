const ngoView = document.body.dataset.view;
const content = document.getElementById("workspaceContent");
const title = document.getElementById("workspaceTitle");
const intro = document.getElementById("workspaceIntro");

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;",
      })[char],
  );

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }

  return data;
}

/* =========================================================
   DONATION CARD
========================================================= */

function donationCard(donation) {
  /*
   * For available donations:
   * available_quantity = quantity currently left to claim
   *
   * Fallback to surplus_quantity for compatibility
   * with your current API.
   */

  const availableQuantity = Number(
    donation.available_quantity ??
      donation.remaining_quantity ??
      donation.surplus_quantity ??
      0,
  );

  let action = "";

  /* ---------------------------------------------------------
     AVAILABLE DONATION
  --------------------------------------------------------- */

  if (donation.status === "available" && availableQuantity > 0) {
    action = `
      <div class="claim-section">

        <label class="claim-label" for="quantity-${esc(donation.id)}">
          Quantity to claim
        </label>

        <div class="claim-controls">

          <button
            type="button"
            class="quantity-btn"
            data-quantity-action="decrease"
            data-id="${esc(donation.id)}"
            aria-label="Decrease quantity"
          >
            <i class="ri-subtract-line"></i>
          </button>

          <input
            type="number"
            id="quantity-${esc(donation.id)}"
            class="claim-quantity"
            data-quantity-input="${esc(donation.id)}"
            min="1"
            max="${availableQuantity}"
            value="1"
          />

          <button
            type="button"
            class="quantity-btn"
            data-quantity-action="increase"
            data-id="${esc(donation.id)}"
            aria-label="Increase quantity"
          >
            <i class="ri-add-line"></i>
          </button>

        </div>

        <small class="quantity-available">
          ${availableQuantity} ${esc(donation.unit)} available
        </small>

        <button
          type="button"
          class="claim-donation-btn"
          data-action="claim"
          data-id="${esc(donation.id)}"
        >
          <i class="ri-hand-heart-line"></i>
          Claim Selected Quantity
        </button>

      </div>
    `;
  } else if (donation.status === "claimed") {

  /* ---------------------------------------------------------
     CLAIMED
  --------------------------------------------------------- */
    action = `
      <button
        type="button"
        class="workspace-action-btn"
        data-action="pickup"
        data-id="${esc(donation.id)}"
      >
        <i class="ri-truck-line"></i>
        Mark as Picked Up
      </button>
    `;
  } else if (donation.status === "picked_up") {

  /* ---------------------------------------------------------
     PICKED UP
  --------------------------------------------------------- */
    action = `
      <button
        type="button"
        class="workspace-action-btn"
        data-action="complete"
        data-id="${esc(donation.id)}"
      >
        <i class="ri-checkbox-circle-line"></i>
        Complete Donation
      </button>
    `;
  }

  return `
    <article class="donation-card">

      <img
        src="${esc(donation.image || "/static/images/food-placeholder.jpg")}"
        alt="${esc(donation.food_title || "Food donation")}"
      >

      <h2>${esc(donation.food_title || "Food donation")}</h2>

      <p>
        <strong>
          ${availableQuantity} ${esc(donation.unit)}
        </strong>
        · ${esc(donation.category)}
      </p>

      <p>
        ${esc(donation.provider_name)}
        · ${esc(donation.city)}
      </p>

      <small>
        Pickup:
        ${esc(donation.donation_pickup_start)}
        –
        ${esc(donation.donation_pickup_end)}
      </small>

      <span class="status">
        ${esc(donation.status)}
      </span>

      ${action}

    </article>
  `;
}

/* =========================================================
   LOAD DONATIONS
========================================================= */

async function loadDonations(url, heading, description) {
  title.textContent = heading;
  intro.textContent = description;

  const data = await api(url);

  const records = Array.isArray(data.donations) ? data.donations : [];

  content.innerHTML = records.length
    ? `
      <div class="workspace-grid">
        ${records.map(donationCard).join("")}
      </div>
    `
    : `
      <div class="workspace-empty">
        No donations to show right now.
      </div>
    `;
}

/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadProfile() {
  title.textContent = "NGO Profile";
  intro.textContent =
    "Keep your organization and pickup contact details current.";

  const { profile: p = {} } = await api("/api/ngo/profile");

  content.innerHTML = `
    <form id="ngoProfileForm" class="workspace-panel profile-form">

      <label>
        Organization name
        <input
          name="organization_name"
          value="${esc(p.organization_name)}"
          required
        >
      </label>

      <label>
        Contact person
        <input
          name="contact_person"
          value="${esc(p.contact_person)}"
        >
      </label>

      <label>
        Phone
        <input
          name="phone"
          value="${esc(p.phone)}"
        >
      </label>

      <label>
        City
        <input
          name="city"
          value="${esc(p.city)}"
        >
      </label>

      <label>
        State
        <input
          name="state"
          value="${esc(p.state)}"
        >
      </label>

      <label>
        Pincode
        <input
          name="pincode"
          value="${esc(p.pincode)}"
        >
      </label>

      <label>
        Service area
        <input
          name="service_area"
          value="${esc(p.service_area)}"
        >
      </label>

      <label class="full">
        Address
        <textarea name="address">${esc(p.address)}</textarea>
      </label>

      <label class="full">
        About
        <textarea name="about">${esc(p.about)}</textarea>
      </label>

      <button class="full">
        Save Profile
      </button>

    </form>
  `;

  document.getElementById("ngoProfileForm").onsubmit = saveProfile;
}

/* =========================================================
   LOAD IMPACT
========================================================= */

async function loadImpact() {
  title.textContent = "Your Impact";
  intro.textContent = "Completed donations are counted as rescued food.";

  const { dashboard = {} } = await api("/api/ngo/dashboard");

  content.innerHTML = `
    <section class="workspace-panel">

      <div class="impact-number">
        ${esc(dashboard.food_rescued || 0)}
      </div>

      <h2>
        units of food rescued
      </h2>

      <p>
        ${esc(dashboard.completed_donations || 0)}
        completed donations ·
        ${esc(dashboard.active_claims || 0)}
        active claims
      </p>

    </section>
  `;
}

/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile(event) {
  event.preventDefault();

  try {
    const data = await api("/api/ngo/profile", {
      method: "PUT",
      body: JSON.stringify(Object.fromEntries(new FormData(event.target))),
    });

    alert(data.message || "Profile saved successfully.");
  } catch (error) {
    alert(error.message);
  }
}

/* =========================================================
   QUANTITY CONTROLS
========================================================= */

content.addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity-action]");

  if (!quantityButton) return;

  const donationId = quantityButton.dataset.id;

  const input = document.querySelector(
    `[data-quantity-input="${CSS.escape(donationId)}"]`,
  );

  if (!input) return;

  const min = Number(input.min) || 1;
  const max = Number(input.max) || 1;

  let value = Number(input.value);

  if (!Number.isFinite(value)) {
    value = min;
  }

  if (quantityButton.dataset.quantityAction === "increase") {
    value++;
  }

  if (quantityButton.dataset.quantityAction === "decrease") {
    value--;
  }

  value = Math.max(min, Math.min(value, max));

  input.value = value;
});

/* =========================================================
   QUANTITY INPUT VALIDATION
========================================================= */

content.addEventListener("input", (event) => {
  const input = event.target.closest(".claim-quantity");

  if (!input) return;

  const max = Number(input.max) || 1;

  let value = Number(input.value);

  if (!Number.isFinite(value)) {
    return;
  }

  if (value > max) {
    input.value = max;
  }

  if (value < 1 && input.value !== "") {
    input.value = 1;
  }
});

/* =========================================================
   CLAIM / PICKUP / COMPLETE
========================================================= */

content.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const action = button.dataset.action;
  const donationId = button.dataset.id;

  const paths = {
    claim: "claim",
    pickup: "pickup",
    complete: "complete",
  };

  if (!paths[action]) return;

  /* ---------------------------------------------------------
     CLAIM
  --------------------------------------------------------- */

  if (action === "claim") {
    const input = document.querySelector(
      `[data-quantity-input="${CSS.escape(donationId)}"]`,
    );

    if (!input) {
      alert("Please select a quantity.");
      return;
    }

    if (input.value.trim() === "") {
      alert("Please enter the quantity you want to claim.");
      input.focus();
      return;
    }

    const quantity = Number(input.value);
    const max = Number(input.max);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity.");
      input.focus();
      return;
    }

    if (quantity > max) {
      alert(`You can claim a maximum of ${max} units.`);
      input.value = max;
      input.focus();
      return;
    }

    const confirmed = confirm(
      `Claim ${quantity} ${
        input
          .closest(".claim-section")
          ?.querySelector(".quantity-available")
          ?.textContent?.replace(/.*?available/i, "")
          ?.trim() || "unit(s)"
      }?`,
    );

    if (!confirmed) {
      return;
    }

    button.disabled = true;

    try {
      await api(`/api/donations/${encodeURIComponent(donationId)}/claim`, {
        method: "POST",
        body: JSON.stringify({
          quantity: quantity,
        }),
      });

      /*
       * Reload so the updated remaining quantity
       * comes directly from the server.
       */
      await loadDonations(
        "/api/donations/available",
        "Available Donations",
        "Claim surplus food before its donation pickup window closes.",
      );
    } catch (error) {
      button.disabled = false;
      alert(error.message);
    }

    return;
  }

  /* ---------------------------------------------------------
     PICKUP / COMPLETE
  --------------------------------------------------------- */

  button.disabled = true;

  try {
    await api(
      `/api/donations/${encodeURIComponent(donationId)}/${paths[action]}`,
      {
        method: "POST",
      },
    );

    window.location.reload();
  } catch (error) {
    button.disabled = false;
    alert(error.message);
  }
});

/* =========================================================
   INITIAL PAGE LOAD
========================================================= */

(async () => {
  try {
    if (ngoView === "available") {
      const loadAvailable = () =>
        loadDonations(
          "/api/donations/available",
          "Available Donations",
          "Claim surplus food before its donation pickup window closes.",
        );

      await loadAvailable();

      /*
       * Automatically refresh available quantities.
       */
      setInterval(() => {
        loadAvailable().catch(() => {});
      }, 30000);
    } else if (ngoView === "claims") {
      await loadDonations(
        "/api/ngo/donations",
        "My Donations",
        "Manage claimed, picked-up, completed, and expired donations.",
      );
    } else if (ngoView === "impact") {
      await loadImpact();
    } else {
      await loadProfile();
    }
  } catch (error) {
    content.innerHTML = `
      <div class="workspace-empty">
        ${esc(error.message || "Unable to load this page.")}
      </div>
    `;
  }
})();
