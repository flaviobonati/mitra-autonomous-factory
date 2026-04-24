# RELATORIO-MIGRACAO-COORDINATOR

Base usada: `/opt/mitra-factory/coordenador/coordinator.md`.

Arquivo gerado: `prompts/coordinator.md`.

## Metodo

1. Dupliquei o arquivo base.
2. Listei os pontos que precisavam existir para a nova fabrica.
3. Apliquei apenas adicoes pontuais.
4. Comparei o arquivo novo contra o base.
5. Confirmei que o diff contem somente adicoes.

## Mudancas aplicadas

| Area | Decisao | O que mudou | Por que mudou |
|---|---|---|---|
| Sistema cerebro | ALTERAR | Adicionada secao `Artefatos estruturados da nova fábrica` | O Coordenador precisa consumir JSONs versionados como contrato operacional |
| Intake | ALTERAR | Adicionados modos `market_replication`, `interactive_discovery`, `document_driven` | A nova fabrica precisa classificar entrada sem improviso |
| Escopo | ALTERAR | Explicitado que `Scope Discovery & Construction` termina quando artefatos de escopo forem aprovados | Evita criar fase artificial separada de aprovacao |
| Sub-agentes QA | ALTERAR | Adicionada arquitetura `qa-core`, `qa-horizontal`, `qa-story`, `qa-consolidator` | O QA novo e splitado e o Coordenador precisa orquestrar cobertura |
| Pesquisa | ALTERAR | Criada secao `10.6 Saída estruturada de escopo na nova fábrica` | O Pesquisador deve gerar artefatos testaveis |
| Dev | ALTERAR | Adicionado requisito de `dev_handoff.json` | O Coordenador precisa decidir proxima fase sem depender de leitura subjetiva |
| QA | ALTERAR | Adicionada regra sobre relatorios por camada e consolidacao | Relatorio parcial nao substitui veredito final, exceto para falha bloqueante |

## Topicos preservados

Foram preservados os topicos do arquivo base: regra zero, identidade do coordenador, plataforma Mitra, objetivo, onboarding, sistema cerebro, tabelas, maquina de estado, ciclo de vida, sub-agentes, spawn completo, principios inviolaveis, fluxo Dev-QA, pesquisa, Dev, QA, checks pre-QA, crons, Telegram, spawn patterns, SDK, anti-padroes, aprendizados, Re-Round, filosofia e inicio de sessao.

## Checagem final

- Arquivo base: 1255 linhas.
- Arquivo novo: 1304 linhas.
- Resultado esperado: base preservado com 49 linhas novas.
- Nenhum topico do base foi removido.
- As mudancas sao restritas ao contrato da nova fabrica.
