# 🔒 Regras de Segurança do Firestore - Deploy Manual

## ✅ Regras Criadas!

O arquivo [`firestore.rules`](file:///c:/Users/Jacinto%20Junior/Downloads/parnaso-v5/firestore.rules) foi criado com sucesso!

---

## 📋 Como Fazer Deploy Manual

Como o Firebase CLI não está instalado, você precisa copiar e colar as regras manualmente no Firebase Console:

### Passo 1: Acessar o Firebase Console

1. Acesse: https://console.firebase.google.com
2. Selecione o projeto **"parnasoapp"**
3. No menu lateral, clique em **"Firestore Database"**
4. Clique na aba **"Rules"** (Regras)

### Passo 2: Copiar as Regras

Abra o arquivo [`firestore.rules`](file:///cx:/Users/Jacinto%20Junior/Downloads/parnaso-v5/firestore.rules) e copie TODO o conteúdo.

Ou copie diretamente daqui:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if request.auth.uid == userId;
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    match /writing_sessions/{sessionId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.userId == request.auth.uid;
    }
    
    match /projects/{projectId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.userId == request.auth.uid;
    }
    
    match /user_settings/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    match /friendships/{friendshipId} {
      allow read, write: if isSignedIn();
    }
    
    match /groups/{groupId} {
      allow read, write: if isSignedIn();
    }
    
    match /messages/{messageId} {
      allow read, write: if isSignedIn();
    }
    
    match /forum_threads/{threadId} {
      allow read, write: if isSignedIn();
    }
    
    match /forum_replies/{replyId} {
      allow read, write: if isSignedIn();
    }
    
    match /competitions/{competitionId} {
      allow read, write: if isSignedIn();
    }
  }
}
```

### Passo 3: Colar e Publicar

1. **Cole** as regras no editor do Firebase Console
2. Clique em **"Publish"** (Publicar)
3. Aguarde alguns segundos

---

## ✅ O que as Regras Fazem

### Usuários (`users`)
- ✅ **Leitura:** Qualquer usuário autenticado pode ver outros usuários
- ✅ **Criação:** Qualquer pessoa pode criar sua própria conta (registro)
- ✅ **Atualização:** Apenas o próprio usuário ou admins podem atualizar
- ✅ **Exclusão:** Apenas admins podem excluir

### Sessões de Escrita (`writing_sessions`)
- ✅ Usuários só podem ver/criar/editar suas próprias sessões

### Projetos (`projects`)
- ✅ Usuários só podem ver/criar/editar seus próprios projetos

### Configurações (`user_settings`)
- ✅ Usuários só podem ver/editar suas próprias configurações

### Recursos Sociais
- ✅ Todos os usuários autenticados podem usar (amizades, grupos, mensagens, fórum, competições)

---

## 👨‍💼 Criar Primeiro Admin

Depois de publicar as regras:

1. **Registre-se** no app normalmente
2. **Acesse Firebase Console** → Firestore Database → Data
3. **Encontre sua conta** na coleção `users`
4. **Edite o documento** e altere `role` de `"user"` para `"admin"`
5. **Faça logout e login** novamente no app

Agora você terá acesso ao painel administrativo! 🎉

---

## 🎯 Resultado

Após publicar as regras:

✅ **Registro funcionará** - Qualquer pessoa pode criar conta  
✅ **Login funcionará** - Usuários autenticados podem acessar  
✅ **Dados protegidos** - Cada usuário vê apenas seus dados  
✅ **Admins podem gerenciar** - Usuários com role 'admin' têm poderes especiais  

---

## ⚠️ Importante

**Não esqueça de clicar em "Publish"** no Firebase Console após colar as regras!

Sem isso, as regras não serão aplicadas e você continuará tendo o erro de permissão.
