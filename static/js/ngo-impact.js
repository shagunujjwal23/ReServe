/* =========================================================
   ReServe - NGO Impact
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initImpactPage();
});

/* =========================================================
   GLOBAL STATE
   ========================================================= */

const state = {
  claims: [],

  completedClaims: [],

  collectedClaims: [],

  impact: {
    summary: {},

    trend: [],

    categories: [],

    sources: [],

    areas: [],
  },

  charts: {
    trend: null,

    source: null,
  },

  periods: {
    trend: 6,

    source: "month",

    areas: "month",

    progress: "month",
  },
};

/* =========================================================
   INITIALIZE
   ========================================================= */

async function initImpactPage() {
  initProfileDropdown();

  initNotifications();

  initPeriodControls();

  await loadImpactData();
}

/* =========================================================
   LOAD IMPACT DATA
   ========================================================= */

async function loadImpactData() {
  try {
    showImpactLoading();

    /* -------------------------------------------------------
       Load backend-calculated impact
       ------------------------------------------------------- */

    const impactResponse = await fetch("/api/ngo/impact", {
      method: "GET",

      credentials: "same-origin",

      headers: {
        Accept: "application/json",
      },
    });

    if (!impactResponse.ok) {
      throw new Error(`Unable to load impact data (${impactResponse.status})`);
    }

    const impactData = await impactResponse.json();

    if (!impactData.success) {
      throw new Error(impactData.message || "Unable to load impact data.");
    }

    /* -------------------------------------------------------
       Load claims separately
       Used for current claim statuses and period filtering.
       ------------------------------------------------------- */

    const claimsResponse = await fetch("/api/ngo/claims", {
      method: "GET",

      credentials: "same-origin",

      headers: {
        Accept: "application/json",
      },
    });

    if (!claimsResponse.ok) {
      throw new Error(`Unable to load claims (${claimsResponse.status})`);
    }

    const claimsData = await claimsResponse.json();

    state.claims = normalizeClaims(claimsData);

    /*
     * Completed claims = fully completed food collection.
     */
    state.completedClaims = state.claims.filter(
      (claim) => normalizeStatus(claim.status) === "completed",
    );

    /*
     * Collected claims = food that has actually been picked up.
     *
     * completed + picked_up
     *
     * This allows Areas Reached to show locations where
     * food was actually collected.
     */
    state.collectedClaims = state.claims.filter((claim) => {
      const status = normalizeStatus(claim.status);

      return status === "picked_up" || status === "completed";
    });

    /* -------------------------------------------------------
       Store backend impact data
       ------------------------------------------------------- */

    state.impact = {
      summary: impactData.summary || {},

      trend: Array.isArray(impactData.trend) ? impactData.trend : [],

      categories: Array.isArray(impactData.categories)
        ? impactData.categories
        : [],

      sources: Array.isArray(impactData.sources) ? impactData.sources : [],

      areas: Array.isArray(impactData.areas) ? impactData.areas : [],
    };

    renderImpact();
  } catch (error) {
    console.error("Impact data error:", error);

    state.claims = [];

    state.completedClaims = [];
    state.collectedClaims = [];

    state.impact = {
      summary: {},

      trend: [],

      categories: [],

      sources: [],

      areas: [],
    };

    renderEmptyImpact();

    showToast("Unable to load impact data right now.", "error");
  } finally {
    hideImpactLoading();
  }
}

/* =========================================================
   NORMALIZE CLAIMS
   ========================================================= */

function normalizeClaims(data) {
  let claims = [];

  if (Array.isArray(data)) {
    claims = data;
  } else if (Array.isArray(data.claims)) {
    claims = data.claims;
  } else if (Array.isArray(data.data)) {
    claims = data.data;
  } else if (data.data && Array.isArray(data.data.claims)) {
    claims = data.data.claims;
  }

  return claims.map(normalizeClaim);
}

function normalizeClaim(item) {
  const donation = item.donation || item.donation_data || item.listing || {};

  const provider =
    item.provider || item.provider_data || donation.provider || {};

  const location = item.location || donation.location || {};

  const quantity = firstValue(
    item.quantity,

    item.claimed_quantity,

    item.claim_quantity,

    item.amount,

    donation.quantity,
  );

  return {
    id: item.id || item._id || item.claim_id || "",

    donationId:
      item.donation_id || item.donationId || donation.id || donation._id || "",

    status: normalizeStatus(item.status || item.claim_status || "pending"),

    quantity: toNumber(quantity),

    unit:
      item.unit ||
      item.quantity_unit ||
      donation.unit ||
      donation.quantity_unit ||
      "unit",

    foodTitle:
      item.food_title ||
      item.foodTitle ||
      item.title ||
      donation.food_title ||
      donation.title ||
      "Food Donation",

    category:
      item.category ||
      item.food_category ||
      donation.category ||
      donation.food_category ||
      "Other",

    providerName:
      item.provider_name ||
      item.providerName ||
      item.business_name ||
      donation.provider_name ||
      donation.business_name ||
      provider.organization_name ||
      provider.business_name ||
      provider.name ||
      "Provider",

    providerType:
      item.provider_type ||
      item.providerType ||
      donation.provider_type ||
      donation.providerType ||
      provider.provider_type ||
      provider.business_type ||
      provider.type ||
      "Other",

    locationName: getLocationName(item, donation, location, provider),

    address:
      item.address ||
      donation.address ||
      donation.pickup_address ||
      location.address ||
      provider.address ||
      "",

    city: item.city || donation.city || location.city || provider.city || "",

    state:
      item.state || donation.state || location.state || provider.state || "",

    claimedAt: firstValue(
      item.claimed_at,

      item.claimedAt,

      item.created_at,

      item.createdAt,
    ),

    pickedUpAt: firstValue(
      item.picked_up_at,

      item.pickedUpAt,
    ),

    completedAt: firstValue(
      item.completed_at,

      item.completedAt,

      item.updated_at,

      item.updatedAt,
    ),

    beneficiaries: toNumber(
      firstValue(
        item.beneficiaries,

        item.people_served,

        item.peopleServed,

        item.beneficiary_count,
      ),
    ),

    pickupStart: firstValue(
      item.pickup_start,

      item.pickupStart,

      item.donation_pickup_start,

      donation.donation_pickup_start,
    ),

    pickupEnd: firstValue(
      item.pickup_end,

      item.pickupEnd,

      item.donation_pickup_end,

      donation.donation_pickup_end,
    ),

    latitude: firstValue(
      item.latitude,

      item.lat,

      donation.latitude,

      donation.lat,

      location.latitude,

      location.lat,
    ),

    longitude: firstValue(
      item.longitude,

      item.lng,

      item.lon,

      donation.longitude,

      donation.lng,

      donation.lon,

      location.longitude,

      location.lng,
    ),
  };
}

/* =========================================================
   NORMALIZE STATUS
   ========================================================= */

function normalizeStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (value === "pickedup") {
    return "picked_up";
  }

  return value;
}

/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderImpact() {
  renderSummaryCards();

  renderDistributionTrend();

  renderFoodSourceBreakdown();

  renderAreasReached();

  renderTopCategories();

  renderImpactJourney();

  renderDistributionProgress();
}

/* =========================================================
   SUMMARY CARDS
   ========================================================= */

function renderSummaryCards() {
  const summary = state.impact.summary || {};

  const foodCollected = toNumber(summary.food_collected);

  const peopleServed = toNumber(summary.people_served);

  const communities = toNumber(summary.communities_supported);

  const wastePrevented = toNumber(summary.food_waste_prevented);

  /* -------------------------------------------------------
     Food Collected
     ------------------------------------------------------- */

  setText(
    "foodCollectedValue",

    foodCollected > 0
      ? formatQuantityWithUnit(
          foodCollected,

          getDominantUnit(state.completedClaims),
        )
      : "—",
  );

  /* -------------------------------------------------------
     People Served
     ------------------------------------------------------- */

  setText(
    "peopleServedValue",

    peopleServed > 0 ? formatNumber(peopleServed) : "—",
  );

  /* -------------------------------------------------------
     Communities Supported
     ------------------------------------------------------- */

  setText(
    "communitiesSupportedValue",

    communities > 0 ? formatNumber(communities) : "—",
  );

  /* -------------------------------------------------------
     Food Waste Prevented
     ------------------------------------------------------- */

  setText(
    "wastePreventedValue",

    wastePrevented > 0
      ? formatQuantityWithUnit(
          wastePrevented,

          getDominantUnit(state.completedClaims),
        )
      : "—",
  );

  /*
   * No percentage changes are shown because
   * historical comparison data is not available.
   */

  hideElement("foodCollectedChange");

  hideElement("peopleServedChange");

  hideElement("communitiesSupportedChange");

  hideElement("wastePreventedChange");
}

/* =========================================================
   FOOD DISTRIBUTION TREND
   ========================================================= */

function renderDistributionTrend() {
  const canvas = document.getElementById("distributionTrendChart");

  if (!canvas) {
    return;
  }

  const months = getLastMonths(state.periods.trend);

  const values = months.map((month) => {
    return state.completedClaims

      .filter((claim) => {
        const date = getClaimImpactDate(claim);

        if (!date) {
          return false;
        }

        return (
          date.getFullYear() === month.year && date.getMonth() === month.month
        );
      })

      .reduce(
        (total, claim) => total + claim.quantity,

        0,
      );
  });

  const hasData = values.some((value) => value > 0);

  toggleChartEmpty("distributionTrendEmpty", !hasData);

  if (typeof Chart === "undefined") {
    console.warn("Chart.js is not loaded.");

    return;
  }

  if (state.charts.trend) {
    state.charts.trend.destroy();

    state.charts.trend = null;
  }

  state.charts.trend = new Chart(canvas, {
    type: "line",

    data: {
      labels: months.map((month) => month.label),

      datasets: [
        {
          label: "Food Collected",

          data: values,

          borderColor: "#159447",

          backgroundColor: "rgba(21, 148, 71, 0.12)",

          borderWidth: 2,

          fill: true,

          tension: 0.35,

          pointRadius: 4,

          pointHoverRadius: 6,

          pointBackgroundColor: "#159447",

          pointBorderColor: "#ffffff",

          pointBorderWidth: 2,
        },
      ],
    },

    options: {
      responsive: true,

      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false,
        },

        tooltip: {
          callbacks: {
            label: function (context) {
              return (
                " " +
                formatQuantityWithUnit(
                  context.parsed.y,

                  getDominantUnit(state.completedClaims),
                )
              );
            },
          },
        },
      },

      scales: {
        x: {
          grid: {
            color: "#edf1f4",
          },

          ticks: {
            color: "#52658b",

            font: {
              size: 10,
            },
          },
        },

        y: {
          beginAtZero: true,

          grid: {
            color: "#edf1f4",
          },

          ticks: {
            color: "#52658b",

            font: {
              size: 10,
            },

            callback: function (value) {
              return value;
            },
          },

          title: {
            display: true,

            text: "Food",

            color: "#52658b",

            font: {
              size: 10,
            },
          },
        },
      },
    },
  });
}

/* =========================================================
   FOOD SOURCE BREAKDOWN
   ========================================================= */

function renderFoodSourceBreakdown() {
  const canvas = document.getElementById("foodSourceChart");

  const legend = document.getElementById("sourceLegend");

  if (!canvas || !legend) {
    return;
  }

  /*
   * Source data is based on completed claims.
   *
   * For month/year filters we use the claims directly,
   * because the backend source breakdown is overall data.
   */

  const claims = getClaimsForPeriod(
    state.completedClaims,

    state.periods.source,
  );

  const grouped = {};

  claims.forEach((claim) => {
    /*
     * Use provider name as the actual source.
     */
    const source = cleanLabel(claim.providerName, "Other");

    grouped[source] = (grouped[source] || 0) + claim.quantity;
  });

  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  const total = entries.reduce(
    (sum, item) => sum + item[1],

    0,
  );

  setText(
    "sourceTotal",

    total > 0
      ? formatQuantityWithUnit(
          total,

          getDominantUnit(claims),
        )
      : "—",
  );

  legend.innerHTML = "";

  if (!entries.length || total <= 0) {
    legend.innerHTML = `
      <div class="source-empty">
        No source data available yet.
      </div>
    `;

    if (state.charts.source) {
      state.charts.source.destroy();

      state.charts.source = null;
    }

    return;
  }

  entries.forEach(([name, value], index) => {
    const percentage = Math.round((value / total) * 100);

    const item = document.createElement("div");

    item.className = "source-legend-item";

    item.innerHTML = `
        <span
          class="source-legend-dot"
          style="background:${getChartColor(index)}"
        ></span>

        <span class="source-legend-name">
          ${escapeHTML(name)}
        </span>

        <span class="source-legend-value">
          ${percentage}%
        </span>
      `;

    legend.appendChild(item);
  });

  if (typeof Chart === "undefined") {
    return;
  }

  if (state.charts.source) {
    state.charts.source.destroy();

    state.charts.source = null;
  }

  state.charts.source = new Chart(canvas, {
    type: "doughnut",

    data: {
      labels: entries.map((item) => item[0]),

      datasets: [
        {
          data: entries.map((item) => item[1]),

          backgroundColor: entries.map((_, index) => getChartColor(index)),

          borderWidth: 2,

          borderColor: "#ffffff",
        },
      ],
    },

    options: {
      responsive: true,

      maintainAspectRatio: false,

      cutout: "58%",

      plugins: {
        legend: {
          display: false,
        },

        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.parsed || 0;

              const percentage =
                total > 0 ? Math.round((value / total) * 100) : 0;

              return ` ${context.label}: ` + `${percentage}%`;
            },
          },
        },
      },
    },
  });
}

/* =========================================================
   AREA NAME HELPER
   ========================================================= */

function getAreaName(claim) {
  if (!claim) {
    return "";
  }

  /*
   * Best case:
   * Backend already provides an area/location name.
   */
  if (claim.locationName) {
    let value = String(claim.locationName).trim();

    /*
     * If it looks like a full address such as:
     *
     * 12, Gomti Nagar, Lucknow, Uttar Pradesh
     *
     * remove the house number and city/state.
     */
    const parts = value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      /*
       * Remove leading house/building number.
       */
      if (/^\d+[A-Za-z\-\/]*/.test(parts[0])) {
        parts.shift();
      }

      /*
       * Remove common city/state/country parts.
       */
      const ignored = ["lucknow", "uttar pradesh", "india"];

      const filtered = parts.filter((part) => {
        const lower = part.toLowerCase();

        return !ignored.includes(lower) && !/^\d{6}$/.test(lower);
      });

      if (filtered.length) {
        return filtered[0];
      }
    }

    /*
     * If it was already a simple area name,
     * return it unchanged.
     */
    return value;
  }

  /*
   * Fallback to explicit city/area fields.
   */
  if (claim.city) {
    return String(claim.city).trim();
  }

  if (claim.address) {
    return String(claim.address).trim();
  }

  return "";
}

/* =========================================================
   AREAS REACHED
   ========================================================= */

function renderAreasReached() {
  /*
   * Use food that has actually been collected.
   *
   * picked_up + completed
   */
  const claims = getClaimsForPeriod(state.collectedClaims, state.periods.areas);

  const grouped = {};

  claims.forEach((claim) => {
    const area = getAreaName(claim);

    if (!area) {
      return;
    }

    grouped[area] = (grouped[area] || 0) + 1;
  });

  /*
   * Most frequently reached areas first.
   */
  const entries = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const list = document.getElementById("topAreasList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  /*
   * No data.
   */
  if (!entries.length) {
    list.innerHTML = `
      <div class="area-empty">
        No distribution areas yet.
      </div>
    `;

    renderMapPlaceholder();
    return;
  }

  /*
   * ---------------------------------------------------------
   * TOP AREAS
   * ---------------------------------------------------------
   *
   * Only display the area name.
   */

  entries.forEach(([name], index) => {
    const row = document.createElement("div");

    row.className = "area-row";

    row.innerHTML = `
      <span class="area-rank">
        ${index + 1}
      </span>

      <span
        class="area-name"
        title="${escapeHTML(name)}"
      >
        ${escapeHTML(name)}
      </span>
    `;

    list.appendChild(row);
  });

  /*
   * ---------------------------------------------------------
   * MAP
   * ---------------------------------------------------------
   */

  renderImpactMap(claims);
}

/* =========================================================
   IMPACT MAP
   ========================================================= */

function renderImpactMap(claims) {
  const map = document.getElementById("impactMap");

  if (!map) {
    return;
  }

  /*
   * Find the most common area.
   */
  const locationCounts = {};

  claims.forEach((claim) => {
    const area = getAreaName(claim);

    if (!area) {
      return;
    }

    locationCounts[area] = (locationCounts[area] || 0) + 1;
  });

  const locations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  if (!locations.length) {
    renderMapPlaceholder();
    return;
  }

  const mainArea = locations[0];

  /*
   * Find a claim belonging to the main area.
   */
  const mainClaim = claims.find((claim) => getAreaName(claim) === mainArea);

  let searchLocation = mainArea;

  /*
   * ---------------------------------------------------------
   * USE LATITUDE / LONGITUDE WHEN AVAILABLE
   * ---------------------------------------------------------
   */

  if (
    mainClaim &&
    Number.isFinite(Number(mainClaim.latitude)) &&
    Number.isFinite(Number(mainClaim.longitude))
  ) {
    searchLocation = `${Number(mainClaim.latitude)},${Number(mainClaim.longitude)}`;
  } else if (mainClaim) {
    /*
     * Otherwise search using area + city + state.
     */
    const parts = [];

    if (mainArea) {
      parts.push(mainArea);
    }

    if (mainClaim.city) {
      parts.push(mainClaim.city);
    }

    if (mainClaim.state) {
      parts.push(mainClaim.state);
    }

    if (parts.length) {
      searchLocation = parts.join(", ");
    }
  }

  /*
   * IMPORTANT:
   * This is a normal URL.
   *
   * Do NOT use [ ] or ( ).
   */
  const mapUrl =
    "https://www.google.com/maps?q=" +
    encodeURIComponent(searchLocation) +
    "&output=embed";

  map.innerHTML = `
    <iframe
      src="${mapUrl}"
      width="100%"
      height="100%"
      style="
        border: 0;
        width: 100%;
        height: 100%;
        display: block;
        border-radius: 14px;
      "
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      title="Food Distribution Area Map"
    ></iframe>
  `;
}

/* =========================================================
   TOP FOOD CATEGORIES
   ========================================================= */

function renderTopCategories() {
  const list = document.getElementById("topCategoriesList");

  if (!list) {
    return;
  }

  /*
   * Use completed claims so category totals
   * represent successfully rescued food.
   */

  const grouped = {};

  state.completedClaims.forEach((claim) => {
    const category = normalizeCategory(claim.category);

    grouped[category] = (grouped[category] || 0) + claim.quantity;
  });

  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  list.innerHTML = "";

  if (!entries.length) {
    list.innerHTML = `
      <div class="category-empty">
        No category data available yet.
      </div>
    `;

    return;
  }

  const total = entries.reduce(
    (sum, item) => sum + item[1],

    0,
  );

  entries.slice(0, 6).forEach(([category, value]) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

    const row = document.createElement("div");

    row.className = "category-row";

    row.innerHTML = `
          <div class="category-icon">
            <i class="${getCategoryIcon(category)}"></i>
          </div>

          <span class="category-name">
            ${escapeHTML(category)}
          </span>

          <div class="category-bar">
            <span
              style="width:${percentage}%"
            ></span>
          </div>

          <span class="category-percent">
            ${percentage}%
          </span>
        `;

    list.appendChild(row);
  });
}

/* =========================================================
   IMPACT JOURNEY
   ========================================================= */

function renderImpactJourney() {
  /*
   * IMPORTANT:
   *
   * completed = actually completed
   * picked_up = pickup happened but not completed
   * confirmed = claim confirmed, waiting for pickup
   * pending = waiting for confirmation
   *
   * We do NOT count picked_up + completed as
   * "completed pickups".
   */

  const completed = state.claims.filter(
    (claim) => normalizeStatus(claim.status) === "completed",
  ).length;

  const pickedUp = state.claims.filter(
    (claim) => normalizeStatus(claim.status) === "picked_up",
  ).length;

  const confirmed = state.claims.filter(
    (claim) => normalizeStatus(claim.status) === "confirmed",
  ).length;

  const pending = state.claims.filter(
    (claim) => normalizeStatus(claim.status) === "pending",
  ).length;

  const totalClaims = completed + pickedUp + confirmed + pending;

  const steps = document.querySelectorAll(".journey-step");

  if (steps.length < 5) {
    return;
  }

  /* -------------------------------------------------------
     STEP 1 — FOOD DONATED
     ------------------------------------------------------- */

  updateJourneyStep(
    steps[0],

    totalClaims > 0,

    "Food Donated",

    totalClaims > 0
      ? `${totalClaims} claim${totalClaims !== 1 ? "s" : ""} received`
      : "Waiting for donations",
  );

  /* -------------------------------------------------------
     STEP 2 — COLLECTED
     ------------------------------------------------------- */

  const collected = pickedUp + completed;

  updateJourneyStep(
    steps[1],

    collected > 0,

    "Collected",

    collected > 0
      ? `${completed} completed${
          pickedUp > 0 ? `, ${pickedUp} in progress` : ""
        }`
      : "No pickups completed yet",
  );

  /* -------------------------------------------------------
     STEP 3 — DISTRIBUTED
     ------------------------------------------------------- */

  updateJourneyStep(
    steps[2],

    completed > 0,

    "Distributed",

    completed > 0
      ? `${completed} completed claim${completed !== 1 ? "s" : ""}`
      : "No completed distribution yet",
  );

  /* -------------------------------------------------------
     STEP 4 — COMMUNITIES SUPPORTED
     ------------------------------------------------------- */

  const communities = toNumber(state.impact.summary?.communities_supported);

  updateJourneyStep(
    steps[3],

    communities > 0,

    "Communities Supported",

    communities > 0
      ? `${communities} area${communities !== 1 ? "s" : ""} reached`
      : "No communities reached yet",
  );

  /* -------------------------------------------------------
     STEP 5 — WASTE REDUCED
     ------------------------------------------------------- */

  const waste = toNumber(state.impact.summary?.food_waste_prevented);

  updateJourneyStep(
    steps[4],

    waste > 0,

    "Waste Reduced",

    waste > 0
      ? `${formatQuantityWithUnit(
          waste,

          getDominantUnit(state.completedClaims),
        )} rescued`
      : "No rescued food yet",
  );
}

function updateJourneyStep(step, active, title, description) {
  if (!step) {
    return;
  }

  step.classList.toggle("journey-complete", active);

  const strong = step.querySelector("strong");

  const span = step.querySelector("span");

  if (strong) {
    strong.textContent = title;
  }

  if (span) {
    span.textContent = description;
  }
}

/* =========================================================
   DISTRIBUTION PROGRESS
   ========================================================= */

function renderDistributionProgress() {
  const claims = getClaimsForPeriod(
    state.completedClaims,

    state.periods.progress,
  );

  const totalQuantity = sumQuantity(claims);

  const locations = getUniqueLocations(claims).length;

  /*
   * People served comes from backend impact summary.
   */
  const beneficiaries = toNumber(state.impact.summary?.people_served);

  updateProgress(
    "ngoDistributionPercent",

    "ngoDistributionBar",

    "ngoDistributionValue",

    totalQuantity > 0 ? 100 : 0,

    totalQuantity > 0
      ? formatQuantityWithUnit(
          totalQuantity,

          getDominantUnit(claims),
        )
      : "—",
  );

  updateProgress(
    "locationProgressPercent",

    "locationProgressBar",

    "locationProgressValue",

    locations > 0 ? 100 : 0,

    locations > 0 ? `${locations} location${locations !== 1 ? "s" : ""}` : "—",
  );

  updateProgress(
    "beneficiaryProgressPercent",

    "beneficiaryProgressBar",

    "beneficiaryProgressValue",

    beneficiaries > 0 ? 100 : 0,

    beneficiaries > 0 ? formatNumber(beneficiaries) : "—",
  );
}

function updateProgress(percentId, barId, valueId, percent, value) {
  setText(
    percentId,

    percent > 0 ? `${percent}%` : "—",
  );

  const bar = document.getElementById(barId);

  if (bar) {
    bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  setText(valueId, value);
}

/* =========================================================
   PERIOD CONTROLS
   ========================================================= */

function initPeriodControls() {
  const trend = document.getElementById("trendPeriod");

  if (trend) {
    trend.addEventListener("change", () => {
      state.periods.trend = Number(trend.value) || 6;

      renderDistributionTrend();
    });
  }

  const source = document.getElementById("sourcePeriod");

  if (source) {
    source.addEventListener("change", () => {
      state.periods.source = source.value;

      renderFoodSourceBreakdown();
    });
  }

  const areas = document.getElementById("areasPeriod");

  if (areas) {
    areas.addEventListener("change", () => {
      state.periods.areas = areas.value;

      renderAreasReached();
    });
  }

  const progress = document.getElementById("progressPeriod");

  if (progress) {
    progress.addEventListener("change", () => {
      state.periods.progress = progress.value;

      renderDistributionProgress();
    });
  }
}

/* =========================================================
   PERIOD FILTER
   ========================================================= */

function getClaimsForPeriod(claims, period) {
  if (period === "all") {
    return claims;
  }

  const now = new Date();

  let start;

  if (period === "month") {
    start = new Date(
      now.getFullYear(),

      now.getMonth(),

      1,
    );
  } else if (period === "year") {
    start = new Date(
      now.getFullYear(),

      0,

      1,
    );
  } else {
    return claims;
  }

  return claims.filter((claim) => {
    const date = getClaimImpactDate(claim);

    return date && date >= start;
  });
}

/* =========================================================
   MONTH HELPERS
   ========================================================= */

function getLastMonths(count) {
  const result = [];

  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(
      now.getFullYear(),

      now.getMonth() - i,

      1,
    );

    result.push({
      year: date.getFullYear(),

      month: date.getMonth(),

      label: date.toLocaleDateString("en-US", {
        month: "short",
      }),
    });
  }

  return result;
}

function getClaimImpactDate(claim) {
  /*
   * For actual impact, completedAt
   * should be preferred.
   */

  const value = claim.completedAt || claim.pickedUpAt || claim.claimedAt;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/* =========================================================
   DATA HELPERS
   ========================================================= */

function sumQuantity(claims) {
  return claims.reduce(
    (total, claim) =>
      total + (Number.isFinite(claim.quantity) ? claim.quantity : 0),

    0,
  );
}

function sumBeneficiaries(claims) {
  return claims.reduce(
    (total, claim) =>
      total + (Number.isFinite(claim.beneficiaries) ? claim.beneficiaries : 0),

    0,
  );
}

function getUniqueLocations(claims) {
  const locations = claims

    .map((claim) =>
      cleanLabel(
        claim.locationName || claim.city || claim.address,

        "",
      ).toLowerCase(),
    )

    .filter(Boolean);

  return [...new Set(locations)];
}

function getDominantUnit(claims) {
  if (!claims.length) {
    return "unit";
  }

  const counts = {};

  claims.forEach((claim) => {
    const unit = cleanLabel(claim.unit, "unit").toLowerCase();

    counts[unit] = (counts[unit] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/* =========================================================
   CATEGORY HELPERS
   ========================================================= */

function normalizeCategory(category) {
  const value = String(category || "")
    .trim()
    .toLowerCase();

  if (value.includes("meal") || value.includes("prepared")) {
    return "Meals";
  }

  if (
    value.includes("bakery") ||
    value.includes("bread") ||
    value.includes("cake")
  ) {
    return "Bakery";
  }

  if (
    value.includes("fruit") ||
    value.includes("vegetable") ||
    value.includes("produce")
  ) {
    return "Fruits & Vegetables";
  }

  if (value.includes("snack")) {
    return "Snacks";
  }

  if (value.includes("dairy") || value.includes("milk")) {
    return "Dairy";
  }

  if (value.includes("beverage") || value.includes("drink")) {
    return "Beverages";
  }

  if (!value) {
    return "Other";
  }

  return capitalizeWords(category);
}

function getCategoryIcon(category) {
  const value = String(category || "").toLowerCase();

  if (value.includes("meal")) {
    return "ri-bowl-line";
  }

  if (value.includes("bakery")) {
    return "ri-cake-3-line";
  }

  if (value.includes("fruit") || value.includes("vegetable")) {
    return "ri-plant-line";
  }

  if (value.includes("snack")) {
    return "ri-restaurant-2-line";
  }

  if (value.includes("dairy")) {
    return "ri-cup-line";
  }

  if (value.includes("beverage")) {
    return "ri-goblet-line";
  }

  return "ri-restaurant-line";
}

/* =========================================================
   SOURCE COLORS
   ========================================================= */

function getChartColor(index) {
  const colors = [
    "#42c98f",

    "#ffc83d",

    "#55a9ee",

    "#ff8088",

    "#9a6ee8",

    "#69b77d",

    "#e99d55",

    "#6d83d9",
  ];

  return colors[index % colors.length];
}

/* =========================================================
   LOCATION
   ========================================================= */

function getLocationName(item, donation, location, provider) {
  return (
    item.location_name ||
    item.locationName ||
    item.area ||
    donation.location_name ||
    donation.locationName ||
    donation.area ||
    location.name ||
    location.area ||
    provider.area ||
    item.city ||
    donation.city ||
    location.city ||
    provider.city ||
    donation.pickup_address ||
    item.address ||
    donation.address ||
    ""
  );
}

/* =========================================================
   UI HELPERS
   ========================================================= */

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function hideElement(id) {
  const element = document.getElementById(id);

  if (element) {
    element.style.display = "none";
  }
}

function toggleChartEmpty(id, show) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.classList.toggle("show", show);
}

function showImpactLoading() {
  document.body.classList.add("impact-loading");
}

function hideImpactLoading() {
  document.body.classList.remove("impact-loading");
}

/* =========================================================
   EMPTY STATE
   ========================================================= */

function renderEmptyImpact() {
  setText("foodCollectedValue", "—");

  setText("peopleServedValue", "—");

  setText("communitiesSupportedValue", "—");

  setText("wastePreventedValue", "—");

  /* -------------------------------------------------------
     Destroy existing charts
     ------------------------------------------------------- */

  if (state.charts.trend) {
    state.charts.trend.destroy();

    state.charts.trend = null;
  }

  if (state.charts.source) {
    state.charts.source.destroy();

    state.charts.source = null;
  }

  toggleChartEmpty("distributionTrendEmpty", true);

  /* -------------------------------------------------------
     Categories
     ------------------------------------------------------- */

  const categoryList = document.getElementById("topCategoriesList");

  if (categoryList) {
    categoryList.innerHTML = `
      <div class="category-empty">
        No completed claims yet.
      </div>
    `;
  }

  /* -------------------------------------------------------
     Areas
     ------------------------------------------------------- */

  const areaList = document.getElementById("topAreasList");

  if (areaList) {
    areaList.innerHTML = `
      <div class="area-empty">
        No distribution areas yet.
      </div>
    `;
  }

  /* -------------------------------------------------------
     Sources
     ------------------------------------------------------- */

  const sourceLegend = document.getElementById("sourceLegend");

  if (sourceLegend) {
    sourceLegend.innerHTML = `
      <div class="source-empty">
        No food source data yet.
      </div>
    `;
  }

  setText("sourceTotal", "—");

  /* -------------------------------------------------------
     Progress
     ------------------------------------------------------- */

  updateProgress(
    "ngoDistributionPercent",

    "ngoDistributionBar",

    "ngoDistributionValue",

    0,

    "—",
  );

  updateProgress(
    "locationProgressPercent",

    "locationProgressBar",

    "locationProgressValue",

    0,

    "—",
  );

  updateProgress(
    "beneficiaryProgressPercent",

    "beneficiaryProgressBar",

    "beneficiaryProgressValue",

    0,

    "—",
  );

  renderMapPlaceholder();
}

/* =========================================================
   PROFILE DROPDOWN
   ========================================================= */

function initProfileDropdown() {
  const button = document.getElementById("ngoProfileBtn");

  const dropdown = document.getElementById("ngoProfileDropdown");

  if (!button || !dropdown) {
    return;
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();

    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function initNotifications() {
  const button = document.getElementById("notificationBtn");

  const panel = document.getElementById("notificationPanel");

  const closeButton = document.getElementById("closeNotificationPanel");

  if (!button || !panel) {
    return;
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();

    panel.classList.toggle("hidden");
  });

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      panel.classList.add("hidden");
    });
  }

  document.addEventListener("click", (event) => {
    if (!panel.contains(event.target) && !button.contains(event.target)) {
      panel.classList.add("hidden");
    }
  });
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "success") {
  let container = document.getElementById("impactToastContainer");

  if (!container) {
    container = document.createElement("div");

    container.id = "impactToastContainer";

    container.style.position = "fixed";

    container.style.right = "20px";

    container.style.bottom = "20px";

    container.style.zIndex = "2000";

    container.style.display = "flex";

    container.style.flexDirection = "column";

    container.style.gap = "10px";

    document.body.appendChild(container);
  }

  const toast = document.createElement("div");

  toast.textContent = message;

  toast.style.padding = "12px 16px";

  toast.style.borderRadius = "9px";

  toast.style.background = type === "error" ? "#fff0f2" : "#eaf8ef";

  toast.style.color = type === "error" ? "#c6283d" : "#08783a";

  toast.style.border =
    type === "error" ? "1px solid #ffd5db" : "1px solid #ccebd8";

  toast.style.fontSize = "12px";

  toast.style.fontWeight = "600";

  toast.style.boxShadow = "0 8px 24px rgba(0,0,0,.08)";

  container.appendChild(toast);

  setTimeout(
    () => {
      toast.remove();
    },

    3500,
  );
}

/* =========================================================
   FORMATTERS
   ========================================================= */

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatQuantityWithUnit(quantity, unit) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "—";
  }

  const cleanUnit = String(unit || "unit")
    .trim()
    .toLowerCase();

  if (
    cleanUnit === "kg" ||
    cleanUnit === "kgs" ||
    cleanUnit === "kilogram" ||
    cleanUnit === "kilograms"
  ) {
    return `${formatNumber(quantity)} kg`;
  }

  return `${formatNumber(quantity)} ${cleanUnit}`;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return null;
}

function cleanLabel(value, fallback = "Other") {
  const result = String(value || "").trim();

  return result || fallback;
}

function capitalizeWords(value) {
  return String(value || "").replace(
    /\w\S*/g,

    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
