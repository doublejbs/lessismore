import Top from "../Top.tsx";
import AddButton from "./AddButton.tsx";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import App from "../App.ts";

const Warehouse = () => {
  const [gear, setGears] = useState<Array<{name: string; company: string; weight: string}>>([]);

  useEffect(() => {
    (async () => {
      setGears((await App.getGearStore().getList()).map((doc) => doc.data()) as Array<{name: string; company: string; weight: string}>);
    })();
  }, []);

  return (
<>
      <Top />
      <div>
        <ul>
          {
            gear.map((gear) => (
              <li>
                name: {gear.name} company: {gear.company} weight: {gear.weight}
              </li>
            ))
          }
        </ul>
      </div>
      <AddButton />
      </>
  );
};

export default Warehouse;
