// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU",
  authDomain: "lessismore-7e070.firebaseapp.com",
  projectId: "lessismore-7e070",
  storageBucket: "lessismore-7e070.appspot.com",
  messagingSenderId: "434364025032",
  appId: "1:434364025032:web:a8c458d1ee31b0e14dbdfd",
  measurementId: "G-NC0J0766BX",
};

// Initialize Firebase
const fireBaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(fireBaseApp);
const analytics = getAnalytics(fireBaseApp);
