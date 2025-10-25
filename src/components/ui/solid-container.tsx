import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function SolidContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () =>
      setIsDark(document.documentElement.classList.contains("dark"));

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "z-100 border border-gray-200 dark:border-gray-700 shadow-xl rounded-md p-2",
        className
      )}
      style={{
        backgroundColor: isDark
          ? "rgba(17, 24, 39, 1)"
          : "rgba(255, 255, 255, 1)",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
      }}
      {...props}
    >
      {children}
    </div>
  );
}
