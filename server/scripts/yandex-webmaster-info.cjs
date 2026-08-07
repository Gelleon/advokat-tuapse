'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { getUserId, getHostId, getRecrawlQuota } = require('../yandexWebmaster.cjs');

async function main() {
  const userId = await getUserId();
  const hostId = await getHostId(userId);
  const quota = await getRecrawlQuota(userId, hostId);

  console.log(JSON.stringify({
    user_id: userId,
    host_id: hostId,
    daily_quota: quota.daily_quota,
    quota_remainder: quota.quota_remainder,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
