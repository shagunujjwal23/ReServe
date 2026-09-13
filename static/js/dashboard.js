/* ==========================================================
   ReServe PROVIDER DASHBOARD
========================================================== */

/* ==========================================================
   REAL IMPACT / DONATION ANALYTICS
========================================================== */

let impactChart = null;

let realImpactData = {
  today: {
    labels: [],
    values: [],
    total: 0,
  },

  week: {
    labels: [],
    values: [],
    total: 0,
  },

  month: {
    labels: [],
    values: [],
    total: 0,
  },

  year: {
    labels: [],
    values: [],
    total: 0,
  },
};

let foodDistributionData = [];
let dashboardDonationUnit = "units";

/* ==========================================================
   LOAD REAL DONATION DATA
========================================================== */

async function loadRealImpactData() {
  try {
    const response = await fetch("/api/provider/donation-claims", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load donation analytics.");
    }

    const claims = Array.isArray(data.claims) ? data.claims : [];

    /*
       ONLY COMPLETED CLAIMS COUNT AS ACTUAL
       FOOD RESCUED / DONATED.
    */

    const completedClaims = claims.filter((claim) => {
      return String(claim.status || "").toLowerCase() === "completed";
    });

    /*
       -------------------------------------------------------
       FOOD DISTRIBUTION
       -------------------------------------------------------
    */

    const categoryTotals = {};

    completedClaims.forEach((claim) => {
      const category =
        String(claim.category || claim.donation?.category || "Others").trim() ||
        "Others";

      const quantity = Number(claim.quantity) || 0;

      categoryTotals[category] = (categoryTotals[category] || 0) + quantity;
    });

    foodDistributionData = Object.entries(categoryTotals)
      .map(([category, quantity]) => ({
        category,
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity);

    /*
       -------------------------------------------------------
       UNIT
       -------------------------------------------------------
    */

    const units = completedClaims
      .map((claim) => {
        return String(claim.unit || claim.donation?.unit || "").trim();
      })
      .filter(Boolean);

    if (units.length > 0) {
      const unitCounts = {};

      units.forEach((unit) => {
        unitCounts[unit] = (unitCounts[unit] || 0) + 1;
      });

      dashboardDonationUnit = Object.entries(unitCounts).sort(
        (a, b) => b[1] - a[1],
      )[0][0];
    } else {
      dashboardDonationUnit = "units";
    }

    /*
       -------------------------------------------------------
       BUILD TREND DATA
       -------------------------------------------------------
    */

    buildImpactTrendData(completedClaims);

    /*
       -------------------------------------------------------
       UPDATE DONATION TREND
       -------------------------------------------------------
    */

    updateImpactChart("month");

    /*
       -------------------------------------------------------
       UPDATE FOOD DISTRIBUTION DONUT
       -------------------------------------------------------
    */

    updateFoodDistributionChart();
  } catch (error) {
    console.error("Real impact data error:", error);

    /*
       Keep dashboard usable even when there
       is no donation data.
    */

    realImpactData = {
      today: {
        labels: [],
        values: [],
        total: 0,
      },

      week: {
        labels: [],
        values: [],
        total: 0,
      },

      month: {
        labels: [],
        values: [],
        total: 0,
      },

      year: {
        labels: [],
        values: [],
        total: 0,
      },
    };

    foodDistributionData = [];

    dashboardDonationUnit = "units";

    updateImpactChart("month");
    updateFoodDistributionChart();
  }
}

/* ==========================================================
   BUILD TREND DATA
========================================================== */

function buildImpactTrendData(completedClaims) {
  const now = new Date();

  /*
     --------------------------------------------------------
     TODAY
     --------------------------------------------------------
  */

  const todayLabels = [
    "8 AM",
    "10 AM",
    "12 PM",
    "2 PM",
    "4 PM",
    "6 PM",
    "8 PM",
  ];

  const todayValues = [0, 0, 0, 0, 0, 0, 0];

  completedClaims.forEach((claim) => {
    const date = getClaimCompletedDate(claim);

    if (!date) {
      return;
    }

    if (!isSameDay(date, now)) {
      return;
    }

    const hour = date.getHours();
    const quantity = Number(claim.quantity) || 0;

    let index = -1;

    if (hour >= 8 && hour < 10) {
      index = 0;
    } else if (hour >= 10 && hour < 12) {
      index = 1;
    } else if (hour >= 12 && hour < 14) {
      index = 2;
    } else if (hour >= 14 && hour < 16) {
      index = 3;
    } else if (hour >= 16 && hour < 18) {
      index = 4;
    } else if (hour >= 18 && hour < 20) {
      index = 5;
    } else if (hour >= 20) {
      index = 6;
    }

    if (index !== -1) {
      todayValues[index] += quantity;
    }
  });

  realImpactData.today = {
    labels: todayLabels,
    values: todayValues,
    total: todayValues.reduce((sum, value) => sum + value, 0),
  };

  /*
     --------------------------------------------------------
     THIS WEEK
     --------------------------------------------------------
  */

  const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const weekValues = [0, 0, 0, 0, 0, 0, 0];

  const startOfWeek = new Date(now);

  const day = startOfWeek.getDay();

  const mondayOffset = day === 0 ? -6 : 1 - day;

  startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);

  startOfWeek.setHours(0, 0, 0, 0);

  completedClaims.forEach((claim) => {
    const date = getClaimCompletedDate(claim);

    if (!date) {
      return;
    }

    if (date < startOfWeek || date > now) {
      return;
    }

    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;

    weekValues[dayIndex] += Number(claim.quantity) || 0;
  });

  realImpactData.week = {
    labels: weekLabels,
    values: weekValues,
    total: weekValues.reduce((sum, value) => sum + value, 0),
  };

  /*
     --------------------------------------------------------
     LAST 6 MONTHS
     --------------------------------------------------------
  */

  const monthLabels = [];
  const monthValues = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

    monthLabels.push(
      date.toLocaleString("en-IN", {
        month: "short",
      }),
    );

    monthValues.push(0);
  }

  completedClaims.forEach((claim) => {
    const date = getClaimCompletedDate(claim);

    if (!date) {
      return;
    }

    const difference =
      (now.getFullYear() - date.getFullYear()) * 12 +
      (now.getMonth() - date.getMonth());

    if (difference >= 0 && difference <= 5) {
      const index = 5 - difference;

      monthValues[index] += Number(claim.quantity) || 0;
    }
  });

  realImpactData.month = {
    labels: monthLabels,
    values: monthValues,
    total: monthValues.reduce((sum, value) => sum + value, 0),
  };

  /*
     --------------------------------------------------------
     THIS YEAR
     --------------------------------------------------------
  */

  const yearLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const yearValues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  completedClaims.forEach((claim) => {
    const date = getClaimCompletedDate(claim);

    if (!date) {
      return;
    }

    if (date.getFullYear() !== now.getFullYear()) {
      return;
    }

    yearValues[date.getMonth()] += Number(claim.quantity) || 0;
  });

  realImpactData.year = {
    labels: yearLabels,
    values: yearValues,
    total: yearValues.reduce((sum, value) => sum + value, 0),
  };
}

/* ==========================================================
   GET COMPLETED DATE
========================================================== */

function getClaimCompletedDate(claim) {
  const value =
    claim.completed_at || claim.completedAt || claim.donation?.completed_at;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/* ==========================================================
   SAME DAY
========================================================== */

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/* ==========================================================
   DONATION TREND CHART
========================================================== */

function initializeImpactChart() {
  const impactCanvas = document.getElementById("impactChart");

  if (!impactCanvas || typeof Chart === "undefined") {
    return;
  }

  const ctx = impactCanvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, 250);

  gradient.addColorStop(0, "rgba(34, 197, 94, 0.30)");

  gradient.addColorStop(0.5, "rgba(34, 197, 94, 0.10)");

  gradient.addColorStop(1, "rgba(34, 197, 94, 0)");

  impactChart = new Chart(ctx, {
    type: "line",

    data: {
      labels: [],

      datasets: [
        {
          label: "Food Donated",

          data: [],

          borderColor: "#22C55E",

          backgroundColor: gradient,

          fill: true,

          tension: 0.42,

          borderWidth: 3,

          pointRadius: 3,

          pointHoverRadius: 6,

          pointBackgroundColor: "#ffffff",

          pointBorderColor: "#22C55E",

          pointBorderWidth: 2,
        },
      ],
    },

    options: {
      responsive: true,

      maintainAspectRatio: false,

      interaction: {
        intersect: false,
        mode: "index",
      },

      plugins: {
        legend: {
          display: false,
        },

        tooltip: {
          displayColors: false,

          callbacks: {
            label: function (context) {
              return `${context.parsed.y.toLocaleString()} ${dashboardDonationUnit}`;
            },
          },
        },
      },

      scales: {
        x: {
          grid: {
            display: false,
          },

          ticks: {
            color: "#71809d",

            font: {
              size: 10,
            },
          },
        },

        y: {
          beginAtZero: true,

          grid: {
            color: "rgba(0, 0, 0, .06)",
          },

          ticks: {
            color: "#71809d",

            font: {
              size: 10,
            },
          },
        },
      },
    },
  });
}

/* ==========================================================
   UPDATE DONATION TREND
========================================================== */

function updateImpactChart(period) {
  if (!impactChart) {
    return;
  }

  const selected = realImpactData[period];

  if (!selected) {
    return;
  }

  impactChart.data.labels = selected.labels;

  impactChart.data.datasets[0].data = selected.values;

  impactChart.update();

  const donationTotal = document.getElementById("donationTotal");

  if (donationTotal) {
    donationTotal.textContent = `${selected.total.toLocaleString()} ${dashboardDonationUnit}`;
  }
}
/* ==========================================================
   CUSTOM TIME FILTER
========================================================== */

function initializeImpactFilter() {
  const filterToggle = document.getElementById("filterToggle");

  const filterDropdown = document.getElementById("filterDropdown");

  const selectedFilter = document.getElementById("selectedFilter");

  const filterOptions = document.querySelectorAll(".filter-option");

  if (!filterToggle || !filterDropdown || !selectedFilter) {
    return;
  }

  /* --------------------------------------------------------
     OPEN / CLOSE
  -------------------------------------------------------- */

  filterToggle.addEventListener("click", (event) => {
    event.stopPropagation();

    filterDropdown.classList.toggle("show");

    filterToggle.classList.toggle("open");
  });

  /* --------------------------------------------------------
     FILTER OPTIONS
  -------------------------------------------------------- */

  filterOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();

      const value = option.dataset.value;

      if (!realImpactData[value]) {
        return;
      }

      filterOptions.forEach((button) => {
        button.classList.remove("active");
      });

      option.classList.add("active");

      selectedFilter.textContent = option.textContent.trim();

      updateImpactChart(value);

      filterDropdown.classList.remove("show");

      filterToggle.classList.remove("open");
    });
  });

  /* --------------------------------------------------------
     CLOSE OUTSIDE
  -------------------------------------------------------- */

  document.addEventListener("click", () => {
    filterDropdown.classList.remove("show");

    filterToggle.classList.remove("open");
  });
}

/* ==========================================================
   FOOD CATEGORY DISTRIBUTION DONUT
========================================================== */

let foodDistributionChart = null;

/* ==========================================================
   DONUT COLORS
========================================================== */

const categoryColors = [
  "#3B82F6", // Blue
  "#F59E0B", // Orange
  "#8B5CF6", // Purple
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#F97316", // Deep Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#84CC16", // Lime
];

/* ==========================================================
   INITIALIZE FOOD CATEGORY DONUT
========================================================== */

function initializeFoodDistributionChart() {
  const canvas = document.getElementById("categoryChart");

  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  const ctx = canvas.getContext("2d");

  foodDistributionChart = new Chart(ctx, {
    type: "doughnut",

    data: {
      labels: [],

      datasets: [
        {
          data: [],

          backgroundColor: categoryColors,

          borderWidth: 0,

          hoverOffset: 6,
        },
      ],
    },

    options: {
      responsive: true,

      maintainAspectRatio: false,

      cutout: "68%",

      plugins: {
        legend: {
          display: false,
        },

        tooltip: {
          displayColors: true,

          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce(
                (sum, value) => sum + Number(value || 0),
                0,
              );

              const value = Number(context.parsed || 0);

              const percentage =
                total > 0 ? ((value / total) * 100).toFixed(1) : 0;

              return `${context.label}: ${value.toLocaleString()} ${dashboardDonationUnit} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

/* ==========================================================
   UPDATE FOOD CATEGORY DISTRIBUTION
========================================================== */

function updateFoodDistributionChart() {
  if (!foodDistributionChart) {
    return;
  }

  /* --------------------------------------------------------
     REAL CATEGORY DATA
  -------------------------------------------------------- */

  const labels = foodDistributionData.map((item) => item.category);

  const values = foodDistributionData.map((item) => Number(item.quantity) || 0);

  /* --------------------------------------------------------
     UPDATE DONUT
  -------------------------------------------------------- */

  foodDistributionChart.data.labels = labels;

  foodDistributionChart.data.datasets[0].data = values;

  foodDistributionChart.data.datasets[0].backgroundColor = values.map(
    (_, index) => categoryColors[index % categoryColors.length],
  );

  foodDistributionChart.update();

  /* --------------------------------------------------------
     TOTAL
  -------------------------------------------------------- */

  const total = values.reduce((sum, value) => sum + value, 0);

  /* --------------------------------------------------------
     UPDATE DONUT CENTER
  -------------------------------------------------------- */

  const centerValue = document.getElementById("categoryTotalValue");

  const centerUnit = document.getElementById("categoryTotalUnit");

  if (centerValue) {
    centerValue.textContent = total.toLocaleString();
  }

  if (centerUnit) {
    centerUnit.textContent = total > 0 ? dashboardDonationUnit : "Food Donated";
  }

  /* --------------------------------------------------------
     DYNAMIC LEGEND
  -------------------------------------------------------- */

  const legend = document.getElementById("categoryLegend");

  if (!legend) {
    return;
  }

  /* --------------------------------------------------------
     NO DATA
  -------------------------------------------------------- */

  if (foodDistributionData.length === 0 || total === 0) {
    legend.innerHTML = `
      <div class="category-empty">

        <i class="ri-pie-chart-line"></i>

        <strong>
          No completed donations yet
        </strong>

        <span>
          Category distribution will appear here.
        </span>

      </div>
    `;

    return;
  }

  /* --------------------------------------------------------
     CLEAR OLD LEGEND
  -------------------------------------------------------- */

  legend.innerHTML = "";

  /* --------------------------------------------------------
     CREATE REAL LEGEND
  -------------------------------------------------------- */

  foodDistributionData.forEach((item, index) => {
    const quantity = Number(item.quantity) || 0;

    const percentage = total > 0 ? ((quantity / total) * 100).toFixed(0) : 0;

    const color = categoryColors[index % categoryColors.length];

    const legendItem = document.createElement("div");

    legendItem.className = "category-legend-item";

    legendItem.innerHTML = `

        <span
          class="legend-dot"
          style="background-color: ${color};"
        ></span>

        <div>

          <strong
            title="${escapeHtml(item.category)}"
          >
            ${escapeHtml(item.category)}
          </strong>

          <span>
            ${percentage}%
          </span>

        </div>

      `;

    legend.appendChild(legendItem);
  });
}

/* ==========================================================
   UPDATE FOOD CATEGORY DISTRIBUTION
========================================================== */

function updateFoodDistributionChart() {
  if (!foodDistributionChart) {
    return;
  }

  const labels = foodDistributionData.map((item) => item.category);

  const values = foodDistributionData.map((item) => item.quantity);

  foodDistributionChart.data.labels = labels;

  foodDistributionChart.data.datasets[0].data = values;

  foodDistributionChart.update();

  /*
     --------------------------------------------------------
     UPDATE DONUT CENTER
     --------------------------------------------------------
  */

  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);

  const centerValue = document.getElementById("categoryTotalValue");

  const centerUnit = document.getElementById("categoryTotalUnit");

  if (centerValue) {
    centerValue.textContent = total.toLocaleString();
  }

  if (centerUnit) {
    centerUnit.textContent = total > 0 ? dashboardDonationUnit : "Food Donated";
  }

  /*
     --------------------------------------------------------
     UPDATE LEGEND
     --------------------------------------------------------
  */

  const legend = document.getElementById("categoryLegend");

  if (!legend) {
    return;
  }

  if (foodDistributionData.length === 0) {
    legend.innerHTML = `
      <div class="category-empty">
        <i class="ri-pie-chart-line"></i>

        <strong>
          No completed donations yet
        </strong>

        <span>
          Category distribution will appear here.
        </span>
      </div>
    `;

    return;
  }

  legend.innerHTML = "";

  const totalQuantity = values.reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );

  foodDistributionData.forEach((item, index) => {
    const percentage =
      totalQuantity > 0
        ? ((item.quantity / totalQuantity) * 100).toFixed(0)
        : 0;

    const legendItem = document.createElement("div");

    legendItem.className = "category-legend-item";

    legendItem.innerHTML = `
      <span
        class="legend-dot"
        style="background:${foodDistributionChart.data.datasets[0].backgroundColor[index % foodDistributionChart.data.datasets[0].backgroundColor.length]}"
      ></span>

      <div>
        <strong title="${escapeHtml(item.category)}">
          ${escapeHtml(item.category)}
        </strong>

        <span>
          ${percentage}%
        </span>
      </div>
    `;

    legend.appendChild(legendItem);
  });
}

/* ==========================================================
   PROFILE DROPDOWN
========================================================== */

function setupProfileDropdown() {
  const profileMenuBtn = document.getElementById("profileMenuBtn");

  const profileDropdown = document.getElementById("profileDropdown");

  const profileWrapper = document.querySelector(".profile-wrapper");

  if (!profileMenuBtn || !profileDropdown || !profileWrapper) {
    return;
  }

  /* --------------------------------------------------------
     TOGGLE
  -------------------------------------------------------- */

  profileMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    const isHidden = profileDropdown.classList.contains("hidden");

    if (isHidden) {
      profileDropdown.classList.remove("hidden");

      profileWrapper.classList.add("active");
    } else {
      profileDropdown.classList.add("hidden");

      profileWrapper.classList.remove("active");
    }
  });

  /* --------------------------------------------------------
     PREVENT CLOSE INSIDE
  -------------------------------------------------------- */

  profileDropdown.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  /* --------------------------------------------------------
     OUTSIDE CLICK
  -------------------------------------------------------- */

  document.addEventListener("click", () => {
    profileDropdown.classList.add("hidden");

    profileWrapper.classList.remove("active");
  });

  /* --------------------------------------------------------
     ESCAPE
  -------------------------------------------------------- */

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      profileDropdown.classList.add("hidden");

      profileWrapper.classList.remove("active");
    }
  });
}

/* ==========================================================
   HEADER PROFILE IMAGE
========================================================== */

async function loadHeaderProfileImage() {
  const profileImage = document.getElementById("headerProfileImage");

  if (!profileImage) {
    return;
  }

  try {
    const response = await fetch("/api/provider/profile", {
      credentials: "include",

      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    const profile = data.profile;

    if (!response.ok || data.success === false || !profile) {
      return;
    }

    const images = Array.isArray(profile.profile_images)
      ? profile.profile_images
      : profile.profile_image
        ? [profile.profile_image]
        : [];

    const imageUrl = images.find(
      (image) => typeof image === "string" && image.trim(),
    );

    if (imageUrl) {
      profileImage.src = imageUrl;
    }
  } catch (error) {
    console.error("Dashboard profile image error:", error);
  }
}

/* ==========================================================
   ACTIVE LISTINGS
========================================================== */

async function loadActiveListings() {
  const container = document.getElementById("activeListingsContainer");

  if (!container) {
    return;
  }

  /* --------------------------------------------------------
     LOADING
  -------------------------------------------------------- */

  container.innerHTML = `
    <div class="loading-state">
      Loading your listings...
    </div>
  `;

  try {
    const response = await fetch("/api/listings/my", {
      method: "GET",

      credentials: "include",

      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load listings");
    }

    const listings = Array.isArray(data.listings) ? data.listings : [];

    /* ------------------------------------------------------
       ONLY ACTIVE LISTINGS
    ------------------------------------------------------ */

    const activeListings = listings
      .filter((listing) => {
        const status = String(listing.status || "").toLowerCase();

        return status === "available" || status === "active";
      })
      .slice(0, 3);

    /* ------------------------------------------------------
       EMPTY
    ------------------------------------------------------ */

    if (activeListings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="ri-restaurant-line"></i>

          <h4>
            No active listings
          </h4>

          <p>
            Add a food listing to get started.
          </p>
        </div>
      `;

      return;
    }

    /* ------------------------------------------------------
       RENDER
    ------------------------------------------------------ */

    container.innerHTML = "";

    activeListings.forEach((listing) => {
      const image = listing.image || "/static/images/food-placeholder.jpg";

      const foodTitle = listing.food_title || "Food Item";

      const quantity = listing.quantity ?? listing.original_quantity ?? 0;

      const unit = listing.unit || "";

      const listingType = String(listing.listing_type || "sell").toLowerCase();

      const typeText = listingType === "donate" ? "Donation" : "For Sale";

      const pickupEnd = listing.pickup_end || listing.expiry_date || null;

      const availableUntil = formatListingDate(pickupEnd);

      const category = listing.category || "Food";

      const card = document.createElement("div");

      card.className = "listing-item";

      card.innerHTML = `
          <img
            class="listing-image"
            src="${escapeHtml(image)}"
            alt="${escapeHtml(foodTitle)}"
            loading="lazy"
          />

          <div class="listing-info">

            <h4>
              ${escapeHtml(foodTitle)}
            </h4>

            <p>
              ${escapeHtml(category)}
              ·
              ${escapeHtml(`${quantity} ${unit}`.trim())}
              ·
              ${escapeHtml(typeText)}
            </p>

          </div>

          <div class="listing-meta">

            <span class="listing-status">
              Available
            </span>

            <button
              type="button"
              class="listing-menu"
              title="View listing"
              data-listing-id="${escapeHtml(listing.id || listing._id || "")}"
            >
              <i class="ri-arrow-right-s-line"></i>
            </button>

          </div>
        `;

      const menu = card.querySelector(".listing-menu");

      if (menu) {
        menu.addEventListener("click", () => {
          const listingId = menu.dataset.listingId;

          if (listingId) {
            window.location.href = `/listing/${listingId}`;
          }
        });
      }

      container.appendChild(card);
    });
  } catch (error) {
    console.error("Active Listings Error:", error);

    container.innerHTML = `
      <div class="empty-state">
        <i class="ri-error-warning-line"></i>

        <h4>
          Unable to load listings
        </h4>

        <p>
          Please try again later.
        </p>
      </div>
    `;
  }
}

/* ==========================================================
   INCOMING REQUESTS
========================================================== */

/*
   IMPORTANT:

   The Provider Requests page already uses:

       GET /api/requests

   We use the same endpoint here.

   NGO donation claims use:

       GET /api/provider/donation-claims

   Both are combined on the dashboard.
*/

async function loadIncomingRequests() {
  const container = document.getElementById("incomingRequestsContainer");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      Loading requests...
    </div>
  `;

  try {
    const [userRequestsResponse, ngoClaimsResponse] = await Promise.all([
      fetch("/api/requests", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      }),

      fetch("/api/provider/donation-claims", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      }),
    ]);

    const userData = await userRequestsResponse.json().catch(() => ({}));

    const ngoData = await ngoClaimsResponse.json().catch(() => ({}));

    /* ------------------------------------------------------
       USER REQUESTS
    ------------------------------------------------------ */

    const userRequests = Array.isArray(userData.requests)
      ? userData.requests
      : [];

    const pendingUsers = userRequests.filter(
      (request) => String(request.status || "").toLowerCase() === "pending",
    );

    /* ------------------------------------------------------
       NGO CLAIMS
    ------------------------------------------------------ */

    const ngoClaims = Array.isArray(ngoData.claims) ? ngoData.claims : [];

    const pendingNgoClaims = ngoClaims.filter(
      (claim) => String(claim.status || "").toLowerCase() === "pending",
    );

    /* ------------------------------------------------------
       NORMALIZE
    ------------------------------------------------------ */

    const requests = [
      ...pendingUsers.map((request) => ({
        sourceType: "user",

        id: request.id || request._id,

        name: request.requester_name || request.user_name || "User",

        food: request.food_name || request.food_title || "Food Item",

        quantity: request.quantity || 0,

        unit: request.unit || "",

        distance: request.distance,

        pickup: request.pickup_time,

        original: request,
      })),

      ...pendingNgoClaims.map((claim) => ({
        sourceType: "ngo",

        id: claim.id || claim._id,

        name: claim.ngo_name || "NGO",

        food: claim.food_title || "Food Item",

        quantity: claim.quantity || 0,

        unit: claim.unit || "",

        distance: claim.distance,

        pickup: claim.pickup_start || claim.pickup_time,

        original: claim,
      })),
    ].slice(0, 3);

    /* ------------------------------------------------------
       EMPTY
    ------------------------------------------------------ */

    if (requests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="ri-checkbox-circle-line"></i>

          <h4>
            No requests need your attention
          </h4>

          <p>
            You're all caught up.
          </p>
        </div>
      `;

      return;
    }

    /* ------------------------------------------------------
       RENDER
    ------------------------------------------------------ */

    container.innerHTML = "";

    requests.forEach((request) => {
      const avatarClass = request.sourceType === "ngo" ? "ngo" : "user";

      const avatarIcon =
        request.sourceType === "ngo" ? "ri-group-line" : "ri-user-3-line";

      const requesterType = request.sourceType === "ngo" ? "NGO" : "User";

      const distance =
        request.distance !== undefined &&
        request.distance !== null &&
        request.distance !== ""
          ? `${request.distance} km away`
          : "Distance unavailable";

      const pickup = request.pickup
        ? formatListingDate(request.pickup)
        : "Pickup time not set";

      const item = document.createElement("div");

      item.className = "request-item";

      item.innerHTML = `
          <div
            class="request-avatar ${avatarClass}"
          >
            <i class="${avatarIcon}"></i>
          </div>

          <div class="request-info">

            <h4>
              ${escapeHtml(request.name)}

              <span class="requester-type">
                (${requesterType})
              </span>
            </h4>

            <p>
              ${escapeHtml(request.food)}
              ·
              ${escapeHtml(`${request.quantity} ${request.unit}`.trim())}
            </p>

            <small>
              <i class="ri-map-pin-line"></i>
              ${escapeHtml(distance)}
              ·
              ${escapeHtml(pickup)}
            </small>

          </div>

          <div class="request-actions">

            <button
              type="button"
              class="outline-action-btn"
              data-request-action="view"
            >
              View
            </button>

            <button
              type="button"
              class="accept-action-btn"
              data-request-action="accept"
            >
              Accept
            </button>

          </div>
        `;

      const viewButton = item.querySelector('[data-request-action="view"]');

      const acceptButton = item.querySelector('[data-request-action="accept"]');

      if (viewButton) {
        viewButton.addEventListener("click", () => {
          if (request.sourceType === "user") {
            window.location.href = `/requests`;
          } else {
            window.location.href = `/requests`;
          }
        });
      }

      if (acceptButton) {
        acceptButton.addEventListener("click", async () => {
          await handleDashboardRequestAction(request, acceptButton);
        });
      }

      container.appendChild(item);
    });
  } catch (error) {
    console.error("Incoming Requests Error:", error);

    container.innerHTML = `
      <div class="empty-state">
        <i class="ri-error-warning-line"></i>

        <h4>
          Unable to load requests
        </h4>

        <p>
          Please open Requests to try again.
        </p>
      </div>
    `;
  }
}

/* ==========================================================
   ACCEPT REQUEST FROM DASHBOARD
========================================================== */

async function handleDashboardRequestAction(request, button) {
  if (!request.id) {
    return;
  }

  button.disabled = true;

  const originalText = button.textContent;

  button.textContent = "Processing...";

  try {
    let endpoint;

    if (request.sourceType === "ngo") {
      endpoint = `/api/provider/donation-claims/${request.id}/approve`;
    } else {
      endpoint = `/api/requests/${request.id}/accept`;
    }

    const response = await fetch(endpoint, {
      method: "POST",

      credentials: "include",

      headers: {
        Accept: "application/json",

        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Unable to accept request.");
    }

    /* Refresh dashboard */

    await loadIncomingRequests();

    await loadRecentActivity();
  } catch (error) {
    console.error("Request action error:", error);

    alert(error.message || "Unable to accept request.");

    button.disabled = false;

    button.textContent = originalText;
  }
}

/* ==========================================================
   UPCOMING PICKUPS
========================================================== */

/*
   The current dashboard.js did not have a pickup API.

   Therefore this function safely attempts common existing
   endpoints and uses the first successful response.

   If your backend uses a different pickup endpoint,
   we can connect it when you send that route.
*/

async function loadUpcomingPickups() {
  const container = document.getElementById("upcomingPickupsContainer");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      Loading pickups...
    </div>
  `;

  try {
    const response = await fetch("/api/provider/pickups", {
      method: "GET",

      credentials: "include",

      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="ri-calendar-line"></i>

          <h4>
            No upcoming pickups
          </h4>

          <p>
            Your scheduled pickups will appear here.
          </p>
        </div>
      `;

      return;
    }

    const data = await response.json();

    const pickups = Array.isArray(data.pickups) ? data.pickups : [];

    const upcoming = pickups
      .filter((pickup) => {
        const status = String(pickup.status || "").toLowerCase();

        return (
          status === "scheduled" ||
          status === "confirmed" ||
          status === "accepted"
        );
      })
      .slice(0, 3);

    if (upcoming.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="ri-calendar-line"></i>

          <h4>
            No upcoming pickups
          </h4>

          <p>
            Your scheduled pickups will appear here.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML = "";

    upcoming.forEach((pickup) => {
      const date =
        pickup.pickup_time || pickup.scheduled_at || pickup.pickup_start;

      const dateObject = date ? new Date(date) : null;

      const day =
        dateObject && !isNaN(dateObject.getTime())
          ? dateObject.getDate().toString()
          : "--";

      const month =
        dateObject && !isNaN(dateObject.getTime())
          ? dateObject.toLocaleString("en-IN", {
              month: "short",
            })
          : "---";

      const time =
        dateObject && !isNaN(dateObject.getTime())
          ? dateObject.toLocaleTimeString("en-IN", {
              hour: "numeric",
              minute: "2-digit",
            })
          : "Time not set";

      const food = pickup.food_title || pickup.food_name || "Food Item";

      const requester =
        pickup.ngo_name || pickup.requester_name || "Pickup Partner";

      const quantity = pickup.quantity || 0;

      const unit = pickup.unit || "";

      const item = document.createElement("div");

      item.className = "pickup-item";

      item.innerHTML = `
          <div class="pickup-date">
            <strong>
              ${escapeHtml(day)}
            </strong>

            <span>
              ${escapeHtml(month)}
            </span>
          </div>

          <div class="pickup-timeline">
            <span class="timeline-dot"></span>
          </div>

          <div class="pickup-info">

            <div class="pickup-top-row">

              <h4>
                ${escapeHtml(food)}
              </h4>

              <span class="pickup-time">
                ${escapeHtml(time)}
              </span>

            </div>

            <p>
              ${escapeHtml(requester)}
            </p>

            <span>
              ${escapeHtml(`${quantity} ${unit}`.trim())}
            </span>

          </div>

          <span class="pickup-status">
            Scheduled
          </span>
        `;

      container.appendChild(item);
    });
  } catch (error) {
    console.error("Upcoming Pickups Error:", error);

    container.innerHTML = `
      <div class="empty-state">
        <i class="ri-calendar-line"></i>

        <h4>
          No upcoming pickups
        </h4>

        <p>
          Your scheduled pickups will appear here.
        </p>
      </div>
    `;
  }
}

/* ==========================================================
   RECENT ACTIVITY
========================================================== */

async function loadRecentActivity() {
  const container = document.getElementById("recentActivityContainer");

  if (!container) {
    return;
  }

  /*
     We use the existing requests API to create
     useful recent activity without requiring
     a new backend route.
  */

  try {
    const response = await fetch("/api/requests", {
      method: "GET",

      credentials: "include",

      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Unable to load activity.");
    }

    const data = await response.json();

    const requests = Array.isArray(data.requests) ? data.requests : [];

    const recent = [...requests]
      .sort(
        (a, b) =>
          new Date(b.created_at || b.requested_at || 0) -
          new Date(a.created_at || a.requested_at || 0),
      )
      .slice(0, 4);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="ri-time-line"></i>

          <h4>
            No recent activity
          </h4>

          <p>
            Recent listing and request updates will appear here.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML = "";

    recent.forEach((request) => {
      const status = String(request.status || "").toLowerCase();

      const requester = request.requester_name || request.user_name || "User";

      const food = request.food_name || request.food_title || "Food Item";

      let title = "New request received";

      let description = `${requester} requested ${food}`;

      let icon = "ri-file-list-3-line";

      let iconClass = "request";

      if (status === "accepted") {
        title = "Request accepted";

        description = `${requester} · ${food}`;

        icon = "ri-checkbox-circle-line";

        iconClass = "ngo";
      } else if (status === "rejected") {
        title = "Request rejected";

        description = `${requester} · ${food}`;

        icon = "ri-close-circle-line";

        iconClass = "request";
      }

      const time = formatRelativeTime(
        request.created_at || request.requested_at,
      );

      const item = document.createElement("div");

      item.className = "activity-item";

      item.innerHTML = `
          <div
            class="activity-icon ${iconClass}"
          >
            <i class="${icon}"></i>
          </div>

          <div class="activity-content">

            <h4>
              ${escapeHtml(title)}
            </h4>

            <p>
              ${escapeHtml(description)}
            </p>

          </div>

          <span class="activity-time">
            ${escapeHtml(time)}
          </span>

          <i class="ri-arrow-right-s-line activity-arrow"></i>
        `;

      container.appendChild(item);
    });
  } catch (error) {
    console.error("Recent Activity Error:", error);

    container.innerHTML = `
      <div class="empty-state">
        <i class="ri-time-line"></i>

        <h4>
          No recent activity
        </h4>

        <p>
          Your latest updates will appear here.
        </p>
      </div>
    `;
  }
}

/* ==========================================================
   HTML ESCAPE
========================================================== */

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================
   DATE FORMAT
========================================================== */

function formatListingDate(dateString) {
  if (!dateString) {
    return "Not Available";
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return "Not Available";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ==========================================================
   RELATIVE TIME
========================================================== */

function formatRelativeTime(dateString) {
  if (!dateString) {
    return "Recently";
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return "Recently";
  }

  const now = new Date();

  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/* ==========================================================
   INITIALIZE DASHBOARD
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  /* Profile */

  setupProfileDropdown();

  loadHeaderProfileImage();

  /* Chart */

  initializeImpactChart();

  initializeFoodDistributionChart();

  initializeImpactFilter();

  await loadRealImpactData();

  /* Dashboard data */

  await Promise.allSettled([
    loadActiveListings(),
    loadIncomingRequests(),
    loadUpcomingPickups(),
    loadRecentActivity(),
  ]);
});
