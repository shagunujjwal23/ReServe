/* ==========================================================
   ReServe - User View Profile
========================================================== */

const API_BASE_URL = "/api";

document.addEventListener("DOMContentLoaded", () => {
  initializeProfile();
});

/* ==========================================================
   INITIALIZE
========================================================== */

function initializeProfile() {
  loadUserProfile();
}

/* ==========================================================
   LOAD PROFILE
========================================================== */

async function loadUserProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Unable to load profile.");
    }

    if (data.profile) {
      populateProfile(data.profile);
    }
  } catch (error) {
    console.error("Profile loading error:", error);
  }
}

/* ==========================================================
   POPULATE PROFILE
========================================================== */

function populateProfile(profile) {
  /* ------------------------------
     Main Profile Section
  ------------------------------ */

  setText("fullName", profile.full_name || "User");

  setText("phone", profile.phone || "-");
  setText("email", profile.email || "-");

  setText("userId", profile.id || "-");

  /* ------------------------------
     Joined Date
  ------------------------------ */

  const memberDate = profile.member_since || profile.created_at;

  if (memberDate) {
    const formattedDate = new Date(memberDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    setText("memberSince", formattedDate);
  }

  /* ------------------------------
     Address Information
  ------------------------------ */

  setText("address", profile.address || "-");
  setText("city", profile.city || "-");
  setText("state", profile.state || "-");
  setText("pincode", profile.pincode || "-");
  setText("pickupArea", profile.pickup_area || "-");

  /* ------------------------------
     Account Information
  ------------------------------ */

  setText("accountName", profile.full_name || "-");
  setText("accountEmail", profile.email || "-");
  setText("accountPhone", profile.phone || "-");
  setText("accountUserId", profile.id || "-");

  /* ------------------------------
     Profile Image
  ------------------------------ */

  setupProfileImage(profile.profile_image);
}

/* ==========================================================
   PROFILE IMAGE
========================================================== */

function setupProfileImage(imageUrl) {
  const profileImage = document.getElementById("profileImage");
  const fallback = document.getElementById("profileFallback");

  if (!profileImage || !fallback) return;

  if (!imageUrl) {
    profileImage.style.display = "none";
    fallback.style.display = "flex";
    return;
  }

  profileImage.src = imageUrl;

  profileImage.onload = () => {
    profileImage.style.display = "block";
    fallback.style.display = "none";
  };

  profileImage.onerror = () => {
    profileImage.style.display = "none";
    fallback.style.display = "flex";
  };
}

/* ==========================================================
   HELPER
========================================================== */

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}