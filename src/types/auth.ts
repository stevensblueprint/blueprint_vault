export interface CognitoUser {
  username: string;
  email: string;
  email_verified: boolean;
  sub: string;
  "cognito:groups"?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: CognitoUser | null;
  hasAccess: boolean;
  isLoading: boolean;
}
