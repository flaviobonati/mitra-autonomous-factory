# TOPICOS-ARQUIVO-COORDINATOR

Base usada: `/opt/mitra-factory/coordenador/coordinator.md`.

Arquivo novo: `prompts/coordinator.md`.

Metodo aplicado: o arquivo base foi duplicado e recebeu apenas adicoes pontuais para encaixar na nova fabrica autonoma. Nenhum topico do arquivo base foi removido.

## Checklist de preservacao

| Topico do arquivo base | Decisao | Estado no arquivo novo |
|---|---|---|
| `REGRA ZERO — ANTES DE TUDO` | MANTER | Preservado |
| `1. Quem sou eu` | MANTER | Preservado |
| `2. O que é o Mitra` | MANTER | Preservado |
| `3. Meu objetivo (e o porquê)` | MANTER | Preservado |
| `As 4 dimensoes de qualidade` | MANTER | Preservado |
| `4. Minha fábrica (onboarding do Usuário)` | MANTER | Preservado |
| `5. O sistema cérebro (Autonomous Factory)` | ALTERAR | Preservado e ampliado com artefatos estruturados |
| `Tabelas centrais` | MANTER | Preservado |
| `Regras operacionais de banco` | MANTER | Preservado |
| `Status do PIPELINE` | ALTERAR | Preservado e ampliado com modos de entrada/escopo |
| `6. Ciclo de vida de um sistema` | MANTER | Preservado |
| `7. Sub-agentes` | ALTERAR | Preservado e ampliado com QA splitado |
| `Prompt completo ou NÃO spawna` | MANTER | Preservado |
| `8. Principios inviolaveis` | MANTER | Preservado |
| `9. Fluxo Dev⇄QA` | MANTER | Preservado |
| `10. Pesquisa: o que eu cobro` | ALTERAR | Preservado e ampliado com saida estruturada |
| `11. Dev: o que eu cobro` | ALTERAR | Preservado e ampliado com `dev_handoff.json` |
| `12. QA: o que eu cobro` | ALTERAR | Preservado e ampliado com consolidacao do QA splitado |
| `13. Checks obrigatorios antes de spawnar QA` | MANTER | Preservado |
| `14. Crons` | MANTER | Preservado |
| `15. Mensagens do Usuario (Telegram)` | MANTER | Preservado |
| `16. Spawn patterns` | MANTER | Preservado |
| `17. SDK: cheatsheet pratico` | MANTER | Preservado |
| `18. Evitar a todo custo` | MANTER | Preservado |
| `19. Aprendizados por fase` | MANTER | Preservado |
| `19.6 Re-Round — Fluxo` | MANTER | Preservado |
| `20. Filosofia` | MANTER | Preservado |
| `21. Quando iniciar uma sessao` | MANTER | Preservado |

## Alteracoes feitas

| Item | Mudanca | Motivo |
|---|---|---|
| Artefatos estruturados | Adicionada secao com `personas.json`, `entities.json`, `data_flows.json`, `user_stories.json`, `e2e_journeys.json`, `dev_handoff.json` | O Coordenador precisa tratar JSONs como contrato operacional |
| Modos de entrada | Adicionada regra para `market_replication`, `interactive_discovery`, `document_driven` | Evita improviso por tipo de intake |
| Escopo | Adicionada regra de que `Scope Discovery & Construction` termina com artefatos aprovados | Evita fase artificial de aprovacao separada |
| QA splitado | Adicionados papeis de `qa-core`, `qa-horizontal`, `qa-story`, `qa-consolidator` | A nova fabrica valida horizontal, historias e consolidacao separadamente |
| Saida estruturada do Pesquisador | Adicionada secao `10.6` | Pesquisa deve produzir artefatos testaveis, nao apenas texto |
| Dev handoff | Adicionado requisito de `dev_handoff.json` | QA e Coordenador nao devem adivinhar estado da entrega |
| QA consolidado | Adicionada regra para consolidator provar cobertura | Relatorio parcial nao pode virar aprovacao final sem cobertura |

## Checagem final

- O arquivo novo tem 1304 linhas; o arquivo base tinha 1255 linhas.
- O aumento vem das novas secoes/adicoes acima.
- O diff contra o arquivo base mostra apenas adicoes.
- Nao ha topico marcado como faltante.
- O `coordinator.md` esta pronto como segundo prompt migrado pelo metodo correto.
