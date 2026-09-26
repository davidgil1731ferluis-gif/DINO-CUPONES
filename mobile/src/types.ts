export type DinoPair = {
  id: string;
  memberUids: string[];
  memberNames?: Record<string, string>;
  active?: boolean;
};

export type DinoCoupon = {
  id: string;
  pairId?: string | null;
  title: string;
  activity?: string;
  emoji?: string;
  status?: 'active' | 'pending' | 'completed' | 'expired';
  assignedToUid?: string;
  assignedToName?: string;
  createdByUid?: string;
  createdByName?: string;
  expiresAt?: unknown;
  createdAt?: unknown;
};

export type DinoMessage = {
  id: string;
  pairId: string;
  senderUid: string;
  senderName?: string;
  targetUid: string;
  title?: string;
  body?: string;
  createdAt?: unknown;
  readAt?: unknown;
};

export type DinoMemory = {
  id: string;
  pairId?: string | null;
  userId?: string;
  uploaderName?: string;
  caption?: string;
  type?: 'image' | 'video';
  mediaUrl?: string;
  createdAt?: unknown;
};
