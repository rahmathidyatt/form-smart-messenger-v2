import {
  bridge,
  checkOrigin,
  checkRateLimit,
  failure,
  hashToken,
  readBody,
  ServiceError,
  success,
} from "@/lib/server/bridge";
import {
  findOrderById,
  loadOrders,
  recordConfirmedOrder,
} from "@/lib/server/order-store";
import { envelopeSchema, orderSchema } from "@/lib/submission";
import { randomBytes, randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function GET() {
  try {
    const orders = loadOrders().slice(0, 50);
    return success(orders);
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const raw = await readBody(req);

    let id: string;
    let token: string;
    let rawOrder: unknown;

    const parsedEnvelope = envelopeSchema.safeParse(raw);
    if (parsedEnvelope.success) {
      id = parsedEnvelope.data.id;
      token = parsedEnvelope.data.token;
      rawOrder = parsedEnvelope.data.order;
    } else {
      const directOrder = orderSchema.safeParse(raw);
      if (!directOrder.success) {
        throw new ServiceError("VALIDATION", 400);
      }
      id = randomUUID();
      token = randomBytes(32).toString("hex");
      rawOrder = directOrder.data;
    }

    const tokenHash = hashToken(token);
    const existing = findOrderById(id);
    if (existing) {
      if (existing.tokenHash !== tokenHash) {
        throw new ServiceError("CONFLICT", 409);
      }
      return success(
        {
          id: existing.id,
          state: existing.state,
          responseId: existing.responseId,
          updatedAt: existing.updatedAt,
          prefillUrl: existing.prefillUrl,
          syncMethod: existing.syncMethod,
        },
        200
      );
    }

    const validOrder = orderSchema.safeParse(rawOrder);
    if (!validOrder.success) {
      throw new ServiceError("VALIDATION", 400);
    }

    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    checkRateLimit(`ip:${forwardedFor}`, 12, 15 * 60 * 1000);
    checkRateLimit(`email:${validOrder.data.email}`, 5, 15 * 60 * 1000);

    const upstream = (await bridge("submit", {
      id,
      token,
      order: validOrder.data,
    })) as
      | {
          id?: string;
          state?: string;
          responseId?: string | null;
          updatedAt?: string;
        }
      | undefined;

    if (!upstream || upstream.state !== "synced" || !upstream.responseId) {
      throw new ServiceError("UPSTREAM_UNKNOWN", 503);
    }

    const stored = recordConfirmedOrder({
      id,
      tokenHash,
      order: validOrder.data,
      responseId: upstream.responseId,
      updatedAt: upstream.updatedAt,
    });

    return success(
      {
        id: stored.id,
        state: stored.state,
        responseId: stored.responseId,
        updatedAt: stored.updatedAt,
        prefillUrl: stored.prefillUrl,
        syncMethod: stored.syncMethod,
      },
      200
    );
  } catch (e) {
    return failure(e);
  }
}
