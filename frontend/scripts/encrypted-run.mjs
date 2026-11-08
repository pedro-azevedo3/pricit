import { createCipheriv, createHash, createPublicKey, publicEncrypt, randomBytes, constants } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

let publicKey;
let kid;
function configurationError(reason) {
  process.stderr.write(`Log encryption configuration v2: ${reason}; service not started.\n`);
  process.exit(78);
}
let contents;
if (process.env.LOG_PUBLIC_KEY_PEM !== undefined) {
  contents = process.env.LOG_PUBLIC_KEY_PEM.replace(/\\n/g, '\n').trim();
  if (!contents) configurationError('LOG_PUBLIC_KEY_PEM is empty');
} else {
  try {
    contents = readFileSync(process.env.LOG_PUBLIC_KEY_FILE || '/run/secrets/log_public_key');
  } catch {
    configurationError('LOG_PUBLIC_KEY_PEM is not set and key file is unavailable');
  }
}
try {
  publicKey = createPublicKey(contents);
} catch {
  configurationError('public key is not valid PEM; paste the complete public PEM including BEGIN and END lines');
}
if (publicKey.asymmetricKeyType !== 'rsa') configurationError('public key must be RSA');
if (publicKey.asymmetricKeyDetails.modulusLength < 3072) configurationError('RSA public key must have at least 3072 bits');
kid = createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex').slice(0, 16);
const command = process.argv.slice(2);
if (!command.length) process.exit(64);
const child = spawn(command[0], command.slice(1), { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
const kill = signal => { try { process.kill(-child.pid, signal); } catch {} };
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => kill(signal));

function encrypt(chunk, stream) {
  const secret = randomBytes(32);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret, nonce);
  cipher.setAAD(Buffer.from(`pricit/log/v1/${kid}/frontend/${stream}`));
  const data = Buffer.concat([cipher.update(chunk), cipher.final(), cipher.getAuthTag()]);
  const key = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, secret);
  secret.fill(0);
  return JSON.stringify({ v: 1, alg: 'RSA-OAEP-256+A256GCM', kid, service: 'frontend', stream,
    key: key.toString('base64'), nonce: nonce.toString('base64'), data: data.toString('base64') }) + '\n';
}
async function pump(source, stream) {
  for await (const bytes of source) {
    for (let offset = 0; offset < bytes.length; offset += 4096) {
      if (!process.stdout.write(encrypt(bytes.subarray(offset, offset + 4096), stream))) await once(process.stdout, 'drain');
    }
  }
}
const completion = new Promise(resolve => {
  child.once('error', () => resolve(70));
  child.once('close', (code, signal) => resolve(code ?? (signal === 'SIGTERM' ? 143 : 130)));
});
try {
  const [, , code] = await Promise.all([pump(child.stdout, 'stdout'), pump(child.stderr, 'stderr'), completion]);
  process.exitCode = code;
} catch {
  // No raw output, even when the logger fails.
  kill('SIGKILL');
  process.exitCode = 74;
}
