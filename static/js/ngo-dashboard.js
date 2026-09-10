document.addEventListener("DOMContentLoaded", async () => {
  /* =========================================================
     API HELPER
  ========================================================= */

  const get = async (url) => {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
  };

  /* =========================================================
     HELPERS
  ========================================================= */

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

  const setText = (id, value) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  };

  const numberValue = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  /* =========================================================
     DATE HELPERS
  ========================================================= */

  const parseDate = (value) => {
    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (value) => {
    const date = parseDate(value);

    if (!date) {
      return "—";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatShortDate = (value) => {
    const date = parseDate(value);

    if (!date) {
      return {
        day: "—",
        month: "",
      };
    }

    return {
      day: date.toLocaleDateString("en-IN", {
        day: "2-digit",
      }),

      month: date.toLocaleDateString("en-IN", {
        month: "short",
      }),
    };
  };

  const formatTime = (value) => {
    const date = parseDate(value);

    if (!date) {
      return "—";
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatPickupDateTime = (start, end) => {
    const startDate = parseDate(start);
    const endDate = parseDate(end);

    if (!startDate && !endDate) {
      return {
        date: "—",
        time: "—",
      };
    }

    const date = startDate || endDate;

    let time = formatTime(start || end);

    if (startDate && endDate) {
      time = `${formatTime(start)}` + ` – ` + `${formatTime(end)}`;
    }

    return {
      date: formatDate(date),
      time,
    };
  };

  /* =========================================================
     QUANTITY HELPER
  ========================================================= */

  const getClaimedQuantity = (donation) => {
    return numberValue(
      donation.claimed_quantity ??
        donation.quantity ??
        donation.surplus_quantity ??
        0,
    );
  };

  const getAvailableQuantity = (donation) => {
    return numberValue(
      donation.available_quantity ??
        donation.remaining_quantity ??
        donation.surplus_quantity ??
        0,
    );
  };

  /* =========================================================
     STATUS LABEL
  ========================================================= */

  const statusLabel = (status) => {
    const labels = {
      available: "Available",
      claimed: "Confirmed",
      picked_up: "Picked Up",
      completed: "Completed",
      expired: "Expired",
      pending: "Pending",
    };

    return labels[status] || status || "Unknown";
  };

  /* =========================================================
     RECENT FOOD CLAIM ROW
  ========================================================= */

  const recentClaimRow = (donation) => {
    const pickup = formatPickupDateTime(
      donation.donation_pickup_start,
      donation.donation_pickup_end,
    );

    const quantity = getClaimedQuantity(donation);

    return `
      <tr>

        <td>
          <div class="claim-food-name">

            <img
              class="claim-food-image"
              src="${esc(
                donation.image || "/static/images/food-placeholder.jpg",
              )}"
              alt="${esc(donation.food_title || "Food donation")}"
            />

            <strong>
              ${esc(donation.food_title || "Food donation")}
            </strong>

          </div>
        </td>


        <td>
          <span class="claim-provider">
            ${esc(donation.provider_name || "Provider")}
          </span>
        </td>


        <td>
          <span class="claim-quantity">
            ${esc(quantity)}
            ${esc(donation.unit || "units")}
          </span>
        </td>


        <td>
          <div class="claim-pickup">

            <span class="claim-pickup-date">
              ${esc(pickup.date)}
            </span>

            <span class="claim-pickup-time">
              ${esc(pickup.time)}
            </span>

          </div>
        </td>


        <td>
          <span
            class="claim-status ${esc(donation.status || "")}"
          >
            ${esc(statusLabel(donation.status))}
          </span>
        </td>


        <td>

          <a
            href="/ngo-claims"
            class="claim-view-btn"
          >
            View
          </a>

        </td>

      </tr>
    `;
  };

  /* =========================================================
     UPCOMING PICKUP
  ========================================================= */

  const upcomingPickup = (donation, index) => {
    const pickup = formatPickupDateTime(
      donation.donation_pickup_start,
      donation.donation_pickup_end,
    );

    const shortDate = formatShortDate(
      donation.donation_pickup_start || donation.donation_pickup_end,
    );

    const quantity = getClaimedQuantity(donation);

    return `
      <div class="pickup-item">

        <!-- Date -->

        <div class="pickup-date">

          <strong>
            ${esc(shortDate.day)}
          </strong>

          <span>
            ${esc(shortDate.month)}
          </span>

        </div>


        <!-- Timeline -->

        <div class="pickup-dot-wrapper">

          <div class="pickup-dot"></div>

        </div>


        <!-- Information -->

        <div class="pickup-info">

          <div class="pickup-food">

            ${esc(donation.food_title || "Food donation")}

            (${esc(quantity)}
            ${esc(donation.unit || "units")})

          </div>

          <div class="pickup-provider">

            ${esc(donation.provider_name || "Provider")}

          </div>

          <div class="pickup-time">

            ${esc(pickup.time)}

          </div>

        </div>


        <!-- Action -->

        <a
          href="/ngo-claims"
          class="pickup-view-btn"
        >
          View Details
        </a>

      </div>
    `;
  };

  /* =========================================================
     FOOD COLLECTION TREND
  ========================================================= */

  const buildCollectionTrend = (donations) => {
    const container = document.getElementById("foodCollectionChart");

    if (!container) {
      return;
    }

    /*
     * Only completed donations are treated
     * as rescued food.
     */

    const completed = donations.filter(
      (donation) => donation.status === "completed",
    );

    if (!completed.length) {
      container.innerHTML = `
        <div class="chart-placeholder">

          <i class="ri-bar-chart-line"></i>

          <span>
            No completed food collections yet.
          </span>

        </div>
      `;

      return;
    }

    /*
     * Group completed food by week of the
     * current month.
     */

    const now = new Date();

    const year = now.getFullYear();
    const month = now.getMonth();

    const weeks = [
      {
        label: "1–7",
        start: 1,
        end: 7,
        value: 0,
      },
      {
        label: "8–14",
        start: 8,
        end: 14,
        value: 0,
      },
      {
        label: "15–21",
        start: 15,
        end: 21,
        value: 0,
      },
      {
        label: "22–28",
        start: 22,
        end: 28,
        value: 0,
      },
      {
        label: "29–31",
        start: 29,
        end: 31,
        value: 0,
      },
    ];

    completed.forEach((donation) => {
      const completedDate = parseDate(
        donation.completed_at ||
          donation.picked_up_at ||
          donation.claimed_at ||
          donation.updated_at,
      );

      if (!completedDate) {
        return;
      }

      if (
        completedDate.getFullYear() !== year ||
        completedDate.getMonth() !== month
      ) {
        return;
      }

      const day = completedDate.getDate();

      const week = weeks.find((item) => day >= item.start && day <= item.end);

      if (week) {
        week.value += getClaimedQuantity(donation);
      }
    });

    const maxValue = Math.max(...weeks.map((week) => week.value), 1);

    const yValues = [
      Math.ceil(maxValue),
      Math.ceil(maxValue * 0.75),
      Math.ceil(maxValue * 0.5),
      Math.ceil(maxValue * 0.25),
      0,
    ];

    container.innerHTML = `

      <div class="chart-bars">

        <div class="chart-y-axis">

          ${yValues.map((value) => `<span>${esc(value)}</span>`).join("")}

        </div>


        ${weeks
          .map((week) => {
            const height =
              week.value === 0 ? 0 : Math.max((week.value / maxValue) * 100, 5);

            return `
              <div class="chart-bar-group">

                <div
                  class="chart-bar"
                  style="height:${height}%"
                  title="${esc(week.value)} units"
                ></div>

                <span class="chart-bar-label">
                  ${esc(week.label)}
                </span>

              </div>
            `;
          })
          .join("")}

      </div>
    `;
  };

  /* =========================================================
     CATEGORY DISTRIBUTION
  ========================================================= */

  const buildCategoryDistribution = (donations) => {
    const chart = document.getElementById("categoryDonutChart");

    const legend = document.getElementById("categoryLegend");

    const totalElement = document.getElementById("totalFoodCollected");

    if (!chart || !legend) {
      return;
    }

    /*
     * Category distribution is based on
     * completed/rescued donations.
     */

    const completed = donations.filter(
      (donation) => donation.status === "completed",
    );

    const categories = {};

    completed.forEach((donation) => {
      const category = donation.category || "Other";

      const quantity = getClaimedQuantity(donation);

      categories[category] = (categories[category] || 0) + quantity;
    });

    const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    const total = entries.reduce((sum, [, value]) => sum + value, 0);

    if (totalElement) {
      totalElement.textContent = total;
    }

    if (!entries.length || total <= 0) {
      chart.style.background = "#e8eeea";

      legend.innerHTML = `
        <div class="legend-loading">
          No category data yet.
        </div>
      `;

      return;
    }

    /*
     * Keep the visual chart simple and
     * support any number of categories.
     */

    const chartSegments = [];

    let currentDegree = 0;

    entries.forEach(([category, value], index) => {
      const percentage = (value / total) * 100;

      const degree = (percentage / 100) * 360;

      const nextDegree = currentDegree + degree;

      const segmentColors = [
        "#11863b",
        "#78bb8b",
        "#54c491",
        "#f7bb36",
        "#d8dde2",
      ];

      const color = segmentColors[index % segmentColors.length];

      chartSegments.push(`${color} ${currentDegree}deg ${nextDegree}deg`);

      currentDegree = nextDegree;
    });

    chart.style.background = `conic-gradient(${chartSegments.join(", ")})`;

    legend.innerHTML = entries
      .slice(0, 5)
      .map(([category, value], index) => {
        const percentage = Math.round((value / total) * 100);

        const segmentColors = [
          "#11863b",
          "#78bb8b",
          "#54c491",
          "#f7bb36",
          "#d8dde2",
        ];

        const color = segmentColors[index % segmentColors.length];

        return `
              <div class="category-item">

                <span
                  class="category-dot"
                  style="background:${color}"
                ></span>

                <span class="category-name">
                  ${esc(category)}
                </span>

                <span class="category-percentage">
                  ${esc(percentage)}%
                </span>

              </div>
            `;
      })
      .join("");
  };

  /* =========================================================
     LOAD DASHBOARD
  ========================================================= */

  const loadDashboard = async () => {
    try {
      const dashboardData = await get("/api/ngo/dashboard");

      const data = dashboardData.dashboard || {};

      const donations = Array.isArray(data.my_donations)
        ? data.my_donations
        : [];

      const recentDonations = [...donations].sort((a, b) => {
        const dateA = parseDate(a.claimed_at || a.created_at || a.updated_at);

        const dateB = parseDate(b.claimed_at || b.created_at || b.updated_at);

        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
      });

      /* -------------------------------------------------------
         RECENT FOOD CLAIMS
      ------------------------------------------------------- */

      const claimsTable = document.getElementById("recentClaimsTable");

      if (claimsTable) {
        const recentClaims = recentDonations.slice(0, 5);

        claimsTable.innerHTML = recentClaims.length
          ? recentClaims.map(recentClaimRow).join("")
          : `
              <tr>

                <td
                  colspan="6"
                  class="table-empty"
                >

                  <div class="ngo-empty">

                    <i class="ri-file-list-3-line"></i>

                    No food claims yet.

                  </div>

                </td>

              </tr>
            `;
      }

      /* -------------------------------------------------------
         UPCOMING PICKUPS
      ------------------------------------------------------- */

      const pickupContainer = document.getElementById("upcomingPickups");

      if (pickupContainer) {
        const now = new Date();

        const upcoming = donations
          .filter((donation) =>
            ["claimed", "picked_up"].includes(donation.status),
          )
          .filter((donation) => {
            const pickupDate = parseDate(
              donation.donation_pickup_start || donation.donation_pickup_end,
            );

            return !pickupDate || pickupDate >= now;
          })
          .sort((a, b) => {
            const dateA = parseDate(
              a.donation_pickup_start || a.donation_pickup_end,
            );

            const dateB = parseDate(
              b.donation_pickup_start || b.donation_pickup_end,
            );

            return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
          })
          .slice(0, 3);

        pickupContainer.innerHTML = upcoming.length
          ? upcoming.map(upcomingPickup).join("")
          : `
              <div class="timeline-loading">

                <i class="ri-calendar-line"></i>

                <span>
                  No upcoming pickups.
                </span>

              </div>
            `;
      }

      /* -------------------------------------------------------
         FOOD COLLECTION TREND
      ------------------------------------------------------- */

      buildCollectionTrend(donations);

      /* -------------------------------------------------------
         CATEGORY DISTRIBUTION
      ------------------------------------------------------- */

      buildCategoryDistribution(donations);

      /* -------------------------------------------------------
         OPTIONAL DASHBOARD VALUES
      ------------------------------------------------------- */

      /*
       * These elements are not currently present
       * in the new HTML, but keeping these updates
       * makes the JS compatible if they are added later.
       */

      setText("availableFoodCount", data.available_count || 0);

      setText("activeClaimsCount", data.active_claims || 0);

      setText("foodRescuedCount", data.food_rescued || 0);

      setText("peopleServedCount", data.food_rescued || 0);

      setText("impactMeals", data.food_rescued || 0);
    } catch (error) {
      console.error("Unable to load NGO dashboard:", error);

      const claimsTable = document.getElementById("recentClaimsTable");

      if (claimsTable) {
        claimsTable.innerHTML = `
          <tr>

            <td
              colspan="6"
              class="table-empty"
            >

              <div class="ngo-empty">
                Unable to load recent claims.
              </div>

            </td>

          </tr>
        `;
      }

      const pickups = document.getElementById("upcomingPickups");

      if (pickups) {
        pickups.innerHTML = `
          <div class="timeline-loading">

            <i class="ri-error-warning-line"></i>

            <span>
              Unable to load upcoming pickups.
            </span>

          </div>
        `;
      }
    }
  };

  /* =========================================================
     PROFILE DROPDOWN
  ========================================================= */

  const profileButton = document.getElementById("ngoProfileBtn");

  const profileDropdown = document.getElementById("ngoProfileDropdown");

  if (profileButton && profileDropdown) {
    profileButton.addEventListener("click", (event) => {
      event.stopPropagation();

      profileDropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", (event) => {
      if (
        !profileButton.contains(event.target) &&
        !profileDropdown.contains(event.target)
      ) {
        profileDropdown.classList.add("hidden");
      }
    });
  }

  /* =========================================================
     COLLECTION PERIOD SELECT
  ========================================================= */

  const collectionPeriod = document.getElementById("collectionPeriod");

  if (collectionPeriod) {
    collectionPeriod.addEventListener("change", () => {
      /*
       * Reload dashboard data when the
       * period changes.
       *
       * The current backend provides the
       * donation records, so the chart is
       * rebuilt from those records.
       */

      loadDashboard();
    });
  }

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  await loadDashboard();

  /* =========================================================
     AUTO REFRESH
  ========================================================= */

  /*
   * Refresh dashboard data every 30 seconds
   * so pickup/claim information stays current.
   */

  setInterval(() => {
    loadDashboard();
  }, 30000);
});
