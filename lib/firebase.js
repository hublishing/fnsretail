import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBrZnGmXkdVn5UX09oB3N7GcUm3AmjaePE",
  authDomain: "fb-fnsretail.firebaseapp.com",
  projectId: "fb-fnsretail",
  storageBucket: "fb-fnsretail.firebasestorage.app",
  messagingSenderId: "761582631342",
  appId: "1:761582631342:web:268f531024a50ea613703f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
