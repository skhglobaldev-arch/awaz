import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import firebaseConfig from "./firebase-applet-config.json";

const config = firebaseConfig as any;
console.log("Initializing Firebase with project:", config.projectId);
const app = initializeApp(config);
export const db = config.firestoreDatabaseId 
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);
console.log("Firestore initialized for database:", config.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);
export const functions = getFunctions(app, 'europe-west2');

// Ensure persistence is set to local
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});
