/* ==========================================================
   ReServe - Business Profile
   donor-profile.js
========================================================== */

const API_BASE_URL = "/api";

/* ==========================================================
   STATE
========================================================== */

let currentProfile = null;

/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initializeBusinessProfile();
});

/* ==========================================================
   INITIALIZE
========================================================== */

function initializeBusinessProfile() {
  setupImageChange();

  setupEditProfile();

  loadBusinessProfile();
}

/* ==========================================================
   LOAD BUSINESS PROFILE
========================================================== */

async function loadBusinessProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/provider/profile`, {
      method: "GET",

      credentials: "include",

      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    /* ------------------------------------------------------
       SESSION / AUTHENTICATION ERROR
    ------------------------------------------------------ */

    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }

    /* ------------------------------------------------------
       OTHER API ERRORS
    ------------------------------------------------------ */

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Unable to load business profile.");
    }

    /* ------------------------------------------------------
       PROFILE
    ------------------------------------------------------ */

    const profile = data.profile;

    if (!profile) {
      throw new Error("Business profile information was not found.");
    }

    currentProfile = profile;
    console.log(profile);

    /* ------------------------------------------------------
       POPULATE PAGE
    ------------------------------------------------------ */

    populateProfile(profile);
  } catch (error) {
    console.error("Business profile loading error:", error);

    showProfileError(error.message || "Unable to load your business profile.");
  }
}

/* ==========================================================
   POPULATE COMPLETE PROFILE
========================================================== */

function populateProfile(profile) {
    
  /* --------------------------------------------------------
     HEADER
  -------------------------------------------------------- */

  updateHeader(profile);

  /* --------------------------------------------------------
     MAIN BUSINESS OVERVIEW
  -------------------------------------------------------- */

  setText("businessName", profile.business_name || "Business Name");

  setText("profileLocation", buildLocation(profile));

  setText(
    "joinedDate",
    formatJoinedDate(profile.createdAt || profile.created_at),
  );

  setText(
    "profileAbout",
    profile.about || "No business description added yet.",
  );

  /* --------------------------------------------------------
     MAIN PROFILE IMAGE
  -------------------------------------------------------- */

  updateMainProfileImage(profile);

  /* --------------------------------------------------------
     BUSINESS IMAGE GALLERY
  -------------------------------------------------------- */

  renderBusinessImages(getProfileImages(profile));

  /* --------------------------------------------------------
     BUSINESS INFORMATION
  -------------------------------------------------------- */

  setText("contactPerson", profile.full_name || "—");

  setText("contactPhone", profile.phone || "—");

  setText("contactEmail", profile.email || "—");

  setText("businessType", formatBusinessType(profile.provider_type));

  setText("businessId", profile.provider_id || "—");

  setText("contactAddress", buildFullAddress(profile));

  /* --------------------------------------------------------
     ABOUT YOUR BUSINESS
  -------------------------------------------------------- */

  setText("organizationBusinessName", profile.business_name || "—");

  setText(
    "organizationBusinessType",
    formatBusinessType(profile.provider_type),
  );

  setText("organizationCuisine", formatCuisineTypes(profile));

 setText("organizationArea", profile.area || "—");

  setText("organizationAbout", profile.about || "—");

  /* --------------------------------------------------------
     PREFERENCES
  -------------------------------------------------------- */

  setText("preferenceWorkingDays", formatWorkingDays(profile.working_days));

  setText("preferenceOpeningTime", formatTime(profile.opening_time));

  setText("preferenceClosingTime", formatTime(profile.closing_time));

  setWebsite(profile.website);

  setText("preferenceCity", profile.city || "—");
}

/* ==========================================================
   HEADER
========================================================== */

function updateHeader(profile) {
  const businessName = document.getElementById("headerBusinessName");

  const profileImage = document.getElementById("headerProfileImage");

  const fallback = document.getElementById("headerAvatarFallback");

  /* --------------------------------------------------------
     BUSINESS NAME
  -------------------------------------------------------- */

  if (businessName) {
    businessName.textContent = profile.business_name?.trim() || "Business";
  }

  /* --------------------------------------------------------
     FIRST IMAGE
  -------------------------------------------------------- */

  const images = getProfileImages(profile);

  const firstImage = images.length > 0 ? images[0] : "";

  if (firstImage && profileImage) {
    profileImage.src = firstImage;

    profileImage.classList.add("has-image");

    if (fallback) {
      fallback.style.display = "none";
    }

    /* ------------------------------------------------------
       IMAGE ERROR
    ------------------------------------------------------ */

    profileImage.onerror = () => {
      profileImage.removeAttribute("src");

      profileImage.classList.remove("has-image");

      if (fallback) {
        fallback.style.display = "block";
      }
    };
  } else {
    if (profileImage) {
      profileImage.removeAttribute("src");

      profileImage.classList.remove("has-image");
    }

    if (fallback) {
      fallback.style.display = "block";
    }
  }
}

/* ==========================================================
   MAIN PROFILE IMAGE
========================================================== */

function updateMainProfileImage(profile) {
  const profileImage = document.getElementById("profileImage");

  const fallback = document.getElementById("profileAvatarFallback");

  const images = getProfileImages(profile);

  const firstImage = images.length > 0 ? images[0] : "";

  if (firstImage && profileImage) {
    profileImage.src = firstImage;

    profileImage.classList.add("has-image");

    if (fallback) {
      fallback.style.display = "none";
    }

    profileImage.onerror = () => {
      profileImage.removeAttribute("src");

      profileImage.classList.remove("has-image");

      if (fallback) {
        fallback.style.display = "flex";
      }
    };
  } else {
    if (profileImage) {
      profileImage.removeAttribute("src");

      profileImage.classList.remove("has-image");
    }

    if (fallback) {
      fallback.style.display = "flex";
    }
  }
}

/* ==========================================================
   GET PROFILE IMAGES
========================================================== */

function getProfileImages(profile) {
  let images = [];

  /* --------------------------------------------------------
     NEW FORMAT
  -------------------------------------------------------- */

  if (Array.isArray(profile.profile_images)) {
    images = profile.profile_images;
  } else if (
    /* --------------------------------------------------------
     OLD SINGLE IMAGE FORMAT
  -------------------------------------------------------- */
    typeof profile.profile_image === "string" &&
    profile.profile_image.trim()
  ) {
    images = [profile.profile_image];
  }

  /* --------------------------------------------------------
     CLEAN IMAGE VALUES
  -------------------------------------------------------- */

  return images
    .filter((image) => typeof image === "string" && image.trim())
    .map((image) => image.trim());
}

/* ==========================================================
   RENDER BUSINESS IMAGE GALLERY
========================================================== */

function renderBusinessImages(images) {
  const container = document.getElementById("businessImages");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!images.length) {
    return;
  }

  /* --------------------------------------------------------
     SHOW MAXIMUM 5 IMAGES
  -------------------------------------------------------- */

  const visibleImages = images.slice(0, 5);

  visibleImages.forEach((imageUrl, index) => {
    const item = document.createElement("div");

    item.className = "business-image-item";

    const image = document.createElement("img");

    image.src = imageUrl;

    image.style.cursor = "pointer";

    image.addEventListener("click", () => {
      const mainImage = document.getElementById("profileImage");

      if (mainImage) {
        mainImage.src = imageUrl;

        mainImage.classList.add("has-image");
      }
    });

    image.alt = `Business image ${index + 1}`;

    image.onerror = () => {
      item.remove();
    };

    item.appendChild(image);

    container.appendChild(item);
  });

  /* --------------------------------------------------------
     MORE COUNT
  -------------------------------------------------------- */

  if (images.length > 5) {
    const more = document.createElement("div");

    more.className = "business-image-more";

    more.textContent = `+${images.length - 5} More`;

    container.appendChild(more);
  }
}

/* ==========================================================
   BUILD LOCATION
========================================================== */

function buildLocation(profile) {
  const city = String(profile.city || "").trim();

  const state = String(profile.state || "").trim();

  if (city && state) {
    return `${city}, ${state}`;
  }

  return city || state || "Location";
}

/* ==========================================================
   BUILD FULL ADDRESS
========================================================== */

function buildFullAddress(profile) {
  const parts = [];

  if (profile.address) {
    parts.push(String(profile.address).trim());
  }

  if (profile.city) {
    parts.push(String(profile.city).trim());
  }

  if (profile.state) {
    parts.push(String(profile.state).trim());
  }

  if (profile.pincode) {
    parts.push(String(profile.pincode).trim());
  }

  if (!parts.length) {
    return "—";
  }

  return parts.join(", ");
}

/* ==========================================================
   FORMAT BUSINESS TYPE
========================================================== */

function formatBusinessType(type) {
  if (!type) {
    return "—";
  }

  return String(type)
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/* ==========================================================
   FORMAT CUISINE TYPES
========================================================== */

function formatCuisineTypes(profile) {
  const cuisineTypes = Array.isArray(profile.cuisine_types)
    ? [...profile.cuisine_types]
    : [];

  if (cuisineTypes.includes("other") && profile.other_cuisine) {
    const index = cuisineTypes.indexOf("other");

    cuisineTypes.splice(index, 1);

    cuisineTypes.push(profile.other_cuisine);
  }

  if (!cuisineTypes.length) {
    return "—";
  }

  return cuisineTypes.map((cuisine) => formatBusinessType(cuisine)).join(", ");
}

/* ==========================================================
   FORMAT WORKING DAYS
========================================================== */

function formatWorkingDays(days) {
  if (!Array.isArray(days) || !days.length) {
    return "—";
  }

  const weekDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const selected = days.map((day) => day.toLowerCase());

  const indexes = selected
    .map((day) => weekDays.indexOf(day))
    .filter((index) => index !== -1)
    .sort((a, b) => a - b);

  // Check if all selected days are consecutive
  let consecutive = true;

  for (let i = 1; i < indexes.length; i++) {
    if (indexes[i] !== indexes[i - 1] + 1) {
      consecutive = false;
      break;
    }
  }

  if (consecutive && indexes.length > 1) {
    const start =
      weekDays[indexes[0]].charAt(0).toUpperCase() +
      weekDays[indexes[0]].slice(1);

    const end =
      weekDays[indexes[indexes.length - 1]].charAt(0).toUpperCase() +
      weekDays[indexes[indexes.length - 1]].slice(1);

    return `${start} to ${end}`;
  }

  return selected
    .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
    .join(", ");
}

/* ==========================================================
   FORMAT TIME
========================================================== */

function formatTime(time) {
  if (!time) {
    return "—";
  }

  const value = String(time).trim();

  /* --------------------------------------------------------
     24-HOUR TIME
     Example: 18:30 → 6:30 PM
  -------------------------------------------------------- */

  const match = value.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return value;
  }

  let hours = parseInt(match[1], 10);

  const minutes = match[2];

  const period = hours >= 12 ? "PM" : "AM";

  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }

  return `${hours}:${minutes} ${period}`;
}

/* ==========================================================
   FORMAT JOINED DATE
========================================================== */

function formatJoinedDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ==========================================================
   SET TEXT HELPER
========================================================== */

function setText(id, value) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.textContent = value || "—";
}

/* ==========================================================
   SET WEBSITE
========================================================== */

function setWebsite(website) {
  const element = document.getElementById("preferenceWebsite");

  if (!element) {
    return;
  }

  const value = String(website || "").trim();

  element.textContent = value || "—";

  if (value) {
    element.style.cursor = "pointer";

    element.title = "Open website";

    element.onclick = () => {
      let url = value;

      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    };
  } else {
    element.style.cursor = "default";

    element.onclick = null;

    element.removeAttribute("title");
  }
}

/* ==========================================================
   EDIT PROFILE
========================================================== */

function setupEditProfile() {
  const button = document.getElementById("editProfileBtn");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    /*
     * Existing profile editing page.
     */

    window.location.href = "/provider-profile";
  });
}

/* ==========================================================
   IMAGE CHANGE SETUP
========================================================== */

function setupImageChange() {
  const button = document.getElementById("changeImageBtn");

  const input = document.getElementById("profileImageInput");

  if (!button || !input) {
    return;
  }

  button.addEventListener("click", () => {
    input.click();
  });

  input.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadProfileImage(file);

    /*
     * Allows the same image to
     * be selected again later.
     */

    input.value = "";
  });
}

/* ==========================================================
   UPLOAD PROFILE IMAGE
========================================================== */

async function uploadProfileImage(file) {
  /* --------------------------------------------------------
     FILE TYPE
  -------------------------------------------------------- */

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    showProfileError("Only JPG, PNG and WebP images are allowed.");

    return;
  }

  /* --------------------------------------------------------
     FILE SIZE
  -------------------------------------------------------- */

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    showProfileError("Image size must be 5 MB or less.");

    return;
  }

  /* --------------------------------------------------------
     CHECK CURRENT IMAGE COUNT
  -------------------------------------------------------- */

  const existingImages = getProfileImages(currentProfile || {});

  if (existingImages.length >= 5) {
    showProfileError("You can upload a maximum of 5 images.");

    return;
  }

  try {
    /* ------------------------------------------------------
       UPLOAD IMAGE
    ------------------------------------------------------ */

    const formData = new FormData();

    formData.append("image", file);

    const uploadResponse = await fetch(`${API_BASE_URL}/upload-image`, {
      method: "POST",

      credentials: "include",

      body: formData,
    });

    const uploadData = await uploadResponse.json().catch(() => ({}));

    if (!uploadResponse.ok || uploadData.success === false) {
      throw new Error(uploadData.message || "Unable to upload image.");
    }

    const imageUrl = uploadData.image_url;

    if (!imageUrl) {
      throw new Error("Image upload failed.");
    }

    /* ------------------------------------------------------
       ADD NEW IMAGE
    ------------------------------------------------------ */

    const updatedImages = [...existingImages, imageUrl];

    await saveProfileImages(updatedImages);
  } catch (error) {
    console.error("Profile image upload error:", error);

    showProfileError(error.message || "Unable to upload profile image.");
  }
}

/* ==========================================================
   SAVE PROFILE IMAGES
========================================================== */

async function saveProfileImages(profileImages) {
  if (!currentProfile) {
    throw new Error("Business profile is not loaded.");
  }

  const payload = {
    business_name: currentProfile.business_name || "",

    provider_type: currentProfile.provider_type || "",

    cuisine_types: Array.isArray(currentProfile.cuisine_types)
      ? currentProfile.cuisine_types
      : [],

    other_cuisine: currentProfile.other_cuisine || "",

    about: currentProfile.about || "",

    website: currentProfile.website || "",

    address: currentProfile.address || "",

    city: currentProfile.city || "",

    state: currentProfile.state || "",

    pincode: currentProfile.pincode || "",

   area: currentProfile.area || "",

    working_days: Array.isArray(currentProfile.working_days)
      ? currentProfile.working_days
      : [],

    opening_time: currentProfile.opening_time || "",

    closing_time: currentProfile.closing_time || "",

    profile_images: profileImages,
  };

  const response = await fetch(`${API_BASE_URL}/provider/profile`, {
    method: "PUT",

    credentials: "include",

    headers: {
      "Content-Type": "application/json",

      Accept: "application/json",
    },

    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Unable to save profile image.");
  }

  /* --------------------------------------------------------
     UPDATE LOCAL STATE
  -------------------------------------------------------- */

  currentProfile.profile_images = profileImages;

  /* --------------------------------------------------------
     UPDATE UI
  -------------------------------------------------------- */

  updateHeader(currentProfile);

  updateMainProfileImage(currentProfile);

  renderBusinessImages(profileImages);

  showProfileSuccess("Business image updated successfully.");
}

/* ==========================================================
   SUCCESS MESSAGE
========================================================== */

function showProfileSuccess(message) {
  console.log(message);
}

/* ==========================================================
   ERROR MESSAGE
========================================================== */

function showProfileError(message) {
  console.error(message);

  /*
   * We intentionally don't create a new
   * visible UI component here because
   * the finalized HTML doesn't contain
   * a profile error-message element.
   */

  alert(message);
}
