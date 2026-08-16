import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const rows = await prisma.$queryRaw<Array<{ people: bigint }>>`
    SELECT COUNT(*)::bigint AS people FROM "Person"
  `;

  return NextResponse.json({
    ok: true,
    people: Number(rows[0]?.people ?? 0),
    at: new Date().toISOString(),
  });
}
