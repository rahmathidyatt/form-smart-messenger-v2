import {
  appsScriptConfigured,
  bridge,
  checkOriginIfConfigured,
  failure,
  readBody,
  ServiceError,
  success,
} from "@/lib/server/bridge";
import { findOrderById, loadOrders } from "@/lib/server/order-store";
import { receiptSchema } from "@/lib/submission";
import { z } from "zod";

export const runtime = "nodejs";

const lookupSchema = z.union([
  receiptSchema,
  z.object({
    query: z.string().trim().min(2).max(120),
  }),
]);

export async function POST(req: Request) {
  try {
    checkOriginIfConfigured(req);
    const body = await readBody(req);
    const parsed = lookupSchema.safeParse(body);
    if (!parsed.success) throw new ServiceError("VALIDATION", 400);

    if ("id" in parsed.data) {
      const local = findOrderById(parsed.data.id);
      if (local) {
        return success({
          id: local.id,
          state: local.state,
          responseId: local.responseId,
          updatedAt: local.updatedAt,
          unit: local.unit,
          date: local.date,
          task: local.task,
          prefillUrl: local.prefillUrl,
        });
      }
      if (appsScriptConfigured()) {
        return success(await bridge("status", parsed.data));
      }
      throw new ServiceError("NOT_FOUND", 404);
    }

    const q = parsed.data.query.toLowerCase();
    const matches = loadOrders().filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.responseId && o.responseId.toLowerCase().includes(q)) ||
        o.name.toLowerCase().includes(q) ||
        o.unit.toLowerCase().includes(q)
    );
    if (matches.length === 0) {
      throw new ServiceError("NOT_FOUND", 404);
    }
    const first = matches[0];
    return success({
      id: first.id,
      state: first.state,
      responseId: first.responseId,
      updatedAt: first.updatedAt,
      unit: first.unit,
      date: first.date,
      task: first.task,
      name: first.name,
      prefillUrl: first.prefillUrl,
    });
  } catch (e) {
    return failure(e);
  }
}
