/** Paper-like container for printable legal documents (convocatoria, acta). */
export function LegalDoc({ children }: { children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl space-y-5 rounded-2xl border bg-white p-6 font-serif text-[15px] leading-relaxed text-neutral-900 shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none [&_h1]:text-center [&_h1]:font-serif [&_h1]:text-xl [&_h1]:font-bold [&_h1]:uppercase [&_h2]:font-serif [&_h2]:text-base [&_h2]:font-bold [&_h2]:uppercase [&_table]:w-full [&_td]:border-b [&_td]:border-neutral-200 [&_td]:py-1 [&_th]:border-b [&_th]:border-neutral-400 [&_th]:py-1 [&_th]:text-left">
      {children}
    </article>
  );
}
