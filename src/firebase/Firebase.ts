// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  authStateReady,
  getAuth,
} from "firebase/auth";
import { makeAutoObservable } from "mobx";

class Firebase {
  private static readonly config = {
    apiKey: "AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU",
    authDomain: "useless.my",
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
  private initialized = false;

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    const fireBaseApp = initializeApp(Firebase.config);
    this.auth = getAuth(fireBaseApp);

    await this.auth.authStateReady();

    this.initialized = true;
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
    return this.initialized && !!this.auth.currentUser;
  }

  public async logInWithGoogle() {
    const result = await signInWithPopup(this.auth, this.googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const user = result.user;
  }

  public isInitialized() {
    return this.initialized;
  }
}
const firebase = new Firebase();
firebase.initialize();
export default firebase;
