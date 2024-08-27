import { FC } from "react";
import Search from "antd/es/input/Search";

const SearchBar: FC = () => {
  return (
    <Search
      placeholder="장비 검색"
      allowClear
      enterButton="Search"
      size="middle"
      style={{
        maxWidth: "300px",
        margin: "10px",
      }}
    />
  );
};

export default SearchBar;
