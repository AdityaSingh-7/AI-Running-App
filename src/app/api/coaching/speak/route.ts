import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { textToSpeech } from "@/lib/elevenlabs";

export async function POST(request: NextRequest) {
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "No TTS key" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: string; personality?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, personality = "motivational" } = body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const audioBuffer = await textToSpeech(text, personality);
  const uint8 = new Uint8Array(audioBuffer);

  return new Response(uint8, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(uint8.byteLength),
    },
  });
}
