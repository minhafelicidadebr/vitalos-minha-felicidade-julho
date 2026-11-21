export function InstitutionalAccessNotice({ status, onRetry }: { status: "unlinked" | "unavailable"; onRetry: () => void }) {
  const failed = status === "unavailable";
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <section aria-labelledby="institutional-access-title" className="w-full max-w-lg space-y-4 rounded-lg border border-border bg-card p-6 text-card-foreground">
        <h1 id="institutional-access-title" className="font-serif text-2xl">{failed ? "Não foi possível verificar seu acesso" : "Seu acesso institucional ainda não está vinculado"}</h1>
        <p role={failed ? "alert" : "status"} className="text-sm text-muted-foreground">
          {failed ? "A consulta da sua organização falhou. Tente novamente para continuar com seus dados institucionais."
            : "Você entrou na sua conta, mas não encontramos um vínculo com uma organização. Abra o convite recebido para concluir o acesso ou peça ao administrador institucional que verifique seu vínculo."}
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onRetry} className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Verificar novamente</button>
          <a href="/entrar" className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Voltar ao acesso</a>
        </div>
      </section>
    </main>
  );
}
