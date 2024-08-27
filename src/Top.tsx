import firebase from "./firebase/Firebase.ts";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Typography } from "antd";
import { Header } from "antd/es/layout/layout";
import app from "./App.ts";

const { Text } = Typography;

const Top = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isBag = location.pathname === "/bag";
  const isWarehouse = location.pathname === "/warehouse";
  const firebase = app.getFirebase();
  const selectedKeys = isBag ? ["bag"] : isWarehouse ? ["warehouse"] : [];

  const handleClickWarehouse = () => {
    navigate("/warehouse");
  };

  const handleClickBag = () => {
    navigate("/bag");
  };

  // const handleClickLogout = async () => {
  //   await firebase.logout();
  //   navigate("/login");
  // };

  return (
    <Header
      style={{
        background: "white",
        padding: "0px",
      }}
    >
      <div
        style={{
          height: "30px",
        }}
      >
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
        <Button
          type={"text"}
          onClick={handleClickBag}
          style={{
            fontWeight: isBag ? "bold" : "normal",
          }}
        >
          모험
        </Button>
      </div>
    </Header>
  );
};

export default Top;
