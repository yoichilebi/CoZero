// js/firebase-config.js (Example content)
const firebaseConfig = {
  apiKey: "AIzaSyA2ydl9-68gA-_3UXpxEJY6CfvTmCMPsLo",
  authDomain: "cozero-tracker.firebaseapp.com",
  projectId: "cozero-tracker",
  storageBucket: "cozero-tracker.firebasestorage.app",
  messagingSenderId: "178790925784",
  appId: "1:178790925784:web:f3b6d1a9e1eeadee5adeadD",
  measurementId: "G-PQEWJ0RVCW"
};

// Initialize Firebase
window.firebaseApp = firebase.initializeApp(firebaseConfig);
window.firebaseAuth = firebase.auth();
window.firebaseDb = firebase.firestore();
window.firebaseServerTimestamp = firebase.firestore.FieldValue.serverTimestamp;


// Make sure these are globally accessible if activity.js expects them that way,
// or export them and import in activity.js if you are using modules.
// For simple setups, defining them globally after initialization is common.