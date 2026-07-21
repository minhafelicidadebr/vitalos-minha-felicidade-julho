// TrailConclusionCard — conclusão da trilha: leve consigo (LDX-2 Fatia E).
// Oferece a carta-poema (LD-007) e a síntese técnica (LD-006) em PDF local.
//
// LD-007: nome é OPCIONAL e vive só neste componente (NONE persistence) — não
// é gravado, não é enviado a ninguém; a carta é expressão, não avaliação.
// LD-006: a síntese é educativa, carrega os disclaimers de responsabilidade
// técnica; nunca gera PGR nem atesta conformidade. PDFs por import dinâmico
// (jsPDF fora do bundle inicial), gerados 100% no cliente.

import { useState } from "react";
import {
  composeFarewellLetter,
  farewellLetterFilename,
  sanitizeName,
  type FarewellLetterBlocks,
} from "@/engine/learning/farewell-letter-engine";
import {
  buildTrailSynthesis,
  type TrailSynthesisInput,
} from "@/engine/learning/trail-synthesis-engine";

interface TrailConclusionCardProps {
  letterBlocks: FarewellLetterBlocks;
  synthesisInput: TrailSynthesisInput;
}

function nowLabel(): string {
  return new Date().toLocaleDateString("pt-BR");
}

function docId(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}`;
}

export function TrailConclusionCard({ letterBlocks, synthesisInput }: TrailConclusionCardProps) {
  // Nome opcional — estado LOCAL apenas, some ao sair da página. Nunca persiste.
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<null | "carta" | "sintese">(null);

  async function downloadLetter() {
    setBusy("carta");
    try {
      const cleanName = sanitizeName(name);
      const letter = composeFarewellLetter(letterBlocks, { name: cleanName ?? undefined });
      const { downloadFarewellLetterPdf } = await import("@/lib/pdf/farewell-letter-pdf");
      downloadFarewellLetterPdf(
        letter,
        { documentId: docId("carta-voz-segura"), generatedAtLabel: nowLabel() },
        farewellLetterFilename(cleanName),
      );
    } finally {
      setBusy(null);
    }
  }

  async function downloadSynthesis() {
    setBusy("sintese");
    try {
      const synthesis = buildTrailSynthesis(synthesisInput);
      const { downloadTrailSynthesisPdf } = await import("@/lib/pdf/trail-synthesis-pdf");
      downloadTrailSynthesisPdf(
        synthesis,
        { documentId: docId("sintese-voz-segura"), generatedAtLabel: nowLabel() },
        "sintese-tecnica-voz-segura.pdf",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Carta-poema (LD-007) */}
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <p className="text-sm font-medium text-card-foreground">Uma carta para levar consigo</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Uma carta-poema sobre a sua jornada de liderança. Composta de forma determinística, sem
          IA — é expressão artístico-educacional, não avaliação nem evidência. Se quiser, escreva um
          nome para a saudação; ele fica só nesta tela e não é gravado nem enviado a ninguém.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="vs-letter-name" className="sr-only">
            Nome para a saudação (opcional)
          </label>
          <input
            id="vs-letter-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (opcional)"
            maxLength={40}
            autoComplete="off"
            className="min-h-11 flex-1 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={downloadLetter}
            disabled={busy !== null}
            className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
          >
            {busy === "carta" ? "Gerando…" : "Baixar carta-poema (PDF)"}
          </button>
        </div>
      </div>

      {/* Síntese técnica (LD-006) */}
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <p className="text-sm font-medium text-card-foreground">Síntese técnica da trilha</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Um resumo do mecanismo, das fontes (com o que autorizam afirmar) e do que a trilha
          praticou — para apoiar o seu programa. É documento educativo:{" "}
          <strong>não gera o PGR, não atesta conformidade com a NR-1 e não substitui profissional
          habilitado</strong>.
        </p>
        <button
          type="button"
          onClick={downloadSynthesis}
          disabled={busy !== null}
          className="mt-3 min-h-11 rounded-xl border border-border/70 bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
        >
          {busy === "sintese" ? "Gerando…" : "Baixar síntese técnica (PDF)"}
        </button>
      </div>
    </div>
  );
}
