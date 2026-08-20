// Firebase client initialization.
// Public Firebase web config is not a secret; Firestore/Storage rules provide authorization.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7JC_7nlGH-K6LPVeSdnYrwhjFHUWHKqY",
  authDomain: "lala-paneer-udyog.firebaseapp.com",
  projectId: "lala-paneer-udyog",
  storageBucket: "lala-paneer-udyog.firebasestorage.app",
  messagingSenderId: "178916025666",
  appId: "1:178916025666:web:95db211f31edf19c0494db"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
