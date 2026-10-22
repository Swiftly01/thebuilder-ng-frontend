/** HTML is generated or sanitized by Laravel; preview uses the same private renderer. */
export function ArticleBody({ html }: { html: string }) {
  return (
    <div
      className="article-copy min-w-0 font-serif text-[19px] leading-8 text-[var(--text-body)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
