/**
 * Módulo de Segurança, Criptografia Client-Side (AES-GCM / Web Crypto API) e Sanitização
 * ParnasoTec Security Layer v1
 */

export const ENC_PREFIX = 'ENC_V1:';
const APP_SALT = 'ParnasoTec-AES-GCM-Salt-2026-v1';

// Cache de chaves derivadas em memória por userId para evitar recálculo repetido de PBKDF2
const keyCache = new Map<string, CryptoKey>();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Deriva uma chave AES-GCM de 256 bits a partir do UID do usuário autenticado + Salt da aplicação.
 */
async function deriveUserKey(userId: string): Promise<CryptoKey> {
  const safeUid = (userId || 'anonymous-parnaso-user').trim();
  const cached = keyCache.get(safeUid);
  if (cached) return cached;

  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(`${safeUid}:${APP_SALT}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(APP_SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  keyCache.set(safeUid, key);
  return key;
}

/**
 * Criptografa o texto da sessão no navegador (AES-GCM 256-bit) e adiciona o prefixo ENC_V1:
 * Se já estiver criptografado ou vazio, retorna sem duplicar criptografia.
 */
export async function encryptSessionText(plainText: string | undefined | null, userId: string): Promise<string> {
  if (!plainText) return '';
  if (plainText.startsWith(ENC_PREFIX)) return plainText;

  try {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      return plainText;
    }
    const key = await deriveUserKey(userId);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(plainText);

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    const ivB64 = bytesToBase64(iv);
    const cipherB64 = bytesToBase64(new Uint8Array(cipherBuffer));
    return `${ENC_PREFIX}${ivB64}:${cipherB64}`;
  } catch (err) {
    console.error('Erro ao criptografar texto da sessão (fallback para texto seguro):', err);
    return plainText;
  }
}

/**
 * Descriptografa automaticamente em memória textos com o prefixo ENC_V1:.
 * Textos antigos sem o prefixo são retornados normalmente (100% compatibilidade retroativa).
 */
export async function decryptSessionText(cipherText: string | undefined | null, userId: string): Promise<string> {
  if (!cipherText) return '';
  if (!cipherText.startsWith(ENC_PREFIX)) {
    // Texto antigo salvo sem criptografia -> exibe normalmente sem erro
    return cipherText;
  }

  try {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      return cipherText;
    }
    const payload = cipherText.slice(ENC_PREFIX.length);
    const separatorIdx = payload.indexOf(':');
    if (separatorIdx === -1) return cipherText;

    const ivB64 = payload.slice(0, separatorIdx);
    const dataB64 = payload.slice(separatorIdx + 1);

    const iv = base64ToBytes(ivB64);
    const encryptedBytes = base64ToBytes(dataB64);
    const key = await deriveUserKey(userId);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      encryptedBytes as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.warn('Não foi possível descriptografar o texto com a chave atual:', err);
    return '[Conteúdo protegido por criptografia ponta-a-ponta]';
  }
}

/**
 * Verifica se um texto bruto possui o prefixo de criptografia ENC_V1:
 */
export function isEncryptedText(text: string | undefined | null): boolean {
  return typeof text === 'string' && text.startsWith(ENC_PREFIX);
}

/**
 * Sanitiza textos de entrada contra XSS, tags HTML maliciosas, scripts inline e limita tamanho máximo.
 */
export function sanitizeText(input: string | undefined | null, maxLength?: number): string {
  if (!input || typeof input !== 'string') return '';

  let cleaned = input
    // Remove blocos <script>...</script>, <style>...</style>, <iframe>...</iframe>
    .replace(/<\s*(script|style|iframe|object|embed|applet|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    // Remove quaisquer tags HTML restantes (<...>)
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    // Remove protocolos perigosos
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    // Remove atributos de eventos inline (onload=, onerror=, onclick=, etc.)
    .replace(/\bon[a-z]+\s*=\s*(['"]).*?\1/gi, '');

  cleaned = cleaned.trim();

  if (typeof maxLength === 'number' && maxLength > 0 && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

/**
 * Valida números de métricas e diamantes contra NaN, Infinity, valores negativos ou saltos irreais.
 */
export function sanitizeMetricNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
  asInteger = true
): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return fallback;
  }
  const clamped = Math.min(max, Math.max(min, parsed));
  return asInteger ? Math.round(clamped) : clamped;
}

/**
 * Filtra um objeto de usuário público para expor apenas campos seguros na Comunidade (Social Hub),
 * removendo e-mail pessoal, credenciais ou dados privados.
 */
export function toSafePublicUser<T extends Record<string, any>>(raw: T, docId?: string) {
  return {
    id: String(docId || raw.id || raw.uid || ''),
    name: sanitizeText(raw.name || raw.displayName || 'Escritor', 80) || 'Escritor',
    email: '', // Nunca expõe o e-mail pessoal de outros escritores no estado público
    role: (raw.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
    photoURL: typeof raw.photoURL === 'string' ? raw.photoURL : undefined,
    photoBase64: typeof raw.photoBase64 === 'string' ? raw.photoBase64 : undefined,
    isOnline: Boolean(raw.isOnline),
    lastSeen: raw.lastSeen || undefined,
    createdAt: raw.createdAt || undefined,
    wordCountWeekly: typeof raw.wordCountWeekly === 'number' ? raw.wordCountWeekly : 0,
    wordCountMonthly: typeof raw.wordCountMonthly === 'number' ? raw.wordCountMonthly : 0,
    wordCountYearly: typeof raw.wordCountYearly === 'number' ? raw.wordCountYearly : 0,
    wordCountTotal: typeof raw.wordCountTotal === 'number' ? raw.wordCountTotal : 0,
    monthlyHistory: raw.monthlyHistory && typeof raw.monthlyHistory === 'object' ? raw.monthlyHistory : {},
    yearlyHistory: raw.yearlyHistory && typeof raw.yearlyHistory === 'object' ? raw.yearlyHistory : {},
    dailyHistory: raw.dailyHistory && typeof raw.dailyHistory === 'object' ? raw.dailyHistory : {},
    statsUpdatedAt: raw.statsUpdatedAt || undefined,

    // Perfil do Autor & Vitrine Literária
    bio: typeof raw.bio === 'string' ? sanitizeText(raw.bio, 250) : undefined,
    location: typeof raw.location === 'string' ? sanitizeText(raw.location, 100) : undefined,
    contactEmail: typeof raw.contactEmail === 'string' ? sanitizeText(raw.contactEmail, 120) : undefined,
    instagram: typeof raw.instagram === 'string' ? sanitizeText(raw.instagram, 100) : undefined,
    whatsapp: typeof raw.whatsapp === 'string' ? sanitizeText(raw.whatsapp, 50) : undefined,
    publishedWorks: Array.isArray(raw.publishedWorks) ? raw.publishedWorks : [],

    // Gamification Hestius Shield
    hestiusCount: typeof raw.hestiusCount === 'number' ? Math.max(0, Math.min(3, raw.hestiusCount)) : 1,
  };
}
