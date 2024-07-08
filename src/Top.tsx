import firebase from "./firebase/Firebase.ts";

const Top = () => {
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
        <button>창고</button>
        <button>배낭</button>
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
