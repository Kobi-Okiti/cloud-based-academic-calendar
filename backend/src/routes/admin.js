const express = require("express");
const { getSupabaseAdmin } = require("../lib/supabase");
const { requireAuth, requireApproved, requireAdmin } = require("../middleware/auth");
const { validateParams } = require("../middleware/validate");
const { idParamSchema } = require("../lib/schemas");

const router = express.Router();

router.use(requireAuth, requireApproved, requireAdmin);

router.get("/pending-users", async (_req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, status, level, department, matric_number, staff_id, created_at"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ users: data || [] });
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

module.exports = router;
