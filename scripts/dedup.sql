-- Remove duplicate rows keeping the first occurrence (lowest ctid)
DELETE FROM bookings WHERE ctid NOT IN (SELECT MIN(ctid) FROM bookings GROUP BY "$id");
DELETE FROM jobs WHERE ctid NOT IN (SELECT MIN(ctid) FROM jobs GROUP BY "$id");
DELETE FROM job_applications WHERE ctid NOT IN (SELECT MIN(ctid) FROM job_applications GROUP BY "$id");
DELETE FROM users WHERE ctid NOT IN (SELECT MIN(ctid) FROM users GROUP BY "$id");
DELETE FROM workers WHERE ctid NOT IN (SELECT MIN(ctid) FROM workers GROUP BY "$id");
DELETE FROM reviews WHERE ctid NOT IN (SELECT MIN(ctid) FROM reviews GROUP BY "$id");
DELETE FROM notifications WHERE ctid NOT IN (SELECT MIN(ctid) FROM notifications GROUP BY "$id");
DELETE FROM wallet_transactions WHERE ctid NOT IN (SELECT MIN(ctid) FROM wallet_transactions GROUP BY "$id");
DELETE FROM withdrawals WHERE ctid NOT IN (SELECT MIN(ctid) FROM withdrawals GROUP BY "$id");
DELETE FROM bank_accounts WHERE ctid NOT IN (SELECT MIN(ctid) FROM bank_accounts GROUP BY "$id");
SELECT table_name, n_live_tup AS rows FROM pg_stat_user_tables ORDER BY n_live_tup DESC;
