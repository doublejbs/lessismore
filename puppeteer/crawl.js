import puppeteer from 'puppeteer';
import XLSX from 'xlsx';
import * as readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('검색어를 입력하세요: ', async (keyword) => {
  rl.question('최대 페이지 수를 입력하세요: ', async (maxPage) => {
    await crawl(keyword, parseInt(maxPage));
    rl.close();
  });
});

const crawl = async (keyword, maxPage) => {
  try {
    const browser = await puppeteer.launch({ headless: false }); // 브라우저 실행 (백그라운드 모드)
    const page = await browser.newPage(); // 새 페이지 열기
    const data = [];
    let pageIndex = 1;

    console.log(`${keyword} 검색 시작`);

    while (pageIndex <= maxPage) {
      await page.goto(
        `https://search.shopping.naver.com/search/all?adQuery=${keyword}&origQuery=${keyword}&pagingIndex=${pageIndex}&pagingSize=80&productSet=model&query=${keyword}&sort=rel&timestamp=&viewType=list&catId=50000028`,
        { waitUntil: 'networkidle2' }
      ); // 웹사이트 방문
      console.log(`${pageIndex} 페이지 이동 완료`);
      console.log('스크롤 시작');
      await autoScroll(page);
      console.log('스크롤 완료');
      console.log('스크래핑 시작');

      const result = await page.evaluate(() => {
        const getCategory = (category, subCategory) => {
          switch (category) {
            case '텐트': {
              return {
                category1: 'big4',
                category2: 'tent',
              };
            }
            case '침낭': {
              return {
                category1: 'big4',
                category2: 'sleeping_bag',
              };
            }
            case '등산가방': {
              return {
                category1: 'big4',
                category2: 'backpack',
              };
            }
            case '등산의류': {
              return {
                category1: 'clothing',
                category2: 'clothing',
              };
            }
            case '캠핑매트': {
              return {
                category1: 'big4',
                category2: 'mat',
              };
            }
            case '캠핑가구': {
              return {
                category1: 'furniture',
                category2: 'furniture',
              };
            }
            case '랜턴': {
              return {
                category1: 'lantern',
                category2: 'lantern',
              };
            }
            case '취사용품': {
              return {
                category1: 'cooking',
                category2: 'cooking',
              };
            }
            case '기타캠핑':
            default: {
              return {
                category1: 'etc',
                category2: 'etc',
              };
            }
          }
        };
        const items = document.querySelectorAll('.product_inner__gr8QR'); // 제품 리스트 선택

        return Array.from(items).map((item) => {
          // 이름 가져오기
          const nameElement = item.querySelector(
            'div.product_title__Mmw2K > a[data-shp-contents-type="catalog_nv_mid"]'
          );
          const name = nameElement ? nameElement.innerText.trim() : '';

          // '무게'라는 단어가 포함된 <a> 태그 찾기
          const weightElement = Array.from(item.querySelectorAll('a')).find(
            (el) => el.innerText.includes('무게')
          );
          let weightText = weightElement ? weightElement.innerText.trim() : '';
          // "무게 : 숫자 + (kg 또는 g)" 패턴 찾기
          let weightMatch = weightText.match(/무게\s*:\s*([\d.]+)\s*(kg|g)/i);

          let weight = '';
          if (weightMatch) {
            let value = parseFloat(weightMatch[1]); // 숫자 부분 추출
            let unit = weightMatch[2].toLowerCase(); // 단위 (kg 또는 g) 추출

            if (unit === 'kg') {
              weight = value * 1000; // kg을 g으로 변환
            } else {
              weight = value; // g이면 그대로 사용
            }
          }

          // 'product_depth__I4SqY' 클래스에서 세 번째 span의 innerText 가져오기
          const category = item.querySelector('.product_depth__I4SqY');
          let categoryText = '';
          let subCategoryText = '';
          if (category) {
            const spans = category.querySelectorAll('span');
            if (spans.length >= 3) {
              const category = spans[2].innerText.trim();
              const subCategory = spans[3]?.innerText.trim() || '';

              const { category1, category2 } = getCategory(
                category,
                subCategory
              );

              categoryText = category1;
              subCategoryText = category2;
            }
          }

          const queryString = window.location.search;

          // URLSearchParams 객체를 생성하여 쿼리 파라미터 값에 접근
          const urlParams = new URLSearchParams(queryString);

          // 쿼리 파라미터 값 가져오기
          const company = urlParams.get('adQuery');

          let imageUrl =
            item.querySelector('div.product_img_area__cUrko > div > a > img')
              ?.src ?? '';

          if (imageUrl) {
            const urlObject = new URL(imageUrl);
            urlObject.searchParams.set('type', 'f640');
            imageUrl = urlObject.toString();
          }

          return {
            name,
            weight,
            category: categoryText,
            subCategory: subCategoryText,
            company,
            imageUrl,
          };
        });
      });

      data.push(...result);
      pageIndex += 1;
    }

    await browser.close();

    console.log(data, data.length);

    const ws = XLSX.utils.json_to_sheet(data); // JSON 데이터를 시트로 변환
    const wb = XLSX.utils.book_new(); // 새 엑셀 파일 생성
    XLSX.utils.book_append_sheet(wb, ws, 'Products'); // 시트를 엑셀 파일에 추가
    const filePath = `${keyword}_list.xlsx`; // 저장할 파일 경로
    XLSX.writeFile(wb, filePath); // 엑셀 파일 저장

    console.log(`엑셀 파일로 저장되었습니다: ${filePath}`);
  } catch (e) {
    console.log('error', e);
  }
};

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400; // 한 번에 스크롤할 거리
      const timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
