const { getSupabaseAdmin } = require("./supabase");

const buildRecipientsQuery = (supabase, event) => {
  const roles =
    event.audience_scope === "staff"
      ? ["staff"]
      : event.audience_scope === "students"
      ? ["student"]
      : ["student", "staff"]; // exclude admin by design

  return supabase
    .from("profiles")
    .select("id, role, level")
    .eq("status", "approved")
    .in("role", roles);
};

const filterRecipientsByLevel = (recipients, event) =>
  (recipients || []).filter((recipient) => {
    if (event.audience_scope !== "students") return true;
    if (!event.audience_level) return true;
    return recipient.level === event.audience_level;
  });

const loadPreferences = async (supabase, userIds) => {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("user_id, in_app_enabled")
    .in("user_id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data || []).map((pref) => [pref.user_id, pref]));
};

const insertInAppNotifications = async (supabase, payloads) => {
  if (!payloads.length) return { count: 0 };

  const { error } = await supabase.from("notifications").upsert(payloads, {
    onConflict: "user_id,event_id,channel,scheduled_at"
  });

  if (error) {
    throw new Error(error.message);
  }

  return { count: payloads.length };
};

const buildInAppPayloads = (recipients, prefsMap, event, scheduledAt, now) =>
  recipients
    .filter((recipient) => {
      const pref = prefsMap.get(recipient.id);
      return pref ? pref.in_app_enabled : true;
    })
    .map((recipient) => ({
      user_id: recipient.id,
      event_id: event.id,
      channel: "in_app",
      status: "sent",
      scheduled_at: scheduledAt,
      sent_at: now.toISOString()
    }));

module.exports = {
  buildRecipientsQuery,
  filterRecipientsByLevel,
  loadPreferences,
  insertInAppNotifications,
  buildInAppPayloads
};
