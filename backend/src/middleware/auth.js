const { getSupabaseAdmin } = require("../lib/supabase");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: "Missing access token" });
    }

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.getUser(
      token
    );

    if (authError || !authData?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = authData.user.id;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, role, status, full_name, email, level, department, matric_number, staff_id"
      )
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return res.status(401).json({ error: "Profile not found" });
    }

    req.user = profile;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireApproved(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.user.status !== "approved") {
    return res.status(403).json({ error: "Account pending approval" });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireApproved,
  requireAdmin
};
