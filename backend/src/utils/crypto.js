/**
 * DealFlow360 - Enterprise Cryptographic Security Engine
 * Provides:
 * - AES-256-GCM authenticated encryption / decryption for sensitive contract data
 * - SHA-256 / HMAC digital signatures for quotation tamper detection
 * - Secure tokenization of commercial terms and customer identity
 */

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const SECRET = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || "dealflow360_institutional_master_key_32bytes!";

// Derive 32-byte key from master secret
const getKey = (salt) => {
  return crypto.pbkdf2Sync(SECRET, salt, 100000, 32, "sha512");
};

/**
 * Encrypts a sensitive string or JSON object with AES-256-GCM.
 * @param {string|object} plaintext 
 * @returns {string} Base64 encoded payload: salt + iv + authTag + ciphertext
 */
const encrypt = (plaintext) => {
  const text = typeof plaintext === "object" ? JSON.stringify(plaintext) : String(plaintext);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, "hex"),
  ]);

  return combined.toString("base64");
};

/**
 * Decrypts an AES-256-GCM encrypted base64 payload.
 * @param {string} encryptedBase64 
 * @returns {string} Original plaintext
 */
const decrypt = (encryptedBase64) => {
  try {
    const buffer = Buffer.from(encryptedBase64, "base64");
    if (buffer.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
      throw new Error("Invalid encrypted payload length.");
    }

    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const ciphertext = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = getKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "binary", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    throw new Error("Decryption failed: Integrity tag mismatch or corrupted data.");
  }
};

/**
 * Generates an immutable HMAC-SHA256 signature of a quotation snapshot.
 * Used for zero-trust deal tamper detection.
 */
const signDealSnapshot = (dealObject) => {
  const canonical = JSON.stringify(dealObject, Object.keys(dealObject).sort());
  return crypto.createHmac("sha256", SECRET).update(canonical).digest("hex");
};

/**
 * Verifies if a quotation snapshot matches its HMAC signature.
 */
const verifyDealSignature = (dealObject, signature) => {
  const expected = signDealSnapshot(dealObject);
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
};

module.exports = {
  encrypt,
  decrypt,
  signDealSnapshot,
  verifyDealSignature,
};
