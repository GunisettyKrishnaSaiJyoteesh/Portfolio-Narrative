/** Fade-and-rise on first entry. Elements opt in with class="reveal". */

const THRESHOLD = 0.18;

export function initReveals(root = document) {
  const targets = root.querySelectorAll(".reveal");
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        observer.unobserve(entry.target); // reveal once, never re-hide
      }
    },
    { threshold: THRESHOLD }
  );

  targets.forEach((el) => observer.observe(el));
}
