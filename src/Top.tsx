import firebase from "./firebase/Firebase.ts";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Typography } from "antd";
import { Header } from "antd/es/layout/layout";

const { Text } = Typography;

const Top = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isBag = location.pathname === "/bag";
  const isWarehouse = location.pathname === "/warehouse";
  const selectedKeys = isBag ? ["bag"] : isWarehouse ? ["warehouse"] : [];

  const handleClickWarehouse = () => {
    navigate("/warehouse");
  };

  const handleClickBag = () => {
    navigate("/bag");
  };

  const handleClickLogout = async () => {
    await firebase.logout();
    navigate("/login");
  };

  return (
    <Header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "white",
        padding: "0px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          paddingLeft: "15px",
          fontWeight: "900",
          fontSize: "xx-large",
        }}
      >
        <a>USELESS</a>
      </div>
      <div>
        <Button
          type={"text"}
          onClick={handleClickWarehouse}
          style={{
            fontWeight: isWarehouse ? "bold" : "normal",
          }}
        >
          창고
        </Button>
        <Button
          type={"text"}
          onClick={handleClickBag}
          style={{
            fontWeight: isBag ? "bold" : "normal",
          }}
        >
          배낭
        </Button>
      </div>
      <div>
        <Button type="text" onClick={handleClickLogout}>
          로그아웃
        </Button>
      </div>
    </Header>
  );
};

export default Top;
