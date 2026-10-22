"use client";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { Laptop, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export function ThemeToggle({ className, size = "sm" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const isSmall = size === "sm";

  return (
    <div
      role="group"
      aria-label="Theme preference"
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-card)] p-0.5 shadow-sm transition-colors",
        className,
      )}
    >
      {(
        [
          ["light", Sun, "Light"],
          ["dark", Moon, "Dark"],
          ["system", Laptop, "System"],
        ] as const
      ).map(([value, IconComponent, label]) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value as ThemePreference)}
            aria-label={`${label} theme`}
            aria-pressed={active}
            title={`${label} theme`}
            className={cn(
              "flex items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
              isSmall ? "h-6 w-6 text-xs" : "h-7 w-7 text-sm",
              active
                ? "bg-[var(--surface-inverse)] text-[var(--text-on-inverse)] shadow-xs"
                : "text-[var(--text-meta)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-tint)]",
            )}
          >
            <IconComponent
              aria-hidden="true"
              className={isSmall ? "h-3.5 w-3.5" : "h-4 w-4"}
            />
          </button>
        );
      })}
    </div>
  );
}
