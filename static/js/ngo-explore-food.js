document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     ELEMENTS
  ========================================================= */

  const donationsContainer = document.getElementById("donationsContainer");

  const donationCardTemplate = document.getElementById("donationCardTemplate");

  const loadingState = document.getElementById("loadingState");

  const emptyState = document.getElementById("emptyState");

  const resultCount = document.getElementById("resultCount");

  const foodSearch = document.getElementById("foodSearch");

  const sortBy = document.getElementById("sortBy");

  const clearFilters = document.getElementById("clearFilters");

  const emptyClearFilters = document.getElementById("emptyClearFilters");

  const applyFilters = document.getElementById("applyFilters");

  const pickupDateFilter = document.getElementById("pickupDateFilter");

  const locationFilter = document.getElementById("locationFilter");

  /* =========================================================
     MODAL ELEMENTS
  ========================================================= */

  const claimModal = document.getElementById("claimModal");

  const closeClaimModal = document.getElementById("closeClaimModal");

  const cancelClaim = document.getElementById("cancelClaim");

  const confirmClaim = document.getElementById("confirmClaim");

  const decreaseQuantity = document.getElementById("decreaseQuantity");

  const increaseQuantity = document.getElementById("increaseQuantity");

  const claimQuantity = document.getElementById("claimQuantity");

  const claimFoodImage = document.getElementById("claimFoodImage");

  const claimFoodCategory = document.getElementById("claimFoodCategory");

  const claimFoodName = document.getElementById("claimFoodName");

  const claimProvider = document.getElementById("claimProvider");

  const claimAvailableQuantity = document.getElementById(
    "claimAvailableQuantity",
  );

  const claimUnit = document.getElementById("claimUnit");

  const claimPickupTime = document.getElementById("claimPickupTime");

  const claimLocation = document.getElementById("claimLocation");

  const quantityHelp = document.getElementById("quantityHelp");

  /* =========================================================
     VIEW BUTTONS
  ========================================================= */

  const gridViewBtn = document.getElementById("gridViewBtn");

  const listViewBtn = document.getElementById("listViewBtn");

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  const notificationBtn = document.getElementById("notificationBtn");

  const notificationPanel = document.getElementById("notificationPanel");

  const closeNotificationPanel = document.getElementById(
    "closeNotificationPanel",
  );

  /* =========================================================
     PROFILE DROPDOWN
  ========================================================= */

  const ngoProfileBtn = document.getElementById("ngoProfileBtn");

  const ngoProfileDropdown = document.getElementById("ngoProfileDropdown");

  /* =========================================================
     STATE
  ========================================================= */

  let donations = [];

  let filteredDonations = [];

  let selectedDonation = null;

  /* =========================================================
     API HELPER
  ========================================================= */

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },

      ...options,
    });

    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.message || data?.error || `Request failed (${response.status})`;

      throw new Error(message);
    }

    return data;
  }

  /* =========================================================
     LOAD DONATIONS
  ========================================================= */

  async function loadDonations() {
    showLoading();

    try {
      const data = await apiRequest("/api/donations/available");

      if (Array.isArray(data)) {
        donations = data;
      } else if (Array.isArray(data.donations)) {
        donations = data.donations;
      } else if (Array.isArray(data.data)) {
        donations = data.data;
      } else {
        donations = [];
      }

      donations = donations.map(normalizeDonation);

      applyAllFilters();
    } catch (error) {
      console.error("Unable to load donations:", error);

      donations = [];
      filteredDonations = [];

      hideLoading();

      donationsContainer.innerHTML = "";

      emptyState.classList.remove("hidden");

      const heading = emptyState.querySelector("h3");

      const paragraph = emptyState.querySelector("p");

      if (heading) {
        heading.textContent = "Unable to load donations";
      }

      if (paragraph) {
        paragraph.textContent =
          error.message || "Something went wrong while loading available food.";
      }

      resultCount.textContent = "Unable to load donations";
    }
  }

  /* =========================================================
     NORMALIZE DONATION
  ========================================================= */

  function normalizeDonation(item) {
    const availableQuantity = Number(
      item.available_quantity ??
        item.availableQuantity ??
        item.surplus_quantity ??
        item.quantity ??
        0,
    );

    const totalQuantity = Number(
      item.surplus_quantity ?? item.quantity ?? availableQuantity,
    );

    return {
      id: item.id ?? item._id ?? item.donation_id ?? "",

      title:
        item.food_title ??
        item.food_name ??
        item.name ??
        item.title ??
        "Food Donation",

      description: item.description ?? "",

      category: item.category ?? "Others",

      foodType: item.food_type ?? item.foodType ?? "",

      image:
        item.image ??
        item.image_url ??
        item.food_image ??
        "/static/images/food-placeholder.jpg",

      provider:
        item.provider_name ??
        item.business_name ??
        item.provider ??
        "Food Provider",

      providerType: item.provider_type ?? item.providerType ?? "",

      location:
        item.address ?? item.location ?? item.city ?? "Location not available",

      city: item.city ?? "",

      quantity: totalQuantity,

      availableQuantity: availableQuantity,

      unit: item.unit ?? "units",

      pickupStart:
        item.donation_pickup_start ??
        item.pickup_start ??
        item.pickupStart ??
        "",

      pickupEnd:
        item.donation_pickup_end ?? item.pickup_end ?? item.pickupEnd ?? "",

      pickupInstructions:
        item.pickup_instructions ?? item.pickupInstructions ?? "",

      createdAt: item.created_at ?? item.createdAt ?? "",

      status: item.status ?? "available",

      raw: item,
    };
  }

  /* =========================================================
     FILTERS
  ========================================================= */

  function applyAllFilters() {
    const searchTerm = foodSearch.value.trim().toLowerCase();

    const locationTerm = locationFilter.value.trim().toLowerCase();

    const selectedCategories = [
      ...document.querySelectorAll('input[name="category"]:checked'),
    ].map((checkbox) => checkbox.value.toLowerCase());

    const selectedProviderTypes = [
      ...document.querySelectorAll('input[name="providerType"]:checked'),
    ].map((checkbox) => checkbox.value.toLowerCase());

    filteredDonations = donations.filter((donation) => {
      /* Status */

      if (donation.status && donation.status.toLowerCase() !== "available") {
        return false;
      }

      /* Available quantity */

      if (Number(donation.availableQuantity) <= 0) {
        return false;
      }

      /* Search */

      if (searchTerm) {
        const searchableText = [
          donation.title,
          donation.description,
          donation.category,
          donation.provider,
          donation.location,
          donation.city,
        ]
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      /* Category */

      if (selectedCategories.length > 0) {
        const category = donation.category.toLowerCase();

        const matches = selectedCategories.some(
          (selected) =>
            category.includes(selected) || selected.includes(category),
        );

        if (!matches) {
          return false;
        }
      }

      /* Provider Type */

      if (selectedProviderTypes.length > 0) {
        const providerType = donation.providerType.toLowerCase();

        const providerName = donation.provider.toLowerCase();

        const matches = selectedProviderTypes.some(
          (selected) =>
            providerType.includes(selected) || providerName.includes(selected),
        );

        if (!matches) {
          return false;
        }
      }

      /* Location */

      if (locationTerm) {
        const locationText = [
          donation.location,
          donation.city,
          donation.provider,
        ]
          .join(" ")
          .toLowerCase();

        if (!locationText.includes(locationTerm)) {
          return false;
        }
      }

      /* Pickup Date */

      const pickupFilter = pickupDateFilter.value;

      if (
        pickupFilter &&
        !matchesPickupDate(donation.pickupStart, pickupFilter)
      ) {
        return false;
      }

      return true;
    });

    sortDonations();

    renderDonations();
  }

  /* =========================================================
     PICKUP DATE FILTER
  ========================================================= */

  function matchesPickupDate(pickupDate, filter) {
    if (!pickupDate) {
      return false;
    }

    const date = new Date(pickupDate);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const tomorrow = new Date(today);

    tomorrow.setDate(tomorrow.getDate() + 1);

    const pickupDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    if (filter === "today") {
      return pickupDay.getTime() === today.getTime();
    }

    if (filter === "tomorrow") {
      return pickupDay.getTime() === tomorrow.getTime();
    }

    if (filter === "week") {
      const weekEnd = new Date(today);

      weekEnd.setDate(weekEnd.getDate() + 7);

      return pickupDay >= today && pickupDay <= weekEnd;
    }

    return true;
  }

  /* =========================================================
     SORT
  ========================================================= */

  function sortDonations() {
    const sort = sortBy.value;

    filteredDonations.sort((a, b) => {
      if (sort === "quantity") {
        return Number(b.availableQuantity) - Number(a.availableQuantity);
      }

      if (sort === "pickup") {
        return getTime(a.pickupStart) - getTime(b.pickupStart);
      }

      return getTime(b.createdAt) - getTime(a.createdAt);
    });
  }

  function getTime(value) {
    if (!value) {
      return 0;
    }

    const time = new Date(value).getTime();

    return Number.isNaN(time) ? 0 : time;
  }

  /* =========================================================
     RENDER DONATIONS
  ========================================================= */

  function renderDonations() {
    hideLoading();

    donationsContainer.innerHTML = "";

    resultCount.textContent = `${filteredDonations.length} ${
      filteredDonations.length === 1 ? "donation" : "donations"
    } available`;

    if (filteredDonations.length === 0) {
      emptyState.classList.remove("hidden");

      return;
    }

    emptyState.classList.add("hidden");

    filteredDonations.forEach((donation) => {
      const card = createDonationCard(donation);

      donationsContainer.appendChild(card);
    });
  }

  /* =========================================================
     CREATE DONATION CARD
  ========================================================= */

  function createDonationCard(donation) {
    const fragment = donationCardTemplate.content.cloneNode(true);

    const card = fragment.querySelector(".donation-card");

    const image = card.querySelector(".card-image");

    const category = card.querySelector(".category-badge");

    const quantityBadge = card.querySelector(".quantity-badge");

    const title = card.querySelector(".food-title");

    const provider = card.querySelector(".provider-name");

    const location = card.querySelector(".food-location");

    const pickupTime = card.querySelector(".pickup-time");

    const availableAmount = card.querySelector(".available-amount");

    const claimButton = card.querySelector(".claim-btn");

    /* Image */

    image.src = donation.image;

    image.alt = donation.title;

    image.onerror = () => {
      image.src = "/static/images/food-placeholder.jpg";
    };

    /* Details */

    category.textContent = donation.category;

    quantityBadge.textContent = `Available: ${formatQuantity(
      donation.availableQuantity,
      donation.unit,
    )}`;

    title.textContent = donation.title;

    provider.textContent = donation.provider;

    location.textContent = donation.location;

    pickupTime.textContent = formatPickupTime(
      donation.pickupStart,
      donation.pickupEnd,
    );

    availableAmount.textContent = formatQuantity(
      donation.availableQuantity,
      donation.unit,
    );

    /* Claim */

    claimButton.addEventListener("click", () => {
      openClaimModal(donation);
    });

    return fragment;
  }

  /* =========================================================
     FORMAT QUANTITY
  ========================================================= */

  function formatQuantity(quantity, unit) {
    const value = Number(quantity);

    const safeValue = Number.isFinite(value) ? value : 0;

    return `${safeValue} ${unit || "units"}`;
  }

  /* =========================================================
     FORMAT PICKUP TIME
  ========================================================= */

  function formatPickupTime(start, end) {
    if (!start && !end) {
      return "Pickup time not available";
    }

    const startDate = start ? new Date(start) : null;

    const endDate = end ? new Date(end) : null;

    if (startDate && Number.isNaN(startDate.getTime())) {
      return "Pickup time not available";
    }

    if (endDate && Number.isNaN(endDate.getTime())) {
      return formatDateTime(startDate);
    }

    if (startDate && endDate) {
      const sameDay = startDate.toDateString() === endDate.toDateString();

      if (sameDay) {
        return (
          `${formatDate(startDate)}, ` +
          `${formatTime(startDate)} - ` +
          `${formatTime(endDate)}`
        );
      }

      return `${formatDateTime(startDate)} - ` + `${formatDateTime(endDate)}`;
    }

    return formatDateTime(startDate);
  }

  function formatDateTime(date) {
    if (!date) {
      return "Not available";
    }

    return `${formatDate(date)}, ` + `${formatTime(date)}`;
  }

  function formatDate(date) {
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  }

  function formatTime(date) {
    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  /* =========================================================
     CLAIM MODAL
  ========================================================= */

  function openClaimModal(donation) {
    selectedDonation = donation;

    claimFoodImage.src = donation.image;

    claimFoodImage.alt = donation.title;

    claimFoodImage.onerror = () => {
      claimFoodImage.src = "/static/images/food-placeholder.jpg";
    };

    claimFoodCategory.textContent = donation.category;

    claimFoodName.textContent = donation.title;

    claimProvider.textContent = donation.provider;

    claimAvailableQuantity.textContent = donation.availableQuantity;

    claimUnit.textContent = donation.unit || "units";

    claimPickupTime.textContent = formatPickupTime(
      donation.pickupStart,
      donation.pickupEnd,
    );

    claimLocation.textContent = donation.location;

    claimQuantity.value = 1;

    claimQuantity.min = 1;

    claimQuantity.max = donation.availableQuantity;

    updateQuantityControls();

    quantityHelp.textContent = `You can claim up to ${
      donation.availableQuantity
    } ${donation.unit || "units"}.`;

    claimModal.classList.remove("hidden");

    document.body.style.overflow = "hidden";
  }

  /* =========================================================
     CLOSE CLAIM MODAL
  ========================================================= */

  function closeClaimModalWindow() {
    claimModal.classList.add("hidden");

    selectedDonation = null;

    document.body.style.overflow = "";
  }

  if (closeClaimModal) {
    closeClaimModal.addEventListener("click", closeClaimModalWindow);
  }

  if (cancelClaim) {
    cancelClaim.addEventListener("click", closeClaimModalWindow);
  }

  if (claimModal) {
    claimModal.addEventListener("click", (event) => {
      if (event.target === claimModal) {
        closeClaimModalWindow();
      }
    });
  }

  /* =========================================================
     QUANTITY CONTROLS
  ========================================================= */

  if (decreaseQuantity) {
    decreaseQuantity.addEventListener("click", () => {
      if (!selectedDonation) {
        return;
      }

      let value = Number(claimQuantity.value) || 1;

      value--;

      if (value < 1) {
        value = 1;
      }

      claimQuantity.value = value;

      updateQuantityControls();
    });
  }

  if (increaseQuantity) {
    increaseQuantity.addEventListener("click", () => {
      if (!selectedDonation) {
        return;
      }

      let value = Number(claimQuantity.value) || 1;

      value++;

      if (value > selectedDonation.availableQuantity) {
        value = selectedDonation.availableQuantity;
      }

      claimQuantity.value = value;

      updateQuantityControls();
    });
  }

  if (claimQuantity) {
    claimQuantity.addEventListener("input", () => {
      updateQuantityControls();
    });
  }

  function updateQuantityControls() {
    if (!selectedDonation) {
      return;
    }

    let value = Number(claimQuantity.value);

    if (!Number.isFinite(value)) {
      value = 1;
    }

    value = Math.floor(value);

    if (value < 1) {
      value = 1;
    }

    if (value > selectedDonation.availableQuantity) {
      value = selectedDonation.availableQuantity;
    }

    claimQuantity.value = value;

    decreaseQuantity.disabled = value <= 1;

    increaseQuantity.disabled = value >= selectedDonation.availableQuantity;
  }

  /* =========================================================
     CONFIRM CLAIM
  ========================================================= */

  if (confirmClaim) {
    confirmClaim.addEventListener("click", async () => {
      if (!selectedDonation) {
        return;
      }

      const quantity = Number(claimQuantity.value);

      if (!Number.isInteger(quantity) || quantity < 1) {
        showMessage("Please enter a valid quantity.", "error");

        claimQuantity.focus();

        return;
      }

      if (quantity > selectedDonation.availableQuantity) {
        showMessage(
          `You can claim a maximum of ${selectedDonation.availableQuantity} ${
            selectedDonation.unit || "units"
          }.`,
          "error",
        );

        claimQuantity.focus();

        return;
      }

      confirmClaim.disabled = true;

      confirmClaim.textContent = "Claiming...";

      try {
        const data = await apiRequest(
          `/api/donations/${selectedDonation.id}/claim`,
          {
            method: "POST",

            body: JSON.stringify({
              quantity: quantity,
            }),
          },
        );

        showMessage(
          data?.message || "Donation claimed successfully.",
          "success",
        );

        closeClaimModalWindow();

        await loadDonations();
      } catch (error) {
        console.error("Claim error:", error);

        showMessage(error.message || "Unable to claim this donation.", "error");
      } finally {
        confirmClaim.disabled = false;

        confirmClaim.textContent = "Claim Donation";
      }
    });
  }

  /* =========================================================
     SEARCH
  ========================================================= */

  if (foodSearch) {
    foodSearch.addEventListener("input", () => {
      applyAllFilters();
    });
  }

  /* =========================================================
     SORT
  ========================================================= */

  if (sortBy) {
    sortBy.addEventListener("change", () => {
      applyAllFilters();
    });
  }

  /* =========================================================
     FILTER BUTTON
  ========================================================= */

  if (applyFilters) {
    applyFilters.addEventListener("click", () => {
      applyAllFilters();
    });
  }

  /* =========================================================
     CHECKBOX FILTERS
  ========================================================= */

  document
    .querySelectorAll('input[name="category"], input[name="providerType"]')
    .forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        applyAllFilters();
      });
    });

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  if (clearFilters) {
    clearFilters.addEventListener("click", clearAllFilters);
  }

  if (emptyClearFilters) {
    emptyClearFilters.addEventListener("click", clearAllFilters);
  }

  function clearAllFilters() {
    if (foodSearch) {
      foodSearch.value = "";
    }

    if (locationFilter) {
      locationFilter.value = "";
    }

    if (pickupDateFilter) {
      pickupDateFilter.value = "";
    }

    if (sortBy) {
      sortBy.value = "newest";
    }

    document
      .querySelectorAll('input[name="category"], input[name="providerType"]')
      .forEach((checkbox) => {
        checkbox.checked = false;
      });

    applyAllFilters();
  }

  /* =========================================================
     GRID / LIST VIEW
  ========================================================= */

  if (gridViewBtn) {
    gridViewBtn.addEventListener("click", () => {
      donationsContainer.classList.remove("list-view");

      gridViewBtn.classList.add("active");

      if (listViewBtn) {
        listViewBtn.classList.remove("active");
      }
    });
  }

  if (listViewBtn) {
    listViewBtn.addEventListener("click", () => {
      donationsContainer.classList.add("list-view");

      listViewBtn.classList.add("active");

      if (gridViewBtn) {
        gridViewBtn.classList.remove("active");
      }
    });
  }

  /* =========================================================
     NGO PROFILE DROPDOWN
  ========================================================= */

  if (ngoProfileBtn && ngoProfileDropdown) {
    ngoProfileBtn.addEventListener("click", (event) => {
      event.stopPropagation();

      ngoProfileDropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", (event) => {
      if (
        !ngoProfileDropdown.contains(event.target) &&
        !ngoProfileBtn.contains(event.target)
      ) {
        ngoProfileDropdown.classList.add("hidden");
      }
    });
  }

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  if (notificationBtn && notificationPanel) {
    notificationBtn.addEventListener("click", (event) => {
      event.stopPropagation();

      notificationPanel.classList.toggle("hidden");

      /* Close profile dropdown */

      if (ngoProfileDropdown) {
        ngoProfileDropdown.classList.add("hidden");
      }
    });
  }

  if (closeNotificationPanel) {
    closeNotificationPanel.addEventListener("click", () => {
      notificationPanel.classList.add("hidden");
    });
  }

  document.addEventListener("click", (event) => {
    if (
      notificationPanel &&
      !notificationPanel.classList.contains("hidden") &&
      !notificationPanel.contains(event.target) &&
      notificationBtn &&
      !notificationBtn.contains(event.target)
    ) {
      notificationPanel.classList.add("hidden");
    }
  });

  /* =========================================================
     ESCAPE KEY
  ========================================================= */

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (claimModal && !claimModal.classList.contains("hidden")) {
        closeClaimModalWindow();
      }

      if (notificationPanel) {
        notificationPanel.classList.add("hidden");
      }

      if (ngoProfileDropdown) {
        ngoProfileDropdown.classList.add("hidden");
      }
    }
  });

  /* =========================================================
     LOADING
  ========================================================= */

  function showLoading() {
    loadingState.classList.remove("hidden");

    emptyState.classList.add("hidden");
  }

  function hideLoading() {
    loadingState.classList.add("hidden");
  }

  /* =========================================================
     TOAST MESSAGE
  ========================================================= */

  function showMessage(message, type = "info") {
    let toast = document.getElementById("ngoToast");

    if (!toast) {
      toast = document.createElement("div");

      toast.id = "ngoToast";

      toast.style.position = "fixed";

      toast.style.right = "25px";

      toast.style.bottom = "25px";

      toast.style.zIndex = "5000";

      toast.style.maxWidth = "360px";

      toast.style.padding = "13px 17px";

      toast.style.borderRadius = "9px";

      toast.style.fontSize = "12px";

      toast.style.fontWeight = "600";

      toast.style.boxShadow = "0 8px 25px rgba(0,0,0,0.12)";

      document.body.appendChild(toast);
    }

    toast.textContent = message;

    if (type === "success") {
      toast.style.background = "#eaf7ef";

      toast.style.color = "#237247";

      toast.style.border = "1px solid #c9e8d5";
    } else if (type === "error") {
      toast.style.background = "#fff1f1";

      toast.style.color = "#b83f3f";

      toast.style.border = "1px solid #f0cccc";
    } else {
      toast.style.background = "#f2f5f3";

      toast.style.color = "#53615a";

      toast.style.border = "1px solid #dfe5e2";
    }

    clearTimeout(toast.hideTimer);

    toast.hideTimer = setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  loadDonations();
});
