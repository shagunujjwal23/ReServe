/* ==========================================
   ReServe Forgot Password
========================================== */

const form = document.getElementById("forgotForm");

const emailInput = document.getElementById("email");

const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");

const sendButton = document.querySelector(".send-btn");

/* ==========================================
   EMAIL VALIDATION
========================================== */

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return regex.test(email);
}

/* ==========================================
   ALERTS
========================================== */

function hideMessages() {
  successMessage.style.display = "none";
  errorMessage.style.display = "none";
}

function showSuccess(message) {
  hideMessages();

  successMessage.querySelector("span").textContent = message;

  successMessage.style.display = "flex";

  setTimeout(() => {
    hideMessages();
  }, 5000);
}

function showError(message) {
  hideMessages();

  errorMessage.querySelector("span").textContent = message;

  errorMessage.style.display = "flex";

  setTimeout(() => {
    hideMessages();
  }, 5000);
}

/* ==========================================
   LOADING BUTTON
========================================== */

function setLoading(state) {
  if (state) {
    sendButton.disabled = true;

    sendButton.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Sending...
    `;
  } else {
    sendButton.disabled = false;

    sendButton.innerHTML = `
      <span>Send Reset Link</span>
      <i class="fa-solid fa-arrow-right"></i>
    `;
  }
}

/* ==========================================
   FORM VALIDATION
========================================== */

function validateForm() {
  hideMessages();

  const email = emailInput.value.trim();

  if (email === "") {
    showError("Please enter your email address.");

    emailInput.focus();

    return false;
  }

  if (!validateEmail(email)) {
    showError("Please enter a valid email address.");

    emailInput.focus();

    return false;
  }

  return true;
}

/* ==========================================
   SUBMIT
========================================== */

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  setLoading(true);

  try {
    // Simulate API request
    await new Promise((resolve) => setTimeout(resolve, 1500));

    showSuccess(
      "If an account exists with this email, a password reset link has been sent.",
    );

    form.reset();
  } catch (error) {
    console.error(error);

    showError("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
});

/* ==========================================
   REMOVE ERROR WHILE TYPING
========================================== */

emailInput.addEventListener("input", hideMessages);

/* ==========================================
   ENTER KEY SUPPORT
========================================== */

emailInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    form.requestSubmit();
  }
});

/* ==========================================
   PAGE LOAD
========================================== */

window.addEventListener("load", () => {
  emailInput.focus();
});
