import {
  FirebaseStorage,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import app from '../App.ts';

class FirebaseImageStorage {
  public static new() {
    const firebase = app.getFirebase();

    return new FirebaseImageStorage(
      firebase.getStorage(),
      firebase.getUserId()
    );
  }

  private constructor(
    private readonly storage: FirebaseStorage,
    private readonly userId: string
  ) {}

  public async uploadFile(file: File, fileName: string) {
    const storageRef = ref(
      this.storage,
      `/${this.userId}/${fileName}${this.userId}`
    );

    await uploadBytes(storageRef, file);

    return await getDownloadURL(storageRef);
  }
}

export default FirebaseImageStorage;
