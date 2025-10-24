import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';
import Access from './pages/Access';
import Help from './pages/Help';
import Onboarding from './pages/Onboarding';

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/dashboard', element: <App /> },
  { path: '/onboarding', element: <Onboarding /> },
  { path: '/access', element: <Access /> },
  { path: '/help', element: <Help /> },
  { path: '*', element: <Landing /> },
]);

export default function AppRouter() {
  return (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}
