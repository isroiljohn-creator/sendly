import { NextResponse } from "next/server";
import { startTelegramBots } from "@/lib/telegramBotRunner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Only allow internal calls (from server-side) or with secret header
  const secret = request.headers.get('X-Internal-Secret');
  const expectedSecret = process.env.INTERNAL_SECRET || 'sendly-internal-2024';
  if (secret !== expectedSecret) {
    // Allow same-origin calls (no Origin header = server-side)
    const origin = request.headers.get('origin');
    if (origin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const result = await startTelegramBots();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  // Only allow internal calls (from server-side) or with secret header
  const secret = request.headers.get('X-Internal-Secret');
  const expectedSecret = process.env.INTERNAL_SECRET || 'sendly-internal-2024';
  if (secret !== expectedSecret) {
    // Allow same-origin calls (no Origin header = server-side)
    const origin = request.headers.get('origin');
    if (origin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const result = await startTelegramBots();
  return NextResponse.json(result);
}
