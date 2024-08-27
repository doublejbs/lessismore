import { css } from "@emotion/css";
import App from "@/App.ts";
import { doc, setDoc } from "firebase/firestore";
const AddButton = () => {
  const handleClick = () => {
    setDoc(doc(App.getStore(), "users", App.getFirebase().getUserId()), {
      gears: ["1"],
    });
  };

  return (
    <button
      className={css`
        position: fixed;
        right: 30px;
        bottom: 30px;
        border-radius: 50%;
        border: 1px solid black;
        width: 50px;
        height: 50px;
        background: black;
        color: white;
        font-size: 25px;
      `}
      onClick={handleClick}
    >
      +
    </button>
  );
};

export default AddButton;
