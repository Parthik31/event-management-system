import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // ── 1. TTL index on bookings.expiresAt ──
  // Mongo will auto-delete Locked booking docs once expiresAt passes.
  // This prevents the DB from accumulating stale lock records forever.
  try {
    await db.collection('bookings').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'booking_ttl', background: true }
    );
    console.log('✅ TTL index created on bookings.expiresAt');
  } catch (e) {
    console.log('ℹ️  TTL index already exists or skipped:', e.message);
  }

  // ── 2. Compound index for getShowById seat availability query ──
  // Covers: show + status + (expiresAt or no-expiry)
  try {
    await db.collection('bookings').createIndex(
      { show: 1, status: 1 },
      { name: 'booking_show_status', background: true }
    );
    console.log('✅ Index created on bookings (show, status)');
  } catch (e) {
    console.log('ℹ️  Index already exists:', e.message);
  }

  // ── 3. Index for event seat availability ──
  try {
    await db.collection('bookings').createIndex(
      { event: 1, status: 1 },
      { name: 'booking_event_status', background: true }
    );
    console.log('✅ Index created on bookings (event, status)');
  } catch (e) {
    console.log('ℹ️  Index already exists:', e.message);
  }

  // ── 4. Index for the lock conflict check (user + show/event + status + expiresAt) ──
  try {
    await db.collection('bookings').createIndex(
      { show: 1, seats: 1, status: 1, expiresAt: 1 },
      { name: 'booking_seat_lock_check', background: true }
    );
    console.log('✅ Index created on bookings (show, seats, status, expiresAt)');
  } catch (e) {
    console.log('ℹ️  Index already exists:', e.message);
  }

  // ── 5. Backfill seatRowPartitions = 2 on shows missing it ──
  const result = await db.collection('shows').updateMany(
    { seatRowPartitions: { $exists: false } },
    { $set: { seatRowPartitions: 2 } }
  );
  console.log(`✅ Backfilled seatRowPartitions on ${result.modifiedCount} shows`);

  // ── 6. Remove orphaned Locked bookings (older than 10 min, shouldn't exist) ──
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const cleaned = await db.collection('bookings').deleteMany({
    status: 'Locked',
    createdAt: { $lt: tenMinAgo },
    $or: [
      { expiresAt: { $lte: new Date() } },
      { expiresAt: { $exists: false } }
    ]
  });
  console.log(`✅ Cleaned up ${cleaned.deletedCount} orphaned lock records`);

  await mongoose.disconnect();
  console.log('\n✅ Migration complete.');
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
