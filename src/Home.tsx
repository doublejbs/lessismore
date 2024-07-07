import React from "react";
import firebase from "./Firebase";
import { observer } from "mobx-react-lite";

const Home = () => {
  return <div>로그인 사용자: {firebase.getUserId()}</div>;
};

export default observer(Home);
