const BUSINESS_WHATSAPP = "918949162380";

const navQuery = (selector, root = document) => root.querySelector(selector);
const navAll = (selector, root = document) => [...root.querySelectorAll(selector)];

function closeMobileNav() {
  const toggle = navQuery("#navToggle");
  const nav = navQuery("#siteNav");
  if (!toggle || !nav) return;

  nav.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("nav-open");
}

function initNavigation() {
  const toggle = navQuery("#navToggle");
  const nav = navQuery("#siteNav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", event => {
    event.stopPropagation();
    const open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-open", open);
  });

  nav.addEventListener("click", event => {
    if (event.target.closest("a")) closeMobileNav();
  });

  document.addEventListener("click", event => {
    if (!nav.classList.contains("open")) return;
    if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMobileNav();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMobileNav();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 700) closeMobileNav();
  });
}

function initWhatsAppLinks() {
  const message = "Hello Lala Paneer Udyog, I found your website and would like to enquire/order.";
  const href = `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`;

  navAll("[data-whatsapp-link]").forEach(link => {
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
}

initNavigation();
initWhatsAppLinks();
