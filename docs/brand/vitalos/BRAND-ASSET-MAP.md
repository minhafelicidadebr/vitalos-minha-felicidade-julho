# Mapa de ativos de marca — VitalOS™

**Data:** 2026-07-15 · **Fonte:** ativos oficiais fornecidos pelo founder (2 PNGs, alta resolução, fundo transparente).

## Originais (preservados, nunca editados)

| Arquivo | Dimensão | Formato | Transparência | Peso | Bounding box do conteúdo | Cor do texto |
|---|---|---|---|---|---|---|
| `docs/brand/vitalos/source/logo-horizontal-original.png` | 1500×500 | PNG/RGBA | sim | 145.1 KB | (55,74)–(1460,424) → 1405×350, margens l55 t74 r40 b76 | branco (uso: fundo escuro) |
| `docs/brand/vitalos/source/logo-horizontal-light-original.png` | 2499×833 | PNG/RGBA | sim | 317.5 KB | (92,123)–(2433,705) → 2341×582, margens l92 t123 r66 b128 | verde-escuro ~#1A5A43 (uso: fundo claro) |
| `docs/brand/vitalos/source/simbolo-vitalos-original.png` | 625×625 | PNG/RGBA | sim | 224.4 KB | (74,14)–(547,599) → 473×585, margens l74 t14 r78 b26 | — (sem texto) |

O símbolo original é 625×625 — **não** o arquivo de 125×125 mencionado como
possível no pacote da marca; nenhuma ampliação de baixa resolução foi
necessária ou usada.

## Versões web (`public/brand/vitalos/`)

Ver `public/brand/vitalos/README.md` para a tabela de geração.

## Onde cada ativo é usado

| Ativo | Componente | Rota | Substitui |
|---|---|---|---|
| `vitalos-logo-horizontal-on-light.png` + `vitalos-logo-horizontal-on-dark.png` (par `dark:hidden`/`hidden dark:block`, troca via a classe `.dark` já usada por `ThemeToggle.tsx`) | cabeçalho da landing (`src/routes/index.tsx`, dentro do `<Link to="/" aria-label="Programa VitalOS — página inicial">`) | `/` | o bloco `<VitalOsLogo>` (SVG de 4 pétalas) + texto "Programa VitalOS™ / Felicidade e Crescimento para Todos" em duas linhas |
| `vitalos-mark-512.png` (mesma imagem nos dois temas — sem texto, não precisa de variante) | card IVO (`IvoBrandMark` em `src/features/landing/components/FourLensesSection.tsx`) | `/` (seção `#solucao`) | o SVG circular com texto "IVO" no centro |

Ambos os componentes continuam existindo — só o ícone/logo interno muda,
título, descrição, lentes e layout do card IVO são preservados.

## Fora de escopo desta onda

Nenhum outro uso do `VitalOsLogo` SVG (ex. `AppShell.tsx`, `DemoGate.tsx`)
foi tocado — o pedido restringe a troca ao cabeçalho da landing e ao card
IVO. Favicon, redes sociais e outros pontos de marca ficam para uma onda
futura, se solicitado.
