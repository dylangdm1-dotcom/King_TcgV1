import { NextRequest, NextResponse } from "next/server";
import { readCloudState, resolveRequestUser, writeCloudState } from "@/lib/auth/supabase-rest";

const KINDS = new Set(["cards", "items", "sales", "favorites", "settings", "scanner"]);

export async function GET(req: NextRequest) {
  const auth = await resolveRequestUser(req);
  if (!auth) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  return NextResponse.json({ states: await readCloudState(auth.user.id) });
}

export async function PUT(req: NextRequest) {
  const auth = await resolveRequestUser(req);
  if (!auth) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!KINDS.has(body?.kind) || JSON.stringify(body?.payload ?? null).length > 2_000_000) return NextResponse.json({ error: "Données Cloud invalides" }, { status: 400 });
  const rows = await writeCloudState(auth.user.id, body.kind, body.payload ?? null, Math.max(1, Number(body.version) || Date.now()));
  return NextResponse.json({ success: true, state: Array.isArray(rows) ? rows[0] : rows });
}
