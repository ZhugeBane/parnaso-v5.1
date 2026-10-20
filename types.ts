
export interface Project {
  id: string;
  name: string;
  description: string;
  targetWordCount?: number;
  color: string; // Hex color for charts
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  showInAutomonitoring?: boolean; // Whether project appears in automonitoring
}

// --- Character Sheets & Custom Fields ---

export interface CustomCharacterField {
  id: string;
  title: string;
  content: string;
}

export interface TraitItem {
  id: string;
  label?: string; // e.g. "Cabelo", "Olhos", "Virtude", "Defeito", "Espécie", etc.
  value: string;
}

export interface CharacterRelationshipItem {
  id: string;
  targetCharacterId?: string;
  targetCharacterName: string;
  relationType: string; // Aliado, Rival, Interesse Amoroso, Mentor, Familiar, Inimigo, etc.
  description?: string;
}

export interface Character {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  role?: string; // Protagonista, Antagonista, Secundário, Mentor, Alívio Cômico, etc.
  age?: string;
  birthDate?: string;
  occupation?: string;
  avatarUrl?: string;
  avatarBase64?: string; // 200x200 JPEG Base64
  color?: string; // Hex color code for badges/theme/aura
  
  // Voice & Signature
  signatureQuote?: string; // Frase assinatura que resume a voz do personagem

  // Dramatic Core (Bento: Essência & Motor Dramático)
  consciousDesire?: string; // Desejo Consciente (Meta)
  unconsciousNeed?: string; // Necessidade Inconsciente (Ferida)
  theMask?: string; // A Máscara (Como age externamente)
  greatestFear?: string; // Maior Medo

  // Temperament Polarity Sliders (0 a 100, default 50)
  polarityReasonEmotion?: number; // 0 = Razão <-> 100 = Emoção
  polarityCautionImpulse?: number; // 0 = Cautela <-> 100 = Impulso
  polarityAltruismSelfishness?: number; // 0 = Altruísmo <-> 100 = Egoísmo

  // Character Arc Phases (Início, Meio, Clímax)
  arcBeginning?: string; // Como começa
  arcMiddle?: string; // Como entra em crise
  arcClimax?: string; // Como termina a história

  // Structured Relationships
  relationships?: CharacterRelationshipItem[];

  // Traits (general descriptions for backward compatibility)
  physicalTraits?: string; // Appearance, height, eyes, hair, scars, clothing style
  psychologicalTraits?: string; // Personality, temper, strengths, virtues, flaws, fears
  motivation?: string; // Core desire, objective in the plot
  background?: string; // Origin story, backstory
  relations?: string; // Relationships with other characters

  // Dynamic Trait Lists with dedicated buttons per section
  identityItems?: TraitItem[]; // Extra identity facts (species, pronouns, status, etc.)
  physicalItems?: TraitItem[]; // Physical traits (hair, eyes, height, scars, etc.)
  psychologicalItems?: TraitItem[]; // Psychological traits (virtues, flaws, phobias, habits, etc.)
  storyItems?: TraitItem[]; // Story & relationship facts (traumas, milestones, rivals, etc.)
  
  // Free custom text boxes with custom title and content
  customFields?: CustomCharacterField[];
  
  createdAt: string;
  updatedAt?: string;
}

// --- Chapter Conceptual Maps ---

export interface ConceptNode {
  id: string;
  title: string;
  description?: string;
  category?: 'event' | 'character' | 'clue' | 'twist' | 'idea' | 'conflict' | 'setting';
  color?: string;
  x: number;
  y: number;
}

export interface ConceptEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string; // e.g. "Leva a", "Revela", "Consequência de", "Opõe-se a"
}

export interface ChapterConceptMap {
  id: string;
  projectId: string;
  userId: string;
  chapterNumber: number;
  chapterTitle: string;
  description?: string;
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  createdAt: string;
  updatedAt?: string;
}

// --- Project Post-it Comments & Notes ---

export type PostItColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';

export interface ProjectComment {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  content: string;
  author?: string; // Quem fez o comentário (ex: "Leitor Beta", "Meu pensamento", "Editor")
  color?: PostItColor;
  createdAt: string;
  updatedAt?: string;
}

// --- Story Skeleton (Esqueleto da Obra / Ideias Encadeadas) ---

export type SkeletonItemStatus = 'draft' | 'structured' | 'writing' | 'completed';

export interface StorySkeletonItem {
  id: string;
  projectId: string;
  userId: string;
  order: number; // 1, 2, 3...
  title: string; // ex: "Incidente Incitante", "Capítulo 1: A Chegada", "Plot Twist do 2º Ato"
  status?: SkeletonItemStatus; // 💡 Ideia Inicial, 📐 Estruturado, ✍️ Escrevendo, ✅ Concluído
  content: string; // Caixa de texto expansível da ideia
  createdAt: string;
  updatedAt?: string;
}

// --- Physical Environments (Ambientes Físicos / Cenários da Obra) ---

export type EnvironmentCategory = 'interior' | 'exterior' | 'city' | 'shelter' | 'conflict' | 'other';

export interface StoryEnvironment {
  id: string;
  projectId: string;
  userId: string;
  name: string; // ex: "Vagão do Meio", "Biblioteca Subterrânea", "Cafeteria Central"
  category: EnvironmentCategory; // Interior, Exterior, Cidade/Região, Refúgio, Local de Conflito, Outro
  visualDescription?: string; // Como é o espaço físico, iluminação, objetos importantes e disposição
  sensoryAtmosphere?: string; // Sons, cheiros, clima, temperatura, atmosfera sensorial
  associatedScenesOrCharacters?: string; // Quem frequenta esse lugar ou o que acontece de importante ali
  imageUrl?: string;
  imageBase64?: string; // Base64 comprimida (< 35KB) para moodboard/cenário
  createdAt: string;
  updatedAt?: string;
}


export interface WritingSession {
  id: string;
  projectId?: string; // Link to a Project
  date: string; // ISO string for the date of entry

  // Section 1
  startTime: string;
  endTime: string;
  wordCount: number;
  content?: string; // NEW: The actual text written

  // Section 2
  stressLevel: number; // 1 (Tranquil) - 5 (Stressful)
  usedSkeleton: boolean;
  usedDrafts: boolean;

  // Section 3
  autoCorrectionFrequency: number; // 1-5 scale (Likert)
  difficultyLevel: number; // 1 (None) - 5 (Intense)
  specificDifficulties: string;

  // Section 4
  wasMultitasking: boolean;
  multitaskingDescription: string;
  usedTimeStrategy: boolean;
  timeStrategyDescription: string;

  // Section 5
  selfRewarded: boolean;
  rewardDescription: string;
  sessionRating: number; // 1 (Terrible) - 5 (Excellent)
}

export interface UserSettings {
  dailyWordGoal: number;
  weeklyWordGoal: number;
  dailyMinutesGoal?: number;
  weeklyMinutesGoal?: number;
}

export interface PurchaseLink {
  id: string;
  storeName: string; // e.g. "Amazon", "Site Oficial", "Editora", "Wattpad", "Mercado Livre", "Uiclap", "Kobo"
  url: string;
}

export interface PublishedWork {
  id: string;
  title: string;
  synopsis: string;
  coverBase64?: string; // 300x450 JPEG Base64
  coverUrl?: string;
  links: PurchaseLink[];
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In a real app, never store plain text passwords
  role: 'admin' | 'user';
  isBlocked?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  photoURL?: string; // User profile picture (URL or Base64)
  photoBase64?: string; // 200x200 JPEG Base64
  lastSeen?: string; // ISO timestamp of last activity
  isOnline?: boolean; // Real-time online flag

  // Author Profile & Showcase Fields
  bio?: string; // Mini-bio / literary title
  location?: string; // Cidade/Estado (ex: "Fortaleza, CE")
  contactEmail?: string; // E-mail público de contato
  instagram?: string; // @usuario ou URL
  whatsapp?: string; // Número com DDD ou link
  publishedWorks?: PublishedWork[];

  // Public Aggregated Word Counts & History (for Guild & Community stats)
  wordCountWeekly?: number;
  wordCountMonthly?: number;
  wordCountYearly?: number;
  wordCountTotal?: number;
  monthlyHistory?: Record<string, number>; // e.g. { "2026-09": 12500, "2026-10": 17015 }
  yearlyHistory?: Record<string, number>; // e.g. { "2025": 45000, "2026": 17015 }
  dailyHistory?: Record<string, number>; // e.g. { "2026-10-17": 500, "2026-10-18": 1200 }
  statsUpdatedAt?: string;

  // Gamification: Hestius (Streak Freeze & Flame Protection)
  hestiusCount?: number; // 0 to 3 (max 3)
  hestiusLastRechargeDate?: string; // ISO or YYYY-MM-DD
  hestiusLastConsumedDate?: string; // ISO or YYYY-MM-DD
  hestiusProtectedDates?: string[]; // Array of YYYY-MM-DD dates protected by Hestius

  // Gamification: Badges & Achievements
  equippedBadges?: EquippedBadge[]; // Up to 2 equipped badges
  achievementHistory?: AchievementUnlockRecord[]; // Historical unlocked achievements

  // Gamification: Rewards, Claims & Cloud Currencies (Single Source of Truth)
  customRewards?: UserReward[];
  claimedRewards?: ClaimedReward[];
  spentScriptus?: number;
  spentKronus?: number;
  scriptusBalance?: number;
  kronusBalance?: number;
}

export interface EquippedBadge {
  id: string;
  title: string;
  icon: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'diamond';
  description?: string;
  unlockedAt?: string;
  count?: number; // Multiplier e.g. x2, x3
}

export interface AchievementUnlockRecord {
  id: string;
  unlockedAt: string; // ISO date
  periodKey: string; // e.g. "2026-10"
  count?: number;
}

export interface Friendship {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'blocked';
  blockedBy?: string;
  createdAt: string;
}

export interface AgoraParticipant {
  userId: string;
  name: string;
  photoURL?: string;
  joinedAt: string;
  lastPing?: string;
  isMuted?: boolean;
}

export interface AgoraSignalMessage {
  id: string;
  guildId: string;
  senderId: string;
  targetId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: string;
  createdAt: string;
}

export interface GuildMemberPeriodData {
  weekly?: number;
  monthly?: number;
  yearly?: number;
  total?: number;
  monthlyHistory?: Record<string, number>;
  yearlyHistory?: Record<string, number>;
}

export interface Guild {
  id: string;
  name: string;
  description?: string;
  emblemUrl?: string;
  emblemBase64?: string; // 200x200 JPEG Base64
  adminId: string; // Owner
  adminIds?: string[]; // Additional administrators
  members: string[];
  invitedUsers?: string[]; // Pending invitations sent to users
  pendingMemberIds?: string[]; // Pending membership requests awaiting Admin approval
  parnasusMedals?: number; // Total Parnasus Medals of Honor earned (1 medal per 100k lifetime words)
  statsResetDate?: string; // Date to filter member word counts
  challenges?: GuildChallenge[];
  agoraParticipants?: AgoraParticipant[];
  memberWordStats?: Record<string, number>; // Cached total words per member
  memberPeriodStats?: Record<string, any>; // e.g. { [memberId]: GuildMemberPeriodData } or period maps
  createdAt: string;
}

export interface GuildChallenge {
  id: string;
  title: string;
  description: string;
  type: 'word_count' | 'days_streak';
  target: number;
  durationDays: number;
  createdAt: string;
  status: 'active' | 'completed';
}

// Alias for compatibility
export type Group = Guild;

export interface GuildForumThread {
  id: string;
  guildId: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface GuildForumReply {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string; // Optional if group message
  groupId?: string;    // Optional if direct message
  chatId?: string;     // Deterministic [uid1, uid2].sort().join('_')
  content: string;
  timestamp: string;
  read: boolean; // Only relevant for DMs usually
}

// --- FORUM TYPES ---
export interface ForumThread {
  id: string;
  authorId: string;
  title: string;
  content: string;
  category: 'Geral' | 'Dúvidas' | 'Feedback' | 'Inspiração';
  createdAt: string;
  likes: string[]; // User IDs
}

export interface ForumReply {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

// --- COMPETITION TYPES ---
export interface Competition {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  type: 'word_count' | 'days_streak';
  target: number; // e.g., 10000 words or 7 days
  startDate: string;
  endDate: string;
  participants: string[]; // User IDs
  status: 'active' | 'finished';
}

// --- REWARDS SYSTEM: Scriptus (words), Kronus (time), Hestius (flame protection) ---
export interface UserReward {
  id: string;
  userId: string;
  title: string;
  cost: number; // in Scriptus (default) or Kronus
  costDiamonds?: number; // Backward compatibility alias
  currency?: 'scriptus' | 'kronus'; // default 'scriptus'
  description?: string;
  icon?: string; // emoji or icon string
  category?: 'lazer' | 'comida' | 'compras' | 'descanso' | 'hestius' | 'outro';
  createdAt: string;
}

export interface ClaimedReward {
  id: string;
  userId: string;
  rewardId: string;
  rewardTitle: string;
  cost: number;
  costDiamonds?: number; // Backward compatibility alias
  currency?: 'scriptus' | 'kronus'; // default 'scriptus'
  claimedAt: string;
  notes?: string;
}

export const INITIAL_SETTINGS: UserSettings = {
  dailyWordGoal: 500,
  weeklyWordGoal: 3500
};

export const INITIAL_SESSIONS: WritingSession[] = [
  {
    id: '1',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    startTime: '09:00',
    endTime: '11:00',
    wordCount: 1200,
    stressLevel: 2,
    usedSkeleton: true,
    usedDrafts: false,
    autoCorrectionFrequency: 2,
    difficultyLevel: 2,
    specificDifficulties: '',
    wasMultitasking: false,
    multitaskingDescription: '',
    usedTimeStrategy: true,
    timeStrategyDescription: 'Pomodoro',
    selfRewarded: true,
    rewardDescription: 'Café especial',
    sessionRating: 5
  },
  {
    id: '2',
    date: new Date(Date.now() - 86400000).toISOString(),
    startTime: '14:00',
    endTime: '15:30',
    wordCount: 500,
    stressLevel: 4,
    usedSkeleton: false,
    usedDrafts: true,
    autoCorrectionFrequency: 4,
    difficultyLevel: 4,
    specificDifficulties: 'Bloqueio criativo',
    wasMultitasking: true,
    multitaskingDescription: 'Ouvindo podcast',
    usedTimeStrategy: false,
    timeStrategyDescription: '',
    selfRewarded: false,
    rewardDescription: '',
    sessionRating: 2
  }
];