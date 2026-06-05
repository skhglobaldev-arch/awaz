import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateLogo() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'A professional, modern, and minimalist logo for "Awaz Design & Print Studio". The logo should incorporate elements of creativity and printing (like a stylized printer nozzle, a CMYK color drop, or a creative pen tool) combined with the name "Awaz" in elegant typography. Use a sophisticated color palette like deep purple, gold, and slate gray. High resolution, vector style, clean background.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      console.log("LOGO_BASE64_START");
      console.log(part.inlineData.data);
      console.log("LOGO_BASE64_END");
    }
  }
}

generateLogo();
