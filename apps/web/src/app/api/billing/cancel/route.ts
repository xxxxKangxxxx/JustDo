import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "billing_disabled" }, { status: 410 });
}
