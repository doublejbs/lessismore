import { FC, ReactNode, useEffect, useRef } from 'react';

interface Props {
  children: ReactNode;
  loadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

const InfinityScroll: FC<Props> = ({
  children,
  loadMore,
  isLoading,
  hasMore,
}) => {
  const observer = useRef<IntersectionObserver>(null);

  useEffect(() => {
    if (hasMore) {
      // @ts-ignore
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          loadMore();
        }
      });

      const lastElement = document.getElementById('lastElement');
      if (lastElement) {
        observer.current?.observe(lastElement);
      }
    }

    return () => {
      observer.current?.disconnect();
    };
  }, [isLoading, hasMore]);

  if (hasMore) {
    return (
      <>
        {children}
        <div id="lastElement" style={{ height: '1px' }}></div>
      </>
    );
  } else {
    return children;
  }
};

export default InfinityScroll;
