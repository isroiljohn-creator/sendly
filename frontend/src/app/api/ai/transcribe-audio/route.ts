import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { readUserCredits, writeUserCredits } from "../../credits/route";

export async function POST(request: Request) {
  let userId: string | null = null;
  let creditCost = 0;
  let didDeduct = false;
  let bodyFileName = "audio.wav";

  try {
    const body = await request.json();
    const { fileName, fileType, base64Data, durationInMinutes } = body;
    bodyFileName = fileName || "audio.wav";
    const apiKey = process.env.AISHA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Tizim sozlamalarida Aisha STT API kaliti kiritilmagan." },
        { status: 400 }
      );
    }

    if (!base64Data) {
      return NextResponse.json(
        { error: "Audio ma'lumotlari yuborilmagan." },
        { status: 400 }
      );
    }

    // ─── CREDITS TRANSACTIONS LOGIC ───
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET;
    const jwtPattern = /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/;

    if (!token || !jwtSecret || !jwtPattern.test(token)) {
      return NextResponse.json(
        { error: "Ruxsat etilmagan: JWT token kiritilmagan yoki noto'g'ri." },
        { status: 401 }
      );
    }

    const payload = verifyJwt(token, jwtSecret);
    if (!payload || !payload.user_id) {
      return NextResponse.json(
        { error: "Ruxsat etilmagan: Foydalanuvchi ma'lumotlari haqiqiy emas." },
        { status: 403 }
      );
    }

    userId = payload.user_id;
    const isAdmin = payload.email === "admin@sendly.uz" || payload.email === "isroiljohnabdullayev@gmail.com" || payload.email === "aisroil005@gmail.com" || payload.role === "admin";
    const duration = durationInMinutes || 1;
    creditCost = Math.ceil(duration * 100); // 100 credits per minute (1,000 UZS)

    // Check balance
    const creditsData = await readUserCredits(userId);
    if (creditsData.balance < creditCost && !isAdmin) {
      return NextResponse.json(
        { error: `Balansingizda yetarli kreditlar mavjud emas. Transkripsiya uchun ${creditCost} ta kredit (1,000 so'm/daqiqa) talab qilinadi. Joriy balans: ${creditsData.balance} kredit.` },
        { status: 400 }
      );
    }

    // Deduct upfront (only if balance is sufficient, or if they are admin we let it run and deduct down to 0 if needed)
    if (creditsData.balance >= creditCost || isAdmin) {
      creditsData.balance = Math.max(0, creditsData.balance - creditCost);
      creditsData.used = (creditsData.used || 0) + creditCost;
      const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
      creditsData.history.unshift({
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: "usage",
        amount: creditCost,
        description: `Audio transkripsiya boshlandi: "${bodyFileName}" (${Math.ceil(duration)} daqiqa)`,
        date: timestamp
      });

      await writeUserCredits(userId, creditsData);
      didDeduct = true;
    }

    // Decode base64 to Buffer
    const buffer = Buffer.from(base64Data, "base64");
    
    // Create native Blob and FormData for fetch (ensures correct content-type header for audio format)
    const audioBlob = new Blob([buffer], { type: fileType || "audio/wav" });
    const formData = new FormData();
    formData.append("audio", audioBlob, bodyFileName);

    console.log(`[Aisha STT] Sending audio file to Aisha STT API (${bodyFileName}, size: ${buffer.length} bytes)...`);

    let response;
    let data;
    let isV2 = duration > 2;

    if (isV2) {
      console.log(`[Aisha STT] Audio duration is ${duration} mins (> 2 mins). Bypassing v1 and calling v2 directly...`);
      const v2FormData = new FormData();
      v2FormData.append("audio", audioBlob, bodyFileName);

      response = await fetch("https://back.aisha.group/api/v2/stt/post/", {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey.trim()
        },
        body: v2FormData
      });

      if (!response.ok) {
        const v2ErrText = await response.text();
        console.error("[Aisha STT v2 API Error]:", response.status, v2ErrText);
        throw new Error(`Aisha API nutqni matnga o'girishda xatoga yo'l qo'ydi (v2 Status: ${response.status}).`);
      }

      data = await response.json();
      console.log("[Aisha STT v2 Async Response]:", JSON.stringify(data));
    } else {
      console.log(`[Aisha STT] Audio duration is ${duration} mins (<= 2 mins). Calling v1...`);
      response = await fetch("https://back.aisha.group/api/v1/stt/post/", {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey.trim()
        },
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[Aisha STT API Error]:", response.status, errText);

        // Check if it's a 403 error due to audio duration limit (needs v2)
        if (response.status === 403 && (errText.includes("audio_duration_use_v2") || errText.includes("2 daqiqadan"))) {
          console.log("[Aisha STT] Audio too long for v1, falling back to v2...");
          isV2 = true;

          const v2FormData = new FormData();
          v2FormData.append("audio", audioBlob, bodyFileName);

          const fallbackRes = await fetch("https://back.aisha.group/api/v2/stt/post/", {
            method: "POST",
            headers: {
              "X-Api-Key": apiKey.trim()
            },
            body: v2FormData
          });

          if (!fallbackRes.ok) {
            const v2ErrText = await fallbackRes.text();
            console.error("[Aisha STT v2 API Error]:", fallbackRes.status, v2ErrText);
            throw new Error(`Aisha API nutqni matnga o'girishda xatoga yo'l qo'ydi (v2 Status: ${fallbackRes.status}).`);
          }

          data = await fallbackRes.json();
          console.log("[Aisha STT v2 Async Response]:", JSON.stringify(data));
        } else {
          throw new Error(`Aisha API nutqni matnga o'girishda xatoga yo'l qo'ydi (Status: ${response.status}).`);
        }
      } else {
        data = await response.json();
        console.log("[Aisha STT Success Response]:", JSON.stringify(data));
      }
    }

    let resultText = "";

    if (isV2) {
      const taskId = Number(data.id || data.task_id);
      if (!taskId || isNaN(taskId)) {
        throw new Error("Aisha STT v2 orqali yuklash muvaffaqiyatsiz bo'ldi: task_id olinmadi.");
      }

      console.log(`[Aisha STT v2] Polling started for Task ID: ${taskId}...`);
      
      const maxAttempts = 40; // 40 attempts * 3 seconds = 120 seconds max
      let completed = false;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Wait 3 seconds
        await new Promise((resolve) => setTimeout(resolve, 3000));

        try {
          const pollRes = await fetch(`https://back.aisha.group/api/v2/stt/get/${taskId}/`, {
            headers: {
              "X-Api-Key": apiKey.trim()
            }
          });

          if (pollRes.ok) {
            const task = await pollRes.json();
            if (task) {
              console.log(`[Aisha STT v2] Task ${taskId} status: ${task.status}`);
              if (task.status === "SUCCESS") {
                resultText = task.transcript || "";
                completed = true;
                break;
              }
              if (task.status === "ERROR" || task.status === "FAILED") {
                throw new Error("Aisha STT nutqni matnga o'girishda xatoga yo'l qo'ydi (v2 status error).");
              }
            }
          }
        } catch (pollErr: any) {
          console.error(`[Aisha STT v2] Polling error on attempt ${attempt}:`, pollErr);
          // If pollErr is our custom STT status error, propagate it
          if (pollErr.message && pollErr.message.includes("v2 status error")) {
            throw pollErr;
          }
        }
      }

      if (!completed) {
        throw new Error("Aisha STT transkripsiya qilish vaqti tugadi (Timeout: 2 daqiqa).");
      }
    } else {
      // Extract text from potential response keys for v1
      resultText = data.text || data.result || data.transcript || data.data?.text || data.data?.result || "";
    }

    if (!resultText.trim()) {
      // Refund empty transcription
      if (didDeduct && userId) {
        try {
          const refundData = await readUserCredits(userId);
          refundData.balance = (refundData.balance || 0) + creditCost;
          refundData.used = Math.max(0, (refundData.used || 0) - creditCost);
          const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
          refundData.history.unshift({
            id: `refund-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: "purchase",
            amount: creditCost,
            description: `Transkripsiya matni bo'sh bo'lgani uchun kreditlar qaytarildi: "${bodyFileName}"`,
            date: timestamp
          });
          await writeUserCredits(userId, refundData);
        } catch (refundErr) {
          console.error("[Refund Error]:", refundErr);
        }
      }

      return NextResponse.json(
        { error: "Audiodan hech qanday matn ajratib olib bo'lmadi yoki audio bo'sh." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: resultText.trim() });
  } catch (err: unknown) {
    console.error("[Transcribe Audio Route Error]:", err);
    const errMsg = err instanceof Error ? err.message : String(err);

    // ─── REFUND LOGIC ON ERROR ───
    if (didDeduct && userId) {
      try {
        const refundData = await readUserCredits(userId);
        refundData.balance = (refundData.balance || 0) + creditCost;
        refundData.used = Math.max(0, (refundData.used || 0) - creditCost);
        const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
        refundData.history.unshift({
          id: `refund-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: "purchase",
          amount: creditCost,
          description: `Transkripsiya xatoligi sababli kreditlar qaytarildi: "${bodyFileName}"`,
          date: timestamp
        });
        await writeUserCredits(userId, refundData);
        console.log(`[Aisha STT] Successfully refunded ${creditCost} credits to user ${userId}.`);
      } catch (refundErr) {
        console.error("[Refund Error]:", refundErr);
      }
    }

    return NextResponse.json(
      { error: "Audioni transkripsiya qilishda xatolik yuz berdi: " + errMsg },
      { status: 500 }
    );
  }
}
