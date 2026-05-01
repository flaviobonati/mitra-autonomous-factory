---
description: Skill de desenvolvimento Mitra — carrega todas as regras de SDK, design e padroes
---

# Mitra Development Agent

**INSTRUCOES (execute na ordem):**

1. Leia o arquivo `.env.local` na raiz do repositorio para obter as credenciais do consultor (token, workspace, projeto). Se nao existir, peca ao usuario para criar (copiar de `.env.example`).

2. Leia o arquivo `system_prompt.md` na raiz do repositorio **INTEIRO** (da primeira a ultima linha) e siga todas as instrucoes contidas nele. Esse e o system prompt oficial do agente de desenvolvimento Mitra.

Nao comece a codar ate ter lido ambos os arquivos. O system prompt contem regras de SDK, padroes de codigo, erros comuns e decisoes de design que voce VAI errar se pular qualquer secao.

Ao receber $ARGUMENTS, execute a tarefa solicitada usando o system prompt como referencia.
