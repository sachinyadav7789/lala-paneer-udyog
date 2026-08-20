import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const BUSINESS = {
  name: "Lala Paneer Udyog",
  phone: "8949162380",
  whatsapp: "918949162380",
  alternatePhone: "8003647577",
  email: "lalapaneeru@gmail.com"
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function initNav() {
  const toggle = $("#navToggle");
  const nav = $("#siteNav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

function initWhatsApp() {
  const base = "Hello Lala Paneer Udyog, I found your business through your website and would like to place an order.";
  const href = `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(base)}`;
  $$('[data-whatsapp-link]').forEach(a => a.href = href);
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Price on enquiry";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(n);
}

function toMillis(value) {
  if (!value) return NaN;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value);
  if (typeof value.seconds === "number") return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
  return NaN;
}

function isOfferActive(offer) {
  if (!offer || offer.enabled !== true) return false;

  const now = Date.now();
  const start = toMillis(offer.startAt);
  const end = toMillis(offer.endAt);

  const started = !Number.isFinite(start) || now >= start;
  const notExpired = !Number.isFinite(end) || now < end;
  return started && notExpired;
}

function productCard(product) {
  const activeOffer = isOfferActive(product.offer);
  const price = activeOffer ? product.offer.offerPrice : product.price;
  const old = activeOffer ? product.offer.originalPrice : null;
  const unit = product.unit || "unit";
  const available = product.available !== false;
  const endAt = activeOffer ? toMillis(product.offer?.endAt) : NaN;

  const image = product.imageUrl
    ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name || "Dairy product")}" loading="lazy">`
    : "🥛";

  const countdown = activeOffer && Number.isFinite(endAt)
    ? `<div class="offer-countdown" data-countdown-end="${endAt}" aria-live="polite">Offer ends in calculating…</div>`
    : "";

  return `
    <article class="product-card">
      <div class="product-image">${image}</div>
      <div class="product-body">
        ${activeOffer ? `<span class="badge">${escapeHtml(product.offer.badge || "Special Offer")}</span>` : ""}
        <h3>${escapeHtml(product.name || "Dairy Product")}</h3>
        <p>${escapeHtml(product.description || "Fresh dairy product from Lala Paneer Udyog.")}</p>
        <div class="price-line">
          <span class="price">${formatPrice(price)}<small> / ${escapeHtml(unit)}</small></span>
          ${old != null ? `<span class="old-price">${formatPrice(old)}</span>` : ""}
        </div>
        ${countdown}
        <div class="availability ${available ? "available" : "unavailable"}">${available ? "Available" : "Currently unavailable"}</div>
        <div class="product-actions">
          <a class="btn ${available ? "btn-primary" : "btn-secondary"}"
             href="${available ? `contact.html?product=${encodeURIComponent(product.name || "")}` : "#"}">
            ${available ? "Order / Enquire" : "Enquire"}
          </a>
        </div>
      </div>
    </article>`;
}

function startCountdowns() {
  $$("[data-countdown-end]").forEach(el => {
    const end = Number(el.dataset.countdownEnd);
    if (!Number.isFinite(end)) return;

    const update = () => {
      const remaining = end - Date.now();
      if (remaining <= 0) {
        el.textContent = "Offer ended";
        el.classList.add("expired");
        return false;
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      el.textContent = days > 0 ? `Offer ends in ${days}d ${time}` : `Offer ends in ${time}`;
      return true;
    };

    update();
    const timer = setInterval(() => {
      if (!update()) clearInterval(timer);
    }, 1000);
  });
}

function subscribeToProducts(onProducts, onError) {
  const q = query(
    collection(db, "products"),
    where("publicVisible", "==", true),
    orderBy("name", "asc")
  );

  return onSnapshot(
    q,
    snapshot => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      onProducts(products);
    },
    error => {
      console.error("Firestore products listener error:", error);
      onError?.(error);
    }
  );
}

function renderFeaturedFromProducts(products) {
  const grid = $("#featuredProducts");
  if (!grid) return;

  const visible = products.filter(p => p.available !== false).slice(0, 4);
  grid.innerHTML = visible.length
    ? visible.map(productCard).join("")
    : `<div class="loading-card">No products are currently published.</div>`;

  startCountdowns();
}

function renderProductsFromProducts(products) {
  const grid = $("#productGrid");
  const filters = $("#categoryFilters");
  if (!grid || !filters) return;

  const categories = ["All", ...new Set(products.map(p => p.category).filter(Boolean))];
  const current = $(".filter-bar button.active", filters)?.dataset.category || "All";

  filters.innerHTML = categories.map((category, index) => {
    const active = (current === category) || (index === 0 && !categories.includes(current));
    return `<button type="button" class="${active ? "active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`;
  }).join("");

  const draw = category => {
    const list = category === "All" ? products : products.filter(p => p.category === category);
    grid.innerHTML = list.length
      ? list.map(productCard).join("")
      : `<div class="loading-card">No products found in this category.</div>`;
    startCountdowns();
  };

  draw(categories.includes(current) ? current : "All");

  if (!filters.dataset.listenerAttached) {
    filters.dataset.listenerAttached = "true";
    filters.addEventListener("click", e => {
      const btn = e.target.closest("button[data-category]");
      if (!btn) return;
      $$("button", filters).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const latestProducts = window.__lpuProducts || [];
      const category = btn.dataset.category;
      const list = category === "All" ? latestProducts : latestProducts.filter(p => p.category === category);
      grid.innerHTML = list.length
        ? list.map(productCard).join("")
        : `<div class="loading-card">No products found in this category.</div>`;
      startCountdowns();
    });
  }
}

function initProductRealtime() {
  if (!$("#featuredProducts") && !$("#productGrid")) return;

  const showLoading = () => {
    if ($("#featuredProducts")) $("#featuredProducts").innerHTML = `<div class="loading-card">Loading latest products…</div>`;
    if ($("#productGrid")) $("#productGrid").innerHTML = `<div class="loading-card">Loading latest products…</div>`;
  };

  showLoading();

  subscribeToProducts(products => {
    window.__lpuProducts = products;
    renderFeaturedFromProducts(products);
    renderProductsFromProducts(products);
  }, () => {
    const message = `<div class="loading-card">Products are temporarily unavailable. Please call or WhatsApp us.</div>`;
    if ($("#featuredProducts")) $("#featuredProducts").innerHTML = message;
    if ($("#productGrid")) $("#productGrid").innerHTML = message;
  });
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name) || "";
}

function validPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""));
}

async function submitInquiry(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const name = String(data.name || "").trim();
  const phone = String(data.phone || "").replace(/\D/g, "");
  const email = String(data.email || "").trim();
  const message = String(data.message || "").trim();
  const type = String(data.type || "");

  if (name.length < 2 || name.length > 80) throw new Error("Please enter a valid name.");
  if (!validPhone(phone)) throw new Error("Please enter a valid 10-digit mobile number.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email.");
  if (message.length < 5 || message.length > 1200) throw new Error("Please enter a valid enquiry.");
  if (!["general", "order", "bulk"].includes(type)) throw new Error("Invalid enquiry type.");

  const ref = await addDoc(collection(db, "inquiries"), {
    name,
    phone,
    email: email || null,
    message,
    type,
    source: "contact-form",
    status: "New",
    createdAt: serverTimestamp()
  });

  return ref.id;
}

function initInquiryForm() {
  const form = $("#inquiryForm");
  const status = $("#formStatus");
  if (!form || !status) return;

  const product = getParam("product");
  const type = getParam("type");
  const msg = $("textarea[name='message']", form);
  const select = $("select[name='type']", form);

  if (product && msg) msg.value = `I would like to enquire about ${product}. Quantity/date/time: `;
  if (type === "bulk" && select) select.value = "bulk";

  form.addEventListener("submit", async e => {
    e.preventDefault();
    status.className = "form-status";
    status.textContent = "Submitting…";
    const button = $("button[type='submit']", form);
    button.disabled = true;

    try {
      const inquiryId = await submitInquiry(form);
      status.className = "form-status success";
      status.textContent = `Enquiry submitted successfully. Inquiry ID: ${inquiryId}`;
      form.reset();
    } catch (error) {
      console.error(error);
      status.className = "form-status error";
      status.textContent = error.message || "Enquiry submit nahi ho paya. Please try again or contact us on WhatsApp.";
    } finally {
      button.disabled = false;
    }
  });
}

initNav();
initWhatsApp();
initProductRealtime();
initInquiryForm();
