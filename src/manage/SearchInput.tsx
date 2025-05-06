import React, { useState } from 'react';
import { Input } from 'antd';
import Manage from './model/Manage';

interface SearchInputProps {
  manager: Manage;
}

const SearchInput: React.FC<SearchInputProps> = ({ manager }) => {
  const [searchText, setSearchText] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    if ((window as any).searchDebounce) clearTimeout((window as any).searchDebounce);
    (window as any).searchDebounce = setTimeout(() => {
      manager.setSearch(value);
    }, 300);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Input.Search
        placeholder='이름으로 검색'
        value={searchText}
        onChange={handleChange}
        allowClear
        style={{ width: 240 }}
      />
    </div>
  );
};

export default SearchInput;
