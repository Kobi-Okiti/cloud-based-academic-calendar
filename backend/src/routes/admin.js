const express = require("express");
const { getSupabaseAdmin } = require("../lib/supabase");
const { requireAuth, requireApproved, requireAdmin } = require("../middleware/auth");
const { validateBody, validateParams, validateQuery } = require("../middleware/validate");
const { idParamSchema, paginationSchema, promoteLevelsSchema } = require("../lib/schemas");

const router = express.Router();

router.use(requireAuth, requireApproved, requireAdmin);

router.get("/pending-users", validateQuery(paginationSchema), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page = 1, limit = 5 } = req.validatedQuery || {};
    const rangeStart = (page - 1) * limit;
    const rangeEnd = rangeStart + limit - 1;

    const { data, error, count } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, status, level, department, matric_number, staff_id, created_at",
        { count: "exact" }
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .range(rangeStart, rangeEnd);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      users: data || [],
      pagination: {
        page,
        limit,
        totalCount: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load pending users" });
  }
});

router.post("/approve/:id", validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.validatedParams;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to approve user" });
  }
});

router.post("/reject/:id", validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.validatedParams;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ status: "rejected" })
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to reject user" });
  }
});

router.post("/promote-levels", validateBody(promoteLevelsSchema), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { dryRun } = req.validatedBody;

    // IMPORTANT: Run in descending order to avoid multi-level promotion in one run.
    const steps = [
      { from: 400, to: 500 },
      { from: 300, to: 400 },
      { from: 200, to: 300 },
      { from: 100, to: 200 }
    ];

    const counts = {};
    let total = 0;

    for (const step of steps) {
      if (dryRun) {
        const { count, error } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "student")
          .eq("status", "approved")
          .eq("level", step.from);

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        counts[`${step.from}->${step.to}`] = count || 0;
        total += count || 0;
        continue;
      }

      const { count, error } = await supabase
        .from("profiles")
        .update({ level: step.to })
        .eq("role", "student")
        .eq("status", "approved")
        .eq("level", step.from)
        .select("id", { count: "exact" });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      counts[`${step.from}->${step.to}`] = count || 0;
      total += count || 0;
    }

    if (dryRun) {
      return res.json({ dryRun: true, counts, total });
    }

    return res.json({ ok: true, updated: counts, totalUpdated: total });
  } catch (err) {
    return res.status(500).json({ error: "Failed to promote levels" });
  }
});

module.exports = router;
