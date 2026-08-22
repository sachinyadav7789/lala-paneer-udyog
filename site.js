import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function safeImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}


const WEBSITE_PRODUCT_IMAGES = {
  paneer: "panner.png",
  milk: "milk.jpg",
  dahi: "dahi.png",
  "desi-ghee": "desi ghee.png",
  ghee: "ghee.png",
  mawa: "mawa.png",
  chhachh: "Chhachh.webp",
  "fresh-cream": "Fresh Cream.png",
  cream: "Fresh Cream.png",
  "other-milk-products": "dairy product.png"
};

function getWebsiteProductImage(product) {
  const text = `${product?.name || ""} ${product?.category || ""} ${product?.variant || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const matches = [
    ["paneer", "paneer"],
    ["desi ghee", "desi-ghee"],
    ["ghee", "ghee"],
    ["dahi", "dahi"],
    ["curd", "dahi"],
    ["milk", "milk"],
    ["mawa", "mawa"],
    ["khoya", "mawa"],
    ["chhachh", "chhachh"],
    ["chaach", "chhachh"],
    ["buttermilk", "chhachh"],
    ["fresh cream", "fresh-cream"],
    ["cream", "cream"]
  ];

  for (const [keyword, key] of matches) {
    if (text.includes(keyword)) return WEBSITE_PRODUCT_IMAGES[key];
  }

  const category = String(product?.category || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return WEBSITE_PRODUCT_IMAGES[category] || WEBSITE_PRODUCT_IMAGES["other-milk-products"];
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "Price on enquiry";
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
  if (typeof value.seconds === "number") {
    return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
  }
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
  const imageUrl = getWebsiteProductImage(product);

  const image = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name || "Dairy product")}" loading="lazy" decoding="async">`;

  const countdown = activeOffer && Number.isFinite(endAt)
    ? `<div class="offer-countdown" data-countdown-end="${endAt}" aria-live="polite">Offer ends in calculating…</div>`
    : "";

  const productName = product.name || "Dairy Product";
  const orderHref = available
    ? `order.html?productId=${encodeURIComponent(product.id || "")}`
    : `contact.html?type=general&product=${encodeURIComponent(productName)}&productId=${encodeURIComponent(product.id || "")}`;

  const enquiryHref = `contact.html?type=general&product=${encodeURIComponent(productName)}&productId=${encodeURIComponent(product.id || "")}`;

  return `
    <article class="product-card">
      <div class="product-image">${image}</div>
      <div class="product-body">
        ${activeOffer ? `<span class="badge">${escapeHtml(product.offer.badge || "Special Offer")}</span>` : ""}
        <h3>${escapeHtml(productName)}</h3>
        ${product.variant && product.variant !== "Standard" ? `<span class="product-variant">${escapeHtml(product.variant)}</span>` : ""}
        <p>${escapeHtml(product.description || "Fresh dairy product from Lala Paneer Udyog.")}</p>
        <div class="price-line">
          <span class="price">${formatPrice(price)}<small> / ${escapeHtml(unit)}</small></span>
          ${old != null ? `<span class="old-price">${formatPrice(old)}</span>` : ""}
        </div>
        ${countdown}
        <div class="availability ${available ? "available" : "unavailable"}">${available ? "Available" : "Currently unavailable"}</div>
        <div class="product-actions">
          <a class="btn ${available ? "btn-primary" : "btn-secondary"}" href="${orderHref}">
            ${available ? "Order Now" : "Enquire"}
          </a>
          <a class="btn btn-secondary" href="${enquiryHref}">Ask / Enquire</a>
        </div>
      </div>
    </article>`;
}

function wireProductImages(root = document) {
  $$(".product-image img", root).forEach(img => {
    img.addEventListener("error", () => {
      const container = img.closest(".product-image");
      if (!container) return;
      img.remove();
      container.classList.add("image-error");
      container.insertAdjacentHTML("beforeend", `<span class="image-placeholder" aria-hidden="true">🥛</span>`);
    }, { once: true });
  });
}

function startCountdowns() {
  $$("[data-countdown-end]").forEach(el => {
    if (el.dataset.timerStarted === "true") return;
    el.dataset.timerStarted = "true";

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

      el.textContent = days > 0
        ? `Offer ends in ${days}d ${time}`
        : `Offer ends in ${time}`;

      return true;
    };

    update();
    const timer = setInterval(() => {
      if (!update()) clearInterval(timer);
    }, 1000);
  });
}

function renderProductImagesAndTimers() {
  wireProductImages();
  startCountdowns();
}

function subscribeToProducts(onProducts, onError) {
  // The website catalogue is fixed in the website; product details stay real-time from Firebase.
  const q = query(collection(db, "products"));
  return onSnapshot(
    q,
    snapshot => {
      const products = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const ao = Number(a.sortOrder ?? 9999), bo = Number(b.sortOrder ?? 9999);
          if (ao !== bo) return ao - bo;
          return String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" });
        });
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

  const visible = products.filter(product => product.available !== false);
  grid.innerHTML = visible.length
    ? visible.map(productCard).join("")
    : `<div class="loading-card">No products are currently published.</div>`;

  renderProductImagesAndTimers();
}

function renderProductsFromProducts(products) {
  const grid = $("#productGrid");
  const filters = $("#categoryFilters");
  if (!grid || !filters) return;

  const categories = ["All", ...new Set(products.map(p => String(p.category || "").trim()).filter(Boolean))];
  const current = $(".filter-bar button.active", filters)?.dataset.category || "All";

  filters.innerHTML = categories.map((category, index) => {
    const active = current === category || (index === 0 && !categories.includes(current));
    return `<button type="button" class="${active ? "active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`;
  }).join("");

  const renderCategorySections = (list, categoryFilter) => {
    const grouped = new Map();
    list.forEach(product => {
      const category = String(product.category || "Other").trim() || "Other";
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push(product);
    });

    const orderedGroups = [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "en", { sensitivity: "base" }));

    if (!orderedGroups.length) {
      grid.innerHTML = `<div class="loading-card">No products found in this category.</div>`;
      return;
    }

    grid.innerHTML = orderedGroups.map(([category, items]) => {
      const categoryId = `category-${String(category).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "other"}`;
      return `
      <section class="product-category-section" aria-labelledby="${categoryId}">
        <div class="product-category-heading">
          <div class="product-category-heading-main">
            <span class="eyebrow">Category</span>
            <div class="product-category-title-row">
              <h2 id="${categoryId}">${escapeHtml(category)}</h2>
              <span class="product-category-count">${items.length} product${items.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
        <div class="product-category-row" data-category-row="${escapeHtml(category)}">
          ${items.map(productCard).join("")}
        </div>
      </section>`;
    }).join("");

    renderProductImagesAndTimers();
  };

  const draw = category => {
    const list = category === "All"
      ? products
      : products.filter(p => String(p.category || "").trim() === category);
    renderCategorySections(list, category);
  };

  draw(categories.includes(current) ? current : "All");

  if (!filters.dataset.listenerAttached) {
    filters.dataset.listenerAttached = "true";
    filters.addEventListener("click", event => {
      const button = event.target.closest("button[data-category]");
      if (!button) return;

      $$(".filter-bar button", filters).forEach(item => item.classList.remove("active"));
      button.classList.add("active");

      const latestProducts = window.__lpuProducts || [];
      const category = button.dataset.category;
      const list = category === "All"
        ? latestProducts
        : latestProducts.filter(product => String(product.category || "").trim() === category);

      renderCategorySections(list, category);
    });
  }
}

function initProductRealtime() {
  if (!$("#featuredProducts") && !$("#productGrid")) return;

  if ($("#featuredProducts")) {
    $("#featuredProducts").innerHTML = `<div class="loading-card">Loading latest products…</div>`;
  }
  if ($("#productGrid")) {
    $("#productGrid").innerHTML = `<div class="loading-card">Loading latest products…</div>`;
  }

  subscribeToProducts(products => {
    window.__lpuProducts = products;
    renderFeaturedFromProducts(products);
    renderProductsFromProducts(products);
  }, () => {
    const message = `
      <div class="loading-card error-card">
        <strong>Products could not be loaded right now.</strong>
        <p>Please refresh once, then call or WhatsApp us if the problem continues.</p>
      </div>`;

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

function validMessage(message) {
  return message.length >= 0 && message.length <= 1200;
}

function setOrderFieldsVisible(visible, required = false) {
  const wrapper = $("#orderFields");
  if (!wrapper) return;
  wrapper.hidden = !visible;
  wrapper.setAttribute("aria-hidden", String(!visible));
  $$("input, select", wrapper).forEach(input => {
    input.disabled = !visible;
  });
  ["productName", "quantity", "address"].forEach(name => {
    const input = $(`[name="${name}"]`, wrapper);
    if (input) input.required = visible && required;
  });
}

function initInquiryForm() {
  const form = $("#inquiryForm");
  const status = $("#formStatus");
  if (!form || !status) return;

  const product = getParam("product");
  const productId = getParam("productId");
  const typeParam = getParam("type");
  const serviceParam = getParam("service");
  const intentParam = getParam("intent");
  const msg = $("textarea[name='message']", form);
  const select = $("select[name='type']", form);
  const productInput = $("input[name='productName']", form);
  const productIdInput = $("input[name='productId']", form);
  const serviceInput = $("input[name='service']", form);
  const intentInput = $("input[name='intent']", form);

  if (product && productInput) productInput.value = product;
  if (productId && productIdInput) productIdInput.value = productId;
  if (typeParam === "bulk" && select) select.value = "bulk";
  if (typeParam === "order" && select) select.value = "order";
  if (intentParam === "order" && select) select.value = "order";
  if (serviceParam && serviceInput) serviceInput.value = serviceParam;
  if (intentParam === "order" && serviceParam && productInput) productInput.value = serviceParam;
  if (intentParam && intentInput) intentInput.value = intentParam;

  const syncFormMode = () => {
    const isOrderOrBulk = ["order", "bulk"].includes(select?.value);
    const hasContext = Boolean(product || serviceParam);
    const needsDetails = isOrderOrBulk || hasContext;
    const detailsRequired = isOrderOrBulk;
    setOrderFieldsVisible(needsDetails, detailsRequired);

    if (needsDetails && msg && !msg.value.trim() && (product || serviceParam)) {
      const target = product || serviceParam;
      msg.value = `I would like to order/book ${target}. Please confirm availability, price and details.`;
    }
  };

  syncFormMode();
  select?.addEventListener("change", syncFormMode);

  form.addEventListener("submit", async event => {
    event.preventDefault();

    status.className = "form-status";
    status.textContent = "Submitting…";

    const button = $("button[type='submit']", form);
    if (button) button.disabled = true;

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const name = String(data.name || "").trim();
      const phone = String(data.phone || "").replace(/\D/g, "");
      const email = String(data.email || "").trim();
      const message = String(data.message || "").trim();
      const type = String(data.type || "general");
      const productName = String(data.productName || "").trim();
      const orderQuantity = String(data.quantity || "").trim();
      const preferredDate = String(data.preferredDate || "").trim();
      const preferredTime = String(data.preferredTime || "").trim();
      const address = String(data.address || "").trim();
      const orderProductId = String(data.productId || "").trim();
      const service = String(data.service || "").trim();
      const intent = String(data.intent || "").trim();

      if (name.length < 2 || name.length > 80) {
        throw new Error("Please enter a valid name.");
      }
      if (!validPhone(phone)) {
        throw new Error("Please enter a valid 10-digit mobile number.");
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address.");
      }
      if (!validMessage(message)) {
        throw new Error("Message is too long. Please keep it within 1200 characters.");
      }
      if (!["general", "order", "bulk"].includes(type)) {
        throw new Error("Please select a valid requirement.");
      }

      if (["order", "bulk"].includes(type)) {
        if (productName.length < 2 || productName.length > 120) {
          throw new Error("Please enter the product you want to order.");
        }
        if (!orderQuantity || orderQuantity.length > 80) {
          throw new Error("Please enter the required quantity.");
        }
        if (address.length < 5 || address.length > 250) {
          throw new Error("Please enter the delivery/pickup address.");
        }

        const orderRef = await addDoc(collection(db, "orders"), {
          source: "website",
          status: "New",
          orderId: `LPW-${Date.now().toString(36).toUpperCase()}`,
          customerName: name,
          phone,
          email: email || null,
          productId: orderProductId,
          productName,
          quantity: orderQuantity,
          preferredDate: preferredDate || null,
          preferredTime: preferredTime || null,
          address: address || null,
          service: service || null,
          intent: intent || "order",
          message,
          createdAt: serverTimestamp()
        });

        status.className = "form-status success";
        status.textContent = `✓ Order request sent successfully. Reference: ${orderRef.id.slice(0, 8).toUpperCase()}`;
      } else {
        const inquiryRef = await addDoc(collection(db, "inquiries"), {
          name,
          phone,
          email: email || null,
          message,
          type,
          source: "contact-form",
          status: "New",
          productName: productName || null,
          service: service || null,
          intent: intent || "inquiry",
          createdAt: serverTimestamp()
        });

        status.className = "form-status success";
        status.textContent = `✓ Enquiry submitted successfully. Reference: ${inquiryRef.id.slice(0, 8).toUpperCase()}`;
      }

      form.reset();
      if (product && productInput) productInput.value = product;
      if (productId && productIdInput) productIdInput.value = productId;
      if (typeParam === "order" && select) select.value = "order";
  if (serviceParam && serviceInput) serviceInput.value = serviceParam;
  if (intentParam && intentInput) intentInput.value = intentParam;
      syncFormMode();
    } catch (error) {
      console.error("Public form submission error:", error);
      status.className = "form-status error";
      status.textContent = `⚠ ${error?.message || "Submit nahi ho paya. Please try again or contact us on WhatsApp."}`;
    } finally {
      if (button) button.disabled = false;
    }
  });
}

function initHeroSlider() {
  const root = $("#heroSlider");
  if (!root) return;
  const slides = $$(".hero-slide", root);
  const dots = $$("[data-hero-dot]", root);
  if (slides.length < 2) return;
  let index = 0;
  const show = next => {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
  };
  dots.forEach((dot, i) => dot.addEventListener("click", () => show(i)));
  show(0);
  window.setInterval(() => show(index + 1), 2000);
}

initHeroSlider();
initProductRealtime();
initInquiryForm();
