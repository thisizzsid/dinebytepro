import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBIW6Hg081t9oVloJC4MDpj-WY-P8XXnao",
  authDomain: "for-order-5b9b4.firebaseapp.com",
  projectId: "for-order-5b9b4",
  storageBucket: "for-order-5b9b4.firebasestorage.app",
  messagingSenderId: "236238925376",
  appId: "1:236238925376:web:c532dcf9d45429a6dd39a5"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
