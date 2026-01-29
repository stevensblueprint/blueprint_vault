import { createContext } from "react";
import type { AuthState } from "../types/auth";

export interface AuthContextType extends AuthState {
  signIn: () => void;
  signOut: () => void;
  checkAccess: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
