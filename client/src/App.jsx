import React from "react";
import SignUp from "./Pages/SignUp";
import { useRoutes } from "react-router-dom";
import NavigationMenu from "./Pages/navigation_ui/navigationMenu";

function App() {

  const routes = useRoutes([
    {
      path: '/',
      element: <NavigationMenu></NavigationMenu>
    },
    {
      path: '/signup',
      element: <SignUp></SignUp>
    }    
  ])

  return (
    <>
      {routes}
    </>
  );
}

export default App;
