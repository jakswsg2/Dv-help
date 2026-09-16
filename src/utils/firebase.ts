import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  Timestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Applicant } from '../types';

// Initialize Firebase if not already initialized
const app = getApps().length === 0 ? initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
}) : getApps()[0];

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
export default app;

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
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

const COLLECTION_NAME = 'applicants';

/* --------------------------------------------------------------------------
 * LEGACY DIRECT-WRITE HELPERS — SUPERSED
 *
 * These write straight to the un-scoped `applicants` collection and predate
 * the workspace model. The application no longer calls them: all writes now
 * flow through `applicantRepository` → `syncQueue` → `firebaseTransport`,
 * which enforce tenant isolation. They are retained (not exported by any UI)
 * only so external diagnostics scripts keep type-checking. Do NOT wire them
 * back into the app — they bypass the permission gate entirely.
 * ------------------------------------------------------------------------ */

/**
 * @deprecated Use `applicantRepository.saveApplicant` instead. Bypasses tenant
 * isolation and the offline sync queue.
 */
export async function saveApplicantCloud(applicant: Applicant): Promise<void> {
  const path = `${COLLECTION_NAME}/${applicant.id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, applicant.id);
    const payload = {
      ...applicant,
      updatedAt: Timestamp.now(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieve all applicants from Cloud Firestore
 */
export async function getApplicantsCloud(): Promise<Applicant[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const applicants: Applicant[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Applicant;
      applicants.push({
        ...data,
        id: docSnap.id,
      });
    });
    return applicants;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

/**
 * Retrieve a single applicant by ID from Cloud Firestore
 */
export async function getApplicantCloud(id: string): Promise<Applicant | null> {
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        ...(docSnap.data() as Applicant),
        id: docSnap.id,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * @deprecated Use `applicantRepository.removeApplicant` instead. Bypasses
 * tenant isolation and the offline sync queue.
 */
export async function deleteApplicantCloud(id: string): Promise<void> {
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

