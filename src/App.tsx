import React, { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import Welcome from "./Welcome.tsx";
import LogIn from "./LogIn.tsx";
import Join from "./Join.tsx";
import { observer } from "mobx-react-lite";
import firebase from "./firebase/Firebase.ts";
import Bag from "./bag/Bag.tsx";
import Warehouse from "./warehouse/Warehouse.tsx";

const ROUTES = [
  {
    path: "/",
    element: <Welcome />,
  },
  {
    path: "/login",
    element: <LogIn />,
  },
  {
    path: "/join",
    element: <Join />,
  },
  {
    path: "/bag",
    element: <Bag />,
  },
  { path: "/warehouse", element: <Warehouse /> },
];

const App = () => {
  const navigate = useNavigate();
  const isLoggedIn = firebase.isLoggedIn();
  const isInitialized = firebase.isInitialized();

  useEffect(() => {
    if (isInitialized) {
      if (isLoggedIn) {
        navigate("/warehouse", { replace: true });
      } else {
        navigate("/login");
      }
    }
  }, [isLoggedIn, isInitialized]);

  if (isInitialized) {
    return (
      <Routes>
        {ROUTES.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Routes>
    );
  } else {
    return "loading";
  }
};

export default observer(App);
