import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface MobileWrapperProps {
  children: React.ReactNode;
  mobileComponent?: React.ReactNode;
}

export default function MobileWrapper({ children, mobileComponent }: MobileWrapperProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if running in Capacitor (native app)
    const isNative = Capacitor.isNativePlatform();
    
    // Also check for mobile viewport
    const checkMobile = () => {
      const isMobileViewport = window.innerWidth <= 768;
      setIsMobile(isNative || isMobileViewport);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Return mobile component if provided and is mobile, otherwise children
  return <>{isMobile && mobileComponent ? mobileComponent : children}</>;
}