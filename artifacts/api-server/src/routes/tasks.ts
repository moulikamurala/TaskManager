import { Router, type IRouter } from "express";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { tasksTable } from "@workspace/db/schema";
import {
  CompleteTaskParams,
  CompleteTaskResponse,
  CreateTaskBody,
  CreateTaskResponse,
  DeleteTaskParams,
  GetDashboardSummaryResponse,
  GetSystemStatusResponse,
  GetTaskParams,
  GetTaskResponse,
  ListTasksQueryParams,
  ListTasksResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
let seedPromise: Promise<void> | undefined;

async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const [{ total }] = await db.select({ total: count() }).from(tasksTable);
      if (total > 0) return;

      const now = Date.now();
      await db.insert(tasksTable).values([
        {
          title: "Verify incoming inspection checklist",
          scheduledAt: new Date(now + 45 * 60 * 1000),
          status: "pending",
        },
        {
          title: "Review batch 24B exception report",
          scheduledAt: new Date(now + 3 * 60 * 60 * 1000),
          status: "pending",
        },
        {
          title: "Archive last week's QC sign-off",
          scheduledAt: new Date(now - 24 * 60 * 60 * 1000),
          status: "completed",
        },
      ]);
    })();
  }
  await seedPromise;
}

router.get("/tasks", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsedQuery = ListTasksQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  const { status, search } = parsedQuery.data;
  const conditions = [];
  if (status !== "all") {
    conditions.push(eq(tasksTable.status, status));
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(ilike(tasksTable.title, term), ilike(tasksTable.status, term)),
    );
  }

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(tasksTable.scheduledAt));

  res.json(ListTasksResponse.parse(tasks));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      title: parsed.data.title.trim(),
      scheduledAt: parsed.data.scheduledAt,
      status: "pending",
    })
    .returning();

  res.status(201).json(CreateTaskResponse.parse(task));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const parsed = GetTaskParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, parsed.data.id));

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(GetTaskResponse.parse(task));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const parsedParams = UpdateTaskParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.message });
    return;
  }

  const parsedBody = UpdateTaskBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  const values = {
    ...(parsedBody.data.title === undefined
      ? {}
      : { title: parsedBody.data.title.trim() }),
    ...(parsedBody.data.scheduledAt === undefined
      ? {}
      : { scheduledAt: parsedBody.data.scheduledAt }),
    ...(parsedBody.data.status === undefined
      ? {}
      : { status: parsedBody.data.status }),
  };

  const [task] = await db
    .update(tasksTable)
    .set(values)
    .where(eq(tasksTable.id, parsedParams.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(UpdateTaskResponse.parse(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const parsed = DeleteTaskParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, parsed.data.id))
    .returning({ id: tasksTable.id });

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/tasks/:id/complete", async (req, res): Promise<void> => {
  const parsed = CompleteTaskParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set({ status: "completed" })
    .where(eq(tasksTable.id, parsed.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(CompleteTaskResponse.parse(task));
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const tasks = await db.select().from(tasksTable);
  const now = Date.now();
  const pending = tasks.filter((task) => task.status === "pending");
  const upcoming = pending
    .filter((task) => task.scheduledAt.getTime() >= now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, 5);

  res.json(
    GetDashboardSummaryResponse.parse({
      total: tasks.length,
      pending: pending.length,
      completed: tasks.filter((task) => task.status === "completed").length,
      overdue: pending.filter((task) => task.scheduledAt.getTime() < now)
        .length,
      upcoming,
    }),
  );
});

router.get("/system/status", async (_req, res): Promise<void> => {
  const startedAt = Date.now();
  await ensureSeeded();
  const pending = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.status, "pending"))
    .orderBy(asc(tasksTable.scheduledAt));
  const responseTimeMs = Math.max(1, Date.now() - startedAt);

  res.json(
    GetSystemStatusResponse.parse({
      status: "operational",
      apiStatus: 200,
      responseTimeMs,
      queueDepth: pending.length,
      nextTask: pending[0]?.scheduledAt.toISOString() ?? null,
      checkedAt: new Date(),
    }),
  );
});

export default router;