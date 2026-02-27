import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// updated to the new credentials provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyAqmpzU4Ub-OFJHvnCWsL-gEBjZi-RQwOA",
  authDomain: "dinebyteforclient.firebaseapp.com",
  projectId: "dinebyteforclient",
  storageBucket: "dinebyteforclient.firebasestorage.app",
  messagingSenderId: "302725647154",
  appId: "1:302725647154:web:0983647f28ebc4c6bc652b"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };import { redirect } from "next/navigation";

export default function Page() {
  redirect("/onboarding");
}
