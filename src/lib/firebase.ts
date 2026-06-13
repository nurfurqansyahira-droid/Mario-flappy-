import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";

export { signOut, onAuthStateChanged };
import { 
  getFirestore, 
  doc, 
  getDoc,
  getDocs,
  setDoc, 
  updateDoc,
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocFromServer
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Establish whether configuration is active or a placeholder
export const isMockFirebase = !firebaseConfig.apiKey || firebaseConfig.apiKey.includes("MOCK");

// 1. Initialize Firebase application
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Export Database and Auth singletons
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// 3. Define mandatory operations enum for security exceptions auditing
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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

// 4. Secure Firestore Error Handler (REQUIRED by firebase-integration skill)
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Permission Security Error Details: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 5. Connection Test (REQUIRED by firebase-integration skill)
export async function auditFirestoreConnection() {
  if (isMockFirebase) {
    console.log("Firebase initialized in Local high-fidelity Sanbox mode.");
    return;
  }
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Firestore client appears offline or blockaded. Falling back to local replication cache.");
    }
  }
}

// Execute connection ping
auditFirestoreConnection();
