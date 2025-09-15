import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';
import Approve from './pages/Approve';
import Onboarding from './pages/Onboarding';
import Access from './pages/Access';

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/dashboard', element: <App /> },
  { path: '/approve', element: <Approve /> },
  { path: '/onboarding', element: <Onboarding /> },
  { path: '/access', element: <Access /> },
  { path: '*', element: <Landing /> },
]);

export default function AppRouter() {
  return (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}
