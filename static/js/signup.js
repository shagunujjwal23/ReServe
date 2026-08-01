/* ==========================================
   ReServe Signup
========================================== */

const form = document.getElementById("signupForm");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");

const nameMessage = document.getElementById("nameMessage");
const emailMessage = document.getElementById("emailMessage");

const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const terms = document.getElementById("terms");

const passwordMessage = document.getElementById("passwordMessage");
const matchMessage = document.getElementById("matchMessage");

const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");

const signupBtn = document.querySelector(".signup-btn");

const googleBtn = document.getElementById("googleSignup");

/* ==========================================
   VALIDATION
========================================== */

function validateName(name) {
  return /^[A-Za-z\s]+$/.test(name.trim());
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#]).{8,}$/.test(
    password,
  );
}

/* ==========================================
   MESSAGES
========================================== */

function hideMessages() {
  successMessage.style.display = "none";
  errorMessage.style.display = "none";

  passwordMessage.className = "field-message";
  passwordMessage.textContent = "";

  matchMessage.className = "field-message";
  matchMessage.textContent = "";
}

function showError(message) {
  successMessage.style.display = "none";

  errorMessage.querySelector("span").textContent = message;
  errorMessage.style.display = "flex";
}

function showSuccess(message) {
  errorMessage.style.display = "none";

  successMessage.querySelector("span").textContent = message;
  successMessage.style.display = "flex";
}

/* ==========================================
   NAME VALIDATION
========================================== */

nameInput.addEventListener("input", () => {
  if (nameInput.value === "") {
    nameMessage.className = "field-message";
    nameMessage.textContent = "";
    return;
  }

  if (!validateName(nameInput.value)) {
    nameMessage.className = "field-message error";
    nameMessage.textContent = "Name should contain only letters and spaces.";
  } else {
    nameMessage.className = "field-message";
    nameMessage.textContent = "";
  }
});

/* ==========================================
   EMAIL VALIDATION
========================================== */

emailInput.addEventListener("input", () => {
  if (emailInput.value === "") {
    emailMessage.className = "field-message";
    emailMessage.textContent = "";
    return;
  }

  if (!validateEmail(emailInput.value)) {
    emailMessage.className = "field-message error";
    emailMessage.textContent = "Please enter a valid email address.";
  } else {
    emailMessage.className = "field-message";
    emailMessage.textContent = "";
  }
});

/* ==========================================
   PASSWORD VALIDATION
========================================== */

passwordInput.addEventListener("input", () => {
  if (passwordInput.value === "") {
    passwordMessage.className = "field-message";
    passwordMessage.textContent = "";

    return;
  }

  if (!validatePassword(passwordInput.value)) {
    passwordMessage.className = "field-message error";

    passwordMessage.innerHTML =
      "Password must contain at least <b>8 characters</b>, one <b>uppercase</b>, one <b>lowercase</b>, one <b>number</b> and one <b>special character</b>.";
  } else {
    passwordMessage.className = "field-message";
    passwordMessage.textContent = "";
  }
});

/* ==========================================
   PASSWORD MATCH
========================================== */

confirmPasswordInput.addEventListener("input", () => {
  if (confirmPasswordInput.value === "") {
    matchMessage.className = "field-message";
    matchMessage.textContent = "";

    return;
  }

  if (passwordInput.value === confirmPasswordInput.value) {
    matchMessage.className = "field-message success";
    matchMessage.textContent = "✓ Passwords match";
  } else {
    matchMessage.className = "field-message error";
    matchMessage.textContent = "Passwords do not match.";
  }
});

/* ==========================================
   SHOW / HIDE PASSWORD
========================================== */

document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.parentElement.querySelector("input");
    const icon = button.querySelector("i");

    if (input.type === "password") {
      input.type = "text";

      icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      input.type = "password";

      icon.classList.replace("fa-eye-slash", "fa-eye");
    }
  });
});

/* ==========================================
   SUBMIT
========================================== */

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  hideMessages();

  if (!validateName(nameInput.value)) {
    nameMessage.className = "field-message error";
    nameMessage.textContent = "Name should contain only letters and spaces.";
    nameInput.focus();
    return;
  }

  if (!validateEmail(emailInput.value.trim())) {
    emailMessage.className = "field-message error";
    emailMessage.textContent = "Please enter a valid email address.";
    emailInput.focus();
    return;
  }

  if (!validatePassword(passwordInput.value)) {
    passwordMessage.className = "field-message error";

    passwordMessage.innerHTML =
      "Password must contain at least <b>8 characters</b>, one <b>uppercase</b>, one <b>lowercase</b>, one <b>number</b> and one <b>special character</b>.";

    passwordInput.focus();

    return;
  }

  if (passwordInput.value !== confirmPasswordInput.value) {
    matchMessage.className = "field-message error";
    matchMessage.textContent = "Passwords do not match.";

    confirmPasswordInput.focus();

    return;
  }

  if (!terms.checked) {
    showError("Please accept the Terms & Privacy Policy.");
    return;
  }

  signupBtn.disabled = true;

  signupBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Creating Account...
    `;

  try {
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
        // The existing design has no role selector; new accounts start as donors.
        role: "donor",
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      showError(data.message || "Unable to create the account. Please try again.");
      return;
    }

    showSuccess(data.message || "Account created successfully! Redirecting to Login...");

    form.reset();

    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  } catch (error) {
    console.error(error);
    showError("Unable to connect to the server. Please try again.");
  } finally {
    signupBtn.disabled = false;

    signupBtn.innerHTML = `
            <span>Create Account</span>
            <i class="fa-solid fa-arrow-right"></i>
        `;
  }
});

/* ==========================================
   GOOGLE SIGNUP
========================================== */

googleBtn.addEventListener("click", () => {
  // window.location.href="/auth/google";

  alert("Google Sign Up will be connected with Flask later.");
});

/* ==========================================
   CLEAR FORM ERRORS
========================================== */

[nameInput, emailInput].forEach((input) => {
  input.addEventListener("input", () => {
    errorMessage.style.display = "none";
  });
});

/* ==========================================
   PAGE LOAD
========================================== */

window.addEventListener("load", () => {
  nameInput.focus();
});
