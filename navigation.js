const BUSINESS_WHATSAPP = "918949162380";

const navQuery = (selector, root = document) => root.querySelector(selector);
const navAll = (selector, root = document) => [...root.querySelectorAll(selector)];

let navigationReady = false;

function closeMobileNav() {
  const toggle = navQuery("#navToggle");
  const nav = navQuery("#siteNav");
  if (!toggle || !nav) return;
  nav.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open navigation");
  document.body.classList.remove("nav-open");
}

function openMobileNav() {
  const toggle = navQuery("#navToggle");
  const nav = navQuery("#siteNav");
  if (!toggle || !nav) return;
  nav.classList.add("open");
  toggle.setAttribute("aria-expanded", "true");
  toggle.setAttribute("aria-label", "Close navigation");
  document.body.classList.add("nav-open");
}

function initNavigation() {
  if (navigationReady) return;
  const toggle = navQuery("#navToggle");
  const nav = navQuery("#siteNav");
  if (!toggle || !nav) return;
  navigationReady = true;

  toggle.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    nav.classList.contains("open") ? closeMobileNav() : openMobileNav();
  });

  nav.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (link) closeMobileNav();
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
  }, { passive: true });
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { initNavigation(); initWhatsAppLinks(); }, { once: true });
} else {
  initNavigation();
  initWhatsAppLinks();
}
