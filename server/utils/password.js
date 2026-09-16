const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const util = require('util');
const pbkdf2Async = util.promisify(crypto.pbkdf2);

/**
 * Hash password using bcryptjs (salt rounds: 10) asynchronously
 * @param {string} password Plain text password
 * @returns {Promise<string>} Bcrypt hash
 */
async function hashPassword(password) {
  if (!password) return '';
  return await bcrypt.hash(password, 10);
}

/**
 * Compare plain password against stored hash asynchronously.
 * Supports legacy PBKDF2 hashes (salt:hash) for seamless backward compatibility.
 * @param {string} password Plain text password
 * @param {string} storedHash Stored hash string from database
 * @returns {Promise<{ isValid: boolean, needsRehash: boolean }>} Verification result
 */
async function comparePassword(password, storedHash) {
  if (!password || !storedHash) {
    return { isValid: false, needsRehash: false };
  }

  // Check if bcrypt hash ($2a$ or $2b$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    try {
      const isValid = await bcrypt.compare(password, storedHash);
      return { isValid, needsRehash: false };
    } catch (err) {
      return { isValid: false, needsRehash: false };
    }
  }

  // Check if legacy PBKDF2 hash (format: salt:hash)
  if (storedHash.includes(':')) {
    try {
      const [salt, originalHash] = storedHash.split(':');
      if (salt && originalHash) {
        const derivedKey = await pbkdf2Async(password, salt, 1000, 64, 'sha512');
        const hash = derivedKey.toString('hex');
        const isValid = (hash === originalHash);
        return { isValid, needsRehash: isValid }; // Request automatic rehash to bcrypt on successful login
      }
    } catch (err) {
      return { isValid: false, needsRehash: false };
    }
  }

  // Fallback check: if plaintext match, force immediate rehash to modern bcrypt
  const isValid = (password === storedHash);
  return { isValid, needsRehash: isValid };
}

module.exports = {
  hashPassword,
  comparePassword
};
