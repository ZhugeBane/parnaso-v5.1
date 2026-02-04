# ✅ Variáveis de Ambiente Configuradas!

## O que foi feito:

### 1. ✅ Criado arquivo `.env`
Localização: [`c:\Users\Jacinto Junior\Downloads\parnaso-v5\.env`](file:///c:/Users/Jacinto%20Junior/Downloads/parnaso-v5/.env)

Contém todas as credenciais Firebase:
```env
VITE_FIREBASE_API_KEY=AIzaSyAEgQmPkSyH3kHvzaPXjNG7qA2LxhqMvnQ
VITE_FIREBASE_AUTH_DOMAIN=parnasoapp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=parnasoapp
VITE_FIREBASE_STORAGE_BUCKET=parnasoapp.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=331667201572
VITE_FIREBASE_APP_ID=1:331667201572:web:3bbb1054418ad2fb7142b1
VITE_FIREBASE_MEASUREMENT_ID=G-5ZGNY5TWBG
```

### 2. ✅ Atualizado `lib/firebase.ts`
Agora usa variáveis de ambiente em vez de valores hardcoded:

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ... etc
};
```

### 3. ✅ Protegido `.env` no `.gitignore`
O arquivo `.env` NÃO será enviado ao GitHub (segurança!)

---

## 🧪 Próximo Passo: Testar

Vamos testar se o app ainda funciona com as variáveis de ambiente:

```bash
npm run dev
```

Se funcionar corretamente, está tudo pronto para o deploy!

---

## 📝 Para Deploy no Vercel

Quando fizer deploy no Vercel, você precisará adicionar estas mesmas variáveis no painel do Vercel:

**Settings → Environment Variables → Add**

Copie e cole cada variável do arquivo `.env` no Vercel.

---

## ⚠️ IMPORTANTE

- ❌ **NUNCA** commite o arquivo `.env` no Git
- ✅ O `.gitignore` já está protegendo
- ✅ No Vercel, adicione as variáveis manualmente no painel
