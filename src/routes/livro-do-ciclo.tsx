// /livro-do-ciclo — I-E3 (Arco da Prova): a síntese narrativa anual de uma
// organização real. Compõe Cofre de Ciclos + Reavaliação + Atas de Vitória +
// snapshots ESG + Plano Vivo — tudo já real, nada recalculado aqui.
//
// REAL-ONLY POR DESIGN: este documento é a história da organização LOGADA, não
// existe versão demo/setor-persona (não faria sentido narrar uma história que
// não aconteceu). Sem sessão de org real, a página explica isso honestamente.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Download, Loader2 } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import { supabase } from "@/integrations/supabase/client";
import { loadCycleBook, type LoadCycleBookResult } from "@/lib/api/cycle-book.functions";
import type { CycleBookChapter, CycleBookDocument } from "@/engine/evolucao/cycle-book-engine";

export const Route = createFileRoute("/livro-do-ciclo")({
  head: () => ({ meta: [{ title: "Livro do Ciclo — 4 Lentes VitalOS™" }] }),
  component: LivroDoCicloPage,
});

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function LivroDoCicloPage() {
  const { loading: orgLoading, org } = useRealOrgSession();
  const isRealMode = isCloudReady() && !!org;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LoadCycleBookResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fetchBook = useCallback(async () => {
    if (!isRealMode) return;
    setLoading(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }
      const r = await loadCycleBook({ data: { accessToken } });
      setResult(r);
    } catch {
      setError("Erro ao carregar o Livro do Ciclo.");
    } finally {
      setLoading(false);
    }
  }, [isRealMode]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  const book: CycleBookDocument | null | undefined =
    result && result.cloudReady && "book" in result ? result.book : undefined;

  async function handleDownload() {
    if (!book) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { downloadCycleBookPdf } = await import("@/lib/pdf/cycle-book-pdf");
      const orgSlug = (org?.orgName ?? "organizacao").toLowerCase().replace(/\s+/g, "-");
      downloadCycleBookPdf(book, `livro-do-ciclo-${orgSlug}.pdf`);
    } catch {
      setDownloadError("Erro ao gerar o PDF.");
    } finally {
      setDownloading(false);
    }
  }

  if (orgLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando…
          </p>
        </div>
      </AppShell>
    );
  }

  if (!isRealMode) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <BookOpen className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <h1 className="mt-4 font-serif text-3xl text-foreground">O Livro do Ciclo</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Este documento nasce da história real da sua organização — evolução medida, vitórias
            seladas, provas ESG e o plano em curso, reunidos numa narrativa anual. Ele só existe
            para organizações reais, com sessão de administrador.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <BookOpen className="h-4 w-4" aria-hidden />
            Provar · O Livro do Ciclo
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl text-foreground sm:text-4xl">{org?.orgName}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                A história real desta organização em vitalidade — o que foi medido, o que mudou, o
                que foi provado.
              </p>
            </div>
            {book && (
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownload}
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 print:hidden"
              >
                <Download className="h-4 w-4" aria-hidden /> {downloading ? "Gerando…" : "Baixar o Livro (PDF)"}
              </button>
            )}
          </div>
        </motion.header>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Escrevendo o Livro…
          </p>
        )}

        {(error || (result && result.cloudReady && "error" in result)) && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <p className="text-sm text-destructive">
              {error ?? (result && "error" in result ? result.error : "Erro desconhecido.")}
            </p>
            <button
              type="button"
              onClick={fetchBook}
              className="mt-3 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {downloadError && (
          <p className="rounded-xl border border-amber-400/40 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {downloadError}
          </p>
        )}

        {!loading && result && !result.cloudReady && (
          <p className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
            Lovable Cloud não está ativo.
          </p>
        )}

        {book && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-6"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-primary">O ano em uma frase</p>
              <p className="mt-2 font-serif text-xl leading-snug text-foreground">{book.headline}</p>
            </motion.div>

            <div className="space-y-4">
              {book.chapters.map((chapter, i) => (
                <ChapterCard key={chapter.id} chapter={chapter} index={i} />
              ))}
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">{book.disclaimer}</p>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Cada capítulo compõe dado já real de outras telas —{" "}
              <Link to="/evolucao-nr1" className="underline underline-offset-2 hover:text-foreground">
                Reavaliação
              </Link>
              ,{" "}
              <Link to="/relatorio-global" className="underline underline-offset-2 hover:text-foreground">
                Relatório ESG
              </Link>{" "}
              e{" "}
              <Link to="/plano-acao" className="underline underline-offset-2 hover:text-foreground">
                Plano Vivo
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}

function ChapterCard({ chapter, index }: { chapter: CycleBookChapter; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.06 + index * 0.04 }}
      className={`rounded-2xl border p-5 ${
        chapter.hasContent ? "border-border/60 bg-card" : "border-dashed border-border/50 bg-card/40"
      }`}
    >
      <h2 className="font-serif text-lg text-card-foreground">{chapter.title}</h2>
      <div className={`mt-2 space-y-1.5 text-sm leading-relaxed ${chapter.hasContent ? "text-card-foreground" : "text-muted-foreground italic"}`}>
        {chapter.body.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      {chapter.table && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-max text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                {chapter.table.headers.map((h) => (
                  <th key={h} className="whitespace-nowrap py-1.5 pr-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chapter.table.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/30 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="whitespace-nowrap py-1.5 pr-4 text-card-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.article>
  );
}
