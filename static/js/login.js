/* ==========================================================
   ReServe - Login
   login.js
========================================================== */

const API_BASE_URL = "/api";

/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initializeLogin();
});

/* ==========================================================
   INITIALIZE
========================================================== */

function initializeLogin() {
  setupPasswordToggle();
  setupValidation();
  setupLoginForm();
  setupForgotPassword();
  setupSocialLogin();
  loadRememberedEmail();
}

/* ==========================================================
   PASSWORD TOGGLE
========================================================== */

function setupPasswordToggle() {
  const button = document.getElementById("togglePassword");
  const input = document.getElementById("password");

  if (!button || !input) {
    return;
  }

  button.addEventListener("click", () => {
    const icon = button.querySelector("i");

    if (input.type === "password") {
      input.type = "text";

      if (icon) {
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      }

      button.setAttribute("aria-label", "Hide Password");
    } else {
      input.type = "password";

      if (icon) {
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }

      button.setAttribute("aria-label", "Show Password");
    }
  });
}

/* ==========================================================
   VALIDATION
   Validation happens while typing.
========================================================== */

function setupValidation() {
  const email = document.getElementById("email");
  const password = document.getElementById("password");

  if (email) {
    email.addEventListener("input", () => {
      validateEmail(false);
    });
  }

  if (password) {
    password.addEventListener("input", () => {
      validatePassword(false);
    });
  }
}

/* ==========================================================
   EMAIL VALIDATION
========================================================== */

function validateEmail(showRequired = false) {
  const input = document.getElementById("email");
  const message = document.getElementById("emailMessage");

  if (!input || !message) {
    return true;
  }

  const value = input.value.trim();

  /* Empty */
  if (!value) {
    message.textContent = showRequired
      ? "Please enter your email address."
      : "";

    message.style.color = "#dc2626";

    return false;
  }

  /* Email format */
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(value)) {
    message.textContent = "Enter a valid email address.";
    message.style.color = "#dc2626";

    return false;
  }

  /*
   * Positive feedback only after
   * a valid email has been entered.
   */
  message.textContent = "Valid email address.";
  message.style.color = "#07883f";

  return true;
}

/* ==========================================================
   PASSWORD VALIDATION
========================================================== */

function validatePassword(showRequired = false) {
  const input = document.getElementById("password");
  const message = document.getElementById("passwordMessage");

  if (!input || !message) {
    return true;
  }

  const value = input.value;

  /* Empty */
  if (!value) {
    message.textContent = showRequired ? "Please enter your password." : "";

    message.style.color = "#dc2626";

    return false;
  }

  /*
   * Login does not need to check password strength.
   *
   * The password was already validated during signup.
   * Here we only need to make sure something is entered.
   */

  message.textContent = "";
  return true;
}

/* ==========================================================
   LOGIN FORM
========================================================== */

function setupLoginForm() {
  const form = document.getElementById("loginForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearMessages();

    /* ======================================================
       GET VALUES
    ====================================================== */

    const email = document.getElementById("email")?.value.trim() || "";

    const password = document.getElementById("password")?.value || "";

    const rememberMe = document.getElementById("rememberMe")?.checked || false;

    /* ======================================================
       REQUIRED EMAIL
    ====================================================== */

    if (!email) {
      validateEmail(true);

      document.getElementById("email")?.focus();

      return;
    }

    /* ======================================================
       REQUIRED PASSWORD
    ====================================================== */

    if (!password) {
      validatePassword(true);

      document.getElementById("password")?.focus();

      return;
    }

    /* ======================================================
       VALIDATE EMAIL
    ====================================================== */

    if (!validateEmail()) {
      document.getElementById("email")?.focus();

      return;
    }

    /* ======================================================
       VALIDATE PASSWORD
    ====================================================== */

    if (!validatePassword()) {
      document.getElementById("password")?.focus();

      return;
    }

    /* ======================================================
       LOGIN BUTTON
    ====================================================== */

    const button = document.getElementById("loginBtn");

    if (!button) {
      return;
    }

    const originalHTML = button.innerHTML;

    button.disabled = true;

    button.innerHTML = `
      <span>Logging in...</span>
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    /* ======================================================
       LOGIN API
    ====================================================== */

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      /* ====================================================
         API ERROR
      ==================================================== */

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || data.error || "Invalid email or password.",
        );
      }

      /* ====================================================
         GET USER
      ==================================================== */

      const user = data.user || {
        email: email,
      };

      /*
       * Make sure role is available.
       *
       * Some backends return:
       * user.role
       *
       * Others may return:
       * data.role
       */

      const role = user.role || data.role || "user";

      user.role = role;

      /* ====================================================
         SAVE USER
      ==================================================== */

      localStorage.setItem("user", JSON.stringify(user));

      /* ====================================================
         REMEMBER ME
      ==================================================== */

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      /* ====================================================
         SUCCESS
      ==================================================== */

      showSuccess(data.message || "Login successful!");

      /* ====================================================
         ROLE-BASED REDIRECT
      ==================================================== */

      setTimeout(() => {
        redirectByRole(role);
      }, 700);
    } catch (error) {
      console.error("Login error:", error);

      showError(error.message || "Unable to login. Please try again.");

      button.disabled = false;

      button.innerHTML = originalHTML;
    }
  });
}

/* ==========================================================
   ROLE-BASED REDIRECT
========================================================== */

function redirectByRole(role) {
  const normalizedRole = String(role || "")
    .trim()
    .toLowerCase();

  switch (normalizedRole) {
    /* ======================================================
       INDIVIDUAL USER
    ====================================================== */

    case "user":
    case "individual":
      window.location.href = "/user-dashboard";
      break;

    /* ======================================================
       FOOD PROVIDER
    ====================================================== */

    case "provider":
    case "food_provider":
    case "food provider":
    case "donor":
    case "restaurant":
      window.location.href = "/dashboard";
      break;

    /* ======================================================
       NGO
    ====================================================== */

    case "ngo":
      window.location.href = "/ngo-dashboard";
      break;

    /* ======================================================
       ADMIN
    ====================================================== */

    case "admin":
      window.location.href = "/dashboard";
      break;

    /* ======================================================
       FALLBACK
    ====================================================== */

    default:
      window.location.href = "/user-dashboard";
      break;
  }
}

/* ==========================================================
   REMEMBERED EMAIL
========================================================== */

function loadRememberedEmail() {
  const emailInput = document.getElementById("email");
  const rememberMe = document.getElementById("rememberMe");

  if (!emailInput) {
    return;
  }

  const rememberedEmail = localStorage.getItem("rememberedEmail");

  if (rememberedEmail) {
    emailInput.value = rememberedEmail;

    if (rememberMe) {
      rememberMe.checked = true;
    }

    /*
     * Don't show "Valid email address"
     * immediately when the page loads.
     */
    const message = document.getElementById("emailMessage");

    if (message) {
      message.textContent = "";
    }
  }
}

/* ==========================================================
   FORGOT PASSWORD
========================================================== */

function setupForgotPassword() {
  const button = document.getElementById("forgotPassword");

  if (!button) {
    return;
  }

  button.addEventListener("click", (event) => {
    event.preventDefault();

    showError("Password reset is not configured yet.");
  });
}

/* ==========================================================
   SOCIAL LOGIN
========================================================== */

function setupSocialLogin() {
  const googleButton = document.getElementById("googleLogin");

  const facebookButton = document.getElementById("facebookLogin");

  if (googleButton) {
    googleButton.addEventListener("click", () => {
      showError("Google login is not configured yet.");
    });
  }

  if (facebookButton) {
    facebookButton.addEventListener("click", () => {
      showError("Facebook login is not configured yet.");
    });
  }
}

/* ==========================================================
   SUCCESS MESSAGE
========================================================== */

function showSuccess(message) {
  const element = document.getElementById("successMessage");

  if (!element) {
    return;
  }

  const text = element.querySelector("span");

  if (text) {
    text.textContent = message;
  }

  element.style.display = "flex";
}

/* ==========================================================
   ERROR MESSAGE
========================================================== */

function showError(message) {
  const element = document.getElementById("errorMessage");

  if (!element) {
    return;
  }

  const text = element.querySelector("span");

  if (text) {
    text.textContent = message;
  }

  element.style.display = "flex";
}

/* ==========================================================
   CLEAR MESSAGES
========================================================== */

function clearMessages() {
  const success = document.getElementById("successMessage");

  const error = document.getElementById("errorMessage");

  if (success) {
    success.style.display = "none";
  }

  if (error) {
    error.style.display = "none";
  }
}
