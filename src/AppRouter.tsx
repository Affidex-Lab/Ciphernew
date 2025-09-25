import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';
import Access from './pages/Access';

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/dashboard', element: <App /> },
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
