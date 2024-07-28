import React from "react";
import { observer } from "mobx-react-lite";
import Top from "../Top.tsx";

const Bag = () => {
  return (
    <>
      <Top />
      <img src={"/bag.png"} alt="Bag" />
    </>
  );
};

export default observer(Bag);
