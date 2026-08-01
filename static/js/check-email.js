/* ==========================================
   ReServe Check Email
========================================== */

const resendBtn = document.getElementById("resendBtn");
const userEmail = document.getElementById("userEmail");

/* ==========================================
   LOAD EMAIL
========================================== */

// Replace this later with the email returned by Flask
const email = sessionStorage.getItem("resetEmail") || "example@email.com";

userEmail.textContent = email;

/* ==========================================
   RESEND EMAIL
========================================== */

resendBtn.addEventListener("click", async () => {

    resendBtn.disabled = true;

    resendBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Sending...</span>
    `;

    try {

        // Replace with your Flask API
        await new Promise(resolve => setTimeout(resolve, 2000));

        resendBtn.innerHTML = `
            <i class="fa-solid fa-circle-check"></i>
            <span>Email Sent Again</span>
        `;

        setTimeout(() => {

            resendBtn.disabled = false;

            resendBtn.innerHTML = `
                <i class="fa-solid fa-paper-plane"></i>
                <span>Resend Email</span>
            `;

        }, 3000);

    } catch {

        resendBtn.disabled = false;

        resendBtn.innerHTML = `
            <i class="fa-solid fa-paper-plane"></i>
            <span>Resend Email</span>
        `;

        alert("Unable to resend email. Please try again.");

    }

});