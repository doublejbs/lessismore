import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  getAuth,
  Auth,
} from 'firebase/auth';
import { makeAutoObservable } from 'mobx';
import {
  addDoc,
  collection,
  Firestore,
  getFirestore,
} from 'firebase/firestore';

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

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    const fireBaseApp = initializeApp(Firebase.config);
    this.auth = getAuth(fireBaseApp);
    this.store = getFirestore(fireBaseApp);

    await this.auth.authStateReady();

    this.auth.onAuthStateChanged((user) => {
      if (user?.uid) {
        this.setUserId(user.uid);
      } else {
        this.setUserId('');
      }
    });

    this.setInitialized(true);
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
    await signInWithPopup(this.auth, this.googleProvider);
  }

  public isInitialized() {
    return this.initialized;
  }

  public getStore() {
    return this.store;
  }

  public async add() {
    try {
      await addDoc(collection(this.getStore(), 'gear'), {
        company: 'nemo',
        name: 'ora',
        weight: '301',
      });
    } catch (e) {
      console.log(e);
    }
  }

  private setUserId(value: string) {
    this.userId = value;
  }
}

export default Firebase;
