/* ==========================================
            FOOTER JAVASCRIPT
========================================== */

/* ==========================================
        BACK TO TOP BUTTON
========================================== */

const backToTop = document.querySelector(".back-to-top");

window.addEventListener("scroll", () => {
  if (window.scrollY > 500) {
    backToTop.classList.add("show");
  } else {
    backToTop.classList.remove("show");
  }
});

backToTop.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

/* ==========================================
        NEWSLETTER SUBSCRIPTION
========================================== */

const newsletterInput = document.querySelector(".newsletter input");
const subscribeBtn = document.querySelector(".newsletter button");
const message = document.querySelector(".newsletter-message");

subscribeBtn.addEventListener("click", () => {
  const email = newsletterInput.value.trim();

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email === "") {
    message.textContent = "Please enter your email address.";
    message.className = "newsletter-message error";
    newsletterInput.focus();
    return;
  }

  if (!emailPattern.test(email)) {
    message.textContent = "Please enter a valid email address.";
    message.className = "newsletter-message error";
    newsletterInput.focus();
    return;
  }

  message.textContent = "✓ Thank you for subscribing!";
  message.className = "newsletter-message success";

  newsletterInput.value = "";
});

/* ==========================================
        ENTER KEY SUPPORT
========================================== */

newsletterInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    subscribeBtn.click();
  }
});
