# RELATORIO-MIGRACAO-RESEARCHER

Base usada: `/opt/mitra-factory/coordenador/sub-agents/pesquisador/researcher.md`.

Arquivo gerado: `prompts/researcher.md`.

## Metodo

1. Dupliquei o pesquisador base.
2. Identifiquei a unica mudanca necessaria para a nova fabrica: saida estruturada.
3. Adicionei a secao nova sem alterar as secoes antigas.
4. Validei por diff contra o base.

## Mudancas aplicadas

| Area | O que mudou | Por que mudou |
|---|---|---|
| Saida estruturada | Adicionados `personas.json`, `entities.json`, `data_flows.json`, `user_stories.json`, `e2e_journeys.json` | O sistema central precisa de artefatos persistidos e testaveis |
| Regra de consistencia | Feature MUST deve cruzar com historia e, se tiver dados, com fluxo; jornada deve apontar para persona e historia | Evita features soltas e QA sem contrato verificavel |

## Checagem final

- Base: 273 linhas.
- Novo: 285 linhas.
- Nenhum topico antigo foi removido.
- As mudancas sao restritas ao contrato de artefatos da nova fabrica.
