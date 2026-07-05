import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import ytdl from '@distube/ytdl-core';

admin.initializeApp();
const db = admin.database();

const SHARD_COUNT = 10;

export const tapDistributed = functions.https.onCall(async () => {
  const shardId = Math.floor(Math.random() * SHARD_COUNT);
  const shardRef = db.ref(`counter_shards/shard_${shardId}`);

  try {
    await shardRef.transaction((current: number) => (current || 0) + 1);
  } catch (err) {
    throw new functions.https.HttpsError('internal', 'Gagal update shard.');
  }

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

export const extractYoutubeAudio = functions
  .region('asia-southeast1')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https
  .onCall(async (data) => {
    const videoId: string = data.videoId;
    if (!videoId || typeof videoId !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      throw new functions.https.HttpsError('invalid-argument', 'Video ID tidak valid');
    }

    const info = await ytdl.getInfo(videoId);
    const format = ytdl.chooseFormat(info.formats, { quality: 'lowestaudio' });
    if (!format?.url) {
      throw new functions.https.HttpsError('not-found', 'Tidak dapat menemukan audio untuk video ini');
    }

    await Promise.all([
      db.ref('config/bgm_url').set(format.url),
      db.ref('config/youtube_video_id').set(videoId),
    ]);

    return { url: format.url };
  });
