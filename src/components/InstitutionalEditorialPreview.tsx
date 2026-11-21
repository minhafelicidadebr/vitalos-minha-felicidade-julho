import { BookOpen, Waves, ClipboardList, RefreshCw, Info } from "lucide-react";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import { MeteEsgMatrixPreview } from "./MeteEsgMatrixPreview";
import { REPORT_INSTITUTION, SYNTHETIC_EDITORIAL, projectEditorialEvidence } from "@/lib/reports/institutional-editorial";

const ICON = { Mensurar: Waves, Educar: BookOpen, Transformar: ClipboardList, Evoluir: RefreshCw };
const panel = "min-w-0 space-y-3 rounded-xl border border-border bg-card p-4 sm:p-6";

/** Preview sintético separado. Não recebe sessão, métricas reais nem comando de emissão. */
export function InstitutionalEditorialPreview() {
  const report = SYNTHETIC_EDITORIAL;
  return (
    <article aria-label="Protótipo editorial institucional METE" className="editorial-report min-w-0 space-y-6 break-words">
      <header className={`${panel} editorial-cover`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-4"><VitalOSBrand surface="light" decorative={false} size="lg" /><p className="mt-2 text-sm text-[#1c2a24]">Plataforma e framework</p></div>
          <div className="rounded-lg bg-white p-4"><img src="/brand/instituto/instituto-full-original.png" width={1198} height={481} alt="Instituto Felicidade para Todos" className="h-auto w-full max-w-[240px] object-contain" /><p className="mt-2 text-sm text-[#1c2a24]">Organização idealizadora</p></div>
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Protótipo sintético · sem dados de clientes</p>
        <h2 className="font-serif text-3xl">Desenvolvimento organizacional em evidência</h2>
        <p className="text-lg">{report.organization}</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="font-semibold">Período ilustrativo</dt><dd>{report.period}</dd></div><div><dt className="font-semibold">Data de corte da fixture</dt><dd>{report.cutoff}</dd></div><div><dt className="font-semibold">Versão editorial</dt><dd>{report.version}</dd></div></dl>
      </header>
      <section className={panel} aria-label="Apresentação institucional">
        <h3 className="font-serif text-xl">Por que este relatório existe</h3>
        <p className="text-sm leading-relaxed">Este protótipo organiza evidências em Mensurar, Educar, Transformar e Evoluir para apoiar compreensão, prestação de contas e decisões de continuidade. Cada seção distingue o observado, a fonte, os limites e a próxima revisão. Os exemplos não representam resultados da organização logada.</p>
        <p className="text-sm leading-relaxed"><strong>Propósito do Instituto:</strong> {REPORT_INSTITUTION.mission} Esta missão descreve um propósito institucional; não é um resultado demonstrado pelo relatório.</p>
      </section>
      <section className={panel} aria-label="Guia de leitura do ciclo">
        <h3 className="font-serif text-xl">Como percorrer o ciclo</h3>
        <ol className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">{report.blocks.map((block, index) => { const Icon = ICON[block.axis]; return <li key={block.axis} className="space-y-2 rounded-lg border border-border p-3"><Icon aria-hidden="true" className="size-5 text-primary" /><strong>{index + 1}. {block.axis}</strong><p>{block.question}</p></li>; })}</ol>
        <p className="text-sm leading-relaxed">EU, NÓS, LIDERANÇA e ORGANIZAÇÃO são perspectivas do IVO. Q1 COPSOQ, Q2 FIB-T, Q3 PERMA+V e Q4 VIA-T são lentes anuais; não correspondem uma a uma às etapas deste ciclo. Nenhum mapeamento dimensional ou índice é aprovado por este protótipo.</p>
      </section>
      <section className={panel} aria-label="Síntese executiva sintética">
        <h3 className="font-serif text-xl">Síntese para a decisão</h3>
        <div className="grid gap-3 text-sm leading-relaxed sm:grid-cols-2"><div className="rounded-lg border border-border p-3"><h4 className="font-semibold">O que o exemplo mostra</h4><p>Execução registrada e oferta educativa parcial. Uma barreira de tempo permanece; não foi demonstrada eficácia.</p></div><div className="rounded-lg border border-border p-3"><h4 className="font-semibold">O que precisa ser decidido</h4><p>Combinar apoio e condições de continuidade; preparar avaliação adequada antes de concluir sobre resultados.</p></div></div>
      </section>
      {report.blocks.map(block => { const evidence = projectEditorialEvidence(block.evidence); const Icon = ICON[block.axis]; return (
        <section key={block.axis} className={panel} aria-label={`${block.axis} — análise sintética`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Exemplo sintético · {report.version}</p>
          <h3 className="flex items-center gap-2 font-serif text-xl"><Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />{block.axis}</h3>
          <p className="font-medium">{block.question}</p>
          <dl className="grid gap-3 text-sm leading-relaxed sm:grid-cols-2 [&>div]:min-w-0 [&>div]:rounded-lg [&>div]:border [&>div]:border-border [&>div]:p-3">
            <div><dt className="font-semibold">Estado · {evidence.state}</dt><dd className="mt-1">{evidence.label}<p className="mt-2">{evidence.text}</p></dd></div>
            <div><dt className="font-semibold">Fonte e limites</dt><dd className="mt-1">{evidence.source}<p className="mt-2">{evidence.limitation}</p></dd></div>
            <div><dt className="font-semibold">O que permite compreender</dt><dd className="mt-1">{block.interpretation}</dd></div>
            <div><dt className="font-semibold">Próxima revisão</dt><dd className="mt-1">{block.nextStep}</dd></div>
          </dl>
        </section>
      ); })}
      <section className={panel} aria-label="Contribuições ESG e limites">
        <h3 className="font-serif text-xl">Contribuições ESG: evidência antes da afirmação</h3>
        <p className="flex items-start gap-2 text-sm leading-relaxed"><Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />Não há impacto ESG demonstrado neste protótipo. Execução, participação e mudança observada são evidências diferentes; nenhuma delas isoladamente comprova causalidade, conformidade ou certificação.</p>
        <p className="text-sm">Não se atribuem notas E/S/G, dupla materialidade ou equivalências GRI/ODS automaticamente. Esses vínculos dependem de escopo e revisão humana.</p>
      </section>
      <MeteEsgMatrixPreview />
      <section className={panel} aria-label="Continuidade proposta no exemplo">
        <h3 className="font-serif text-xl">Compromissos propostos · não assumidos</h3>
        <div className="overflow-x-auto" role="region" aria-label="Tabela de continuidade sintética" tabIndex={0}>
          <table className="w-full min-w-[32rem] text-left text-sm leading-relaxed"><caption className="pb-3 text-left text-muted-foreground">Exemplo de acompanhamento, sem compromissos reais registrados.</caption><thead><tr>{["Próxima ação", "Papel", "Quando revisar", "Evidência esperada"].map(title => <th scope="col" key={title} className="p-2">{title}</th>)}</tr></thead><tbody>{report.commitments.map(item => <tr key={item.action} className="border-t border-border"><th scope="row" className="p-2 font-medium">{item.action}</th><td className="p-2">{item.role}</td><td className="p-2">{item.timing}</td><td className="p-2">{item.evidence}</td></tr>)}</tbody></table>
        </div>
      </section>
      <footer className={`${panel} text-sm leading-relaxed`}>
        <h3 className="font-serif text-xl">Expediente e rastreabilidade</h3>
        <p>VitalOS · versão editorial {report.version}. Dados exclusivamente sintéticos. Referências EDU-01 e ACAO-01 identificam fixtures, não estudos científicos. Participação não certifica aprendizagem e execução não comprova eficácia.</p>
        <p>{REPORT_INSTITUTION.name} · {REPORT_INSTITUTION.attribution}</p>
        <p>{REPORT_INSTITUTION.address}<br />{REPORT_INSTITUTION.phone} · {REPORT_INSTITUTION.instagram}</p>
        <a href={REPORT_INSTITUTION.site} className="inline-flex min-h-11 items-center underline underline-offset-2">Site do Instituto</a>
        <p className="text-muted-foreground">Contatos fornecidos pelo operador · referência {REPORT_INSTITUTION.version}. Titularidade e redação definitiva da emissão dependem de validação institucional. Sem alegação de asseguração, PDF/UA ou conformidade ESG.</p>
      </footer>
    </article>
  );
}
