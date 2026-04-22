'use strict';

const crypto = require('crypto');
const { FILE_DOWNLOAD } = require('../config/app_config');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit IV — recommended for GCM
const TAG_BYTES = 16; // 128-bit auth tag

let _key = null;
function _getKey() {
	if (_key) return _key;
	const secret = FILE_DOWNLOAD.TOKEN_SECRET;
	if (!secret) throw new Error('FILE_TOKEN_SECRET env variable is not set');
	_key = crypto.createHash('sha256').update(secret).digest(); // 32 bytes
	return _key;
}

/**
 * Encrypts a payload into a compact, URL-safe, tamper-proof token.
 * @param {{ path: string, exp: number, disposition?: string }} payload
 * @returns {string} base64url token
 */
function createFileDownloadToken(payload) {
	const iv = crypto.randomBytes(IV_BYTES);
	const cipher = crypto.createCipheriv(ALGORITHM, _getKey(), iv);
	const pt = JSON.stringify(payload);
	const encrypted = Buffer.concat([cipher.update(pt, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	// Layout: [iv(12)] [tag(16)] [ciphertext]
	return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

/**
 * Decrypts and validates a file download token.
 * @param {string} token
 * @returns {{ path: string, exp: number, disposition?: string }}
 * @throws {{ type: 'invalid' | 'expired' | 'tampered' }}
 */
function parseFileDownloadToken(token) {
	if (!token || typeof token !== 'string') throw { type: 'invalid' };

	let buf;
	try {
		buf = Buffer.from(token, 'base64url');
	} catch {
		throw { type: 'invalid' };
	}

	if (buf.length <= IV_BYTES + TAG_BYTES) throw { type: 'invalid' };

	const iv = buf.subarray(0, IV_BYTES);
	const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
	const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES);

	let plaintext;
	try {
		const decipher = crypto.createDecipheriv(ALGORITHM, _getKey(), iv);
		decipher.setAuthTag(tag);
		plaintext = decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
	} catch {
		throw { type: 'tampered' };
	}

	let payload;
	try {
		payload = JSON.parse(plaintext);
	} catch {
		throw { type: 'invalid' };
	}

	if (!payload.path || typeof payload.exp !== 'number') throw { type: 'invalid' };
	if (Date.now() > payload.exp) throw { type: 'expired' };

	return payload;
}

module.exports = { createFileDownloadToken, parseFileDownloadToken };
