const express = require("express");
const { getSupabaseAdmin } = require("../lib/supabase");
const { requireAuth, requireApproved, requireAdmin } = require("../middleware/auth");
const { validateBody, validateParams, validateQuery } = require("../middleware/validate");
const { eventSchema, paginationSchema, idParamSchema } = require("../lib/schemas");
const {
  buildRecipientsQuery,
  filterRecipientsByLevel,
  loadPreferences,
  insertInAppNotifications,
  buildInAppPayloads
} = require("../lib/notificationHelpers");

const router = express.Router();

const buildPaginationMeta = (page, limit, totalCount) => ({
  page,
  limit,
  totalCount,
  totalPages: totalCount ? Math.ceil(totalCount / limit) : 0
});

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

router.get(
  "/",
  requireAuth,
  requireApproved,
  validateQuery(paginationSchema),
  async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { role, level } = req.user;
      const {
        page = 1,
        limit = 50,
        from,
        to
      } = req.validatedQuery || {};
      const rangeStart = (page - 1) * limit;
      const rangeEnd = rangeStart + limit - 1;

      let query = supabase
        .from("events")
        .select("*", { count: "exact" })
        .order("start_at", {
          ascending: true
        });

      if (from) {
        query = query.gte("start_at", new Date(from).toISOString());
      }

      if (to) {
        query = query.lte("start_at", new Date(to).toISOString());
      }

      if (role === "staff") {
        query = query.in("audience_scope", ["everyone", "staff"]);
      } else if (role === "student") {
        query = query.in("audience_scope", ["everyone", "students"]);
        if (level) {
          query = query.or(`audience_level.is.null,audience_level.eq.${level}`);
        }
      }

      const { data, error, count } = await query.range(rangeStart, rangeEnd);
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({
        events: data || [],
        pagination: buildPaginationMeta(page, limit, count || 0)
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to load events" });
    }
  }
);

router.post(
  "/",
  requireAuth,
  requireApproved,
  requireAdmin,
  validateBody(eventSchema),
  async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const payload = req.validatedBody;

      const event = {
        session_id: null,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        category: payload.category,
        start_at: payload.start_at,
        end_at: payload.end_at || null,
        all_day: Boolean(payload.all_day),
        location: payload.location?.trim() || null,
        audience_scope: payload.audience_scope,
        audience_level:
          payload.audience_scope === "students" ? payload.audience_level || null : null,
        is_urgent: Boolean(payload.is_urgent),
        created_by: req.user.id
      };

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
  }
);

router.put(
  "/:id",
  requireAuth,
  requireApproved,
  requireAdmin,
  validateParams(idParamSchema),
  validateBody(eventSchema),
  async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { id } = req.validatedParams;
      const payload = req.validatedBody;

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

      const update = {
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        category: payload.category,
        start_at: payload.start_at,
        end_at: payload.end_at || null,
        all_day: Boolean(payload.all_day),
        location: payload.location?.trim() || null,
        audience_scope: payload.audience_scope,
        audience_level:
          payload.audience_scope === "students" ? payload.audience_level || null : null,
        is_urgent: Boolean(payload.is_urgent)
      };

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
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireApproved,
  requireAdmin,
  validateParams(idParamSchema),
  async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { id } = req.validatedParams;

      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete event" });
    }
  }
);

module.exports = router;
