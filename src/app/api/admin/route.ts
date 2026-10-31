import {
  appsScriptConfigured,
  bridge,
  checkOriginIfConfigured,
  failure,
  readBody,
  requireAdminIfConfigured,
  ServiceError,
  success,
} from "@/lib/server/bridge";
import { loadOrders, markOrderRead, retryOrderSync } from "@/lib/server/order-store";
import { z } from "zod";

export const runtime = "nodejs";

const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("dashboard") }).strict(),
  z.object({ action: z.enum(["ack", "retry"]), id: z.string().uuid() }).strict(),
]);

export async function POST(req: Request) {
  try {
    checkOriginIfConfigured(req);
    requireAdminIfConfigured(req);
    const parsed = adminActionSchema.safeParse(await readBody(req));
    if (!parsed.success) throw new ServiceError("VALIDATION", 400);

    if (appsScriptConfigured()) {
      return success(await bridge(parsed.data.action, parsed.data));
    }

    if (parsed.data.action === "dashboard") {
      return success(loadOrders());
    }
    if (parsed.data.action === "ack") {
      const updated = markOrderRead(parsed.data.id);
      if (!updated) throw new ServiceError("NOT_FOUND", 404);
      return success({ ok: true });
    }
    if (parsed.data.action === "retry") {
      const updated = retryOrderSync(parsed.data.id);
      if (!updated) throw new ServiceError("NOT_FOUND", 404);
      return success({
        id: updated.id,
        state: updated.state,
        responseId: updated.responseId,
        updatedAt: updated.updatedAt,
      });
    }
    throw new ServiceError("VALIDATION", 400);
  } catch (e) {
    return failure(e);
  }
}
