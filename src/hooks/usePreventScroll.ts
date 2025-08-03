import { useEffect } from 'react';

const usePreventScroll = (isPrevent: boolean) => {
  useEffect(() => {
    if (isPrevent) {
      const scrollY = window.scrollY;

      // html, body 모두에 스크롤 방지 적용
      document.documentElement.style.cssText = `
        overflow: hidden;
        position: fixed;
        top: -${scrollY}px;
        left: 0;
        right: 0;
      `;
      document.body.style.cssText = `
        overflow: hidden;
        width: 100%;
        position: fixed;
        top: -${scrollY}px;
        left: 0;
        right: 0;
      `;

      // 터치 이벤트 방지 (모바일)
      const preventTouch = (e: TouchEvent) => {
        e.preventDefault();
      };

      // 마우스 휠 이벤트 방지
      const preventWheel = (e: WheelEvent) => {
        e.preventDefault();
      };

      document.addEventListener('touchmove', preventTouch, { passive: false });
      document.addEventListener('wheel', preventWheel, { passive: false });

      return () => {
        document.documentElement.style.cssText = '';
        document.body.style.cssText = '';
        document.removeEventListener('touchmove', preventTouch);
        document.removeEventListener('wheel', preventWheel);
        window.scrollTo(0, scrollY);
      };
    }
  }, [isPrevent]);
};

export default usePreventScroll;
