/* ===========================================
   IMPACT OVERVIEW DATA
=========================================== */

const impactData = {
  today: {
    labels: ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM"],
    values: [12, 18, 26, 31, 42, 58, 47],
    total: 234,
  },

  week: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    values: [138, 152, 167, 174, 188, 221, 208],
    total: 1248,
  },

  month: {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    values: [720, 845, 931, 1028],
    total: 3524,
  },

  year: {
    labels: [
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
    ],
    values: [
      2820, 3012, 3188, 3340, 3515, 3672, 3825, 3942, 4056, 4198, 4326, 4518,
    ],
    total: 42412,
  },
};

/* ===========================================
   DONATION TREND CHART
=========================================== */

const impactCanvas = document.getElementById("impactChart");

let impactChart = null;

if (impactCanvas && typeof Chart !== "undefined") {
  const ctx = impactCanvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, 350);

  gradient.addColorStop(0, "rgba(34,197,94,.35)");
  gradient.addColorStop(0.5, "rgba(34,197,94,.12)");
  gradient.addColorStop(1, "rgba(34,197,94,0)");

  impactChart = new Chart(ctx, {
    type: "line",

    data: {
      labels: impactData.week.labels,

      datasets: [
        {
          label: "Donations",
          data: impactData.week.values,

          borderColor: "#22C55E",
          backgroundColor: gradient,

          fill: true,

          tension: 0.45,

          borderWidth: 3,

          pointRadius: 4,
          pointHoverRadius: 6,

          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#22C55E",
          pointBorderWidth: 3,
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
      },

      scales: {
        x: {
          grid: {
            display: false,
          },
        },

        y: {
          beginAtZero: true,

          grid: {
            color: "rgba(0,0,0,.08)",
          },

          ticks: {
            stepSize: 50,
          },
        },
      },
    },
  });
}

/* ===========================================
   CUSTOM TIME FILTER
=========================================== */

const filterToggle = document.getElementById("filterToggle");
const filterDropdown = document.getElementById("filterDropdown");
const selectedFilter = document.getElementById("selectedFilter");
const filterOptions = document.querySelectorAll(".filter-option");
const total = document.querySelector(".chart-header h2");

if (filterToggle && filterDropdown && impactChart) {
  // Open / Close Dropdown
  filterToggle.addEventListener("click", (e) => {
    e.stopPropagation();

    filterDropdown.classList.toggle("show");
    filterToggle.classList.toggle("open");
  });

  // Change Filter
  filterOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const value = option.dataset.value;
      const selected = impactData[value];

      // Active state
      filterOptions.forEach((btn) => btn.classList.remove("active"));
      option.classList.add("active");

      // Update text
      selectedFilter.textContent = option.textContent.trim();

      // Update chart
      impactChart.data.labels = selected.labels;
      impactChart.data.datasets[0].data = selected.values;
      impactChart.update();

      // Update total
      if (total) {
        total.textContent = selected.total.toLocaleString();
      }

      // Close dropdown
      filterDropdown.classList.remove("show");
      filterToggle.classList.remove("open");
    });
  });

  // Close when clicking outside
  document.addEventListener("click", () => {
    filterDropdown.classList.remove("show");
    filterToggle.classList.remove("open");
  });
}

/* ==========================================================
   PROFILE DROPDOWN
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  setupProfileDropdown();
  loadHeaderProfileImage();
});

async function loadHeaderProfileImage() {
  const profileImage = document.getElementById("headerProfileImage");

  if (!profileImage) return;

  try {
    const response = await fetch("/api/provider/profile", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => ({}));
    const profile = data.profile;

    if (!response.ok || data.success === false || !profile) return;

    const images = Array.isArray(profile.profile_images)
      ? profile.profile_images
      : profile.profile_image
        ? [profile.profile_image]
        : [];
    const imageUrl = images.find(
      (image) => typeof image === "string" && image.trim(),
    );

    if (imageUrl) profileImage.src = imageUrl;
  } catch (error) {
    console.error("Dashboard profile image error:", error);
  }
}

/* ==========================================================
   SETUP PROFILE DROPDOWN
========================================================== */

function setupProfileDropdown() {
  const profileMenuBtn = document.getElementById("profileMenuBtn");

  const profileDropdown = document.getElementById("profileDropdown");

  const profileWrapper = document.querySelector(".profile-wrapper");

  if (!profileMenuBtn || !profileDropdown || !profileWrapper) {
    return;
  }

  /* --------------------------------------------------------
     TOGGLE DROPDOWN
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
     PREVENT DROPDOWN CLICK FROM CLOSING IMMEDIATELY
  -------------------------------------------------------- */

  profileDropdown.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  /* --------------------------------------------------------
     CLOSE WHEN CLICKING OUTSIDE
  -------------------------------------------------------- */

  document.addEventListener("click", () => {
    profileDropdown.classList.add("hidden");

    profileWrapper.classList.remove("active");
  });

  /* --------------------------------------------------------
     CLOSE WITH ESCAPE KEY
  -------------------------------------------------------- */

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      profileDropdown.classList.add("hidden");

      profileWrapper.classList.remove("active");
    }
  });
}
