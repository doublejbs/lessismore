// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { makeAutoObservable } from "mobx";

class Firebase {
  private static readonly config = {
    apiKey: "AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU",
    authDomain: "lessismore-7e070.firebaseapp.com",
    projectId: "lessismore-7e070",
    storageBucket: "lessismore-7e070.appspot.com",
    messagingSenderId: "434364025032",
    appId: "1:434364025032:web:a8c458d1ee31b0e14dbdfd",
    measurementId: "G-NC0J0766BX",
  };

  private auth: any;
  private loggedIn = false;
  private userId = "";
  private googleProvider = new GoogleAuthProvider();

  public constructor() {
    makeAutoObservable(this);
  }

  public initialize() {
    const fireBaseApp = initializeApp(Firebase.config);
    this.auth = getAuth(fireBaseApp);

    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/auth.user
        const uid = user.uid;

        console.log(uid);
        this.userId = user.email ?? "";
        this.loggedIn = true;
        // ...
      } else {
        this.loggedIn = false;
        // User is signed out
        // ...
      }
    });
  }

  public async createUserWithEmailAndPassword(email: string, password: string) {
    await createUserWithEmailAndPassword(this.auth, email, password);
  }

  public async login(email: string, password: string) {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  public async logout() {
    await signOut(this.auth);
  }

  public getUserId() {
    return this.userId;
  }

  public isLoggedIn() {
    return this.loggedIn;
  }

  public async logInWithGoogle() {
    const result = await signInWithPopup(this.auth, this.googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;
    const user = result.user;

    console.log(user);
    this.userId = user.userId;
  }
}
const firebase = new Firebase();
firebase.initialize();
export default firebase;
