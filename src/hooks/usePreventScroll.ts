import { useEffect } from 'react';

const usePreventScroll = (isPrevent: boolean) => {
  useEffect(() => {
    if (isPrevent) {
      document.body.style.cssText = `
        overflow: hidden;
        width: 100%;
      `;
    } else {
      document.body.style.cssText = '';
    }

    return () => {
      document.body.style.cssText = '';
    };
  }, [isPrevent]);
};

export default usePreventScroll;
