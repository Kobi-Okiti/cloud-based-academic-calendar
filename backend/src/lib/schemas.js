const { z } = require("zod");

const allowedCategories = [
  "general",
  "announcement",
  "exam",
  "test_week",
  "holiday",
  "seminar"
];

const allowedScopes = ["everyone", "students", "staff"];
const allowedLevels = [100, 200, 300, 400, 500];

const isValidDate = (value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    description: z.string().trim().optional().nullable(),
    category: z.enum(allowedCategories).default("general"),
    start_at: z.string().refine(isValidDate, "Start time is invalid."),
    end_at: z
      .string()
      .optional()
      .nullable()
      .refine((value) => !value || isValidDate(value), "End time is invalid."),
    all_day: z.boolean().optional().default(false),
    location: z.string().trim().optional().nullable(),
    audience_scope: z.enum(allowedScopes).default("everyone"),
    audience_level: z
      .preprocess(
        (value) => (value === "" || value === undefined ? null : value),
        z.number().int().optional().nullable()
      )
      .optional(),
    is_urgent: z.boolean().optional().default(false)
  })
  .superRefine((data, ctx) => {
    if (data.end_at && data.start_at) {
      const start = new Date(data.start_at).getTime();
      const end = new Date(data.end_at).getTime();
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End time must be after start time.",
          path: ["end_at"]
        });
      }
    }

    if (data.audience_scope === "students") {
      if (!data.audience_level) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Student level is required.",
          path: ["audience_level"]
        });
      } else if (!allowedLevels.includes(Number(data.audience_level))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid audience level.",
          path: ["audience_level"]
        });
      }
    } else if (data.audience_level) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Audience level is only for student events.",
        path: ["audience_level"]
      });
    }
  });

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  from: z
    .string()
    .optional()
    .refine((value) => !value || isValidDate(value), "Invalid from date."),
  to: z
    .string()
    .optional()
    .refine((value) => !value || isValidDate(value), "Invalid to date.")
});

const idParamSchema = z.object({
  id: z.string().uuid()
});

module.exports = {
  eventSchema,
  paginationSchema,
  idParamSchema
};
