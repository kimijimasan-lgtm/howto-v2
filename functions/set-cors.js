const { execSync } = require('child_process');
const https = require('https');

const BUCKET = 'torisetu-234c3.firebasestorage.app';

const corsConfig = [
  {
    origin: ['https://crossmemo.web.app'],
    method: ['GET'],
    maxAgeSeconds: 3600,
  },
];

function getAccessToken() {
  const path = require('path');
  const candidates = [
    path.join(process.env.HOME || '', '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA || '', '..', '.config', 'configstore', 'firebase-tools.json'),
  ];
  const configPath = candidates.find(p => {
    try { require('fs').accessSync(p); return true; } catch { return false; }
  });
  if (!configPath) throw new Error('Firebase CLI config not found. Run: firebase login');
  try {
    const config = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
    const tokens = config.tokens;
    if (tokens && tokens.refresh_token) {
      return refreshToken(tokens.refresh_token);
    }
  } catch (e) {}
  throw new Error('Firebase CLI token not found. Run: firebase login');
}

function refreshToken(refreshTok) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshTok,
      grant_type: 'refresh_token',
    }).toString();

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const j = JSON.parse(body);
        if (j.access_token) resolve(j.access_token);
        else reject(new Error('Token refresh failed: ' + body));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function setCors(accessToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ cors: corsConfig });
    const req = https.request({
      hostname: 'storage.googleapis.com',
      path: `/storage/v1/b/${BUCKET}?fields=cors`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('CORS set successfully!');
          console.log('Response:', data);
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Getting access token from Firebase CLI credentials...');
  const token = await getAccessToken();
  console.log('Token obtained. Setting CORS on bucket:', BUCKET);
  console.log('Config:', JSON.stringify(corsConfig, null, 2));
  await setCors(token);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
