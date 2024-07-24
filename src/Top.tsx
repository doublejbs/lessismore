import firebase from "./firebase/Firebase.ts";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Menu } from "antd";
import { Header } from "antd/es/layout/layout";

const menus = [
  { key: "warehouse", label: "창고" },
  { key: "bag", label: "배낭" },
];

const Top = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isBag = location.pathname === "/bag";
  const isWarehouse = location.pathname === "/warehouse";
  const selectedKeys = isBag ? ["bag"] : isWarehouse ? ["warehouse"] : [];

  const handleClickMenu = ({ key }: { key: string }) => {
    navigate(`/${key}`);
  };

  const handleClickLogout = () => {
    firebase.logout();
  };

  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
        padding: "0 32px",
      }}
    >
      <Menu
        theme={"light"}
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
        mode={"horizontal"}
        items={menus}
        defaultSelectedKeys={selectedKeys}
        onClick={handleClickMenu}
      />
      <Button type="text" onClick={handleClickLogout}>
        로그아웃
      </Button>
    </Header>
  );
};

export default Top;
