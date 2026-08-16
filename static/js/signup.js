/* ==========================================================
   ReServe - Signup
   signup.js
========================================================== */

const API_BASE_URL = "/api";

/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initializeSignup();
});

/* ==========================================================
   INITIALIZE
========================================================== */

function initializeSignup() {
  setupPasswordToggle(
    "togglePassword",
    "password",
    "Show Password",
    "Hide Password",
  );

  setupPasswordToggle(
    "toggleConfirmPassword",
    "confirmPassword",
    "Show Password",
    "Hide Password",
  );

  setupValidation();
  setupSignupForm();
  setupGoogleSignup();
}

/* ==========================================================
   PASSWORD TOGGLE
========================================================== */

function setupPasswordToggle(buttonId, inputId, showLabel, hideLabel) {
  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);

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

      button.setAttribute("aria-label", hideLabel);
    } else {
      input.type = "password";

      if (icon) {
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }

      button.setAttribute("aria-label", showLabel);
    }
  });
}

/* ==========================================================
   VALIDATION
   Validation happens while the user types.
========================================================== */

function setupValidation() {
  const name = document.getElementById("name");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");

  if (name) {
    name.addEventListener("input", () => {
      validateName(false);
    });
  }

  if (email) {
    email.addEventListener("input", () => {
      validateEmail(false);
    });
  }

  if (phone) {
    phone.addEventListener("input", () => {
      // Allow digits only
      phone.value = phone.value.replace(/\D/g, "");

      validatePhone(false);
    });
  }

  if (password) {
    password.addEventListener("input", () => {
      validatePassword(false);
      validatePasswordMatch(false);
    });
  }

  if (confirmPassword) {
    confirmPassword.addEventListener("input", () => {
      validatePasswordMatch(false);
    });
  }
}

/* ==========================================================
   NAME VALIDATION
========================================================== */

function validateName(showRequired = false) {
  const input = document.getElementById("name");
  const message = document.getElementById("nameMessage");

  if (!input || !message) {
    return true;
  }

  const value = input.value.trim();

  /* Empty */
  if (!value) {
    message.textContent = showRequired ? "Please enter your full name." : "";

    message.style.color = "#dc2626";

    return false;
  }

  /* Minimum length */
  if (value.length === 1) {
    message.textContent = "";
    return false;
  }

  if (value.length < 2) {
    message.textContent = "Name must contain at least 2 characters.";
    message.style.color = "#dc2626";

    return false;
  }
  /*
   * No success message for name.
   */
  message.textContent = "";

  return true;
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

  /*
   * Basic email format.
   */
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(value)) {
    message.textContent = "Enter a valid email address.";
    message.style.color = "#dc2626";

    return false;
  }

  /*
   * Keep positive feedback for email.
   */
  message.textContent = "Valid email address.";
  message.style.color = "#07883f";

  return true;
}

/* ==========================================================
   PHONE VALIDATION
========================================================== */

function validatePhone(showRequired = false) {
  const input = document.getElementById("phone");
  const message = document.getElementById("phoneMessage");

  if (!input || !message) {
    return true;
  }

  const value = input.value.trim();

  /* Empty */
  if (!value) {
    message.textContent = showRequired ? "Please enter your phone number." : "";

    message.style.color = "#dc2626";

    return false;
  }

  /* Exactly 10 digits and starts with 6-9 */
  const phonePattern = /^[6-9]\d{9}$/;

  if (!phonePattern.test(value)) {
    message.textContent = "Enter a valid 10-digit phone number.";

    message.style.color = "#dc2626";

    return false;
  }

  message.textContent = "Valid phone number.";
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

  const password = input.value;

  /* Empty */
  if (!password) {
    message.textContent = showRequired ? "Please create a password." : "";

    message.style.color = "#dc2626";

    return false;
  }

  /* Minimum length */
  if (password.length < 8) {
    message.textContent = "Password must be at least 8 characters.";

    message.style.color = "#dc2626";

    return false;
  }

  /* Uppercase */
  if (!/[A-Z]/.test(password)) {
    message.textContent = "Include at least one uppercase letter.";

    message.style.color = "#dc2626";

    return false;
  }

  /* Lowercase */
  if (!/[a-z]/.test(password)) {
    message.textContent = "Include at least one lowercase letter.";

    message.style.color = "#dc2626";

    return false;
  }

  /* Number */
  if (!/[0-9]/.test(password)) {
    message.textContent = "Include at least one number.";

    message.style.color = "#dc2626";

    return false;
  }

  /* Special character */
  if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]/`~';+=]/.test(password)) {
    message.textContent = "Include at least one special character.";

    message.style.color = "#dc2626";

    return false;
  }

  /*
   * Password is valid.
   */
  message.textContent = "Strong password.";
  message.style.color = "#07883f";

  return true;
}

/* ==========================================================
   PASSWORD MATCH
========================================================== */

function validatePasswordMatch(showRequired = false) {
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");

  const message = document.getElementById("matchMessage");

  if (!password || !confirmPassword || !message) {
    return true;
  }

  if (!confirmPassword.value) {
    message.textContent = showRequired ? "Please confirm your password." : "";

    message.style.color = "#dc2626";

    return false;
  }

  if (password.value !== confirmPassword.value) {
    message.textContent = "Passwords do not match.";

    message.style.color = "#dc2626";

    return false;
  }

  message.textContent = "Passwords match.";
  message.style.color = "#07883f";

  return true;
}

/* ==========================================================
   SIGNUP FORM
========================================================== */

function setupSignupForm() {
  const form = document.getElementById("signupForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearMessages();

    /* ======================================================
       GET FORM VALUES
    ====================================================== */

    const name = document.getElementById("name")?.value.trim() || "";

    const email = document.getElementById("email")?.value.trim() || "";

    const phone = document.getElementById("phone")?.value.trim() || "";

    const password = document.getElementById("password")?.value || "";

    const confirmPassword =
      document.getElementById("confirmPassword")?.value || "";

    const role = document.getElementById("role")?.value || "";

    const terms = document.getElementById("terms");

    /* ======================================================
       REQUIRED FIELDS
    ====================================================== */

    if (!name) {
      validateName(true);
      document.getElementById("name")?.focus();
      return;
    }

    if (!email) {
      validateEmail(true);
      document.getElementById("email")?.focus();
      return;
    }

    if (!phone) {
      validatePhone(true);
      document.getElementById("phone")?.focus();
      return;
    }

    if (!password) {
      validatePassword(true);
      document.getElementById("password")?.focus();
      return;
    }

    if (!confirmPassword) {
      validatePasswordMatch(true);
      document.getElementById("confirmPassword")?.focus();
      return;
    }

    /* ======================================================
       ROLE
    ====================================================== */

    if (!role) {
      showError("Please select your role.");

      document.getElementById("role")?.focus();

      return;
    }

    /* ======================================================
       TERMS
    ====================================================== */

    if (!terms || !terms.checked) {
      showError("Please agree to the Terms & Conditions and Privacy Policy.");

      return;
    }

    /* ======================================================
       VALIDATE NAME
    ====================================================== */

    if (!validateName()) {
      return;
    }

    /* ======================================================
       VALIDATE EMAIL
    ====================================================== */

    if (!validateEmail()) {
      return;
    }

     /* ======================================================
       VALIDATE PHONE
    ====================================================== */

    if (!validatePhone()) {
      return;
    }

    /* ======================================================
       VALIDATE PASSWORD
    ====================================================== */

    if (!validatePassword()) {
      return;
    }

    /* ======================================================
       VALIDATE PASSWORD MATCH
    ====================================================== */

    if (!validatePasswordMatch()) {
      return;
    }

    /* ======================================================
       REGISTER BUTTON
    ====================================================== */

    const button =
      form.querySelector(".register-btn") || form.querySelector(".signup-btn");

    const originalHTML = button ? button.innerHTML : "";

    if (button) {
      button.disabled = true;

      button.innerHTML = `
        <span>Creating Account...</span>
        <i class="fa-solid fa-spinner fa-spin"></i>
      `;
    }

    /* ======================================================
       REGISTER API
    ====================================================== */

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          full_name: name,
          email: email,
          phone: phone,
          password: password,
          role: role,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || data.error || "Unable to create your account.",
        );
      }

      /* ====================================================
         SAVE USER DATA
      ==================================================== */

      const user = data.user || {
        name: name,
        email: email,
        role: role,
      };

      localStorage.setItem("user", JSON.stringify(user));

      /* ====================================================
         SUCCESS
      ==================================================== */

      showSuccess(data.message || "Account created successfully!");

      /* ====================================================
         ROLE-BASED REDIRECT
      ==================================================== */

      setTimeout(() => {
  window.location.href = data.redirect || redirectByRole(role);
}, 700);
    } catch (error) {
      console.error("Signup error:", error);

      showError(
        error.message || "Unable to create your account. Please try again.",
      );

      if (button) {
        button.disabled = false;

        button.innerHTML = originalHTML;
      }
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

    /* Individual user */
    case "user":
    case "individual":
      return "/user-profile";

    /* Food provider */
    case "provider":
    case "food_provider":
    case "food provider":
    case "donor":
    case "restaurant":
      return "/provider-profile";

    /* NGO */
    case "ngo":
      return "/ngo-dashboard";

    /* Admin */
    case "admin":
      return "/dashboard";

    /* Fallback */
    default:
      return "/user-dashboard";
  }
}

/* ==========================================================
   GOOGLE SIGNUP
========================================================== */

function setupGoogleSignup() {
  const button = document.getElementById("googleSignup");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    showError("Google signup is not configured yet.");
  });
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
