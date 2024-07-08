import React from "react";
import { observer } from "mobx-react-lite";
import firebase from "../firebase/Firebase.ts";
import Top from "../Top.tsx";

const Bag = () => {
  return (
    <>
      <Top />
      <img src={"src/assets/bag.png"} />
    </>
  );
};

export default observer(Bag);
