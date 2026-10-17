import { useRouter } from "next/router";
import Header from "./Header";
import Footer from "./Footer";
import { CookieConsentBanner } from "../ui/CookieConsent";
import { useTheme } from "@/context/ThemeContext";
import { Laptop, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type ShellKind = "public" | "focused" | "console";

function shellForPath(pathname: string): ShellKind {
  if (pathname.startsWith("/console")) return "console";
  if (
    /^\/(signin|login|signup|register|forgot-password|reset-password|verify|verify-email|mfa|mfa-setup|onboarding)(\/|$)/.test(
      pathname,
    )
  )
    return "focused";
  return "public";
}

/** Compact 3-way theme toggle — used on auth pages that don't show the full UtilityBar. */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      aria-label="Colour theme"
      className="flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-card)] p-0.5 shadow-sm"
    >
      {(
        [
          ["light", Sun],
          ["dark", Moon],
          ["system", Laptop],
        ] as const
      ).map(([value, Icon]) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-label={`${value.charAt(0).toUpperCase()}${value.slice(1)} theme`}
          aria-pressed={theme === value}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-meta)] transition-colors hover:text-[var(--text-heading)]",
            theme === value &&
              "bg-[var(--surface-inverse)] text-[var(--text-on-inverse)] hover:text-[var(--text-on-inverse)]",
          )}
        >
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useRouter();
  const shell = shellForPath(pathname);

  if (shell === "focused") {
    return (
      <div className="relative min-h-screen bg-[var(--surface-page)] text-[var(--text-body)]">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        {children}
      </div>
    );
  }

  if (shell === "console") {
    return (
      <div className="min-h-screen bg-[var(--surface-console)]">{children}</div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-page)] text-[var(--text-body)]">
      <a href="#main-content" className="tb-skip-link">
        Skip to main content
      </a>
      <Header />
      <div id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </div>
      <Footer />
      <CookieConsentBanner />
    </div>
  );
}
