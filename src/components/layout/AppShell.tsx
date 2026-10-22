import { useRouter } from "next/router";
import Header from "./Header";
import Footer from "./Footer";
import { CookieConsentBanner } from "../ui/CookieConsent";
import { ThemeToggle } from "../ui/ThemeToggle";

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
      <div className="min-h-screen bg-[var(--surface-console)] text-[var(--text-body)]">
        {children}
      </div>
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
