import DevicePlatformType from './DevicePlatformType';

// 기기 감지는 주 액션 강조만 바꾼다 — 자동 이동은 하지 않는다(AppIntroSpec §5).
class DevicePlatform {
  private readonly type: DevicePlatformType;

  public static from(userAgent: string): DevicePlatform {
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return new DevicePlatform(DevicePlatformType.IOS);
    }

    if (/Android/i.test(userAgent)) {
      return new DevicePlatform(DevicePlatformType.Android);
    }

    return new DevicePlatform(DevicePlatformType.Other);
  }

  private constructor(type: DevicePlatformType) {
    this.type = type;
  }

  public getType(): DevicePlatformType {
    return this.type;
  }

  // iOS·데스크톱 등 그 외 기기는 App Store가, Android는 Google Play가 주 액션이다.
  public isGooglePlayPrimary(): boolean {
    return this.type === DevicePlatformType.Android;
  }
}

export default DevicePlatform;
