'use client';

import Crawl from './Crawl.ts';

const CrawlView = () => {
  const handleClick = () => {
    Crawl.new().crawl();
  };

  return (
    <div>
      <button onClick={handleClick}>크롤</button>
    </div>
  );
};

export default CrawlView;
