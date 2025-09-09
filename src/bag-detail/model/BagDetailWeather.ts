class BagDetailWeather {
  private static readonly API_KEY = 'AIzaSyBYYprHdpI_4j3_yERPOcImb-mw2bNFVYU';

  public static new() {
    return new BagDetailWeather();
  }

  private constructor() {}

  public async getWeather() {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/xml?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=${BagDetailWeather.API_KEY}`
    );
    const data = await response.json();
    return data;
  }
}
