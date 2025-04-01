import React from "react";
import { useRoutes } from "react-router-dom";
import SignUp from "./Pages/SignUp";
import SignIn from "./Pages/SignIn";
import HomePage from "./Pages/HomePage";
import TestingLandingPage from './Pages/TestingLandingPage';
import UserProfilePage from './Pages/UserProfilePage'

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
      path : "/testinglanding",
      element : <TestingLandingPage />,
    },
    {
      path: "/userprofilepage",
      element: <UserProfilePage/>,
    }
  ]);

  return <>{routes}</>;
}

export default App;
