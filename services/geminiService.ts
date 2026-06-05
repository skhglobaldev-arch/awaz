import { GoogleGenAI } from "@google/genai";
import { MenuItem, CategoryId, Template } from "../types";

const getClient = () => {
  // Try multiple ways to get the API key in Vite/Browser environment
  const apiKey = process.env.GEMINI_API_KEY || 
                 // @ts-ignore
                 (import.meta.env?.VITE_GEMINI_API_KEY);

  if (apiKey) {
    console.log("Using API Key starting with:", apiKey.substring(0, 4));
    return new GoogleGenAI({ apiKey });
  } else {
    console.warn("GEMINI_API_KEY is missing in environment variables.");
    return null;
  }
};

const buildPrintDesignStrategyPrompt = (params: {
  designType: string;
  industryName: string;
  subIndustryName?: string;
  businessName?: string;
  userBrief?: string;
}) => {
  const { designType, industryName, subIndustryName = '', businessName = 'نام کسب و کار', userBrief = '' } = params;

  return `
You are the senior creative director and print-production strategist at Awaz Design & Print Studio.
Your job is not only to write content; you must design a commercially usable, print-aware concept for "${designType}".

Business:
- Name: ${businessName}
- Industry: ${industryName}${subIndustryName ? ` / ${subIndustryName}` : ''}
- Client brief: ${userBrief}

Professional design strategy requirements:
1. Brand positioning:
   - Infer the audience, price level, personality, and trust signals from the business type.
   - Make the concept practical for a real client, not generic stock-style wording.
2. Print production knowledge:
   - Respect print-safe hierarchy: clear focal point, readable sizes, high contrast, no tiny critical text.
   - Think in CMYK-friendly colors and avoid low-contrast combinations.
   - Keep important content inside a safe margin; account for bleed/crop in the composition.
   - Prefer clean vector-like logo concepts and simple shapes that reproduce well on paper and merchandise.
3. Persian/RTL typography:
   - Use fluent Persian copy, short and premium.
   - Create strong hierarchy for title, subtitle, contact, section headings, prices, and calls to action.
   - Avoid crowded paragraphs; design must breathe.
4. Product-specific strategy:
   - Menu: categorize items logically, show prices clearly, use appetite-driven descriptions, and avoid visual clutter.
   - Business card: prioritize name/role/contact, create a memorable front-side identity, and keep back-side information minimal.
   - Brochure: organize content into panels/sections with a clear offer, services, credibility, and contact CTA.
   - Logo: create an iconic, minimal, scalable identity suitable for signage, stamp, packaging, social media, and embroidery/merch print.
5. Output quality:
   - Return only valid JSON matching the requested Template structure.
   - Every visible text value must be Persian unless it is a brand name, URL, email, or phone number.
   - Use realistic sample content when the client did not provide enough details.
`;
};

export const generateDescription = async (itemName: string, categoryName: string): Promise<string> => {
  const client = getClient();
  if (!client) return "لطفا کلید API را تنظیم کنید.";

  try {
    const prompt = `
      برای آیتم منوی "${itemName}" در دسته کسب‌وکار "${categoryName}" یک توضیح فارسی کوتاه، اشتهابرانگیز و قابل چاپ بنویس.
      حداکثر ۱۵ کلمه.
      متن باید مناسب منوی چاپی باشد: خوانا، فروشنده، بدون اغراق غیرواقعی، و بدون تکرار نام آیتم.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "توضیحات یافت نشد.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "خطا در دریافت توضیحات هوشمند.";
  }
};

export const analyzeLogoDesign = async (base64Image: string): Promise<string> => {
  const client = getClient();
  if (!client) return "لطفا کلید API را تنظیم کنید.";

  try {
    const prompt = `
      این لوگو را مثل یک طراح برند و کارشناس چاپ تحلیل کن.
      درباره سبک بصری، رنگ‌ها، خوانایی در ابعاد کوچک، قابلیت چاپ روی هودی/ماگ/تیشرت، ریسک‌های چاپی مثل جزئیات ریز یا کنتراست پایین، و پیشنهادهای اصلاحی کوتاه بنویس.
      پاسخ فارسی و کاربردی باشد.
    `;
    
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
      ]
    });

    return response.text || "تحلیل تصویر انجام نشد.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "خطا در تحلیل هوشمند لوگو.";
  }
};
export const generateBusinessCardContent = async (businessName: string, description: string): Promise<{ slogan: string; description: string }> => {
  const client = getClient();
  if (!client) return { slogan: "شعار یافت نشد", description: "توضیحات یافت نشد" };

  try {
    const prompt = `
      برای کارت ویزیت چاپی یک شعار کوتاه و یک توضیح یک‌خطی فارسی بساز.
      نام کسب‌وکار: "${businessName}"
      توضیح کسب‌وکار: "${description}"
      استراتژی:
      - شعار باید کوتاه، ماندگار و مناسب چاپ روی کارت ویزیت باشد.
      - توضیح باید جایگاه برند و مزیت اصلی را روشن کند.
      - از عبارت‌های کلیشه‌ای و طولانی پرهیز کن.
      Return the result in JSON format: { "slogan": "...", "description": "..." }.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      slogan: result.slogan || "طعم ماندگار، کیفیت برتر",
      description: result.description || "ارائه بهترین خدمات با استانداردهای جهانی"
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { slogan: "خلاقیت در هر قدم", description: "همراه شما در مسیر موفقیت" };
  }
};

export const generateBackgroundImage = async (prompt: string, aspectRatio: "1:1" | "9:16" | "16:9" = "9:16"): Promise<string | null> => {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Create a high-quality print-design background for a professional template. Theme: ${prompt}. The image must support readable Persian text overlay, with calm negative space, CMYK-friendly colors, no busy details behind text, premium commercial look, suitable for menu/business card/brochure print layouts.` }]
      },
      config: {
        imageConfig: { 
          aspectRatio: aspectRatio as any,
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64Str = `data:image/png;base64,${part.inlineData.data}`;
        
        // Compress and resize image to JPEG to save Firestore space
        return new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Max dimension 800px
            const MAX_DIM = 800;
            if (width > height && width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            } else if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Compress to 60% quality JPEG
              resolve(canvas.toDataURL('image/jpeg', 0.6));
            } else {
              resolve(base64Str);
            }
          };
          img.onerror = () => resolve(base64Str);
          img.src = base64Str;
        });
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    return null;
  }
};

export const generateLogo = async (businessName: string, industry: string): Promise<string | null> => {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A professional, minimalist, vector-like logo for a business named "${businessName}" in the ${industry} industry. Must be scalable, iconic, high contrast, suitable for print, signage, stamp, embroidery, packaging and social media. Avoid tiny details, gradients that fail in print, and overly complex effects. White background, centered, premium brand identity.` }]
      },
      config: {
        imageConfig: { 
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64Str = `data:image/png;base64,${part.inlineData.data}`;
        
        // Compress and resize image to JPEG to save Firestore space
        return new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Max dimension 800px
            const MAX_DIM = 800;
            if (width > height && width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            } else if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Compress to 60% quality JPEG
              resolve(canvas.toDataURL('image/jpeg', 0.6));
            } else {
              resolve(base64Str);
            }
          };
          img.onerror = () => resolve(base64Str);
          img.src = base64Str;
        });
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Logo Generation Error:", error);
    return null;
  }
};

export const suggestMenuItems = async (businessType: string): Promise<MenuItem[]> => {
  const client = getClient();
  if (!client) return [];

  try {
    const prompt = `
      برای منوی چاپی یک "${businessType}" پنج آیتم محبوب و واقعی پیشنهاد بده.
      هر آیتم باید فارسی، خوانا و مناسب منوی حرفه‌ای باشد.
      قیمت را با فرمت تومان مثل '۱۵۰,۰۰۰ ت' بنویس.
      توضیح باید کوتاه، اشتهابرانگیز و قابل چاپ باشد، نه طولانی.
      Return as a JSON array of objects: [{ "name": "...", "price": "...", "description": "..." }].
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const items = JSON.parse(response.text || '[]');
    return items.map((item: any, index: number) => ({
      id: `ai-${index}-${Date.now()}`,
      ...item
    }));
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
};

export const generateTemplate = async (
  prompt: string, 
  initialCategoryId: CategoryId,
  businessName?: string,
  industry?: string,
  subIndustry?: string,
  itemType?: string
): Promise<Template | null> => {
  const client = getClient();
  if (!client) return null;

  let categoryId = initialCategoryId;
  const promptLower = prompt.toLowerCase();

  // If itemType is provided, use it to set categoryId
  if (itemType) {
    const typeLower = itemType.toLowerCase();
    if (typeLower.includes('منو') || typeLower.includes('menu')) {
      if (subIndustry?.includes('رستوران')) categoryId = CategoryId.RESTAURANT_MENU;
      else if (subIndustry?.includes('کافی')) categoryId = CategoryId.CAFE_MENU;
      else if (subIndustry?.includes('فست')) categoryId = CategoryId.FASTFOOD_MENU;
    } else if (typeLower.includes('کارت') || typeLower.includes('card')) {
      if (subIndustry?.includes('رستوران')) categoryId = CategoryId.RESTAURANT_CARD;
      else if (subIndustry?.includes('کافی')) categoryId = CategoryId.CAFE_CARD;
      else if (subIndustry?.includes('فست')) categoryId = CategoryId.FASTFOOD_CARD;
      else if (industry?.includes('پزشکی')) categoryId = CategoryId.MEDICAL_CARD;
      else if (industry?.includes('شرکتی')) categoryId = CategoryId.CORPORATE_CARD;
    } else if (typeLower.includes('لوگو') || typeLower.includes('logo')) {
      if (subIndustry?.includes('رستوران')) categoryId = CategoryId.RESTAURANT_LOGO;
      else if (subIndustry?.includes('کافی')) categoryId = CategoryId.CAFE_LOGO;
      else if (subIndustry?.includes('فست')) categoryId = CategoryId.FASTFOOD_LOGO;
      else if (industry?.includes('پزشکی')) categoryId = CategoryId.MEDICAL_LOGO;
      else if (industry?.includes('شرکتی')) categoryId = CategoryId.CORPORATE_LOGO;
    } else if (typeLower.includes('بروشور') || typeLower.includes('brochure')) {
      if (subIndustry?.includes('رستوران')) categoryId = CategoryId.RESTAURANT_BROCHURE;
      else if (subIndustry?.includes('کافی')) categoryId = CategoryId.CAFE_BROCHURE;
      else if (subIndustry?.includes('فست')) categoryId = CategoryId.FASTFOOD_BROCHURE;
      else if (industry?.includes('پزشکی')) categoryId = CategoryId.MEDICAL_BROCHURE;
      else if (industry?.includes('شرکتی')) categoryId = CategoryId.CORPORATE_BROCHURE;
    }
  }

  // Determine design type for better context
  let designType = itemType || "طراحی عمومی";
  
  // Determine industry for better context
  let industryName = industry || "عمومی";
  let subIndustryName = subIndustry || "";

  try {
    const systemInstruction = `
      ${buildPrintDesignStrategyPrompt({
        designType,
        industryName,
        subIndustryName,
        businessName,
        userBrief: prompt,
      })}
      
      Specific Category ID: ${categoryId}.
      
      The output must strictly follow the Template interface structure.
      Use Persian (Farsi) for all visible text content.
      Ensure the design is creative, modern, print-ready, and perfectly suited for ${industryName} and specifically for a ${designType}.
      Choose colors intentionally:
      - primary: brand anchor color
      - accent: contrast/action color
      - background: printable background with enough contrast
      - text: readable text color
      Choose layoutType from: classic, modern, colorful, minimal, typographic, elegant.
      
      JSON Structure:
      {
        "id": "generated-id",
        "categoryId": "${categoryId}",
        "name": "Template Name in Persian",
        "description": "Short description in Persian",
        "thumbnailColor": "linear-gradient(135deg, #color1 0%, #color2 100%)",
        "layoutType": "modern",
        "defaultData": {
          "title": "${businessName || 'نام کسب و کار'}",
          "subtitle": "Slogan/Subtitle in Persian",
          "contact": "Contact Info in Persian",
          "address": "Address in Persian",
          "colors": { "primary": "#hex", "accent": "#hex", "background": "#hex", "text": "#hex" },
          "fonts": { "title": "Lalezar", "body": "Vazirmatn" },
          "customText": "Short print strategy note in Persian: safe margin, print finish suggestion, or CTA",
          "sections": [
            { "id": "s1", "title": "Section Title in Persian", "items": [{ "id": "i1", "name": "Item Name", "price": "Price", "description": "Desc" }] }
          ]
        }
      }
      
      Product-specific output:
      - Logo: sections can contain 1 section named "راهنمای برند" with 2-3 notes about color/use, no menu items needed.
      - Business Card: sections should contain contact/service fields that fit a card.
      - Menu: provide 3 realistic sections with 3 items each if possible.
      - Brochure: provide 3 sections: معرفی، خدمات، مزیت/دعوت به اقدام.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a print-ready professional ${designType} strategy and template for ${businessName || 'a business'} in the ${industryName} ${subIndustryName} industry. User prompt: ${prompt}`,
      config: { 
        systemInstruction,
        responseMimeType: 'application/json' 
      }
    });

    let jsonStr = response.text || '{}';
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const template = JSON.parse(jsonStr) as Template;
    template.id = `custom-template-${Date.now()}`;
    template.categoryId = categoryId;
    
    // Generate a thumbnail for the generated template
    const thumbnailUrl = await generateBackgroundImage(`${industryName} ${subIndustryName} ${designType} ${prompt}`, "16:9");
    template.thumbnail = thumbnailUrl || 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=500&auto=format&fit=crop';
    
    return template;
  } catch (error) {
    console.error("Gemini Template Generation Error:", error);
    return null;
  }
};
