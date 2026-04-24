# RELATORIO-MIGRACAO-DEV

## Status

Arquivo base usado:
- `/opt/mitra-factory/coordenador/sub-agents/dev/dev.md`

Arquivo novo:
- `prompts/dev.md`

Metodo aplicado:
1. duplicar o arquivo base
2. alterar em cima do base
3. registrar cada mudanca necessaria
4. preservar todos os topicos existentes

## Resultado

O `prompts/dev.md` novo preserva o arquivo base antigo e adiciona somente os pontos necessarios para a nova fabrica.

Linhas:
- base: 967
- novo: base + pequenas adicoes da nova fabrica

## Mudancas Aplicadas

| Item | Decisao | O que mudou | Por que mudou |
|---|---|---|---|
| Meta `10/10/10/10` | ALTERAR | Adicionado que a nova fabrica tambem mede `story_accuracy_percent` e gaps (`story_gap`, `ui_gap`, `data_gap`, `artifact_gap`) | A barra antiga continua valida, mas a nova fabrica mede aderencia por historia |
| Entrada do Dev | ALTERAR | Adicionados artefatos estruturados de escopo: `personas.json`, `entities.json`, `data_flows.json`, `user_stories.json`, `e2e_journeys.json` | O Dev agora pode receber escopo como JSON persistido pelo sistema central |
| Contrato com a nova fabrica | ALTERAR | Criada secao `2.0 Contrato com a nova fábrica` | Explicita como o Dev deve tratar os artefatos estruturados como fonte de verdade |
| Ambiguidade entre narrativa e JSON | ALTERAR | Adicionada regra para declarar conflito em `questionamentos_{sistema}_r{N}.md` | Evita o Dev escolher silenciosamente uma interpretacao |
| Ambiente/runtime | ALTERAR | Criada secao `3.2.1 Contrato operacional vindo do sistema central` | A nova maquina pode entregar runtime por JSON; o Dev nao deve adivinhar paths/projeto/credenciais |
| Jornada Click-a-Click | ALTERAR | Adicionado alinhamento com `e2e_journeys.json` quando existir | Evita criar uma segunda verdade de jornada |
| Output final | ALTERAR | Adicionado `dev_handoff.json` como item 10 do output final | O sistema central precisa de handoff estruturado para decidir a proxima missao |
| `dev_handoff.json` | ALTERAR | Criada secao `19.1 dev_handoff.json obrigatorio na nova fabrica` com schema minimo | O QA e o coordenador nao devem depender de leitura subjetiva do dev report |

## Topicos Mantidos

Todos os topicos do arquivo base foram mantidos no `prompts/dev.md`, incluindo:
- leitura do system prompt oficial do Mitra
- entrada do Dev
- `questionamentos.md`
- ambiente/template/runtime
- storytelling como contrato de implementacao
- ordem das historias
- jornada click-a-click
- buglist
- wizard vs checklist
- CRUD completo
- features funcionais
- dados de exemplo
- workers vs integracoes vs funcionalidades deterministicas
- server functions
- autenticacao
- usuarios temporarios
- design tokens
- sparkle
- assets/icons
- smoke test backend
- deploy via `deployToS3Mitra`
- validacao pos-deploy
- checklist pre-entrega
- guia do testador
- output final ao coordenador
- regra final

## Checagem Final

Mudancas feitas:
- somente adicoes pontuais para adaptar o base a nova fabrica
- nenhum topico do base foi removido
- nenhuma secao antiga foi reescrita de forma destrutiva

Risco restante:
- o `dev_handoff.json` pode precisar ter o schema refinado quando o sistema central do Mitra for desenhado
- o contrato operacional vindo do sistema central ainda depende da modelagem final do sistema da fabrica
