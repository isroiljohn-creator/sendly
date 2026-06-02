export async function sendErrorToTelegram(err: any, context?: string) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "8578893283:AAEH9zZggYbPDReNxsTP8jkaon3x0Pjy7k";
    const chatId = process.env.TELEGRAM_MONITORING_CHAT_ID;
    
    if (!botToken || !chatId) {
      return;
    }
    
    const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
    const message = `⚠️ <b>Sendly Error Monitor</b>\n\n` +
      `📅 <b>Sana:</b> ${timestamp}\n` +
      `🔍 <b>Kontekst:</b> ${context || "Noma'lum"}\n` +
      `❌ <b>Xatolik:</b> ${err.message || String(err)}\n` +
      (err.stack ? `📂 <b>Stack:</b>\n<code>${err.stack.split("\n").slice(0, 4).join("\n")}</code>` : "");
      
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      })
    });
  } catch (e) {
    console.error("Failed to send error notification to Telegram:", e);
  }
}
