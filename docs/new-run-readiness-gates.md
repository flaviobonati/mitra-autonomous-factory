# New Run Readiness Gates

Este documento define a barra minima antes de iniciar um novo run coordenado pela fabrica apos uma execucao anterior com falhas de canonizacao, escopo e QA.

## 0. Sistema da fabrica e next mission

O coordenador so pode ser considerado integrado quando cada `factoryctl exchange` gerar, no Sistema Central 46955:

- linha em `COORDINATOR_EXCHANGES` com `PAYLOAD_JSON` e `RESPONSE_JSON`;
- linha em `EXECUTION_ROUNDS` com `ACTOR_FROM`, `ACTOR_TO`, `INPUT_JSON`, `OUTPUT_JSON`, `NEXT_MISSION_JSON`, `INPUT_AT` e `OUTPUT_AT`;
- `EXECUTIONS.NEXT_MISSION` atualizado com a proxima missao retornada pelo gateway;
- UI publicada mostrando a rodada no card da execucao.

Sem esses quatro pontos, nao declarar que o coordenador esta escrevendo no sistema.

## 1. Intake sem contaminacao

Quando o meta-agent estiver simulando usuario, ele deve enviar apenas a frase natural que o usuario real diria.

Proibido:

- mandar checklist interno ao coordenador;
- explicar arquitetura da fabrica;
- dizer ao coordenador qual evento registrar;
- assumir papel do coordenador, pesquisador, Dev ou QA.

Se o coordenador falhar, a correcao deve virar prompt, regra de gateway, schema, UI ou persistencia. Nao corrigir a execucao por fora como se fosse comportamento do coordenador.

## 2. Escopo de incumbente

Pedido como "tipo X", "igual X", "replica X" ou "incumbente X" significa cobertura completa por default.

O pesquisador precisa entregar matriz feature-fonte-tag e cobertura de historias/criterios/fluxos para todas as features MUST identificadas. Qualquer feature removida precisa aparecer como exclusao negociada e aprovada pelo usuario.

## 3. QA Horizontal 10/10/10/10

QA Horizontal nao pode aprovar com texto livre.

O report de aprovacao deve conter `qa_core_checklist_execution` com 100% dos itens obrigatorios marcados como `PASS` ou `NA_WITH_REASON`, cada um com evidencia concreta.

O gateway deve bloquear `qa_approved` horizontal quando:

- o report nao for parseavel;
- `qa_core_checklist_execution` estiver ausente ou vazio;
- item obrigatorio estiver sem `check_id`;
- item obrigatorio estiver `FAIL`, sem status valido ou sem evidencia suficiente;
- score informado for diferente de 10 em qualquer dimensao.

Retest herda a definicao original do bug: `origin_report`, `origin_failed_checks` e `evidence_by_check`. Nao basta provar o titulo resumido do bug.
