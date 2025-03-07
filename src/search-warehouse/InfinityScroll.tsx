import { FC, ReactNode, useEffect, useRef } from 'react';

interface Props {
  children: ReactNode;
  loadMore: () => void;
  isLoading: boolean;
}

const InfinityScroll: FC<Props> = ({ children, loadMore, isLoading }) => {
  const observer = useRef<IntersectionObserver>(null);

  useEffect(() => {
    // @ts-ignore
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoading) {
        console.log('load more');
        loadMore();
      }
    });

    const lastElement = document.getElementById('lastElement');
    if (lastElement) {
      observer.current?.observe(lastElement);
    }

    return () => {
      observer.current?.disconnect();
    };
  }, [isLoading]);

  return (
    <>
      {children}
      <div id="lastElement" style={{ height: '1px' }}></div>
    </>
  );
};

export default InfinityScroll;
