import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();
const db = admin.database();

const SHARD_COUNT = 10;

export const tapDistributed = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Harus login.');
  }

  const nodeName: string = data?.nodeName || '';
  const nodeId: string = data?.nodeId || context.auth.uid;

  if (!nodeName) {
    throw new functions.https.HttpsError('invalid-argument', 'nodeName wajib diisi.');
  }

  const shardId = Math.floor(Math.random() * SHARD_COUNT);
  const shardRef = db.ref(`counter_shards/shard_${shardId}`);

  try {
    await shardRef.transaction((current: number) => (current || 0) + 1);
  } catch (err) {
    throw new functions.https.HttpsError('internal', 'Gagal update shard.');
  }

  const userRef = db.ref(`users/${nodeId}`);
  try {
    await userRef.transaction((current) => {
      if (!current) return { name: nodeName, clicks: 1 };
      return { name: nodeName, clicks: (current.clicks || 0) + 1 };
    });
  } catch (err) {
    console.warn('User counter update failed:', err);
  }

  const presenceRef = db.ref(`presence/${nodeId}`);
  await presenceRef.set(nodeName);

  return { success: true };
});

export const aggregateCounter = functions.https.onRequest(async (_req, res) => {
  try {
    let total = 0;
    const snap = await db.ref('counter_shards').once('value');
    const shards = snap.val();
    if (shards) {
      for (let i = 0; i < SHARD_COUNT; i++) {
        total += shards[`shard_${i}`] || 0;
      }
    }
    await db.ref('global_clicks').set(total);
    res.json({ success: true, total });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export const getCounter = functions.https.onCall(async () => {
  const snap = await db.ref('global_clicks').once('value');
  return { total: snap.val() || 0 };
});
