'use strict';

const path = require('path');
const mime = require('mime');
const sanitize = require('sanitize-filename');
const { parseFileDownloadToken } = require('../../util/file-token');
const { getFileStream, normalizeS3ObjectKey } = require('../../service/s3-services');

/**
 * GET /api/v1/file/download?token=<token>
 *
 * Validates the encrypted token, fetches the private S3 object,
 * and streams it to the client. Never exposes raw S3 paths or signed URLs.
 */
module.exports.download = (req, res) => {
	const { token } = req.query;

	if (!token) {
		return res.status(400).json({ success: false, message: 'token is required' });
	}

	let payload;
	try {
		payload = parseFileDownloadToken(token);
	} catch (err) {
		if (err.type === 'expired') {
			return res.status(410).json({ success: false, message: 'Download link has expired' });
		}
		return res.status(400).json({ success: false, message: 'Invalid download token' });
	}
	const s3Key = normalizeS3ObjectKey(payload.path);
	if (!s3Key) {
		return res.status(400).json({ success: false, message: 'Invalid token payload' });
	}

	const disposition = payload.disposition === 'inline' ? 'inline' : 'attachment';
	const filename = sanitize(path.basename(s3Key)) || 'download';
	const contentType = mime.getType(s3Key) || 'application/octet-stream';

	let stream;
	try {
		stream = getFileStream(s3Key);
	} catch {
		return res.status(500).json({ success: false, message: 'Failed to initiate file download' });
	}

	stream.on('error', (err) => {
		if (res.headersSent) {
			// Data already flowing — destroy the socket cleanly
			res.destroy();
			return;
		}
		if (err.code === 'NoSuchKey' || err.statusCode === 404) {
			return res.status(404).json({ success: false, message: 'File not found' });
		}
		return res.status(500).json({ success: false, message: 'Failed to stream file' });
	});

	res.setHeader('Content-Type', contentType);
	res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('Cache-Control', 'no-store');

	stream.pipe(res);
};
