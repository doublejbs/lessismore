import { initializeApp } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { makeAutoObservable } from 'mobx';
import {
  doc,
  Firestore,
  getDoc,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
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

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    const fireBaseApp = initializeApp(Firebase.config);
    this.auth = getAuth(fireBaseApp);
    this.store = getFirestore(fireBaseApp);
    this.storage = getStorage(fireBaseApp);

    await this.auth.authStateReady();

    this.auth.onAuthStateChanged(async (user) => {
      if (user?.uid) {
        this.setUserId(user.uid);
        await this.initializeStore();
      } else {
        this.setUserId('');
      }
    });

    this.setInitialized(true);
  }

  private async initializeStore() {
    if (
      (await getDoc(doc(this.getStore(), 'users', this.getUserId()))).data()
    ) {
      return;
    } else {
      await setDoc(doc(this.getStore(), 'users', this.getUserId()), {
        gears: [],
        bags: [],
      });
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
    await signInWithRedirect(this.auth, this.googleProvider);
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
}

export default Firebase;
