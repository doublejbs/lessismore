// import { Builder, By, WebDriver } from 'selenium-webdriver';

class Crawl {
  public static new() {
    return new Crawl();
  }

  private constructor() {}

  public async crawl() {
    // let driver: WebDriver;
    //
    // try {
    //   // 브라우저 드라이버 초기화 (Chrome 사용)
    //   driver = await new Builder().forBrowser('chrome').build();
    //
    //   // 페이지 열기
    //   await driver.get(
    //     'https://search.shopping.naver.com/search/all?adQuery=%EB%8B%88%EB%AA%A8&origQuery=%EB%8B%88%EB%AA%A8&pagingIndex=1&pagingSize=40&productSet=model&query=%EB%8B%88%EB%AA%A8&sort=rel&timestamp=&viewType=list'
    //   );
    //
    //   // 페이지 제목 가져오기
    //   const title = await driver.getTitle();
    //   console.log('페이지 제목:', title);
    //
    //   // 특정 요소 찾기
    //   const element = await driver.findElement(By.className('h1'));
    //   console.log('H1 텍스트:', await element.getText());
    // } catch (error) {
    //   console.error('오류 발생:', error);
    // } finally {
    //   // 브라우저 종료
    //   await driver.quit();
    // }
  }
}
export default Crawl;
