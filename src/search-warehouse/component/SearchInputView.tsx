import { FC, useRef } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import { josa } from 'josa';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SuggestionKeywords = [
  '니모',
  '하이퍼라이트마운틴기어',
  '야마토미치',
  '코오롱스포츠',
  '아크테릭스',
  '케일',
  '랩',
  '꼴로르',
  '헬리녹스',
];

const SearchBarInputView: FC<Props> = ({ searchWarehouse }) => {
  const keyword = searchWarehouse.getKeyword();
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholder = `${josa(`'${SuggestionKeywords[Math.floor(Math.random() * SuggestionKeywords.length)]}'#{을}`)} 검색해보세요`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchWarehouse.changeKeyword(e.target.value);
  };

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  const handleFocus = () => {
    if (isIOS()) {
      document.body.style.transform = 'translateY(0px)'; // 또는 다른 변화
      setTimeout(() => {
        document.body.style.transform = '';
      }, 100);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  const handleClickClear = () => {
    searchWarehouse.clearKeyword();
  };

  return (
    <>
      <input
        ref={inputRef}
        className='no-outline'
        style={{
          appearance: 'none',
          border: 'none',
          backgroundColor: 'transparent',
          padding: 0,
          width: '100%',
          fontSize: '16px',
          outline: 'none',
        }}
        value={keyword}
        onChange={handleChange}
        placeholder={placeholder}
        onFocus={handleFocus}
        onClick={handleClick}
      />
      {keyword && (
        <div onClick={handleClickClear}>
          <svg
            width='21'
            height='20'
            viewBox='0 0 21 20'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <rect x='0.609375' width='20' height='20' rx='10' fill='#B0B8C1' />
            <path
              d='M10.6107 11.1667L8.17997 13.6042C8.0263 13.7569 7.83073 13.8333 7.59324 13.8333C7.35575 13.8333 7.16018 13.7569 7.00651 13.6042C6.85373 13.4514 6.77734 13.2569 6.77734 13.0208C6.77734 12.7847 6.85373 12.5903 7.00651 12.4375L9.44401 10L7.00651 7.59017C6.85373 7.43649 6.77734 7.2409 6.77734 7.00342C6.77734 6.76592 6.85373 6.57033 7.00651 6.41667C7.15929 6.26389 7.35373 6.1875 7.58984 6.1875C7.82595 6.1875 8.0204 6.26389 8.17318 6.41667L10.6107 8.85417L13.0205 6.41667C13.1742 6.26389 13.3698 6.1875 13.6073 6.1875C13.8448 6.1875 14.0403 6.26389 14.194 6.41667C14.3607 6.58333 14.444 6.78125 14.444 7.01042C14.444 7.23958 14.3607 7.43056 14.194 7.58333L11.7565 10L14.194 12.4307C14.3468 12.5844 14.4232 12.78 14.4232 13.0174C14.4232 13.2549 14.3468 13.4505 14.194 13.6042C14.0273 13.7708 13.8294 13.8542 13.6003 13.8542C13.3711 13.8542 13.1801 13.7708 13.0273 13.6042L10.6107 11.1667Z'
              fill='white'
            />
          </svg>
        </div>
      )}
    </>
  );
};

export default SearchBarInputView;
