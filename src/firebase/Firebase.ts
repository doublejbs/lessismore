import { initializeApp } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { makeAutoObservable } from 'mobx';
import { doc, Firestore, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

class Firebase {
  private static readonly config = {
    apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
    authDomain: 'useless.my',
    projectId: 'lessismore-7e070',
    storageBucket: 'lessismore-7e070.appspot.com',
    messagingSenderId: '434364025032',
    appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
    measurementId: 'G-NC0J0766BX',
  };

  private auth!: Auth;
  private userId = '';
  private googleProvider = new GoogleAuthProvider();
  private initialized = false;
  private store!: Firestore;
  private storage!: FirebaseStorage;
  private hasAgreedToTerms = false;

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    const fireBaseApp = initializeApp(Firebase.config);
    this.auth = getAuth(fireBaseApp);
    this.store = getFirestore(fireBaseApp);
    this.storage = getStorage(fireBaseApp);
    await this.auth.authStateReady();
    await this.checkLoggedIn();
    this.setInitialized(true);

    this.auth.onAuthStateChanged(async (user) => {
      if (user?.uid) {
        await this.checkLoggedIn();
      } else {
        this.setUserId('');
        this.setHasAgreedToTerms(false);
      }
    });
  }

  private async checkLoggedIn() {
    const userId = this.auth.currentUser;

    if (userId) {
      this.setUserId(userId.uid);
      await this.initializeStore();
      await this.checkTermsAgreement();
    }
  }

  public async termsAgreed(marketingAgreed: boolean) {
    const userDocRef = doc(this.getStore(), 'users', this.getUserId());

    await updateDoc(userDocRef, {
      termsAgreed: true,
      privacyAgreed: true,
      marketingAgreed: marketingAgreed,
      agreedAt: new Date(),
    });
    this.setHasAgreedToTerms(true);
  }

  private async initializeStore() {
    const userDocRef = doc(this.getStore(), 'users', this.getUserId());
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return;
    } else {
      await setDoc(userDocRef, {
        termsAgreed: false,
        privacyAgreed: false,
        marketingAgreed: false,
        createdAt: new Date(),
      });
    }
  }

  private async checkTermsAgreement() {
    const userDocRef = doc(this.getStore(), 'users', this.getUserId());
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();

      this.setHasAgreedToTerms(userData.termsAgreed === true && userData.privacyAgreed === true);
    } else {
      this.setHasAgreedToTerms(false);
    }
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
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
    return this.initialized && !!this.userId;
  }

  public async logInWithGoogle() {
    const isLocalhost = window.location.hostname === 'localhost';

    if (isLocalhost) {
      await signInWithPopup(this.auth, this.googleProvider);
    } else {
      await signInWithRedirect(this.auth, this.googleProvider);
    }
  }

  public getStore() {
    return this.store;
  }

  private setUserId(value: string) {
    this.userId = value;
  }

  public getStorage() {
    return this.storage;
  }

  public hasUserAgreedToTerms() {
    return this.hasAgreedToTerms;
  }

  private setHasAgreedToTerms(value: boolean) {
    this.hasAgreedToTerms = value;
  }
}

export default Firebase;
