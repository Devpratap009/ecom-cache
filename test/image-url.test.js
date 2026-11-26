'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeImageUrl } = require('../server/image-url');

test('normalizes supported relative upload paths to root-relative URLs', () => {
  assert.equal(normalizeImageUrl('uploads/products/photo-01.webp'), '/uploads/products/photo-01.webp');
  assert.equal(normalizeImageUrl('./uploads/products/photo-01.webp'), '/uploads/products/photo-01.webp');
});

test('accepts supported local frontend image assets', () => {
  assert.equal(normalizeImageUrl('/images/catalog/item.png'), '/images/catalog/item.png');
  assert.equal(normalizeImageUrl('assets/logo.svg'), '/assets/logo.svg');
});

test('normalizes bare image hostnames to HTTPS', () => {
  assert.equal(normalizeImageUrl('cdn.example.com/items/photo.jpg'), 'https://cdn.example.com/items/photo.jpg');
});

test('preserves valid HTTP and HTTPS image URLs', () => {
  assert.equal(normalizeImageUrl('https://cdn.example.com/photo.jpg'), 'https://cdn.example.com/photo.jpg');
  assert.equal(normalizeImageUrl('http://cdn.example.com/photo.jpg'), 'http://cdn.example.com/photo.jpg');
});

test('allows an empty image URL for products without photos', () => {
  assert.equal(normalizeImageUrl(''), '');
  assert.equal(normalizeImageUrl('   '), '');
});

test('rejects unsafe protocols and unsupported local paths', () => {
  assert.throws(() => normalizeImageUrl('javascript:alert(1)'), { status: 400 });
  assert.throws(() => normalizeImageUrl('/uploads/../../secret.png'), { status: 400 });
  assert.throws(() => normalizeImageUrl('/uploads/products/photo.bmp'), { status: 400 });
});
