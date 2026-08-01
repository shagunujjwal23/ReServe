// =========================================
// Statistics Counter Animation
// =========================================

const counters = document.querySelectorAll(".counter");

let hasAnimated = false;

function animateCounters() {

    if (hasAnimated) return;

    const statsSection = document.querySelector(".stats-section");

    const sectionTop = statsSection.getBoundingClientRect().top;

    const triggerPoint = window.innerHeight * 0.8;

    if (sectionTop < triggerPoint) {

        hasAnimated = true;

        counters.forEach(counter => {

            const target = +counter.dataset.target;

            let count = 0;

            const increment = Math.ceil(target / 80);

            const updateCounter = () => {

                count += increment;

                if (count >= target) {

                    counter.innerText = target;

                } else {

                    counter.innerText = count;

                    requestAnimationFrame(updateCounter);

                }

            };

            updateCounter();

        });

    }

}

window.addEventListener("scroll", animateCounters);
window.addEventListener("load", animateCounters);