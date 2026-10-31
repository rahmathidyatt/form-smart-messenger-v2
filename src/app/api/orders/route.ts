import {
  appsScriptConfigured,
  bridge,
  checkOriginIfConfigured,
  failure,
  hashToken,
  readBody,
  ServiceError,
  success,
  verifyChallengeIfConfigured,
} from "@/lib/server/bridge";
import { loadOrders, recordAndSyncOrder } from "@/lib/server/order-store";
import { envelopeSchema, orderSchema } from "@/lib/submission";
import { randomUUID } from "node:crypto";

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
    checkOriginIfConfigured(req);
    const raw = await readBody(req);

    // Support both full envelopeSchema (with id, token, challenge, order) and direct order payload
    const parsedEnvelope = envelopeSchema.safeParse(raw);
    if (parsedEnvelope.success) {
      await verifyChallengeIfConfigured(parsedEnvelope.data.challenge);
      const { id, token, order } = parsedEnvelope.data;
      const validDateOrder = orderSchema.safeParse(order);
      if (!validDateOrder.success) {
        throw new ServiceError("VALIDATION", 400);
      }

      if (appsScriptConfigured()) {
        const upstream = await bridge("submit", { id, token, order });
        await recordAndSyncOrder({ id, tokenHash: hashToken(token), order });
        return success(upstream, 202);
      }

      const stored = await recordAndSyncOrder({
        id,
        tokenHash: hashToken(token),
        order: validDateOrder.data,
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
    }

    // Fallback: direct order object submission
    const directOrder = orderSchema.safeParse(raw);
    if (!directOrder.success) {
      throw new ServiceError("VALIDATION", 400);
    }
    const id = randomUUID();
    const stored = await recordAndSyncOrder({
      id,
      tokenHash: "direct",
      order: directOrder.data,
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
