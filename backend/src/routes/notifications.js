const express = require("express");
const { getSupabaseAdmin } = require("../lib/supabase");
const { requireAuth, requireApproved } = require("../middleware/auth");
const { validateQuery } = require("../middleware/validate");
const { paginationSchema } = require("../lib/schemas");
const {
  buildRecipientsQuery,
  filterRecipientsByLevel,
  loadPreferences,
  insertInAppNotifications,
  buildInAppPayloads
} = require("../lib/notificationHelpers");

const router = express.Router();

const WINDOW_MINUTES = Number(process.env.NOTIFY_WINDOW_MINUTES || 5);

const buildPaginationMeta = (page, limit, totalCount) => ({
  page,
  limit,
  totalCount,
  totalPages: totalCount ? Math.ceil(totalCount / limit) : 0
});

const executeNotificationRun = async () => {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const windowMs = WINDOW_MINUTES * 60 * 1000;

  const { data: rules, error: rulesError } = await supabase
    .from("notification_rules")
    .select("rule_key, offset_minutes")
    .eq("is_active", true);

  if (rulesError) {
    throw new Error(rulesError.message);
  }

  let createdCount = 0;
  let errorCount = 0;

  for (const rule of rules || []) {
    const offsetMs = rule.offset_minutes * 60 * 1000;
    const targetStart = new Date(now.getTime() - offsetMs - windowMs);
    const targetEnd = new Date(now.getTime() - offsetMs + windowMs);

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .gte("start_at", targetStart.toISOString())
      .lte("start_at", targetEnd.toISOString());

    if (eventsError) {
      errorCount += 1;
      continue;
    }

    for (const event of events || []) {
      const scheduledAt = new Date(
        new Date(event.start_at).getTime() + offsetMs
      ).toISOString();

      const { data: recipients, error: recipientsError } =
        await buildRecipientsQuery(supabase, event);

      if (recipientsError) {
        errorCount += 1;
        continue;
      }

      const filteredRecipients = filterRecipientsByLevel(recipients, event);

      if (filteredRecipients.length === 0) continue;

      let prefsMap;
      try {
        prefsMap = await loadPreferences(
          supabase,
          filteredRecipients.map((recipient) => recipient.id)
        );
      } catch (prefError) {
        errorCount += 1;
        continue;
      }

      const notifications = buildInAppPayloads(
        filteredRecipients,
        prefsMap,
        event,
        scheduledAt,
        now
      );

      try {
        const { count } = await insertInAppNotifications(
          supabase,
          notifications
        );
        createdCount += count;
      } catch (insertError) {
        errorCount += 1;
      }
    }
  }

  return { createdCount, errorCount };
};

router.get(
  "/",
  requireAuth,
  requireApproved,
  validateQuery(paginationSchema),
  async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page = 1, limit = 20 } = req.validatedQuery || {};
    const rangeStart = (page - 1) * limit;
    const rangeEnd = rangeStart + limit - 1;

    const { data, error, count } = await supabase
      .from("notifications")
      .select(
        "id, channel, status, scheduled_at, sent_at, read_at, event:events(id, title, start_at, is_urgent)",
        { count: "exact" }
      )
      .eq("user_id", req.user.id)
      .order("scheduled_at", { ascending: false })
      .range(rangeStart, rangeEnd);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const readAt = new Date().toISOString();
    const { error: readError } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", req.user.id)
      .is("read_at", null);

    if (readError) {
      console.warn("Failed to mark notifications read:", readError.message);
    }

    return res.json({
      notifications: data || [],
      pagination: buildPaginationMeta(page, limit, count || 0)
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load notifications" });
  }
});

router.get("/unread-count", requireAuth, requireApproved, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", req.user.id)
      .is("read_at", null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ count: count || 0 });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load unread count" });
  }
});

router.post("/run", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers["x-cron-secret"];
    if (provided !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } else {
    return res.status(401).json({ error: "Cron secret not configured" });
  }

  try {
    const { createdCount, errorCount } = await executeNotificationRun();
    return res.json({ ok: true, createdCount, errorCount });
  } catch (err) {
    return res.status(500).json({ error: "Failed to run notifications" });
  }
});

module.exports = { router, executeNotificationRun };
