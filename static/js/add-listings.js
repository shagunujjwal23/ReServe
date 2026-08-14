/* ==========================================================
   ReServe - Create Listing
   Version 2.0
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* =====================================================
   UPDATE EXISTING LISTING
===================================================== */

  async function updateExistingListing() {
    if (!editMode || !editListingId) {
      return;
    }

    /* Validate normal form fields */

    if (!validateForm()) {
      return;
    }

    analyzeBtn.disabled = true;

    analyzeBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';

    try {
      /* =================================================
       IMAGE
    ================================================= */

      let imageUrl = existingImageUrl;

      /* Upload only when user selected a new image */

      if (foodImage.files.length > 0) {
        analyzeBtn.innerHTML =
          '<i class="ri-loader-4-line ri-spin"></i> Uploading Image...';

        imageUrl = await uploadListingImage();
      }

      /* =================================================
       BUILD PAYLOAD
    ================================================= */

      const listingData = buildEditListingPayload(imageUrl);

      console.log("Updating listing:", listingData);

      /* =================================================
       UPDATE BACKEND
    ================================================= */

      analyzeBtn.innerHTML =
        '<i class="ri-loader-4-line ri-spin"></i> Updating...';

      const response = await fetch(
        `/api/listings/${encodeURIComponent(editListingId)}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          credentials: "same-origin",

          body: JSON.stringify(listingData),
        },
      );

      const data = await response.json().catch(() => ({}));

      /* =================================================
       AUTHENTICATION
    ================================================= */

      if (response.status === 401) {
        showToast(
          data.message || "Your session has expired. Please login again.",
          "error",
          "Session Expired",
        );

        window.location.href = "/login";

        return;
      }

      /* =================================================
       ERROR
    ================================================= */

      if (!response.ok || !data.success) {
        throw new Error(
          data.missing_fields
            ? `${data.message}\nMissing: ${data.missing_fields.join(", ")}`
            : data.message || "Unable to update the listing.",
        );
      }

      /* =================================================
       SUCCESS
    ================================================= */

      localStorage.removeItem("reserveListingDraft");

      showToast(
        data.message || "Listing updated successfully.",
        "success",
        "Listing Updated",
      );

      /* =================================================
       RETURN TO VIEW LISTING
    ================================================= */

      window.location.href = `/view-listing?id=${encodeURIComponent(editListingId)}`;
    } catch (error) {
      console.error("Update Listing Error:", error);

      showToast(
        error.message || "Unable to update the listing. Please try again.",
        "error",
      );
      analyzeBtn.disabled = false;

      analyzeBtn.innerHTML = '<i class="ri-save-line"></i> Save Changes';
    }
  }
  /* ==========================================================
       DOM ELEMENTS
    ========================================================== */

  // Form
  const form = document.getElementById("createListingForm");

  /* =====================================================
   EDIT MODE
===================================================== */

  const urlParams = new URLSearchParams(window.location.search);

  const editMode = urlParams.get("mode") === "edit";

  const editListingId = urlParams.get("id");

  let existingImageUrl = "";

  // Food Information
  const foodName = document.getElementById("foodName");
  const category = document.getElementById("category");
  const otherCategory = document.getElementById("otherCategory");
  const otherCategoryGroup = document.getElementById("otherCategoryGroup");

  const foodType = document.getElementById("foodType");
  const description = document.getElementById("description");

  // Availability
  const listingType = document.getElementById("listingType");

  const quantity = document.getElementById("quantity");

  const unit = document.getElementById("unit");
  const otherUnit = document.getElementById("otherUnit");
  const otherUnitGroup = document.getElementById("otherUnitGroup");

  const originalPrice = document.getElementById("originalPrice");
  const sellingPrice = document.getElementById("price");

  const originalPriceGroup = document.getElementById("originalPriceGroup");
  const sellingPriceGroup = document.getElementById("sellingPriceGroup");

  const hasExpiry = document.getElementById("hasExpiry");

  const preparationTime = document.getElementById("preparationTime");
  const expiryDate = document.getElementById("expiryDate");
  const availableUntil = document.getElementById("availableUntil");

  const pickupInstructions = document.getElementById("pickupInstructions");
  const instructionCount = document.getElementById("instructionCount");

  const preparationGroup = document.getElementById("preparationGroup");
  const expiryGroup = document.getElementById("expiryGroup");
  const availableUntilGroup = document.getElementById("availableUntilGroup");

  // Pickup
  // The pickup address is now managed in the provider profile rather than
  // exposed as editable fields in this form. Keep the values in detached
  // inputs so the existing draft, validation, AI, and payload logic can use
  // the same source of truth without depending on removed HTML elements.
  const pickupAddress = document.createElement("input");
  const city = document.createElement("input");
  const landmark = document.createElement("input");
  const businessName = document.getElementById("businessName");
  const pickupLocationText = document.getElementById("pickupLocationText");
  const profileImage = document.getElementById("profileImage");
  let providerPickupLoaded = false;

  async function loadProviderPickupProfile() {
    try {
      const response = await fetch("/api/provider/profile", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false || !data.profile) {
        throw new Error(data.message || "Unable to load your provider profile.");
      }

      const profile = data.profile;
      pickupAddress.value = String(profile.address || "").trim();
      city.value = String(profile.city || "").trim();
      landmark.value = "";
      providerPickupLoaded = Boolean(pickupAddress.value && city.value);

      const images = Array.isArray(profile.profile_images)
        ? profile.profile_images
        : profile.profile_image
          ? [profile.profile_image]
          : [];
      const profileImageUrl = images.find(
        (image) => typeof image === "string" && image.trim(),
      );

      if (profileImage && profileImageUrl) {
        profileImage.src = profileImageUrl;
      }

      if (businessName) {
        businessName.textContent = profile.business_name || "Business location";
      }

      if (pickupLocationText) {
        const location = [
          profile.address,
          profile.city,
          profile.state,
          profile.pincode,
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join(", ");
        pickupLocationText.textContent = location || "Set your location in Provider Profile";
      }
    } catch (error) {
      console.error("Provider pickup profile error:", error);
      if (businessName) businessName.textContent = "Provider profile required";
      if (pickupLocationText) {
        pickupLocationText.textContent = "Add your business address in Provider Profile";
      }
    }

    updateReadiness();
  }

  // Image
  const uploadArea = document.querySelector(".upload-area");
  const uploadContent = document.getElementById("uploadContent");
  const foodImage = document.getElementById("foodImage");

  // Progress
  const charCounter = document.querySelector(".char-counter");
  const completionBadge = document.querySelector(".completion-badge");

  const readinessScore = document.getElementById("readinessScore");
  const progressFill = document.getElementById("progressFill");

  // Checklist
  const foodNameCheck = document.getElementById("foodNameCheck");
  const categoryCheck = document.getElementById("categoryCheck");
  const quantityCheck = document.getElementById("quantityCheck");
  const prepCheck = document.getElementById("prepCheck");
  const expiryCheck = document.getElementById("expiryCheck");
  const imageCheck = document.getElementById("imageCheck");

  // Draft
  const draftStatus = document.getElementById("draftStatus");
  const saveDraftBtn = document.getElementById("saveDraftBtn");

  const draftNotification = document.getElementById("draftNotification");
  const restoreDraftBtn = document.getElementById("restoreDraftBtn");
  const discardDraftBtn = document.getElementById("discardDraftBtn");
  const draftTitle = document.querySelector(".draft-title");
  const draftTime = document.querySelector(".draft-time");
  const draftIcon = document.querySelector(".draft-icon i");

  /* =====================================================
   AI REVIEW - DOM ELEMENTS
===================================================== */

  const analyzeBtn = document.getElementById("analyzeWithAI");

  const stepOne = document.getElementById("stepOne");
  const stepTwo = document.getElementById("stepTwo");
  const stepThree = document.getElementById("stepThree");

  const aiLoadingScreen = document.getElementById("aiLoadingScreen");
  const smartPricingCard = document.getElementById("smartPricingCard");

  const loadingProgress = document.getElementById("loadingProgress");
  const loadingPercent = document.getElementById("loadingPercent");
  const loadingMessage = document.getElementById("loadingMessage");

  const backToEditBtn = document.getElementById("backToEditBtn");
  const publishListingBtn = document.getElementById("publishListingBtn");

  /* =====================================================
   PUBLISH PAGE
===================================================== */

  const backToReviewBtn = document.getElementById("backToReviewBtn");
  const finalPublishBtn = document.getElementById("finalPublishBtn");

  /* Dashboard */

  const confidenceScore = document.getElementById("confidenceScore");
  const qualityScore = document.getElementById("qualityScore");
  const safetyStatus = document.getElementById("safetyStatus");
  const mealCount = document.getElementById("mealCount");
  const carbonSaved = document.getElementById("carbonSaved");

  const priorityBadge = document.getElementById("priorityBadge");
  const priorityFill = document.getElementById("priorityFill");

  const aiRecommendation = document.getElementById("aiRecommendation");

  const originalPriceAI = document.getElementById("originalPriceAI");
  const suggestedPriceAI = document.getElementById("suggestedPriceAI");
  const pricingBadge = document.getElementById("pricingBadge");
  const discountPercent = document.getElementById("discountPercent");
  const pricingMessage = document.getElementById("pricingMessage");

  const overallScore = document.getElementById("overallScore");

  const recoveryProbability = document.getElementById("recoveryProbability");
  const pickupEstimate = document.getElementById("pickupEstimate");

  const previewFoodName = document.getElementById("previewFoodName");
  const previewCategory = document.getElementById("previewCategory");
  const previewListingImage = document.getElementById("previewListingImage");

  /* =====================================================
   PUBLISH PAGE ELEMENTS
===================================================== */

  // Listing Preview
  const publishPreviewImage = document.getElementById("publishPreviewImage");
  const publishFoodName = document.getElementById("publishFoodName");
  const publishCategory = document.getElementById("publishCategory");
  const publishPrice = document.getElementById("publishPrice");
  const publishMeals = document.getElementById("publishMeals");
  const publishPickup = document.getElementById("publishPickup");

  // Community Impact
  const publishMealsSaved = document.getElementById("publishMealsSaved");
  const publishCarbonSaved = document.getElementById("publishCarbonSaved");
  const publishRecovery = document.getElementById("publishRecovery");
  const publishWaste = document.getElementById("publishWaste");

  // Visibility
  const estimatedReach = document.getElementById("estimatedReach");

  const publishActionInfo = document.getElementById("publishActionInfo");

  const previewImage = document.getElementById("previewImage");
  const imageOverlay = document.getElementById("imageOverlay");
  const changeImageBtn = document.getElementById("changeImageBtn");
  const removeImageBtn = document.getElementById("removeImageBtn");

  const availabilityDate = document.getElementById("availabilityDate");
  const availabilityTime = document.getElementById("availabilityTime");

  /* =====================================================
   TOAST NOTIFICATION
===================================================== */

  const reserveToast = document.getElementById("reserveToast");
  const toastIcon = document.getElementById("toastIcon");
  const toastTitle = document.getElementById("toastTitle");
  const toastMessage = document.getElementById("toastMessage");
  const toastClose = document.getElementById("toastClose");

  let toastTimer = null;

  function showToast(message, type = "success", title = null) {
    if (!reserveToast) {
      return;
    }

    clearTimeout(toastTimer);

    if (type === "error") {
      toastIcon.className = "ri-error-warning-line";
      toastTitle.textContent = title || "Something went wrong";
    } else {
      toastIcon.className = "ri-check-line";
      toastTitle.textContent = title || "Success";
    }

    toastMessage.textContent = message;

    reserveToast.classList.add("show");

    toastTimer = setTimeout(() => {
      reserveToast.classList.remove("show");
    }, 3500);
  }

  if (toastClose) {
    toastClose.addEventListener("click", () => {
      clearTimeout(toastTimer);
      reserveToast.classList.remove("show");
    });
  }

  /* =====================================================
   AI ANALYSIS STATE
===================================================== */

  let aiResult = null;

  const loadingSteps = [
    "Reading food details...",
    "Analyzing food quality...",
    "Checking freshness...",
    "Evaluating food safety...",
    "Calculating recovery potential...",
    "Estimating carbon savings...",
    "Generating smart pricing...",
    "Preparing recommendations...",
    "Finalizing AI report...",
  ];

  /* ==========================================================
       HELPER FUNCTIONS
    ========================================================== */

  function show(element) {
    element.hidden = false;
  }

  function hide(element) {
    element.hidden = true;
  }

  /* ==========================================================
   DYNAMIC FIELDS
========================================================== */

  /* -------------------------
   Category
------------------------- */

  function toggleOtherCategory() {
    if (category.value === "Other") {
      show(otherCategoryGroup);

      otherCategory.disabled = false;
      otherCategory.required = true;
    } else {
      hide(otherCategoryGroup);

      otherCategory.value = "";
      otherCategory.required = false;
      otherCategory.disabled = true;
    }
  }

  /* -------------------------
   Unit
------------------------- */

  function toggleOtherUnit() {
    if (unit.value === "Other") {
      show(otherUnitGroup);

      otherUnit.disabled = false;
      otherUnit.required = true;
    } else {
      hide(otherUnitGroup);

      otherUnit.value = "";
      otherUnit.required = false;
      otherUnit.disabled = true;
    }
  }

  /* -------------------------
   Listing Type
------------------------- */

  function toggleListingType() {
    const isSell = listingType.value === "sell";

    if (isSell) {
      show(originalPriceGroup);
      show(sellingPriceGroup);

      sellingPrice.required = true;
    } else {
      hide(originalPriceGroup);
      hide(sellingPriceGroup);

      sellingPrice.required = false;
    }
  }

  // Number fields are easy to alter accidentally while scrolling the page.
  // Keep entered values stable unless the provider deliberately types a new one.
  [quantity, originalPrice, sellingPrice].forEach((field) => {
    field.addEventListener(
      "wheel",
      (event) => {
        if (document.activeElement === field) {
          event.preventDefault();
          field.blur();
        }
      },
      { passive: false },
    );
  });

  /* ==========================================================
   EXPIRY HANDLING
========================================================== */

  function toggleExpiryFields() {
    if (hasExpiry.checked) {
      // Packaged Food

      hide(preparationGroup);
      show(expiryGroup);
      show(availableUntilGroup);

      preparationTime.required = false;
      preparationTime.disabled = true;

      expiryDate.required = true;
      expiryDate.disabled = false;

      availableUntil.required = true;
      availableUntil.disabled = false;

      preparationTime.value = "";
    } else {
      // Freshly Prepared Food

      show(preparationGroup);
      hide(expiryGroup);
      show(availableUntilGroup);

      preparationTime.required = true;
      preparationTime.disabled = false;

      expiryDate.required = false;
      expiryDate.disabled = true;

      availableUntil.required = true;
      availableUntil.disabled = false;

      expiryDate.value = "";
    }
  }

  /* ==========================================================
   CHARACTER COUNTER
========================================================== */

  function updateCharacterCounter() {
    const length = description.value.length;

    charCounter.textContent = `${length} / 300`;
  }

  function updateInstructionCounter() {
    if (instructionCount) {
      instructionCount.textContent = pickupInstructions.value.length;
    }
  }

  /* ==========================================================
   FOOD INFORMATION COMPLETION
========================================================== */

  function updateCompletionBadge() {
    let completed = 0;

    if (foodName.value.trim() !== "") completed++;

    if (category.value !== "") completed++;

    if (foodType.value !== "") completed++;

    if (description.value.trim() !== "") completed++;

    completionBadge.textContent = `${completed}/4 Complete`;

    if (completed === 4) {
      completionBadge.classList.add("completed");
    } else {
      completionBadge.classList.remove("completed");
    }
  }

  /* ==========================================================
   READINESS HELPERS
========================================================== */

  function updateChecklistItem(element, completed) {
    if (!element) return;

    element.classList.toggle("completed", completed);
    element.classList.toggle("pending", !completed);

    const icon = element.querySelector("i");

    if (icon) {
      icon.className = completed
        ? "ri-checkbox-circle-fill"
        : "ri-checkbox-circle-line";
    }
  }

  /* ==========================================================
   READINESS SCORE
========================================================== */

  function updateReadiness() {
    const checks = {
      // 1. Food Details
      foodDetails: foodName.value.trim() !== "" && category.value !== "",

      // 2. Food Description
      description: description.value.trim().length >= 20,

      // 3. Food Images
      image: foodImage.files.length > 0 || existingImageUrl !== "",

      // 4. Quantity & Unit
      quantityUnit:
        quantity.value.trim() !== "" &&
        unit.value !== "" &&
        (unit.value !== "Other" || otherUnit.value.trim() !== ""),

      // 5. Expiry / Best Before
      expiry:
        availableUntil.value !== "" &&
        (hasExpiry.checked
          ? expiryDate.value !== ""
          : preparationTime.value !== ""),

      // 6. Pricing & Listing Type
      pricing:
        listingType.value !== "" &&
        (listingType.value === "donate" ||
          (originalPrice.value !== "" &&
            sellingPrice.value !== "" &&
            Number(sellingPrice.value) > 0)),
    };

    // Update the visual checklist items. Pickup location belongs to the
    // provider profile and is intentionally excluded from AI readiness.
    updateChecklistItem(foodNameCheck, checks.foodDetails);
    updateChecklistItem(categoryCheck, checks.description);
    updateChecklistItem(quantityCheck, checks.image);
    updateChecklistItem(prepCheck, checks.quantityUnit);
    updateChecklistItem(expiryCheck, checks.expiry);
    updateChecklistItem(imageCheck, checks.pricing);

    // Calculate score
    const total = Object.keys(checks).length;
    const completed = Object.values(checks).filter(Boolean).length;
    const percent = Math.round((completed / total) * 100);

    // Update percentage
    readinessScore.textContent = `${percent}%`;

    // Update progress bar
    progressFill.style.width = `${percent}%`;

    // Update the completed counter
    const readinessCompleted = document.getElementById("readinessCompleted");

    if (readinessCompleted) {
      readinessCompleted.textContent = completed;
    }
  }

  /* ==========================================================
   IMAGE UPLOAD
========================================================== */

  function previewSelectedImage(file) {
    if (!file) return;
    uploadArea.classList.remove("dragging");

    /* ---------- Allowed Types ---------- */

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showToast(
        "Only JPG, PNG and WEBP images are allowed.",
        "error",
        "Invalid Image",
      );

      foodImage.value = "";

      return;
    }

    /* ---------- Maximum Size ---------- */

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      showToast("Maximum file size is 5 MB.", "error", "Image Too Large");

      foodImage.value = "";

      return;
    }

    /* ---------- Preview ---------- */

    const reader = new FileReader();

    reader.onload = function (event) {
      previewImage.src = event.target.result;
      updatePreviewCard();

      uploadContent.style.display = "none";

      previewImage.classList.add("show");

      imageOverlay.classList.remove("hidden");

      updateReadiness();
    };

    reader.readAsDataURL(file);
  }

  foodImage.addEventListener("change", () => {
    const file = foodImage.files[0];

    previewSelectedImage(file);
  });

  uploadArea.addEventListener("dragover", (event) => {
    event.preventDefault();

    uploadArea.classList.add("dragging");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragging");
  });

  uploadArea.addEventListener("drop", (event) => {
    event.preventDefault();

    uploadArea.classList.remove("dragging");

    const file = event.dataTransfer.files[0];

    if (!file) return;

    const dataTransfer = new DataTransfer();

    dataTransfer.items.add(file);

    foodImage.files = dataTransfer.files;

    previewSelectedImage(file);
  });

  changeImageBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    foodImage.click();
  });

  removeImageBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    foodImage.value = "";

    existingImageUrl = "";

    previewImage.src = "";
    updatePreviewCard();

    previewImage.classList.remove("show");

    uploadContent.style.display = "flex";

    updateReadiness();
  });

  async function saveDraft() {
    const hasData = [
      foodName.value.trim(),
      category.value,
      otherCategory.value.trim(),
      foodType.value,
      description.value.trim(),
      quantity.value,
      unit.value,
      otherUnit.value.trim(),
      originalPrice.value,
      sellingPrice.value,
      preparationTime.value,
      expiryDate.value,
      availableUntil.value,
      pickupAddress.value.trim(),
      city.value,
      landmark.value,
      pickupInstructions.value,
      foodImage.files.length > 0,
    ].some(Boolean);

    if (!hasData) {
      updateDraftStatus("No Draft", "Nothing to save", "ri-file-add-line");
      return;
    }

    // Save image as temporary data URL
    let imageData = "";

    if (foodImage.files.length > 0) {
      imageData = await new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve("");

        reader.readAsDataURL(foodImage.files[0]);
      });
    }

    const draft = {
      foodName: foodName.value,
      category: category.value,
      otherCategory: otherCategory.value,
      foodType: foodType.value,
      description: description.value,
      listingType: listingType.value,
      quantity: quantity.value,
      unit: unit.value,
      otherUnit: otherUnit.value,
      originalPrice: originalPrice.value,
      sellingPrice: sellingPrice.value,
      hasExpiry: hasExpiry.checked,
      preparationTime: preparationTime.value,
      expiryDate: expiryDate.value,
      availableUntil: availableUntil.value,
      pickupAddress: pickupAddress.value,
      city: city.value,
      landmark: landmark.value,
      pickupInstructions: pickupInstructions.value,

      // NEW
      imageData: imageData,
    };

    localStorage.setItem("reserveListingDraft", JSON.stringify(draft));

    draftSaved = true;

    draftNotification.classList.remove("hidden");

    updateDraftStatus(
      "Draft Saved",
      `Last saved at ${new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`,
      "ri-checkbox-circle-fill",
    );
  }

  async function loadDraft() {
    const savedDraft = localStorage.getItem("reserveListingDraft");

    if (!savedDraft) return;

    const draft = JSON.parse(savedDraft);

    foodName.value = draft.foodName || "";
    category.value = draft.category || "";
    otherCategory.value = draft.otherCategory || "";
    foodType.value = draft.foodType || "";
    description.value = draft.description || "";
    listingType.value = draft.listingType || "donate";
    quantity.value = draft.quantity || "";
    unit.value = draft.unit || "";
    otherUnit.value = draft.otherUnit || "";
    originalPrice.value = draft.originalPrice || "";
    sellingPrice.value = draft.sellingPrice || "";
    hasExpiry.checked = draft.hasExpiry || false;
    preparationTime.value = draft.preparationTime || "";
    expiryDate.value = draft.expiryDate || "";
    availableUntil.value = draft.availableUntil || "";
    pickupInstructions.value = draft.pickupInstructions || "";
    updateInstructionCounter();

    // Restore image
    if (draft.imageData) {
      const response = await fetch(draft.imageData);
      const blob = await response.blob();

      const file = new File([blob], "restored-food-image.jpg", {
        type: blob.type || "image/jpeg",
      });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      foodImage.files = dataTransfer.files;

      existingImageUrl = draft.imageData;

      previewImage.src = draft.imageData;
      previewImage.classList.add("show");

      uploadContent.style.display = "none";
      imageOverlay.classList.remove("hidden");
    }

    toggleOtherCategory();
    toggleOtherUnit();
    toggleListingType();
    toggleExpiryFields();

    updateCharacterCounter();
    updateCompletionBadge();
    updateReadiness();
    updatePreviewCard();
    updateAvailabilitySummary();
  }

  let draftSaved = false;
  let draftImageData = "";

  function markDraftUnsaved() {
    const hasData = [
      foodName.value.trim(),
      category.value,
      otherCategory.value.trim(),
      foodType.value,
      description.value.trim(),
      quantity.value,
      unit.value,
      otherUnit.value.trim(),
      originalPrice.value,
      sellingPrice.value,
      preparationTime.value,
      expiryDate.value,
      availableUntil.value,
      pickupAddress.value.trim(),
      city.value.trim(),
      landmark.value.trim(),
      pickupInstructions.value,
      foodImage.files.length,
    ].some(Boolean);

    if (!hasData) {
      updateDraftStatus(
        "No Draft",
        "Start creating a new listing",
        "ri-file-add-line",
      );
      draftSaved = false;
      return;
    }

    draftSaved = false;

    updateDraftStatus(
      "Unsaved Changes",
      "Changes haven't been saved yet",
      "ri-time-line",
    );
  }

  /* ==========================================================
   FORM VALIDATION HELPERS
========================================================== */

  function showError(input, message) {
    clearError(input);

    input.classList.add("input-error");

    const error = document.createElement("small");

    error.className = "error-message";

    error.textContent = message;

    input.parentElement.appendChild(error);
  }

  function clearError(input) {
    input.classList.remove("input-error");

    const error = input.parentElement.querySelector(".error-message");

    if (error) {
      error.remove();
    }
  }

  function clearAllErrors() {
    form.querySelectorAll(".input-error").forEach((input) => {
      input.classList.remove("input-error");
    });

    form.querySelectorAll(".error-message").forEach((error) => {
      error.remove();
    });
  }

  saveDraftBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    await saveDraft();
  });

  /* ==========================================================
   FORM VALIDATION
========================================================== */

  function validateForm() {
    clearAllErrors();

    let isValid = true;
    let firstInvalidField = null;

    function invalidate(input, message) {
      showError(input, message);

      if (!firstInvalidField) {
        firstInvalidField = input;
      }

      isValid = false;
    }

    /* -------------------------
       Food Information
    ------------------------- */

    if (foodName.value.trim() === "") {
      invalidate(foodName, "Food name is required.");
    }

    if (category.value === "") {
      invalidate(category, "Please select a category.");
    }

    if (category.value === "Other" && otherCategory.value.trim() === "") {
      invalidate(otherCategory, "Please enter the category.");
    }

    if (foodType.value === "") {
      invalidate(foodType, "Please select food type.");
    }

    if (description.value.trim() === "") {
      invalidate(description, "Description is required.");
    } else if (description.value.trim().length < 20) {
      invalidate(description, "Description should be at least 20 characters.");
    }

    /* -------------------------
       Quantity
    ------------------------- */

    if (quantity.value === "" || Number(quantity.value) <= 0) {
      invalidate(quantity, "Enter a valid quantity.");
    }

    if (unit.value === "") {
      invalidate(unit, "Please select a unit.");
    }

    if (unit.value === "Other" && otherUnit.value.trim() === "") {
      invalidate(otherUnit, "Please enter the unit.");
    }

    /* -------------------------
       Pricing
    ------------------------- */

    if (listingType.value === "sell") {
      if (originalPrice.value === "" || Number(originalPrice.value) <= 0) {
        invalidate(originalPrice, "Enter original price.");
      }

      if (sellingPrice.value === "" || Number(sellingPrice.value) <= 0) {
        invalidate(sellingPrice, "Enter selling price.");
      }

      if (Number(sellingPrice.value) > Number(originalPrice.value)) {
        invalidate(sellingPrice, "Selling price cannot exceed original price.");
      }
    }

    /* -------------------------
   Availability
------------------------- */

    if (hasExpiry.checked) {
      if (expiryDate.value === "") {
        invalidate(expiryDate, "Select expiry date.");
      } else {
        const expiry = new Date(expiryDate.value);
        const now = new Date();

        if (expiry <= now) {
          invalidate(expiryDate, "Expiry date and time must be in the future.");
        }
      }
    } else {
      if (preparationTime.value === "") {
        invalidate(preparationTime, "Select preparation time.");
      }
    }

    if (availableUntil.value === "") {
      invalidate(availableUntil, "Select availability time.");
    } else {
      const availableDate = new Date(availableUntil.value);
      const now = new Date();

      if (availableDate <= now) {
        invalidate(
          availableUntil,
          "Pickup availability must be in the future.",
        );
      }

      // Available Until must be after Preparation Time
      if (
        preparationTime.value &&
        availableDate <= new Date(preparationTime.value)
      ) {
        invalidate(
          availableUntil,
          "Pickup availability must be later than preparation time.",
        );
      }
    }

    /* ADD / KEEP THIS HERE */
    if (expiryDate.value && availableUntil.value) {
      const expiry = new Date(expiryDate.value);
      const availableUntilDate = new Date(availableUntil.value);

      if (availableUntilDate > expiry) {
        invalidate(
          availableUntil,
          "Pickup availability cannot be later than the food expiry time.",
        );
      }
    }

    /* -------------------------
       Pickup
    ------------------------- */

    if (!providerPickupLoaded) {
      showToast(
        "Add a complete business address in your Provider Profile before publishing.",
        "error",
        "Pickup Location Required",
      );
      isValid = false;
    }

    /* -------------------------
       Image
    ------------------------- */
    if (foodImage.files.length === 0 && !existingImageUrl) {
      showToast("Please upload a food image.", "error", "Image Required");

      isValid = false;
    }

    /* -------------------------
       Focus First Error
    ------------------------- */

    if (firstInvalidField) {
      firstInvalidField.focus();

      firstInvalidField.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    return isValid;
  }

  restoreDraftBtn.addEventListener("click", async () => {
    await loadDraft();
    updatePreviewCard();

    draftNotification.classList.add("hidden");

    updateDraftStatus(
      "Draft Restored",

      "Continue editing your listing",

      "ri-draft-line",
    );
    draftSaved = true;
  });

  discardDraftBtn.addEventListener("click", () => {
    localStorage.removeItem("reserveListingDraft");

    draftSaved = false;

    form.reset();

    pickupInstructions.value = "";

    foodImage.value = "";

    existingImageUrl = "";

    previewImage.src = "";

    previewImage.classList.remove("show");

    uploadContent.style.display = "flex";

    imageOverlay.classList.add("hidden");

    toggleOtherCategory();
    toggleOtherUnit();
    toggleListingType();
    toggleExpiryFields();

    updateCharacterCounter();
    updateCompletionBadge();
    updateReadiness();
    updatePreviewCard();
    updateAvailabilitySummary();

    draftNotification.classList.add("hidden");

    updateDraftStatus(
      "No Draft",

      "Start creating a new listing",

      "ri-file-add-line",
    );
  });

  function updateDraftStatus(title, subtitle, icon = "ri-time-line") {
    draftTitle.textContent = title;

    draftTime.textContent = subtitle;

    draftIcon.className = icon;
  }

  /* =====================================================
   INITIALIZE AI
===================================================== */

  function initializeAIReview() {
    if (stepTwo) {
      stepTwo.hidden = true;
    }

    if (aiLoadingScreen) {
      aiLoadingScreen.style.display = "flex";
    }
  }

  initializeAIReview();

  /* =====================================================
   LOAD LISTING FOR EDIT MODE
===================================================== */

  async function loadListingForEdit() {
    if (!editMode || !editListingId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/listings/${encodeURIComponent(editListingId)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "same-origin",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        showToast(
          data.message || "Your session has expired. Please login again.",
          "error",
          "Session Expired",
        );

        window.location.href = "/login";

        return;
      }

      if (!response.ok || !data.success || !data.listing) {
        throw new Error(data.message || "Unable to load listing.");
      }

      const listing = data.listing;

      window.editOriginalPickupStart =
        listing.pickup_start || new Date().toISOString();

      window.editExistingFreshnessScore = Number(listing.freshness_score) || 0;

      window.editExistingRecoveryProbability =
        Number(listing.recovery_probability) || 0;

      window.editExistingCarbonSaved = Number(listing.carbon_saved) || 0;

      window.editExistingAIRecommendation = listing.ai_recommendation || "";

      /* =================================================
       BASIC INFORMATION
    ================================================= */

      foodName.value = listing.food_title || "";

      foodType.value = listing.food_type || "";

      description.value = listing.description || "";

      /* =================================================
       CATEGORY
    ================================================= */

      const categoryExists = Array.from(category.options).some(
        (option) => option.value === listing.category,
      );

      if (categoryExists) {
        category.value = listing.category;
        otherCategory.value = "";
      } else {
        category.value = "Other";
        otherCategory.value = listing.category || "";
      }

      /* =================================================
       LISTING TYPE
    ================================================= */

      listingType.value = listing.listing_type || "sell";

      /* =================================================
       QUANTITY
    ================================================= */

      quantity.value =
        listing.quantity !== undefined && listing.quantity !== null
          ? listing.quantity
          : "";

      /* =================================================
       UNIT
    ================================================= */

      const unitExists = Array.from(unit.options).some(
        (option) => option.value === listing.unit,
      );

      if (unitExists) {
        unit.value = listing.unit;
        otherUnit.value = "";
      } else {
        unit.value = "Other";
        otherUnit.value = listing.unit || "";
      }

      /* =================================================
       PRICE
    ================================================= */

      originalPrice.value = Number(listing.original_price) || 0;

      sellingPrice.value = Number(listing.discounted_price) || 0;

      /* =================================================
       EXPIRY
    ================================================= */

      const hasRealExpiry =
        listing.expiry_date &&
        listing.pickup_end &&
        String(listing.expiry_date) !== String(listing.pickup_end);

      hasExpiry.checked = Boolean(hasRealExpiry);

      if (hasRealExpiry) {
        expiryDate.value = toDateTimeLocal(listing.expiry_date);
      } else {
        expiryDate.value = "";
      }

      availableUntil.value = toDateTimeLocal(listing.pickup_end);

      /* =================================================
       PICKUP INFORMATION
    ================================================= */

      pickupInstructions.value = listing.pickup_instructions || "";
      updateInstructionCounter();

      /* =================================================
       EXISTING IMAGE
    ================================================= */

      existingImageUrl = listing.image || "";

      if (existingImageUrl) {
        previewImage.src = existingImageUrl;

        previewImage.classList.add("show");

        uploadContent.style.display = "none";

        imageOverlay.classList.remove("hidden");
      }

      /* =================================================
       UI
    ================================================= */

      toggleOtherCategory();
      toggleOtherUnit();
      toggleListingType();
      toggleExpiryFields();

      updateCharacterCounter();
      updateCompletionBadge();
      updateReadiness();
      updatePreviewCard();
      updateAvailabilitySummary();

      /* =================================================
       EDIT PAGE TEXT
    ================================================= */

      const pageTitle = document.querySelector(".page-header h1");

      const pageDescription = document.querySelector(".page-header p");

      if (pageTitle) {
        pageTitle.textContent = "Edit Listing";
      }

      if (pageDescription) {
        pageDescription.textContent =
          "Update your food listing details and keep your information accurate.";
      }

      /* Stepper */

      const firstStepTitle = document.querySelector(
        ".progress-steps .step:first-child h4",
      );

      const firstStepDescription = document.querySelector(
        ".progress-steps .step:first-child span",
      );

      if (firstStepTitle) {
        firstStepTitle.textContent = "Edit Listing";
      }

      if (firstStepDescription) {
        firstStepDescription.textContent = "Update Food Details";
      }

      /* Main action */

      if (analyzeBtn) {
        analyzeBtn.innerHTML = '<i class="ri-save-line"></i> Save Changes';
      }

      /* File input is optional because old image exists */

      if (foodImage) {
        foodImage.removeAttribute("required");
      }

      /* Hide draft notification in edit mode */

      if (draftNotification) {
        draftNotification.classList.add("hidden");
      }

      updateDraftStatus(
        "Editing Listing",
        "Changes will update the existing listing",
        "ri-edit-line",
      );

      console.log("Editing listing:", listing);
    } catch (error) {
      console.error("Load Edit Listing Error:", error);

      showToast(
        error.message || "Unable to load listing for editing.",
        "error",
        "Unable to Load Listing",
      );

      window.location.href = "/my-listings";
    }
  }

  /* =====================================================
   DATETIME LOCAL FORMAT
===================================================== */

  function toDateTimeLocal(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    const hours = String(date.getHours()).padStart(2, "0");

    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /* =====================================================
   GET BASE PICKUP ADDRESS
===================================================== */

  function getBasePickupAddress(address, landmarkValue, cityValue) {
    let result = String(address || "").trim();

    const suffixParts = [landmarkValue, cityValue]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (suffixParts.length === 0) {
      return result;
    }

    const suffix = suffixParts.join(", ");

    if (result.endsWith(`, ${suffix}`)) {
      result = result.slice(0, -`, ${suffix}`.length);
    }

    return result.trim();
  }

  /* =====================================================
   EVENT LISTENERS
===================================================== */

  if (analyzeBtn) {
    analyzeBtn.addEventListener(
      "click",
      editMode ? updateExistingListing : startAIAnalysis,
    );
  }

  if (backToEditBtn) {
    backToEditBtn.addEventListener("click", backToEdit);
  }

  if (publishListingBtn) {
    publishListingBtn.addEventListener("click", showPublishPage);

    if (backToReviewBtn) {
      backToReviewBtn.addEventListener("click", () => {
        stepThree.hidden = true;
        stepTwo.hidden = false;

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
    }
  }

  if (finalPublishBtn) {
    finalPublishBtn.addEventListener("click", publishListing);
  }

  /* =====================================================
   PLACEHOLDER FUNCTIONS
===================================================== */

  /* =====================================================
   START AI ANALYSIS
===================================================== */

  async function startAIAnalysis() {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML =
      '<i class="ri-loader-4-line ri-spin"></i> Analyzing...';

    if (!validateForm()) {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="ri-brain-line"></i> Analyze with AI';
      return;
    }

    // Save latest draft
    await saveDraft();

    // Switch to AI Review
    stepOne.hidden = true;
    stepTwo.hidden = false;

    stepTwo.classList.add("ai-analyzing");
    document.body.classList.add("ai-analysis-running");

    // Reset loading screen
    resetLoadingScreen();

    // Allow browser to render the loading UI
    // Give browser time to paint the loading screen
    await new Promise((resolve) => setTimeout(resolve, 100));

    await runLoadingAnimation();

    aiResult = generateAnalysis();

    updateDashboard(aiResult);

    hideLoadingScreen();

    analyzeBtn.disabled = false;

    analyzeBtn.innerHTML = '<i class="ri-brain-line"></i> Analyze with AI';
  }

  function backToEdit() {
    stepTwo.hidden = true;

    stepOne.hidden = false;

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function showPublishPage() {
    populatePublishPage();

    stepTwo.hidden = true;

    stepThree.hidden = false;

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =====================================================
   POPULATE PUBLISH PAGE
===================================================== */

  function populatePublishPage() {
    // Listing Preview
    publishFoodName.textContent = foodName.value || "Food Name";

    publishCategory.textContent =
      category.value === "Other" ? otherCategory.value : category.value;

    // Price
    if (listingType.value === "sell") {
      publishPrice.textContent = "₹" + (sellingPrice.value || "0");
    } else {
      publishPrice.textContent = "Donation";
    }

    // Meals
    if (aiResult) {
      publishMeals.textContent = `${aiResult.metrics.meals} Meals`;

      publishMealsSaved.textContent = aiResult.metrics.meals;

      publishCarbonSaved.textContent = `${aiResult.metrics.carbon} kg`;

      publishRecovery.textContent = `${aiResult.confidence.recovery}%`;

      publishWaste.textContent = `${aiResult.metrics.meals} Meals`;

      estimatedReach.textContent = `${Math.max(aiResult.metrics.meals * 4, 25)}+ People`;

      publishPickup.textContent = aiResult.confidence.pickupEstimate;
    }

    // Image
    if (previewImage.src && previewImage.src !== window.location.href) {
      publishPreviewImage.src = previewImage.src;

      publishPreviewImage.style.display = "block";

      const placeholder =
        publishPreviewImage.parentElement.querySelector(".image-placeholder");

      if (placeholder) {
        placeholder.style.display = "none";
      }
    }
  }

  /* =====================================================
   BACKEND PUBLISH HELPERS
===================================================== */

  async function uploadListingImage() {
    const file = foodImage.files[0];

    if (!file) {
      throw new Error("Food image is required.");
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/upload-image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to upload the food image.");
    }

    return data.image_url;
  }

  function buildListingPayload(imageUrl) {
    const selectedCategory =
      category.value === "Other" ? otherCategory.value.trim() : category.value;

    const selectedUnit =
      unit.value === "Other" ? otherUnit.value.trim() : unit.value;

    const isDonation = listingType.value === "donate";

    const addressParts = [
      pickupAddress.value.trim(),
      landmark.value.trim(),
      city.value.trim(),
    ].filter(Boolean);

    const freshnessScore =
      aiResult?.insights?.find((item) => item.title === "Freshness")?.score ||
      0;

    const recoveryProbability = aiResult?.confidence?.recovery || 0;

    const carbonSaved = aiResult?.metrics?.carbon || 0;

    const aiRecommendation = aiResult?.recommendation || "";

    return {
      food_title: foodName.value.trim(),

      category: selectedCategory,

      food_type: foodType.value,

      listing_type: listingType.value,

      quantity: Number(quantity.value),

      unit: selectedUnit,

      original_price: isDonation ? 0 : Number(originalPrice.value || 0),

      discounted_price: isDonation ? 0 : Number(sellingPrice.value || 0),

      expiry_date: hasExpiry.checked ? expiryDate.value : availableUntil.value,

      pickup_start: new Date().toISOString(),

      pickup_end: availableUntil.value,

      address: addressParts.join(", "),

      city: city.value.trim(),

      landmark: landmark.value.trim(),

      pickup_instructions: pickupInstructions.value.trim(),

      description: description.value.trim(),

      image: imageUrl,

      freshness_score: freshnessScore,

      recovery_probability: recoveryProbability,

      carbon_saved: carbonSaved,

      ai_recommendation: aiRecommendation,
    };
  }

  /* =====================================================
   FINAL PUBLISH
===================================================== */

  async function publishListing() {
    if (finalPublishBtn.dataset.state === "published") {
      return;
    }

    finalPublishBtn.disabled = true;
    backToReviewBtn.disabled = true;

    finalPublishBtn.innerHTML =
      '<i class="ri-loader-4-line ri-spin"></i> Publishing...';

    try {
      /* =================================================
       1. Make sure AI analysis exists
    ================================================= */

      if (!aiResult) {
        aiResult = generateAnalysis();
        updateDashboard(aiResult);
      }

      /* =================================================
       2. Upload image
    ================================================= */

      finalPublishBtn.innerHTML =
        '<i class="ri-loader-4-line ri-spin"></i> Uploading Image...';

      const imageUrl = await uploadListingImage();

      /* =================================================
       3. Build listing payload
    ================================================= */

      const listingData = buildListingPayload(imageUrl);

      console.log("Listing payload:", listingData);

      /* =================================================
       4. Save listing to Flask + MongoDB
    ================================================= */

      finalPublishBtn.innerHTML =
        '<i class="ri-loader-4-line ri-spin"></i> Saving Listing...';

      const response = await fetch("/api/listings", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(listingData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.missing_fields
            ? `${data.message}\nMissing: ${data.missing_fields.join(", ")}`
            : data.message || "Unable to publish the listing.",
        );
      }

      console.log("Listing created:", data);

      /* =================================================
       5. Remove saved draft
    ================================================= */

      localStorage.removeItem("reserveListingDraft");

      draftSaved = false;

      /* =================================================
       6. Show success UI
    ================================================= */

      const now = new Date();

      const time = now.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });

      const date = now.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      publishHeroBadge.innerHTML =
        '<span class="publish-badge-dot"></span> LIVE ON LISTINGS';

      publishHeroTitle.textContent = "Listing Published Successfully";

      publishHeroDescription.textContent = `"${foodName.value}" is now available for nearby recipients. You can manage, edit or pause this listing anytime from My Listings.`;

      publishPreviewStatus.textContent = "LIVE";

      confirmationTitle.textContent = "Successfully Published";

      confirmationDescription.innerHTML =
        "Your listing has been published successfully and is now visible to nearby families, NGOs and community kitchens. You can manage or update it anytime from <strong>My Listings</strong>.";

      publishTime.hidden = false;

      publishTime.innerHTML = `Published: <strong>${date} • ${time}</strong>`;

      publishActionInfo.innerHTML =
        '<i class="ri-checkbox-circle-fill"></i> Listing is now live';

      /* =================================================
       7. Change publish button
    ================================================= */

      finalPublishBtn.innerHTML =
        '<i class="ri-checkbox-circle-fill"></i> Published';

      finalPublishBtn.style.background = "#16a34a";

      backToReviewBtn.innerHTML =
        '<i class="ri-arrow-left-line"></i> View AI Review';

      finalPublishBtn.dataset.state = "published";

      /* =================================================
       8. Reset after success
    ================================================= */

      setTimeout(() => {
        resetCreateListing();
      }, 3000);
    } catch (error) {
      console.error("Publish listing error:", error);

      showToast(
        error.message || "Unable to publish the listing. Please try again.",
        "error",
        "Publishing Failed",
      );

      finalPublishBtn.disabled = false;
      backToReviewBtn.disabled = false;

      finalPublishBtn.innerHTML =
        '<i class="ri-rocket-2-fill"></i> Publish to Listings';
    }
  }

  /* =====================================================
   RESET LOADING
===================================================== */

  function resetLoadingScreen() {
    aiLoadingScreen.style.display = "flex";

    loadingProgress.style.width = "0%";

    loadingPercent.textContent = "0%";

    loadingMessage.textContent = loadingSteps[0];
  }

  /* =====================================================
   AI LOADING ANIMATION
===================================================== */

  function runLoadingAnimation() {
    return new Promise((resolve) => {
      let progress = 0;

      let messageIndex = 0;

      const interval = setInterval(() => {
        progress++;

        loadingProgress.style.width = progress + "%";

        loadingPercent.textContent = progress + "%";

        // Change loading message
        const step = Math.floor(progress / 12);

        if (step !== messageIndex && step < loadingSteps.length) {
          messageIndex = step;

          loadingMessage.textContent = loadingSteps[step];
        }

        if (progress >= 100) {
          clearInterval(interval);

          setTimeout(resolve, 600);
        }
      }, 35);
    });
  }

  /* =====================================================
   HIDE LOADING
===================================================== */

  function hideLoadingScreen() {
    aiLoadingScreen.style.opacity = "0";

    setTimeout(() => {
      // Hide loading screen
      aiLoadingScreen.style.display = "none";
      aiLoadingScreen.style.opacity = "1";

      // IMPORTANT:
      // Remove analyzing state so AI Review page becomes visible
      stepTwo.classList.remove("ai-analyzing");
      document.body.classList.remove("ai-analysis-running");

      // Start AI Review page from the top
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, 400);
  }

  /* =====================================================
   AI REVIEW ENGINE
===================================================== */

  const AI_LIMITS = Object.freeze({
    max: 100,
    excellent: 90,
    good: 75,
    fair: 50,
    mealWeightKg: 0.35,
    carbonPerMealKg: 0.32,
    minimumDiscount: 0.1,
    maximumDiscount: 0.6,
  });
  const AI_WEIGHTS = Object.freeze({
    recovery: {
      freshness: 0.4,
      pricing: 0.25,
      pickup: 0.2,
      completeness: 0.15,
    },
    overall: {
      freshness: 0.2,
      quality: 0.2,
      completeness: 0.15,
      safety: 0.1,
      image: 0.05,
      description: 0.05,
      pricing: 0.1,
      pickup: 0.05,
      recovery: 0.05,
      confidence: 0.05,
    },
  });
  const clampScore = (value) =>
    Math.max(0, Math.min(AI_LIMITS.max, Math.round(Number(value) || 0)));
  const hoursUntil = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? null
      : (date.getTime() - Date.now()) / 3600000;
  };
  const safetyFor = (freshness) =>
    freshness >= 95
      ? "Excellent"
      : freshness >= 85
        ? "Good"
        : freshness >= AI_LIMITS.good
          ? "Consume Today"
          : freshness >= 55
            ? "Consume Soon"
            : freshness >= 40
              ? "Needs Review"
              : "Unsafe";
  const getDescriptionScore = (text) => Math.min(AI_LIMITS.max, text.length);
  const getImageScore = (hasImage) => (hasImage ? AI_LIMITS.max : 20);
  const getStatusColor = (score) =>
    score >= AI_LIMITS.excellent
      ? "#22c55e"
      : score >= AI_LIMITS.good
        ? "#3b82f6"
        : score >= AI_LIMITS.fair
          ? "#f59e0b"
          : "#ef4444";

  function calculateCompleteness(data) {
    const hasFoodTiming = Boolean(data.expiryDate || data.preparationTime);
    const fields = [
      data.category,
      data.description.length >= 20,
      data.quantity > 0,
      data.unit,
      hasFoodTiming,
      data.availableUntil,
      data.pickupAddress.length >= 10,
      data.city,
      data.landmark,
      data.pickupInstructions,
      data.hasImage,
      data.listingType,
    ];
    return fields.filter(Boolean).length / fields.length;
  }

  function calculatePickupWindow(data, freshness) {
    const hours = hoursUntil(data.availableUntil);
    const windowScore =
      hours === null
        ? 40
        : hours <= 0
          ? 20
          : hours <= 1
            ? 55
            : hours <= 2
              ? 70
              : hours <= 12
                ? 82
                : 92;
    const urgency = clampScore(
      (AI_LIMITS.max - freshness) * 0.65 + (AI_LIMITS.max - windowScore) * 0.35,
    );
    if (hours !== null && hours <= 0.5)
      return {
        score: windowScore,
        urgency,
        estimate: "Within 20 - 30 min",
        status: "Immediate",
      };
    if (hours !== null && hours <= 1)
      return {
        score: windowScore,
        urgency,
        estimate: "Within 1 hour",
        status: "Immediate",
      };
    if (hours !== null && hours <= 2)
      return {
        score: windowScore,
        urgency,
        estimate: "Within 2 hours",
        status: "Scheduled",
      };
    if (hours !== null && hours <= 12)
      return {
        score: windowScore,
        urgency,
        estimate: "Pickup today",
        status: "Scheduled",
      };
    return {
      score: windowScore,
      urgency,
      estimate: "Tomorrow morning",
      status: "Flexible",
    };
  }

  function generateAnalysis() {
    return analyzeListing({
      category: category.value,
      foodType: foodType.value,
      description: description.value.trim(),
      quantity: Number(quantity.value),
      unit: unit.value === "Other" ? otherUnit.value : unit.value,
      originalPrice:
        Number(originalPrice.value) || Number(sellingPrice.value) || 0,
      expiryDate: hasExpiry.checked ? expiryDate.value : "",
      preparationTime: preparationTime.value,
      availableUntil: availableUntil.value,
      pickupAddress: pickupAddress.value.trim(),
      hasImage: foodImage.files.length > 0 || existingImageUrl !== "",
      listingType: listingType.value,
      city: city.value,
      landmark: landmark.value,
      pickupInstructions: pickupInstructions.value,
    });
  }

  function calculateFreshness(data) {
    const hours = hoursUntil(data.expiryDate || data.availableUntil);
    const preparedHoursAgo = hoursUntil(data.preparationTime);
    const remainingScore =
      hours === null
        ? 72
        : hours <= 0
          ? 20
          : hours <= 2
            ? 48
            : hours <= 6
              ? 66
              : hours <= 12
                ? 80
                : hours <= 24
                  ? 90
                  : 96;
    const preparationPenalty =
      preparedHoursAgo !== null && preparedHoursAgo < 0
        ? Math.min(18, Math.abs(preparedHoursAgo) * 0.75)
        : 0;
    return clampScore(remainingScore - preparationPenalty);
  }

  function calculateQuality(data, freshness) {
    const descriptionScore = getDescriptionScore(data.description);
    const imageScore = getImageScore(data.hasImage);
    const pickupScore = data.pickupAddress.length >= 10 ? 100 : 55;
    const categoryScore = /packaged|grocery/i.test(data.category)
      ? 92
      : /bakery|meal|prepared/i.test(data.category)
        ? 86
        : 80;
    const foodTypeScore = /packaged/i.test(data.foodType) ? 95 : 85;
    return clampScore(
      freshness * 0.35 +
        descriptionScore * 0.2 +
        imageScore * 0.2 +
        pickupScore * 0.05 +
        categoryScore * 0.1 +
        foodTypeScore * 0.1,
    );
  }

  function calculateConfidence(data, quality, freshness, pickup) {
    const completeness = calculateCompleteness(data) * AI_LIMITS.max;
    const pricingDetail =
      data.listingType === "donate" || data.originalPrice > 0
        ? AI_LIMITS.max
        : 40;
    return clampScore(
      freshness * 0.2 +
        quality * 0.25 +
        completeness * 0.25 +
        pickup.score * 0.15 +
        pricingDetail * 0.15,
    );
  }

  function calculateMeals(quantityValue, unitValue, categoryValue) {
    const quantityNumber = Math.max(0, Number(quantityValue) || 0);
    const unitName = String(unitValue).toLowerCase();
    const baseMeals = unitName.includes("kg")
      ? quantityNumber / AI_LIMITS.mealWeightKg
      : unitName.includes("gram")
        ? quantityNumber / (AI_LIMITS.mealWeightKg * 1000)
        : unitName.includes("piece")
          ? quantityNumber * 0.5
          : quantityNumber;
    const categoryFactor = /beverage|drink/i.test(categoryValue)
      ? 0.5
      : /bakery|dessert/i.test(categoryValue)
        ? 1.15
        : 1;
    return Math.max(1, Math.round(baseMeals * categoryFactor));
  }

  function calculateCarbon(categoryValue, meals) {
    const multiplier = /meat|non-veg|nonveg/i.test(categoryValue)
      ? 1.45
      : /dairy/i.test(categoryValue)
        ? 1.2
        : 1;
    return Number((meals * AI_LIMITS.carbonPerMealKg * multiplier).toFixed(1));
  }

  function calculateSuggestedPrice(
    original,
    freshness,
    quality,
    recoveryEstimate,
    confidence,
    pickup,
    categoryValue,
    quantityValue,
    listingTypeValue,
  ) {
    const price = Math.max(0, Number(original) || 0);
    if (!price || listingTypeValue === "donate") return 0;
    const urgency =
      Math.max(AI_LIMITS.max - freshness, pickup.urgency) / AI_LIMITS.max;
    const confidenceGap = (AI_LIMITS.max - confidence) / AI_LIMITS.max;
    const qualityGap = (AI_LIMITS.max - quality) / AI_LIMITS.max;
    const recoveryGap = (AI_LIMITS.max - recoveryEstimate) / AI_LIMITS.max;
    const categoryAdjustment = /bakery|dessert/i.test(categoryValue)
      ? 0.06
      : /packaged|grocery/i.test(categoryValue)
        ? -0.04
        : 0;
    const quantityAdjustment = Number(quantityValue) >= 8 ? 0.04 : 0;
    const discount = Math.min(
      AI_LIMITS.maximumDiscount,
      Math.max(
        AI_LIMITS.minimumDiscount,
        AI_LIMITS.minimumDiscount +
          urgency * 0.3 +
          qualityGap * 0.12 +
          recoveryGap * 0.1 +
          confidenceGap * 0.08 +
          categoryAdjustment +
          quantityAdjustment,
      ),
    );
    return Math.max(1, Math.round(price * (1 - discount)));
  }

  function calculatePriority(freshness, pickupUrgency, recovery, confidence) {
    if (
      recovery >= AI_LIMITS.excellent &&
      confidence >= AI_LIMITS.good &&
      freshness >= AI_LIMITS.good &&
      pickupUrgency < 82
    )
      return "LOW";
    if (recovery >= AI_LIMITS.good && confidence >= AI_LIMITS.fair)
      return "MEDIUM";
    if (recovery >= AI_LIMITS.fair && freshness >= 40) return "HIGH";
    return "CRITICAL";
  }

  function generateRecommendation(analysis) {
    const actions = [];
    if (analysis.hero.status === "Ready") actions.push("✓ Publish today");
    else if (analysis.priority === "CRITICAL")
      actions.push("✓ Schedule immediate pickup");
    else if (analysis.descriptionLength < 60)
      actions.push("✓ Improve description");
    else actions.push("✓ Review listing before publishing");

    if (
      analysis.listingType === "sell" &&
      analysis.pricingScore < AI_LIMITS.good
    )
      actions.push(`✓ Suggested price: ₹${analysis.suggestedPrice}`);
    if (analysis.pickup.status !== "Flexible")
      actions.push(`✓ Pickup: ${analysis.pickup.status}`);
    if (
      analysis.descriptionLength < 60 &&
      !actions.includes("✓ Improve description")
    )
      actions.push("✓ Improve description");

    return `Recommended Actions\n${actions.join("\n")}\n\nRecovery Chance\n${analysis.recovery}%\n\nLast analyzed: Just now`;
  }

  function analyzeListing(data) {
    const freshness = calculateFreshness(data);
    const quality = calculateQuality(data, freshness);
    const pickup = calculatePickupWindow(data, freshness);
    const confidence = calculateConfidence(data, quality, freshness, pickup);
    const meals = calculateMeals(data.quantity, data.unit, data.category);
    const carbon = calculateCarbon(data.category, meals);
    const completeness = calculateCompleteness(data) * AI_LIMITS.max;
    const recoveryEstimate = clampScore(
      freshness * 0.4 + pickup.score * 0.2 + completeness * 0.15 + 25,
    );
    const suggested = calculateSuggestedPrice(
      data.originalPrice,
      freshness,
      quality,
      recoveryEstimate,
      confidence,
      pickup,
      data.category,
      data.quantity,
      data.listingType,
    );
    const discount =
      data.originalPrice > 0
        ? clampScore(
            ((data.originalPrice - suggested) / data.originalPrice) * 100,
          )
        : 0;
    const pricingScore =
      data.originalPrice > 0
        ? clampScore(100 - Math.abs(discount - 28) * 2.2)
        : data.listingType === "donate"
          ? 100
          : 55;
    const recovery = clampScore(
      freshness * AI_WEIGHTS.recovery.freshness +
        pricingScore * AI_WEIGHTS.recovery.pricing +
        pickup.score * AI_WEIGHTS.recovery.pickup +
        completeness * AI_WEIGHTS.recovery.completeness,
    );
    const priority = calculatePriority(
      freshness,
      pickup.urgency,
      recovery,
      confidence,
    );
    const safety = safetyFor(freshness);
    const safetyScore =
      safety === "Unsafe" ? 25 : safety === "Needs Review" ? 45 : freshness;
    const overall = clampScore(
      freshness * AI_WEIGHTS.overall.freshness +
        quality * AI_WEIGHTS.overall.quality +
        completeness * AI_WEIGHTS.overall.completeness +
        safetyScore * AI_WEIGHTS.overall.safety +
        getImageScore(data.hasImage) * AI_WEIGHTS.overall.image +
        getDescriptionScore(data.description) * AI_WEIGHTS.overall.description +
        pricingScore * AI_WEIGHTS.overall.pricing +
        pickup.score * AI_WEIGHTS.overall.pickup +
        recovery * AI_WEIGHTS.overall.recovery +
        confidence * AI_WEIGHTS.overall.confidence,
    );
    const badge =
      data.listingType === "donate"
        ? "Community Donation"
        : freshness < AI_LIMITS.fair
          ? "Urgent Clearance"
          : discount >= 45
            ? "Quick Recovery"
            : discount >= 30
              ? "Optimized"
              : discount >= 15
                ? "Competitive"
                : "Competitive";
    const pricingMessage =
      data.listingType === "donate"
        ? "Donation listing removes the price barrier."
        : badge === "Urgent Clearance" || badge === "Quick Recovery"
          ? "Urgent pricing applied for faster recovery."
          : badge === "Competitive"
            ? "Good market value for nearby recipients."
            : badge === "Optimized"
              ? "Price is optimized for recovery and visibility."
              : "Price is already competitive for nearby recipients.";
    const pricingTone =
      badge === "Urgent Clearance"
        ? "critical"
        : badge === "Quick Recovery"
          ? "high"
          : badge === "Optimized"
            ? "medium"
            : "low";
    const hero =
      overall >= AI_LIMITS.excellent && recovery >= AI_LIMITS.excellent
        ? {
            title: "Listing Ready",
            description:
              "Excellent freshness, quality, and recovery potential make this listing ready to reach nearby recipients.",
            status: "Ready",
          }
        : overall >= AI_LIMITS.good
          ? {
              title: "Almost Ready",
              description:
                "Small improvements can increase recovery and marketplace visibility.",
              status: "Minor Improvements",
            }
          : overall >= 55 &&
              recovery >= AI_LIMITS.fair &&
              priority !== "CRITICAL"
            ? {
                title: "Improve Before Publishing",
                description:
                  "Improve pricing, food details, or pickup information before publishing.",
                status: "Needs Attention",
              }
            : {
                title: "High Priority Recovery",
                description:
                  "Food should be recovered quickly to maximize quality and reduce waste.",
                status: "Immediate Action",
              };
    const summary = [];
    summary.push(
      freshness >= AI_LIMITS.good
        ? "Food is suitable for recovery."
        : "Freshness is time-sensitive.",
    );
    summary.push(
      safety === "Excellent" || safety === "Good"
        ? "Food safety supports recovery."
        : "Food safety needs review before publishing.",
    );
    summary.push(
      pricingScore >= AI_LIMITS.good
        ? "Smart pricing has been optimized."
        : "Pricing can improve recovery speed.",
    );
    summary.push(
      recovery >= AI_LIMITS.good
        ? "Recovery potential is high."
        : "Recovery potential needs attention.",
    );
    const priorityMeta = {
      LOW: { label: "Low Priority", tone: "#94a3b8" },
      MEDIUM: { label: "Moderate Priority", tone: "#3b82f6" },
      HIGH: { label: "High Priority", tone: "#f59e0b" },
      CRITICAL: { label: "Critical Priority", tone: "#ef4444" },
    }[priority];

    return {
      hero,
      confidence: {
        score: confidence,
        recovery,
        pickupEstimate: pickup.estimate,
        priority,
        priorityLabel: priorityMeta.label,
        priorityTone: priorityMeta.tone,
      },
      metrics: { quality, safety, meals, carbon },
      pricing: {
        original: data.originalPrice,
        suggested,
        discount,
        badge,
        message: pricingMessage,
        tone: pricingTone,
        isDonation: data.listingType === "donate",
      },
      summary: summary.slice(0, 4),
      insights: [
        {
          icon: "ri-time-line",
          title: "Freshness",
          status:
            freshness >= AI_LIMITS.excellent
              ? "Excellent"
              : freshness >= AI_LIMITS.good
                ? "Good"
                : freshness >= AI_LIMITS.fair
                  ? "Consume Soon"
                  : "Critical",
          score: freshness,
          color: getStatusColor(freshness),
        },
        {
          icon: "ri-shield-check-line",
          title: "Food Safety",
          status: safety,
          score: freshness,
          color: getStatusColor(freshness),
        },
        {
          icon: "ri-image-line",
          title: "Image Quality",
          status:
            data.hasImage && quality >= AI_LIMITS.good
              ? "Excellent"
              : data.hasImage
                ? "Good"
                : "Needs Improvement",
          score: data.hasImage ? 100 : 0,
          color: getStatusColor(data.hasImage ? quality : 20),
        },
        {
          icon: "ri-file-list-3-line",
          title: "Description",
          status:
            data.description.length >= 60
              ? "Strong"
              : data.description.length >= 35
                ? "Average"
                : "Needs Improvement",
          score: Math.min(100, data.description.length),
          color: getStatusColor(Math.min(100, data.description.length)),
        },
        {
          icon: "ri-map-pin-line",
          title: "Pickup Window",
          status: pickup.status,
          score: pickup.score,
          color: getStatusColor(pickup.score),
        },
        {
          icon: "ri-checkbox-circle-line",
          title: "Listing",
          status: confidence >= AI_LIMITS.good ? "Complete" : "Needs Details",
          score: confidence,
          color: getStatusColor(confidence),
        },
      ],
      recommendation: generateRecommendation({
        hero,
        priority,
        listingType: data.listingType,
        pricingScore,
        suggestedPrice: suggested,
        pickup,
        descriptionLength: data.description.length,
        recovery,
      }),
      overall,
    };
  }

  function animateValue(element, end, suffix = "", prefix = "") {
    const target = Number(end) || 0;
    const duration = 800;
    const precision = Number.isInteger(target) ? 0 : 1;
    const startTime = performance.now();
    if (element._valueAnimationFrame)
      cancelAnimationFrame(element._valueAnimationFrame);

    const renderValue = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const value = target * (1 - (1 - progress) ** 3);
      element.textContent = `${prefix}${value.toFixed(precision)}${suffix}`;
      if (progress < 1)
        element._valueAnimationFrame = requestAnimationFrame(renderValue);
    };
    element._valueAnimationFrame = requestAnimationFrame(renderValue);
  }

  function animateRecoveryProgress(element, value, color) {
    const target = clampScore(value);
    const startTime = performance.now();
    if (element._progressAnimationFrame)
      cancelAnimationFrame(element._progressAnimationFrame);
    element.style.background = color;
    const renderProgress = (time) => {
      const progress = Math.min((time - startTime) / 800, 1);
      element.style.width = `${target * (1 - (1 - progress) ** 3)}%`;
      if (progress < 1)
        element._progressAnimationFrame = requestAnimationFrame(renderProgress);
    };
    element._progressAnimationFrame = requestAnimationFrame(renderProgress);
  }

  /* =====================================================
   UPDATE DASHBOARD
===================================================== */

  function updateDashboard(result) {
    animateValue(confidenceScore, result.confidence.score, "%");

    animateValue(qualityScore, result.metrics.quality, "%");

    animateValue(mealCount, result.metrics.meals);

    animateValue(carbonSaved, result.metrics.carbon, " kg");

    animateValue(overallScore, result.overall, "%");

    animateValue(recoveryProbability, result.confidence.recovery, "%");

    safetyStatus.textContent = result.metrics.safety;

    priorityBadge.textContent = result.confidence.priorityLabel;
    priorityBadge.classList.remove("high", "medium", "low", "critical");
    priorityBadge.classList.add(result.confidence.priority.toLowerCase());
    priorityBadge.style.color = result.confidence.priorityTone;
    priorityBadge.style.borderColor = result.confidence.priorityTone;
    priorityBadge.style.background = `${result.confidence.priorityTone}22`;

    pickupEstimate.textContent = result.confidence.pickupEstimate;

    if (result.pricing.isDonation) {
      originalPriceAI.textContent = "Donation";
      suggestedPriceAI.textContent = "No price";

      // Change pricing card to donation layout
      smartPricingCard.classList.add("is-donation");
    } else {
      smartPricingCard.classList.remove("is-donation");

      animateValue(originalPriceAI, result.pricing.original, "", "₹");

      animateValue(suggestedPriceAI, result.pricing.suggested, "", "₹");
    }
    animateValue(discountPercent, result.pricing.discount, "% OFF");
    discountPercent.hidden = result.pricing.original <= 0;
    pricingBadge.textContent = result.pricing.badge;
    pricingMessage.textContent = result.pricing.message;
    const pricingTone =
      result.pricing.tone === "critical"
        ? "#ef4444"
        : result.pricing.tone === "high"
          ? "#f59e0b"
          : result.pricing.tone === "medium"
            ? "#3b82f6"
            : "#22c55e";
    pricingBadge.style.color = pricingTone;
    pricingBadge.style.borderColor = pricingTone;
    discountPercent.style.color = pricingTone;

    aiRecommendation.textContent = result.recommendation;

    const heroContent = document.querySelector(".review-hero .hero-content");
    if (heroContent) {
      heroContent.querySelector("h1").textContent = result.hero.title;
      heroContent.querySelector("p").textContent = result.hero.description;
      const heroBadge = heroContent.querySelector(".hero-badge");
      if (heroBadge) heroBadge.lastChild.textContent = ` ${result.hero.status}`;
      [
        heroBadge,
        heroContent.querySelector("h1"),
        heroContent.querySelector("p"),
      ]
        .filter(Boolean)
        .forEach((element, index) => {
          element.animate(
            [
              { opacity: 0, transform: "translateY(8px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 360, delay: index * 70, easing: "ease-out" },
          );
        });
    }
    const previewStatus = document.querySelector(".preview-status");
    if (previewStatus) previewStatus.textContent = result.hero.status;
    document.querySelectorAll(".review-row").forEach((row, index) => {
      row.animate(
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 420, delay: index * 80, easing: "ease-out", fill: "both" },
      );
    });

    const summaryList = document.querySelector(".summary-list");
    if (summaryList) {
      summaryList.replaceChildren(
        ...result.summary.map((item) => {
          const row = document.createElement("div");
          row.className = "summary-item";
          const icon = document.createElement("i");
          icon.className = "ri-checkbox-circle-fill";
          const text = document.createElement("span");
          text.textContent = item;
          row.append(icon, text);
          return row;
        }),
      );
    }

    const insightsGrid = document.querySelector(".insights-grid");
    if (insightsGrid) {
      insightsGrid.replaceChildren(
        ...result.insights.map((insight, index) => {
          const box = document.createElement("div");
          box.className = "insight-box";
          const icon = document.createElement("i");
          icon.className = insight.icon;
          const text = document.createElement("span");
          text.append(
            document.createTextNode(insight.title),
            document.createElement("br"),
            (() => {
              const dot = document.createElement("span");
              dot.textContent = "● ";
              dot.style.color = insight.color;
              return dot;
            })(),
            document.createTextNode(insight.status),
          );
          box.append(icon, text);
          box.animate(
            [
              { opacity: 0, transform: "translateY(8px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 320,
              delay: index * 45,
              easing: "ease-out",
              fill: "both",
            },
          );
          return box;
        }),
      );
    }

    priorityFill.classList.remove("high");
    const progressColor =
      result.confidence.recovery >= AI_LIMITS.good
        ? "linear-gradient(90deg, #22c55e, #16a34a)"
        : result.confidence.recovery >= AI_LIMITS.fair
          ? "linear-gradient(90deg, #3b82f6, #6366f1)"
          : "linear-gradient(90deg, #f59e0b, #f97316)";
    animateRecoveryProgress(
      priorityFill,
      result.confidence.recovery,
      progressColor,
    );
    priorityFill.style.boxShadow = `0 0 14px ${result.confidence.recovery >= AI_LIMITS.good ? "rgba(34, 197, 94, 0.45)" : result.confidence.recovery >= AI_LIMITS.fair ? "rgba(59, 130, 246, 0.4)" : "rgba(249, 115, 22, 0.35)"}`;
    const ring = document.querySelector(".confidence-ring");
    if (ring) {
      const score = result.confidence.score;
      const color =
        score >= 90
          ? "#22c55e"
          : score >= 75
            ? "#3b82f6"
            : score >= 50
              ? "#f59e0b"
              : "#ef4444";
      const target = score * 3.6;
      if (ring._analysisFrame) cancelAnimationFrame(ring._analysisFrame);
      if (ring._glowAnimation) ring._glowAnimation.cancel();
      ring.style.transition = "box-shadow 280ms ease, filter 280ms ease";
      const glow =
        score >= 90
          ? `0 0 28px ${color}a0, 0 0 52px ${color}55`
          : score >= 80
            ? `0 0 22px ${color}80, 0 0 38px ${color}40`
            : score >= 70
              ? `0 0 14px ${color}60, 0 0 24px ${color}25`
              : "none";
      ring.style.boxShadow = glow;
      ring.style.filter = score >= 70 ? "saturate(1.1)" : "none";
      if (score >= 80) {
        ring._glowAnimation = ring.animate(
          [
            { transform: "scale(1)", boxShadow: glow },
            { transform: "scale(1.018)", boxShadow: `0 0 32px ${color}95` },
            { transform: "scale(1)", boxShadow: glow },
          ],
          { duration: 1100, easing: "ease-in-out" },
        );
      }
      const startTime = performance.now();
      const renderRing = (time) => {
        const progress = Math.min((time - startTime) / 800, 1);
        const degrees = target * (1 - (1 - progress) ** 3);
        ring.style.background = `conic-gradient(${color} ${degrees}deg, rgba(255, 255, 255, 0.08) ${degrees}deg)`;
        if (progress < 1)
          ring._analysisFrame = requestAnimationFrame(renderRing);
      };
      ring._analysisFrame = requestAnimationFrame(renderRing);
    }
  }

  function updatePreviewCard() {
    if (previewFoodName) {
      previewFoodName.textContent = foodName.value.trim() || "Food Name";
    }

    if (previewCategory) {
      previewCategory.textContent = category.value || "Category";
    }

    if (previewListingImage) {
      if (previewImage.src && previewImage.src !== window.location.href) {
        previewListingImage.src = previewImage.src;

        previewListingImage.style.display = "block";

        const placeholder =
          previewListingImage.parentElement.querySelector(".image-placeholder");

        if (placeholder) {
          placeholder.style.display = "none";
        }
      } else {
        previewListingImage.style.display = "none";

        const placeholder =
          previewListingImage.parentElement.querySelector(".image-placeholder");

        if (placeholder) {
          placeholder.style.display = "flex";
        }
      }
    }
  }

  /* =====================================================
   BUILD EDIT LISTING PAYLOAD
===================================================== */

  function buildEditListingPayload(imageUrl) {
    const selectedCategory =
      category.value === "Other" ? otherCategory.value.trim() : category.value;

    const selectedUnit =
      unit.value === "Other" ? otherUnit.value.trim() : unit.value;

    const isDonation = listingType.value === "donate";

    const addressParts = [
      pickupAddress.value.trim(),
      landmark.value.trim(),
      city.value.trim(),
    ].filter(Boolean);

    return {
      food_title: foodName.value.trim(),

      category: selectedCategory,

      food_type: foodType.value,

      listing_type: listingType.value,

      quantity: Number(quantity.value),

      unit: selectedUnit,

      original_price: isDonation ? 0 : Number(originalPrice.value || 0),

      discounted_price: isDonation ? 0 : Number(sellingPrice.value || 0),

      expiry_date: hasExpiry.checked ? expiryDate.value : availableUntil.value,

      /*
       Keep original pickup start.
       The Add Listing form does not expose
       pickup_start as an editable field.
    */
      pickup_start: window.editOriginalPickupStart || new Date().toISOString(),

      pickup_end: availableUntil.value,

      address: addressParts.join(", "),

      city: city.value.trim(),

      landmark: landmark.value.trim(),

      pickup_instructions: pickupInstructions.value.trim(),

      description: description.value.trim(),

      image: imageUrl,

      /*
       Preserve existing AI values.
    */
      freshness_score: window.editExistingFreshnessScore || 0,

      recovery_probability: window.editExistingRecoveryProbability || 0,

      carbon_saved: window.editExistingCarbonSaved || 0,

      ai_recommendation: window.editExistingAIRecommendation || "",
    };
  }

  let reviewRefreshTimer;
  function refreshReviewFromChanges() {
    if (!aiResult || !stepTwo || stepTwo.hidden) return;
    clearTimeout(reviewRefreshTimer);
    reviewRefreshTimer = setTimeout(() => {
      aiResult = generateAnalysis();
      updateDashboard(aiResult);
    }, 260);
  }

  function resetCreateListing() {
    // Clear form
    form.reset();

    foodImage.value = "";

    previewImage.src = "";

    previewImage.classList.remove("show");

    uploadContent.style.display = "flex";

    imageOverlay.classList.add("hidden");

    // Remove draft
    localStorage.removeItem("reserveListingDraft");
    draftNotification.classList.add("hidden");
    draftSaved = false;
    aiResult = null;

    // Return to Create Listing page
    stepThree.hidden = true;
    stepTwo.hidden = true;
    stepOne.hidden = false;

    // Reset buttons
    finalPublishBtn.disabled = false;
    backToReviewBtn.disabled = false;

    finalPublishBtn.innerHTML =
      '<i class="ri-rocket-2-fill"></i> Publish to Listings';

    finalPublishBtn.style.background = "";

    backToReviewBtn.innerHTML =
      '<i class="ri-arrow-left-line"></i> Back to Review';

    // Reset upload preview
    foodImage.value = "";

    previewImage.src = "";
    previewImage.classList.remove("show");

    publishPreviewImage.src = "";
    publishPreviewImage.style.display = "none";

    uploadContent.style.display = "flex";

    imageOverlay.classList.add("hidden");

    // Reset dynamic UI
    toggleOtherCategory();
    toggleOtherUnit();
    toggleListingType();
    toggleExpiryFields();

    updateCharacterCounter();
    updateCompletionBadge();
    updateReadiness();
    updatePreviewCard();
    updateAvailabilitySummary();

    updateDraftStatus(
      "No Draft",
      "Start creating a new listing",
      "ri-file-add-line",
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    finalPublishBtn.dataset.state = "";
  }

  aiResult = null;

  function updateAvailabilitySummary() {
    const pickupValue = availableUntil.value;

    if (!pickupValue) {
      availabilityDate.textContent = "Not selected";
      availabilityTime.textContent = "Not selected";
      return;
    }

    const date = new Date(pickupValue);

    if (isNaN(date.getTime())) {
      availabilityDate.textContent = "Not selected";
      availabilityTime.textContent = "Not selected";
      return;
    }

    availabilityDate.textContent = date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    availabilityTime.textContent = date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function setDateMinimums() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    // Future dates only
    expiryDate.min = minDateTime;
    availableUntil.min = minDateTime;
  }

  /* ==========================================================
   READINESS EVENTS
========================================================== */

  foodName.addEventListener("input", updateReadiness);

  category.addEventListener("change", updateReadiness);

  foodType.addEventListener("change", updateReadiness);

  quantity.addEventListener("input", updateReadiness);

  description.addEventListener("input", updateReadiness);

  unit.addEventListener("change", updateReadiness);

  otherUnit.addEventListener("input", updateReadiness);

  city.addEventListener("input", updateReadiness);

  listingType.addEventListener("change", updateReadiness);

  originalPrice.addEventListener("input", updateReadiness);

  sellingPrice.addEventListener("input", updateReadiness);

  preparationTime.addEventListener("change", updateReadiness);

  expiryDate.addEventListener("change", updateReadiness);

  availableUntil.addEventListener("change", updateReadiness);

  pickupAddress.addEventListener("input", updateReadiness);

  foodImage.addEventListener("change", updateReadiness);

  hasExpiry.addEventListener("change", updateReadiness);

  /* ==========================================================
   EVENT LISTENERS
========================================================== */

  hasExpiry.addEventListener("change", toggleExpiryFields);

  description.addEventListener("input", updateCharacterCounter);

  pickupInstructions.addEventListener("input", updateInstructionCounter);

  description.addEventListener("input", updateReadiness);

  foodName.addEventListener("input", updateCompletionBadge);

  category.addEventListener("change", updateCompletionBadge);

  foodType.addEventListener("change", updateCompletionBadge);

  description.addEventListener("input", updateCompletionBadge);

  category.addEventListener("change", toggleOtherCategory);

  unit.addEventListener("change", toggleOtherUnit);

  listingType.addEventListener("change", toggleListingType);

  foodName.addEventListener("input", markDraftUnsaved);

  category.addEventListener("change", markDraftUnsaved);

  foodType.addEventListener("change", markDraftUnsaved);

  description.addEventListener("input", markDraftUnsaved);

  listingType.addEventListener("change", markDraftUnsaved);

  quantity.addEventListener("input", markDraftUnsaved);

  unit.addEventListener("change", markDraftUnsaved);

  otherUnit.addEventListener("input", markDraftUnsaved);

  otherCategory.addEventListener("input", markDraftUnsaved);

  originalPrice.addEventListener("input", markDraftUnsaved);

  sellingPrice.addEventListener("input", markDraftUnsaved);

  preparationTime.addEventListener("change", markDraftUnsaved);

  expiryDate.addEventListener("change", markDraftUnsaved);

  availableUntil.addEventListener("change", markDraftUnsaved);

  pickupAddress.addEventListener("input", markDraftUnsaved);

  foodImage.addEventListener("change", markDraftUnsaved);

  foodName.addEventListener("input", updatePreviewCard);

  category.addEventListener("change", updatePreviewCard);

  city.addEventListener("change", markDraftUnsaved);
  landmark.addEventListener("input", markDraftUnsaved);
  pickupInstructions.addEventListener("change", markDraftUnsaved);

  city.addEventListener("change", updateReadiness);
  landmark.addEventListener("input", updateReadiness);
  pickupInstructions.addEventListener("change", updateReadiness);

  city.addEventListener("change", refreshReviewFromChanges);
  landmark.addEventListener("input", refreshReviewFromChanges);
  pickupInstructions.addEventListener("change", refreshReviewFromChanges);

  availableUntil.addEventListener("input", updateAvailabilitySummary);
  availableUntil.addEventListener("change", updateAvailabilitySummary);

  [
    foodName,
    category,
    foodType,
    description,
    listingType,
    quantity,
    unit,
    otherUnit,
    originalPrice,
    sellingPrice,
    preparationTime,
    expiryDate,
    availableUntil,
    pickupAddress,
    city,
    landmark,
    pickupInstructions,
    foodImage,
    hasExpiry,
  ].forEach((field) => {
    if (field) field.addEventListener("input", refreshReviewFromChanges);
    if (field) field.addEventListener("change", refreshReviewFromChanges);
  });

  /* ==========================================================
     INITIALIZE PAGE
  ========================================================== */

  async function initializePage() {
    await loadProviderPickupProfile();

    if (editMode && editListingId) {
      // Load existing listing into the form after the profile pickup is ready.
      loadListingForEdit();
    } else if (localStorage.getItem("reserveListingDraft")) {
      draftNotification.classList.remove("hidden");

      updateDraftStatus(
        "Draft Available",
        "Restore your previous draft",
        "ri-draft-line",
      );
    } else {
    toggleOtherCategory();
    toggleOtherUnit();
    toggleListingType();
    toggleExpiryFields();
    updateCharacterCounter();
    updateInstructionCounter();
    updateCompletionBadge();
    updateReadiness();
    updatePreviewCard();
    setDateMinimums();
    updateAvailabilitySummary();

    updateDraftStatus(
      "No Draft",
      "Start creating a new listing",
      "ri-file-add-line",
    );
    }
  }

  initializePage();
});
