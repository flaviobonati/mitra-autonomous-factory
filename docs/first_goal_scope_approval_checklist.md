# Checklist do Primeiro Gol: Escopo Aprovado Sem Erros

Objetivo: chegar da primeira mensagem do usuario ate a aprovacao de escopo com zero erro de processo.

Este checklist vale para runs `market_replication` como o Stratws-like.

## 1. Nascimento do Coordenador

- O Coordenador nasce em Codex/GPT-5.5, nao Claude.
- O Coordenador recebe identidade unica: `coordinator_code`, `execution_code`, `workdir`, fase e sistema alvo.
- O Coordenador le o `COORDINATOR.md` inteiro antes de agir.
- O `COORDINATOR.md` aponta para o `prompts/coordinator.md` global e explica que ele e o contrato geral da persona.
- O bootstrap tecnico nao pode ser registrado como mensagem do usuario.
- A primeira mensagem real do usuario precisa estar claramente separada do prompt tecnico.

## 2. Contexto Gradual Pela Factory

- A cada escrita no Sistema Central, o gateway devolve exatamente o proximo passo.
- O Coordenador nao precisa inferir a fase: ele deve seguir o `next_mission`.
- Todo `event_type` permitido pelo prompt precisa existir no gateway.
- Se o Coordenador emitir evento conhecido, o gateway nao pode cair no default `intake`.
- Se o gateway devolver missao incompatível com o estado, o Coordenador bloqueia e registra conflito.

## 3. Modelo Mental: Mapa do Jogo + Pista da Missao

- O Coordenador precisa entender a fabrica como um jogo operacional.
- O `COORDINATOR.md` e o mapa geral: fases, papeis, gates, artefatos, limites e objetivo final.
- O retorno do Sistema Central e a pista da missao atual: o que fazer agora, nao uma descricao generica do processo.
- Cada `next_mission` precisa informar fase atual, acoes permitidas, acoes proibidas, outputs obrigatorios, evento a registrar e criterio de sucesso.
- O Coordenador nao deve procurar uma proxima fase escondida no repositorio se o Sistema Central ja devolveu a missao.
- Se a pista estiver ausente, vaga ou contraditoria, o Coordenador bloqueia em vez de improvisar.
- O Coordenador deve comparar o inventario de artefatos existentes com a missao recebida antes de agir.
- Gates funcionam como portas trancadas: pesquisa antes dos artefatos iniciais e Dev antes de escopo aprovado sao erros bloqueantes.

Sequencia minima esperada:

1. `user_message_received` -> `intake`
2. `intake_classified` ou `intake_answer` -> `scope_followup`
3. `artifact_delivery` ou `scope_artifact_created` completo -> `research`
4. `researcher_brief` -> `research_running`
5. `researcher_artifacts_delivery` ou `agent_output_received` -> `scope_canonicalization`
6. `scope_canonicalization_delivery` -> `scope_approval_request`
7. `scope_approved` -> `dev_preparation`
8. `scope_rejected` -> `scope_rework`

## 4. Intake

- O Coordenador registra a mensagem real do usuario.
- O Coordenador classifica `input_mode = market_replication` quando houver incumbente de mercado.
- Se a missao permitir defaults, ele nao faz follow-up desnecessario.
- Se faltar dado bloqueante, ele pergunta antes da pesquisa.
- Para o Stratws-like, o default e produto completo, nao mini-dashboard.

## 5. Artefatos Iniciais Antes do Pesquisador

- `scope_questions.md` existe.
- `draft_personas.json` existe.
- `mandatory_story_checklist.json` existe.
- Os artefatos sao registrados com `artifact_delivery` quando estiverem completos.
- `scope_artifact_created` pode existir como progresso parcial, mas nao substitui entrega completa se a pesquisa ainda nao estiver liberada.

## 6. Spawn do Pesquisador

- O Pesquisador recebe qual tipo de agente ele e.
- O Pesquisador recebe `researcher.md` completo como prompt de persona.
- O Pesquisador recebe tarefa exata, contexto do produto, input files e expected outputs.
- O Pesquisador e acionado somente pelo runner/modelo declarado na missao.
- Para runs GPT-5.5/Codex, o runner esperado e `backend/run-researcher.mjs`.
- E proibido usar `/opt/mitra-factory/scripts/run_agent.sh` se ele chamar Claude.
- E proibido trocar runner/modelo por fallback silencioso.
- Se o runner falhar, o Coordenador registra bloqueio ou reexecuta o mesmo runner corrigido; ele nao assume papel de Pesquisador.

## 7. Pesquisa do Pesquisador

- A pesquisa deve sair correta de primeira.
- Fonte oficial do incumbente e obrigatoria quando existir.
- Reviews e marketplaces sao fontes secundarias, nao substituem fonte oficial.
- Toda feature relevante tem tag `OFICIAL`, `REVIEW` ou `INFERIDO`.
- Toda inferencia tem justificativa.
- A pesquisa nao pode ser aprovada se faltar matriz feature x fonte x tag.
- A pesquisa nao pode transformar worker futuro em requisito do Dev core.
- A pesquisa precisa cobrir o incumbente e a adaptacao Mitra, sem copiar canais inviaveis literalmente.

## 8. Artefatos Canonicos de Escopo

Antes de falar com o usuario, precisam existir e estar registrados:

- `scope_state.json`
- `personas.json`
- `entities.json`
- `data_flows.json`
- `user_stories.json`
- `acceptance_criteria.json`
- `e2e_journeys.json`

Regras de consistencia:

- Toda feature MUST aparece em pelo menos uma historia.
- Toda feature MUST com dados aparece em pelo menos um fluxo.
- Toda historia tem criterios de aceite.
- Toda jornada E2E aponta para persona e historia.
- Toda jornada e click-a-click executavel por QA sem adivinhar.
- Toda entidade operacional aparece em entidade, historia ou fluxo.
- Lacunas restantes aparecem em `scope_state.json` com impacto e default.

## 9. Jornadas Obrigatorias

- Jornada de implantacao completa.
- Jornada de ingestao de cada fonte primaria.
- Jornada de carregamento mensal ou recorrente por competencia.
- Jornada de desdobramento estrategico.
- Jornada de rotina de resultados.
- Jornada de aprovacao/governanca.
- Jornada de auditoria/reprocessamento/correcao.

Para incumbentes como Stratws, tambem avaliar jornadas alternativas:

- implantacao simples vs multi-area/multi-unidade
- indicador manual vs indicador por fonte de dados
- fonte oficial disponivel vs lacuna inferida justificada
- carga inicial vs carga mensal recorrente
- meta aprovada vs meta rejeitada/reaberta
- plano de acao em dia vs atrasado/escalado
- reuniao com decisoes aprovadas vs pendencias reabertas
- usuario aprovou escopo vs usuario pediu rework

Essas alternativas nao precisam virar todos os MVPs, mas precisam estar decididas: `MUST`, `SHOULD`, `NICE` ou `FORA`.

## 10. Pedido de Aprovacao

- O Coordenador so pede aprovacao depois de `scope_canonicalization_delivery`.
- O pedido ao usuario e em bloco.
- O pedido resume decisoes, lacunas e defaults sem despejar IDs internos.
- O pedido nao deve pedir aprovacao de Dev; pede aprovacao de escopo.
- Se aprovado, registrar `scope_approved`.
- Se reprovado, registrar `scope_rejected` e seguir `scope_rework`.

## 11. Depois da Resposta do Usuario

Se resposta positiva:

- registrar aprovacao
- pedir `next_mission`
- preparar pacote de Development apenas se a factory devolver `dev_preparation`

Se resposta negativa:

- registrar rejeicao
- transformar feedback em rework objetivo
- reexecutar Pesquisador ou canonicalizacao se necessario
- nao acionar Dev

## 12. Criterios de Erro Bloqueante

- Coordenador nao leu prompt inteiro.
- Gateway devolveu missao errada ou generica.
- Evento emitido nao tem contrato no gateway.
- `next_mission` nao trouxe pista acionavel da missao atual.
- Pesquisador foi acionado por runner/modelo diferente do declarado.
- Coordenador assumiu papel de Pesquisador.
- Pesquisa veio sem fonte oficial quando deveria ter.
- Faltou qualquer um dos 7 artefatos canonicos.
- Pedido de aprovacao aconteceu antes da canonicalizacao.
- Coordenador leu artefatos de run antigo como contexto de run limpo.

Qualquer item acima bloqueia o experimento. Nao tentar "salvar" o run.
