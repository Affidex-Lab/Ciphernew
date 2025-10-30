import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Wallet, Globe, ChevronLeft, ChevronRight, Lock, Zap, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0
  })
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export default function MobileLanding() {
  const navigate = useNavigate();
  const [[page, direction], setPage] = useState([0, 0]);

  const sections = [
    {
      id: 'hero',
      content: (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 text-center">
          <div className="mb-6">
            <img src="/seedless.svg" alt="CipherWallet" className="h-24 w-24 mx-auto" />
          </div>
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: [0, -3, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-4 inline-flex items-center rounded-full bg-[#8876DD] px-3 py-1 text-xs font-medium text-white"
          >
            New • Seedless smart wallets
          </motion.span>
          <h1 className="text-3xl font-serif font-bold mb-4">
            A simple, secure wallet for everyone
          </h1>
          <p className="text-gray-700 mb-8 max-w-sm">
            Create seedless smart wallets in seconds. Own your assets with professional-grade security.
          </p>
          <div className="space-y-3 w-full max-w-xs">
            <Button 
              className="w-full py-6 text-base bg-primary text-white hover:brightness-110" 
              onClick={() => navigate('/dashboard?autocreate=1')}
            >
              Get Started
            </Button>
            <Button 
              variant="outline" 
              className="w-full py-6 text-base border-primary text-primary hover:bg-primary hover:text-white" 
              onClick={() => navigate('/access')}
            >
              Access Wallet
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      content: (
        <div className="flex flex-col min-h-[calc(100vh-64px)] px-6 py-8">
          <h2 className="text-2xl font-serif font-bold text-center mb-8">Why CipherWallet?</h2>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <Card className="border-gray-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <Shield className="h-12 w-12 text-primary mb-3" />
                <h3 className="text-lg font-semibold mb-2">Professional Security</h3>
                <p className="text-sm text-gray-700">
                  Best-practice encryption and smart account design keep your assets protected.
                </p>
              </CardContent>
            </Card>
            <Card className="border-gray-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <Wallet className="h-12 w-12 text-primary mb-3" />
                <h3 className="text-lg font-semibold mb-2">Seedless by Default</h3>
                <p className="text-sm text-gray-700">
                  No recovery phrases. Create wallets instantly with simple recovery options.
                </p>
              </CardContent>
            </Card>
            <Card className="border-gray-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <Globe className="h-12 w-12 text-primary mb-3" />
                <h3 className="text-lg font-semibold mb-2">Multi-chain Support</h3>
                <p className="text-sm text-gray-700">
                  Ready for the networks you use today and tomorrow.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      content: (
        <div className="flex flex-col min-h-[calc(100vh-64px)] px-6 py-8">
          <h2 className="text-2xl font-serif font-bold text-center mb-8">Enterprise-Grade Security</h2>
          <div className="flex-1 flex flex-col justify-center">
            <div className="bg-gradient-to-br from-[#8876DD]/10 to-[#00EC97]/10 rounded-2xl p-6 mb-6">
              <Lock className="h-16 w-16 text-primary mx-auto mb-4" />
              <p className="text-gray-700 text-center mb-6">
                From day one, CipherWallet is designed for clarity and control. Transparent permissions and modern account abstraction.
              </p>
            </div>
            <Card className="border-gray-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Security Highlights
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-primary mt-0.5" />
                    <span className="text-sm">Seedless onboarding</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-primary mt-0.5" />
                    <span className="text-sm">Granular permissions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-primary mt-0.5" />
                    <span className="text-sm">Recovery kits & passkeys</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-primary mt-0.5" />
                    <span className="text-sm">Smart account architecture</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'getstarted',
      content: (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6">
          <div className="bg-gradient-to-br from-[#8876DD]/20 to-[#00EC97]/20 rounded-full p-6 mb-6">
            <Smartphone className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-center mb-4">
            Ready to Start?
          </h2>
          <p className="text-gray-700 text-center mb-8 max-w-sm">
            Join thousands of users who've already embraced seedless security with CipherWallet.
          </p>
          <div className="space-y-3 w-full max-w-xs">
            <Button 
              className="w-full py-6 text-base bg-primary text-white hover:brightness-110" 
              onClick={() => navigate('/dashboard?autocreate=1')}
            >
              Create Your Wallet
            </Button>
            <Button 
              variant="outline" 
              className="w-full py-6 text-base border-primary text-primary hover:bg-primary hover:text-white" 
              onClick={() => navigate('/access')}
            >
              I Have a Wallet
            </Button>
          </div>
          <div className="mt-12 text-center">
            <p className="text-xs text-gray-500">© {new Date().getFullYear()} CipherWallet</p>
            <p className="text-xs text-gray-500 mt-1">Simple, secure self-custody for everyone</p>
          </div>
        </div>
      )
    }
  ];

  const paginate = (newDirection: number) => {
    const nextPage = page + newDirection;
    if (nextPage >= 0 && nextPage < sections.length) {
      setPage([nextPage, newDirection]);
    }
  };

  // Touch handling for swipe gestures
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) { // Minimum swipe distance
        if (diff > 0 && page < sections.length - 1) {
          paginate(1); // Swipe left - next page
        } else if (diff < 0 && page > 0) {
          paginate(-1); // Swipe right - previous page
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [page]);

  return (
    <div className="flex flex-col min-h-screen bg-white text-black overflow-hidden">
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2" onClick={() => navigate('/')}>
            <img src="/seedless.svg" alt="CipherWallet" className="h-8 w-8" />
            <span className="text-lg font-bold">CipherWallet</span>
          </div>
          <div className="flex gap-2">
            {page > 0 && (
              <button
                onClick={() => paginate(-1)}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {page < sections.length - 1 && (
              <button
                onClick={() => paginate(1)}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold && page < sections.length - 1) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold && page > 0) {
                paginate(-1);
              }
            }}
            className="absolute inset-0"
          >
            {sections[page].content}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Page indicators */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
        {sections.map((_, index) => (
          <button
            key={index}
            onClick={() => setPage([index, index > page ? 1 : -1])}
            className={`h-2 rounded-full transition-all ${
              index === page 
                ? 'w-8 bg-primary' 
                : 'w-2 bg-gray-300'
            }`}
            aria-label={`Go to section ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}