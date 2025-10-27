import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';
import Access from './pages/Access';
import Help from './pages/Help';
import AdminDashboard from './pages/admin/AdminDashboard';

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/dashboard', element: <App /> },
  { path: '/access', element: <Access /> },
  { path: '/help', element: <Help /> },
  { path: '/ciphsecure', element: <AdminDashboard /> },
  { path: '*', element: <Landing /> },
]);

export default function AppRouter() {
  return (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}
