import { useRoutes } from 'react-router-dom';
import SignUp from './Pages/SignUp'
import SignIn from './Pages/SignIn';

function App() {
  const routes = useRoutes([
    {
      path: '/',
      element: <SignUp></SignUp>
    },
    {
      path: '/signin',
      element: <SignIn></SignIn>
    }
  ]);

  return <>{routes}</>;
   
}

export default App;
