import { useEffect, useState } from "react";
import { http, errorMessage } from "@/lib/http";
import { ContentImage } from "./ContentImage";

interface MediaRecord {
  id: string;
  url: string;
  alt: string;
  credit?: string | null;
}
interface MediaPage {
  data: MediaRecord[];
  current_page: number;
  last_page: number;
}

/** Uses the authenticated media library; saves a foreign key, never a typed URL. */
export function MediaPicker({
  value,
  onChange,
  label = "Featured image",
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [library, setLibrary] = useState<MediaPage | null>(null);
  const [selected, setSelected] = useState<MediaRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [uploadAlt, setUploadAlt] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setBusy(true);
      setError("");
      void http<MediaPage>("/console/media", {
        query: { q: query, page, per_page: 12 },
        signal: controller.signal,
      })
        .then(setLibrary)
        .catch((e) => {
          if (!controller.signal.aborted) setError(errorMessage(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, page, refresh]);
  useEffect(() => {
    if (!value) {
      return;
    }
    const controller = new AbortController();
    http<{ data: MediaRecord }>("/console/media/" + encodeURIComponent(value), {
      signal: controller.signal,
    })
      .then((r) => setSelected(r.data))
      .catch((e) => {
        if (!controller.signal.aborted) {
          setSelected(null);
          setError(errorMessage(e));
        }
      });
    return () => controller.abort();
  }, [value, refresh]);
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!uploadAlt.trim()) {
      setError("Describe the image before uploading.");
      event.target.value = "";
      return;
    }
    const body = new FormData();
    body.append("file", file);
    body.append("alt", uploadAlt.trim());
    setBusy(true);
    setError("");
    try {
      const result = await http<{ data: MediaRecord }>("/console/media", {
        method: "POST",
        body,
      });
      onChange(result.data.id);
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }
  return (
    <fieldset
      className="mt-4 space-y-3 rounded-lg border border-[var(--border)] p-3"
      aria-busy={busy}
    >
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      {selected && selected.id === value && (
        <div>
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <ContentImage src={selected.url} alt={selected.alt} sizes="320px" />
          </div>
          <p className="mt-1 text-xs">{selected.alt}</p>
          {selected.credit && <p className="text-xs">{selected.credit}</p>}
        </div>
      )}
      <label className="block text-sm">
        Search media
        <input
          value={query}
          maxLength={120}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="mt-1 w-full rounded border border-[var(--border)] px-2 py-2"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm">
          {error}{" "}
          <button
            type="button"
            onClick={() => setRefresh((x) => x + 1)}
            className="underline"
          >
            Try again
          </button>
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {library?.data.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-label={"Choose image: " + item.alt}
            aria-pressed={value === item.id}
            onClick={() => onChange(item.id)}
            className={
              "relative aspect-square overflow-hidden rounded border-2 " +
              (value === item.id ? "border-royal" : "border-transparent")
            }
          >
            <ContentImage src={item.url} alt={item.alt} sizes="100px" />
          </button>
        ))}
      </div>
      {!busy && library?.data.length === 0 && (
        <p className="text-sm">No images match this search.</p>
      )}
      <div className="flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          disabled={busy || page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>
          {page} / {library?.last_page || 1}
        </span>
        <button
          type="button"
          disabled={busy || !library || page >= library.last_page}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      <button
        type="button"
        onClick={() => onChange(null)}
        className="text-sm underline"
      >
        Remove selected image
      </button>
      <label className="block text-sm">
        Image description
        <input
          value={uploadAlt}
          maxLength={255}
          onChange={(e) => setUploadAlt(e.target.value)}
          className="mt-1 w-full rounded border border-[var(--border)] px-2 py-2"
        />
      </label>
      <label className="block text-sm">
        Upload image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || !uploadAlt.trim()}
          onChange={upload}
          className="mt-1 block w-full text-xs"
        />
      </label>
    </fieldset>
  );
}
