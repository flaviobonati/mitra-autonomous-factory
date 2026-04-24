# TOPICOS-ARQUIVO-QA

Base usada: `/opt/mitra-factory/coordenador/sub-agents/qa/qa.md`.

Arquivos novos:

- `prompts/qa-core.md`
- `prompts/qa-horizontal.md`
- `prompts/qa-story.md`
- `prompts/qa-consolidator.md`

Metodo aplicado: o QA base monolitico foi duplicado integralmente em `qa-core.md`. Os prompts `qa-horizontal`, `qa-story` e `qa-consolidator` permanecem como camadas finas que herdam o core e especializam a execucao.

## Checklist de preservacao

| Topico do arquivo base | Decisao | Estado no arquivo novo |
|---|---|---|
| Por que o QA existe e precisa ser confiavel | MANTER | Preservado em `qa-core.md` |
| Modo de operacao `COMPLETO`/`FOCADO` | MANTER | Preservado em `qa-core.md` |
| Usa o sistema, nao fotografa | MANTER | Preservado em `qa-core.md` |
| Nota por formula, zero subjetividade | MANTER | Preservado em `qa-core.md` |
| Design | MANTER | Preservado em `qa-core.md`; especializacao em `qa-horizontal.md` |
| UX por persona | MANTER | Preservado em `qa-core.md`; parte especializada em `qa-story.md` |
| Aderencia por features MUST | MANTER | Preservado em `qa-core.md`; parte especializada em `qa-story.md` |
| FluxoDados end-to-end | MANTER | Preservado em `qa-core.md`; parte especializada em `qa-story.md` |
| Media | MANTER | Preservado em `qa-core.md`; consolidacao final em `qa-consolidator.md` |
| Regras A-H | MANTER | Preservadas em `qa-core.md` |
| Download real de anexos | MANTER | Preservado em `qa-core.md`; reforcado em `qa-story.md` |
| Dados de comunicacao/mensagens | MANTER | Preservado em `qa-core.md`; reforcado em `qa-story.md` |
| Idempotencia de botoes criticos | MANTER | Preservado em `qa-core.md`; reforcado em `qa-story.md` |
| Sparkle | MANTER | Preservado em `qa-core.md`; especializado em `qa-horizontal.md` |
| Todo botao tem funcionalidade real | MANTER | Preservado em `qa-core.md`; especializado em `qa-horizontal.md` |
| Logout | MANTER | Preservado em `qa-core.md`; especializado em `qa-horizontal.md` |
| Menu leva a conteudo real | MANTER | Preservado em `qa-core.md`; especializado em `qa-horizontal.md` |
| Refinamento visual | MANTER | Preservado em `qa-core.md`; especializado em `qa-horizontal.md` |
| Processo mecanico com Playwright | MANTER | Preservado em `qa-core.md` |
| Inventario de telas e botoes | MANTER | Preservado em `qa-core.md`; especializado em `qa-horizontal.md` |
| Cobertura de botoes | MANTER | Preservado em `qa-core.md`; especializado em `qa-horizontal.md` |
| CRUD por tela | MANTER | Preservado em `qa-core.md`; reforcado em `qa-story.md` |
| Relatorio com cobertura visivel | MANTER | Preservado em `qa-core.md`; consolidado em `qa-consolidator.md` |
| Entrega textual/template | MANTER | Preservado em `qa-core.md`; `qa_report.md` preserva contrato humano |
| URL, rodada, notas, veredito | MANTER | Preservado em `qa-core.md`; consolidado em `qa-consolidator.md` |
| Personas/jornadas | MANTER | Preservado em `qa-core.md`; batches em `qa-story.md` |
| Fluxos de dados testados | MANTER | Preservado em `qa-core.md`; batches em `qa-story.md` |
| Features MUST executadas | MANTER | Preservado em `qa-core.md`; batches em `qa-story.md` |
| Seguranca RBAC | MANTER | Preservado em `qa-core.md`; reforcado em `qa-story.md` |
| Icones/assets | MANTER | Preservado em `qa-core.md`; especializado em `qa-horizontal.md` |
| Bugs encontrados | MANTER | Preservado em `qa-core.md`; `bug_list.json` nas camadas |
| Feedback pro Dev | MANTER | Preservado em `qa-core.md`; consolidado em `qa-consolidator.md` |
| Regra final | MANTER | Preservada em `qa-core.md` |

## Alteracoes feitas

| Item | Mudanca | Motivo |
|---|---|---|
| `qa-core.md` | Duplicado do QA base e acrescido de arquitetura splitada | Garante que nenhum rigor antigo foi perdido |
| `qa-horizontal.md` | Reforcado que herda `qa-core.md` e detalha checks transversais/output | Evita QA visual superficial |
| `qa-story.md` | Reforcado que herda `qa-core.md`, mede historias/gaps e valida artefatos reais | Evita historia aprovada por UI cosmetica |
| `qa-consolidator.md` | Reforcado que preserva o contrato textual antigo e consolida evidencias | Evita aprovacao final sem cobertura |

## Checagem final

- `qa-core.md` tem 493 linhas; o base tinha 483 linhas.
- O diff de `qa-core.md` contra o base mostra apenas a nova secao de arquitetura splitada.
- As camadas especializadas continuam pequenas e dependem explicitamente do core.
- Nao ha topico do QA base removido do contrato final.
