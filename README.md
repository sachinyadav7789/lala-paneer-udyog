# Lala Paneer Udyog — Public Website

This is the **user/customer-side website** for Lala Paneer Udyog.

## Included

- Home
- Products
- Services
- About
- Contact
- Firebase product loading
- Dynamic product pricing/availability
- Dynamic offer display
- Contact/inquiry submission
- WhatsApp CTA
- Google Maps section
- Responsive/mobile-first UI
- Basic SEO/accessibility
- Firestore and Storage rule starting points

## Important

The Firebase web configuration in `js/firebase.js` is client-side configuration. It is not a Firebase Admin/service-account secret. Actual authorization must be enforced by Firestore/Storage rules.

The public site intentionally does **not** hard-code product prices.

## Firebase collections expected

- `products`
- `offers`
- `inquiries`
- `orders`
- `customers`
- `bills`
- `settings`

The Admin Panel will manage the business data.

## Product document example

```text
products/{productId}
  name: "Paneer"
  category: "Paneer"
  description: "Fresh paneer"
  price: 400
  unit: "kg"
  available: true
  publicVisible: true
  imageUrl: ""
  offer:
    enabled: false
    originalPrice: 400
    offerPrice: 350
    badge: "SPECIAL OFFER"
    startAt: ...
    endAt: ...
```

## Local testing

Because Firebase ES modules are used, serve this folder through a local web server rather than opening HTML directly with `file://`.

Example:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500/
```

## Next stage

The next implementation stage is the separate `/admin` application with Firebase Authentication, Admin/Staff roles, dashboard, product management, offers, orders, bills, audit history and settings.


## Customer ordering flow

- Product cards load from Firestore `products` in realtime.
- Only `publicVisible == true` products are shown publicly.
- `Order Now` opens the customer form with the selected product.
- Order requests are saved to Firestore `orders` with status `New` and appear in the Admin Panel.
- `Ask / Enquire` saves to `inquiries`.
- WhatsApp and phone links have working static fallbacks, so they do not depend on JavaScript to create their first valid link.
- Public product loading no longer requires the composite `publicVisible + name` index; the browser sorts the returned public products.

## Offer sync

The Admin Panel writes the offer to both:

- `offers/{offerId}` for Admin management
- `products/{productId}.offer` for the public website

This keeps the existing Admin offers collection while making the customer website's price and countdown update in realtime.

## Firebase rules

After deploying the updated files, deploy the matching `firebase/firestore.rules` to the same Firebase project. The public site does not need a Firebase config pasted into HTML; `js/firebase.js` already initializes the same project.
