const express = require("express");
const { getSupabaseAdmin } = require("../lib/supabase");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/cleanup", requireAuth, async (req, res) => {
  try {
    if (req.user.status !== "pending") {
      return res.status(403).json({ error: "Cleanup only allowed for pending users" });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.auth.admin.deleteUser(req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to cleanup user" });
  }
});

module.exports = router;
