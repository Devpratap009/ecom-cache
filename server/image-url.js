'use strict';

const uploadedImagePattern = /^\/uploads\/products\/[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp|gif)$/i;
const staticImagePattern = /^\/(?:images|assets)\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:jpe?g|png|webp|gif|svg)$/i;

function normalizeImageUrl(value) {
  if (typeof value !== 'string') throw Object.assign(Error('Invalid image URL'), { status: 400 });
  const raw = value.trim();
  if (!raw) return '';

  const relativePath = raw.replace(/^(?:\.\/)+/, '');
  if (relativePath.startsWith('uploads/products/') || relativePath.startsWith('images/') || relativePath.startsWith('assets/')) {
    const normalized = `/${relativePath}`;
    if (uploadedImagePattern.test(normalized) || staticImagePattern.test(normalized)) return normalized;
    throw Object.assign(Error('Invalid local image path'), { status: 400 });
  }
  if (raw.startsWith('/')) {
    if (uploadedImagePattern.test(raw) || staticImagePattern.test(raw)) return raw;
    throw Object.assign(Error('Invalid local image path'), { status: 400 });
  }

  try {
    const candidate = /^(?:https?:)?\/\//i.test(raw) ? (raw.startsWith('//') ? `https:${raw}` : raw) : `https://${raw}`;
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Unsupported image URL');
    return url.toString();
  } catch {
    throw Object.assign(Error('Image URL must be an HTTP(S) URL or a supported local image path'), { status: 400 });
  }
}

module.exports = { normalizeImageUrl, uploadedImagePattern };
