function toBytesBase64(b64: string) {
    const bin = Buffer.from(b64, 'base64');
    return new Uint8Array(bin);
}

function toBase64(bytes: Uint8Array) {
    return Buffer.from(bytes).toString('base64');
}

function getKeyBytes() {
    const b64 = process.env.PII_ENCRYPTION_KEY_BASE64;
    if (!b64) throw new Error('PII_ENCRYPTION_KEY_BASE64 is missing');
    const key = toBytesBase64(b64);
    if (key.byteLength !== 32) throw new Error('PII_ENCRYPTION_KEY_BASE64 must be 32 bytes');
    return key;
}

async function importKey() {
    return crypto.subtle.importKey('raw', getKeyBytes(), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export type EncryptedPayload = {
    v: number;
    iv_b64: string;
    ct_b64: string;
};

export async function encryptJson(data: unknown): Promise<EncryptedPayload> {
    const key = await importKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(data ?? null));

    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    return {
        v: 1,
        iv_b64: toBase64(iv),
        ct_b64: toBase64(new Uint8Array(ciphertext))
    };
}

export async function decryptJson(payload: EncryptedPayload): Promise<any> {
    const key = await importKey();
    const iv = toBytesBase64(payload.iv_b64);
    const ct = toBytesBase64(payload.ct_b64);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    const text = new TextDecoder().decode(new Uint8Array(plaintext));
    return JSON.parse(text);
}
