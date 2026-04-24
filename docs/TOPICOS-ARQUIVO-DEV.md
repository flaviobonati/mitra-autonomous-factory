# TOPICOS-ARQUIVO-DEV

Base usada: `/opt/mitra-factory/coordenador/sub-agents/dev/dev.md`.

Arquivo novo: `prompts/dev.md`.

Metodo aplicado: o arquivo base foi duplicado e recebeu apenas adicoes pontuais para encaixar na nova fabrica autonoma. Nenhum topico do arquivo base foi removido.

## Checklist de preservacao

| Topico do arquivo base | Decisao | Estado no arquivo novo |
|---|---|---|
| `0. Antes de escrever uma linha de codigo` | MANTER | Preservado |
| `0.1. System Prompt Oficial do Mitra` | MANTER | Preservado |
| `0.2. Este arquivo (dev.md)` | MANTER | Preservado |
| `1. Meta: 10/10/10/10 ou reprovado` | ALTERAR | Preservado e ampliado com medicao por historia/gaps |
| `2. Entrada (briefing do Coordenador)` | ALTERAR | Preservado e ampliado com artefatos estruturados |
| `2.1 Entrega obrigatoria: questionamentos.md` | MANTER | Preservado |
| `3. Montando o ambiente - Template Mitra local` | MANTER | Preservado |
| `3.1. Onde mora o template` | MANTER | Preservado |
| `3.2. O que o Coordenador ja monta pra voce ANTES de te spawnar` | ALTERAR | Preservado e ampliado com contrato operacional |
| `3.3. Quando usar pullFromS3Mitra` | MANTER | Preservado |
| `3.3. Logos Mitra` | MANTER | Preservado |
| `3.4. Frontend .env` | MANTER | Preservado |
| `3.5. Estrutura de pastas` | MANTER | Preservado |
| `3.6. Protecao anti-contaminacao do banco da fabrica` | MANTER | Preservado |
| `4. Storytelling guia o sistema` | MANTER | Preservado |
| `4.1. Ordem das historias` | MANTER | Preservado |
| `4.2. Jornada Click-a-Click` | ALTERAR | Preservado e alinhado ao `e2e_journeys.json` |
| `4.3. Buglist` | MANTER | Preservado |
| `5. Processo = Wizard, nunca checklist separado` | MANTER | Preservado |
| `5.1. Wizards com CRUDs completos` | MANTER | Preservado |
| `6. CRUD COMPLETO em toda entidade-negocio` | MANTER | Preservado |
| `7. Features tem que FUNCIONAR` | MANTER | Preservado |
| `7.1. Botao Carregar Dados de Exemplo` | MANTER | Preservado |
| `8. Dados de exemplo em 100% das tabelas` | MANTER | Preservado |
| `9. Workers vs Integracoes vs Funcionalidades Deterministicas` | MANTER | Preservado |
| `9.1. Workers - NAO implementar` | MANTER | Preservado |
| `9.2. Funcionalidade de codigo - IMPLEMENTAR` | MANTER | Preservado |
| `10. Server Functions: tipo correto SEMPRE` | MANTER | Preservado |
| `10.1. listRecordsMitra retorna content` | MANTER | Preservado |
| `10.2. Datas voltam como epoch ms` | MANTER | Preservado |
| `10.3. Server Functions PUBLICAS` | MANTER | Preservado |
| `11. Autenticacao` | MANTER | Preservado |
| `11.1. Bugs conhecidos do template` | MANTER | Preservado |
| `11.2. Usuarios Temporarios` | MANTER | Preservado |
| `12. Design Tokens da Fabrica` | MANTER | Preservado |
| `12.1. Tipografia` | MANTER | Preservado |
| `12.2. Espacamento e Padding` | MANTER | Preservado |
| `12.3. Cards e superficies` | MANTER | Preservado |
| `12.4. Tags e badges` | MANTER | Preservado |
| `12.5. Icones` | MANTER | Preservado |
| `12.6. Graficos` | MANTER | Preservado |
| `12.7. Regras absolutas` | MANTER | Preservado |
| `12.8. Light/Dark mode` | MANTER | Preservado |
| `12.9. Controles custom` | MANTER | Preservado |
| `12.10. Layout - Sidebar fixa` | MANTER | Preservado |
| `12.11. Listas estruturadas + cards alternados` | MANTER | Preservado |
| `12.12. Datas formato BR` | MANTER | Preservado |
| `12.13. Acentuacao correta` | MANTER | Preservado |
| `12.14. Titulo visivel no header` | MANTER | Preservado |
| `12.15. Nomenclatura do sistema` | MANTER | Preservado |
| `12.16. Terminologia moderna` | MANTER | Preservado |
| `12.16.1. Proibido PDF para demonstracao de dados` | MANTER | Preservado |
| `12.17. Zero mencoes falsas a workers` | MANTER | Preservado |
| `12.18. Zero modais alert/confirm nativos` | MANTER | Preservado |
| `13. Sparkle` | MANTER | Preservado |
| `14. Zero assets faltando` | MANTER | Preservado |
| `15. Smoke test backend` | MANTER | Preservado |
| `16. Deploy via deployToS3Mitra` | MANTER | Preservado |
| `16.1. Estrutura do tar.gz` | MANTER | Preservado |
| `16.2. Anti-deploy cruzado` | MANTER | Preservado |
| `16.3. Anti-deploy obsoleto` | MANTER | Preservado |
| `16.4. Chamada da SDK` | MANTER | Preservado |
| `16.5. Validacao pos-deploy` | MANTER | Preservado |
| `17. Checklist pre-entrega` | MANTER | Preservado |
| `18. Guia do Testador` | MANTER | Preservado |
| `19. Output final ao Coordenador` | ALTERAR | Preservado e ampliado com `dev_handoff.json` |
| `Regra final` | MANTER | Preservado |

## Alteracoes feitas

| Item | Mudanca | Motivo |
|---|---|---|
| Meta 10/10/10/10 | Adicionada medicao por `story_accuracy_percent` e gaps (`story_gap`, `ui_gap`, `data_gap`, `artifact_gap`) | A nova fabrica precisa validar aderencia por historia e nao apenas qualidade geral |
| Entrada do Dev | Adicionados `personas.json`, `entities.json`, `data_flows.json`, `user_stories.json`, `e2e_journeys.json` | O sistema central passa a persistir escopo em artefatos estruturados |
| Contrato com a nova fabrica | Criada secao `2.0` | Define precedencia e tratamento de conflito entre narrativa e JSON |
| Contrato operacional | Criada secao `3.2.1` | Evita improviso de workspace, project, paths, credenciais e outputs |
| Jornada Click-a-Click | Adicionada regra de alinhamento com `e2e_journeys.json` | Evita duas verdades de jornada entre Dev e QA |
| Output final | Adicionado `dev_handoff.json` | Permite handoff estruturado para Coordenador e QA |
| Handoff estruturado | Criada secao `19.1` com schema minimo | Reduz dependencia de leitura subjetiva de relatorio humano |

## Checagem final

- O arquivo novo tem 1018 linhas; o arquivo base tinha 967 linhas.
- O aumento vem das novas secoes/adicoes acima.
- Nao ha topico marcado como faltante.
- Nao ha recomendacao pendente de reinclusao neste arquivo.
- O `dev.md` esta pronto como primeiro prompt migrado pelo metodo correto.
