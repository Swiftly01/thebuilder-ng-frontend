import { useSession } from "@/context/SessionContext";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Eye, History, X } from "lucide-react";
import { ConsoleFrame } from "./ConsolePages";
import {
  useConsoleData,
  type ConsoleRecord,
} from "@/context/ConsoleDataContext";
import { http, errorMessage, type ApiEnvelope } from "@/lib/http";
import { useToast } from "@/context/ToastContext";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { storyCategories, categorySlug } from "@/lib/editorial-policy";
import dynamic from "next/dynamic";
import type { JSONContent } from "@tiptap/core";
import { ArticleBody } from "@/features/editorial/ArticleBody";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => <p role="status">Loading editor…</p>,
});

const btn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50";
function GrowingTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!field.current) return;
    field.current.style.height = "auto";
    field.current.style.height = `${field.current.scrollHeight}px`;
    let width = field.current.clientWidth;
    const observer = new ResizeObserver(() => {
      if (!field.current || field.current.clientWidth === width) return;
      width = field.current.clientWidth;
      field.current.style.height = "auto";
      field.current.style.height = `${field.current.scrollHeight}px`;
    });
    observer.observe(field.current);
    return () => observer.disconnect();
  }, [props.value]);
  return <textarea {...props} ref={field} />;
}
export function ConnectedEditor() {
  const live = useConsoleData();
  const { user } = useSession();
  const canPublish = Boolean(user?.permissions.includes("content.publish"));
  const router = useRouter();
  const { toast } = useToast();
  const [item, setItem] = useState<ConsoleRecord | undefined>(live?.record);
  const [title, setTitle] = useState(String(item?.title || ""));
  const [summary, setSummary] = useState(String(item?.summary || ""));
  const [body, setBody] = useState(String(item?.body || ""));
  const [bodyDocument, setBodyDocument] = useState<JSONContent | null>(
    (item?.bodyDocument as JSONContent) || null,
  );
  const [editorBlocked, setEditorBlocked] = useState(true);
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [formattingTarget, setFormattingTarget] =
    useState<HTMLDivElement | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const modalRoot = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ConsoleRecord[] | null>(null);
  const [preview, setPreview] = useState(false);
  const [note, setNote] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [settings, setSettings] = useState<Record<string, unknown>>({
    categoryId: item?.categoryId || null,
    mediaId: item?.mediaId || null,
    edition: item?.edition || "both",
    type: item?.type || "article",
    slug: item?.slug || "",
    seo: item?.seo || {},
    tags: Array.isArray(item?.tags)
      ? item.tags.map((x) => (x as ConsoleRecord).id)
      : [],
    builders: item?.builders || [],
    startups: item?.startups || [],
  });
  const [options, setOptions] = useState<Record<string, ConsoleRecord[]>>({});
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!preview && !history) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    modalRoot.current?.querySelector<HTMLElement>("button")?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPreview(false);
        setHistory(null);
      }
      if (event.key !== "Tab") return;
      const fields = Array.from(
        modalRoot.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
        ) || [],
      );
      const first = fields[0],
        last = fields[fields.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handle);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [preview, history]);
  const status = String(item?.status || "draft");
  const approvedCategories = new Set(
    (settings.edition === "both"
      ? [...storyCategories("Nigeria"), ...storyCategories("Australia")]
      : storyCategories(
          settings.edition === "Australia" ? "Australia" : "Nigeria",
        )
    ).map(categorySlug),
  );
  const categoryOptions = (options.categories || []).filter(
    (category) =>
      approvedCategories.has(String(category.slug || "")) ||
      (item?.id && category.id === settings.categoryId),
  );
  const formSnapshot = JSON.stringify({
    title,
    summary,
    body,
    bodyDocument,
    settings,
  });
  const latestForm = useRef(formSnapshot);
  useEffect(() => {
    latestForm.current = formSnapshot;
  }, [formSnapshot]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      http<ApiEnvelope<ConsoleRecord[]>>("/categories", {
        signal: controller.signal,
      }),
      http<ApiEnvelope<ConsoleRecord[]>>("/tags", {
        signal: controller.signal,
      }),
      http<ApiEnvelope<ConsoleRecord[]>>("/console/media", {
        signal: controller.signal,
      }),
      http<ApiEnvelope<ConsoleRecord[]>>("/builders", {
        signal: controller.signal,
      }),
      http<ApiEnvelope<ConsoleRecord[]>>("/startups", {
        signal: controller.signal,
      }),
    ])
      .then(([categories, tags, media, builders, startups]) =>
        setOptions({
          categories: categories.data,
          tags: tags.data,
          media: media.data,
          builders: builders.data,
          startups: startups.data,
        }),
      )
      .catch((e) => {
        if (!controller.signal.aborted) toast(errorMessage(e));
      });
    return () => controller.abort();
  }, [toast]);
  const save = useCallback(async () => {
    if (editorBlocked)
      throw new Error("Finish editing the image or link before saving.");
    const data = {
      title,
      summary,
      ...(bodyDocument ? { bodyDocument } : { body }),
      ...settings,
      slug: settings.slug || undefined,
    };
    const response = await http<ApiEnvelope<ConsoleRecord>>(
      item?.id ? "/console/content/" + item.id : "/console/content",
      {
        method: item?.id ? "PATCH" : "POST",
        body: data,
        headers: item?.id ? { "If-Match": String(item.version) } : {},
      },
    );
    setItem(response.data);
    live?.rememberRecord(response.data);
    setDirty(latestForm.current !== formSnapshot);
    if (!item?.id) {
      // Keep the mounted editor and any typing after this save's snapshot during the ID URL change.
      void router.replace("/console/editor?id=" + response.data.id, undefined, {
        shallow: true,
      });
    }
    return response.data;
  }, [
    title,
    summary,
    body,
    bodyDocument,
    settings,
    item,
    router,
    formSnapshot,
    editorBlocked,
    live,
  ]);
  const perform = useCallback(
    async (action: () => Promise<unknown>, message: string) => {
      if (busy) return;
      setBusy(true);
      try {
        await action();
        toast(message);
      } catch (e) {
        toast(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [busy, toast],
  );
  async function move(to: string) {
    await perform(async () => {
      const current = dirty || !item?.id ? await save() : item;
      if (!current?.id) return;
      const r = await http<ApiEnvelope<ConsoleRecord>>(
        "/console/content/" + current.id + "/transition",
        {
          method: "POST",
          headers: { "If-Match": String(current.version) },
          body: {
            status: to,
            note: note || undefined,
            scheduledFor:
              to === "scheduled" && scheduled
                ? new Date(scheduled + ":00+01:00").toISOString()
                : undefined,
          },
        },
      );
      setItem(r.data);
      live?.rememberRecord(r.data);
    }, "Story moved to " + to);
  }
  useEffect(() => {
    if (!dirty || !item?.id || busy || editorBlocked) return;
    const timer = setTimeout(() => {
      void perform(save, "Draft saved");
    }, 20000);
    return () => clearTimeout(timer);
  }, [dirty, item?.id, busy, perform, save, editorBlocked]);
  return (
    <ConsoleFrame>
      <div className="rich-cms-surface text-[var(--text-body)]">
        <div className="-m-4 md:-m-6">
          <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-card)] px-4 py-3">
            <Link
              href="/console/content"
              aria-label="Back to content"
              className="grid size-9 place-items-center"
            >
              <ArrowLeft size={18} />
            </Link>
            <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold">
              {status}
            </span>
            <span className="hidden text-xs text-[var(--text-meta)] md:inline">
              {dirty ? "Unsaved changes" : item?.id ? "Saved" : "New draft"}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                className={btn}
                disabled={!item?.id || busy}
                onClick={() =>
                  perform(async () => {
                    setHistory(
                      (
                        await http<ApiEnvelope<ConsoleRecord[]>>(
                          "/console/content/" + item?.id + "/versions",
                        )
                      ).data,
                    );
                  }, "Version history loaded")
                }
              >
                <History size={16} />
                History
              </button>
              <button
                className={btn}
                disabled={busy || editorBlocked}
                onClick={() =>
                  perform(async () => {
                    const html = bodyDocument
                      ? (
                          await http<ApiEnvelope<{ body: string }>>(
                            "/console/content-preview",
                            { method: "POST", body: { bodyDocument } },
                          )
                        ).data.body
                      : body;
                    setPreviewHtml(html);
                    setPreview(true);
                  }, "Preview ready")
                }
              >
                <Eye size={16} />
                Preview
              </button>
              <button
                className={btn}
                disabled={busy || editorBlocked || !title}
                onClick={() => perform(save, "Draft saved")}
              >
                {busy ? <LoadingDots /> : "Save draft"}
              </button>
              {["draft", "changes"].includes(status) && (
                <button
                  className={btn + " bg-brand-red text-white"}
                  disabled={busy || editorBlocked || !title}
                  onClick={() => move("review")}
                >
                  Submit
                </button>
              )}
              {status === "review" && canPublish && (
                <button
                  className={btn + " bg-brand-red text-white"}
                  disabled={busy || editorBlocked}
                  onClick={() => move("approved")}
                >
                  Approve
                </button>
              )}
              {status === "approved" && canPublish && (
                <button
                  className={btn + " bg-brand-red text-white"}
                  disabled={busy || editorBlocked}
                  onClick={() => move("published")}
                >
                  Publish
                </button>
              )}
              {["archived", "rejected"].includes(status) && canPublish && (
                <button
                  className={btn}
                  disabled={busy || editorBlocked}
                  onClick={() => move("draft")}
                >
                  Reopen draft
                </button>
              )}
              {status === "published" && canPublish && (
                <button
                  className={btn}
                  disabled={busy || editorBlocked}
                  onClick={() => move("archived")}
                >
                  Archive
                </button>
              )}
              {status === "published" && canPublish && (
                <button
                  className={btn}
                  disabled={busy || editorBlocked}
                  onClick={() => move("approved")}
                >
                  Unpublish
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-5 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <article className="min-h-[760px] rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-5 py-9 md:px-14 md:py-12">
              <GrowingTextarea
                aria-label="Story title"
                placeholder="Story title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
                className="min-h-16 w-full resize-none overflow-hidden bg-transparent font-display text-3xl font-extrabold leading-tight text-[var(--text-heading)] outline-none md:text-[44px]"
              />
              <GrowingTextarea
                aria-label="Story summary"
                placeholder="Story summary"
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  setDirty(true);
                }}
                className="mt-4 min-h-16 w-full resize-none overflow-hidden bg-transparent font-serif text-xl leading-8 text-[var(--text-meta)] outline-none"
              />
              <RichTextEditor
                key={editorGeneration}
                initialDocument={(item?.bodyDocument as JSONContent) || null}
                initialHtml={String(item?.body || "")}
                onChange={(document) => {
                  setBodyDocument(document);
                  setDirty(true);
                }}
                onBlocked={setEditorBlocked}
                controlsTarget={formattingTarget}
              />
            </article>
            <aside className="space-y-4 xl:sticky xl:top-36 xl:self-start">
              <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                <h2 className="font-semibold text-[var(--text-heading)]">
                  Story settings
                </h2>
                <details
                  open
                  className="group mt-4 border-y border-[var(--border)] py-3"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--text-heading)]">
                    Formatting &amp; media
                  </summary>
                  <p className="mb-3 mt-2 text-xs leading-5 text-[var(--text-meta)]">
                    Select text in your story, then choose its formatting here.
                    Select an image or table to reveal its editing controls.
                  </p>
                  <div ref={setFormattingTarget} />
                </details>
                {[["Category", "categoryId", categoryOptions]].map(
                  ([label, key, choices]) => (
                    <label
                      key={String(key)}
                      className="mt-4 block text-sm font-semibold"
                    >
                      {String(label)}
                      <select
                        className="mt-2 w-full rounded-lg border border-[var(--border)] p-3"
                        value={String(settings[String(key)] || "")}
                        onChange={(e) => {
                          setSettings({
                            ...settings,
                            [String(key)]: e.target.value || null,
                          });
                          setDirty(true);
                        }}
                      >
                        <option value="">None</option>
                        {(choices as ConsoleRecord[]).map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name || String(x.alt)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                )}
                <MediaPicker
                  value={settings.mediaId ? String(settings.mediaId) : null}
                  onChange={(id) => {
                    setSettings({ ...settings, mediaId: id });
                    setDirty(true);
                  }}
                />
                <label className="mt-4 block text-sm font-semibold">
                  Edition
                  <select
                    className="mt-2 w-full rounded-lg border border-[var(--border)] p-3"
                    value={String(settings.edition)}
                    onChange={(e) => {
                      const edition = e.target.value;
                      const allowed = new Set(
                        (edition === "both"
                          ? [
                              ...storyCategories("Nigeria"),
                              ...storyCategories("Australia"),
                            ]
                          : storyCategories(
                              edition === "Australia" ? "Australia" : "Nigeria",
                            )
                        ).map(categorySlug),
                      );
                      const category = (options.categories || []).find(
                        (category) => category.id === settings.categoryId,
                      );
                      setSettings({
                        ...settings,
                        edition,
                        categoryId:
                          category && !allowed.has(String(category.slug))
                            ? null
                            : settings.categoryId,
                      });
                      setDirty(true);
                    }}
                  >
                    {["both", "Nigeria"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="mt-4 block text-sm font-semibold">
                  Content type
                  <select
                    className="mt-2 w-full rounded-lg border border-[var(--border)] p-3"
                    value={String(settings.type)}
                    onChange={(e) => {
                      setSettings({ ...settings, type: e.target.value });
                      setDirty(true);
                    }}
                  >
                    {[
                      "article",
                      "founder_story",
                      "interview",
                      "opinion",
                      "analysis",
                      "business",
                      "diaspora",
                      "sponsored",
                      "press_release",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="mt-4 block text-sm font-semibold">
                  URL slug
                  <input
                    className="mt-2 w-full rounded-lg border border-[var(--border)] p-3"
                    value={String(settings.slug)}
                    onChange={(e) => {
                      setSettings({ ...settings, slug: e.target.value });
                      setDirty(true);
                    }}
                    placeholder="Generated on first save"
                  />
                </label>
                <label className="mt-4 block text-sm font-semibold">
                  Tags
                  <select
                    multiple
                    className="mt-2 w-full rounded-lg border border-[var(--border)] p-3"
                    value={settings.tags as string[]}
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        tags: Array.from(
                          e.target.selectedOptions,
                          (x) => x.value,
                        ),
                      });
                      setDirty(true);
                    }}
                  >
                    {options.tags?.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
                {(["builders", "startups"] as const).map((key) => (
                  <label key={key} className="mt-4 block text-sm font-semibold">
                    Related {key}
                    <select
                      multiple
                      className="mt-2 w-full rounded-lg border border-[var(--border)] p-3"
                      value={settings[key] as string[]}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          [key]: Array.from(
                            e.target.selectedOptions,
                            (x) => x.value,
                          ),
                        });
                        setDirty(true);
                      }}
                    >
                      {options[key]?.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <label className="mt-4 block text-sm font-semibold">
                  SEO description
                  <textarea
                    maxLength={300}
                    className="mt-2 w-full rounded-lg border border-[var(--border)] p-3"
                    value={String(
                      (settings.seo as Record<string, string>).description ||
                        "",
                    )}
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        seo: {
                          ...(settings.seo as object),
                          description: e.target.value,
                        },
                      });
                      setDirty(true);
                    }}
                  />
                </label>
                <p className="mt-3 text-sm">
                  Version {item?.version || 1} · {status}
                </p>
                {status === "review" && (
                  <>
                    <label className="mt-5 block text-sm font-semibold">
                      Review notes
                      <textarea
                        className="mt-2 min-h-28 w-full rounded-lg border border-[var(--border)] p-3"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className={btn}
                        disabled={busy || !note}
                        onClick={() => move("changes")}
                      >
                        Request changes
                      </button>
                      <button
                        className={btn}
                        disabled={busy || !note}
                        onClick={() => move("rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </>
                )}
                {status === "approved" && (
                  <>
                    <label className="mt-5 block text-sm font-semibold">
                      Publish at (WAT)
                      <input
                        type="datetime-local"
                        value={scheduled}
                        onChange={(e) => setScheduled(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-[var(--border)] p-3"
                      />
                    </label>
                    <button
                      className={btn + " mt-3"}
                      disabled={busy || !scheduled}
                      onClick={() => move("scheduled")}
                    >
                      Schedule
                    </button>
                  </>
                )}
                {status === "scheduled" && canPublish && (
                  <button
                    className={btn + " mt-3"}
                    disabled={busy || editorBlocked}
                    onClick={() => move("approved")}
                  >
                    Cancel schedule
                  </button>
                )}
              </section>
            </aside>
          </div>
        </div>
        {preview && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Preview"
            ref={modalRoot}
            className="fixed inset-0 z-50 overflow-y-auto bg-navy-950 p-4 text-white"
          >
            <div className="flex items-center">
              <b>Preview</b>
              <button
                className="ml-auto grid size-11 place-items-center"
                aria-label="Close preview"
                onClick={() => setPreview(false)}
              >
                <X />
              </button>
            </div>
            <div className="mx-auto mt-6 max-w-4xl rounded-xl bg-[var(--surface-card)] p-8 text-[var(--text-body)]">
              <h1 className="font-display text-4xl font-extrabold text-[var(--text-heading)]">
                {title}
              </h1>
              <p className="mt-5 font-serif text-xl">{summary}</p>
              <div className="mt-6">
                <ArticleBody html={previewHtml} />
              </div>
            </div>
          </div>
        )}
        {history && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Version history"
            ref={modalRoot}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"
          >
            <section className="mx-auto mt-16 max-w-3xl rounded-xl bg-[var(--surface-card)] p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold">
                  Version history
                </h2>
                <button
                  className="p-3"
                  aria-label="Close history"
                  onClick={() => setHistory(null)}
                >
                  <X />
                </button>
              </div>
              {history.map((v) => (
                <div
                  key={v.id}
                  className="mt-4 flex items-center justify-between border-t border-[var(--border)] py-4"
                >
                  <span>
                    Version {String(v.version)} · {String(v.created_at || "")}
                  </span>
                  <button
                    className={btn}
                    disabled={busy || editorBlocked}
                    onClick={() =>
                      perform(async () => {
                        const r = await http<ApiEnvelope<ConsoleRecord>>(
                          "/console/content/" +
                            item?.id +
                            "/versions/" +
                            v.id +
                            "/restore",
                          {
                            method: "POST",
                            headers: { "If-Match": String(item?.version) },
                          },
                        );
                        setItem(r.data);
                        live?.rememberRecord(r.data);
                        setTitle(String(r.data.title));
                        setSummary(String(r.data.summary || ""));
                        setBody(String(r.data.body || ""));
                        setBodyDocument(
                          (r.data.bodyDocument as JSONContent) || null,
                        );
                        setEditorGeneration((value) => value + 1);
                        setDirty(false);
                        setHistory(null);
                      }, "Version restored")
                    }
                  >
                    Restore
                  </button>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </ConsoleFrame>
  );
}
