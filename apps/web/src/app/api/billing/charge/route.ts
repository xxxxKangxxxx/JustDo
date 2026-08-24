import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  void _request;
  return NextResponse.json({ error: "billing_disabled" }, { status: 410 });
}
