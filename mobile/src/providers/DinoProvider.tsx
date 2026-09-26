import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/src/firebase';
import type { DinoCoupon, DinoMemory, DinoMessage, DinoPair } from '@/src/types';
import { syncWidgets } from '@/src/widgets/syncWidgets';

type DinoContextValue = {
  loading: boolean;
  user: User | null;
  displayName: string;
  pair: DinoPair | null;
  partnerName: string;
  coupons: DinoCoupon[];
  sentCoupons: DinoCoupon[];
  messages: DinoMessage[];
  mural: DinoMemory[];
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  sendMessage(body: string): Promise<void>;
  sendCoupon(input: { title: string; activity: string; expiresAt: Date }): Promise<void>;
  createPairInvite(): Promise<string>;
  acceptPairInvite(code: string): Promise<void>;
  unlinkPair(): Promise<void>;
  createPairInvite(): Promise<string>;
  acceptPairInvite(code: string): Promise<void>;
  unlinkPair(): Promise<void>;
};

const DinoContext = createContext<DinoContextValue | null>(null);

const mapDocs = <T,>(snapshot: any) =>
  snapshot.docs.map((item: any) => ({ id: item.id, ...item.data() })) as T[];

function randomPairCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('');
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function DinoProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('Dino');
  const [pair, setPair] = useState<DinoPair | null>(null);
  const [coupons, setCoupons] = useState<DinoCoupon[]>([]);
  const [sentCoupons, setSentCoupons] = useState<DinoCoupon[]>([]);
  const [messages, setMessages] = useState<DinoMessage[]>([]);
  const [mural, setMural] = useState<DinoMemory[]>([]);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setLoading(false);
  }), []);

  useEffect(() => {
    if (!user) {
      setPair(null);
      setCoupons([]);
      setSentCoupons([]);
      setMessages([]);
      setMural([]);
      setDisplayName('Dino');
      return;
    }

    const profileStop = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      setDisplayName(snapshot.data()?.displayName || user.displayName || 'Dino');
    });

    const pairStop = onSnapshot(
      query(collection(db, 'pairs'), where('memberUids', 'array-contains', user.uid)),
      (snapshot) => {
        const active = mapDocs<DinoPair>(snapshot)
          .filter((item) => item.active !== false)
          .at(0) ?? null;
        setPair(active);
      }
    );

    return () => {
      profileStop();
      pairStop();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user || !pair) {
      setCoupons([]);
      setSentCoupons([]);
      setMessages([]);
      setMural([]);
      return;
    }

    const pairId = pair.id;
    const receivedStop = onSnapshot(
      query(
        collection(db, 'coupons'),
        where('assignedToUid', '==', user.uid),
        where('pairId', '==', pairId)
      ),
      (snapshot) => setCoupons(mapDocs<DinoCoupon>(snapshot))
    );

    const sentStop = onSnapshot(
      query(
        collection(db, 'coupons'),
        where('createdByUid', '==', user.uid),
        where('pairId', '==', pairId)
      ),
      (snapshot) => setSentCoupons(mapDocs<DinoCoupon>(snapshot))
    );

    const receivedMessages = new Map<string, DinoMessage>();
    const sentMessages = new Map<string, DinoMessage>();
    const emitMessages = () => {
      const merged = new Map([...receivedMessages, ...sentMessages]);
      setMessages([...merged.values()].sort((a, b) => {
        const aTime = (a.createdAt as any)?.toMillis?.() ?? 0;
        const bTime = (b.createdAt as any)?.toMillis?.() ?? 0;
        return aTime - bTime;
      }));
    };

    const incomingStop = onSnapshot(
      query(
        collection(db, 'messages'),
        where('pairId', '==', pairId),
        where('targetUid', '==', user.uid)
      ),
      (snapshot) => {
        receivedMessages.clear();
        mapDocs<DinoMessage>(snapshot).forEach((item) => receivedMessages.set(item.id, item));
        emitMessages();
      }
    );

    const outgoingStop = onSnapshot(
      query(
        collection(db, 'messages'),
        where('pairId', '==', pairId),
        where('senderUid', '==', user.uid)
      ),
      (snapshot) => {
        sentMessages.clear();
        mapDocs<DinoMessage>(snapshot).forEach((item) => sentMessages.set(item.id, item));
        emitMessages();
      }
    );

    const muralStop = onSnapshot(
      query(collection(db, 'mural'), where('pairId', '==', pairId)),
      (snapshot) => setMural(mapDocs<DinoMemory>(snapshot))
    );

    return () => {
      receivedStop();
      sentStop();
      incomingStop();
      outgoingStop();
      muralStop();
    };
  }, [user?.uid, pair?.id]);

  const partnerName = useMemo(() => {
    if (!user || !pair) return '';
    const partnerUid = pair.memberUids.find((uid) => uid !== user.uid);
    return partnerUid ? (pair.memberNames?.[partnerUid] || 'Tu persona') : '';
  }, [pair, user?.uid]);

  useEffect(() => {
    if (!user) return;
    syncWidgets({
      partnerName,
      coupons,
      messages,
      mural,
      currentUid: user.uid,
    }).catch((error) => console.warn('No se pudieron sincronizar los widgets.', error));
  }, [user?.uid, partnerName, coupons, messages, mural]);

  const partnerUid = pair && user
    ? pair.memberUids.find((uid) => uid !== user.uid) || ''
    : '';

  const value: DinoContextValue = {
    loading,
    user,
    displayName,
    pair,
    partnerName,
    coupons,
    sentCoupons,
    messages,
    mural,
    login: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    logout: () => firebaseSignOut(auth),
    sendMessage: async (body) => {
      if (!user || !pair || !partnerUid || !body.trim()) return;
      await addDoc(collection(db, 'messages'), {
        pairId: pair.id,
        senderUid: user.uid,
        senderName: displayName,
        targetUid: partnerUid,
        title: displayName + ' te escribió 💜',
        body: body.trim(),
        createdAt: serverTimestamp(),
      });
    },
    sendCoupon: async ({ title, activity, expiresAt }) => {
      if (!user || !pair || !partnerUid) return;
      await addDoc(collection(db, 'coupons'), {
        pairId: pair.id,
        createdByUid: user.uid,
        createdByName: displayName,
        assignedToUid: partnerUid,
        assignedToName: partnerName,
        title: title.trim(),
        activity: activity.trim(),
        expiresAt,
        status: 'active',
        emoji: '💜',
        createdAt: serverTimestamp(),
      });
    },
    createPairInvite: async () => {
      if (!user) throw new Error('Debes iniciar sesión.');
      if (pair) throw new Error('Ya tienes un DinoDúo activo.');

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = randomCode();
        const inviteRef = doc(db, 'pairInvites', code);
        const existing = await getDoc(inviteRef);
        if (existing.exists()) continue;

        await setDoc(inviteRef, {
          fromUid: user.uid,
          fromName: displayName || 'Dino',
          status: 'pending',
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        });
        return code;
      }

      throw new Error('No se pudo generar un código único.');
    },
    acceptPairInvite: async (rawCode) => {
      if (!user) throw new Error('Debes iniciar sesión.');
      if (pair) throw new Error('Ya tienes un DinoDúo activo.');

      const code = rawCode.trim().toUpperCase();
      if (!code) throw new Error('Escribe el código de invitación.');

      const inviteRef = doc(db, 'pairInvites', code);
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) throw new Error('Código no encontrado.');

      const invite = inviteSnap.data();
      if (invite.status !== 'pending') throw new Error('Este código ya fue utilizado.');
      if (invite.fromUid === user.uid) throw new Error('No puedes vincularte contigo mismo.');
      if (invite.expiresAt?.toDate?.() < new Date()) throw new Error('Este código venció.');

      const pairRef = doc(collection(db, 'pairs'));
      const memberNames: Record<string, string> = {
        [invite.fromUid]: invite.fromName || 'Tu persona',
        [user.uid]: displayName || 'Dino',
      };

      const batch = writeBatch(db);
      batch.set(pairRef, {
        memberUids: [invite.fromUid, user.uid],
        memberNames,
        active: true,
        inviteCode: code,
        createdAt: serverTimestamp(),
      });
      batch.update(inviteRef, {
        status: 'accepted',
        toUid: user.uid,
        toName: displayName || 'Dino',
        pairId: pairRef.id,
        acceptedAt: serverTimestamp(),
      });
      await batch.commit();
    },
    unlinkPair: async () => {
      if (!user || !pair) throw new Error('No hay un DinoDúo activo.');
      const pairRef = doc(db, 'pairs', pair.id);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(pairRef);
        if (!snapshot.exists()) throw new Error('No se encontró el DinoDúo.');
        const current = snapshot.data();
        if (current.active === false || !current.memberUids?.includes(user.uid)) {
          throw new Error('No puedes cerrar este vínculo.');
        }
        transaction.update(pairRef, {
          active: false,
          unlinkedBy: user.uid,
          unlinkedAt: serverTimestamp(),
        });
      });
    },
  };

  return <DinoContext.Provider value={value}>{children}</DinoContext.Provider>;
}

export function useDino() {
  const value = useContext(DinoContext);
  if (!value) throw new Error('useDino debe usarse dentro de DinoProvider');
  return value;
}
