/* ==========================================
            FAQ ACCORDION
========================================== */

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach((item) => {
  const question = item.querySelector(".faq-question");
  const icon = question.querySelector("i");

  question.addEventListener("click", () => {
    const isActive = item.classList.contains("active");

    // Close all FAQs
    faqItems.forEach((faq) => {
      faq.classList.remove("active");

      const faqIcon = faq.querySelector(".faq-question i");

      faqIcon.classList.remove("fa-minus");
      faqIcon.classList.add("fa-plus");
    });

    // Open clicked FAQ
    if (!isActive) {
      item.classList.add("active");

      icon.classList.remove("fa-plus");
      icon.classList.add("fa-minus");
    }
  });
});
