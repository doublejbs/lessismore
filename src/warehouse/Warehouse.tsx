import { Layout } from "antd";
import { Content } from "antd/es/layout/layout";
import Top from "../Top.tsx";
import AddButton from "./AddButton.tsx";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import App from "../App.ts";

const Warehouse = () => {
  const [gear, setGear] = useState({ name: "", company: "", weight: "" });

  useEffect(() => {
    // setDoc(doc(App.getStore(), "users", App.getFirebase().getUserId()), {
    //   gears: [],
    // });
    (async () => {
      const { gears } = (
        await getDoc(
          doc(App.getStore(), "users", App.getFirebase().getUserId()),
        )
      ).data() as { gears: any };
      setGear(
        (await getDoc(doc(App.getStore(), "gear", gears[0]))).data() as {
          name: string;
          company: string;
          weight: string;
        },
      );
    })();
  }, []);

  return (
    <Layout>
      <Top />
      <Content
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ul>
          <li>
            name: {gear.name} company: {gear.company} weight: {gear.weight}
          </li>
        </ul>
      </Content>
      <AddButton />
    </Layout>
  );
};

export default Warehouse;
