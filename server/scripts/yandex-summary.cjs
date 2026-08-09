'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
  getUserId,
  getHostId,
  getHostSummary,
  getInSearchHistory,
  getRecrawlQuota,
} = require('../yandexWebmaster.cjs');

async function main() {
  const userId = await getUserId();
  const hostId = await getHostId(userId);
  const [summary, history, quota] = await Promise.all([
    getHostSummary(userId, hostId),
    getInSearchHistory(userId, hostId),
    getRecrawlQuota(userId, hostId),
  ]);

  const latestHistory = Array.isArray(history?.history)
    ? history.history[history.history.length - 1]
    : null;

  console.log(JSON.stringify({
    user_id: userId,
    host_id: hostId,
    sqi: summary.sqi,
    searchable_pages_count: summary.searchable_pages_count,
    excluded_pages_count: summary.excluded_pages_count,
    site_problems: summary.site_problems,
    latest_in_search_history: latestHistory,
    recrawl_quota_remainder: quota.quota_remainder,
    recrawl_daily_quota: quota.daily_quota,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
