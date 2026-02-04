# 🚀 Guia de Deploy - Projeto Parnaso

## Opção 1: Deploy no Vercel (Recomendado)

### Pré-requisitos
- Conta no GitHub
- Conta no Vercel (gratuita)

### Passo a Passo

#### 1. Preparar o Projeto para Deploy

**a) Criar arquivo `.gitignore` (se não existir):**
```
node_modules/
dist/
.env.local
.DS_Store
```

**b) Subir código para o GitHub:**
```bash
# Inicializar repositório Git (se ainda não fez)
git init

# Adicionar todos os arquivos
git add .

# Fazer commit
git commit -m "Preparando para deploy"

# Criar repositório no GitHub e conectar
git remote add origin https://github.com/SEU_USUARIO/parnaso-app.git
git branch -M main
git push -u origin main
```

#### 2. Deploy no Vercel

**a) Acessar [vercel.com](https://vercel.com) e fazer login com GitHub**

**b) Clicar em "Add New Project"**

**c) Importar seu repositório `parnaso-app`**

**d) Configurações de Build:**
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

**e) Variáveis de Ambiente (se necessário):**
Adicionar variáveis de ambiente do Firebase (opcional, já que estão no código):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- etc.

**f) Clicar em "Deploy"**

✅ **Pronto! Seu app estará no ar em ~2 minutos**

#### 3. Conectar Domínio Personalizado

**a) No dashboard do Vercel, ir em "Settings" > "Domains"**

**b) Adicionar seu domínio (ex: `parnaso.com.br`)**

**c) Configurar DNS do seu domínio:**

Se usar **Registro.br, GoDaddy, Hostinger, etc:**
```
Tipo: A
Nome: @
Valor: 76.76.21.21

Tipo: CNAME
Nome: www
Valor: cname.vercel-dns.com
```

**d) Aguardar propagação DNS (até 48h, geralmente 10min)**

✅ **Seu app estará acessível em `seudominio.com.br`**

---

## Opção 2: Deploy Manual em Servidor (HTML Direto)

### Passo a Passo

#### 1. Fazer Build do Projeto

```bash
# Instalar dependências
npm install

# Criar build de produção
npm run build
```

Isso cria a pasta `dist/` com todos os arquivos HTML, CSS e JS otimizados.

#### 2. Configurar Servidor Web

**Se usar Apache (.htaccess):**

Criar arquivo `dist/.htaccess`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Se usar Nginx:**

Adicionar no `nginx.conf`:
```nginx
server {
    listen 80;
    server_name seudominio.com.br;
    root /var/www/parnaso/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### 3. Fazer Upload dos Arquivos

**Via FTP/SFTP:**
- Conectar ao servidor
- Fazer upload da pasta `dist/` completa
- Colocar no diretório `public_html/` ou `www/`

**Via cPanel:**
- Acessar File Manager
- Fazer upload dos arquivos da pasta `dist/`

---

## ⚠️ Importante: Segurança do Firebase

### Problema Atual

Suas credenciais Firebase estão **expostas no código** em [`lib/firebase.ts`](file:///c:/Users/Jacinto%20Junior/Downloads/parnaso-v5/lib/firebase.ts):

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyAEgQmPkSyH3kHvzaPXjNG7qA2LxhqMvnQ",
  authDomain: "parnasoapp.firebaseapp.com",
  // ...
};
```

### Solução: Usar Variáveis de Ambiente

**1. Criar arquivo `.env` (não commitar no Git!):**
```env
VITE_FIREBASE_API_KEY=AIzaSyAEgQmPkSyH3kHvzaPXjNG7qA2LxhqMvnQ
VITE_FIREBASE_AUTH_DOMAIN=parnasoapp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=parnasoapp
VITE_FIREBASE_STORAGE_BUCKET=parnasoapp.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=331667201572
VITE_FIREBASE_APP_ID=1:331667201572:web:3bbb1054418ad2fb7142b1
VITE_FIREBASE_MEASUREMENT_ID=G-5ZGNY5TWBG
```

**2. Atualizar `lib/firebase.ts`:**
```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
```

**3. No Vercel, adicionar as mesmas variáveis em "Environment Variables"**

---

## 🎯 Recomendação Final

### Use Vercel porque:

1. ✅ **Grátis** para projetos pessoais
2. ✅ **Deploy automático** a cada commit
3. ✅ **HTTPS grátis** com certificado SSL
4. ✅ **CDN global** - App rápido em qualquer lugar do mundo
5. ✅ **Domínio personalizado** fácil de configurar
6. ✅ **Zero configuração** de servidor
7. ✅ **Rollback fácil** se algo der errado

### Evite HTML direto porque:

1. ❌ Precisa fazer build manual toda vez
2. ❌ Precisa configurar servidor web
3. ❌ Sem HTTPS automático
4. ❌ Sem CDN
5. ❌ Mais difícil de atualizar

---

## 📞 Próximos Passos

1. Criar repositório no GitHub
2. Fazer deploy no Vercel
3. Conectar seu domínio
4. Configurar regras de segurança do Firestore (IMPORTANTE!)

Precisa de ajuda com algum desses passos?
