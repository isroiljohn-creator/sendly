import { NextResponse } from "next/server";
import { startTelegramBots } from "@/lib/telegramBotRunner";

export async function GET() {
  const result = startTelegramBots();
  return NextResponse.json(result);
}

export async function POST() {
  const result = startTelegramBots();
  return NextResponse.json(result);
}
