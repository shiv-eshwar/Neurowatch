import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  getMe,
  signIn as apiSignIn,
  signInWithFirebaseToken,
  signOut as apiSignOut,
  signUp as apiSignUp
} from "./api";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile
} from "firebase/auth";
import { firebaseAuth, hasFirebaseConfig } from "./firebase";
import type { User } from "./types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  firebaseEnabled: boolean;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (input: { display_name: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_PROVIDER = (import.meta.env.VITE_AUTH_PROVIDER as string | undefined)?.toLowerCase() ?? "local";
const USE_FIREBASE_AUTH = AUTH_PROVIDER === "firebase";

function _firebaseErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const exchangeFirebaseToken = useCallback(async (idToken: string) => {
    const response = await signInWithFirebaseToken({ id_token: idToken });
    setUser(response.user);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await getMe();
      setUser(response.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        if (USE_FIREBASE_AUTH && firebaseAuth && hasFirebaseConfig) {
          const redirectResult = await getRedirectResult(firebaseAuth);
          if (redirectResult?.user) {
            const idToken = await redirectResult.user.getIdToken();
            await exchangeFirebaseToken(idToken);
            return;
          }
        }
        await refreshUser();
      } finally {
        setLoading(false);
      }
    })();
  }, [exchangeFirebaseToken, refreshUser]);

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      if (!USE_FIREBASE_AUTH) {
        const response = await apiSignIn(input);
        setUser(response.user);
        return;
      }

      if (!firebaseAuth || !hasFirebaseConfig) {
        throw new Error("Firebase auth is enabled but Firebase web config is missing.");
      }

      const credential = await signInWithEmailAndPassword(firebaseAuth, input.email, input.password);
      const idToken = await credential.user.getIdToken();
      await exchangeFirebaseToken(idToken);
    },
    [exchangeFirebaseToken]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!USE_FIREBASE_AUTH) {
      throw new Error("Google sign-in is not enabled for this environment.");
    }
    if (!firebaseAuth || !hasFirebaseConfig) {
      throw new Error("Firebase auth is enabled but Firebase web config is missing.");
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const credential = await signInWithPopup(firebaseAuth, provider);
      const idToken = await credential.user.getIdToken();
      await exchangeFirebaseToken(idToken);
    } catch (error) {
      const code = _firebaseErrorCode(error);
      if (code === "auth/popup-blocked") {
        await signInWithRedirect(firebaseAuth, provider);
        return;
      }
      throw error;
    }
  }, [exchangeFirebaseToken]);

  const signUp = useCallback(
    async (input: { display_name: string; email: string; password: string }) => {
      if (!USE_FIREBASE_AUTH) {
        const response = await apiSignUp(input);
        setUser(response.user);
        return;
      }

      if (!firebaseAuth || !hasFirebaseConfig) {
        throw new Error("Firebase auth is enabled but Firebase web config is missing.");
      }

      const credential = await createUserWithEmailAndPassword(firebaseAuth, input.email, input.password);
      if (input.display_name.trim()) {
        await updateProfile(credential.user, { displayName: input.display_name.trim() });
      }
      const idToken = await credential.user.getIdToken();
      await exchangeFirebaseToken(idToken);
    },
    [exchangeFirebaseToken]
  );

  const signOut = useCallback(async () => {
    if (USE_FIREBASE_AUTH && firebaseAuth) {
      await firebaseSignOut(firebaseAuth);
    }
    await apiSignOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      firebaseEnabled: USE_FIREBASE_AUTH && hasFirebaseConfig,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      refreshUser
    }),
    [loading, refreshUser, signIn, signInWithGoogle, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
