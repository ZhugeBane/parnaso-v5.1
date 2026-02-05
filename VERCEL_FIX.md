# 🔧 Correção de Erro no Deploy do Vercel

## ❌ Problema Identificado

O erro no deploy foi causado por um **comando de build incorreto**:

```
Error: Command "run npm build" exited with 127
sh: line 1: run: command not found
```

O Vercel está tentando executar `run npm build` quando deveria ser `npm run build`.

---

## ✅ Solução: Corrigir Configurações de Build

### Opção 1: Corrigir nas Configurações do Projeto (Recomendado)

1. **Acesse o dashboard do Vercel**
2. **Vá em Settings → General**
3. **Role até "Build & Development Settings"**
4. **Configure exatamente assim:**

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

5. **Salve as alterações**
6. **Vá em Deployments → Redeploy**

---

### Opção 2: Criar arquivo vercel.json (Alternativa)

Se preferir, crie um arquivo `vercel.json` na raiz do projeto:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

Depois faça commit e push:

```bash
git add vercel.json
git commit -m "Adicionar configuração do Vercel"
git push origin main
```

---

## 📋 Configurações Corretas do Vercel

Certifique-se de que as configurações estão EXATAMENTE assim:

| Campo | Valor Correto |
|-------|---------------|
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Node.js Version** | `18.x` ou `20.x` (padrão) |

---

## ⚠️ Importante: Variáveis de Ambiente

Não esqueça de adicionar as 7 variáveis de ambiente:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

---

## 🚀 Próximos Passos

1. ✅ Corrigir o Build Command para `npm run build`
2. ✅ Verificar que as variáveis de ambiente estão configuradas
3. ✅ Fazer Redeploy
4. ✅ Aguardar ~2 minutos
5. ✅ App no ar! 🎉

---

## 📞 Se o Erro Persistir

Se após corrigir o comando ainda houver erro, pode ser:

1. **Erro de TypeScript** - O build inclui `tsc` que verifica tipos
2. **Variáveis de ambiente faltando** - Sem elas o build pode falhar

Nesse caso, me avise e vou ajudar a debugar!
