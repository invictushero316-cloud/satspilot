import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export type EncryptedWalletSecret = {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: number;
};

export type PublicWalletConnection = {
  id: string;
  merchantId: string;
  provider: string;
  label: string | null;
  status: string;
  encryptionKeyVersion: number;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function resolveKeyMaterial(keyVersion = 1): Buffer {
  const envKey =
    keyVersion === 1
      ? process.env.WALLET_ENCRYPTION_KEY
      : process.env[`WALLET_ENCRYPTION_KEY_V${keyVersion}`];

  if (!envKey) {
    throw new Error(
      `Missing wallet encryption key for version ${keyVersion}`,
    );
  }

  // Accept 64-char hex (32 bytes) or base64 of 32 bytes.
  if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, "hex");
  }

  const decoded = Buffer.from(envKey, "base64");
  if (decoded.length !== 32) {
    throw new Error("WALLET_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return decoded;
}

/** Encrypt a wallet credential string for at-rest storage. */
export function encryptWalletSecret(
  plaintext: string,
  keyVersion = 1,
): EncryptedWalletSecret {
  const key = resolveKeyMaterial(keyVersion);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    keyVersion,
  };
}

/** Decrypt a stored wallet credential. Server-only. */
export function decryptWalletSecret(payload: EncryptedWalletSecret): string {
  const key = resolveKeyMaterial(payload.keyVersion);
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Strip encrypted credential fields before any API / client response.
 * Never include encryptedPayload, encryptionIv, or encryptionTag.
 */
export function toPublicWalletConnection<
  T extends {
    id: string;
    merchantId: string;
    provider: string;
    label: string | null;
    status: string;
    encryptionKeyVersion: number;
    lastCheckedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    encryptedPayload?: unknown;
    encryptionIv?: unknown;
    encryptionTag?: unknown;
  },
>(row: T): PublicWalletConnection {
  return {
    id: row.id,
    merchantId: row.merchantId,
    provider: row.provider,
    label: row.label,
    status: row.status,
    encryptionKeyVersion: row.encryptionKeyVersion,
    lastCheckedAt: row.lastCheckedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const SECRET_KEY_PATTERN =
  /(password|secret|token|credential|nwc|seed|mnemonic|encryptedPayload|encryptionIv|encryptionTag|apiKey|privateKey)/i;

/** Deep-clone JSON-safe values while redacting secret-looking keys. */
export function redactSecrets<T>(value: T): T {
  return redactValue(value) as T;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactValue(nested);
      }
    }
    return out;
  }
  return value;
}
