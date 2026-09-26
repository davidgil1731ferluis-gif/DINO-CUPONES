import type { DinoCoupon, DinoMemory, DinoMessage } from '@/src/types';

export type WidgetSnapshot = {
  partnerName: string;
  coupons: DinoCoupon[];
  messages: DinoMessage[];
  mural: DinoMemory[];
  currentUid: string;
};

export async function syncWidgets(_snapshot: WidgetSnapshot) {
  // Platform implementations live in syncWidgets.ios.ts / syncWidgets.android.ts.
}
