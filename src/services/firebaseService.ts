import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  signInAnonymously,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  getDocFromServer,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { FullAppState } from '../types';
import { sanitizeStateForStorage } from '../utils/storageUtils';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

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

export const FIRESTORE_UPGRADE_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

let firestoreQuotaExceeded = false;

export function isFirestoreQuotaExceeded(): boolean {
  return firestoreQuotaExceeded;
}

export function isQuotaError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error || '')).toLowerCase();
  return (
    msg.includes('quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('resource_exhausted') ||
    msg.includes('free daily read units')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaError(error)) {
    if (!firestoreQuotaExceeded) {
      firestoreQuotaExceeded = true;
      console.warn(
        `Firestore free daily quota exceeded (${operationType} ${path || ''}). Switching to local storage mode until quota resets or database is upgraded: ${FIRESTORE_UPGRADE_URL}`
      );
    }
    return;
  }

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

// Connection test as required by skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (isQuotaError(error)) {
      firestoreQuotaExceeded = true;
      console.warn(`Firestore daily quota exceeded. Using local storage fallback. Upgrade link: ${FIRESTORE_UPGRADE_URL}`);
    } else if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline.');
    }
  }
}
testConnection();

export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Google Sign-In Error:', err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export interface CloudSessionPayload {
  updatedAt: string;
  sessionCode: string;
  deviceId?: string;
  userId: string;
  userEmail: string;
  matrixTitle?: string;
  rowsCount?: number;
  state: FullAppState;
}

// Generate or retrieve persistent Device ID to identify the current computer
export function getOrCreateDeviceId(): string {
  const key = 'app_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
}

// Generate or retrieve persistent Session Code for quick device sync without login
export function getOrCreateDeviceSessionCode(): string {
  const key = 'app_session_code';
  let code = localStorage.getItem(key);
  if (!code) {
    code = 'SYNC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem(key, code);
  }
  return code;
}

/**
 * Checks if a cloud session was saved from a DIFFERENT / OLD device
 * Returns false if it was saved from the current machine (even after logging out and logging back in).
 */
export function isCloudSessionFromDifferentDevice(cloudSession: CloudSessionPayload | null): boolean {
  if (!cloudSession) return false;
  const currentCode = localStorage.getItem('app_session_code');
  const currentDevId = localStorage.getItem('app_device_id');

  // If this device created that cloud session, it's the SAME device!
  if (currentDevId && cloudSession.deviceId && currentDevId === cloudSession.deviceId) {
    return false;
  }
  if (currentCode && cloudSession.sessionCode && currentCode === cloudSession.sessionCode) {
    return false;
  }
  return true;
}

// Save active session state to Firestore
export async function syncSessionToFirestore(
  state: FullAppState,
  sessionCode?: string,
  user?: User | null
): Promise<void> {
  if (firestoreQuotaExceeded) return;
  const code = sessionCode || getOrCreateDeviceSessionCode();
  const devId = getOrCreateDeviceId();
  const matrixTitle = `Ma trận & Bản đặc tả ${state.mon || 'Toán'} lớp ${state.grade || '10'} (${state.semester || 'Giữa kì I'})`;
  const cleanState = sanitizeStateForStorage(state, true);
  const rowsCount = Array.isArray(cleanState.rows) ? cleanState.rows.length : 0;

  const payload: CloudSessionPayload = {
    updatedAt: new Date().toISOString(),
    sessionCode: code,
    deviceId: devId,
    userId: user?.uid || auth.currentUser?.uid || 'anonymous',
    userEmail: user?.email || auth.currentUser?.email || '',
    matrixTitle,
    rowsCount,
    state: cleanState,
  };

  try {
    // 1. Sync to public code collection for easy device switching via code
    const pathCode = `sessions/${code}`;
    await setDoc(doc(db, 'sessions', code), payload);

    // 2. If logged in, also sync to user's private collection
    const currentUser = user || auth.currentUser;
    if (currentUser && !currentUser.isAnonymous) {
      const pathUser = `users/${currentUser.uid}/session/active`;
      await setDoc(doc(db, 'users', currentUser.uid, 'session', 'active'), payload);

      // Also save a latest backup snapshot so work across devices is preserved
      if (rowsCount > 0) {
        await setDoc(doc(db, 'users', currentUser.uid, 'backups', 'latest'), payload);

        // Auto-save a history milestone if at least 4 minutes have passed since last milestone
        const nowMs = Date.now();
        if (nowMs - lastAutoHistorySaveTime > 4 * 60 * 1000) {
          saveCloudVersion(
            `Mốc tự động (${state.mon || 'Toán'} lớp ${state.grade || '10'} - ${new Date().toLocaleTimeString('vi-VN')})`,
            state,
            currentUser
          ).catch((e) => console.warn('Failed to auto-save history milestone:', e));
        }
      }
    }
  } catch (err) {
    if (isQuotaError(err)) {
      firestoreQuotaExceeded = true;
      console.warn('Firestore quota exceeded during sync; continuing with local storage.');
    } else {
      console.error('Error syncing session to Firestore:', err);
    }
  }
}

export interface CloudVersionItem {
  id: string;
  title: string;
  updatedAt: string;
  formattedTime?: string;
  deviceId?: string;
  sessionCode?: string;
  rowsCount: number;
  mon?: string;
  grade?: string;
  semester?: string;
  state: FullAppState;
}

let lastAutoHistorySaveTime = 0;

export async function saveCloudVersion(
  title: string,
  state: FullAppState,
  user?: User | null
): Promise<CloudVersionItem | null> {
  const currentUser = user || auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) return null;

  const versionId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const devId = getOrCreateDeviceId();
  const code = getOrCreateDeviceSessionCode();
  const cleanState = sanitizeStateForStorage(state, true);
  const rowsCount = Array.isArray(cleanState.rows) ? cleanState.rows.length : 0;
  const now = new Date();
  const nowIso = now.toISOString();
  const formattedTime = `${now.toLocaleTimeString('vi-VN')} ngày ${now.toLocaleDateString('vi-VN')}`;

  const item: CloudVersionItem = {
    id: versionId,
    title: title || `Ma trận & Bản đặc tả ${state.mon || 'Toán'} lớp ${state.grade || '10'} (${state.semester || 'Giữa kì I'})`,
    updatedAt: nowIso,
    formattedTime,
    deviceId: devId,
    sessionCode: code,
    rowsCount,
    mon: state.mon,
    grade: state.grade,
    semester: state.semester,
    state: cleanState,
  };

  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'history', versionId), item);
    // Also save as active so quick restore pointers remain in sync
    await setDoc(doc(db, 'users', currentUser.uid, 'session', 'active'), {
      ...item,
      userId: currentUser.uid,
      userEmail: currentUser.email || '',
      matrixTitle: item.title,
    });
    lastAutoHistorySaveTime = Date.now();
    return item;
  } catch (err) {
    console.error('Error saving cloud version:', err);
    return null;
  }
}

export async function fetchUserVersionHistory(uid: string): Promise<CloudVersionItem[]> {
  if (firestoreQuotaExceeded) return [];
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'history'));
    const list: CloudVersionItem[] = [];
    snap.forEach((docSnap) => {
      if (docSnap.exists() && docSnap.data()?.state) {
        list.push(docSnap.data() as CloudVersionItem);
      }
    });
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err) {
    if (isQuotaError(err)) {
      firestoreQuotaExceeded = true;
    }
    console.warn('Error fetching cloud version history:', err);
    return [];
  }
}

export async function deleteCloudVersion(uid: string, versionId: string): Promise<void> {
  try {
    lastAutoHistorySaveTime = Date.now();
    await deleteDoc(doc(db, 'users', uid, 'history', versionId));
  } catch (err) {
    console.error('Error deleting cloud version:', err);
  }
}

export async function deleteActiveUserSession(uid: string): Promise<void> {
  try {
    lastAutoHistorySaveTime = Date.now();
    await deleteDoc(doc(db, 'users', uid, 'session', 'active'));
    await deleteDoc(doc(db, 'users', uid, 'backups', 'latest'));
  } catch (err) {
    console.error('Error deleting active cloud session:', err);
  }
}

export async function deleteAllCloudVersions(uid: string): Promise<void> {
  try {
    lastAutoHistorySaveTime = Date.now();
    const snap = await getDocs(collection(db, 'users', uid, 'history'));
    const deletes = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all([
      ...deletes,
      deleteDoc(doc(db, 'users', uid, 'session', 'active')).catch(() => {}),
      deleteDoc(doc(db, 'users', uid, 'backups', 'latest')).catch(() => {}),
    ]);
  } catch (err) {
    console.error('Error deleting all cloud versions:', err);
  }
}

export async function syncSavedMatrixToCloud(item: any, user?: User | null): Promise<void> {
  const currentUser = user || auth.currentUser;
  if (!currentUser || currentUser.isAnonymous || !item?.id) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'saved_matrices', item.id), item);
  } catch (e) {
    console.warn('Failed to sync saved matrix to cloud:', e);
  }
}

export async function deleteCloudSavedMatrix(uid: string, itemId: string): Promise<void> {
  if (!uid || !itemId) return;
  try {
    await deleteDoc(doc(db, 'users', uid, 'saved_matrices', itemId));
  } catch (e) {
    console.warn('Failed to delete saved matrix from cloud:', e);
  }
}

export async function deleteAllCloudSavedMatrices(uid: string): Promise<void> {
  if (!uid) return;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'saved_matrices'));
    const deletes = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletes);
  } catch (e) {
    console.warn('Failed to delete all saved matrices from cloud:', e);
  }
}

export async function fetchCloudSavedMatrices(uid: string): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'saved_matrices'));
    const list: any[] = [];
    snap.forEach((d) => {
      if (d.exists() && d.data()?.state) {
        list.push(d.data());
      }
    });
    return list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  } catch (e) {
    console.warn('Failed to fetch saved matrices from cloud:', e);
    return [];
  }
}

// Fetch active session by Session Code (for switching devices)
export async function fetchSessionByCode(code: string): Promise<FullAppState | null> {
  if (firestoreQuotaExceeded) return null;
  const cleanCode = code.trim().toUpperCase();
  const path = `sessions/${cleanCode}`;
  try {
    const snap = await getDoc(doc(db, 'sessions', cleanCode));
    if (snap.exists() && snap.data().state) {
      return snap.data().state as FullAppState;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
}

// Fetch active user session with metadata by UID
export async function fetchUserSessionWithMeta(uid: string): Promise<CloudSessionPayload | null> {
  if (firestoreQuotaExceeded) return null;
  const path = `users/${uid}/session/active`;
  try {
    // First try active session
    let snap = await getDoc(doc(db, 'users', uid, 'session', 'active'));
    if (!snap.exists() || !snap.data()?.state) {
      // Fallback to latest backup if active session was missing
      snap = await getDoc(doc(db, 'users', uid, 'backups', 'latest'));
    }

    if (snap.exists() && snap.data()?.state) {
      return snap.data() as CloudSessionPayload;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
}

// Fetch active user session by UID
export async function fetchUserSession(uid: string): Promise<FullAppState | null> {
  const res = await fetchUserSessionWithMeta(uid);
  return res ? res.state : null;
}

// Subscribe to real-time updates for Session Code
export function subscribeSessionByCode(
  code: string,
  onUpdate: (state: FullAppState) => void
): () => void {
  if (firestoreQuotaExceeded) return () => {};
  const cleanCode = code.trim().toUpperCase();
  const path = `sessions/${cleanCode}`;
  return onSnapshot(
    doc(db, 'sessions', cleanCode),
    (snap) => {
      if (snap.exists() && snap.data()?.state) {
        onUpdate(snap.data().state as FullAppState);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

// Subscribe to real-time updates for User UID
export function subscribeUserSession(
  uid: string,
  onUpdate: (state: FullAppState) => void
): () => void {
  if (firestoreQuotaExceeded) return () => {};
  const path = `users/${uid}/session/active`;
  return onSnapshot(
    doc(db, 'users', uid, 'session', 'active'),
    (snap) => {
      if (snap.exists() && snap.data()?.state) {
        onUpdate(snap.data().state as FullAppState);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}
