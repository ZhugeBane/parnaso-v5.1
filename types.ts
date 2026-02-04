
export interface Project {
  id: string;
  name: string;
  description: string;
  targetWordCount?: number;
  color: string; // Hex color for charts
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
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
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In a real app, never store plain text passwords
  role: 'admin' | 'user';
  isBlocked?: boolean;
}

export interface Friendship {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  adminId: string;
  members: string[]; // User IDs
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string; // Optional if group message
  groupId?: string;    // Optional if direct message
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