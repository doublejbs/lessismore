import { useNavigate } from "react-router-dom";
import React from "react";

const Welcome = () => {
  const navigate = useNavigate();
  const handleClickLogin = () => {
    navigate("/login");
  };

  const handleClickJoin = () => {
    navigate("/join");
  };

  return (
    <div>
      <button onClick={handleClickLogin}>로그인</button>
      <button onClick={handleClickJoin}>회원가입</button>
    </div>
  );
};

export default Welcome;
