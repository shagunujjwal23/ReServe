/* ==========================================================
   ReServe - Create Listing
   Version 2.0
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================================
       DOM ELEMENTS
    ========================================================== */

  // Form
  const form = document.getElementById("createListingForm");

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

  const preparationGroup = document.getElementById("preparationGroup");
  const expiryGroup = document.getElementById("expiryGroup");
  const availableUntilGroup = document.getElementById("availableUntilGroup");

  // Pickup
  const pickupAddress = document.getElementById("pickupAddress");

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
  const pickupCheck = document.getElementById("pickupCheck");
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

  const aiLoadingScreen = document.getElementById("aiLoadingScreen");

  const loadingProgress = document.getElementById("loadingProgress");
  const loadingPercent = document.getElementById("loadingPercent");
  const loadingMessage = document.getElementById("loadingMessage");

  const backToEditBtn = document.getElementById("backToEditBtn");
  const publishListingBtn = document.getElementById("publishListingBtn");

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
      otherCategory.required = true;
    } else {
      hide(otherCategoryGroup);
      otherCategory.required = false;
      otherCategory.value = "";
    }
  }

  /* -------------------------
   Unit
------------------------- */

  function toggleOtherUnit() {
    if (unit.value === "Other") {
      show(otherUnitGroup);
      otherUnit.required = true;
    } else {
      hide(otherUnitGroup);
      otherUnit.required = false;
      otherUnit.value = "";
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

      originalPrice.value = "";
      sellingPrice.value = "";
    }
  }

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
      foodName: foodName.value.trim() !== "",

      category: category.value !== "",

      quantity: quantity.value.trim() !== "",

      preparation: hasExpiry.checked
        ? expiryDate.value !== ""
        : preparationTime.value !== "",

      availability: availableUntil.value !== "",

      pickup: pickupAddress.value.trim() !== "",

      image: foodImage.files.length > 0,
    };

    updateChecklistItem(foodNameCheck, checks.foodName);
    updateChecklistItem(categoryCheck, checks.category);
    updateChecklistItem(quantityCheck, checks.quantity);
    updateChecklistItem(prepCheck, checks.preparation);
    updateChecklistItem(expiryCheck, checks.availability);
    updateChecklistItem(pickupCheck, checks.pickup);
    updateChecklistItem(imageCheck, checks.image);

    const total = Object.keys(checks).length;

    const completed = Object.values(checks).filter(Boolean).length;

    const percent = Math.round((completed / total) * 100);

    readinessScore.textContent = `${percent}%`;

    progressFill.style.width = `${percent}%`;
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
      alert("Only JPG, PNG and WEBP images are allowed.");

      foodImage.value = "";

      return;
    }

    /* ---------- Maximum Size ---------- */

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("Maximum file size is 5 MB.");

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

    previewImage.src = "";
    updatePreviewCard();

    previewImage.classList.remove("show");

    uploadContent.style.display = "flex";

    updateReadiness();
  });

  function saveDraft() {
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
      foodImage.files.length,
    ].some((value) => value);

    if (!hasData) {
      draftStatus.textContent = "Nothing to save.";
      return;
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
    };

    localStorage.setItem("reserveListingDraft", JSON.stringify(draft));

    updateDraftStatus(
      "✓ Saved just now",

      "Saving completed",

      "ri-checkbox-circle-fill",
    );

    setTimeout(() => {
      const time = new Date().toLocaleTimeString([], {
        hour: "numeric",

        minute: "2-digit",
      });

      updateDraftStatus(
        "Draft Saved",

        `Last saved at ${time}`,

        "ri-checkbox-circle-fill",
      );
    }, 2000);
  }

  function loadDraft() {
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

    pickupAddress.value = draft.pickupAddress || "";

    toggleOtherCategory();
    toggleOtherUnit();
    toggleListingType();
    toggleExpiryFields();

    updateCharacterCounter();
    updateCompletionBadge();
    updateReadiness();
  }

  function markDraftUnsaved() {
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

  saveDraftBtn.addEventListener("click", (event) => {
    event.preventDefault();

    saveDraft();
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
      }
    } else {
      if (preparationTime.value === "") {
        invalidate(preparationTime, "Select preparation time.");
      }
    }

    if (availableUntil.value === "") {
      invalidate(availableUntil, "Select availability time.");
    }

    /* -------------------------
       Pickup
    ------------------------- */

    if (pickupAddress.value.trim() === "") {
      invalidate(pickupAddress, "Pickup address is required.");
    } else if (pickupAddress.value.trim().length < 10) {
      invalidate(pickupAddress, "Address should be at least 10 characters.");
    }

    /* -------------------------
       Image
    ------------------------- */

    if (foodImage.files.length === 0) {
      alert("Please upload a food image.");

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

  restoreDraftBtn.addEventListener("click", () => {
    loadDraft();
    updatePreviewCard();

    draftNotification.classList.add("hidden");

    updateDraftStatus(
      "Draft Restored",

      "Continue editing your listing",

      "ri-draft-line",
    );
  });

  discardDraftBtn.addEventListener("click", () => {
    localStorage.removeItem("reserveListingDraft");

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
   EVENT LISTENERS
===================================================== */

  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", startAIAnalysis);
  }

  if (backToEditBtn) {
    backToEditBtn.addEventListener("click", backToEdit);
  }

  if (publishListingBtn) {
    publishListingBtn.addEventListener("click", publishListing);
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

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Save latest draft
    saveDraft();

    // Switch to AI Review
    stepOne.hidden = true;
    stepTwo.hidden = false;

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

  function publishListing() {
    if (publishListingBtn.disabled) return;
    localStorage.removeItem("reserveListingDraft");

    publishListingBtn.disabled = true;

    publishListingBtn.innerHTML =
      '<i class="ri-loader-4-line ri-spin"></i> Publishing...';

    setTimeout(() => {
      publishListingBtn.innerHTML =
        '<i class="ri-checkbox-circle-fill"></i> Published Successfully';

      publishListingBtn.style.background = "#16a34a";

      setTimeout(() => {
        window.location.href = "/marketplace";
      }, 1200);
    }, 1500);
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
      aiLoadingScreen.style.display = "none";

      aiLoadingScreen.style.opacity = "1";
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
    recovery: { freshness: 0.4, pricing: 0.25, pickup: 0.2, completeness: 0.15 },
    overall: { freshness: 0.2, quality: 0.2, completeness: 0.15, safety: 0.1, image: 0.05, description: 0.05, pricing: 0.1, pickup: 0.05, recovery: 0.05, confidence: 0.05 },
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
  const getStatusColor = (score) => score >= AI_LIMITS.excellent ? "#22c55e" : score >= AI_LIMITS.good ? "#3b82f6" : score >= AI_LIMITS.fair ? "#f59e0b" : "#ef4444";

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
      data.hasImage,
      data.listingType,
    ];
    return fields.filter(Boolean).length / fields.length;
  }

  function calculatePickupWindow(data, freshness) {
    const hours = hoursUntil(data.availableUntil);
    const windowScore = hours === null ? 40 : hours <= 0 ? 20 : hours <= 1 ? 55 : hours <= 2 ? 70 : hours <= 12 ? 82 : 92;
    const urgency = clampScore((AI_LIMITS.max - freshness) * 0.65 + (AI_LIMITS.max - windowScore) * 0.35);
    if (hours !== null && hours <= 0.5) return { score: windowScore, urgency, estimate: "Within 20 - 30 min", status: "Immediate" };
    if (hours !== null && hours <= 1) return { score: windowScore, urgency, estimate: "Within 1 hour", status: "Immediate" };
    if (hours !== null && hours <= 2) return { score: windowScore, urgency, estimate: "Within 2 hours", status: "Scheduled" };
    if (hours !== null && hours <= 12) return { score: windowScore, urgency, estimate: "Pickup today", status: "Scheduled" };
    return { score: windowScore, urgency, estimate: "Tomorrow morning", status: "Flexible" };
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
      hasImage: foodImage.files.length > 0,
      listingType: listingType.value,
    });
  }

  function calculateFreshness(data) {
    const hours = hoursUntil(data.expiryDate || data.availableUntil);
    const preparedHoursAgo = hoursUntil(data.preparationTime);
    const remainingScore = hours === null ? 72 : hours <= 0 ? 20 : hours <= 2 ? 48 : hours <= 6 ? 66 : hours <= 12 ? 80 : hours <= 24 ? 90 : 96;
    const preparationPenalty = preparedHoursAgo !== null && preparedHoursAgo < 0
      ? Math.min(18, Math.abs(preparedHoursAgo) * 0.75)
      : 0;
    return clampScore(remainingScore - preparationPenalty);
  }

  function calculateQuality(data, freshness) {
    const descriptionScore = getDescriptionScore(data.description);
    const imageScore = getImageScore(data.hasImage);
    const pickupScore = data.pickupAddress.length >= 10 ? 100 : 55;
    const categoryScore = /packaged|grocery/i.test(data.category) ? 92 : /bakery|meal|prepared/i.test(data.category) ? 86 : 80;
    const foodTypeScore = /packaged/i.test(data.foodType) ? 95 : 85;
    return clampScore(
      freshness * 0.35 + descriptionScore * 0.2 + imageScore * 0.2 + pickupScore * 0.05 + categoryScore * 0.1 + foodTypeScore * 0.1,
    );
  }

  function calculateConfidence(data, quality, freshness, pickup) {
    const completeness = calculateCompleteness(data) * AI_LIMITS.max;
    const pricingDetail = data.listingType === "donate" || data.originalPrice > 0 ? AI_LIMITS.max : 40;
    return clampScore(freshness * 0.2 + quality * 0.25 + completeness * 0.25 + pickup.score * 0.15 + pricingDetail * 0.15);
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
    const categoryFactor = /beverage|drink/i.test(categoryValue) ? 0.5 : /bakery|dessert/i.test(categoryValue) ? 1.15 : 1;
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

  function calculateSuggestedPrice(original, freshness, quality, recoveryEstimate, confidence, pickup, categoryValue, quantityValue, listingTypeValue) {
    const price = Math.max(0, Number(original) || 0);
    if (!price || listingTypeValue === "donate") return 0;
    const urgency = Math.max(AI_LIMITS.max - freshness, pickup.urgency) / AI_LIMITS.max;
    const confidenceGap = (AI_LIMITS.max - confidence) / AI_LIMITS.max;
    const qualityGap = (AI_LIMITS.max - quality) / AI_LIMITS.max;
    const recoveryGap = (AI_LIMITS.max - recoveryEstimate) / AI_LIMITS.max;
    const categoryAdjustment = /bakery|dessert/i.test(categoryValue) ? 0.06 : /packaged|grocery/i.test(categoryValue) ? -0.04 : 0;
    const quantityAdjustment = Number(quantityValue) >= 8 ? 0.04 : 0;
    const discount = Math.min(AI_LIMITS.maximumDiscount, Math.max(AI_LIMITS.minimumDiscount, AI_LIMITS.minimumDiscount + urgency * 0.3 + qualityGap * 0.12 + recoveryGap * 0.1 + confidenceGap * 0.08 + categoryAdjustment + quantityAdjustment));
    return Math.max(1, Math.round(price * (1 - discount)));
  }

  function calculatePriority(freshness, meals, pickupUrgency, recovery) {
    if (freshness < AI_LIMITS.fair || pickupUrgency >= 90) return "CRITICAL";
    if (recovery >= AI_LIMITS.excellent) return "LOW";
    if (recovery >= AI_LIMITS.good) return "MEDIUM";
    return recovery >= 55 || meals >= 6 ? "HIGH" : "CRITICAL";
  }

  function generateRecommendation(analysis) {
    const actions = [];
    if (analysis.hero.status === "Ready") actions.push("✓ Publish today");
    else if (analysis.priority === "CRITICAL") actions.push("✓ Schedule immediate pickup");
    else if (analysis.descriptionLength < 60) actions.push("✓ Improve description");
    else actions.push("✓ Review listing before publishing");

    if (analysis.listingType === "sell" && analysis.pricingScore < AI_LIMITS.good)
      actions.push(`✓ Suggested price: ₹${analysis.suggestedPrice}`);
    if (analysis.pickup.status !== "Flexible") actions.push(`✓ Pickup: ${analysis.pickup.status}`);
    if (analysis.descriptionLength < 60 && !actions.includes("✓ Improve description")) actions.push("✓ Improve description");

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
    const pricingScore = data.originalPrice > 0
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
    const priority = calculatePriority(freshness, meals, pickup.urgency, recovery);
    const safety = safetyFor(freshness);
    const safetyScore = safety === "Unsafe" ? 25 : safety === "Needs Review" ? 45 : freshness;
    const overall = clampScore(
      freshness * AI_WEIGHTS.overall.freshness +
        quality * AI_WEIGHTS.overall.quality +
        completeness * AI_WEIGHTS.overall.completeness +
        safetyScore * AI_WEIGHTS.overall.safety +
        getImageScore(data.hasImage) * AI_WEIGHTS.overall.image +
        getDescriptionScore(data.description) * AI_WEIGHTS.overall.description,
    );
    const badge =
      data.listingType === "donate"
        ? "Community Donation"
        : freshness < AI_LIMITS.fair
        ? "Urgent Clearance"
        : discount >= 45
          ? "Quick Recovery"
        : discount >= 30
          ? "Recommended"
          : discount >= 15
            ? "Competitive"
            : "Premium";
    const pricingMessage = data.listingType === "donate"
      ? "Donation listing removes the price barrier."
      : badge === "Urgent Clearance" || badge === "Quick Recovery"
        ? "Urgent pricing applied for faster recovery."
        : badge === "Competitive"
          ? "Good market value for nearby recipients."
          : badge === "Recommended"
            ? "Balanced pricing for better visibility."
            : "Maintaining product value.";
    const pricingTone = badge === "Urgent Clearance" ? "critical" : badge === "Quick Recovery" ? "high" : badge === "Recommended" ? "medium" : "low";
    const hero =
      (freshness < AI_LIMITS.fair || pickup.urgency >= 90 || safety === "Needs Review" || safety === "Unsafe")
        ? {
            title: "High Priority Recovery",
            description: "Food should be collected immediately to protect quality and maximize recovery.",
            status: "Immediate Action",
          }
        : overall >= AI_LIMITS.excellent
        ? {
            title: "Listing Ready",
            description:
              "Excellent freshness, quality, and recovery potential make this listing ready to reach nearby recipients.",
            status: "Ready",
          }
        : overall >= AI_LIMITS.good
          ? {
              title: "Minor Improvements Recommended",
              description:
                "Your listing has solid recovery potential. A few details can help it convert faster.",
              status: "Review Suggested",
            }
          : overall >= 55
            ? {
                title: "Needs Attention",
                description: "A few improvements to freshness, pickup, or listing details will increase recovery potential.",
              status: "Needs Attention",
            }
          : {
              title: "Improve Before Publishing",
              description:
                "Address the highlighted food, pricing, and pickup details before offering this listing to the community.",
              status: "Needs Attention",
            };
    const summary = [];
    if (completeness >= AI_LIMITS.excellent) summary.push("Listing contains complete information.");
    if (data.hasImage) summary.push("Image quality improves buyer confidence.");
    if (data.description.length < 60) summary.push("Description could better explain quantity and condition.");
    if (pickup.score >= AI_LIMITS.good) summary.push("Pickup window supports high recovery.");
    if (freshness < AI_LIMITS.good) summary.push("Food freshness will decrease soon.");
    if (safety === "Needs Review" || safety === "Unsafe") summary.push("Food requires additional safety review.");
    if (!summary.length) summary.push("Listing is ready for publishing.");
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
        pickupEstimate:
          pickup.estimate,
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
          status: freshness >= AI_LIMITS.excellent ? "Excellent" : freshness >= AI_LIMITS.good ? "Good" : freshness >= AI_LIMITS.fair ? "Time Sensitive" : "Critical",
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
          status: data.hasImage && quality >= AI_LIMITS.good ? "Excellent" : data.hasImage ? "Good" : "Needs Improvement",
          score: data.hasImage ? 100 : 0,
          color: getStatusColor(data.hasImage ? quality : 20),
        },
        {
          icon: "ri-file-list-3-line",
          title: "Description",
          status: data.description.length >= 60 ? "Strong" : data.description.length >= 35 ? "Average" : "Needs Improvement",
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
      recommendation: generateRecommendation(
        priority,
        freshness,
        suggested,
        confidence,
        meals,
        data.originalPrice,
        pickup,
        pricingScore,
        data.description.length,
        data.listingType,
      ),
      overall,
    };
  }

  function animateValue(element, end, suffix = "", prefix = "") {
    const target = Number(end) || 0;
    const duration = 800;
    const precision = Number.isInteger(target) ? 0 : 1;
    const startTime = performance.now();
    if (element._valueAnimationFrame) cancelAnimationFrame(element._valueAnimationFrame);

    const renderValue = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const value = target * (1 - (1 - progress) ** 3);
      element.textContent = `${prefix}${value.toFixed(precision)}${suffix}`;
      if (progress < 1) element._valueAnimationFrame = requestAnimationFrame(renderValue);
    };
    element._valueAnimationFrame = requestAnimationFrame(renderValue);
  }

  function animateRecoveryProgress(element, value, color) {
    const target = clampScore(value);
    const startTime = performance.now();
    if (element._progressAnimationFrame) cancelAnimationFrame(element._progressAnimationFrame);
    element.style.background = color;
    const renderProgress = (time) => {
      const progress = Math.min((time - startTime) / 800, 1);
      element.style.width = `${target * (1 - (1 - progress) ** 3)}%`;
      if (progress < 1) element._progressAnimationFrame = requestAnimationFrame(renderProgress);
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
    } else {
      animateValue(originalPriceAI, result.pricing.original, "", "₹");
      animateValue(suggestedPriceAI, result.pricing.suggested, "", "₹");
    }
    animateValue(discountPercent, result.pricing.discount, "% OFF");
    discountPercent.hidden = result.pricing.original <= 0;
    pricingBadge.textContent = result.pricing.badge;
    pricingMessage.textContent = result.pricing.message;
    const pricingTone = result.pricing.tone === "critical" ? "#ef4444" : result.pricing.tone === "high" ? "#f59e0b" : result.pricing.tone === "medium" ? "#3b82f6" : "#22c55e";
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
      [heroBadge, heroContent.querySelector("h1"), heroContent.querySelector("p")].filter(Boolean).forEach((element, index) => {
        element.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 360, delay: index * 70, easing: "ease-out" });
      });
    }
    const previewStatus = document.querySelector(".preview-status");
    if (previewStatus) previewStatus.textContent = result.hero.status;
    document.querySelectorAll(".review-row").forEach((row, index) => {
      row.animate(
        [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }],
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
          box.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 320, delay: index * 45, easing: "ease-out", fill: "both" });
          return box;
        }),
      );
    }

    priorityFill.classList.remove("high");
    const progressColor = result.confidence.recovery >= AI_LIMITS.good
      ? "linear-gradient(90deg, #22c55e, #16a34a)"
      : result.confidence.recovery >= AI_LIMITS.fair
        ? "linear-gradient(90deg, #3b82f6, #6366f1)"
        : "linear-gradient(90deg, #f59e0b, #f97316)";
    animateRecoveryProgress(priorityFill, result.confidence.recovery, progressColor);
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
      ring.style.boxShadow = score > AI_LIMITS.fair
        ? `0 0 24px ${color}80, 0 0 44px ${color}45`
        : "none";
      ring.style.filter = score > AI_LIMITS.fair ? "saturate(1.1)" : "none";
      if (score >= AI_LIMITS.good) {
        ring._glowAnimation = ring.animate(
          [{ transform: "scale(1)", boxShadow: `0 0 18px ${color}65` }, { transform: "scale(1.025)", boxShadow: `0 0 34px ${color}95` }, { transform: "scale(1)", boxShadow: `0 0 24px ${color}80` }],
          { duration: 1100, easing: "ease-in-out" },
        );
      }
      const startTime = performance.now();
      const renderRing = (time) => {
        const progress = Math.min((time - startTime) / 800, 1);
        const degrees = target * (1 - (1 - progress) ** 3);
        ring.style.background = `conic-gradient(${color} ${degrees}deg, rgba(255, 255, 255, 0.08) ${degrees}deg)`;
        if (progress < 1) ring._analysisFrame = requestAnimationFrame(renderRing);
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

  /* ==========================================================
   READINESS EVENTS
========================================================== */

  foodName.addEventListener("input", updateReadiness);

  category.addEventListener("change", updateReadiness);

  foodType.addEventListener("change", updateReadiness);

  quantity.addEventListener("input", updateReadiness);

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

  /* ==========================================================
    EVENTS
========================================================== */

  if (localStorage.getItem("reserveListingDraft")) {
    draftNotification.classList.remove("hidden");
  } else {
    toggleOtherCategory();
    toggleOtherUnit();
    toggleListingType();
    toggleExpiryFields();
    updateCharacterCounter();
    updateCompletionBadge();
    updateReadiness();
    updatePreviewCard();

    draftStatus.textContent = "No Draft";
  }
});
