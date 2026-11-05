export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mb-8 text-sm text-muted-foreground">Última actualización: {updatedAt}</p>
      <div className="space-y-4 leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_table]:w-full [&_table]:text-sm [&_td]:border-b [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:border-b [&_th]:py-2 [&_th]:pr-3 [&_th]:text-left">
        {children}
      </div>
    </article>
  );
}
