import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import App from "./App";

type FieldType = {
  email?: string;
  password?: string;
};

const LogIn = () => {
  const navigate = useNavigate();
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const firebase = App.getFirebase();

  const onFinish = async ({
    email,
    password,
  }) => {
    try {
      if (email && password) {
        await firebase.login(email, password);
        navigate("/bag");
      }
    } catch (e: any) {
      setErrorMessage(e.message);
      setShowError(true);
    }
  };

  const handleClickGoogle = async () => {
    await firebase.logInWithGoogle();
    navigate("/");
  };

  const handleClickJoin = () => {
    navigate("/join");
  };

  return (
    <div>
       <a
                  onClick={handleClickGoogle}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={"/web_light_sq_SI.svg"}
                    alt={"google"}
                    width={175}
                    height={32}
                  />
                </a>
    </div>
  );
};

export default LogIn;
