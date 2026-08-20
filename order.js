import { db } from "./firebase.js";
import { collection, doc, getDoc, getDocs, query, where, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = (s, r=document) => r.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const money = v => Number.isFinite(Number(v)) ? new Intl.NumberFormat("en-IN", {style:"currency", currency:"INR", maximumFractionDigits:0}).format(Number(v)) : "Price on enquiry";
const params = new URLSearchParams(location.search);
const productId = params.get("productId") || "";
let product = null;

function validPhone(phone) { return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, "")); }
function validMessage(message) { return message.length <= 1200; }
function showStatus(message, ok=false) { const el=$("#orderStatus"); el.className=`form-status ${ok ? "success" : "error"}`; el.textContent=message; }

function renderProduct(p) {
  const box=$("#selectedProduct");
  const image=p?.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="eager" decoding="async">` : `<div class="image-placeholder">🥛</div>`;
  box.innerHTML=`<div class="product-image">${image}</div><div class="order-product-body"><span class="eyebrow">Selected product</span><h2>${esc(p.name)}</h2><p>${esc(p.description||"Fresh dairy product from Lala Paneer Udyog.")}</p><strong class="price">${money(p.offer?.enabled ? p.offer.offerPrice : p.price)} <small>/ ${esc(p.unit||"unit")}</small></strong><p class="field-hint">Live price from Firebase. Final amount is confirmed by the team.</p></div>`;
  const img=$(".product-image img",box);
  img?.addEventListener("error",()=>{img.remove();$(".product-image",box).insertAdjacentHTML("beforeend",`<div class="image-placeholder">🥛</div>`)} ,{once:true});
  $("#quantityUnit").textContent=p.unit ? `Unit: ${p.unit}` : "Unit as applicable";
  $("#productId").value=p.id;
}

async function loadProduct() {
  const box=$("#selectedProduct");
  try {
    if (productId) {
      const snap=await getDoc(doc(db,"products",productId));
      if (snap.exists() && snap.data().publicVisible === true) product={id:snap.id,...snap.data()};
    }
    if (!product) {
      const snap=await getDocs(query(collection(db,"products"), where("publicVisible","==",true)));
      const products=snap.docs.map(d=>({id:d.id,...d.data()}));
      product=products[0] || null;
    }
    if (!product) throw new Error("No public product is available right now.");
    renderProduct(product);
  } catch (e) {
    box.innerHTML=`<div class="error-card"><strong>Product could not be loaded.</strong><p>${esc(e.message||"Please return to Products and try again.")}</p><a class="btn btn-secondary" href="products.html">Back to products</a></div>`;
    $("#orderForm").querySelectorAll("input,button,textarea").forEach(x=>x.disabled=true);
  }
}

$("#orderForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!product) return showStatus("Please select a valid product first.");
  const form=event.currentTarget;
  const button=$("button[type=submit]",form);
  button.disabled=true;
  showStatus("Submitting…", false);
  try {
    const f=new FormData(form);
    const name=String(f.get("name")||"").trim();
    const phone=String(f.get("phone")||"").replace(/\D/g,"");
    const email=String(f.get("email")||"").trim();
    const quantity=Number(f.get("quantity"));
    const message=String(f.get("message")||"").trim();
    if(name.length<2 || name.length>80) throw new Error("Please enter a valid name.");
    if(!validPhone(phone)) throw new Error("Please enter a valid 10-digit mobile number.");
    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
    if(!Number.isFinite(quantity) || quantity<=0) throw new Error("Please enter a valid quantity.");
    const address=String(f.get("address")||"").trim();
    if(address.length<5 || address.length>250) throw new Error("Please enter the delivery/pickup address.");
    if(!validMessage(message)) throw new Error("Extra requirement is too long. Please keep it within 1200 characters.");

    const activeOffer=product.offer?.enabled===true;
    const unitPrice=Number(activeOffer ? product.offer.offerPrice : product.price);
    const total=Number.isFinite(unitPrice) ? Math.round(unitPrice*quantity*100)/100 : null;
    const orderId=`LPW-${Date.now().toString(36).toUpperCase()}`;
    const ref=await addDoc(collection(db,"orders"),{
      source:"website", status:"New", orderId,
      customerName:name, phone, email:email||null,
      productId:product.id, productName:product.name,
      quantity, quantityUnit:product.unit||"unit",
      unitPrice:Number.isFinite(unitPrice)?unitPrice:null,
      total,
      preferredDate:String(f.get("preferredDate")||"").trim()||null,
      preferredTime:String(f.get("preferredTime")||"").trim()||null,
      address,
      message, createdAt:serverTimestamp(), updatedAt:serverTimestamp()
    });
    showStatus(`✓ Order request sent successfully. Reference: ${orderId}. Team will call/WhatsApp you to confirm.`, true);
    form.reset();
    $("#productId").value=product.id;
  } catch(e) {
    console.error(e);
    showStatus(`⚠ ${e.message || "Order submit nahi ho paya. Please try again or call us."}`);
  } finally { button.disabled=false; }
});

loadProduct();
