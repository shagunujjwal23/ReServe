/* ==========================================
   ReServe Reset Password
========================================== */

const form = document.getElementById("resetForm");

const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const passwordMessage = document.getElementById("passwordMessage");
const matchMessage = document.getElementById("matchMessage");

const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");

const resetBtn = document.querySelector(".reset-btn");

/* ==========================================
   VALIDATION
========================================== */

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

  resetBtn.disabled = true;

  resetBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Updating Password...
    `;

  try {
    // Replace with your Flask API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    showSuccess("Password reset successfully! Redirecting to Login...");

    form.reset();

    setTimeout(() => {
      // window.location.href = "/login";
    }, 1500);
  } catch {
    showError("Something went wrong. Please try again.");
  } finally {
    resetBtn.disabled = false;

    resetBtn.innerHTML = `
            <span>Reset Password</span>
            <i class="fa-solid fa-arrow-right"></i>
        `;
  }
});

/* ==========================================
   CLEAR ERROR
========================================== */

[passwordInput, confirmPasswordInput].forEach((input) => {
  input.addEventListener("input", () => {
    errorMessage.style.display = "none";
  });
});

/* ==========================================
   PAGE LOAD
========================================== */

window.addEventListener("load", () => {
  passwordInput.focus();
});
