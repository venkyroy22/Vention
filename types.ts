
export enum UserStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

export interface User {
  id: string;
  clerkId?: string;
  name: string;
  email?: string;
  avatar: string;
  status: UserStatus;
  lastSeen?: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  text: string;
  timestamp: number;
  type: 'text' | 'note' | 'task' | 'drawing' | 'view-once-image';
  attachmentId?: string;
  imageUrl?: string;
  isViewed?: boolean;
  status: 'sent' | 'delivered' | 'read';
  statusUpdatedAt?: number;
  reactions?: Reaction[];
  isEdited?: boolean;
  editedAt?: number | null;
  replyTo?: { id: string; text: string; senderId: string };
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  color?: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
}
