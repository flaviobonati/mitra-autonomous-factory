# Templates Neutros dos Artefatos Iniciais de Escopo

Estes templates sao canonicos para qualquer run antes da pesquisa. Eles existem para evitar que o Coordenador busque exemplos em runs antigos.

## `scope_questions.md`

```md
# Scope Questions - {system_name}

## Objetivo do Produto

Construir um sistema {domain_or_category} comparavel ao incumbente/referencia `{benchmark}`, cobrindo o produto completo solicitado pelo usuario, nao um recorte conveniente.

## Defaults Aplicados Nesta Rodada

- Intake: `{input_mode}`.
- Referencia primaria: `{benchmark}`.
- Escopo default: produto completo comparavel ao incumbente, nao mini-produto.
- Pesquisa obrigatoria: fonte oficial quando existir; reviews, marketplaces e comparativos como fontes secundarias; inferencias sempre marcadas.
- Adaptacao Mitra: traduzir capacidades publicas e operacionalmente necessarias para o runtime Mitra sem copiar canais inviaveis literalmente.
- Validacao: lacunas e defaults serao submetidos ao usuario em bloco apos canonicalizacao.

## Perguntas Para Validacao Posterior

Estas perguntas nao bloqueiam a pesquisa quando o usuario delegou defaults.

1. Quais segmentos, portes ou operacoes do cliente devem ser priorizados?
   - Default: cobrir os fluxos centrais do incumbente para operacao B2B comum.
2. Quais perfis de usuario e permissoes precisam existir?
   - Default: perfis derivados do produto de referencia e das jornadas operacionais.
3. Quais dados entram manualmente, por planilha, API, webhook ou integracao?
   - Default: formulario/manual, importacao por planilha e contratos preparados para API/webhook quando fizer sentido.
4. Quais regras, SLAs, aprovacoes, auditorias ou recorrencias sao criticas?
   - Default: regras configuraveis, trilha de auditoria e estados de ciclo de vida completos.
5. Quais relatorios, dashboards, exportacoes ou alertas sao obrigatorios?
   - Default: paineis e visoes necessarios para operar, supervisionar e auditar o fluxo principal.

## Criterios Para Pesquisa

- Mapear funcionalidades publicas do incumbente e separar `OFICIAL`, `REVIEW` e `INFERIDO`.
- Levantar personas, entidades, permissoes, integracoes, fluxos de dados, estados e jornadas E2E.
- Registrar lacunas onde fonte publica nao confirmar comportamento.
- Cobrir produto completo solicitado pelo usuario.
```

## `draft_personas.json`

```json
{
  "system_name": "{system_name}",
  "input_mode": "{input_mode}",
  "benchmark": "{benchmark}",
  "status": "draft_before_research",
  "personas": [
    {
      "persona_id": "P_IMPLANTADOR",
      "name": "Implantador/Administrador",
      "goal": "Configurar ambiente, usuarios, permissoes, parametros, fontes e fluxos iniciais.",
      "research_validation_needed": true
    },
    {
      "persona_id": "P_OPERADOR",
      "name": "Operador principal",
      "goal": "Executar o fluxo operacional central do sistema.",
      "research_validation_needed": true
    },
    {
      "persona_id": "P_GESTOR",
      "name": "Gestor/Supervisor",
      "goal": "Acompanhar operacao, aprovar excecoes, revisar indicadores e remover bloqueios.",
      "research_validation_needed": true
    },
    {
      "persona_id": "P_CLIENTE_OU_SOLICITANTE",
      "name": "Cliente/Solicitante",
      "goal": "Abrir, acompanhar ou validar demandas quando o dominio exigir interacao externa.",
      "research_validation_needed": true
    },
    {
      "persona_id": "P_AUDITOR",
      "name": "Auditor/Compliance",
      "goal": "Consultar historico, evidencias, alteracoes, permissoes e exportacoes.",
      "research_validation_needed": true
    }
  ],
  "open_questions": []
}
```

## `mandatory_story_checklist.json`

```json
{
  "system_name": "{system_name}",
  "input_mode": "{input_mode}",
  "benchmark": "{benchmark}",
  "scope_level": "complete_market_replication",
  "required_story_groups": [
    {
      "group_id": "H_IMPLANTACAO",
      "title": "Implantacao e configuracao completa",
      "must_cover": ["cadastros master", "usuarios", "perfis", "permissoes", "parametros", "fontes", "templates", "setup inicial"]
    },
    {
      "group_id": "H_OPERACAO_CORE",
      "title": "Operacao principal do dominio",
      "must_cover": ["criar item operacional", "classificar/priorizar", "atribuir responsavel", "mudar estados", "concluir/cancelar", "registrar evidencias"]
    },
    {
      "group_id": "H_INGESTAO_DADOS",
      "title": "Entrada e sincronizacao de dados",
      "must_cover": ["formulario/manual", "upload/importacao quando aplicavel", "validacao", "persistencia", "erro/reprocessamento", "reflexo downstream"]
    },
    {
      "group_id": "H_ROTINA_RECORRENTE",
      "title": "Rotina recorrente ou ciclo operacional",
      "must_cover": ["recorrencia", "fila/backlog", "SLA/prazo quando aplicavel", "notificacoes", "acompanhamento", "fechamento"]
    },
    {
      "group_id": "H_GOVERNANCA",
      "title": "Aprovacao, excecoes e governanca",
      "must_cover": ["aprovacao", "rejeicao", "reabertura", "comentarios", "escalonamento", "trilha de decisao"]
    },
    {
      "group_id": "H_RELATORIOS",
      "title": "Dashboards, relatorios e exportacoes",
      "must_cover": ["visao executiva", "visao operacional", "filtros", "drill-down", "exportacao", "indicadores"]
    },
    {
      "group_id": "H_AUDITORIA",
      "title": "Auditoria e rastreabilidade",
      "must_cover": ["log de alteracoes", "quem/quando/o que", "evidencias", "permissoes", "consulta historica"]
    }
  ],
  "coverage_rule": "Cada feature MUST da pesquisa deve aparecer em historia, criterio de aceite, fluxo de dados e jornada E2E.",
  "open_questions": []
}
```
