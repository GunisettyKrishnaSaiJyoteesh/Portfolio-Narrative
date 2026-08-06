/**
 * Highlights the rail entry for whichever chapter owns the middle of the
 * viewport. The symmetric -45% margin collapses the observation zone to a
 * thin band across the screen's centre, so exactly one chapter is ever active.
 */
const CENTRE_BAND = "-45% 0px -45% 0px";

export function initChapterRail(root = document) {
  const items = [...root.querySelectorAll(".rail li")];
  const chapters = root.querySelectorAll("section.chapter");
  if (!items.length || !chapters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = entry.target.id;
        items.forEach((li) => li.classList.toggle("active", li.dataset.for === id));
      }
    },
    { rootMargin: CENTRE_BAND }
  );

  chapters.forEach((section) => observer.observe(section));
}
