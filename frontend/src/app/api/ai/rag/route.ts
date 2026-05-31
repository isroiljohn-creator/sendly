import { NextResponse } from "next/server";
import { queryRAG } from "@/lib/ai/rag";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, studentName, lessons, modules, settings, history } = body;

    if (!question || !studentName || !lessons || !modules || !settings) {
      return NextResponse.json(
        { error: "Noto'g'ri so'rov parametrlari" },
        { status: 400 }
      );
    }

    const result = await queryRAG(
      question,
      studentName,
      lessons,
      modules,
      settings,
      history || []
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[RAG API Error]:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "RAG so'rovini bajarishda xatolik: " + errMsg },
      { status: 500 }
    );
  }
}
