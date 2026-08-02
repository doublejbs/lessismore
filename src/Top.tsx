import firebase from "./firebase/Firebase.ts";
import { useLocation, useNavigate } from "react-router-dom";
import app from "./App.ts";

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
    <div
    >
      <div
        style={{
          height: "30px",
        }}
      >
        <button

          onClick={handleClickWarehouse}
          style={{
            fontWeight: isWarehouse ? "bold" : "normal",
          }}
        >
          창고
        </button>
        <button

          onClick={handleClickBag}
          style={{
            fontWeight: isBag ? "bold" : "normal",
          }}
        >
          배낭
        </button>
        <button

          onClick={handleClickBag}
          style={{
            fontWeight: isBag ? "bold" : "normal",
          }}
        >
          모험
        </button>
        {/* <Button onClick={handleClickLogout}>로그아웃</Button> */}
      </div>
    </div>
  );
};

export default Top;
