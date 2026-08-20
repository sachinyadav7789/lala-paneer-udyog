# Lala Paneer Udyog - Realtime Fixes

## What was fixed

1. Public product loading now uses Firestore `onSnapshot()` instead of one-time `getDocs()`.
2. Product price, availability, visibility and nested offer data are read dynamically from Firestore.
3. The public website automatically re-renders when an Admin changes a product in Firestore.
4. Product offers now support a frontend countdown based on the Firestore `offer.endAt` timestamp.
5. No product price was added to the public JavaScript as a hard-coded business price.
6. Firestore rules were tightened with Admin/Staff role checks and basic product/inquiry validation.
7. A final deny-all Firestore rule was added for collections that are not explicitly configured.

## Expected product document

Use one product document per product in `products/{productId}`. Example shape:

- name: string
- description: string
- category: string
- unit: string
- price: number
- available: boolean
- publicVisible: boolean
- imageUrl: string (optional)
- offer: map (optional)
  - enabled: boolean
  - originalPrice: number
  - offerPrice: number
  - badge: string
  - startAt: Firestore Timestamp
  - endAt: Firestore Timestamp

The website does not contain the actual business prices. Admin changes the Firestore document and the public website receives the change through `onSnapshot()`.

## Important

This ZIP contains the public website and Firebase rules from the supplied project. The supplied Admin Panel is now aligned with the public website: it writes the same `products/{productId}` schema and syncs time-bound offers into the product document.

Role checks in Firestore rules use Firebase Authentication custom claims (`request.auth.token.role`). Do not let a browser user write their own role. Set Admin/Staff claims through a trusted administrative/server-side process.


## Customer actions

7. Public navigation is isolated from Firebase data loading, so the mobile hamburger remains functional even if a Firebase data request fails.
8. Phone and WhatsApp links have static fallbacks.
9. Product cards provide direct `Order Now` and `Ask / Enquire` actions.
10. Order requests are saved to `orders` and appear in the Admin Panel.

### Public enquiry message validation
The enquiry/order message field is optional: minimum length is 0 and maximum length is 1200. Name, mobile, requirement type, and order-specific fields remain validated.

### Mobile product layout
On phone widths above 360px, product grids show three compact cards per row so a category can be scanned with less vertical scrolling. Very narrow screens (360px and below) use two cards per row to preserve readable buttons and prevent cramped content. No horizontal page scrolling is introduced.
