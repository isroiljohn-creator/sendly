import { NextResponse } from "next/server";
import { startTelegramBots } from "@/lib/telegramBotRunner";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await startTelegramBots();
  return NextResponse.json(result);
}

export async function POST() {
  const result = await startTelegramBots();
  return NextResponse.json(result);
}
