import FirebaseImageStorage from '../../firebase/FirebaseImageStorage';
import { action, makeObservable, observable } from 'mobx';

abstract class FileUpload {
  protected constructor() {
    makeObservable(this);
  }

  @observable private previewSrc: string = '';
  @observable private imageFile: File | null = null;
  private readonly imageStorage = FirebaseImageStorage.new();

  protected abstract getFileName(): string;

  @action
  public setPreviewSrc(src: string): void {
    this.previewSrc = src;
  }

  public getPreviewSrc(): string {
    return this.previewSrc;
  }

  @action
  public setFile(file: File): void {
    this.imageFile = file;
  }

  @action
  protected clearFile(): void {
    this.imageFile = null;
  }

  protected getFile() {
    return this.imageFile;
  }

  protected async getFileUrl() {
    if (this.imageFile) {
      return await this.imageStorage.uploadFile(
        this.imageFile as File,
        this.getFileName()
      );
    } else {
      return '';
    }
  }
}

export default FileUpload;
