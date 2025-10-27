import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Wallet, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex cursor-pointer items-center gap-2" onClick={() => navigate("/") }>
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-xl font-bold">CipherWallet</span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-gray-700 hover:text-black">Features</a>
            <a href="#security" className="text-sm text-gray-700 hover:text-black">Security</a>
            <a href="#docs" className="text-sm text-gray-700 hover:text-black">Docs</a>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="hidden md:inline-flex bg-primary text-white hover:brightness-110"
              onClick={() => navigate("/dashboard?autocreate=1")}
            >
              Create Wallet
            </Button>
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-white"
              onClick={() => navigate("/access")}
            >
              Access Wallet
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <section className="flex flex-col items-center py-20 text-center">
          <span className="mb-4 inline-flex items-center rounded-full bg-[#8876DD] px-3 py-1 text-xs font-medium text-white">
            New • Seedless smart wallets
          </span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl text-4xl font-serif font-bold md:text-6xl"
          >
            A simple, secure wallet for everyone
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mt-5 max-w-2xl text-lg text-gray-700"
          >
            Create seedless smart wallets in seconds. Own your assets with professional-grade security and effortless recovery.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              className="px-8 py-3 text-lg bg-primary text-white hover:brightness-110"
              onClick={() => navigate("/dashboard?autocreate=1")}
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              className="px-8 py-3 text-lg border-primary text-primary hover:bg-primary hover:text-white"
              onClick={() => navigate("/access")}
            >
              Access Wallet
            </Button>
          </motion.div>
        </section>

        <section id="features" className="py-14">
          <h2 className="mb-10 text-center font-serif text-3xl font-bold md:text-4xl">
            Why choose CipherWallet?
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: <Shield className="h-10 w-10 text-primary" />,
                title: "Professional security",
                desc: "Best-practice encryption and smart account design keep your assets protected.",
              },
              {
                icon: <Wallet className="h-10 w-10 text-primary" />,
                title: "Seedless by default",
                desc: "No recovery phrases. Create wallets instantly with simple, reliable recovery options.",
              },
              {
                icon: <Globe className="h-10 w-10 text-primary" />,
                title: "Built for multiple chains",
                desc: "Ready for the networks you use today and tomorrow.",
              },
            ].map((f, i) => (
              <Card key={i} className="rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col items-start gap-3 p-6">
                  {f.icon}
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="text-sm text-gray-700">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="security" className="py-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-serif text-3xl font-bold">Security you can trust</h3>
              <p className="text-gray-700">
                From day one, CipherWallet is designed for clarity and control. Transparent permissions, straightforward recovery, and
                modern account abstraction give you a professional foundation for self-custody.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-left shadow-sm">
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Highlights</div>
              <ul className="space-y-2 text-sm text-gray-800">
                <li>Seedless onboarding</li>
                <li>Granular permissions</li>
                <li>Recovery kits and passkeys</li>
                <li>Smart account architecture</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-gray-200 bg-white py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 md:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-primary" />
              <div className="font-semibold">CipherWallet</div>
            </div>
            <p className="text-sm text-gray-600">Simple, secure self-custody for everyone.</p>
          </div>
          <div>
            <div className="mb-3 font-semibold">Product</div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li><a href="#features" className="hover:text-black">Features</a></li>
              <li><a href="#security" className="hover:text-black">Security</a></li>
              <li><a href="#docs" className="hover:text-black">Docs</a></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 font-semibold">Get started</div>
            <div className="flex gap-3">
              <Button className="bg-primary text-white hover:brightness-110" onClick={() => navigate("/dashboard?autocreate=1")}>Create</Button>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white" onClick={() => navigate("/access")}>Access</Button>
            </div>
          </div>
        </div>
        <div className="mt-10 text-center text-xs text-gray-500">© {new Date().getFullYear()} CipherWallet</div>
      </footer>
    </div>
  );
}
