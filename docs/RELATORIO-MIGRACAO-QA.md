# RELATORIO-MIGRACAO-QA

Base usada: `/opt/mitra-factory/coordenador/sub-agents/qa/qa.md`.

Arquivos gerados/ajustados: `prompts/qa-core.md`, `prompts/qa-horizontal.md`, `prompts/qa-story.md`, `prompts/qa-consolidator.md`.

## Metodo

1. Usei o QA antigo como base canonica.
2. Dupliquei o conteudo integral em `qa-core.md`.
3. Adicionei uma unica secao explicando a arquitetura splitada.
4. Mantive `qa-horizontal`, `qa-story` e `qa-consolidator` como extensoes finas do core.
5. Validei que `qa-core.md` difere do base apenas por adicoes.

## Mudancas aplicadas

| Arquivo | O que mudou | Por que mudou |
|---|---|---|
| `qa-core.md` | Recebeu o QA base completo + secao `Arquitetura splitada da nova fábrica` | Preserva todo o rigor antigo e define heranca para as camadas |
| `qa-horizontal.md` | Reforcado que deve ler `qa-core.md` e aplicar checks visuais/transversais antigos | Evita perda das regras A-H na camada horizontal |
| `qa-story.md` | Reforcado que deve ler `qa-core.md`, validar historias, CRUD, RBAC, downloads, mensagens, artefatos e gaps | Faz a medicao por historia sem relaxar o QA antigo |
| `qa-consolidator.md` | Reforcado que deve produzir `qa_result.json` e `qa_report.md` preservando o contrato humano antigo | Evita aprovacao por resumo parcial |

## Checagem final

- Base QA: 483 linhas.
- `qa-core.md`: 493 linhas.
- `qa-horizontal.md`: 99 linhas.
- `qa-story.md`: 108 linhas.
- `qa-consolidator.md`: 47 linhas.
- O contrato antigo permanece inteiro em `qa-core.md`.
- A splitagem virou extensao operacional, nao substituicao do rigor antigo.
