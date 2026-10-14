import { Prisma } from "@prisma/client";

/** Mutations lock the session/takeout before orders so payment and edits serialize. */
export async function lockOrderParent(
  tx: Prisma.TransactionClient,
  parent: { session_id?: string | null; takeout_id?: string | null }
): Promise<void> {
  if (parent.session_id) {
    await tx.$queryRaw`SELECT id FROM seat_sessions WHERE id = ${parent.session_id}::uuid FOR UPDATE`;
  }
  if (parent.takeout_id) {
    await tx.$queryRaw`SELECT id FROM takeout_orders WHERE id = ${parent.takeout_id}::uuid FOR UPDATE`;
  }
}
