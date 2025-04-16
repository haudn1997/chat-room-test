// Function to convert string to ArrayBuffer
const stringToArrayBuffer = (str: string): ArrayBuffer => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// Function to convert ArrayBuffer to string
const arrayBufferToString = (buf: ArrayBuffer): string => {
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
}

// Generate a key from password
async function getKeyFromPassword(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Use SHA-256 to create a hash of the password
  const hash = await crypto.subtle.digest('SHA-256', passwordBuffer);
  
  // Import the hash as a key
  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(message: string, password: string): Promise<string> {
  try {
    const key = await getKeyFromPassword(password);
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      messageBuffer
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Convert to base64 string
    return btoa(arrayBufferToString(combined.buffer));
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

export async function decryptMessage(encryptedMessage: string, password: string): Promise<string> {
  try {
    const key = await getKeyFromPassword(password);
    
    // Convert base64 string to ArrayBuffer
    const combined = stringToArrayBuffer(atob(encryptedMessage));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedBuffer = combined.slice(12);
    
    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv)
      },
      key,
      encryptedBuffer
    );
    
    // Convert decrypted ArrayBuffer to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
} 