import { initializeApp } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { makeAutoObservable } from 'mobx';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc,
  writeBatch,
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
  private hasAgreedToTerms = false;
  private loggedIn = false;

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
      this.setLoggedIn(true);
    }
  }

  /**
   * 모든 약관 동의 상태를 저장
   */
  public async termsAgreed(
    marketingAgreed: boolean,
    smsAgreed: boolean,
    termsAgreed: boolean,
    privacyAgreed: boolean,
    personalInfoAgreed: boolean,
    over14Agreed: boolean
  ) {
    const userDocRef = doc(this.getStore(), 'users', this.getUserId());
    await updateDoc(userDocRef, {
      termsAgreed: termsAgreed,
      privacyAgreed: privacyAgreed,
      marketingAgreed: marketingAgreed,
      personalInfoAgreed: personalInfoAgreed,
      over14Agreed: over14Agreed,
      smsAgreed: smsAgreed,
      agreedAt: new Date(),
    });
    this.setHasAgreedToTerms(termsAgreed && privacyAgreed && personalInfoAgreed && over14Agreed);
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

      this.setHasAgreedToTerms(
        userData.termsAgreed === true &&
          userData.privacyAgreed === true &&
          userData.personalInfoAgreed === true &&
          userData.over14Agreed === true
      );
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
    if (this.isLoggedIn()) {
      await signOut(this.auth);
    }
  }

  public getUserId() {
    return this.userId;
  }

  public isLoggedIn() {
    return this.initialized && !!this.userId && this.loggedIn;
  }

  public async logInWithGoogle() {
    await signInWithPopup(this.auth, this.googleProvider);
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

  private setLoggedIn(value: boolean) {
    this.loggedIn = value;
  }

  public async signInWithIdToken(idToken: string, accessToken: string) {
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    await signInWithCredential(this.auth, credential);
  }

  public async deleteUserAccount() {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('로그인된 사용자가 없습니다.');
    }

    const userId = this.getUserId();

    try {
      // 0. 재인증 수행 (민감한 작업을 위해 필요)
      await reauthenticateWithPopup(user, this.googleProvider);

      // 1. 사용자의 모든 배낭 ID 가져오기
      const userDocRef = doc(this.getStore(), 'users', userId);
      const userDoc = await getDoc(userDocRef);
      const bagIds: string[] = userDoc.data()?.bags || [];

      // 2. 모든 배낭 삭제
      if (bagIds.length > 0) {
        const batch = writeBatch(this.getStore());
        bagIds.forEach((bagId) => {
          const bagRef = doc(this.getStore(), 'bag', bagId);
          batch.delete(bagRef);
        });
        await batch.commit();
      }

      // 3. 사용자의 모든 장비 삭제
      const gearsCollection = collection(this.getStore(), 'users', userId, 'gears');
      const gearsSnapshot = await getDocs(gearsCollection);
      if (!gearsSnapshot.empty) {
        const gearBatch = writeBatch(this.getStore());
        gearsSnapshot.docs.forEach((doc) => {
          gearBatch.delete(doc.ref);
        });
        await gearBatch.commit();
      }

      // 4. 사용자 문서 삭제
      await deleteDoc(userDocRef);

      // 5. Firebase Auth 계정 삭제
      await deleteUser(user);
    } catch (error) {
      console.error('회원 탈퇴 중 오류 발생:', error);
      throw error;
    }
  }
}

export default Firebase;
