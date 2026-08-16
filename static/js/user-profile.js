/* ==========================================================
   ReServe - User Profile
   user-profile.js
========================================================== */

const API_BASE_URL = "/api";

let selectedProfileImage = null;

/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initializeUserProfile();
});

/* ==========================================================
   INITIALIZE
========================================================== */

function initializeUserProfile() {
  setupProfileImageUpload();

  setupFormValidation();

  setupFormSubmit();

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
    showFormError(error.message || "Unable to load profile.");
  }
}

/* ==========================================================
   POPULATE PROFILE
========================================================== */

function populateProfile(profile) {
  setValue("fullName", profile.full_name || "");
  setValue("phone", profile.phone || "");
  setValue("email", profile.email || "");
setValue("userId", profile.id || "");

  // Format Member Since
  const memberDate = profile.member_since || profile.created_at;

  if (memberDate) {
    const date = new Date(memberDate);

    const formattedDate = date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    setValue("memberSince", formattedDate);
  }

  setValue("address", profile.address || "");
  setValue("city", profile.city || "");
  setValue("state", profile.state || "");
  setValue("pincode", profile.pincode || "");
  setValue("pickupArea", profile.pickup_area || "");

  if (profile.profile_image) {
    const preview = document.getElementById("profilePreview");
    const placeholder = document.getElementById("profilePlaceholder");

    preview.src = profile.profile_image;
    preview.hidden = false;

    if (placeholder) {
      placeholder.style.display = "none";
    }
  }
}

/* ==========================================================
   SET VALUE
========================================================== */

function setValue(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value;
  }
}

/* ==========================================================
   PROFILE IMAGE UPLOAD
========================================================== */

function setupProfileImageUpload() {
  const input = document.getElementById("profileImage");

  if (!input) return;

  input.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showFormError("Only JPG, PNG and WEBP images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showFormError("Image size must be less than 5 MB.");
      return;
    }

    selectedProfileImage = file;

    const preview = document.getElementById("profilePreview");
    const placeholder = document.getElementById("profilePlaceholder");

    preview.src = URL.createObjectURL(file);
    preview.hidden = false;

    if (placeholder) {
      placeholder.style.display = "none";
    }
  });
}

/* ==========================================================
   FORM VALIDATION SETUP
========================================================== */

function setupFormValidation() {
  const fullName = document.getElementById("fullName");
  const address = document.getElementById("address");
  const city = document.getElementById("city");
  const state = document.getElementById("state");
  const pincode = document.getElementById("pincode");

  if (fullName) {
    fullName.addEventListener("input", () => {
      validateRequiredField(fullName, "fullNameMessage");
    });
  }

  if (address) {
    address.addEventListener("input", () => {
      validateRequiredField(address, "addressMessage");
    });
  }

  if (city) {
    city.addEventListener("input", () => {
      validateRequiredField(city, "cityMessage");
    });
  }

  if (state) {
    state.addEventListener("input", () => {
      validateRequiredField(state, "stateMessage");
    });
  }

  if (pincode) {
    pincode.addEventListener("input", () => {
      pincode.value = pincode.value.replace(/\D/g, "");
      pincode.value = pincode.value.slice(0, 6);

      validatePincode(false);
    });
  }
}

/* ==========================================================
   REQUIRED FIELD VALIDATION
========================================================== */

function validateRequiredField(input, messageId) {
  const message = document.getElementById(messageId);

  const value = input.value.trim();

  if (!value) {
    input.classList.add("input-invalid");
    input.classList.remove("input-valid");

    if (message) {
      message.textContent = "This field is required.";
      message.className = "field-message error";
    }

    return false;
  }

  input.classList.remove("input-invalid");
  input.classList.add("input-valid");

  if (message) {
    message.textContent = "";
    message.className = "field-message";
  }

  return true;
}

/* ==========================================================
   PINCODE VALIDATION
========================================================== */

function validatePincode(showRequired = false) {
  const input = document.getElementById("pincode");
  const message = document.getElementById("pincodeMessage");

  const value = input.value.trim();

  if (!value) {
    input.classList.remove("input-valid");
    input.classList.remove("input-invalid");

    if (showRequired) {
      message.textContent = "Please enter your pincode.";
      message.className = "field-message error";
    }

    return false;
  }

  if (!/^\d{6}$/.test(value)) {
    input.classList.add("input-invalid");
    input.classList.remove("input-valid");

    if (message) {
      message.textContent = "Enter a valid 6-digit pincode.";
      message.className = "field-message error";
    }

    return false;
  }

  input.classList.remove("input-invalid");
  input.classList.add("input-valid");

  if (message) {
    message.textContent = "";
    message.className = "field-message";
  }

  return true;
}

/* ==========================================================
   UPLOAD PROFILE IMAGE
========================================================== */

async function uploadProfileImage() {
  if (!selectedProfileImage) {
    return null;
  }

  const formData = new FormData();

  formData.append("image", selectedProfileImage);

  const response = await fetch(`${API_BASE_URL}/upload-image`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Image upload failed.");
  }

  return data.image_url;
}

/* ==========================================================
   FORM SUBMIT
========================================================== */

function setupFormSubmit() {
  const form = document.getElementById("userProfileForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearFormMessages();

    const fullName = document.getElementById("fullName");
    const address = document.getElementById("address");
    const city = document.getElementById("city");
    const state = document.getElementById("state");
    const pincode = document.getElementById("pincode");
    const pickupArea = document.getElementById("pickupArea");

    const validFullName = validateRequiredField(fullName, "fullNameMessage");

    const validAddress = validateRequiredField(address, "addressMessage");

    const validCity = validateRequiredField(city, "cityMessage");

    const validState = validateRequiredField(state, "stateMessage");

    const validPincode = validatePincode(true);

    if (
      !validFullName ||
      !validAddress ||
      !validCity ||
      !validState ||
      !validPincode
    ) {
      showFormError("Please complete all required fields.");
      return;
    }

    try {
      let imageUrl = null;

      if (selectedProfileImage) {
        imageUrl = await uploadProfileImage();
      }

      const payload = {
        full_name: fullName.value.trim(),
        address: address.value.trim(),
        city: city.value.trim(),
        state: state.value.trim(),
        pincode: pincode.value.trim(),
        pickup_area: pickupArea ? pickupArea.value.trim() : "",
      };

      if (imageUrl) {
        payload.profile_image = imageUrl;
      }

      const button = document.getElementById("saveProfileBtn");

      button.disabled = true;

      button.innerHTML = `
        <span>Saving Profile...</span>
        <i class="fa-solid fa-spinner fa-spin"></i>
      `;

      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to save profile.");
      }

      /* ----------------------------------------------------
         UPDATE LOCAL USER (FIXED: Preserves existing dashboard data)
      ---------------------------------------------------- */
      const storedUser = JSON.parse(localStorage.getItem("user")) || {};

      storedUser.full_name = fullName.value.trim();
      storedUser.city = city.value.trim();
      storedUser.state = state.value.trim();
      storedUser.address = address.value.trim();
      storedUser.pincode = pincode.value.trim();
      if (pickupArea && pickupArea.value.trim()) {
        storedUser.pickup_area = pickupArea.value.trim();
      }
      if (imageUrl) {
        storedUser.profile_image = imageUrl;
      }

      localStorage.setItem("user", JSON.stringify(storedUser));

      showFormSuccess(data.message || "Profile saved successfully!");

      button.innerHTML = `
  <span>Profile Saved</span>
  <i class="fa-solid fa-check"></i>
`;

      setTimeout(() => {
        window.location.href = "/user-dashboard";
      }, 1000);
    } catch (error) {
      console.error(error);

      showFormError(error.message || "Unable to save profile.");

      const button = document.getElementById("saveProfileBtn");

      button.disabled = false;

      button.innerHTML = `
        <span>Save & Continue</span>
        <i class="fa-solid fa-arrow-right"></i>
      `;
    }
  });
}

/* ==========================================================
   SUCCESS MESSAGE
========================================================== */

function showFormSuccess(message) {
  const success = document.getElementById("successMessage");

  if (!success) return;

  success.querySelector("span").textContent = message;

  success.style.display = "flex";

  const error = document.getElementById("errorMessage");

  if (error) {
    error.style.display = "none";
  }
}

/* ==========================================================
   ERROR MESSAGE
========================================================== */

function showFormError(message) {
  const error = document.getElementById("errorMessage");

  if (!error) return;

  error.querySelector("span").textContent = message;

  error.style.display = "flex";

  const success = document.getElementById("successMessage");

  if (success) {
    success.style.display = "none";
  }
}

/* ==========================================================
   CLEAR MESSAGES
========================================================== */

function clearFormMessages() {
  const success = document.getElementById("successMessage");
  const error = document.getElementById("errorMessage");

  if (success) success.style.display = "none";
  if (error) error.style.display = "none";
}
