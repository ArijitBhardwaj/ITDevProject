import React from "react";
import { useRoutes } from "react-router-dom";
import SignUp from "./Pages/SignUp";
import SignIn from "./Pages/SignIn";
import HomePage from "./Pages/HomePage";
import TestingLandingPage from "./Pages/TestingLandingPage";
import UserProfilePage from "./Pages/UserProfilePage";
import NavigationPage from "./Pages/NavigationPage";
import OngoingNavigation from "./Pages/OngoingNavigation";

function App() {
  const routes = useRoutes([
    {
      path: "/",
      element: <HomePage />, // HomePage as the landing page
    },
    {
      path: "/signup",
      element: <SignUp />,
    },
    {
      path: "/signin",
      element: <SignIn />,
    },
    {
      path: "/testinglanding",
      element: <TestingLandingPage />,
    },
    {
      path: "/userprofilepage",
      element: <UserProfilePage />,
    },
    {
      path: "/navigationpage",
      element: <NavigationPage />,
    },
    { path: "/ongoingnav", element: <OngoingNavigation /> },
  ]);

  return <>{routes}</>;
}

export default App;
