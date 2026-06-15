import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!openAIKey) {
      console.error("Transcription failed: OPENAI_API_KEY is not set.");
      return NextResponse.json(
        { error: "OpenAI API Key is not configured on the server." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as Blob;
    if (!file) {
      return NextResponse.json(
        { error: "No audio file uploaded." },
        { status: 400 }
      );
    }

    // Prepare FormData for OpenAI API
    const openAiFormData = new FormData();
    openAiFormData.append("file", file, "audio.webm");
    openAiFormData.append("model", "whisper-1");
    openAiFormData.append("language", "en");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIKey}`,
      },
      body: openAiFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI Whisper API error response:", errText);
      return NextResponse.json(
        { error: "Failed to transcribe audio via OpenAI." },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error("Transcription API error:", error);
    return NextResponse.json(
      { error: "Internal server error during transcription." },
      { status: 500 }
    );
  }
}
