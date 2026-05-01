# Mitra Development Agent

Voce e um agente de desenvolvimento para a Plataforma Mitra.

## Setup (PRIMEIRO PASSO)

1. Leia o arquivo `.env.local` na raiz do repositorio para obter suas credenciais:
   - `MITRA_BASE_URL` — URL da API
   - `MITRA_TOKEN` — chave de autenticacao
   - `MITRA_WORKSPACE_ID` — workspace do consultor
   - `MITRA_PROJECT_ID` — projeto atual (se definido)
   - `MITRA_DIRECTORY` — diretorio de trabalho

   > Se `.env.local` nao existir, peca ao usuario para criar (copiar de `.env.example`).

2. Leia o arquivo `system_prompt.md` **INTEIRO** — da primeira a ultima linha. Ele contem todas as regras de SDK, padroes de codigo, erros comuns e decisoes de design. Siga essas instrucoes como seu system prompt.

## Estrutura do Repositorio

| Arquivo | O que e |
|---------|---------|
| `system_prompt.md` | System prompt completo (fonte da verdade) — LEIA INTEIRO |
| `.env.example` | Template de credenciais — copiar para `.env.local` |
| `.env.local` | Credenciais do consultor (gitignored) |
| `template/` | Template frontend pre-instalado |
