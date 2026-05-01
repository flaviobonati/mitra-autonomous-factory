# New Run Readiness Gates

Este documento define a barra minima antes de iniciar um novo run coordenado pela fabrica apos uma execucao anterior com falhas de canonizacao, escopo e QA.

## 0. Sistema da fabrica e next mission

O coordenador so pode ser considerado integrado quando cada `factoryctl exchange` gerar, no Sistema Central 46955:

- linha em `COORDINATOR_EXCHANGES` com `PAYLOAD_JSON` e `RESPONSE_JSON`;
- linha em `EXECUTION_ROUNDS` com `ACTOR_FROM`, `ACTOR_TO`, `INPUT_JSON`, `OUTPUT_JSON`, `NEXT_MISSION_JSON`, `INPUT_AT` e `OUTPUT_AT`;
- `EXECUTIONS.NEXT_MISSION` atualizado com o titulo legivel da proxima missao retornada pelo gateway;
- `EXECUTIONS.NEXT_MISSION_JSON` atualizado com o objeto completo `next_mission` retornado pelo gateway, incluindo `mission_type`, `mission_instruction`, `next_event`, `required_outputs`, `allowed_actions`, `forbidden_actions`, `success_criteria` e `spawn_contract` quando existir;
- UI publicada mostrando a rodada no card da execucao.

Sem esses cinco pontos, nao declarar que o coordenador esta escrevendo no sistema.

## 1. Coordenador persistente

Um Coordenador de run real deve rodar em sessao persistente, por exemplo `tmux`, e nao como chamada curta que encerra apos uma unica resposta.

Antes de liberar um novo run, confirmar:

- sessao persistente criada com nome unico do coordenador;
- `workdir` proprio em `/opt/mitra-factory/coordinators/<coordinator_code>`;
- pacote canonico copiado para o `workdir`: `COORDINATOR.md`, prompts de personas, `docs/context-delivery.md`, `docs/new-run-readiness-gates.md` e `docs/initial_scope_artifact_templates.md`;
- nenhuma instrucao de operador, depuracao ou correcao manual salva como prompt adicional do Coordenador;
- variaveis `FACTORY_REFRESH_LIVE_STATE=0` e `FACTORY_AUTO_DEPLOY_LIVE_STATE=0` definidas para impedir build/deploy acidental a cada exchange;
- primeira mensagem enviada ao Coordenador contem apenas identificadores de execucao, gateway e a mensagem natural do Usuario.

Se o Coordenador errar o fluxo, encerrar o run, corrigir regra canonica, gateway, schema, UI ou pacote de contexto, e iniciar novo run limpo. Nao corrigir o Coordenador vivo por fora.

## 2. Intake sem contaminacao

Quando houver usuario-simulador, ele deve enviar apenas a frase natural que o usuario real diria.

Proibido:

- mandar checklist interno ao coordenador;
- explicar arquitetura da fabrica;
- dizer ao coordenador qual evento registrar;
- assumir papel do coordenador, pesquisador, Dev ou QA;
- mandar correcao operacional para um Coordenador vivo quando a falha pertence ao processo geral.

Se o coordenador falhar, a correcao deve virar prompt, regra de gateway, schema, UI ou persistencia. Nao corrigir a execucao por fora como se fosse comportamento do coordenador.

## 3. Escopo de incumbente

Pedido como "tipo X", "igual X", "replica X" ou "incumbente X" significa cobertura completa por default.

Para um incumbente explicito, `intake_classified` deve registrar:

- `input_mode = market_replication`;
- `scope_strategy = replicate_incumbent`;
- `benchmark` ou `incumbent` preenchido;
- `follow_up_required = false`, salvo ambiguidade bloqueante real.

O proximo `next_mission` esperado e `research`, com `spawn_contract.target_agent = researcher`. Nao criar `scope_questions.md`, `draft_personas.json` ou `mandatory_story_checklist.json` antes da pesquisa do incumbente.

O pesquisador precisa entregar matriz feature-fonte-tag e cobertura de historias/criterios/fluxos para todas as features MUST identificadas. Qualquer feature removida precisa aparecer como exclusao negociada e aprovada pelo usuario.

## 4. QA Horizontal 10/10/10/10

QA Horizontal nao pode aprovar com texto livre.

O report de aprovacao deve conter `qa_core_checklist_execution` com 100% dos itens obrigatorios marcados como `PASS` ou `NA_WITH_REASON`, cada um com evidencia concreta.

`qa_result.schema.json` exige `qa_core_checklist_execution`. Um resultado horizontal sem essa matriz nao e um resultado parseavel de aprovacao, mesmo se o texto do agente disser 10/10/10/10.

O gateway deve bloquear `qa_approved` horizontal quando:

- o report nao for parseavel;
- `qa_core_checklist_execution` estiver ausente ou vazio;
- item obrigatorio estiver sem `check_id`;
- item obrigatorio estiver `FAIL`, sem status valido ou sem evidencia suficiente;
- score informado for diferente de 10 em qualquer dimensao.

Retest herda a definicao original do bug: `origin_report`, `origin_failed_checks` e `evidence_by_check`. Nao basta provar o titulo resumido do bug.

## 5. QA Story deterministico

QA Story nao pode ser escopado por escolha do Coordenador.

Depois de QA Horizontal 10/10/10/10, o `next_mission` deve exigir:

- `qa_story_batch_plan.json` persistido antes do primeiro spawn;
- lote fixo de 5 historias, exceto o ultimo quando houver sobra menor;
- ordem exatamente igual a `artifacts/user_stories.json`;
- Batch 01 = historias 1-5, Batch 02 = 6-10, Batch 03 = 11-15 e assim por diante;
- `spawn_contract` com `batch`, `story_index_start`, `story_index_end`, `story_ids`, `journey_ids`, `acceptance_criteria_ids`, prompt, tmux, stdout e heartbeat.
- execucao historia por historia, em ordem;
- se uma historia ficar abaixo de 100%, QA deve completar essa mesma jornada quando tecnicamente possivel, consolidar todos os gaps dela e continuar para as demais historias do batch; parar antes das historias restantes somente se houver bloqueio tecnico que impeça executa-las;
- `gap_to_dev[]` obrigatorio quando houver proximidade, accuracy ou gap abaixo de 100.

O gateway deve bloquear `qa_approved` de QA Story quando o evento nao declarar `batch`, `total_batches` e referencia ao plano deterministico. Sem isso, nao consolidar QA nem abrir release candidate.

O gateway tambem deve bloquear resultado/aprovacao de QA Story quando o report nao provar a jornada:

- `story_accuracy_percent = 100` por historia;
- `journey_proximity_percent = 100` por historia;
- comparacao explicita contra `e2e_journeys.json`;
- `step_results.length = executed_steps_count`;
- quando `expected_steps_count != executed_steps_count`, `step_count_reconciliation` ou `extra_steps[]`/`missing_steps[]` explica se o plano canonico estava incompleto ou se a implementacao divergiu;
- buglist tecnica nao e obrigatoria para falha de jornada/incumbente, mas toda historia abaixo de 100% precisa retornar com `bugs_found[]`, `journey_gaps[]` ou `gap_to_dev[]`;
- `step_results[]` completo;
- `action_results[]` para cada passo, com DOM verificado;
- `screenshot_after_action_path` PNG apos cada acao Playwright relevante.
- `data_flow_evidence[]` cobrindo todos os `data_flow_ids` da historia, com `expects_database_or_persistence_change`, `expected_database_or_persistence_change`, leitura antes/depois no banco/SDK/localStorage e evidencia do efeito na UI.

Resumo `19/19 PASS` nao basta se esses campos estiverem ausentes.

Quando o QA Story encontra gap real com evidencia suficiente, ele deve continuar executando as demais historias atribuidas ao mesmo batch quando tecnicamente possivel. Somente depois de concluir o batch inteiro, o Coordenador deve registrar `qa_failed`, criar `dev_fix_story_prompt.md` a partir de todos os gaps consolidados do batch em `gap_to_dev[]`, spawnar Dev, retestar as historias falhadas e so entao continuar os batches seguintes.
