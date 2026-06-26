import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { fileName, fileType, base64Data } = await request.json();
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

    // Decode base64 to Buffer
    const buffer = Buffer.from(base64Data, "base64");
    
    // Create native Blob and FormData for fetch
    const blob = new Blob([buffer], { type: fileType || "audio/wav" });
    const formData = new FormData();
    formData.append("audio", blob, fileName || "audio.wav");

    console.log(`[Aisha STT] Sending audio file to Aisha STT API (${fileName}, size: ${buffer.length} bytes)...`);

    let response = await fetch("https://back.aisha.group/api/v1/stt/post/", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey.trim()
      },
      body: formData
    });

    let data;
    let isV2 = false;

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Aisha STT API Error]:", response.status, errText);

      // Check if it's a 403 error due to audio duration limit (needs v2)
      if (response.status === 403 && (errText.includes("audio_duration_use_v2") || errText.includes("2 daqiqadan"))) {
        console.log("[Aisha STT] Audio too long for v1, falling back to v2...");
        isV2 = true;

        const v2FormData = new FormData();
        v2FormData.append("audio", blob, fileName || "audio.wav");

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
          return NextResponse.json(
            { error: `Aisha API nutqni matnga o'girishda xatoga yo'l qo'ydi (v2 Status: ${response.status}).` },
            { status: 500 }
          );
        }

        data = await response.json();
        console.log("[Aisha STT v2 Async Response]:", JSON.stringify(data));
      } else {
        return NextResponse.json(
          { error: `Aisha API nutqni matnga o'girishda xatoga yo'l qo'ydi (Status: ${response.status}).` },
          { status: 500 }
        );
      }
    } else {
      data = await response.json();
      console.log("[Aisha STT Success Response]:", JSON.stringify(data));
    }

    let resultText = "";

    if (isV2) {
      const taskId = Number(data.task_id || data.id);
      if (!taskId || isNaN(taskId)) {
        return NextResponse.json(
          { error: "Aisha STT v2 orqali yuklash muvaffaqiyatsiz bo'ldi: task_id olinmadi." },
          { status: 500 }
        );
      }

      console.log(`[Aisha STT v2] Polling started for Task ID: ${taskId}...`);
      
      const maxAttempts = 40; // 40 attempts * 3 seconds = 120 seconds max
      let completed = false;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Wait 3 seconds
        await new Promise((resolve) => setTimeout(resolve, 3000));

        try {
          const pollRes = await fetch("https://back.aisha.group/api/v2/stt/get/", {
            headers: {
              "X-Api-Key": apiKey.trim()
            }
          });

          if (pollRes.ok) {
            const history = await pollRes.json();
            if (Array.isArray(history)) {
              const task = history.find((t: any) => Number(t.id) === taskId);
              if (task) {
                console.log(`[Aisha STT v2] Task ${taskId} status: ${task.status}`);
                if (task.status === "SUCCESS") {
                  resultText = task.transcript || "";
                  completed = true;
                  break;
                }
                if (task.status === "ERROR" || task.status === "FAILED") {
                  return NextResponse.json(
                    { error: "Aisha STT nutqni matnga o'girishda xatoga yo'l qo'ydi (v2 status error)." },
                    { status: 500 }
                  );
                }
              }
            }
          }
        } catch (pollErr) {
          console.error(`[Aisha STT v2] Polling error on attempt ${attempt}:`, pollErr);
        }
      }

      if (!completed) {
        return NextResponse.json(
          { error: "Aisha STT transkripsiya qilish vaqti tugadi (Timeout: 2 daqiqa)." },
          { status: 504 }
        );
      }
    } else {
      // Extract text from potential response keys for v1
      resultText = data.text || data.result || data.transcript || data.data?.text || data.data?.result || "";
    }

    if (!resultText.trim()) {
      return NextResponse.json(
        { error: "Audiodan hech qanday matn ajratib olib bo'lmadi yoki audio bo'sh." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: resultText.trim() });
  } catch (err: unknown) {
    console.error("[Transcribe Audio Route Error]:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Audioni transkripsiya qilishda texnik xatolik yuz berdi: " + errMsg },
      { status: 500 }
    );
  }
}
