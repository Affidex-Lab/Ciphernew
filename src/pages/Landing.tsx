import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Wallet, Globe, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">(
    localStorage.getItem("theme") === "dark" ? "dark" : "light"
  );
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-[#0b0f17] dark:to-[#121826] text-gray-900 dark:text-gray-100 transition-colors duration-500">
      {/* === Header === */}
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? "backdrop-blur-md bg-white/60 dark:bg-[#0b0f17]/60 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 rounded-lg bg-primary"></div>
            <span className="font-serif font-bold text-xl text-gray-900 dark:text-gray-100">
              CipherWallet
            </span>
          </div>

          <nav
            id="navbar"
            className="hidden md:flex items-center gap-8 text-sm font-medium"
          >
            {["Features", "Developers", "Docs", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
              >
                {link}
              </a>
            ))}
          </nav>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <motion.div
              whileTap={{ rotate: 180 }}
              transition={{ duration: 0.4 }}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </motion.div>
          </Button>
        </div>
      </header>

      <div className="h-20" />

      {/* === Hero Section === */}
      <section className="relative flex flex-col items-center justify-center text-center py-36 px-6 overflow-hidden">
        <motion.div
          className="absolute inset-0 -z-10 blur-3xl opacity-60 dark:opacity-40"
          animate={{
            background: [
              "radial-gradient(circle at 20% 30%, #00FFA3 0%, transparent 70%)",
              "radial-gradient(circle at 80% 20%, #4FC3F7 0%, transparent 70%)",
              "radial-gradient(circle at 50% 80%, #00E5FF 0%, transparent 70%)",
              "radial-gradient(circle at 20% 30%, #00FFA3 0%, transparent 70%)",
            ],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl md:text-6xl font-serif font-bold max-w-3xl text-gray-900 dark:text-gray-100"
        >
          The Future of Secure Digital Assets
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-gray-700 dark:text-gray-400 mt-6 max-w-2xl text-lg"
        >
          CipherWallet is your decentralized key to managing digital identity,
          assets, and transactions securely across the blockchain.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 flex flex-wrap gap-4 justify-center"
        >
          <Button
            className="px-8 py-3 text-lg shadow-md bg-primary text-white hover:bg-primary/90"
            onClick={() => navigate("/dashboard?autocreate=1")}
          >
            Create Wallet
          </Button>
          <Button
            variant="outline"
            className="px-8 py-3 text-lg border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => navigate("/access")}
          >
            Access Wallet
          </Button>
        </motion.div>
      </section>

      {/* === Features Section === */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-[#0f1522] transition-colors duration-500">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-serif mb-12 text-gray-900 dark:text-gray-100">
            Why Choose CipherWallet?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="w-10 h-10 text-primary" />,
                title: "Secure Encryption",
                desc: "Your private keys and transactions are end-to-end encrypted, ensuring maximum safety.",
              },
              {
                icon: <Wallet className="w-10 h-10 text-primary" />,
                title: "Seedless Wallets",
                desc: "No more phrases. Create automatic disposable wallets with secure recovery methods.",
              },
              {
                icon: <Globe className="w-10 h-10 text-primary" />,
                title: "Cross-Chain Ready",
                desc: "Supports multiple blockchains for a truly decentralized experience.",
              },
            ].map((f, i) => (
              <Card
                key={i}
                className="bg-white dark:bg-[#121826] hover:shadow-xl transition-shadow rounded-2xl border border-gray-200 dark:border-gray-700"
              >
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                  {f.icon}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {f.title}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-400 text-sm">
                    {f.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="bg-gray-200 dark:bg-black text-gray-700 dark:text-gray-300 py-16 px-6 mt-auto transition-colors duration-500">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-12">
          <div className="space-x-3">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
              About CipherWallet
            </h4>
            <li className="text-sm leading-relaxed hover:text-primary transition-colors">
              <a href="#navbar">Docs</a>
            </li>
            <li className="text-sm leading-relaxed hover:text-primary transition-colors">
              <a href="#navbar">Contact</a>
            </li>
            <li className="text-sm leading-relaxed hover:text-primary transition-colors">
              <a href="#navbar">Blog</a>
            </li>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
              Tech Stack
            </h4>
            <ul className="space-y-2 text-sm">
              <li>React + TailwindCSS</li>
              <li>Framer Motion</li>
              <li>Node.js / Express</li>
              <li>NEAR Blockchain</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
              Social
            </h4>
            <ul className="space-y-2 text-sm">
              {["Twitter", "GitHub", "Discord", "LinkedIn"].map((s) => (
                <li key={s}>
                  <a href="" className="hover:text-primary transition-colors">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 text-center text-xs text-gray-500 dark:text-gray-500">
          © {new Date().getFullYear()} CipherWallet. All wrongs reserved.
        </div>
      </footer>
    </div>
  );
}
