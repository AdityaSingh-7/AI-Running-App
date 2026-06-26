const VOICE_MAP = {
  motivational: "pNInz6obpgDQGcFmaJgB", // "Adam" - warm male
  analytical: "ErXwobaYiN019PkySvjV", // "Antoni" - clear male
  drill_sergeant: "VR6AewLTigWG4xSOukaG", // "Arnold" - deep commanding
} as const;

type PersonalityKey = keyof typeof VOICE_MAP;

export function getVoiceId(personality: string): string {
  return (
    VOICE_MAP[personality as PersonalityKey] ?? VOICE_MAP["motivational"]
  );
}

export async function textToSpeech(
  text: string,
  personality: string
): Promise<Buffer> {
  const voiceId = getVoiceId(personality);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ElevenLabs API error ${response.status}: ${errorText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
