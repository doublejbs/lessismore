import React from "react";
import { observer } from "mobx-react-lite";
import firebase from "../firebase/Firebase.ts";
import Top from "../Top.tsx";

const Home = () => {
  return (
    <>
      <Top />
    </>
  );
};

export default observer(Home);
