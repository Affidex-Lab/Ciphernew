import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App';
import Landing from './pages/Landing';
import MobileLanding from './pages/MobileLanding';
import Access from './pages/Access';
import Help from './pages/Help';
import AdminDashboard from './pages/admin/AdminDashboard';
import Browser from './pages/Browser';

// Detect if running as mobile app or mobile browser
const isMobileApp = Capacitor.isNativePlatform() || window.innerWidth <= 768;
const LandingComponent = isMobileApp ? MobileLanding : Landing;

const router = createBrowserRouter([
  { path: '/', element: <LandingComponent /> },
  { path: '/dashboard', element: <App /> },
  { path: '/browser', element: <Browser /> },
  { path: '/access', element: <Access /> },
  { path: '/help', element: <Help /> },
  { path: '/ciphsecure', element: <AdminDashboard /> },
  { path: '*', element: <LandingComponent /> },
]);

export default function AppRouter() {
  return (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}
