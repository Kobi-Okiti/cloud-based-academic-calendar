const express = require("express");
const { getSupabaseAdmin } = require("../lib/supabase");
const { requireAuth, requireApproved, requireAdmin } = require("../middleware/auth");
const {
  buildRecipientsQuery,
  filterRecipientsByLevel,
  loadPreferences,
  insertInAppNotifications,
  buildInAppPayloads
} = require("../lib/notificationHelpers");

const router = express.Router();

const sendUrgentNotifications = async (supabase, event) => {
  if (!event || !event.is_urgent) return;

  const { data: recipients, error: recipientsError } = await buildRecipientsQuery(
    supabase,
    event
  );

  if (recipientsError) {
    throw new Error(recipientsError.message);
  }

  const filteredRecipients = filterRecipientsByLevel(recipients, event);
  if (!filteredRecipients.length) return;

  const prefsMap = await loadPreferences(
    supabase,
    filteredRecipients.map((recipient) => recipient.id)
  );

  const now = new Date();
  const notifications = buildInAppPayloads(
    filteredRecipients,
    prefsMap,
    event,
    now.toISOString(),
    now
  );

  await insertInAppNotifications(supabase, notifications);
};

router.get("/", requireAuth, requireApproved, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { role, level } = req.user;

    let query = supabase.from("events").select("*").order("start_at", {
      ascending: true
    });

    if (role === "staff") {
      query = query.in("audience_scope", ["everyone", "staff"]);
    } else if (role === "student") {
      query = query.in("audience_scope", ["everyone", "students"]);
      if (level) {
        query = query.or(`audience_level.is.null,audience_level.eq.${level}`);
      }
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ events: data || [] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load events" });
  }
});

router.post("/", requireAuth, requireApproved, requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const payload = req.body || {};

    const allowedCategories = [
      "general",
      "announcement",
      "exam",
      "test_week",
      "holiday",
      "seminar"
    ];
    const allowedScopes = ["everyone", "students", "staff"];

    const event = {
      session_id: payload.session_id || null,
      title: String(payload.title || "").trim(),
      description: payload.description || null,
      category: payload.category || "general",
      start_at: payload.start_at,
      end_at: payload.end_at || null,
      all_day: Boolean(payload.all_day),
      location: payload.location || null,
      audience_scope: payload.audience_scope || "everyone",
      audience_level: payload.audience_level || null,
      is_urgent: Boolean(payload.is_urgent),
      created_by: req.user.id
    };

    if (!event.title || !event.start_at) {
      return res.status(400).json({ error: "Title and start time are required" });
    }

    if (!allowedCategories.includes(event.category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    if (!allowedScopes.includes(event.audience_scope)) {
      return res.status(400).json({ error: "Invalid audience scope" });
    }

    const startDate = new Date(event.start_at);
    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ error: "Invalid start time" });
    }

    if (event.end_at) {
      const endDate = new Date(event.end_at);
      if (Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid end time" });
      }
      if (endDate.getTime() < startDate.getTime()) {
        return res.status(400).json({ error: "End time must be after start time" });
      }
    }

    if (event.audience_scope !== "students") {
      event.audience_level = null;
    } else if (
      event.audience_level &&
      ![100, 200, 300, 400, 500].includes(Number(event.audience_level))
    ) {
      return res.status(400).json({ error: "Invalid audience level" });
    }

    const { data, error } = await supabase
      .from("events")
      .insert(event)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (data?.is_urgent) {
      try {
        await sendUrgentNotifications(supabase, data);
      } catch (notifyError) {
        console.error("Urgent notification failed:", notifyError.message);
      }
    }

    return res.status(201).json({ event: data });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create event" });
  }
});

router.put("/:id", requireAuth, requireApproved, requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;
    const payload = req.body || {};

    const { data: existingEvent, error: existingError } = await supabase
      .from("events")
      .select("is_urgent")
      .eq("id", id)
      .single();

    if (existingError) {
      if (existingError.code === "PGRST116") {
        return res.status(404).json({ error: "Event not found" });
      }
      return res.status(500).json({ error: existingError.message });
    }

    const allowedCategories = [
      "general",
      "announcement",
      "exam",
      "test_week",
      "holiday",
      "seminar"
    ];
    const allowedScopes = ["everyone", "students", "staff"];

    const title = String(payload.title || "").trim();
    const startAt = payload.start_at;
    const endAt = payload.end_at || null;

    if (!title || !startAt) {
      return res.status(400).json({ error: "Title and start time are required" });
    }

    if (payload.category && !allowedCategories.includes(payload.category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    if (payload.audience_scope && !allowedScopes.includes(payload.audience_scope)) {
      return res.status(400).json({ error: "Invalid audience scope" });
    }

    const startDate = new Date(startAt);
    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ error: "Invalid start time" });
    }

    if (endAt) {
      const endDate = new Date(endAt);
      if (Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid end time" });
      }
      if (endDate.getTime() < startDate.getTime()) {
        return res.status(400).json({ error: "End time must be after start time" });
      }
    }

    const update = {
      title,
      description: payload.description,
      category: payload.category,
      start_at: startAt,
      end_at: endAt,
      all_day: payload.all_day,
      location: payload.location,
      audience_scope: payload.audience_scope,
      audience_level: payload.audience_level,
      is_urgent: payload.is_urgent
    };

    if (update.audience_scope && update.audience_scope !== "students") {
      update.audience_level = null;
    } else if (
      update.audience_scope === "students" &&
      update.audience_level &&
      ![100, 200, 300, 400, 500].includes(Number(update.audience_level))
    ) {
      return res.status(400).json({ error: "Invalid audience level" });
    }

    const { data, error } = await supabase
      .from("events")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const wasUrgent = Boolean(existingEvent?.is_urgent);
    const isUrgentNow = Boolean(data?.is_urgent);

    if (!wasUrgent && isUrgentNow) {
      try {
        await sendUrgentNotifications(supabase, data);
      } catch (notifyError) {
        console.error("Urgent notification failed:", notifyError.message);
      }
    }

    return res.json({ event: data });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update event" });
  }
});

router.delete("/:id", requireAuth, requireApproved, requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;

    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete event" });
  }
});

module.exports = router;
