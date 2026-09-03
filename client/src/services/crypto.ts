// Web Crypto API 기반 AES-GCM 보안 암호화 유틸리티
const SALT = new TextEncoder().encode('alba-gon-secure-salt-2026');

async function getKey(pin: string): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export const cryptoService = {
  // 평문 텍스트 암호화 -> Base64 문자열
  async encrypt(text: string, pin: string = '1234'): Promise<string> {
    if (!text) return '';
    try {
      const key = await getKey(pin);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(text);
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
      );
      
      const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(cipherBuffer), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (e) {
      console.error('암호화 실패:', e);
      return text;
    }
  },

  // Base64 암호문 복호화 -> 평문 텍스트
  async decrypt(cipherText: string, pin: string = '1234'): Promise<string> {
    if (!cipherText) return '';
    try {
      const key = await getKey(pin);
      const raw = atob(cipherText);
      const combined = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        combined[i] = raw.charCodeAt(i);
      }
      
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch {
      // 복호화 실패 시 (이전 평문 데이터 호환)
      return cipherText;
    }
  },
};
