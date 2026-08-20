import { db } from "./firebase.js";
import {
  collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, Timestamp
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
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}

function initNav() {
  const toggle = $("#navToggle"), nav = $("#siteNav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

function initWhatsApp() {
  const base = "Hello Lala Paneer Udyog, I found your business through your website and would like to place an order.";
  const href = `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(base)}`;
  $$("[data-whatsapp-link]").forEach(a => a.href = href);
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Price on enquiry";
  return new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n);
}

function isOfferActive(offer) {
  if (!offer || offer.enabled !== true) return false;
  const now = Date.now();
  const start = offer.startAt?.toMillis?.() ?? (offer.startAt ? Date.parse(offer.startAt) : NaN);
  const end = offer.endAt?.toMillis?.() ?? (offer.endAt ? Date.parse(offer.endAt) : NaN);
  return (!Number.isFinite(start) || now >= start) && (!Number.isFinite(end) || now < end);
}

function productCard(product) {
  const activeOffer = isOfferActive(product.offer);
  const price = activeOffer ? product.offer.offerPrice : product.price;
  const old = activeOffer ? product.offer.originalPrice : null;
  const unit = product.unit || "unit";
  const available = product.available !== false;
  const image = product.imageUrl
    ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name || "Dairy product")}" loading="lazy">`
    : "🥛";
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
        <div class="availability ${available ? "available" : "unavailable"}">${available ? "Available" : "Currently unavailable"}</div>
        <div class="product-actions">
          <a class="btn ${available ? "btn-primary" : "btn-secondary"}" href="${available ? `contact.html?product=${encodeURIComponent(product.name || "")}` : "#"}">
            ${available ? "Order / Enquire" : "Enquire"}
          </a>
        </div>
      </div>
    </article>`;
}

async function getProducts() {
  const q = query(
    collection(db, "products"),
    where("publicVisible", "==", true),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
}

async function renderFeatured() {
  const grid = $("#featuredProducts");
  if (!grid) return;
  try {
    const products = (await getProducts()).filter(p => p.available !== false).slice(0, 4);
    grid.innerHTML = products.length ? products.map(productCard).join("") :
      `<div class="loading-card">No products are currently published.</div>`;
  } catch (error) {
    console.error(error);
    grid.innerHTML = `<div class="loading-card">Products are temporarily unavailable. Please call or WhatsApp us.</div>`;
  }
}

async function renderProducts() {
  const grid = $("#productGrid");
  const filters = $("#categoryFilters");
  if (!grid || !filters) return;
  try {
    const products = await getProducts();
    const categories = ["All", ...new Set(products.map(p => p.category).filter(Boolean))];
    filters.innerHTML = categories.map((c, i) =>
      `<button type="button" class="${i === 0 ? "active" : ""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    ).join("");

    const draw = category => {
      const list = category === "All" ? products : products.filter(p => p.category === category);
      grid.innerHTML = list.length ? list.map(productCard).join("") :
        `<div class="loading-card">No products found in this category.</div>`;
    };
    draw("All");
    filters.addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      $$(".filter-bar button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      draw(btn.dataset.category);
    });
  } catch (error) {
    console.error(error);
    grid.innerHTML = `<div class="loading-card">Products are temporarily unavailable. Please call or WhatsApp us.</div>`;
  }
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name) || "";
}

function validPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""));
}

async function submitInquiry(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const name = data.name.trim();
  const phone = data.phone.replace(/\D/g, "");
  const email = data.email.trim();
  const message = data.message.trim();
  const type = data.type;

  if (name.length < 2 || name.length > 80) throw new Error("Please enter a valid name.");
  if (!validPhone(phone)) throw new Error("Please enter a valid 10-digit mobile number.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email.");
  if (message.length < 5 || message.length > 1200) throw new Error("Please enter a valid enquiry.");
  if (!["general","order","bulk"].includes(type)) throw new Error("Invalid enquiry type.");

  const ref = await addDoc(collection(db, "inquiries"), {
    name, phone, email: email || null, message, type,
    source: "contact-form", status: "New", createdAt: serverTimestamp()
  });

  return ref.id;
}

function initInquiryForm() {
  const form = $("#inquiryForm"), status = $("#formStatus");
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
renderFeatured();
renderProducts();
initInquiryForm();
