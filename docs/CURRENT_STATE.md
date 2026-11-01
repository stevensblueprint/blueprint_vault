# Blueprint Vault: Current State

This document records the current state of the `blueprint_vault` repository, based on a review of the code, configuration, git history and tooling. It follows the same structure as `blueprint_deploy/docs/CURRENT_STATE.md`, and covers:

1. Repository and branch locations
2. Existing code and implemented features
3. Existing environments and verified AWS resources
4. Known operational limitations
5. Development setup status
6. Security gaps
7. Pending technical decisions
8. Reuse recommendation
9. What can be reused from `blueprint_deploy`

**Last verified:** 2026-11-01, against commit `6973bcb` on `main`.

## Summary: Verified Facts vs Unknowns

**Verified** (checked directly in the repository or by running the tooling):

- The repository location, the single `main` branch and the commit history (§1)
- The languages, frameworks and implemented features, which were read from the source code (§2)
- The CI/CD workflow configuration and the GitHub secrets it expects (§3)
- `npm ci`, `npm run lint` and `npm run build` all pass. There are no tests and no formatter (§5).
- The `npm audit` results from 2026-11-01 (§6)
- The auth code is shared with `blueprint_deploy`: `AuthContext.tsx` and `ProtectedRoute.tsx` are identical files in both repos (§1, §9).

**Unknown** (not checked yet, and needs someone with access):

- Whether the AWS resources referenced in the repo exist and match (§3). The AWS CLI and credentials were not available.
- Where the Password Vault backend API lives, which endpoints it has besides `GET /passwords`, and how it validates tokens
- How passwords are encrypted and decrypted, where that happens (browser or server), and how the KMS keys are set up
- Whether this app uses the same AWS account and Cognito user pool as `blueprint_deploy`
- GitHub settings: branch protection, Dependabot, secret scanning, and whether the Actions secrets are set
- Whether the app works end to end against the real backend
- Who the Project Owner and intended users are, and whether the project is still active (there have been no commits since 2026-01-31)

## 1) Repository & Branch Locations

| Item           | Value                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Remote         | `https://github.com/stevensblueprint/blueprint_vault.git` (GitHub org `stevensblueprint`). The repo is public.                       |
| Branches       | `main` only, both locally and on `origin`. No feature, staging or release branches exist.                                            |
| Default branch | `main` (`origin/HEAD -> origin/main`)                                                                                                |
| History        | 35 commits, from 2026-01-27 to 2026-01-31. All were authored by one contributor (`miguel-merlin`). There has been no activity since. |
| Code owners    | `.github/CODEOWNERS` assigns every file to `@miguel-merlin`.                                                                         |

- This repository contains **only the React frontend**. The Password Vault backend API (read from `VITE_PASSWORD_VAULT_API_URL`), the storage for password entries, the KMS keys and any infrastructure-as-code live somewhere else. That location is not referenced anywhere in this repo.
- This repo was built **before** `blueprint_deploy`, whose first commit is dated 2026-02-07. `blueprint_deploy` copied its auth code and its deploy workflow from here (see §9).
- Branch protection rules and GitHub security settings could not be checked from the CLI because `gh` is not authenticated. Someone with org access needs to confirm them in GitHub.

## 2) Existing Code & Implemented Features

**Stack:** React 19, TypeScript 5.9, Vite 7, React Router 7, Axios and AWS Amplify v6 (Cognito). The app has 10 TypeScript files (about 720 lines) under `src/`. **There is no styling at all.** The repo has no CSS files, and although some components use Tailwind class names, Tailwind is not installed, so those pages render unstyled.

**Overall status: early prototype.** Login and an authenticated API client are in place. The only vault feature is a plain list of entry labels and usernames.

| Feature                                                                   | Status                                                                                                                                                         | Where                                          |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Cognito login via Hosted UI (OAuth code flow)                             | Implemented. The file is identical to the one in `blueprint_deploy`.                                                                                           | `src/main.tsx`, `src/contexts/AuthContext.tsx` |
| Protected routes that redirect to login and then back to the original URL | Implemented                                                                                                                                                    | `src/components/ProtectedRoute.tsx`            |
| OAuth callback                                                            | Implemented, **but** if no return URL was saved, it sends the user to `/dashboard`. That route doesn't exist, so the user sees the 404 page.                   | `OAuthCallback` in `src/App.tsx`               |
| Authenticated API client                                                  | Implemented. Every request carries the Cognito **ID token** as a `Bearer` header. A `401` response is only logged (there is a `TODO`).                         | `src/api/apiClient.ts`                         |
| `useApi` hook                                                             | Implemented. Refreshes the session every 50 minutes and provides a `withAuth` wrapper, which nothing uses yet.                                                 | `src/api/useApi.ts`                            |
| List password entries                                                     | **Minimal.** An unstyled list showing "label - username", under the heading "Home Page"                                                                        | `src/pages/Home.tsx` → `GET /passwords`        |
| 404 page                                                                  | Implemented, but unstyled (it uses Tailwind classes)                                                                                                           | `src/pages/NotFound.tsx`                       |
| Header with "Welcome" and Sign Out                                        | **Coded but never rendered.** Nothing imports `Header`, so users cannot log out.                                                                               | `src/components/Header.tsx`                    |
| Create entry                                                              | **Not implemented.** Only request and response types exist.                                                                                                    | `src/types/passwords.ts`                       |
| View, reveal or decrypt a password                                        | **Not implemented.** A `DecryptedPasswordEntry` type exists, but there is no decryption code.                                                                  | `src/types/passwords.ts`                       |
| Edit or delete entry                                                      | **Not implemented.** No types or code exist.                                                                                                                   | —                                              |
| Search, copy to clipboard, password generator, sharing                    | **Not implemented**                                                                                                                                            | —                                              |
| Branding                                                                  | **None.** The six logo images in `src/assets/` are not used. `react.svg` is left over from the Vite template. Only the favicon (`public/bp_logo.png`) is used. | `src/assets/`                                  |
| Automated tests                                                           | **None.** There is no test framework, no test files and no `test` script.                                                                                      | —                                              |
| Documentation                                                             | **None.** There is no `docs/` folder (apart from this file), and `README.md` is the unmodified Vite template.                                                  | `README.md`                                    |

**Data model** (`src/types/passwords.ts`): each `PasswordEntry` has `entryId`, `label`, `username`, an optional `url` and `notes`, `ciphertext` (Base64), `kmsKeyId`, `encryptionContext`, `createdAt` and `updatedAt`. _Assumed:_ this points to envelope encryption with AWS KMS, where only the password is encrypted. That has not been confirmed with the backend.

## 3) Existing Environments & Verified AWS Resources

> The AWS CLI is not installed in this environment, and no AWS credentials were available. **None of the resources below have been checked against the live AWS account.** They are what the repository references. A team member with AWS access needs to confirm each one.

**Environments:** There is a single environment, production. It is deployed from `main` on every push. The repo has no staging or preview environment.

| Resource                                           | What the repo shows                                                                                                                                 | Verified in AWS? |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| AWS account                                        | Read from the `AWS_ACCOUNT_ID` secret. It is not hardcoded anywhere. _Unknown:_ whether it is the same account as `blueprint_deploy`.               | No               |
| Region                                             | Read from the `AWS_REGION` and `VITE_AWS_REGION` secrets. The code never reads `VITE_AWS_REGION`.                                                   | No               |
| IAM role (GitHub OIDC)                             | `arn:aws:iam::<account>:role/github-deployer-blueprint_vault`                                                                                       | No               |
| S3 bucket (static site)                            | Name stored in the `S3_BUCKET` secret                                                                                                               | No               |
| CloudFront distribution                            | ID stored in the `DISTRIBUTION_ID` secret                                                                                                           | No               |
| Cognito user pool, app client and Hosted UI domain | Values stored in the `VITE_COGNITO_*` secrets. _Unknown:_ whether this is the same user pool as `blueprint_deploy`.                                 | No               |
| Password Vault API                                 | URL stored in the `VITE_PASSWORD_VAULT_API_URL` secret. _Unknown:_ how it is built (API Gateway and Lambda are likely, but nothing documents this). | No               |
| KMS key(s)                                         | Each entry carries a `kmsKeyId`, but no key is referenced in the configuration                                                                      | No               |
| Entry storage (database)                           | Not referenced anywhere                                                                                                                             | No               |
| App URL                                            | `VITE_APP_URL` secret. It is passed to the build, but the code never reads it.                                                                      | No               |

GitHub Actions secrets the deploy workflow expects: `AWS_ACCOUNT_ID`, `AWS_REGION`, `S3_BUCKET`, `DISTRIBUTION_ID`, `VITE_AWS_REGION`, `VITE_COGNITO_AUTH_DOMAIN`, `VITE_COGNITO_REDIRECT_SIGN_IN`, `VITE_COGNITO_REDIRECT_SIGN_OUT`, `VITE_COGNITO_USER_POOL_CLIENT_ID`, `VITE_COGNITO_USER_POOL_ID`, `VITE_PASSWORD_VAULT_API_URL`, `VITE_APP_URL`. Whether these are set could not be checked.

## 4) Known Operational Limitations

- **No CI checks.** The only workflow is `deploy.yml`. Lint never runs in CI, and nothing checks pull requests. A TypeScript error does stop the deploy, because the build runs in the same job, but lint errors still deploy.
- **The callback can land on a 404.** `OAuthCallback` falls back to `/dashboard`, which is not a route.
- **Users cannot log out.** `Header` contains the Sign Out button, but it is never rendered.
- **The logout fallback is broken.** If `signOut()` fails, `AuthContext` builds the logout URL from `VITE_COGNITO_DOMAIN`. Nothing defines that variable: the workflow and `main.tsx` use `VITE_COGNITO_AUTH_DOMAIN`. `blueprint_deploy` has the same bug.
- **No styling.** The Tailwind classes in `NotFound.tsx` and `ProtectedRoute.tsx` have no effect, because Tailwind is not installed.
- **`401` responses are not handled.** When a token expires, the user only sees "Failed to load passwords." The re-login path is a `TODO` in `apiClient.ts`.
- **Localhost redirect URLs are hardcoded.** `main.tsx` adds `http://localhost:5173/callback` and `http://localhost:5173/` to the Cognito configuration, so they are also included in production builds.
- **Unused dependencies.** `@aws-amplify/ui-react`, `amazon-cognito-identity-js` and `jwt-decode` are installed but never imported. `@types/jwt-decode` targets jwt-decode v2, but v4 is installed and ships its own types. Two of these packages carry vulnerabilities (§6).
- **Unused configuration and code.** The `VITE_APP_URL` and `VITE_AWS_REGION` secrets are passed to the build but never read. Five of the types in `passwords.ts` and all six images in `src/assets/` are unused.
- **The token refresh timer is shared and probably redundant.** Each component that calls `useApi` restarts the same 50-minute timer on the shared `apiClient`, and any one of them unmounting stops it for all. Amplify already refreshes tokens when `fetchAuthSession()` is called, so the timer is likely unnecessary.
- **The favicon's type is wrong.** `index.html` declares `bp_logo.png` as `image/svg+xml`.
- **The Node versions differ.** CI uses Node 20, and nothing pins the version locally (there is no `.nvmrc` and no `engines` field).
- **No README or setup instructions**, and **no tests**.

## 5) Development Setup Status

These were checked on 2026-11-01 with Node v22.23.3 and npm 10.9.9 (WSL2):

| Step                                     | Result                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm ci`                                 | ✅ Installs cleanly from `package-lock.json`                                            |
| `npm run lint`                           | ✅ Passes with no errors                                                                |
| `npm run build` (`tsc -b && vite build`) | ✅ Passes. JS bundle is about 343 kB (113 kB gzipped).                                  |
| Formatting check                         | ❌ Not available. Prettier is not installed and there is no format script.              |
| `npm run dev` against a real backend     | ❌ Not verified. There is no `.env.local`, and no API or Cognito values were available. |
| Tests                                    | ❌ No test setup exists                                                                 |

Gaps in the setup:

- The repo has no `.env.example`, and the README has no setup steps. The `.env.local` the code needs is:

  ```env
  VITE_PASSWORD_VAULT_API_URL=
  VITE_COGNITO_USER_POOL_ID=
  VITE_COGNITO_USER_POOL_CLIENT_ID=
  VITE_COGNITO_AUTH_DOMAIN=
  VITE_COGNITO_REDIRECT_SIGN_IN=http://localhost:5173/callback
  VITE_COGNITO_REDIRECT_SIGN_OUT=http://localhost:5173/
  ```

  The localhost redirect URLs also need to be registered on the Cognito app client.

- There is no local mock of the backend API, so the UI cannot be exercised without the deployed backend.
- There is no Prettier setup, so formatting is inconsistent. For example, `index.html` and `vite.config.ts` use a different style from `src/`.

## 6) Security Gaps

This app stores passwords, so it needs a higher security standard than `blueprint_deploy`.

- **The encryption design is not documented.** The data model suggests KMS envelope encryption, but nothing records where decryption happens. If the browser decrypts, it needs some form of KMS access, and that path has to be designed. If the server decrypts, plaintext passwords travel to the browser. This needs a written threat model before the reveal feature is built.
- **The list endpoint returns ciphertext for every entry.** `ListPasswordEntriesResponse` returns full `PasswordEntry` objects, including `ciphertext`, even though the list only shows the label and username. The list response should leave the ciphertext out, and it should only be fetched when one entry is opened. _Assumed_ from the types; this has not been confirmed with the API.
- **`url` and `notes` are stored as plaintext.** Only the password field is encrypted in the model. Notes often hold secrets such as recovery codes or PINs.
- **The API is called with the ID token.** `apiClient.ts` sends the Cognito ID token as the `Bearer` token. Cognito access tokens are the type intended for API authorization (they carry scopes). Which token the backend expects, and whether it validates it, is _Unknown_.
- **No access model is documented.** It is not recorded whether vaults are personal or shared, or who can see whose entries.
- **No session protections.** The app has no idle timeout or auto-lock, and does not ask users to sign in again before revealing a password. Neither has been designed yet.
- **No security headers or Content Security Policy.** `index.html` defines no CSP, and the CloudFront response-header settings are _Unknown_. A strict CSP is strongly recommended for a password manager.
- **Errors are written to the console.** `AuthContext`, `apiClient` and `Home` log error objects with `console.*` in production builds, and these can include response data.
- **Localhost redirect URLs in production** (§4). Redirect URLs should be set per environment, and the production Cognito app client should not allow localhost.
- **Unused auth libraries.** `amazon-cognito-identity-js` and `@aws-amplify/ui-react` are never used, but they ship with the app and add vulnerabilities (see below).
- **No security policy.** The repo has no `SECURITY.md` or `LICENSE`. `CODEOWNERS` exists but names a single person.
- **No automated scanning is configured in the repo.** There is no `.github/dependabot.yml` and no CodeQL workflow. Whether Dependabot alerts and secret scanning are enabled in GitHub could not be checked.
- **Workflow hygiene.** Deploys use GitHub OIDC with no long-lived AWS keys, which is good. The IAM role's trust policy should be checked to make sure it only allows `repo:stevensblueprint/blueprint_vault:ref:refs/heads/main`.

### Dependency vulnerabilities (`npm audit`)

`npm audit` was run on 2026-11-01 and reports **48** vulnerabilities.

| Severity  | All dependencies | Production deps only (`--omit=dev`) | Dev or build tooling only |
| --------- | ---------------- | ----------------------------------- | ------------------------- |
| Low       | 1                | 0                                   | 1                         |
| Moderate  | 27               | 24                                  | 3                         |
| High      | 19               | 7                                   | 12                        |
| Critical  | 1                | 1                                   | 0                         |
| **Total** | **48**           | **32**                              | **16**                    |

Key points:

- **Two thirds (32 of 48) ship to users.** In `blueprint_deploy` it is 17 of 40. These are the ones to fix first. The High ones are `axios`, `react-router` and `react-router-dom`, `lodash`, `js-cookie`, `form-data` and `amazon-cognito-identity-js`.
- **Most of the Moderates share one root cause.** The Critical `fast-xml-parser` advisory comes in through `aws-amplify` (via `@aws-amplify/analytics` and `@aws-amplify/storage`). It causes 19 AWS SDK and Amplify packages to be flagged as Moderate dependents. Updating `aws-amplify` clears all of them.
- **Removing the unused dependencies helps immediately.** Uninstalling `@aws-amplify/ui-react` and `amazon-cognito-identity-js` removes at least 4 flagged packages (`@aws-amplify/ui`, `@aws-amplify/ui-react`, `@aws-amplify/ui-react-core` and `amazon-cognito-identity-js`).
- **Everything can be fixed with a plain `npm audit fix`.** Unlike `blueprint_deploy`, none of these fixes needs a breaking `--force` upgrade.

> Note: `npm audit` counts 24 directly vulnerable packages plus 24 packages flagged only because they depend on one. Each dependent is listed under the package it depends on: 19 under `fast-xml-parser`, 3 under `lodash`, 1 under `js-cookie` and 1 under `react-router`. Dependents count toward their own severity, which is shown in brackets.

#### 1) Low — 1 vulnerability

##### `@babel/core` `<=7.29.0`

- @babel/core: Arbitrary File Read via sourceMappingURL Comment — [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/@babel/core`

---

#### 2) Moderate — 27 vulnerabilities

##### `@humanfs/node` `<0.16.8`

- humanfs: Recursive copy follows symlinked files and copies data from outside the source tree — [GHSA-p498-v437-472g](https://github.com/advisories/GHSA-p498-v437-472g)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/@humanfs/node`

##### `ajv` `<6.14.0`

- ajv has ReDoS when using `$data` option — [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/ajv`

##### `baseline-browser-mapping` `>=2.0.0 <2.11.0`

- baseline-browser-mapping process termination on invalid input causes denial of service — [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/baseline-browser-mapping`

##### `follow-redirects` `<=1.15.11`

- follow-redirects leaks Custom Authentication Headers to Cross-Domain Redirect Targets — [GHSA-r4q5-vmmm-2653](https://github.com/advisories/GHSA-r4q5-vmmm-2653)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/follow-redirects`

##### `uuid` `<11.1.1`

- uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided — [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/uuid`

---

#### 3) High — 19 vulnerabilities

##### `axios` `1.0.0 - 1.19.0`

- Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF — [GHSA-3p68-rc4w-qgx5](https://github.com/advisories/GHSA-3p68-rc4w-qgx5)
- Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy — [GHSA-w9j2-pvgh-6h63](https://github.com/advisories/GHSA-w9j2-pvgh-6h63)
- Axios: Incomplete Fix for CVE-2025-62718 — NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Axios 1.15.0 — [GHSA-pmwg-cvhr-8vh7](https://github.com/advisories/GHSA-pmwg-cvhr-8vh7)
- Axios: Invisible JSON Response Tampering via Prototype Pollution Gadget in `parseReviver` — [GHSA-3w6x-2g7m-8v23](https://github.com/advisories/GHSA-3w6x-2g7m-8v23)
- Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams — [GHSA-xhjh-pmcv-23jw](https://github.com/advisories/GHSA-xhjh-pmcv-23jw)
- Axios: CRLF Injection in multipart/form-data body via unsanitized blob.type in formDataToStream — [GHSA-445q-vr5w-6q77](https://github.com/advisories/GHSA-445q-vr5w-6q77)
- Axios: no_proxy bypass via IP alias allows SSRF — [GHSA-m7pr-hjqh-92cm](https://github.com/advisories/GHSA-m7pr-hjqh-92cm)
- Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0 — [GHSA-5c9x-8gcm-mpgx](https://github.com/advisories/GHSA-5c9x-8gcm-mpgx)
- Axios: HTTP adapter streamed responses bypass maxContentLength — [GHSA-vf2m-468p-8v99](https://github.com/advisories/GHSA-vf2m-468p-8v99)
- Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking — [GHSA-pf86-5x62-jrwf](https://github.com/advisories/GHSA-pf86-5x62-jrwf)
- Axios: Header Injection via Prototype Pollution — [GHSA-6chq-wfr3-2hj9](https://github.com/advisories/GHSA-6chq-wfr3-2hj9)
- Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion — [GHSA-xx6v-rp6x-q39c](https://github.com/advisories/GHSA-xx6v-rp6x-q39c)
- Axios is Vulnerable to Denial of Service via \_\_proto\_\_ Key in mergeConfig — [GHSA-43fc-jf86-j433](https://github.com/advisories/GHSA-43fc-jf86-j433)
- Axios has prototype pollution read-side gadgets in HTTP adapter that allow credential injection and request hijacking — [GHSA-q8qp-cvcw-x6jj](https://github.com/advisories/GHSA-q8qp-cvcw-x6jj)
- Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain — [GHSA-fvcv-3m26-pcqx](https://github.com/advisories/GHSA-fvcv-3m26-pcqx)
- Axios: unbounded recursion in toFormData causes DoS via deeply nested request data — [GHSA-62hf-57xw-28j9](https://github.com/advisories/GHSA-62hf-57xw-28j9)
- Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection — [GHSA-hfxv-24rg-xrqf](https://github.com/advisories/GHSA-hfxv-24rg-xrqf)
- Allocation of Resources Without Limits or Throttling in Axios — [GHSA-777c-7fjr-54vf](https://github.com/advisories/GHSA-777c-7fjr-54vf)
- Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter — [GHSA-p92q-9vqr-4j8v](https://github.com/advisories/GHSA-p92q-9vqr-4j8v)
- Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection — [GHSA-j5f8-grm9-p9fc](https://github.com/advisories/GHSA-j5f8-grm9-p9fc)
- axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge — [GHSA-3g43-6gmg-66jw](https://github.com/advisories/GHSA-3g43-6gmg-66jw)
- axios Vulnerable to Full Man-in-the-Middle via Prototype Pollution Gadget in `config.proxy` — [GHSA-35jp-ww65-95wh](https://github.com/advisories/GHSA-35jp-ww65-95wh)
- axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions — [GHSA-898c-q2cr-xwhg](https://github.com/advisories/GHSA-898c-q2cr-xwhg)
- Axios: Prototype pollution gadgets can alter axios request construction — [GHSA-mmx7-hfxf-jppx](https://github.com/advisories/GHSA-mmx7-hfxf-jppx)
- Axios: Deep formToJSON Key Recursion Can Cause Denial of Service — [GHSA-pmv8-rq9r-6j72](https://github.com/advisories/GHSA-pmv8-rq9r-6j72)
- Axios: HTTP/2 streamed uploads bypass `maxBodyLength` — [GHSA-mwf2-3pr3-8698](https://github.com/advisories/GHSA-mwf2-3pr3-8698)
- Axios: Nested axios option objects can consume polluted prototype values — [GHSA-7q8q-rj6j-mhjq](https://github.com/advisories/GHSA-7q8q-rj6j-mhjq)
- Axios: Fetch adapter `ReadableStream` uploads bypass `maxBodyLength` — [GHSA-jqh4-m9w3-8hp9](https://github.com/advisories/GHSA-jqh4-m9w3-8hp9)
- Axios: Excessive recursion in formDataToJSON can cause denial of service — [GHSA-42h9-826w-cgv3](https://github.com/advisories/GHSA-42h9-826w-cgv3)
- Axios: Prototype pollution gadget in fetch adapter can alter outbound requests — [GHSA-vh66-26gq-q6x8](https://github.com/advisories/GHSA-vh66-26gq-q6x8)
- Axios: Prototype-Pollution Gadget in the Default Instance Allows Inherited Object.prototype.method to Override HTTP Method — [GHSA-9fr6-4gfg-395g](https://github.com/advisories/GHSA-9fr6-4gfg-395g)
- Axios: HTTP/2 adapter bypasses configured DNS lookup and proxy controls — [GHSA-3pq3-5fj3-cg6v](https://github.com/advisories/GHSA-3pq3-5fj3-cg6v)
- Axios: Denial of Service via Unhandled 'error' Event in HTTP/2 ClientHttp2Session Initialization — [GHSA-542g-h47m-68v8](https://github.com/advisories/GHSA-542g-h47m-68v8)
- Axios: Header Injection via Inherited headers After Minimal Interceptor — [GHSA-j8rh-479h-cp32](https://github.com/advisories/GHSA-j8rh-479h-cp32)
- Axios: Fetch Adapter Header Injection via Inherited FormData getHeaders — [GHSA-4hqw-qxg8-jxx2](https://github.com/advisories/GHSA-4hqw-qxg8-jxx2)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/axios`

##### `brace-expansion` `<=1.1.20 || 2.0.0 - 2.1.6`

- brace-expansion: Zero-step sequence causes process hang and memory exhaustion — [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v)
- brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups — [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp)
- brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash — [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg)
- brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation — [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895)
- brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service — [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr)
- brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion — [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7)
- brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion — [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion`, `node_modules/brace-expansion`

##### `browserslist` `<=4.28.6`

- Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM — [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx)
- Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) — [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/browserslist`

##### `flatted` `<=3.4.1`

- flatted vulnerable to unbounded recursion DoS in parse() revive phase — [GHSA-25h7-pfq9-p65f](https://github.com/advisories/GHSA-25h7-pfq9-p65f)
- Prototype Pollution via parse() in NodeJS flatted — [GHSA-rf6f-7fwh-wjgh](https://github.com/advisories/GHSA-rf6f-7fwh-wjgh)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/flatted`

##### `form-data` `4.0.0 - 4.0.5`

- form-data: CRLF injection in form-data via unescaped multipart field names and filenames — [GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/form-data`

##### `js-cookie` `<=3.0.5`

- JavaScript Cookie: Per-instance prototype hijack in assign() enables cookie-attribute injection — [GHSA-qjx8-664m-686j](https://github.com/advisories/GHSA-qjx8-664m-686j)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/@aws-amplify/core/node_modules/js-cookie`, `node_modules/js-cookie`

**Dependent packages (1):** flagged only because they depend on `js-cookie`: `amazon-cognito-identity-js` (high)

##### `js-yaml` `4.0.0 - 4.3.1`

- JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases — [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68)
- js-yaml: YAML merge-key chains can force quadratic CPU consumption — [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m)
- JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported — [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj)
- js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources — [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/js-yaml`

##### `lodash` `<=4.17.23`

- lodash vulnerable to Code Injection via `_.template` imports key names — [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc)
- lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit` — [GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh)
- Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions — [GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/@aws-amplify/ui-react-core/node_modules/lodash`, `node_modules/@aws-amplify/ui-react/node_modules/lodash`, `node_modules/@aws-amplify/ui/node_modules/lodash`, `node_modules/lodash`

**Dependent packages (3):** flagged only because they depend on `lodash`: `@aws-amplify/ui` (moderate), `@aws-amplify/ui-react` (moderate), `@aws-amplify/ui-react-core` (moderate)

##### `minimatch` `<=11.0.0`

- minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern — [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26)
- minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments — [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj)
- minimatch ReDoS: nested \*() extglobs generate catastrophically backtracking regular expressions — [GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74)
- minimatch has potential denial of service via globparts amplification — [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch`, `node_modules/minimatch`

##### `nanoid` `<=3.3.17`

- nanoid: non-secure generators can loop indefinitely with negative size — [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv)
- nanoid: custom generators can loop indefinitely when size is zero — [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8)
- nanoid: Integer Overflow or Wraparound — [GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/nanoid`

##### `picomatch` `4.0.0 - 4.0.3`

- Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching — [GHSA-3v7f-55p6-f55p](https://github.com/advisories/GHSA-3v7f-55p6-f55p)
- Picomatch has a ReDoS vulnerability via extglob quantifiers — [GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/picomatch`

##### `postcss` `<=8.5.22`

- PostCSS has XSS via Unescaped &lt;/style&gt; in its CSS Stringify Output — [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)
- PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments — [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q)
- PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset — [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp)
- PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure — [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/postcss`

##### `react-router` `6.0.0 - 7.18.1`

- React Router's vendored turbo-stream v2 allows arbitrary constructor invocation via TYPE_ERROR deserialization leading to Unauth RCE — [GHSA-49rj-9fvp-4h2h](https://github.com/advisories/GHSA-49rj-9fvp-4h2h)
- React Router vulnerable to XSS in unstable RSC redirect handling via javascript: redirect targets — [GHSA-8646-j5j9-6r62](https://github.com/advisories/GHSA-8646-j5j9-6r62)
- React Router vulnerable to DoS via unbounded path expansion in \_\_manifest endpoint — [GHSA-8x6r-g9mw-2r78](https://github.com/advisories/GHSA-8x6r-g9mw-2r78)
- React Router vulnerable to Denial of Service via reflected user input in single-fetch — [GHSA-rxv8-25v2-qmq8](https://github.com/advisories/GHSA-rxv8-25v2-qmq8)
- React Router: Potential CSRF via PUT/PATCH/DELETE document requests — [GHSA-84g9-w2xq-vcv6](https://github.com/advisories/GHSA-84g9-w2xq-vcv6)
- React Router: Open redirect via backslash in &lt;Link&gt; and useNavigate (CVE-2025-68470 bypass) — [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6)
- React Router: RSCErrorHandler Missing Protocol Validation (XSS) — [GHSA-h8fp-f39c-q6mh](https://github.com/advisories/GHSA-h8fp-f39c-q6mh)
- React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration — [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg)
- React Router: Unauthenticated Denial of Service via Inefficient Route Matching — [GHSA-chx6-hx7r-mcp5](https://github.com/advisories/GHSA-chx6-hx7r-mcp5)
- React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation — [GHSA-2j2x-hqr9-3h42](https://github.com/advisories/GHSA-2j2x-hqr9-3h42)
- React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response — [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)
- React Router has stored XSS via unescaped Location header in prerendered redirect HTML — [GHSA-f22v-gfqf-p8f3](https://github.com/advisories/GHSA-f22v-gfqf-p8f3)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/react-router`

**Dependent packages (1):** flagged only because they depend on `react-router`: `react-router-dom` (high)

##### `rollup` `4.0.0 - 4.58.0`

- Rollup 4 has Arbitrary File Write via Path Traversal — [GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/rollup`

##### `source-map-js` `1.0.0 - 1.2.1`

- source-map-js allows event-loop denial of service through indexed source-map section offsets — [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/source-map-js`

##### `vite` `7.0.0 - 7.3.6`

- Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling — [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)
- Vite: `server.fs.deny` bypassed with queries — [GHSA-v2wj-q39q-566r](https://github.com/advisories/GHSA-v2wj-q39q-566r)
- Vite Vulnerable to Arbitrary File Read via Vite Dev Server WebSocket — [GHSA-p9ff-h696-f583](https://github.com/advisories/GHSA-p9ff-h696-f583)
- launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows — [GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)
- launch-editor: escapeCmdArgs() omits % escaping on Windows — [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv)
- launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors — [GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw)
- launch-editor: `fs.existsSync()` existence check can be bypassed on Windows — [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm)
- Vite: Cross origin script execution through Vite custom middleware — [GHSA-9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw)
- Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine — [GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22)
- vite: `server.fs.deny` bypass on Windows alternate paths — [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/vite`

##### `zod` `<4.6.6`

- Zod can exhaust memory while validating oversized constrained collections — [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/zod`

---

#### 4) Critical — 1 vulnerability

##### `fast-xml-parser` `<=5.6.0`

- fast-xml-parser has an entity encoding bypass via regex injection in DOCTYPE entity names — [GHSA-m7jm-9gc2-mpf2](https://github.com/advisories/GHSA-m7jm-9gc2-mpf2)
- fast-xml-parser affected by DoS through entity expansion in DOCTYPE (no expansion limit) — [GHSA-jmr7-xgp7-cmfj](https://github.com/advisories/GHSA-jmr7-xgp7-cmfj)
- fast-xml-parser has stack overflow in XMLBuilder with preserveOrder — [GHSA-fj3w-jwp8-x2g3](https://github.com/advisories/GHSA-fj3w-jwp8-x2g3)
- fast-xml-parser affected by numeric entity expansion bypassing all entity expansion limits (incomplete fix for CVE-2026-26278) — [GHSA-8gc5-j5rx-235r](https://github.com/advisories/GHSA-8gc5-j5rx-235r)
- Entity Expansion Limits Bypassed When Set to Zero Due to JavaScript Falsy Evaluation in fast-xml-parser — [GHSA-jp2q-39xq-3w4g](https://github.com/advisories/GHSA-jp2q-39xq-3w4g)
- fast-xml-parser XMLBuilder: XML Comment and CDATA Injection via Unescaped Delimiters — [GHSA-gh4j-gqv2-49f6](https://github.com/advisories/GHSA-gh4j-gqv2-49f6)

**Fix:** Fix available via `npm audit fix`  
**Path(s):** `node_modules/@aws-sdk/core/node_modules/fast-xml-parser`, `node_modules/fast-xml-parser`

**Dependent packages (19):** flagged only because they depend on `fast-xml-parser`: `@aws-amplify/analytics` (moderate), `@aws-amplify/storage` (moderate), `@aws-sdk/client-firehose` (moderate), `@aws-sdk/client-kinesis` (moderate), `@aws-sdk/client-personalize-events` (moderate), `@aws-sdk/client-sso` (moderate), `@aws-sdk/client-sso-oidc` (moderate), `@aws-sdk/client-sts` (moderate), `@aws-sdk/core` (moderate), `@aws-sdk/credential-provider-env` (moderate), `@aws-sdk/credential-provider-http` (moderate), `@aws-sdk/credential-provider-ini` (moderate), `@aws-sdk/credential-provider-node` (moderate), `@aws-sdk/credential-provider-process` (moderate), `@aws-sdk/credential-provider-sso` (moderate), `@aws-sdk/credential-provider-web-identity` (moderate), `@aws-sdk/middleware-user-agent` (moderate), `@aws-sdk/util-user-agent-node` (moderate), `aws-amplify` (moderate)

---

48 vulnerabilities (1 low, 27 moderate, 19 high, 1 critical)

## 7) Pending Technical Decisions

These need to be discussed in the next sprint planning:

1. **Project status:** Is `blueprint_vault` still an active priority? Nobody has committed since 2026-01-31, and the Project Owner and intended users need to be confirmed.
2. **Encryption architecture and threat model:** Does decryption happen in the browser or on the server? Is there one KMS key per user or one shared key? Should `notes` and `url` be encrypted too? This needs to be decided and written down before the reveal feature is built.
3. **Access model:** Personal vaults, shared team vaults, or both? Who can see which entries? This needs input from the Project Owner.
4. **API authentication:** Should the API use the Cognito ID token (as now) or the access token? Confirm with the backend team how the API validates it.
5. **Backend repo:** Where do the Password Vault API, the entry storage and the KMS/IaC live? They should be linked from this repo's docs so the AWS resources can be traced and verified.
6. **Shared auth code:** `AuthContext.tsx` and `ProtectedRoute.tsx` are copied between this repo and `blueprint_deploy`, so bugs have to be fixed twice. Should they become a shared package, or stay as copies kept in sync? Should both apps use the same Cognito user pool?
7. **UI foundation:** Adopt `blueprint_deploy`'s Tailwind and shadcn/ui setup (§9) rather than starting from scratch.
8. **CI:** Add a Build workflow (lint, format, build) on pushes and pull requests, gate the deploy on it, and pick a single Node version.
9. **Dependency remediation:** Remove the unused dependencies (`@aws-amplify/ui-react`, `amazon-cognito-identity-js`, `jwt-decode`, `@types/jwt-decode`), then run `npm audit fix`.
10. **Security headers:** Set a Content Security Policy and other security headers through a CloudFront response headers policy.
11. **Testing:** Choose a test stack (for example Vitest and React Testing Library). Encryption and auth flows should have tests before release.
12. **Scanning:** Turn on Dependabot (`.github/dependabot.yml`), CodeQL code scanning and secret scanning.

## 8) Reuse Recommendation

**Recommendation: keep the existing code as the starting point. Do not rewrite it. Build the UI on `blueprint_deploy`'s foundation.**

The repo is an early skeleton (about 720 lines). Its value is in the auth layer, the API client and the data model, not in the UI, which is mostly placeholder.

| Area                                                             | Recommendation                                                                                                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth flow (`AuthContext.tsx`, `ProtectedRoute.tsx`, `/callback`) | Reuse. Fix the `/dashboard` fallback and the `VITE_COGNITO_DOMAIN` bug, and decide on shared code (pending decision 6).                                         |
| API client (`src/api/apiClient.ts`)                              | Reuse. It is well structured: typed methods, and the auth token is attached automatically. Add `401` handling, and revisit the token type (pending decision 4). |
| `useApi` hook                                                    | Reuse `withAuth`. Simplify or remove the 50-minute refresh timer.                                                                                               |
| Data types (`src/types/passwords.ts`)                            | Reuse as a **draft** API contract. Confirm it with the backend, and drop `ciphertext` from list responses (§6).                                                 |
| Home page and Header                                             | Replace. The page is a placeholder. Wire up the Header (logout) and build the real vault views with `blueprint_deploy`'s components.                            |
| 404 page                                                         | Keep. It will look right once Tailwind is installed.                                                                                                            |
| Deploy workflow                                                  | Reuse. Add a Build workflow in front of it (§9).                                                                                                                |
| README                                                           | Rewrite. It is the unmodified Vite template.                                                                                                                    |
| Unused dependencies, `src/assets/react.svg`                      | Remove                                                                                                                                                          |
| Backend, storage and KMS                                         | **No recommendation yet.** They are not in this repo and have not been located (pending decision 5).                                                            |

## 9) What Can Be Reused from `blueprint_deploy`

`blueprint_deploy` started from this repo's auth code and then added a full UI foundation, CI checks and documentation. `blueprint_vault` has none of these, so it can take them back.

| From `blueprint_deploy`                                                                                                      | Use in `blueprint_vault`                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tailwind CSS 4 and shadcn/ui setup (`components.json`, `src/index.css`, the Tailwind Vite plugin and the `@` → `src/` alias) | Fixes the unstyled pages. `NotFound.tsx` and `ProtectedRoute.tsx` already use Tailwind classes.                   |
| UI components in `src/components/ui/` (button, card, dialog, input, label, switch, table, tooltip)                           | Entry table, create and edit dialogs, show/hide password toggle and form fields                                   |
| `Navbar.tsx` with the logo banner                                                                                            | App header with branding, using the logo images this repo already has. Add the Sign Out button from `Header.tsx`. |
| `DeploymentForm.tsx` pattern (controlled form, field tooltips, inline error message)                                         | "Create entry" and "Edit entry" forms                                                                             |
| Delete confirmation dialog in `DeploymentList.tsx`                                                                           | "Delete entry" confirmation                                                                                       |
| `getApiErrorMessage()` in `src/lib/api.ts`                                                                                   | Show the API's real error message instead of the generic "Failed to load passwords."                              |
| Loading states with `lucide-react` spinners                                                                                  | Loading states for the list and entry views                                                                       |
| `.github/workflows/build.yml` (lint, Prettier and build on pushes and pull requests)                                         | This repo has no CI checks                                                                                        |
| Prettier and the `format:check` / `format:fix` scripts                                                                       | This repo has no formatter                                                                                        |
| Documentation set (README with a Project Status section, draft SRS, PRD, ADD and TDD, backlog, and `CURRENT_STATE.md`)       | This repo has no documentation. Use the same draft and _Unverified_ labels.                                       |

**Do not carry over** the known issues the two repos share. Fix them once in both:

- The `VITE_COGNITO_DOMAIN` logout fallback bug in `AuthContext.tsx`
- Node 20 in the deploy workflow, while development uses Node 22
- A deploy workflow that runs independently of the lint and build checks
- No tests, no Dependabot and no CodeQL
