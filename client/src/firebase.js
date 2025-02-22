import {initializeApp} from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAM6lOsZOhM6E1dmcL-Bncb-htqiIwJ0Ho",
    authDomain: "itdevproject-bc92d.firebaseapp.com",
    projectId: "itdevproject-bc92d",
    storageBucket: "itdevproject-bc92d.firebasestorage.app",
    messagingSenderId: "769392675700",
    appId: "1:769392675700:web:afb6ce86da72457d7aba21",
    measurementId: "G-4C8ME8TN0S"
  };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);



// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";

// const firebaseConfig = {
//     apiKey: "AIzaSyAM6lOsZOhM6E1dmcL-Bncb-htqiIwJ0Ho",
//     authDomain: "itdevproject-bc92d.firebaseapp.com",
//     projectId: "itdevproject-bc92d",
//     storageBucket: "itdevproject-bc92d.firebasestorage.app",
//     messagingSenderId: "769392675700",
//     appId: "1:769392675700:web:afb6ce86da72457d7aba21",
//     measurementId: "G-4C8ME8TN0S"
//   };
  
//   // Initialize Firebase
//   const app = initializeApp(firebaseConfig);
//   const analytics = getAnalytics(app);

//   analytics.logEvent('notification_received');

