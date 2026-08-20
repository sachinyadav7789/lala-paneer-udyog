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
