import { useRoutes } from "react-router-dom";
import SignUp from "./Pages/SignUp";
import SignIn from "./Pages/SignIn";
import HomePage from "./Pages/HomePage";

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
  ]);

  return <>{routes}</>;
}

export default App;
