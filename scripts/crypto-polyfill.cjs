// Node 16 polyfill: add getRandomValues to node:crypto default export
// Vite 5 calls `import crypto from 'node:crypto'` then `crypto.getRandomValues()`
// In Node 16, getRandomValues lives on crypto.webcrypto, not on the crypto module itself.
'use strict';
const crypto = require('node:crypto');
if (!crypto.getRandomValues && crypto.webcrypto && crypto.webcrypto.getRandomValues) {
  crypto.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
}
if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto;
}
