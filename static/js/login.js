/* ==========================================
   ReServe Login
========================================== */

const form = document.getElementById("loginForm");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");

const loginButton = document.querySelector(".login-btn");
const googleButton = document.getElementById("googleLoginBtn");

/* ==========================================
   PASSWORD TOGGLE
========================================== */

document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.target);

    const icon = button.querySelector("i");

    if (target.type === "password") {
      target.type = "text";

      icon.classList.remove("fa-eye");
      icon.classList.add("fa-eye-slash");
    } else {
      target.type = "password";

      icon.classList.remove("fa-eye-slash");
      icon.classList.add("fa-eye");
    }
  });
});

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
}

function showError(message) {
  hideMessages();

  errorMessage.querySelector("span").textContent = message;

  errorMessage.style.display = "flex";
}

/* ==========================================
   LOADING BUTTON
========================================== */

function setLoading(state) {
  if (state) {
    loginButton.disabled = true;

    loginButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Signing In...
        `;
  } else {
    loginButton.disabled = false;

    loginButton.innerHTML = `
            <span>Continue</span>
            <i class="fa-solid fa-arrow-right"></i>
        `;
  }
}

/* ==========================================
   INPUT VALIDATION
========================================== */

function validateForm() {
  hideMessages();

  const email = emailInput.value.trim();

  const password = passwordInput.value.trim();

  if (email === "") {
    showError("Please enter your email.");

    emailInput.focus();

    return false;
  }

  if (!validateEmail(email)) {
    showError("Please enter a valid email address.");

    emailInput.focus();

    return false;
  }

  if (password === "") {
    showError("Please enter your password.");

    passwordInput.focus();

    return false;
  }

  if (password.length < 6) {
    showError("Password must contain at least 6 characters.");

    passwordInput.focus();

    return false;
  }

  return true;
}

/* ==========================================
   FORM SUBMIT
========================================== */

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  setLoading(true);

  try {
    const response = await fetch("/api/login", {
      method: "POST",

      credentials: "same-origin",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        email: emailInput.value.trim(),

        password: passwordInput.value.trim(),

        remember: document.querySelector('input[name="remember"]').checked,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      showSuccess(data.message || "Login successful! Redirecting...");

      setTimeout(() => {
        window.location.href = data.redirect || "/dashboard";
      }, 1200);
    } else {
      showError(data.message || "Invalid email or password.");
    }
  } catch (error) {
    console.error(error);

    showError("Unable to connect to the server.");
  } finally {
    setLoading(false);
  }
});

/* ==========================================
   GOOGLE LOGIN
========================================== */

googleButton.addEventListener("click", () => {
  // Replace with your Google OAuth route

  window.location.href = "/auth/google";
});

/* ==========================================
   ENTER KEY SUPPORT
========================================== */

[emailInput, passwordInput].forEach((input) => {
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      form.requestSubmit();
    }
  });
});

/* ==========================================
   AUTO HIDE ALERTS
========================================== */

function autoHideAlerts() {
  setTimeout(() => {
    hideMessages();
  }, 5000);
}

const originalSuccess = showSuccess;
const originalError = showError;

showSuccess = function (message) {
  originalSuccess(message);

  autoHideAlerts();
};

showError = function (message) {
  originalError(message);

  autoHideAlerts();
};

/* ==========================================
   REMOVE ERROR ON INPUT
========================================== */

[emailInput, passwordInput].forEach((input) => {
  input.addEventListener("input", () => {
    hideMessages();
  });
});

/* ==========================================
   PAGE LOAD
========================================== */

window.addEventListener("load", () => {
  emailInput.focus();
});
