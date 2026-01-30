import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import App from "./App.tsx";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolClientId: import.meta.env
        .VITE_COGNITO_USER_POOL_CLIENT_ID as string,
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_AUTH_DOMAIN as string,
          scopes: ["email", "openid", "profile"],
          redirectSignIn: [
            import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN as string,
          ],
          redirectSignOut: [
            import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT as string,
          ],
          responseType: "code",
        },
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
