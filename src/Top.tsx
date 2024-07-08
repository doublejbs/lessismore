import firebase from "./firebase/Firebase.ts";
import { useLocation, useNavigate } from "react-router-dom";

const Top = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isBag = location.pathname === "/bag";
  const isWarehouse = location.pathname === "/warehouse";

  const handleClickBag = () => {
    navigate("/bag");
  };

  const handleClickWarehouse = () => {
    navigate("/warehouse");
  };

  return (
    <nav
      style={{
        border: "1px solid black",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: "row",
        gap: "30px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexGrow: 1,
          gap: "30px",
        }}
      >
        <button
          onClick={handleClickWarehouse}
          style={{
            color: isWarehouse ? "skyblue" : "black",
          }}
        >
          창고
        </button>
        <button
          onClick={handleClickBag}
          style={{
            color: isBag ? "skyblue" : "black",
          }}
        >
          배낭
        </button>
      </div>
      <div>
        <button onClick={() => firebase.logout()}>
          {firebase.getUserId()} 로그아웃
        </button>
      </div>
    </nav>
  );
};

export default Top;
