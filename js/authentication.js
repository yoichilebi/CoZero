import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA2ydl9-68gA-_3UXpxEJY6CfvTmCMPsLo",
  authDomain: "cozero-tracker.firebaseapp.com",
  projectId: "cozero-tracker",
  storageBucket: "cozero-tracker.firebasestorage.app",
  messagingSenderId: "178790925784",
  appId: "1:178790925784:web:f3b6d1a9e1eeadee5adead",
  measurementId: "G-PQEWJ0RVCW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// REGISTER
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Register form submitted");

    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const username = document.getElementById("register-username").value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        username: username,
        email: email,
        createdAt: new Date()
      });
      alert("Registration successful! You can now log in.");
      window.location.href = "login.html";
    } catch (error) {
      alert(error.message);
    }
  });
}

// LOGIN
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Login form submitted");

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;


    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login successful!");
      window.location.href = "home.html";
    } catch (error) {
      alert("Login failed: " + error.message);
    }
  });
}
