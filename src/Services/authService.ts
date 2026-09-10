import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();

// Scopes required for Google Tasks, Contacts, Calendar, Gmail, Forms, Drive, Chat
provider.addScope('https://www.googleapis.com/auth/tasks');
provider.addScope('https://www.googleapis.com/auth/tasks.readonly');
provider.addScope('https://www.googleapis.com/auth/contacts');
provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
provider.addScope('https://www.googleapis.com/auth/user.emails.read');
provider.addScope('https://www.googleapis.com/auth/user.phonenumbers.read');
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
provider.addScope('https://mail.google.com/');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/gmail.compose');
provider.addScope('https://www.googleapis.com/auth/gmail.modify');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/forms.body');
provider.addScope('https://www.googleapis.com/auth/forms.body.readonly');
provider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');
provider.addScope('https://www.googleapis.com/auth/chat.spaces');
provider.addScope('https://www.googleapis.com/auth/chat.spaces.readonly');
provider.addScope('https://www.googleapis.com/auth/chat.messages');
provider.addScope('https://www.googleapis.com/auth/chat.messages.readonly');
provider.addScope('https://www.googleapis.com/auth/chat.messages.create');
provider.addScope('https://www.googleapis.com/auth/chat.memberships');
provider.addScope('https://www.googleapis.com/auth/chat.memberships.readonly');

let cachedAccessToken: string | null = null;
let currentUser: User | null = null;
let isSigningIn = false;

type AuthChangeListener = (user: User | null, token: string | null) => void;
const listeners: Set<AuthChangeListener> = new Set();

export const subscribeAuth = (listener: AuthChangeListener) => {
  listeners.add(listener);
  listener(currentUser, cachedAccessToken);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = () => {
  listeners.forEach((fn) => fn(currentUser, cachedAccessToken));
};

export const initAuth = () => {
  return onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (!user) {
      cachedAccessToken = null;
    }
    notifyListeners();
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google.');
    }

    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    notifyListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error durante Inicio de Sesión con Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  
  // If user is logged in but token was lost (e.g. page refresh), attempt re-auth popup or return null
  if (currentUser && !isSigningIn) {
    try {
      const result = await googleSignIn();
      return result.accessToken;
    } catch {
      return null;
    }
  }

  return null;
};

export const getCurrentUser = (): User | null => currentUser;

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  currentUser = null;
  notifyListeners();
};
