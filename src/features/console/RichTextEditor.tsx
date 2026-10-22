import { createElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Link as LinkIcon,
  Unlink,
  ImagePlus,
  Table,
  RemoveFormatting,
  Undo2,
  Redo2,
  Palette,
  type LucideIcon,
} from "lucide-react";
import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Selection, type SelectionBookmark } from "@tiptap/pm/state";
import { Fragment } from "@tiptap/pm/model";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { http, errorMessage, type ApiEnvelope } from "@/lib/http";

const MediaFigure = Node.create({
  name: "mediaFigure",
  group: "block",
  atom: true,
  draggable: true,
  addKeyboardShortcuts() {
    return {
      Enter: () =>
        this.editor.isActive("mediaFigure")
          ? this.editor.commands.createParagraphNear()
          : false,
    };
  },
  addAttributes() {
    return Object.fromEntries(
      ["mediaId", "src", "alt", "caption", "credit", "layout"].map((key) => [
        key,
        { default: key === "layout" ? "landscape" : "" },
      ]),
    );
  },
  parseHTML() {
    return [{ tag: "figure[data-media-id]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const a = node.attrs;
    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-media-id": a.mediaId,
        "data-layout": a.layout,
        contenteditable: "false",
      }),
      ["img", { src: a.src, alt: a.alt, loading: "lazy" }],
      [
        "figcaption",
        {},
        ["span", {}, a.caption || ""],
        ["span", { class: "article-image-credit" }, a.credit || ""],
      ],
    ];
  },
});

const fonts = [
  "Source Serif 4",
  "Inter",
  "Montserrat",
  "Georgia",
  "Arial",
  "Times New Roman",
  "monospace",
];
const icons: Record<string, LucideIcon> = {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript: SubscriptIcon,
  Superscript: SuperscriptIcon,
  "Align left": AlignLeft,
  "Align center": AlignCenter,
  "Align right": AlignRight,
  "Align justify": AlignJustify,
  "Bullet list": List,
  "Numbered list": ListOrdered,
  Quote,
  "Code block": Code,
  Divider: Minus,
  Link: LinkIcon,
  "Remove link": Unlink,
  "Insert image": ImagePlus,
  "Insert table": Table,
  "Clear formatting": RemoveFormatting,
  Undo: Undo2,
  Redo: Redo2,
  "Clear colour": Palette,
};
const sizes = [12, 14, 16, 18, 19, 20, 22, 24, 28, 32, 36, 40, 48];
const control =
  "rounded border border-[var(--border)] bg-[var(--surface-card)] px-2 py-2 text-xs text-[var(--text-heading)]";

export default function RichTextEditor({
  controlsTarget,
  initialDocument,
  initialHtml,
  onChange,
  onBlocked,
}: {
  controlsTarget: HTMLElement | null;
  initialDocument?: JSONContent | null;
  initialHtml: string;
  onChange: (document: JSONContent) => void;
  onBlocked: (blocked: boolean) => void;
}) {
  const [ready, setReady] = useState(Boolean(initialDocument) || !initialHtml);
  const [error, setError] = useState("");
  const [imageDialog, setImageDialog] = useState(false);
  const [linkDialog, setLinkDialog] = useState(false);
  const [link, setLink] = useState("");
  const [image, setImage] = useState({
    mediaId: "",
    src: "",
    alt: "",
    caption: "",
    credit: "",
    layout: "landscape",
  });
  const [loadingImage, setLoadingImage] = useState(false);
  const [slashMenu, setSlashMenu] = useState(false);
  const bookmark = useRef<SelectionBookmark | null>(null);
  const editingImage = useRef(false);
  const interacted = useRef(false);
  const slashRange = useRef<{ from: number; to: number } | null>(null);
  const callbacks = useRef({ onChange, onBlocked });
  callbacks.current = { onChange, onBlocked };
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: false },
      }),
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TableKit.configure({ table: { resizable: false } }),
      Subscript,
      Superscript,
      MediaFigure,
    ],
    content: initialDocument || {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    editable: ready,
    editorProps: {
      transformPastedHTML: (html) => {
        // Keep pasted text and semantic formatting; normalize Word/web typography to the API palette.
        const dom = new DOMParser().parseFromString(html, "text/html");
        dom.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
          const source = element.style;
          const font = source.fontFamily
            .split(",")
            .map((value) => value.trim().replace(/^['\"]|['\"]$/g, ""))
            .find((value) => fonts.includes(value));
          const size = source.fontSize;
          const colour = (value: string) =>
            /^#[\da-f]{6}$/i.test(value) ||
            /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(value)
              ? value
              : "";
          const clean = {
            fontFamily: font || "",
            fontSize: sizes.some((value) => `${value}px` === size) ? size : "",
            color: colour(source.color),
            backgroundColor: colour(source.backgroundColor),
            lineHeight: ["1.2", "1.5", "1.7", "2", "2.4"].includes(
              source.lineHeight,
            )
              ? source.lineHeight
              : "",
            textAlign: ["left", "center", "right", "justify"].includes(
              source.textAlign,
            )
              ? source.textAlign
              : "",
            fontWeight: /^(bold|[6-9]00)$/.test(source.fontWeight)
              ? "bold"
              : "",
            fontStyle: source.fontStyle === "italic" ? "italic" : "",
            textDecoration: source.textDecorationLine.includes("underline")
              ? "underline"
              : "",
          };
          element.removeAttribute("style");
          Object.assign(element.style, clean);
        });
        return dom.body.innerHTML;
      },
      attributes: {
        role: "textbox",
        "aria-label": "Story body",
        "aria-multiline": "true",
        class: "article-copy min-h-[450px] outline-none",
      },
      handlePaste: (_view, event) => {
        if (
          event.clipboardData?.files.length ||
          /<(img|figure)\b/i.test(
            event.clipboardData?.getData("text/html") || "",
          )
        ) {
          setError(
            "Use Insert image to upload or choose images from the media library.",
          );
          return true;
        }
        return false;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          setError(
            "Use Insert image to upload files before placing them in the article.",
          );
          return true;
        }
        return false;
      },
    },
    onTransaction: ({ transaction }) => {
      if (bookmark.current)
        bookmark.current = bookmark.current.map(transaction.mapping);
    },
    onUpdate: ({ editor: current }) => {
      if (interacted.current) callbacks.current.onChange(current.getJSON());
      const { $from, empty } = current.state.selection;
      const before = $from.parent.textBetween(0, $from.parentOffset);
      const show = empty && before === "/";
      slashRange.current = show ? { from: $from.pos - 1, to: $from.pos } : null;
      setSlashMenu(show);
    },
  });

  useEffect(() => {
    callbacks.current.onBlocked(!ready || imageDialog || linkDialog);
    return () => callbacks.current.onBlocked(false);
  }, [ready, imageDialog, linkDialog]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(ready);
  }, [editor, ready]);

  useEffect(() => {
    if (!editor || initialDocument || !initialHtml) return;
    const controller = new AbortController();
    void http<ApiEnvelope<{ document: JSONContent }>>(
      "/console/content-import",
      {
        method: "POST",
        body: { body: initialHtml },
        signal: controller.signal,
      },
    )
      .then((response) => {
        if (controller.signal.aborted) return;
        editor.commands.setContent(response.data.document, {
          emitUpdate: false,
        });
        setReady(true);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, [editor, initialDocument, initialHtml]);

  // Dialogs retain focus and return it to the editing selection on close.
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!imageDialog && !linkDialog) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>("button, input")?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setImageDialog(false);
        setLinkDialog(false);
        editor?.commands.focus();
      }
      if (event.key !== "Tab" || !dialog) return;
      const fields = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
        ),
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
    };
  }, [imageDialog, linkDialog, editor]);

  if (!editor) return <p role="status">Loading editor…</p>;
  const button = (
    label: string,
    action: () => unknown,
    active = false,
    disabled = false,
  ) => (
    <button
      type="button"
      key={label}
      aria-label={label}
      title={label}
      aria-pressed={
        [
          "Bold",
          "Italic",
          "Underline",
          "Strikethrough",
          "Subscript",
          "Superscript",
          "Align left",
          "Align center",
          "Align right",
          "Align justify",
          "Bullet list",
          "Numbered list",
          "Quote",
          "Code block",
          "Link",
        ].includes(label)
          ? active
          : undefined
      }
      disabled={disabled || !ready}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        setError("");
        action();
      }}
      className={`${control} inline-flex min-h-10 min-w-10 items-center justify-center disabled:opacity-40 ${active ? "ring-2 ring-[var(--focus-ring)]" : ""}`}
    >
      {icons[label]
        ? createElement(icons[label], { size: 16, "aria-hidden": true })
        : label}
    </button>
  );
  const remember = () => {
    bookmark.current = editor.state.selection.getBookmark();
  };
  const restore = () => {
    if (bookmark.current)
      editor.view.dispatch(
        editor.state.tr.setSelection(
          bookmark.current.resolve(editor.state.doc),
        ),
      );
    bookmark.current = null;
  };
  const openImage = () => {
    if (slashRange.current)
      editor.chain().focus().deleteRange(slashRange.current).run();
    setSlashMenu(false);
    editingImage.current = editor.isActive("mediaFigure");
    if (!editingImage.current && !editor.state.selection.empty) {
      editor.commands.setTextSelection(editor.state.selection.to);
    }
    const a = editor.getAttributes("mediaFigure");
    setImage(
      editingImage.current
        ? {
            mediaId: a.mediaId,
            src: a.src,
            alt: a.alt,
            caption: a.caption,
            credit: a.credit,
            layout: a.layout,
          }
        : {
            mediaId: "",
            src: "",
            alt: "",
            caption: "",
            credit: "",
            layout: "landscape",
          },
    );
    remember();
    setImageDialog(true);
  };
  const insertImage = () => {
    restore();
    if (editingImage.current)
      editor.chain().focus().updateAttributes("mediaFigure", image).run();
    else
      editor
        .chain()
        .focus()
        .insertContent({ type: "mediaFigure", attrs: image })
        .run();
    setImageDialog(false);
    setError("");
  };
  const moveImage = (direction: -1 | 1) => {
    const selection = editor.state.selection;
    const node = editor.state.doc.nodeAt(selection.from);
    if (node?.type.name !== "mediaFigure") return;
    const adjacent =
      direction < 0
        ? selection.$from.nodeBefore
        : editor.state.doc.resolve(selection.to).nodeAfter;
    if (!adjacent) return;
    const index = selection.$from.index();
    const startIndex = direction < 0 ? index - 1 : index;
    const replacement = direction < 0 ? [node, adjacent] : [adjacent, node];
    if (
      !selection.$from.parent.canReplace(
        startIndex,
        startIndex + 2,
        Fragment.fromArray(replacement),
      )
    )
      return;
    const target =
      direction < 0
        ? selection.from - adjacent.nodeSize
        : selection.from + adjacent.nodeSize;
    const tr = editor.state.tr
      .delete(selection.from, selection.from + node.nodeSize)
      .insert(target, node);
    tr.setSelection(Selection.near(tr.doc.resolve(target)));
    editor.view.dispatch(tr);
    editor.commands.focus();
  };
  return (
    <div
      className="mt-8 border-t border-[var(--border)] pt-5"
      onPointerDownCapture={() => {
        interacted.current = true;
      }}
      onKeyDownCapture={() => {
        interacted.current = true;
      }}
      onPasteCapture={() => {
        interacted.current = true;
      }}
    >
      {controlsTarget &&
        createPortal(
          <>
            <div
              role="toolbar"
              aria-label="Article formatting"
              className="flex flex-wrap items-center gap-2 [&>select]:min-w-0 [&>select]:flex-1 [&>select]:basis-[calc(50%-0.5rem)]"
            >
              <select
                aria-label="Text style"
                className={control}
                value={
                  editor.isActive("heading")
                    ? String(editor.getAttributes("heading").level)
                    : "p"
                }
                onChange={(e) =>
                  e.target.value === "p"
                    ? editor.chain().focus().setParagraph().run()
                    : editor
                        .chain()
                        .focus()
                        .setHeading({
                          level: Number(e.target.value) as 2 | 3 | 4,
                        })
                        .run()
                }
              >
                <option value="p">Paragraph</option>
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    Heading {n}
                  </option>
                ))}
              </select>
              <select
                aria-label="Font family"
                className={control}
                value={editor.getAttributes("textStyle").fontFamily || ""}
                onChange={(e) =>
                  e.target.value
                    ? editor.chain().focus().setFontFamily(e.target.value).run()
                    : editor.chain().focus().unsetFontFamily().run()
                }
              >
                <option value="">Default font</option>
                {fonts.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
              <select
                aria-label="Font size"
                className={control}
                value={editor.getAttributes("textStyle").fontSize || ""}
                onChange={(e) =>
                  e.target.value
                    ? editor.chain().focus().setFontSize(e.target.value).run()
                    : editor.chain().focus().unsetFontSize().run()
                }
              >
                <option value="">Default size</option>
                {sizes.map((n) => (
                  <option key={n} value={`${n}px`}>
                    {n}px
                  </option>
                ))}
              </select>
              <select
                aria-label="Line height"
                className={control}
                value={editor.getAttributes("textStyle").lineHeight || ""}
                onChange={(e) =>
                  e.target.value
                    ? editor.chain().focus().setLineHeight(e.target.value).run()
                    : editor.chain().focus().unsetLineHeight().run()
                }
              >
                <option value="">Default spacing</option>
                {["1.2", "1.5", "1.7", "2", "2.4"].map((n) => (
                  <option key={n} value={n}>
                    Spacing {n}
                  </option>
                ))}
              </select>
              <label className={control}>
                Text colour{" "}
                <input
                  type="color"
                  aria-label="Text colour"
                  value={editor.getAttributes("textStyle").color || "#0b2046"}
                  onFocus={remember}
                  onInput={(e) => {
                    const color = e.currentTarget.value;
                    restore();
                    editor.chain().focus().setColor(color).run();
                  }}
                  onChange={(e) =>
                    editor.chain().focus().setColor(e.target.value).run()
                  }
                  className="ml-1 h-5 w-6 align-middle"
                />
              </label>
              <label className={control}>
                Highlight{" "}
                <input
                  type="color"
                  aria-label="Highlight colour"
                  value={editor.getAttributes("highlight").color || "#fff2a8"}
                  onFocus={remember}
                  onInput={(e) => {
                    const color = e.currentTarget.value;
                    restore();
                    editor.chain().focus().setHighlight({ color }).run();
                  }}
                  onChange={(e) =>
                    editor
                      .chain()
                      .focus()
                      .setHighlight({ color: e.target.value })
                      .run()
                  }
                  className="ml-1 h-5 w-6 align-middle"
                />
              </label>
              {button("Clear colour", () =>
                editor
                  .chain()
                  .focus()
                  .unsetColor()
                  .unsetHighlight()
                  .unsetBackgroundColor()
                  .run(),
              )}
              {button(
                "Bold",
                () => editor.chain().focus().toggleBold().run(),
                editor.isActive("bold"),
              )}
              {button(
                "Italic",
                () => editor.chain().focus().toggleItalic().run(),
                editor.isActive("italic"),
              )}
              {button(
                "Underline",
                () => editor.chain().focus().toggleUnderline().run(),
                editor.isActive("underline"),
              )}
              {button(
                "Strikethrough",
                () => editor.chain().focus().toggleStrike().run(),
                editor.isActive("strike"),
              )}
              {button(
                "Subscript",
                () => editor.chain().focus().toggleSubscript().run(),
                editor.isActive("subscript"),
              )}
              {button(
                "Superscript",
                () => editor.chain().focus().toggleSuperscript().run(),
                editor.isActive("superscript"),
              )}
              {["left", "center", "right", "justify"].map((align) =>
                button(
                  `Align ${align}`,
                  () => editor.chain().focus().setTextAlign(align).run(),
                  editor.isActive({ textAlign: align }),
                ),
              )}
              {button(
                "Bullet list",
                () => editor.chain().focus().toggleBulletList().run(),
                editor.isActive("bulletList"),
              )}
              {button(
                "Numbered list",
                () => editor.chain().focus().toggleOrderedList().run(),
                editor.isActive("orderedList"),
              )}
              {button(
                "Quote",
                () => editor.chain().focus().toggleBlockquote().run(),
                editor.isActive("blockquote"),
              )}
              {button(
                "Code block",
                () => editor.chain().focus().toggleCodeBlock().run(),
                editor.isActive("codeBlock"),
              )}
              {button("Divider", () =>
                editor.chain().focus().setHorizontalRule().run(),
              )}
              {button(
                "Link",
                () => {
                  remember();
                  setLink(editor.getAttributes("link").href || "");
                  setLinkDialog(true);
                },
                editor.isActive("link"),
              )}
              {button(
                "Remove link",
                () =>
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .unsetLink()
                    .run(),
                false,
                !editor.isActive("link"),
              )}
              {button("Insert image", openImage)}
              {button("Insert table", () =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run(),
              )}
              {button("Clear formatting", () =>
                editor
                  .chain()
                  .focus()
                  .unsetAllMarks()
                  .clearNodes()
                  .unsetTextAlign()
                  .run(),
              )}
              {button(
                "Undo",
                () => editor.chain().focus().undo().run(),
                false,
                !editor.can().undo(),
              )}
              {button(
                "Redo",
                () => editor.chain().focus().redo().run(),
                false,
                !editor.can().redo(),
              )}
            </div>
            {editor.isActive("table") && (
              <div
                role="group"
                aria-label="Table controls"
                className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3"
              >
                <p className="w-full text-xs font-semibold text-[var(--text-meta)]">
                  Selected table
                </p>
                {button("Add row", () =>
                  editor.chain().focus().addRowAfter().run(),
                )}
                {button("Add column", () =>
                  editor.chain().focus().addColumnAfter().run(),
                )}
                {button("Delete row", () =>
                  editor.chain().focus().deleteRow().run(),
                )}
                {button("Delete column", () =>
                  editor.chain().focus().deleteColumn().run(),
                )}
                {button("Toggle header", () =>
                  editor.chain().focus().toggleHeaderRow().run(),
                )}
                {button("Delete table", () =>
                  editor.chain().focus().deleteTable().run(),
                )}
              </div>
            )}
            {editor.isActive("mediaFigure") && (
              <div
                role="group"
                aria-label="Image controls"
                className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3"
              >
                <p className="w-full text-xs font-semibold text-[var(--text-meta)]">
                  Selected image
                </p>
                {button("Edit or replace image", openImage)}
                {button("Move image up", () => moveImage(-1))}
                {button("Move image down", () => moveImage(1))}
                {button("Remove image", () =>
                  editor.chain().focus().deleteSelection().run(),
                )}
              </div>
            )}
          </>,
          controlsTarget,
        )}
      {error && (
        <p role="alert" className="mb-3 text-sm text-[var(--text-error)]">
          {error}
        </p>
      )}
      {!ready && (
        <p role="status" className="mb-3 text-sm">
          Checking existing content before editing. If it cannot be imported
          safely, the saved article stays intact.
        </p>
      )}
      <EditorContent editor={editor} />
      {slashMenu && (
        <div role="group" aria-label="Insert block" className="mt-2 flex gap-2">
          {button("Image from media", openImage)}
          {button("Cancel insertion", () => setSlashMenu(false))}
        </div>
      )}
      <p className="mt-4 text-xs text-[var(--text-meta)]">
        Formatting and media tools are in Story settings. Type / in an empty
        paragraph to insert an image.
      </p>
      {(imageDialog || linkDialog) && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--overlay)] p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={
              imageDialog ? "Insert or edit article image" : "Edit link"
            }
            className="mx-auto my-6 max-w-xl rounded-xl bg-[var(--surface-card)] p-6 text-[var(--text-body)] shadow-xl"
          >
            <button
              type="button"
              className={`${control} float-right`}
              onClick={() => {
                setImageDialog(false);
                setLinkDialog(false);
                editor.commands.focus();
              }}
            >
              Cancel
            </button>
            <h2 className="mb-4 font-display text-xl font-bold">
              {imageDialog ? "Article image" : "Link"}
            </h2>
            {imageDialog ? (
              <>
                <MediaPicker
                  label="Article image library"
                  value={image.mediaId || null}
                  onChange={(id) => {
                    setImage((current) => ({
                      ...current,
                      mediaId: id || "",
                      src: "",
                      alt: "",
                      credit: "",
                    }));
                    if (!id) return;
                    setLoadingImage(true);
                    setError("");
                    void http<
                      ApiEnvelope<{
                        id: string;
                        url: string;
                        alt: string;
                        credit?: string;
                      }>
                    >("/console/media/" + encodeURIComponent(id))
                      .then((r) => {
                        setImage((current) =>
                          current.mediaId === id
                            ? {
                                ...current,
                                src: r.data.url,
                                alt: r.data.alt,
                                credit: r.data.credit || "",
                              }
                            : current,
                        );
                      })
                      .catch((e) => setError(errorMessage(e)))
                      .finally(() => setLoadingImage(false));
                  }}
                />
                {(
                  [
                    ["alt", "Alt text", 255],
                    ["caption", "Caption", 1000],
                    ["credit", "Credit", 255],
                  ] as const
                ).map(([key, label, max]) => (
                  <label key={key} className="mt-4 block text-sm">
                    {label}
                    <input
                      aria-label={`Image ${label.toLowerCase()}`}
                      className={`${control} mt-1 w-full`}
                      maxLength={max}
                      disabled={loadingImage || !image.src}
                      value={image[key]}
                      onChange={(e) =>
                        setImage({ ...image, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <label className="mt-4 block text-sm">
                  Image framing
                  <select
                    aria-label="Image framing"
                    className={`${control} mt-1 w-full`}
                    value={image.layout}
                    onChange={(e) =>
                      setImage({ ...image, layout: e.target.value })
                    }
                  >
                    <option value="landscape">Designer frame (3:2)</option>
                    <option value="original">Show complete image</option>
                  </select>
                </label>
                {error && (
                  <p
                    role="alert"
                    className="mt-3 text-sm text-[var(--text-error)]"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  disabled={
                    loadingImage ||
                    !image.mediaId ||
                    !image.src ||
                    !image.alt.trim()
                  }
                  onClick={insertImage}
                  className={`${control} mt-5 disabled:opacity-40`}
                >
                  {editingImage.current
                    ? "Update image"
                    : "Insert image into article"}
                </button>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    !/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(link) ||
                    /[\s\\]/.test(link)
                  ) {
                    setError(
                      "Enter an https, http, email, phone or internal link.",
                    );
                    return;
                  }
                  restore();
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .setLink({ href: link })
                    .run();
                  setLinkDialog(false);
                }}
              >
                <label className="block text-sm">
                  Link URL
                  <input
                    aria-label="Link URL"
                    value={link}
                    maxLength={2000}
                    onChange={(e) => setLink(e.target.value)}
                    className={`${control} mt-2 w-full`}
                  />
                </label>
                {error && <p role="alert">{error}</p>}
                <button type="submit" className={`${control} mt-4`}>
                  Apply link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
