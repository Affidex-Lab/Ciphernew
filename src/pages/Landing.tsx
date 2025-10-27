import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Wallet, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <motion.header
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`sticky top-0 z-40 w-full border-b border-gray-200 bg-white ${scrolled ? "shadow-sm" : "shadow-none"}`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex cursor-pointer items-center gap-2" onClick={() => navigate("/") }>
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-xl font-bold">CipherWallet</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            {[
              { label: "Features", href: "#features" },
              { label: "Security", href: "#security" },
              { label: "Docs", href: "#docs" },
            ].map((l) => (
              <a key={l.label} href={l.href} className="group relative text-sm text-gray-700 hover:text-black">
                {l.label}
                <span className="absolute inset-x-0 -bottom-1 h-0.5 origin-left scale-x-0 bg-[#8876DD] transition-transform duration-200 group-hover:scale-x-100" />
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="hidden md:inline-flex">
              <Button className="bg-primary text-white hover:brightness-110" onClick={() => navigate("/dashboard?autocreate=1")}>Create Wallet</Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white" onClick={() => navigate("/access")}>Access Wallet</Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <section className="flex flex-col items-center py-20 text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: [0, -3, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="mb-4 inline-flex items-center rounded-full bg-[#8876DD] px-3 py-1 text-xs font-medium text-white"
          >
            New • Seedless smart wallets
          </motion.span>

          <motion.h1 variants={fadeUp} initial="hidden" animate="show" className="max-w-3xl text-4xl font-serif font-bold md:text-6xl">
            A simple, secure wallet for everyone
          </motion.h1>
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 120, opacity: 1 }} transition={{ delay: 0.25, duration: 0.5 }} className="mt-3 h-1 rounded-full bg-gradient-to-r from-[#8876DD] to-[#00EC97]" />

          <motion.p variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="mt-5 max-w-2xl text-lg text-gray-700">
            Create seedless smart wallets in seconds. Own your assets with professional-grade security and effortless recovery.
          </motion.p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="px-8 py-3 text-lg bg-primary text-white hover:brightness-110" onClick={() => navigate("/dashboard?autocreate=1")}>Get Started</Button>
            </motion.div>
            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" className="px-8 py-3 text-lg border-primary text-primary hover:bg-primary hover:text-white" onClick={() => navigate("/access")}>Access Wallet</Button>
            </motion.div>
          </motion.div>
        </section>

        <motion.section id="features" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="py-14">
          <motion.h2 variants={item} className="mb-10 text-center font-serif text-3xl font-bold md:text-4xl">Why choose CipherWallet?</motion.h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { icon: <Shield className="h-10 w-10 text-primary" />, title: "Professional security", desc: "Best-practice encryption and smart account design keep your assets protected." },
              { icon: <Wallet className="h-10 w-10 text-primary" />, title: "Seedless by default", desc: "No recovery phrases. Create wallets instantly with simple, reliable recovery options." },
              { icon: <Globe className="h-10 w-10 text-primary" />, title: "Built for multiple chains", desc: "Ready for the networks you use today and tomorrow." },
            ].map((f, i) => (
              <motion.div key={i} variants={item} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
                <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col items-start gap-3 p-6">
                    {f.icon}
                    <h3 className="text-lg font-semibold">{f.title}</h3>
                    <p className="text-sm text-gray-700">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section id="security" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="py-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <motion.div variants={item}>
              <h3 className="mb-3 font-serif text-3xl font-bold">Security you can trust</h3>
              <p className="text-gray-700">From day one, CipherWallet is designed for clarity and control. Transparent permissions, straightforward recovery, and modern account abstraction give you a professional foundation for self-custody.</p>
            </motion.div>
            <motion.div variants={item} className="rounded-2xl border border-gray-200 bg-white p-8 text-left shadow-sm">
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Highlights</div>
              <ul className="space-y-2 text-sm text-gray-800">
                <li>Seedless onboarding</li>
                <li>Granular permissions</li>
                <li>Recovery kits and passkeys</li>
                <li>Smart account architecture</li>
              </ul>
            </motion.div>
          </div>
        </motion.section>
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
              <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button className="bg-primary text-white hover:brightness-110" onClick={() => navigate("/dashboard?autocreate=1")}>Create</Button>
              </motion.div>
              <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white" onClick={() => navigate("/access")}>Access</Button>
              </motion.div>
            </div>
          </div>
        </div>
        <div className="mt-10 text-center text-xs text-gray-500">© {new Date().getFullYear()} CipherWallet</div>
      </footer>
    </div>
  );
}
