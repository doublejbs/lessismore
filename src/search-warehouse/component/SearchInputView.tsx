import { FC, useRef } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchBarInputView: FC<Props> = ({ searchWarehouse }) => {
  const keyword = searchWarehouse.getKeyword();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchWarehouse.changeKeyword(e.target.value);
  };

  const handleFocus = () => {
    document.body.style.transform = 'translateY(0px)'; // 또는 다른 변화
    setTimeout(() => {
      document.body.style.transform = '';
    }, 100);
  };

  return (
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
      placeholder={'제품 혹은 브랜드 명으로 검색해보세요'}
      onFocus={handleFocus}
    />
  );
};

export default SearchBarInputView;
