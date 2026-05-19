/**
 * SHA-256 hash of PIN string. Stored in IDB; plain PIN never persists.
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const candidateHash = await hashPin(pin);
  return candidateHash === storedHash;
}
