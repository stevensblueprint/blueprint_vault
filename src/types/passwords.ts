export type ISODateString = string;
export type Base64Ciphertext = string;

export type EncryptionContext = Record<string, string>;

export interface CreatePasswordEntryRequest {
  label: string;
  username: string;
  ciphertext: Base64Ciphertext;
  kmsKeyId: string;

  url?: string;
  notes?: string;
  encryptionContext?: EncryptionContext;
}

export interface CreatePasswordEntryResponse {
  entryId: string;
  createdAt: ISODateString;
}

export interface PasswordEntry {
  entryId: string;
  label: string;
  username: string;

  url?: string;
  notes?: string;

  ciphertext: Base64Ciphertext;
  kmsKeyId: string;
  encryptionContext: EncryptionContext;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ListPasswordEntriesResponse {
  items: PasswordEntry[];
}

export type ErrorResponseBody = { error: string } | { message: string };

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ErrorResponseBody };

export interface DecryptedPasswordEntry extends Omit<
  PasswordEntry,
  "ciphertext"
> {
  password: string;
}
