---
description: Build e deploy do frontend para o S3 do Mitra. Detecta automaticamente o projeto ativo.
---

# Deploy Frontend → Mitra S3

Voce vai fazer o build e deploy do frontend do projeto Mitra ativo.

## Passo 0 — Carregar credenciais

Leia o arquivo `.env.local` na raiz do repositorio para obter:
- `MITRA_WORKSPACE_ID` — workspace do consultor
- `MITRA_DIRECTORY` — diretorio de trabalho

Se `.env.local` nao existir, peca ao usuario para criar (copiar de `.env.example`).

## Passo 1 — Detectar o projeto

Identifique o projeto ativo usando esta logica (em ordem de prioridade):

1. **Argumento explicito**: Se o usuario passou um argumento (ex: `/deploy pokemon-glm`), use esse diretorio
2. **Contexto da conversa**: Se na conversa atual ja estamos trabalhando em um projeto especifico, use esse
3. **Mais recente**: Encontre o diretorio com `frontend/.env` mais recentemente modificado:
   ```bash
   ls -dt $MITRA_DIRECTORY/*/frontend/.env 2>/dev/null | head -1
   ```

Extraia o `VITE_MITRA_PROJECT_ID` do `.env` do projeto:
```bash
grep VITE_MITRA_PROJECT_ID <projeto>/frontend/.env | cut -d= -f2
```

Se o `PROJECT_ID` for `0` ou vazio, **pare e avise o usuario** que o projeto nao foi criado no Mitra ainda.

## Passo 2 — Build

```bash
cd <projeto>/frontend && npm run build
```

Verifique que `dist/index.html` foi gerado. Se o build falhar, mostre o erro e pare.

## Passo 3 — Deploy para S3

```bash
WORKSPACE_ID=$MITRA_WORKSPACE_ID
PROJECT_ID=<id extraido do .env>
BUCKET=e2b-poc
PROJECT_DIR=<caminho do projeto>

# Sync do dist/ para output/
aws s3 sync "$PROJECT_DIR/frontend/dist/" "s3://$BUCKET/$WORKSPACE_ID/$PROJECT_ID/output/" --delete

# Sync do source (opcional, para backup)
aws s3 sync "$PROJECT_DIR/" "s3://$BUCKET/$WORKSPACE_ID/$PROJECT_ID/src/" \
  --delete \
  --exclude ".git/*" \
  --exclude ".claude/*" \
  --exclude "template/*" \
  --exclude "node_modules/*" \
  --exclude "frontend/node_modules/*" \
  --exclude "frontend/dist/*"
```

## Passo 4 — Confirmar

Apos o deploy, mostre:
- Nome do projeto e ID
- URL de preview: `https://preview.mitraecp.com/$WORKSPACE_ID/<PROJECT_ID>/`
- Quantidade de arquivos sincronizados
- Tamanho total do dist/

Se tudo der certo, mostre uma mensagem de sucesso. Se algo falhar, mostre o erro e sugira correcao.
