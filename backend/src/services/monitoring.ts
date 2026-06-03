function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendErrorToTelegram(err: any, context?: string) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_MONITORING_CHAT_ID;
    
    if (!botToken || !chatId) {
      return;
    }
    
    const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
    const escapedContext = escapeHtml(context || "Noma'lum");
    const escapedError = escapeHtml(err.message || String(err));
    const escapedStack = err.stack ? escapeHtml(err.stack.split("\n").slice(0, 4).join("\n")) : "";

    const message = `⚠️ <b>Sendly Error Monitor</b>\n\n` +
      `📅 <b>Sana:</b> ${timestamp}\n` +
      `🔍 <b>Kontekst:</b> ${escapedContext}\n` +
      `❌ <b>Xatolik:</b> ${escapedError}\n` +
      (err.stack ? `📂 <b>Stack:</b>\n<code>${escapedStack}</code>` : "");
      
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML"
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (e) {
    console.error("Failed to send error notification to Telegram:", e);
  }
}
