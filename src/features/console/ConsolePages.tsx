"use client";
import {
  useConsoleData,
  text,
  type ConsoleRecord,
} from "@/context/ConsoleDataContext";
import { useApiResource } from "@/hooks/useApiResource";
import { ConsolePagination } from "@/components/ui/ConsolePagination";
import { ConnectedEditor } from "./ConnectedEditor";
import { http, errorMessage, type ApiEnvelope } from "@/lib/http";
import { useSession } from "@/context/SessionContext";
import { allowedConsoleNavigation } from "@/lib/console-navigation";
import { Icon } from "@/components/ui/Icon";
import { ConsoleSearch } from "./ConsoleSearch";
import { MediaPicker } from "@/components/ui/MediaPicker";

import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  FileText,
  GripVertical,
  History,
  Menu,
  Plus,
  Search,
  Send,
  X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type State = string | string[] | undefined;
const cx = (...v: (string | false | undefined)[]) =>
  v.filter(Boolean).join(" ");

export function ConsoleFrame({ children }: { children: React.ReactNode }) {
  const r = useRouter(),
    [open, setOpen] = useState(false);
  const { user } = useSession();
  return (
    <div className="min-h-screen bg-[var(--surface-console)] font-ui text-[var(--text-body)] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-navy-950/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-navy-950 text-slate-300 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <Link
            href="/console"
            className="font-display text-lg font-bold text-white"
          >
            The Builder<span className="text-brand-red">.</span>{" "}
            <small className="font-ui text-[11px] text-slate-300">
              Console
            </small>
          </Link>
          <button
            className="grid size-10 place-items-center lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>
        <nav
          aria-label="Console"
          className="flex-1 space-y-1 overflow-y-auto p-2"
        >
          {allowedConsoleNavigation(user?.permissions).map(
            ({ label, href, icon }) => {
              const on =
                r.pathname === href ||
                (href != "/console" && r.pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-300",
                    on &&
                      "bg-white/10 text-white shadow-[inset_2px_0_0_#D8121B]",
                  )}
                >
                  <Icon name={icon} size={18} aria-hidden="true" />
                  {label}
                </Link>
              );
            },
          )}
        </nav>
        <p className="border-t border-white/10 px-4 py-3 text-xs">
          Times shown in Africa/Lagos (WAT)
        </p>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-body)] px-4 md:px-6 transition-colors">
          <button
            className="grid size-10 place-items-center rounded-lg text-[var(--text-heading)] hover:bg-[var(--surface-hover)] lg:hidden transition-colors"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <ConsoleSearch className="hidden h-10 max-w-[420px] flex-1 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] px-3 text-left text-sm text-[var(--text-meta)] sm:flex" />
          <Link
            href="/console/editor"
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-navy-900 dark:bg-[var(--surface-inverse)] text-white hover:bg-navy-700 dark:hover:bg-[var(--surface-inverse)]/80 px-3 text-sm font-semibold transition-colors"
          >
            <Plus size={16} />{" "}
            <span className="hidden sm:inline">New story</span>
          </Link>
          <div className="flex items-center">
            <ThemeToggle size="sm" />
          </div>
          <Link
            href="/console/audit"
            aria-label="Activity log"
            className="relative grid size-10 place-items-center rounded-lg text-[var(--text-heading)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <Bell size={19} />
          </Link>
          <Link
            href="/account"
            aria-label="Account settings"
            className="grid size-9 place-items-center rounded-full bg-[var(--surface-inverse)] text-xs font-bold text-[var(--text-on-inverse)]"
          >
            {user?.name
              .split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")}
          </Link>
        </header>
        <main id="console-main" className="p-4 md:p-6">
          {children}
          <ConsolePagination />
        </main>
      </div>
    </div>
  );
}
function Heading({
  title,
  copy,
  action,
}: {
  title: string;
  copy?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[26px] font-bold text-[var(--text-heading)]">
          {title}
        </h1>
        {copy && <p className="mt-1 text-sm text-[var(--text-meta)]">{copy}</p>}
      </div>
      {action}
    </header>
  );
}
const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cx("rounded-xl border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-body)] transition-colors", className)}>
    {children}
  </section>
);
const Pill = ({
  children,
  tone = "navy",
}: {
  children: React.ReactNode;
  tone?: "navy" | "red" | "green" | "amber";
}) => (
  <span
    className={cx(
      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize",
      tone === "navy" && "bg-[var(--surface-tint)] text-[var(--text-heading)]",
      tone === "red" && "bg-[var(--surface-accent-soft)] text-[var(--text-error)]",
      tone === "green" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      tone === "amber" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    )}
  >
    {children}
  </span>
);
const Btn = ({
  children,
  onClick,
  kind = "navy",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "navy" | "red" | "ghost";
  disabled?: boolean;
}) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={cx(
      "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 transition-colors",
      kind === "navy" && "bg-navy-900 dark:bg-[var(--surface-inverse)] text-white hover:bg-navy-700 dark:hover:bg-[var(--surface-inverse)]/80",
      kind === "red" && "bg-brand-red text-white hover:bg-red-700",
      kind === "ghost" && "border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-heading)] hover:bg-[var(--surface-hover)]",
    )}
  >
    {children}
  </button>
);

const fixtureKpis = [
  ["Registered users", "18,420", "+312 this week"],
  ["New this week", "312", "+9% vs last week"],
  ["Published content", "1,284", "14 this week"],
  ["Awaiting approval", "6", "Oldest: 3 days"],
  ["Nominations received", "47", "7 unread"],
  ["Newsletter subscribers", "9,876", "+142 this week"],
];
export function Dashboard({ state }: { state?: State }) {
  const live = useConsoleData();
  const { user } = useSession();
  const kpis = live
    ? [
        ["Registered users", String(live.document.users), ""],
        ["New in 30 days", String(live.document.newUsers), ""],
        ["Published content", String(live.document.published), ""],
        ["Awaiting approval", String(live.document.review), ""],
        ["Nominations received", String(live.document.nominations), ""],
        ["Newsletter subscribers", String(live.document.subscribers), ""],
      ]
    : fixtureKpis;
  const loading = state === "dashboard-loading" || state === "loading";
  if (live)
    return (
      <ConsoleFrame>
        <Heading title={"Welcome, " + user?.name} copy="Workspace overview" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map(([label, value]) => (
            <Card key={label} className="p-4">
              <p className="text-xs text-[var(--text-meta)]">{label}</p>
              <p className="mt-2 font-display text-[28px] font-extrabold text-[var(--text-heading)]">
                {value}
              </p>
            </Card>
          ))}
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
          <Card>
            <PanelHead title="Recent activity" />
            <div className="p-4">
              {(Array.isArray(live.document.activity)
                ? live.document.activity
                : []
              ).map((x: Record<string, unknown>) => (
                <p
                  className="border-t border-[var(--border)] py-3 text-sm text-[var(--text-body)]"
                  key={String(x.id)}
                >
                  {String(x.event)}{" "}
                  <span className="ml-3 text-xs text-[var(--text-meta)]">
                    {String(x.created_at)}
                  </span>
                </p>
              ))}
            </div>
          </Card>
          <Card>
            <PanelHead title="Publishing queue" />
            <p className="p-4 text-sm text-[var(--text-meta)]">
              {String(live.document.review)} stories await review.
            </p>
            <Link
              href="/console/content"
              className="inline-flex min-h-11 px-4 font-semibold text-[var(--text-heading)] hover:text-[var(--text-accent)]"
            >
              Open content queue →
            </Link>
          </Card>
        </div>
      </ConsoleFrame>
    );
  return (
    <ConsoleFrame>
      <Heading
        title={"Welcome, " + (user?.name || "Editor")}
        copy="Workspace overview"
        action={<span className="text-xs text-[var(--text-meta)]">Live workspace data</span>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([a, b, c], i) => (
          <Card key={a} className={cx("p-4", i === 3 && "border-[var(--accent)]")}>
            {loading ? (
              <>
                <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-skeleton)]" />
                <div className="mt-4 h-8 w-1/2 animate-pulse rounded bg-[var(--surface-skeleton)]" />
              </>
            ) : (
              <>
                <p className="text-xs text-[var(--text-meta)]">{a}</p>
                <p className="mt-2 font-display text-[28px] font-extrabold text-[var(--text-heading)]">
                  {b}
                </p>
                <p className="mt-1 text-xs text-[var(--text-meta)]">{c}</p>
              </>
            )}
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          <Card>
            <PanelHead title="Needs your attention" link="Open queue →" />
            <Rows />
          </Card>
          <Card>
            <PanelHead title="Page views · last 30 days" />
            <div className="p-5">
              <svg
                viewBox="0 0 600 180"
                className="h-[190px] w-full"
                role="img"
                aria-label="Page views trend rising over the last 30 days"
              >
                <path
                  d="M0 160 L70 135 L130 145 L190 112 L250 125 L310 92 L370 104 L430 55 L490 76 L550 40 L600 48 L600 180 L0 180Z"
                  fill="currentColor"
                  className="text-[var(--surface-tint)]"
                />
                <path
                  d="M0 160 L70 135 L130 145 L190 112 L250 125 L310 92 L370 104 L430 55 L490 76 L550 40 L600 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-[var(--text-royal)]"
                />
              </svg>
            </div>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <PanelHead title="Scheduled · next 7 days" />
            <div className="space-y-3 p-4">
              {[
                "Wed 7 · Q3 2026: where African venture money went",
                "Thu 8 · Selba-Gondoza Luka on care at scale",
                "Fri 9 · The Builder Newsletter",
                "Mon 12 · Builder of the Month",
              ].map((x) => (
                <p className="rounded-lg bg-[var(--surface-tint)] text-[var(--text-body)] p-3 text-sm" key={x}>
                  {x}
                </p>
              ))}
            </div>
          </Card>
          <Card>
            <PanelHead title="Recent nominations" />
            {[
              "Ngozi Eze",
              "Kofi Boateng",
              "Abeba Tesfaye",
              "Lagos Food Bank",
            ].map((x, i) => (
              <div
                key={x}
                className="flex justify-between border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--text-body)]"
              >
                <b>{x}</b>
                <span className="text-[var(--text-meta)]">{i ? `${i * 4} h` : "1 h"}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </ConsoleFrame>
  );
}
function PanelHead({ title, link }: { title: string; link?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
      <h2 className="min-w-0 font-semibold text-[var(--text-heading)]">{title}</h2>
      {link && (
        <Link
          className="text-sm font-semibold underline decoration-brand-red decoration-2 underline-offset-4 text-[var(--text-heading)]"
          href="/console/content"
        >
          {link}
        </Link>
      )}
    </div>
  );
}
const fixtureStories: [string, string, string, string][] = [
  [
    "Inside the quiet rise of Lagos’ merchant-credit startups",
    "Tunde Bakare",
    "Business",
    "review",
  ],
  [
    "Pesa Bridge wants to make sending money home boring",
    "Liam Okoro",
    "Fintech",
    "changes",
  ],
  [
    "Why Kora Health bet on insurers before patients",
    "Tunde Bakare",
    "Interviews",
    "draft",
  ],
  [
    "The economics of a market-cluster mini-grid",
    "Kwesi Mensah",
    "Analysis",
    "scheduled",
  ],
];
function Rows({ records }: { records?: ConsoleRecord[] }) {
  const live = useConsoleData();
  const source = records || live?.records;
  const stories = source
    ? source.map((x) => [
        text(x, "title"),
        text(x, "author"),
        text(x, "category"),
        text(x, "status"),
      ])
    : fixtureStories;
  return (
    <div className="min-w-0">
      {stories.map((s, i) => (
        <Link
          href={
            source?.[i]?.id
              ? "/console/editor?id=" + source[i]!.id
              : "/console/editor"
          }
          key={s[0]}
          className="grid min-w-0 gap-2 border-t border-[var(--border)] px-4 py-3 first:border-0 sm:grid-cols-[minmax(0,1fr)_auto_70px] sm:items-center hover:bg-[var(--surface-hover)] transition-colors"
        >
          <span className="min-w-0">
            <b className="block truncate text-sm text-[var(--text-heading)]">{s[0]}</b>
            <small className="text-[var(--text-meta)]">
              {s[1]} · {s[2]}
            </small>
          </span>
          <Pill tone={s[3] === "changes" ? "red" : "amber"}>{s[3]}</Pill>
          <span className="text-right text-xs text-[var(--text-meta)]">
            {source?.[i]?.updatedAt
              ? new Date(String(source[i]!.updatedAt)).toLocaleDateString(
                  "en-GB",
                )
              : null}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ContentPage({ state }: { state?: State }) {
  const router = useRouter();
  const [q, setQ] = useState(String(router.query.q || "")),
    [status, setStatus] = useState(""),
    [edition, setEdition] = useState("");
  const live = useConsoleData();
  const selectedStatus = live ? String(router.query.status || "") : status;
  const selectedEdition = live ? String(router.query.edition || "") : edition;
  const hasFilters = Boolean(
    router.query.q || selectedStatus || selectedEdition,
  );
  const applyFilters = (
    nextStatus = selectedStatus,
    nextEdition = selectedEdition,
  ) => {
    if (!live) {
      setStatus(nextStatus);
      setEdition(nextEdition);
      return;
    }
    void router.push(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          q: q.trim() || undefined,
          status: nextStatus || undefined,
          edition: nextEdition || undefined,
          page: 1,
        },
      },
      undefined,
      { shallow: true },
    );
  };
  const empty = live
    ? live.records.length === 0 && !hasFilters
    : state === "content-empty" || state === "empty";
  const shown = live?.records.length ?? fixtureStories.length;
  return (
    <ConsoleFrame>
      <Heading
        title="Content"
        action={
          <Link
            href="/console/editor"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-red px-4 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            <Plus size={16} />
            New story
          </Link>
        }
      />
      {empty ? (
        <Card className="grid min-h-[420px] place-items-center p-6 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--surface-tint)] text-[var(--text-meta)]">
              <FileText />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold text-[var(--text-heading)]">
              No content yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-meta)]">
              Start with a story, or import Builder profiles from your
              nominations. Everything you create starts as a draft.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link
                href="/console/editor"
                className="rounded-lg border border-[var(--border)] p-3 text-[var(--text-heading)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Write a story
              </Link>
              <Link
                href="/console/nominations"
                className="rounded-lg border border-[var(--border)] p-3 text-[var(--text-heading)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Open nominations
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto border-b border-[var(--border)]">
            {[
              ["All content", ""],
              ["Drafts", "draft"],
              ["In review", "review"],
              ["Scheduled", "scheduled"],
              ["Published", "published"],
            ].map(([x, v]) => (
              <button
                onClick={() => applyFilters(v!)}
                aria-pressed={selectedStatus === v}
                className={cx(
                  "whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors",
                  selectedStatus === v
                    ? "border-brand-red font-semibold text-[var(--text-heading)]"
                    : "border-transparent text-[var(--text-meta)] hover:text-[var(--text-heading)]",
                )}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
          <form
            className="mb-4 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters();
            }}
          >
            <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm">
              <Search size={16} className="text-[var(--text-meta)]" />
              <span className="sr-only">Search content</span>
              <input
                className="w-full bg-transparent text-[var(--text-body)] placeholder:text-[var(--text-meta)] outline-none"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                maxLength={200}
                placeholder="Search titles or authors"
              />
            </label>
            <select
              aria-label="Status"
              value={selectedStatus}
              onChange={(e) => applyFilters(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-body)] px-3 text-sm outline-none"
            >
              <option value="" className="bg-[var(--surface-card)] text-[var(--text-body)]">All statuses</option>
              {[
                "draft",
                "review",
                "changes",
                "approved",
                "scheduled",
                "published",
                "rejected",
                "archived",
              ].map((s) => (
                <option key={s} className="bg-[var(--surface-card)] text-[var(--text-body)]">{s}</option>
              ))}
            </select>
            <select
              aria-label="Edition"
              value={selectedEdition}
              onChange={(e) => applyFilters(selectedStatus, e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-body)] px-3 text-sm outline-none"
            >
              <option value="" className="bg-[var(--surface-card)] text-[var(--text-body)]">All editions</option>
              <option className="bg-[var(--surface-card)] text-[var(--text-body)]">Nigeria</option>
              <option className="bg-[var(--surface-card)] text-[var(--text-body)]">both</option>
            </select>
            <button
              type="submit"
              className="min-h-10 rounded-lg bg-navy-900 dark:bg-[var(--surface-inverse)] text-white hover:bg-navy-700 dark:hover:bg-[var(--surface-inverse)]/80 px-4 text-sm font-semibold transition-colors"
            >
              Search
            </button>
            {hasFilters && (
              <Link
                href="/console/content"
                className="inline-flex min-h-10 items-center px-3 text-sm underline text-[var(--text-heading)]"
              >
                Clear filters
              </Link>
            )}
          </form>
          <Card className="overflow-hidden">
            {live && live.records.length === 0 ? (
              <p className="p-6 text-sm text-[var(--text-meta)]" role="status">
                No content matches these filters.
              </p>
            ) : (
              <Rows records={live?.records} />
            )}
          </Card>
          <p className="mt-3 text-xs text-[var(--text-meta)]">
            Showing {shown} {shown === 1 ? "item" : "items"}
            {live?.meta
              ? ` of ${live.meta.total} matching ${live.meta.total === 1 ? "story" : "stories"}`
              : ""}
          </p>
        </>
      )}
    </ConsoleFrame>
  );
}

export function EditorPage() {
  return <ConnectedEditor />;
}
function Drawer({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={close}
      className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-sm"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="absolute inset-y-0 right-0 w-full max-w-[880px] overflow-y-auto bg-[var(--surface-card)] text-[var(--text-body)] border-l border-[var(--border)] p-5 shadow-overlay"
      >
        <div className="mb-8 flex items-center">
          <h2 className="font-display text-xl font-bold text-[var(--text-heading)]">{title}</h2>
          <button
            onClick={close}
            className="ml-auto grid size-11 place-items-center rounded-lg text-[var(--text-heading)] hover:bg-[var(--surface-hover)] transition-colors"
            aria-label="Close"
          >
            <X />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl bg-[var(--surface-card)] text-[var(--text-body)] border border-[var(--border)] p-6 shadow-overlay"
      >
        <div className="flex">
          <h2 className="font-display text-xl font-bold text-[var(--text-heading)]">{title}</h2>
          <button onClick={close} className="ml-auto rounded-lg p-1 text-[var(--text-heading)] hover:bg-[var(--surface-hover)] transition-colors" aria-label="Close">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const sectionSeed = [
  ["Lead story hero", "Cover story + 2 secondaries", true],
  ["Latest stories", "8 items · automatic", true],
  ["Trending", "Top 5 · automatic", true],
  ["Startup spotlight", "6 startups", true],
  ["Builders Beyond Borders", "8 Builders · by region", true],
  ["Videos", "4 videos", true],
  ["Opportunities", "5 items · closing soonest", true],
  ["Nominate CTA band", "Static block", true],
  ["Most read", "10 items · automatic", false],
  ["Newsletter band", "Static block", true],
] as [string, string, boolean][];
export function HomepagePage() {
  const articles = useApiResource("homepage-story-options", (signal) =>
    http<ApiEnvelope<ConsoleRecord[]>>("/console/content", {
      signal,
      query: { status: "published", per_page: 50 },
    }),
  );
  const [pins, setPins] = useState<Record<string, string[]>>(
    Object.fromEntries(
      (useConsoleData()?.records || []).map((section) => [
        String(section.key),
        Array.isArray(section.pinnedIds) ? (section.pinnedIds as string[]) : [],
      ]),
    ),
  );
  const { toast } = useToast();
  const live = useConsoleData();
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<[string, string, boolean][]>(
    live
      ? live.records.map((x) => [text(x, "key"), "", Boolean(x.visible)])
      : sectionSeed,
  );
  const [dirty, setDirty] = useState(false);
  const move = (i: number, d: number) => {
    const a = [...items],
      x = a.splice(i, 1)[0];
    if (!x) return;
    a.splice(i + d, 0, x);
    setItems(a);
    setDirty(true);
  };
  return (
    <ConsoleFrame>
      <Heading
        title="Homepage"
        copy={
          dirty
            ? "Unsaved changes · visitors still see the published layout"
            : "Homepage section configuration"
        }
        action={
          <Btn
            disabled={!dirty || busy}
            kind="red"
            onClick={async () => {
              setBusy(true);
              try {
                await http("/console/homepage", {
                  method: "PUT",
                  body: {
                    sections: items.map(([key, , visible]) => ({
                      key,
                      visible,
                      pinnedIds: pins[key] || [],
                    })),
                  },
                });
                setDirty(false);
                toast("Homepage saved");
              } catch (e) {
                toast(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Publish changes
          </Btn>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_480px]">
        <div className="space-y-2">
          {items.map(([name, meta, vis], i) => (
            <Card
              className={cx(
                "grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 p-3 sm:flex sm:gap-3",
                !vis && "opacity-60",
              )}
              key={name}
            >
              <button
                aria-label={`Move ${name} up`}
                onClick={() => i && move(i, -1)}
                className="grid size-9 place-items-center"
              >
                <GripVertical size={18} />
              </button>
              <b className="w-6 text-sm text-slate">{i + 1}</b>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{name}</strong>
                <small className="text-slate">{meta}</small>
              </span>
              <label className="col-span-3 ml-[76px] flex items-center gap-2 text-xs text-slate sm:ml-0">
                <input
                  type="checkbox"
                  checked={vis}
                  onChange={() => {
                    setItems(
                      items.map((x, j) => (j === i ? [x[0], x[1], !x[2]] : x)),
                    );
                    setDirty(true);
                  }}
                />{" "}
                {vis ? "Visible" : "Hidden"}
              </label>
              {name === "lead" && (
                <label className="col-span-3 block text-xs text-slate">
                  Pinned published stories
                  <select
                    multiple
                    value={pins[name] || []}
                    className="mt-2 w-full rounded-lg border border-line p-2"
                    onChange={(event) => {
                      setPins({
                        ...pins,
                        [name]: Array.from(
                          event.target.selectedOptions,
                          (option) => option.value,
                        ),
                      });
                      setDirty(true);
                    }}
                  >
                    {articles.data?.data.map((article) => (
                      <option value={article.id} key={article.id}>
                        {article.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </Card>
          ))}
        </div>
        <Card className="overflow-hidden xl:sticky xl:top-24 xl:self-start">
          <PanelHead title="Live preview" />
          <div className="space-y-px bg-[var(--surface-console)] p-3 rounded-lg">
            {items
              .filter((x) => x[2])
              .map(([x], i) => (
                <div
                  key={x}
                  className={cx(
                    "grid place-items-center font-display text-sm font-bold uppercase tracking-wider rounded-md",
                    i % 3 === 0
                      ? "h-24 bg-navy-900 dark:bg-[var(--surface-inverse)] text-white"
                      : "h-16 bg-[var(--surface-card)] text-[var(--text-heading)] border border-[var(--border)]",
                  )}
                >
                  {x}
                </div>
              ))}
          </div>
        </Card>
      </div>
    </ConsoleFrame>
  );
}

export function ProfileEditor({
  kind,
}: {
  kind: "builder" | "startup";
  state?: State;
}) {
  const live = useConsoleData();
  const r = useRouter();
  const { toast } = useToast();
  const selected =
    live?.records.find((x) => x.id === r.query.id) ||
    (!r.query.id && r.query.new !== "1" ? live?.records[0] : undefined);
  const candidates = useApiResource(
    kind === "startup" ? "startup-founder-options" : null,
    (signal) =>
      http<ApiEnvelope<ConsoleRecord[]>>("/builders", {
        signal,
        query: { per_page: 50 },
      }),
  );
  const [founders, setFounders] = useState<string[]>(
    Array.isArray(selected?.founders)
      ? selected.founders.map((founder) =>
          String((founder as ConsoleRecord).id),
        )
      : [],
  );
  const [achievements, setAchievements] = useState(
    Array.isArray(selected?.achievements)
      ? selected.achievements.join("\n")
      : "",
  );
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    name: text(selected, "name"),
    country: text(selected, "country"),
    city: text(selected, "city"),
    industry: text(selected, "industry"),
    website: text(selected, "website"),
    biography: text(selected, "biography") || text(selected, "description"),
    region: text(selected, "region"),
    profession: text(selected, "profession"),
    organisation: text(selected, "organisation"),
    oneLiner: text(selected, "one_liner"),
    stage: text(selected, "stage") || "Idea",
    fundingStage: text(selected, "funding_stage"),
    foundedYear: text(selected, "founded_year"),
    teamSize: text(selected, "team_size"),
    mediaId: text(selected, "media_id"),
    feature: text(selected, "feature"),
    headline: text(selected, "headline"),
    classification: text(selected, "classification") || "Professional",
  });
  const [isDiaspora, setIsDiaspora] = useState(Boolean(selected?.is_diaspora));
  const [consentAt, setConsentAt] = useState(text(selected, "consent_at"));
  const [consentMethod, setConsentMethod] = useState(
    text(selected, "consent_method"),
  );
  const save = async (publish: boolean) => {
    setBusy(true);
    try {
      const payload =
        kind === "builder"
          ? {
              ...values,
              isDiaspora,
              feature: values.feature || null,
              mediaId: values.mediaId || null,
              achievements: achievements.split("\n").filter(Boolean),
              consentAt: consentAt || null,
              consentMethod: consentMethod || null,
              status: publish ? "published" : "draft",
            }
          : {
              name: values.name,
              country: values.country,
              city: values.city,
              industry: values.industry,
              website: values.website || null,
              founders,
              description: values.biography,
              oneLiner: values.oneLiner,
              stage: values.stage,
              fundingStage: values.fundingStage || null,
              foundedYear: values.foundedYear
                ? Number(values.foundedYear)
                : null,
              teamSize: values.teamSize ? Number(values.teamSize) : null,
              region: values.region,
              mediaId: values.mediaId || null,
              status: publish ? "published" : "draft",
            };
      const result = await http<ApiEnvelope<Record<string, unknown>>>(
        "/console/" +
          (kind === "builder" ? "builders" : "startups") +
          (selected?.id ? "/" + selected.id : ""),
        { method: selected?.id ? "PUT" : "POST", body: payload },
      );
      toast(publish ? "Profile published" : "Profile saved");
      void r.replace({
        pathname: r.pathname,
        query: { id: String(result.data.id) },
      });
      live?.retry();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConsoleFrame>
      <Heading
        title={values.name || "New " + kind + " profile"}
        action={
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Choose profile"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-body)] px-3 text-sm outline-none"
              value={selected?.id || ""}
              onChange={(e) =>
                r.replace({
                  pathname: r.pathname,
                  query: e.target.value ? { id: e.target.value } : { new: "1" },
                })
              }
            >
              <option value="" className="bg-[var(--surface-card)] text-[var(--text-body)]">New profile</option>
              {live?.records.map((x) => (
                <option key={x.id} value={x.id} className="bg-[var(--surface-card)] text-[var(--text-body)]">
                  {text(x, "name")}
                </option>
              ))}
            </select>
            <Btn disabled={busy} kind="ghost" onClick={() => save(false)}>
              Save draft
            </Btn>
            <Btn
              disabled={busy || !values.name}
              kind="red"
              onClick={() => save(true)}
            >
              Publish
            </Btn>
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="p-5 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            {[
              ["Display name", "name"],
              ["Country", "country"],
              ["City", "city"],
              ["Industry", "industry"],
              ["Website", "website"],
              ["Region", "region"],
              ...(kind === "builder"
                ? [
                    ["Classification", "classification"],
                    ["Headline", "headline"],
                    ["Profession", "profession"],
                    ["Organisation", "organisation"],
                    ["Featured status (featured, month or year)", "feature"],
                  ]
                : [
                    ["One-line summary", "oneLiner"],
                    ["Stage", "stage"],
                    ["Funding information", "fundingStage"],
                    ["Founded year", "foundedYear"],
                    ["Team size", "teamSize"],
                  ]),
            ].map(([label, key]) => (
              <label key={key} className="text-sm font-semibold text-[var(--text-heading)]">
                {label}
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-body)] px-3 font-normal outline-none"
                  value={values[key!] || ""}
                  onChange={(e) =>
                    setValues({ ...values, [key!]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <label className="mt-5 block text-sm font-semibold text-[var(--text-heading)]">
            Biography / company description
            <textarea
              value={values.biography}
              onChange={(e) =>
                setValues({ ...values, biography: e.target.value })
              }
              className="mt-2 min-h-64 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-body)] p-3 font-serif font-normal outline-none"
            />
          </label>
        </Card>
        <aside>
          <MediaPicker
            value={values.mediaId || null}
            onChange={(id) => setValues({ ...values, mediaId: id || "" })}
          />
          {kind === "startup" && (
            <Card className="p-4">
              <label className="block text-sm font-semibold text-[var(--text-heading)]">
                Founders
                <select
                  multiple
                  value={founders}
                  onChange={(event) =>
                    setFounders(
                      Array.from(
                        event.target.selectedOptions,
                        (option) => option.value,
                      ),
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-body)] p-3 outline-none"
                >
                  {candidates.data?.data.map((builder) => (
                    <option value={builder.id} key={builder.id} className="bg-[var(--surface-card)] text-[var(--text-body)]">
                      {builder.name}
                    </option>
                  ))}
                </select>
              </label>
            </Card>
          )}
          {kind === "builder" && (
            <Card className="mb-4 p-4">
              <label className="block text-sm font-semibold text-[var(--text-heading)]">
                Achievements
                <textarea
                  value={achievements}
                  onChange={(event) => setAchievements(event.target.value)}
                  className="mt-2 min-h-32 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-body)] p-3 outline-none"
                  placeholder="One achievement per line"
                />
              </label>
            </Card>
          )}
          {kind === "builder" && (
            <Card className="p-4">
              <h2 className="font-semibold text-[var(--text-heading)]">
                Consent required before publication
              </h2>
              <label className="mt-4 flex gap-3 text-sm text-[var(--text-body)]">
                <input
                  type="checkbox"
                  checked={isDiaspora}
                  onChange={(event) => setIsDiaspora(event.target.checked)}
                />
                Include in diaspora discovery
              </label>
              <label className="mt-4 block text-sm text-[var(--text-heading)]">
                Consent date
                <input
                  type="date"
                  value={consentAt.slice(0, 10)}
                  onChange={(e) => setConsentAt(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-body)] px-3 outline-none"
                />
              </label>
              <label className="mt-4 block text-sm text-[var(--text-heading)]">
                Consent method
                <input
                  value={consentMethod}
                  onChange={(e) => setConsentMethod(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-body)] px-3 outline-none"
                  placeholder="Written permission"
                />
              </label>
            </Card>
          )}
        </aside>
      </div>
    </ConsoleFrame>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="text-sm font-semibold text-[var(--text-heading)]">
      {label}
      <input
        defaultValue={value}
        className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-body)] px-3 font-normal outline-none"
      />
    </label>
  );
}

const cols = [
  "Received",
  "Under Review",
  "Shortlisted",
  "Contacted",
  "Interview Scheduled",
  "Content Development",
  "Published",
  "Declined",
];
const noms = [
  ["TB-NOM-2026-000131", "Ngozi Eze", "Builder", "HealthTech", "Received"],
  ["TB-NOM-2026-000130", "Kofi Boateng", "Builder", "Energy", "Received"],
  [
    "TB-NOM-2026-000129",
    "Abeba Tesfaye",
    "Builder",
    "Diaspora",
    "Under Review",
  ],
  ["TB-NOM-2026-000128", "Lagos Food Bank", "Startup", "Civic", "Under Review"],
  ["TB-NOM-2026-000121", "Shamba Cold", "Startup", "AgriTech", "Shortlisted"],
  ["TB-NOM-2026-000119", "Rahma Abubakar", "Builder", "EdTech", "Contacted"],
] as const;
export function NominationsPage() {
  const live = useConsoleData();
  const router = useRouter();
  const stories = useApiResource("nomination-published-options", (signal) =>
    http<ApiEnvelope<ConsoleRecord[]>>("/console/content", {
      signal,
      query: { status: "published", per_page: 50 },
    }),
  );
  const [articleId, setArticleId] = useState("");
  const { toast } = useToast();
  const [mode, setMode] = useState("Board"),
    [q, setQ] = useState(""),
    [open, setOpen] = useState<Record<string, unknown> | null>(null),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false);
  const stages = [
    "received",
    "review",
    "shortlisted",
    "contacted",
    "interview",
    "development",
    "published",
    "declined",
  ];
  const list = (live?.records || []).filter((n) =>
    (text(n, "name") + " " + text(n, "reference"))
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const move = async (status: string) => {
    if (!open) return;
    setBusy(true);
    try {
      const result = await http<ApiEnvelope<Record<string, unknown>>>(
        "/console/nominations/" + open.id,
        {
          method: "PATCH",
          body: {
            status,
            note: note || undefined,
            articleId: articleId || undefined,
          },
        },
      );
      setOpen(result.data);
      live?.retry();
      toast("Nomination moved to " + status);
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConsoleFrame>
      <Heading
        title="Nominations"
        copy={list.length + " records"}
        action={
          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-1">
            {["Board", "Table"].map((x) => (
              <button
                key={x}
                className={cx(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  mode === x
                    ? "bg-[var(--surface-inverse)] text-[var(--text-on-inverse)] font-medium"
                    : "text-[var(--text-meta)] hover:text-[var(--text-heading)]",
                )}
                onClick={() => setMode(x)}
              >
                {x}
              </button>
            ))}
          </div>
        }
      />
      <input
        aria-label="Search nominations"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search nominee or reference"
        className="mb-4 h-10 max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-body)] placeholder:text-[var(--text-meta)] px-3 text-sm outline-none"
      />
      {mode === "Board" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <section
              key={stage}
              className="w-[260px] flex-none rounded-xl bg-[var(--surface-tint)] p-2"
            >
              <h2 className="p-2 text-sm font-semibold text-[var(--text-heading)]">{stage}</h2>
              {list
                .filter((n) => n.status === stage)
                .map((n) => (
                  <button
                    key={n.id}
                    className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-body)] p-3 text-left shadow-xs hover:border-[var(--border-strong)] transition-colors"
                    onClick={() => {
                      setOpen(n);
                      setArticleId(text(n, "article_id"));
                      setNote("");
                    }}
                  >
                    <small className="text-[var(--text-meta)]">{text(n, "reference")}</small>
                    <b className="mt-1 block text-sm text-[var(--text-heading)]">{n.name}</b>
                    <span className="mt-2 text-xs text-[var(--text-meta)]">
                      {text(n, "type")} · {text(n, "industry")}
                    </span>
                  </button>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm text-[var(--text-body)]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-heading)]">
                  {["Reference", "Nominee", "Type", "Status"].map((x) => (
                    <th className="p-3 font-semibold" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((n) => (
                  <tr key={n.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="p-3">
                      <button onClick={() => setOpen(n)} className="text-[var(--text-royal)] hover:underline font-medium">
                        {text(n, "reference")}
                      </button>
                    </td>
                    <td className="p-3 text-[var(--text-heading)] font-medium">{n.name}</td>
                    <td className="p-3 text-[var(--text-meta)]">{text(n, "type")}</td>
                    <td className="p-3">
                      <Pill tone="navy">{n.status}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {open && (
        <Drawer title={String(open.name)} close={() => setOpen(null)}>
          <p className="text-sm text-[var(--text-meta)]">{String(open.reference)}</p>
          <div className="mt-5 flex gap-3">
            <button
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-heading)] hover:bg-[var(--surface-hover)] px-4 py-3 text-sm font-semibold transition-colors"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await http<ApiEnvelope<ConsoleRecord>>(
                    "/console/nominations/" + open.id + "/draft",
                    { method: "POST" },
                  );
                  void router.push("/console/editor?id=" + result.data.id);
                } catch (error) {
                  toast(errorMessage(error), "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {open.article_id ? "Open linked draft" : "Create editorial draft"}
            </button>
          </div>
          <label className="mt-5 block text-sm font-semibold text-[var(--text-heading)]">
            Linked published story
            <select
              value={articleId || String(open.article_id || "")}
              onChange={(event) => setArticleId(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-body)] px-3 outline-none"
            >
              <option value="" className="bg-[var(--surface-card)] text-[var(--text-body)]">Choose before marking published</option>
              {stories.data?.data.map((article) => (
                <option value={article.id} key={article.id} className="bg-[var(--surface-card)] text-[var(--text-body)]">
                  {article.title}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-6 block text-sm font-semibold text-[var(--text-heading)]">
            Status
            <select
              disabled={busy}
              value={String(open.status)}
              onChange={(e) => move(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-body)] px-3 outline-none"
            >
              {stages.map((c) => (
                <option key={c} className="bg-[var(--surface-card)] text-[var(--text-body)]">{c}</option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold text-[var(--text-heading)]">
            Review note
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-body)] p-3 outline-none"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <section className="mt-7">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-meta)]">
              Why we should feature them
            </h3>
            <p className="mt-2 whitespace-pre-line font-serif leading-7 text-[var(--text-body)]">
              {String(open.reason)}
            </p>
          </section>
          <section className="mt-7 rounded-lg bg-[var(--surface-tint)] text-[var(--text-body)] p-4 text-sm">
            <b className="text-[var(--text-heading)]">Nominated by</b>
            <p className="mt-1 text-[var(--text-meta)]">
              {String(open.submitter_name)} · {String(open.relationship)}
            </p>
          </section>
        </Drawer>
      )}
    </ConsoleFrame>
  );
}
