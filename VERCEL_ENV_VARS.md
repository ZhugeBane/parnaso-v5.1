# ✅ Variáveis de Ambiente para o Vercel - CONFIRMADAS

## 📋 Copie e Cole no Vercel

No Vercel, ao fazer deploy, clique em **"Environment Variables"** e adicione cada uma destas variáveis:

---

### Variável 1
```
Nome: VITE_FIREBASE_API_KEY
Valor: AIzaSyAEgQmPkSyH3kHvzaPXjNG7qA2LxhqMvnQ
```

### Variável 2
```
Nome: VITE_FIREBASE_AUTH_DOMAIN
Valor: parnasoapp.firebaseapp.com
```

### Variável 3
```
Nome: VITE_FIREBASE_PROJECT_ID
Valor: parnasoapp
```

### Variável 4
```
Nome: VITE_FIREBASE_STORAGE_BUCKET
Valor: parnasoapp.firebasestorage.app
```

### Variável 5
```
Nome: VITE_FIREBASE_MESSAGING_SENDER_ID
Valor: 331667201572
```

### Variável 6
```
Nome: VITE_FIREBASE_APP_ID
Valor: 1:331667201572:web:3bbb1054418ad2fb7142b1
```

### Variável 7
```
Nome: VITE_FIREBASE_MEASUREMENT_ID
Valor: G-5ZGNY5TWBG
```

---

## 🎯 Como Adicionar no Vercel

1. No painel de deploy do Vercel, procure a seção **"Environment Variables"**
2. Para cada variável acima:
   - Cole o **Nome** no campo "Key"
   - Cole o **Valor** no campo "Value"
   - Clique em "Add"
3. Repita para todas as 7 variáveis
4. Clique em **"Deploy"**

---

## ⚠️ IMPORTANTE

- ✅ Todas as variáveis começam com `VITE_` (isso é necessário para o Vite)
- ✅ Copie os valores EXATAMENTE como estão (sem espaços extras)
- ✅ Adicione TODAS as 7 variáveis antes de fazer deploy

---

## 📝 Formato Alternativo (se preferir)

Se o Vercel permitir importar de arquivo, você pode usar este formato:

```env
VITE_FIREBASE_API_KEY=AIzaSyAEgQmPkSyH3kHvzaPXjNG7qA2LxhqMvnQ
VITE_FIREBASE_AUTH_DOMAIN=parnasoapp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=parnasoapp
VITE_FIREBASE_STORAGE_BUCKET=parnasoapp.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=331667201572
VITE_FIREBASE_APP_ID=1:331667201572:web:3bbb1054418ad2fb7142b1
VITE_FIREBASE_MEASUREMENT_ID=G-5ZGNY5TWBG
```

---

## ✅ Checklist

Antes de fazer deploy, confirme:

- [ ] Todas as 7 variáveis foram adicionadas
- [ ] Os nomes estão corretos (com `VITE_` no início)
- [ ] Os valores foram copiados exatamente como estão
- [ ] Não há espaços extras antes ou depois dos valores

Pronto para fazer deploy! 🚀
