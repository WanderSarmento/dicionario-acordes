import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Timestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export const ADMIN_EMAIL = 'wander.sarmentosantos@gmail.com';

export interface StudentRankingEntry {
  uid: string;
  displayName: string;
  avatarEmoji: string;
  correctCount: number;
  totalHits: number;
  attemptsCount: number;
  accuracy: number;
  bestStreak: number;
  completedIds: number[];
  isPublic: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export function sanitizeDisplayName(rawName: string): string {
  const cleaned = rawName.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2) return 'Aluno Harmonia';
  return cleaned.slice(0, 40);
}

export function sanitizeAvatarEmoji(rawEmoji: string): string {
  const cleaned = rawEmoji.trim();
  if (!cleaned) return '🎹';
  return cleaned.slice(0, 12);
}

export function sanitizeCompletedIds(ids: number[]): number[] {
  const uniqueInts = Array.from(
    new Set(ids.filter((n) => Number.isInteger(n) && n >= 1 && n <= 20))
  );
  return uniqueInts.slice(0, 20);
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutGoogle(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function subscribeToRankings(
  onData: (entries: StudentRankingEntry[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'rankings';
  const q = query(
    collection(db, path),
    where('correctCount', '>=', 0),
    orderBy('correctCount', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: StudentRankingEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.isPublic !== false) {
          items.push({
            uid: String(data.uid || docSnap.id),
            displayName: String(data.displayName || 'Aluno'),
            avatarEmoji: String(data.avatarEmoji || '🎹'),
            correctCount: Number(data.correctCount || 0),
            totalHits: Number(data.totalHits || 0),
            attemptsCount: Number(data.attemptsCount || 0),
            accuracy: Number(data.accuracy || 0),
            bestStreak: Number(data.bestStreak || 0),
            completedIds: Array.isArray(data.completedIds) ? data.completedIds.map(Number) : [],
            isPublic: Boolean(data.isPublic ?? true),
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
          });
        }
      });

      items.sort((a, b) => {
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
        if (b.totalHits !== a.totalHits) return b.totalHits - a.totalHits;
        const aTime = a.updatedAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
        const bTime = b.updatedAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });

      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function fetchMyRanking(uid: string): Promise<StudentRankingEntry | null> {
  const path = `rankings/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'rankings', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: String(data.uid || uid),
      displayName: String(data.displayName || 'Aluno'),
      avatarEmoji: String(data.avatarEmoji || '🎹'),
      correctCount: Number(data.correctCount || 0),
      totalHits: Number(data.totalHits || 0),
      attemptsCount: Number(data.attemptsCount || 0),
      accuracy: Number(data.accuracy || 0),
      bestStreak: Number(data.bestStreak || 0),
      completedIds: Array.isArray(data.completedIds) ? data.completedIds.map(Number) : [],
      isPublic: Boolean(data.isPublic ?? true),
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function upsertMyRanking(params: {
  uid: string;
  displayName: string;
  avatarEmoji: string;
  completedIds: number[];
  totalHits: number;
  attemptsCount: number;
  bestStreak: number;
}): Promise<void> {
  const docRef = doc(db, 'rankings', params.uid);
  const path = `rankings/${params.uid}`;

  const safeCompletedIds = sanitizeCompletedIds(params.completedIds);
  const safeCorrectCount = Math.min(20, Math.max(0, safeCompletedIds.length));
  const safeTotalHits = Math.min(10000, Math.max(0, Math.floor(params.totalHits)));
  const safeAttempts = Math.min(10000, Math.max(safeTotalHits, Math.floor(params.attemptsCount)));
  const safeAccuracy =
    safeAttempts > 0
      ? Math.min(100, Math.max(0, Math.round((safeTotalHits / safeAttempts) * 100)))
      : 0;
  const safeStreak = Math.min(1000, Math.max(0, Math.floor(params.bestStreak)));
  const safeName = sanitizeDisplayName(params.displayName);
  const safeEmoji = sanitizeAvatarEmoji(params.avatarEmoji);

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        displayName: safeName,
        avatarEmoji: safeEmoji,
        correctCount: safeCorrectCount,
        totalHits: safeTotalHits,
        attemptsCount: safeAttempts,
        accuracy: safeAccuracy,
        bestStreak: safeStreak,
        completedIds: safeCompletedIds,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        uid: params.uid,
        displayName: safeName,
        avatarEmoji: safeEmoji,
        correctCount: safeCorrectCount,
        totalHits: safeTotalHits,
        attemptsCount: safeAttempts,
        accuracy: safeAccuracy,
        bestStreak: safeStreak,
        completedIds: safeCompletedIds,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, existingSnapOperation(params.uid), path);
  }
}

function existingSnapOperation(_uid: string): OperationType {
  return OperationType.WRITE;
}

export async function removeRankingEntry(uid: string): Promise<void> {
  const path = `rankings/${uid}`;
  try {
    await deleteDoc(doc(db, 'rankings', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
