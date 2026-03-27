const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const { requireAuth, requireApproved } = require("./middleware/auth");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const {
  router: notificationRoutes,
  executeNotificationRun
} = require("./routes/notifications");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/me", requireAuth, requireApproved, (req, res) => {
  res.json({ user: req.user });
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/events", eventRoutes);
app.use("/notifications", notificationRoutes);

if (process.env.ENABLE_CRON === "true") {
  const intervalMinutes = Number(process.env.CRON_INTERVAL_MINUTES || 5);
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

  console.log(
    `[cron] Notifications scheduler enabled every ${intervalMinutes} minute(s).`
  );

  setInterval(async () => {
    try {
      const { createdCount, errorCount } = await executeNotificationRun();
      console.log(
        `[cron] Notifications run: created=${createdCount} errors=${errorCount}`
      );
    } catch (err) {
      console.error(
        "[cron] Notifications run failed:",
        err instanceof Error ? err.message : err
      );
    }
  }, intervalMs);
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
