"use client";
import { cn } from "@/lib/utils";
import { Laptop, Moon, Sun } from "lucide-react";
import { SocialLinks } from "../ui/SocialLinks";
import { useTheme } from "@/context/ThemeContext";
import Link from "next/link";

export default function UtilityBar() {
  const { theme, setTheme } = useTheme();
  const d = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="utility-bar h-utility bg-[var(--surface-inverse-deep)] flex items-center justify-between px-4 md:px-6 text-[12px] font-ui text-[var(--text-meta-on-inverse)]">
      <div className="utility-editions flex items-center gap-4">
        <span className="h-6 px-2 rounded font-semibold whitespace-nowrap inline-flex items-center bg-[color:color-mix(in_srgb,var(--text-on-inverse)_15%,transparent)] text-[var(--text-on-inverse)]">
          Nigeria
        </span>
        <span suppressHydrationWarning className="hidden lg:inline">
          {d}
        </span>
      </div>
      <div className="utility-actions flex items-center gap-[14px]">
        <div
          aria-label="Colour theme"
          className="hidden items-center rounded-full border border-[var(--border-inverse)] p-0.5 lg:flex"
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
                "flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-meta-on-inverse)]",
                theme === value &&
                  "bg-[color:color-mix(in_srgb,var(--text-on-inverse)_10%,transparent)] text-[var(--text-on-inverse)]",
              )}
            >
              <Icon aria-hidden="true" className="h-3 w-3" />
            </button>
          ))}
        </div>
        <div className="hidden items-center gap-3 text-[var(--text-meta-on-inverse)] xl:flex">
          <SocialLinks compact />
        </div>
        <Link
          href="/nominate"
          className="utility-nominate flex items-center gap-[6px] text-[var(--text-on-inverse)] hover:text-[var(--text-on-inverse)] transition-colors font-semibold whitespace-nowrap"
        >
          <span className="w-[6px] h-[6px] bg-[var(--accent)] rounded-sm"></span>
          Nominate a Builder
        </Link>
      </div>
    </div>
  );
}
