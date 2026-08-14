/* ==========================================================
   ReServe - Provider Profile
   provider-profile.js
========================================================== */

const API_BASE_URL = "/api";

/* ==========================================================
   STATE
========================================================== */

let selectedImages = [];

/* ==========================================================
   STANDARD PROVIDER TYPES
========================================================== */

const STANDARD_PROVIDER_TYPES = [
  "restaurant",
  "cafe",
  "bakery",
  "hotel",
  "catering",
  "cloud_kitchen",
  "food_shop",
];

/* ==========================================================
   STANDARD CUISINE TYPES
========================================================== */

const STANDARD_CUISINE_TYPES = [
  "indian",
  "chinese",
  "italian",
  "continental",
  "mexican",
  "south_indian",
  "bakery",
  "deserts",
];

/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initializeProviderProfile();
});

/* ==========================================================
   INITIALIZE
========================================================== */

function initializeProviderProfile() {
  setupImageUpload();

  setupOtherProviderType();

  setupOtherCuisine();

  setupFormValidation();

  setupAboutCounter();

  setupFormSubmit();

  setupSkipButton();

  loadProviderProfile();
}

/* ==========================================================
   LOAD PROVIDER PROFILE
========================================================== */

async function loadProviderProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/provider/profile`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Unable to load your profile.");
    }

    const profile = data.profile;

    if (!profile) {
      return;
    }

    populateProfile(profile);
  } catch (error) {
    console.error("Provider profile loading error:", error);

    if (error.message !== "User account not found.") {
      showFormError(error.message || "Unable to load your profile.");
    }
  }
}

/* ==========================================================
   POPULATE PROFILE
========================================================== */

function populateProfile(profile) {
  /* --------------------------------------------------------
     ACCOUNT INFORMATION
  -------------------------------------------------------- */

  setValue("fullName", profile.full_name || "");

  setValue("email", profile.email || "");

  setValue("phone", profile.phone || "");

  /* --------------------------------------------------------
     PROVIDER ID
  -------------------------------------------------------- */

  setValue("providerId", profile.provider_id || "");

  /* --------------------------------------------------------
     BUSINESS NAME
  -------------------------------------------------------- */

  setValue("businessName", profile.business_name || "");

  /* --------------------------------------------------------
     PROVIDER TYPE
  -------------------------------------------------------- */

  const providerType = document.getElementById("providerType");

  const otherProviderType = document.getElementById("otherProviderType");

  if (providerType) {
    const savedProviderType = String(profile.provider_type || "").trim();

    if (STANDARD_PROVIDER_TYPES.includes(savedProviderType)) {
      providerType.value = savedProviderType;

      if (otherProviderType) {
        otherProviderType.value = "";
      }
    } else if (savedProviderType) {
      providerType.value = "other";

      if (otherProviderType) {
        otherProviderType.value = savedProviderType;
      }
    } else {
      providerType.value = "";
    }

    toggleOtherProviderType();
  }

  /* --------------------------------------------------------
     PHONE / EMAIL
     These are normally supplied by the account.
  -------------------------------------------------------- */

  setValue("phone", profile.phone || "");

  setValue("email", profile.email || "");

  /* --------------------------------------------------------
     ABOUT
  -------------------------------------------------------- */

  setValue("about", profile.about || "");

  updateAboutCounter();

  /* --------------------------------------------------------
     WEBSITE
  -------------------------------------------------------- */

  setValue("website", profile.website || "");

  /* --------------------------------------------------------
     CUISINE TYPES
  -------------------------------------------------------- */

  populateCuisineTypes(profile);

  /* --------------------------------------------------------
     OTHER CUISINE
  -------------------------------------------------------- */

  const savedCuisineTypes = Array.isArray(profile.cuisine_types)
    ? profile.cuisine_types
    : [];

  const otherCuisineCheckbox = document.getElementById("otherCuisineCheckbox");

  const otherCuisine = document.getElementById("otherCuisine");

  if (otherCuisineCheckbox && otherCuisine) {
    const hasOtherCuisine = savedCuisineTypes.includes("other");

    otherCuisineCheckbox.checked = hasOtherCuisine;

    /*
     * If backend stores the custom cuisine
     * separately, use that value.
     */

    if (profile.other_cuisine) {
      otherCuisine.value = profile.other_cuisine;
    } else if (hasOtherCuisine) {
      /*
       * Backward-compatible handling:
       * if the backend stored a custom value
       * directly inside cuisine_types.
       */

      const customCuisine = savedCuisineTypes.find(
        (cuisine) =>
          cuisine !== "other" && !STANDARD_CUISINE_TYPES.includes(cuisine),
      );

      if (customCuisine) {
        otherCuisine.value = customCuisine;
      }
    }

    toggleOtherCuisine();
  }

  /* --------------------------------------------------------
     ADDRESS
  -------------------------------------------------------- */

  setValue("address", profile.address || "");

  setValue("city", profile.city || "");

  setValue("state", profile.state || "");

  setValue("pincode", profile.pincode || "");

  /* --------------------------------------------------------
     SERVING AREAS
  -------------------------------------------------------- */

  setValue("servingAreas", profile.serving_areas || "");

  /* --------------------------------------------------------
     WORKING DAYS
  -------------------------------------------------------- */

  const workingDays = Array.isArray(profile.working_days)
    ? profile.working_days
    : [];

  document
    .querySelectorAll('input[name="working_days"]')
    .forEach((checkbox) => {
      checkbox.checked = workingDays.includes(checkbox.value);
    });

  /* --------------------------------------------------------
     OPENING / CLOSING TIME
  -------------------------------------------------------- */

  setValue("openingTime", profile.opening_time || "");

  setValue("closingTime", profile.closing_time || "");

  /* --------------------------------------------------------
     PROFILE IMAGES
  -------------------------------------------------------- */

  selectedImages = [];

  let profileImages = [];

  if (Array.isArray(profile.profile_images)) {
    profileImages = profile.profile_images;
  } else if (profile.profile_image) {
    profileImages = [profile.profile_image];
  }

  profileImages.forEach((src) => {
    if (!src) {
      return;
    }

    selectedImages.push({
      src: src,
      existing: true,
      file: null,
    });
  });

  renderImagePreview();
}

/* ==========================================================
   POPULATE CUISINE TYPES
========================================================== */

function populateCuisineTypes(profile) {
  const savedCuisineTypes = Array.isArray(profile.cuisine_types)
    ? profile.cuisine_types
    : [];

  document
    .querySelectorAll('input[name="cuisine_types"]')
    .forEach((checkbox) => {
      checkbox.checked = savedCuisineTypes.includes(checkbox.value);
    });
}

/* ==========================================================
   SET VALUE HELPER
========================================================== */

function setValue(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value;
  }
}

/* ==========================================================
   OTHER PROVIDER TYPE
========================================================== */

function setupOtherProviderType() {
  const providerType = document.getElementById("providerType");

  if (!providerType) {
    return;
  }

  providerType.addEventListener("change", toggleOtherProviderType);

  toggleOtherProviderType();
}

/* ==========================================================
   TOGGLE OTHER PROVIDER TYPE
========================================================== */

function toggleOtherProviderType() {
  const providerType = document.getElementById("providerType");

  const otherProviderTypeGroup = document.getElementById(
    "otherProviderTypeGroup",
  );

  const otherProviderType = document.getElementById("otherProviderType");

  if (!providerType || !otherProviderTypeGroup || !otherProviderType) {
    return;
  }

  const isOther = providerType.value === "other";

  otherProviderTypeGroup.hidden = !isOther;

  otherProviderType.required = isOther;

  if (!isOther) {
    otherProviderType.value = "";

    otherProviderType.classList.remove("input-valid", "input-invalid");

    const message = document.getElementById("otherProviderTypeMessage");

    if (message) {
      message.textContent = "";
      message.className = "field-message";
    }
  }
}

/* ==========================================================
   OTHER CUISINE
========================================================== */

function setupOtherCuisine() {
  const checkbox = document.getElementById("otherCuisineCheckbox");

  const input = document.getElementById("otherCuisine");

  if (!checkbox || !input) {
    return;
  }

  checkbox.addEventListener("change", toggleOtherCuisine);

  toggleOtherCuisine();
}

/* ==========================================================
   TOGGLE OTHER CUISINE
========================================================== */

function toggleOtherCuisine() {
  const checkbox = document.getElementById("otherCuisineCheckbox");

  const input = document.getElementById("otherCuisine");

  const message = document.getElementById("otherCuisineMessage");

  if (!checkbox || !input) {
    return;
  }

  const isOtherSelected = checkbox.checked;

  input.disabled = !isOtherSelected;

  input.required = isOtherSelected;

  if (isOtherSelected) {
    input.placeholder = "Enter your cuisine type";

    if (input.value.trim()) {
      input.classList.remove("input-invalid");
      input.classList.add("input-valid");
    }
  } else {
    input.placeholder = "Select Other above to enter your cuisine type";

    input.value = "";

    input.classList.remove("input-valid", "input-invalid");

    if (message) {
      message.textContent = "";
      message.className = "field-message";
    }
  }
}

/* ==========================================================
   IMAGE UPLOAD SETUP
========================================================== */

function setupImageUpload() {
  const input = document.getElementById("businessImages");

  const chooseButton = document.getElementById("chooseImagesBtn");

  if (!input) {
    return;
  }

  /* --------------------------------------------------------
     CHOOSE IMAGES
  -------------------------------------------------------- */

  if (chooseButton) {
    chooseButton.addEventListener("click", () => {
      input.click();
    });
  }

  /* --------------------------------------------------------
     FILE SELECTION
  -------------------------------------------------------- */

  input.addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    addImages(files);

    /*
     * Allows selecting the same file again.
     */

    input.value = "";
  });
}

/* ==========================================================
   ADD IMAGES
========================================================== */

function addImages(files) {
  const MAX_IMAGES = 5;

  const remainingSlots = MAX_IMAGES - selectedImages.length;

  if (remainingSlots <= 0) {
    showFormError("You can upload a maximum of 5 images.");

    return;
  }

  const filesToAdd = files.slice(0, remainingSlots);

  filesToAdd.forEach((file) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showFormError(`${file.name} is not a supported image.`);

      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      showFormError(`${file.name} is larger than 5 MB.`);

      return;
    }

    const previewURL = URL.createObjectURL(file);

    selectedImages.push({
      file: file,
      src: previewURL,
      existing: false,
    });
  });

  renderImagePreview();

  if (files.length > remainingSlots) {
    showFormError("You can upload a maximum of 5 images.");
  }
}

/* ==========================================================
   RENDER IMAGE PREVIEW
========================================================== */

function renderImagePreview() {
  const container = document.getElementById("imagePreview");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  selectedImages.forEach((image, index) => {
    const item = document.createElement("div");

    item.className = "image-preview-item";

    /* ------------------------------------------------------
       IMAGE
    ------------------------------------------------------ */

    const img = document.createElement("img");

    img.src = image.src;

    img.alt = `Provider image ${index + 1}`;

    /* ------------------------------------------------------
       REMOVE BUTTON
    ------------------------------------------------------ */

    const removeButton = document.createElement("button");

    removeButton.type = "button";

    removeButton.className = "remove-image-btn";

    removeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';

    removeButton.setAttribute("aria-label", `Remove image ${index + 1}`);

    removeButton.addEventListener("click", () => {
      removeImage(index);
    });

    item.appendChild(img);

    item.appendChild(removeButton);

    container.appendChild(item);
  });
}

/* ==========================================================
   REMOVE IMAGE
========================================================== */

function removeImage(index) {
  if (index < 0 || index >= selectedImages.length) {
    return;
  }

  const image = selectedImages[index];

  if (image && !image.existing && image.src && image.src.startsWith("blob:")) {
    URL.revokeObjectURL(image.src);
  }

  selectedImages.splice(index, 1);

  renderImagePreview();
}

/* ==========================================================
   FORM VALIDATION SETUP
========================================================== */

function setupFormValidation() {
  const businessName = document.getElementById("businessName");

  const providerType = document.getElementById("providerType");

  const otherProviderType = document.getElementById("otherProviderType");

  const otherCuisine = document.getElementById("otherCuisine");

  const address = document.getElementById("address");

  const city = document.getElementById("city");

  const state = document.getElementById("state");

  const pincode = document.getElementById("pincode");

  const openingTime = document.getElementById("openingTime");

  const closingTime = document.getElementById("closingTime");

  /* --------------------------------------------------------
     BUSINESS NAME
  -------------------------------------------------------- */

  if (businessName) {
    businessName.addEventListener("input", () => {
      validateRequiredField(businessName, "businessNameMessage");
    });
  }

  /* --------------------------------------------------------
     PROVIDER TYPE
  -------------------------------------------------------- */

  if (providerType) {
    providerType.addEventListener("change", () => {
      validateRequiredField(providerType, "providerTypeMessage");

      if (providerType.value === "other") {
        validateOtherProviderType();
      }
    });
  }

  /* --------------------------------------------------------
     OTHER PROVIDER TYPE
  -------------------------------------------------------- */

  if (otherProviderType) {
    otherProviderType.addEventListener("input", validateOtherProviderType);
  }

  /* --------------------------------------------------------
     OTHER CUISINE
  -------------------------------------------------------- */

  if (otherCuisine) {
    otherCuisine.addEventListener("input", validateOtherCuisine);
  }

  /* --------------------------------------------------------
     ADDRESS
  -------------------------------------------------------- */

  if (address) {
    address.addEventListener("input", () => {
      validateRequiredField(address, "addressMessage");
    });
  }

  /* --------------------------------------------------------
     CITY
  -------------------------------------------------------- */

  if (city) {
    city.addEventListener("input", () => {
      validateRequiredField(city, "cityMessage");
    });
  }

  /* --------------------------------------------------------
     STATE
  -------------------------------------------------------- */

  if (state) {
    state.addEventListener("input", () => {
      validateRequiredField(state, "stateMessage");
    });
  }

  /* --------------------------------------------------------
     PINCODE
  -------------------------------------------------------- */

  if (pincode) {
    pincode.addEventListener("input", () => {
      pincode.value = pincode.value.replace(/\D/g, "");

      pincode.value = pincode.value.slice(0, 6);

      validatePincode(false);
    });
  }

  /* --------------------------------------------------------
     OPENING TIME
  -------------------------------------------------------- */

  if (openingTime) {
    openingTime.addEventListener("change", () => {
      validateRequiredField(openingTime, "openingTimeMessage");
    });
  }

  /* --------------------------------------------------------
     CLOSING TIME
  -------------------------------------------------------- */

  if (closingTime) {
    closingTime.addEventListener("change", () => {
      validateRequiredField(closingTime, "closingTimeMessage");
    });
  }

  /* --------------------------------------------------------
     WORKING DAYS
  -------------------------------------------------------- */

  document
    .querySelectorAll('input[name="working_days"]')
    .forEach((checkbox) => {
      checkbox.addEventListener("change", validateWorkingDays);
    });

  /* --------------------------------------------------------
     CUISINE TYPES
  -------------------------------------------------------- */

  document
    .querySelectorAll('input[name="cuisine_types"]')
    .forEach((checkbox) => {
      checkbox.addEventListener("change", validateCuisineTypes);
    });
}

/* ==========================================================
   VALIDATE OTHER PROVIDER TYPE
========================================================== */

function validateOtherProviderType() {
  const providerType = document.getElementById("providerType");

  const otherProviderType = document.getElementById("otherProviderType");

  const message = document.getElementById("otherProviderTypeMessage");

  if (!providerType || !otherProviderType) {
    return true;
  }

  if (providerType.value !== "other") {
    return true;
  }

  const value = otherProviderType.value.trim();

  if (!value) {
    otherProviderType.classList.remove("input-valid");

    otherProviderType.classList.add("input-invalid");

    if (message) {
      message.textContent = "Please specify your provider type.";

      message.className = "field-message error";
    }

    return false;
  }

  otherProviderType.classList.remove("input-invalid");

  otherProviderType.classList.add("input-valid");

  if (message) {
    message.textContent = "";

    message.className = "field-message";
  }

  return true;
}

/* ==========================================================
   VALIDATE OTHER CUISINE
========================================================== */

function validateOtherCuisine() {
  const checkbox = document.getElementById("otherCuisineCheckbox");

  const input = document.getElementById("otherCuisine");

  const message = document.getElementById("otherCuisineMessage");

  if (!checkbox || !input) {
    return true;
  }

  /*
   * If Other is not selected,
   * the field is not required.
   */

  if (!checkbox.checked) {
    return true;
  }

  const value = input.value.trim();

  if (!value) {
    input.classList.remove("input-valid");

    input.classList.add("input-invalid");

    if (message) {
      message.textContent = "Please specify your cuisine type.";

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
   VALIDATE CUISINE TYPES
========================================================== */

function validateCuisineTypes() {
  const selected = document.querySelectorAll(
    'input[name="cuisine_types"]:checked',
  );

  const message = document.getElementById("cuisineTypeMessage");

  const otherCheckbox = document.getElementById("otherCuisineCheckbox");

  const hasCuisine = selected.length > 0;

  if (!hasCuisine) {
    if (message) {
      message.textContent = "Please select at least one cuisine type.";

      message.className = "field-message error";
    }

    return false;
  }

  if (message) {
    message.textContent = "";

    message.className = "field-message";
  }

  /*
   * If Other is selected,
   * validate its input as well.
   */

  if (otherCheckbox && otherCheckbox.checked) {
    return validateOtherCuisine();
  }

  return true;
}

/* ==========================================================
   VALIDATE WORKING DAYS
========================================================== */

function validateWorkingDays() {
  const selected = document.querySelectorAll(
    'input[name="working_days"]:checked',
  );

  const message = document.getElementById("workingDaysMessage");

  if (!selected.length) {
    if (message) {
      message.textContent = "Please select at least one working day.";

      message.className = "field-message error";
    }

    return false;
  }

  if (message) {
    message.textContent = "";

    message.className = "field-message";
  }

  return true;
}

/* ==========================================================
   REQUIRED FIELD VALIDATION
========================================================== */

function validateRequiredField(input, messageId) {
  const message = document.getElementById(messageId);

  if (!input) {
    return false;
  }

  const value = input.value.trim();

  if (!value) {
    input.classList.remove("input-valid");

    input.classList.add("input-invalid");

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

  if (!input) {
    return true;
  }

  const value = input.value.trim();

  if (!value) {
    input.classList.remove("input-valid", "input-invalid");

    if (message) {
      message.textContent = showRequired ? "Please enter your PIN code." : "";

      message.className = showRequired
        ? "field-message error"
        : "field-message";
    }

    return false;
  }

  if (!/^\d{6}$/.test(value)) {
    input.classList.remove("input-valid");

    input.classList.add("input-invalid");

    if (message) {
      message.textContent = "Enter a valid 6-digit PIN code.";

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
   ABOUT CHARACTER COUNTER
========================================================== */

function setupAboutCounter() {
  const about = document.getElementById("about");

  if (!about) {
    return;
  }

  about.addEventListener("input", updateAboutCounter);

  updateAboutCounter();
}

/* ==========================================================
   UPDATE ABOUT COUNTER
========================================================== */

function updateAboutCounter() {
  const about = document.getElementById("about");

  const counter = document.getElementById("aboutCounter");

  if (!about || !counter) {
    return;
  }

  counter.textContent = `${about.value.length}/500`;
}

/* ==========================================================
   FORM SUBMIT
========================================================== */

function setupFormSubmit() {
  const form = document.getElementById("providerProfileForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearFormMessages();

    /* ----------------------------------------------------
         GET FIELDS
      ---------------------------------------------------- */

    const businessName = document.getElementById("businessName");

    const providerType = document.getElementById("providerType");

    const otherProviderType = document.getElementById("otherProviderType");

    const address = document.getElementById("address");

    const city = document.getElementById("city");

    const state = document.getElementById("state");

    const pincode = document.getElementById("pincode");

    const openingTime = document.getElementById("openingTime");

    const closingTime = document.getElementById("closingTime");

    /* ----------------------------------------------------
         REQUIRED VALIDATION
      ---------------------------------------------------- */

    const validBusinessName = validateRequiredField(
      businessName,
      "businessNameMessage",
    );

    const validProviderType = validateRequiredField(
      providerType,
      "providerTypeMessage",
    );

    let validOtherProviderType = true;

    if (providerType && providerType.value === "other") {
      validOtherProviderType = validateOtherProviderType();
    }

    const validAddress = validateRequiredField(address, "addressMessage");

    const validCity = validateRequiredField(city, "cityMessage");

    const validState = validateRequiredField(state, "stateMessage");

    const validPincode = validatePincode(true);

    const validOpeningTime = validateRequiredField(
      openingTime,
      "openingTimeMessage",
    );

    const validClosingTime = validateRequiredField(
      closingTime,
      "closingTimeMessage",
    );

    /* ----------------------------------------------------
         ABOUT
      ---------------------------------------------------- */

    const about = document.getElementById("about");

    const validAbout = validateRequiredField(about, "aboutMessage");

    /* ----------------------------------------------------
         CUISINE TYPES
      ---------------------------------------------------- */

    const cuisineTypes = Array.from(
      document.querySelectorAll('input[name="cuisine_types"]:checked'),
    ).map((checkbox) => checkbox.value);

    const validCuisineTypes = validateCuisineTypes();

    /* ----------------------------------------------------
         OTHER CUISINE
      ---------------------------------------------------- */

    const otherCuisine = document.getElementById("otherCuisine");

    const otherCuisineCheckbox = document.getElementById(
      "otherCuisineCheckbox",
    );

    let validOtherCuisine = true;

    if (otherCuisineCheckbox && otherCuisineCheckbox.checked) {
      validOtherCuisine = validateOtherCuisine();
    }

    /* ----------------------------------------------------
         WORKING DAYS
      ---------------------------------------------------- */

    const workingDays = Array.from(
      document.querySelectorAll('input[name="working_days"]:checked'),
    ).map((checkbox) => checkbox.value);

    const validWorkingDays = validateWorkingDays();

    /* ----------------------------------------------------
         STOP IF INVALID
      ---------------------------------------------------- */

    if (
      !validBusinessName ||
      !validProviderType ||
      !validOtherProviderType ||
      !validAbout ||
      !validAddress ||
      !validCity ||
      !validState ||
      !validPincode ||
      !validOpeningTime ||
      !validClosingTime ||
      !validCuisineTypes ||
      !validOtherCuisine ||
      !validWorkingDays
    ) {
      showFormError("Please complete all required fields.");

      return;
    }

    /* ----------------------------------------------------
         FINAL PROVIDER TYPE
      ---------------------------------------------------- */

    let finalProviderType = providerType.value.trim();

    if (finalProviderType === "other") {
      finalProviderType = otherProviderType.value.trim();
    }

    /* ----------------------------------------------------
         FINAL CUISINE TYPES
      ---------------------------------------------------- */

    let finalCuisineTypes = [...cuisineTypes];

    /*
     * The backend gets "other" plus the
     * custom cuisine separately.
     */

    const otherCuisineValue =
      otherCuisine && otherCuisineCheckbox && otherCuisineCheckbox.checked
        ? otherCuisine.value.trim()
        : "";

    /* ----------------------------------------------------
         SERVING AREAS
      ---------------------------------------------------- */

    const servingAreas = document.getElementById("servingAreas");

    /* ----------------------------------------------------
         UPLOAD NEW IMAGES
      ---------------------------------------------------- */

    let uploadedImageUrls = [];

    try {
      uploadedImageUrls = await uploadNewImages();
    } catch (error) {
      console.error("Image upload error:", error);

      showFormError(error.message || "Unable to upload images.");

      return;
    }

    /* ----------------------------------------------------
         EXISTING IMAGE URLS
      ---------------------------------------------------- */

    const existingImageUrls = selectedImages
      .filter((image) => image.existing)
      .map((image) => image.src);

    /* ----------------------------------------------------
         COMBINE IMAGES
      ---------------------------------------------------- */

    const profileImages = [...existingImageUrls, ...uploadedImageUrls];

    /* ----------------------------------------------------
         PAYLOAD
      ---------------------------------------------------- */

    const payload = {
      business_name: businessName.value.trim(),

      provider_type: finalProviderType,

      cuisine_types: finalCuisineTypes,

      other_cuisine: otherCuisineValue,

      about: about.value.trim(),

      website: document.getElementById("website")?.value.trim() || "",

      address: address.value.trim(),

      city: city.value.trim(),

      state: state.value.trim(),

      pincode: pincode.value.trim(),

      serving_areas: servingAreas?.value.trim() || "",

      working_days: workingDays,

      opening_time: openingTime.value,

      closing_time: closingTime.value,

      profile_images: profileImages,
    };

    /* ----------------------------------------------------
         BUTTON
      ---------------------------------------------------- */

    const button = form.querySelector(".save-btn");

    const originalHTML = button ? button.innerHTML : "";

    if (button) {
      button.disabled = true;

      button.innerHTML = `
          <span>Saving Profile...</span>
          <i class="fa-solid fa-spinner fa-spin"></i>
        `;
    }

    /* ----------------------------------------------------
         SAVE PROFILE
      ---------------------------------------------------- */

    try {
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
        if (Array.isArray(data.missing_fields)) {
          showMissingFields(data.missing_fields);
        }

        throw new Error(data.message || "Unable to update your profile.");
      }

      /* --------------------------------------------------
           SUCCESS
        -------------------------------------------------- */

      showFormSuccess(data.message || "Provider profile saved successfully.");

      updateLocalUser();

      /* --------------------------------------------------
           REDIRECT
        -------------------------------------------------- */

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 900);
    } catch (error) {
      console.error("Provider profile update error:", error);

      showFormError(
        error.message || "Unable to save your profile. Please try again.",
      );

      if (button) {
        button.disabled = false;

        button.innerHTML = originalHTML;
      }
    }
  });
}

/* ==========================================================
   UPLOAD NEW IMAGES
========================================================== */

async function uploadNewImages() {
  const newImages = selectedImages.filter(
    (image) => !image.existing && image.file,
  );

  if (!newImages.length) {
    return [];
  }

  const uploadedUrls = [];

  for (const image of newImages) {
    const formData = new FormData();

    formData.append("image", image.file);

    const response = await fetch(`${API_BASE_URL}/upload-image`, {
      method: "POST",

      credentials: "include",

      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.message || `Unable to upload ${image.file.name}.`);
    }

    if (!data.image_url) {
      throw new Error(`Image upload failed for ${image.file.name}.`);
    }

    uploadedUrls.push(data.image_url);
  }

  return uploadedUrls;
}

/* ==========================================================
   UPDATE LOCAL USER
========================================================== */

function updateLocalUser() {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser) {
      return;
    }

    const businessName = document.getElementById("businessName")?.value.trim();

    if (businessName) {
      storedUser.business_name = businessName;
    }

    localStorage.setItem("user", JSON.stringify(storedUser));
  } catch (error) {
    console.warn("Unable to update local user data.", error);
  }
}

/* ==========================================================
   SHOW MISSING FIELDS
========================================================== */

function showMissingFields(fields) {
  const fieldMap = {
    business_name: "businessName",

    provider_type: "providerType",

    address: "address",

    city: "city",

    state: "state",

    pincode: "pincode",

    opening_time: "openingTime",

    closing_time: "closingTime",

    about: "about",

    serving_areas: "servingAreas",
  };

  fields.forEach((field) => {
    const id = fieldMap[field];

    const input = document.getElementById(id);

    if (input) {
      input.classList.add("input-invalid");
    }
  });
}

/* ==========================================================
   SKIP BUTTON
========================================================== */

function setupSkipButton() {
  const button = document.getElementById("skipProfile");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    window.location.href = "/dashboard";
  });
}

/* ==========================================================
   SUCCESS MESSAGE
========================================================== */

function showFormSuccess(message) {
  const element = document.getElementById("successMessage");

  if (!element) {
    return;
  }

  const text = element.querySelector("span");

  if (text) {
    text.textContent = message;
  }

  element.style.display = "flex";

  const error = document.getElementById("errorMessage");

  if (error) {
    error.style.display = "none";
  }
}

/* ==========================================================
   ERROR MESSAGE
========================================================== */

function showFormError(message) {
  const element = document.getElementById("errorMessage");

  if (!element) {
    return;
  }

  const text = element.querySelector("span");

  if (text) {
    text.textContent = message;
  }

  element.style.display = "flex";

  const success = document.getElementById("successMessage");

  if (success) {
    success.style.display = "none";
  }
}

/* ==========================================================
   CLEAR FORM MESSAGES
========================================================== */

function clearFormMessages() {
  const success = document.getElementById("successMessage");

  const error = document.getElementById("errorMessage");

  if (success) {
    success.style.display = "none";
  }

  if (error) {
    error.style.display = "none";
  }
}
