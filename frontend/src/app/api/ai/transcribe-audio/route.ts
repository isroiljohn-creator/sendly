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
    formData.append("file", blob, fileName || "audio.wav");

    console.log(`[Aisha STT] Sending audio file to Aisha STT API (${fileName}, size: ${buffer.length} bytes)...`);

    const response = await fetch("https://back.aisha.group/api/v1/stt/post/", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey.trim()
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Aisha STT API Error]:", response.status, errText);
      return NextResponse.json(
        { error: `Aisha API nutqni matnga o'girishda xatoga yo'l qo'ydi (Status: ${response.status}).` },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log("[Aisha STT Success Response]:", JSON.stringify(data));

    // Extract text from potential response keys
    const resultText = data.text || data.result || data.transcript || data.data?.text || data.data?.result || "";

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
