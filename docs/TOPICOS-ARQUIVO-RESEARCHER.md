# TOPICOS-ARQUIVO-RESEARCHER

Base usada: `/opt/mitra-factory/coordenador/sub-agents/pesquisador/researcher.md`.

Arquivo novo: `prompts/researcher.md`.

Metodo aplicado: o arquivo base foi duplicado e recebeu apenas uma secao nova para a saida estruturada da nova fabrica. Nenhum topico do arquivo base foi removido.

## Checklist de preservacao

| Topico do arquivo base | Decisao | Estado no arquivo novo |
|---|---|---|
| `O que Retornar` | MANTER | Preservado |
| `1. INCUMBENTE` | MANTER | Preservado |
| `2. SISTEMAS_SUBSTITUI` | MANTER | Preservado |
| `3. POTENCIAL_MERCADO` | MANTER | Preservado |
| `4. TICKET_MEDIO` | MANTER | Preservado |
| `5. WORKERS_IDENTIFICADOS` | MANTER | Preservado |
| `6. WORKERS_DESCRICAO` | MANTER | Preservado |
| `7. FEATURES` | MANTER | Preservado |
| `8. HISTORIAS_USUARIO` | MANTER | Preservado |
| Storytelling em primeira pessoa | MANTER | Preservado |
| Ordem Implantador, Mantenedor, Usuarios finais | MANTER | Preservado |
| Persona Implantador/Configurador | MANTER | Preservado |
| Persona Mantenedor/Administrador | MANTER | Preservado |
| Personas usuarios finais | MANTER | Preservado |
| `9. FLUXOS DE DADOS` | MANTER | Preservado |
| Entidades de dados | MANTER | Preservado |
| Cadeias de processo end-to-end | MANTER | Preservado |
| Mapeamento Feature -> Cadeia | MANTER | Preservado |
| Checklist obrigatorio da secao 9 | MANTER | Preservado |
| Validacao de completude | MANTER | Preservado |
| Metodologia | MANTER | Preservado |
| Filtro de Viabilidade Mitra | MANTER | Preservado |
| Workers documentar mas nao incluir nas historias | MANTER | Preservado |
| Regras finais | MANTER | Preservado |

## Alteracoes feitas

| Item | Mudanca | Motivo |
|---|---|---|
| Saida estruturada | Adicionada secao `SAÍDA ESTRUTURADA DA NOVA FÁBRICA` | A nova fabrica precisa extrair/persistir `personas.json`, `entities.json`, `data_flows.json`, `user_stories.json`, `e2e_journeys.json` |
| Consistencia entre artefatos | Adicionada regra de cruzamento entre feature MUST, historia, fluxo, jornada e persona | Evita escopo narrativo sem artefato testavel |

## Checagem final

- O arquivo novo tem 285 linhas; o arquivo base tinha 273 linhas.
- O diff contra o arquivo base mostra apenas a nova secao de saida estruturada.
- Nao ha topico do pesquisador base removido.
- O `researcher.md` esta pronto como prompt migrado pelo metodo correto.
