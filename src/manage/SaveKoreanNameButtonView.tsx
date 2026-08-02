import { Button, message } from 'antd';
import { useState } from 'react';
import Manage from './model/Manage';

interface Props {
  manage: Manage;
}

const SaveKoreanNameButtonView = ({ manage }: Props) => {
  const [loading, setLoading] = useState(false);

  const convertToKoreanPronunciation = (text: string): string => {
    // 간단한 영어 판별 로직 (영어 문자가 50% 이상인 경우)
    const englishChars = text.match(/[a-zA-Z]/g) || [];
    const isEnglish = englishChars.length / text.length > 0.5;

    if (!isEnglish) {
      return text; // 이미 한글인 경우 그대로 반환
    }

    // 일반적인 아웃도어 용어 매핑 (우선순위)
    const commonWords: { [key: string]: string } = {
      aurora: '오로라',
      backpacking: '백패킹',
      tent: '텐트',
      footprint: '풋프린트',
      dagger: '대거',
      osmo: '오스모',
      lightweight: '라이트웨이트',
      dragonfly: '드래곤플라이',
      ultralight: '울트라라이트',
      bikepack: '바이크팩',
      flyer: '플라이어',
      bluesign: '블루사인',
      insulated: '인슐레이티드',
      self: '셀프',
      inflating: '인플레이팅',
      sleeping: '슬리핑',
      pad: '패드',
      regular: '레귤러',
      wide: '와이드',
      long: '롱',
      hornet: '호넷',
      elite: '엘리트',
      kodiak: '코디악',
      season: '시즌',
      expedition: '익스페디션',
      kunai: '쿠나이',
      longbow: '롱보우',
      all: '올',
      mayfly: '메이플라이',
      quasar: '퀘이사',
      double: '더블',
      non: '논',
      switchback: '스위치백',
      short: '숏',
      tensor: '텐서',
      extreme: '익스트림',
      conditions: '컨디션',
      mummy: '머미',
      astro: '아스트로',
      bag: '백',
      pack: '팩',
      jacket: '재킷',
      pants: '팬츠',
      boots: '부츠',
      gloves: '글러브',
      hat: '햇',
      cap: '캡',
      vest: '베스트',
      shirt: '셔츠',
      shorts: '쇼츠',
      socks: '삭스',
      down: '다운',
      fleece: '플리스',
      gore: '고어',
      tex: '텍스',
      pro: '프로',
      lite: '라이트',
      light: '라이트',
      ultra: '울트라',
      super: '슈퍼',
      mega: '메가',
      mini: '미니',
      micro: '마이크로',
      nano: '나노',
      gear: '기어',
      outdoor: '아웃도어',
      hiking: '하이킹',
      climbing: '클라이밍',
      camping: '캠핑',
      trekking: '트레킹',
      adventure: '어드벤처',
      mountain: '마운틴',
      alpine: '알파인',
      summit: '서밋',
      peak: '피크',
      trail: '트레일',
      base: '베이스',
      camp: '캠프',
      shelter: '셸터',
      pillow: '필로우',
      stove: '스토브',
      pot: '팟',
      cup: '컵',
      mug: '머그',
      bottle: '보틀',
      flask: '플라스크',
      filter: '필터',
      purifier: '퓨리파이어',
      lantern: '랜턴',
      headlamp: '헤드램프',
      flashlight: '플래시라이트',
      knife: '나이프',
      tool: '툴',
      multi: '멀티',
      repair: '리페어',
      kit: '키트',
      first: '퍼스트',
      aid: '에이드',
      emergency: '이머전시',
      survival: '서바이벌',
      rescue: '레스큐',
      signal: '시그널',
      whistle: '휘슬',
      compass: '컴패스',
      gps: '지피에스',
      map: '맵',
      case: '케이스',
      cover: '커버',
      protector: '프로텍터',
      guard: '가드',
      shield: '실드',
      barrier: '배리어',
      membrane: '멤브레인',
      fabric: '패브릭',
      material: '머티리얼',
      synthetic: '신서틱',
      natural: '내추럴',
      organic: '오가닉',
      eco: '에코',
      green: '그린',
      blue: '블루',
      red: '레드',
      black: '블랙',
      white: '화이트',
      gray: '그레이',
      grey: '그레이',
      yellow: '옐로우',
      orange: '오렌지',
      purple: '퍼플',
      pink: '핑크',
      brown: '브라운',
      navy: '네이비',
      khaki: '카키',
      olive: '올리브',
      forest: '포레스트',
      desert: '데저트',
      arctic: '아틱',
      tropical: '트로피컬',
      weather: '웨더',
      proof: '프루프',
      resistant: '레지스턴트',
      breathable: '브리더블',
      waterproof: '워터프루프',
      windproof: '윈드프루프',
      thermal: '써멀',
      cooling: '쿨링',
      ventilation: '벤틸레이션',
      moisture: '모이스처',
      wicking: '위킹',
      quick: '퀵',
      dry: '드라이',
      fast: '패스트',
      slow: '슬로우',
      heavy: '헤비',
      duty: '듀티',
      weight: '웨이트',
      size: '사이즈',
      fit: '핏',
      comfort: '컴포트',
      performance: '퍼포먼스',
      quality: '퀄리티',
      premium: '프리미엄',
      standard: '스탠다드',
      basic: '베이직',
      advanced: '어드밴스드',
      professional: '프로페셔널',
      expert: '엑스퍼트',
      beginner: '비기너',
      junior: '주니어',
      senior: '시니어',
      adult: '어덜트',
      youth: '유스',
      kids: '키즈',
      men: '맨',
      women: '우먼',
      unisex: '유니섹스',
      universal: '유니버설',
      classic: '클래식',
      vintage: '빈티지',
      modern: '모던',
      contemporary: '컨템포러리',
      traditional: '트래디셔널',
      innovative: '이노베이티브',
      revolutionary: '레볼루셔너리',
      cutting: '커팅',
      edge: '엣지',
      technology: '테크놀로지',
      system: '시스템',
      design: '디자인',
      style: '스타일',
      fashion: '패션',
      trend: '트렌드',
      collection: '컬렉션',
      series: '시리즈',
      line: '라인',
      model: '모델',
      version: '버전',
      edition: '에디션',
      special: '스페셜',
      limited: '리미티드',
      exclusive: '익스클루시브',
      signature: '시그니처',
      original: '오리지널',
      authentic: '어센틱',
      genuine: '제뉴인',
      real: '리얼',
      true: '트루',
      pure: '퓨어',
      fresh: '프레시',
      clean: '클린',
      clear: '클리어',
      smooth: '스무스',
      soft: '소프트',
      hard: '하드',
      tough: '터프',
      strong: '스트롱',
      durable: '듀러블',
      reliable: '릴라이어블',
      stable: '스테이블',
      secure: '시큐어',
      safe: '세이프',
      protection: '프로텍션',
      safety: '세이프티',
      security: '시큐리티',
    };

    // 기본 발음 변환 함수 (간단한 음성학 규칙)
    const convertBasicPronunciation = (word: string): string => {
      let result = word.toLowerCase();

      // 복잡한 패턴들을 먼저 처리
      const patterns = [
        ['tion', '션'],
        ['sion', '션'],
        ['ough', '어프'],
        ['augh', '어프'],
        ['ight', '아이트'],
        ['eigh', '에이'],
        ['ough', '오'],
        ['ough', '어프'],
        ['ack', '액'],
        ['ick', '익'],
        ['ock', '옥'],
        ['uck', '억'],
        ['eck', '엑'],
        ['ank', '앙크'],
        ['ink', '잉크'],
        ['unk', '엄크'],
        ['alk', '알크'],
        ['olk', '올크'],
        ['alk', '오크'],
        ['ing', '잉'],
        ['ung', '엄'],
        ['ang', '앙'],
        ['ong', '옹'],
        ['ent', '엔트'],
        ['ant', '앤트'],
        ['int', '인트'],
        ['unt', '언트'],
        ['ont', '온트'],
        ['ack', '액'],
        ['eck', '엑'],
        ['ick', '익'],
        ['ock', '옥'],
        ['uck', '억'],
        ['alk', '오크'],
        ['ell', '엘'],
        ['ill', '일'],
        ['oll', '올'],
        ['ull', '을'],
        ['all', '올'],
        ['ell', '엘'],
        ['igh', '아이'],
        ['egh', '에이'],
        ['igh', '아이'],
        ['ough', '어프'],
        ['augh', '어프'],
        ['ch', '치'],
        ['sh', '시'],
        ['th', '스'],
        ['ph', '프'],
        ['gh', '그'],
        ['ck', '크'],
        ['ng', '응'],
        ['qu', '쿠'],
        ['x', '크스'],
        ['oo', '우'],
        ['ee', '이'],
        ['ea', '이'],
        ['ou', '아우'],
        ['ow', '오'],
        ['oy', '오이'],
        ['ai', '아이'],
        ['ay', '에이'],
        ['ei', '에이'],
        ['ie', '아이'],
        ['ue', '우'],
        ['ui', '우이'],
        ['a', '아'],
        ['e', '에'],
        ['i', '이'],
        ['o', '오'],
        ['u', '우'],
        ['b', '브'],
        ['c', '크'],
        ['d', '드'],
        ['f', '프'],
        ['g', '그'],
        ['h', '하'],
        ['j', '제'],
        ['k', '크'],
        ['l', '를'],
        ['m', '므'],
        ['n', '느'],
        ['p', '프'],
        ['q', '쿠'],
        ['r', '르'],
        ['s', '스'],
        ['t', '트'],
        ['v', '브'],
        ['w', '우'],
        ['y', '이'],
        ['z', '즈'],
      ];

      // 패턴별로 순차적으로 치환
      for (const [pattern, replacement] of patterns) {
        result = result.replace(new RegExp(pattern, 'g'), replacement);
      }

      return result;
    };

    // 단어별로 분리하여 처리
    const words = text.split(/[\s-_™®©&]+/).filter((word) => word.length > 0);
    const convertedWords = words.map((word) => {
      // 숫자나 특수문자만 있는 경우 그대로 반환
      if (!/[a-zA-Z]/.test(word)) {
        return word;
      }

      // 일반적인 단어 매핑에서 찾기 (우선순위)
      const lowerWord = word.toLowerCase();
      if (commonWords[lowerWord]) {
        return commonWords[lowerWord];
      }

      // 기본 발음 변환 적용
      return convertBasicPronunciation(word);
    });

    return convertedWords.join(' ').trim();
  };

  const handleClick = async () => {
    const selectedIds = manage.selectedIds;

    if (selectedIds.length === 0) {
      message.warning('장비를 선택해주세요.');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const selectedItems = manage.getItems().filter((item) => selectedIds.includes(item.id));

      for (const item of selectedItems) {
        try {
          const koreanPronunciation = convertToKoreanPronunciation(item.name);
          await manage.updateNameKorean(item.id, koreanPronunciation);
          successCount++;
        } catch (error) {
          console.error(`장비 ${item.name} 발음 변환 실패:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        message.success(`${successCount}개 장비의 한글 발음이 저장되었습니다.`);
      }
      if (failCount > 0) {
        message.error(`${failCount}개 장비의 한글 발음 저장에 실패했습니다.`);
      }
    } catch (error) {
      message.error('한글 발음 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      style={{ marginLeft: 8 }}
      onClick={handleClick}
      loading={loading}
      disabled={manage.selectedIds.length === 0}
    >
      한글 이름 저장
    </Button>
  );
};

export default SaveKoreanNameButtonView;
