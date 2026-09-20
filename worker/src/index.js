let jwksCache = { expiresAt: 0, keys: [] };

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(env),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function base64UrlBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function base64UrlJson(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value)));
}

async function getFirebaseJwks() {
  const now = Date.now();
  if (jwksCache.expiresAt > now && jwksCache.keys.length) return jwksCache.keys;

  const response = await fetch(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  );
  if (!response.ok) throw new Error('No se pudieron obtener las claves públicas de Firebase.');

  const body = await response.json();
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
  jwksCache = {
    keys: body.keys || [],
    expiresAt: now + Math.max(300, maxAge - 60) * 1000
  };
  return jwksCache.keys;
}

async function verifyFirebaseToken(request, env) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) throw new Error('AUTH_MISSING');

  const token = authHeader.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('AUTH_INVALID');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = base64UrlJson(encodedHeader);
  const payload = base64UrlJson(encodedPayload);

  if (header.alg !== 'RS256' || !header.kid) throw new Error('AUTH_INVALID');
  if (payload.aud !== env.FIREBASE_PROJECT_ID) throw new Error('AUTH_INVALID');
  if (payload.iss !== 'https://securetoken.google.com/' + env.FIREBASE_PROJECT_ID) {
    throw new Error('AUTH_INVALID');
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.sub || payload.exp <= now || payload.iat > now + 60) {
    throw new Error('AUTH_EXPIRED');
  }

  const jwks = await getFirebaseJwks();
  const jwk = jwks.find(item => item.kid === header.kid);
  if (!jwk) throw new Error('AUTH_INVALID');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlBytes(encodedSignature),
    new TextEncoder().encode(encodedHeader + '.' + encodedPayload)
  );

  if (!verified) throw new Error('AUTH_INVALID');
  return { token, uid: payload.sub, claims: payload };
}

function firestoreValue(value) {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if (value.arrayValue) return (value.arrayValue.values || []).map(firestoreValue);
  if (value.mapValue) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, child]) => [key, firestoreValue(child)])
    );
  }
  return null;
}

async function getFirestoreDocument(path, idToken, env) {
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(env.FIREBASE_PROJECT_ID) +
    '/databases/(default)/documents/' +
    path;

  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + idToken }
  });

  if (!response.ok) {
    const error = new Error('FIRESTORE_DENIED');
    error.status = response.status;
    throw error;
  }

  const doc = await response.json();
  return Object.fromEntries(
    Object.entries(doc.fields || {}).map(([key, value]) => [key, firestoreValue(value)])
  );
}

async function deleteFirestoreDocument(path, idToken, env) {
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(env.FIREBASE_PROJECT_ID) +
    '/databases/(default)/documents/' +
    path;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + idToken }
  });

  if (!response.ok && response.status !== 404) {
    const error = new Error('FIRESTORE_DENIED');
    error.status = response.status;
    throw error;
  }

  return true;
}

async function requireActivePair(pairId, uid, targetUid, token, env) {
  if (!pairId) throw new Error('PAIR_REQUIRED');
  const pair = await getFirestoreDocument('pairs/' + encodeURIComponent(pairId), token, env);
  const members = pair.memberUids || [];

  if (pair.active !== true || !members.includes(uid)) throw new Error('PAIR_INVALID');
  if (targetUid && !members.includes(targetUid)) throw new Error('TARGET_INVALID');
  return pair;
}

async function isAdmin(uid, token, env) {
  const profile = await getFirestoreDocument('users/' + encodeURIComponent(uid), token, env);
  return profile.role === 'admin';
}

async function sha1Hex(text) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function cloudinarySignature(request, auth, env) {
  const body = await request.json().catch(() => ({}));
  const resourceType = body.resourceType === 'video' ? 'video' : 'image';
  const pairId = typeof body.pairId === 'string' && body.pairId ? body.pairId : null;

  if (pairId) await requireActivePair(pairId, auth.uid, null, auth.token, env);

  const scope = pairId || auth.uid;
  const folder = 'dinocupones/' + scope + '/' + auth.uid;
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = crypto.randomUUID();

  const params = {
    folder,
    public_id: publicId,
    timestamp: String(timestamp),
    upload_preset: env.CLOUDINARY_UPLOAD_PRESET
  };

  const canonical = Object.keys(params)
    .sort()
    .map(key => key + '=' + params[key])
    .join('&');

  const signature = await sha1Hex(canonical + env.CLOUDINARY_API_SECRET);

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    uploadPreset: env.CLOUDINARY_UPLOAD_PRESET,
    resourceType,
    folder,
    publicId,
    timestamp,
    signature
  };
}

async function deleteMuralAsset(request, auth, env) {
  const body = await request.json().catch(() => ({}));
  const muralId = String(body.muralId || '').trim();
  if (!muralId) throw new Error('MURAL_REQUIRED');

  const mural = await getFirestoreDocument('mural/' + encodeURIComponent(muralId), auth.token, env);
  const owner = mural.userId === auth.uid;
  const admin = owner ? false : await isAdmin(auth.uid, auth.token, env);

  if (!owner && !admin) throw new Error('MURAL_DENIED');

  if (mural.provider === 'cloudinary' && mural.mediaPublicId) {
    const resourceType = mural.type === 'video' ? 'video' : 'image';
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
      invalidate: 'true',
      public_id: String(mural.mediaPublicId),
      timestamp: String(timestamp)
    };
    const canonical = Object.keys(params)
      .sort()
      .map(key => key + '=' + params[key])
      .join('&');
    const signature = await sha1Hex(canonical + env.CLOUDINARY_API_SECRET);

    const form = new FormData();
    form.append('public_id', params.public_id);
    form.append('timestamp', params.timestamp);
    form.append('invalidate', params.invalidate);
    form.append('api_key', env.CLOUDINARY_API_KEY);
    form.append('signature', signature);

    const response = await fetch(
      'https://api.cloudinary.com/v1_1/' +
        encodeURIComponent(env.CLOUDINARY_CLOUD_NAME) + '/' +
        resourceType + '/destroy',
      { method: 'POST', body: form }
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !['ok','not found'].includes(result.result)) {
      const error = new Error('CLOUDINARY_DELETE_ERROR');
      error.details = result;
      throw error;
    }
  }

  await deleteFirestoreDocument('mural/' + encodeURIComponent(muralId), auth.token, env);
  return { ok: true, muralId };
}

async function sendOneSignalNotification(request, auth, env) {
  const body = await request.json().catch(() => ({}));
  const targetUid = String(body.targetUid || '');
  const pairId = body.pairId || null;
  const title = String(body.title || 'DinoCupones').slice(0, 90);
  const message = String(body.body || 'Tienes una novedad 💜').slice(0, 300);

  if (!targetUid) throw new Error('TARGET_REQUIRED');

  let targeting;
  if (targetUid === 'all') {
    if (!(await isAdmin(auth.uid, auth.token, env))) throw new Error('ADMIN_REQUIRED');
    targeting = { included_segments: ['Subscribed Users'] };
  } else {
    if (pairId) {
      await requireActivePair(pairId, auth.uid, targetUid, auth.token, env);
    } else if (!(await isAdmin(auth.uid, auth.token, env))) {
      throw new Error('PAIR_REQUIRED');
    }

    targeting = {
      include_aliases: { external_id: [targetUid] },
      target_channel: 'push'
    };
  }

  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Authorization': 'Key ' + env.ONESIGNAL_API_KEY,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      app_id: env.ONESIGNAL_APP_ID,
      headings: { en: title, es: title },
      contents: { en: message, es: message },
      url: env.APP_URL,
      ...targeting
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('ONESIGNAL_ERROR');
    error.details = result;
    throw error;
  }
  return result;
}

function assertOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== env.ALLOWED_ORIGIN) throw new Error('ORIGIN_DENIED');
}

function checkConfiguration(env) {
  const required = [
    'FIREBASE_PROJECT_ID',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'CLOUDINARY_UPLOAD_PRESET',
    'ONESIGNAL_APP_ID',
    'ONESIGNAL_API_KEY',
    'ALLOWED_ORIGIN',
    'APP_URL'
  ];
  return required.filter(key => !env[key]);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    try {
      const url = new URL(request.url);

      if (url.pathname === '/health' && request.method === 'GET') {
        const missing = checkConfiguration(env);
        return json({
          ok: missing.length === 0,
          service: 'dinocupones-api',
          missing
        }, missing.length ? 503 : 200, env);
      }

      assertOrigin(request, env);
      const auth = await verifyFirebaseToken(request, env);

      if (url.pathname === '/cloudinary/sign' && request.method === 'POST') {
        return json(await cloudinarySignature(request, auth, env), 200, env);
      }

      if (url.pathname === '/notify' && request.method === 'POST') {
        return json(await sendOneSignalNotification(request, auth, env), 200, env);
      }

      if (url.pathname === '/mural/delete' && request.method === 'POST') {
        return json(await deleteMuralAsset(request, auth, env), 200, env);
      }

      return json({ error: 'NOT_FOUND' }, 404, env);
    } catch (error) {
      const code = error?.message || 'UNKNOWN_ERROR';
      const authCodes = new Set(['AUTH_MISSING','AUTH_INVALID','AUTH_EXPIRED']);
      const deniedCodes = new Set([
        'ORIGIN_DENIED','PAIR_REQUIRED','PAIR_INVALID','TARGET_INVALID','ADMIN_REQUIRED',
        'FIRESTORE_DENIED','MURAL_REQUIRED','MURAL_DENIED'
      ]);

      console.error(code, error?.details || '');
      return json({
        error: code,
        details: error?.details || undefined
      }, authCodes.has(code) ? 401 : deniedCodes.has(code) ? 403 : 500, env);
    }
  }
};
