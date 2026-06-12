import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { MenuItem, CategoryId, Template } from '../types';

type AiTask =
  | 'description'
  | 'analyzeLogo'
  | 'businessCard'
  | 'backgroundImage'
  | 'logo'
  | 'menuItems'
  | 'template';

export interface AiUsage {
  cost: number;
  creditsRemaining: number;
  dailyCreditsUsed: number;
  dailyCreditLimit: number;
  dailyImagesUsed: number;
  dailyImageLimit: number;
  plan: string;
}

const AI_DEVICE_KEY = 'awaz_ai_device_id';
let lastAiErrorMessage = '';

export const getLastAiErrorMessage = () => lastAiErrorMessage;

const getAiDeviceId = () => {
  try {
    const saved = localStorage.getItem(AI_DEVICE_KEY);
    if (saved) return saved;
    const browserCrypto = globalThis.crypto;
    const id = browserCrypto?.randomUUID
      ? browserCrypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(AI_DEVICE_KEY, id);
    return id;
  } catch (_) {
    return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const readableAiError = (error: unknown) => {
  const err = error as { code?: string; message?: string };
  const code = err?.code || '';
  const message = err?.message || '';
  if (code.includes('unauthenticated')) return 'برای استفاده از هوش مصنوعی، ابتدا وارد حساب کاربری شوید.';
  if (code.includes('resource-exhausted') || /credit|limit/i.test(message)) {
    return 'اعتبار یا محدودیت روزانه هوش مصنوعی تمام شده است. بعدا دوباره امتحان کنید یا اعتبار بیشتری تهیه کنید.';
  }
  return 'خطا در تولید محتوا توسط هوش مصنوعی.';
};

const rememberAiError = (error: unknown) => {
  lastAiErrorMessage = readableAiError(error);
  return lastAiErrorMessage;
};

const callAi = async <T extends Record<string, unknown>>(task: AiTask, payload: Record<string, unknown>): Promise<T> => {
  lastAiErrorMessage = '';
  const generateAiContent = httpsCallable<Record<string, unknown>, T & { aiUsage?: AiUsage }>(functions, 'generateAiContent');
  const result = await generateAiContent({ task, deviceId: getAiDeviceId(), ...payload });
  if (result.data?.aiUsage && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('awaz:ai-usage-updated', { detail: result.data.aiUsage }));
  }
  return result.data;
};

export const generateDescription = async (itemName: string, categoryName: string): Promise<string> => {
  try {
    const result = await callAi<{ text?: string }>('description', { itemName, categoryName });
    return result.text || 'توضیحات یافت نشد.';
  } catch (error) {
    console.error('AI description generation failed:', error);
    return rememberAiError(error);
  }
};

export const analyzeLogoDesign = async (base64Image: string): Promise<string> => {
  try {
    const result = await callAi<{ text?: string }>('analyzeLogo', { image: base64Image });
    return result.text || 'تحلیل تصویر انجام نشد.';
  } catch (error) {
    console.error('AI logo analysis failed:', error);
    return rememberAiError(error);
  }
};

export const generateBusinessCardContent = async (
  businessName: string,
  description: string
): Promise<{ slogan: string; description: string }> => {
  try {
    const result = await callAi<{ slogan?: string; description?: string }>('businessCard', { businessName, description });
    return {
      slogan: result.slogan || 'خلاقیت در هر قدم',
      description: result.description || 'همراه شما در مسیر موفقیت',
    };
  } catch (error) {
    console.error('AI business card content generation failed:', error);
    rememberAiError(error);
    return { slogan: 'خلاقیت در هر قدم', description: 'همراه شما در مسیر موفقیت' };
  }
};

export const generateBackgroundImage = async (
  prompt: string,
  aspectRatio: '1:1' | '9:16' | '16:9' = '9:16'
): Promise<string | null> => {
  try {
    const result = await callAi<{ image?: string | null }>('backgroundImage', { prompt, aspectRatio });
    return result.image || null;
  } catch (error) {
    console.error('AI background image generation failed:', error);
    rememberAiError(error);
    return null;
  }
};

export const generateLogo = async (businessName: string, industry: string): Promise<string | null> => {
  try {
    const result = await callAi<{ image?: string | null }>('logo', { businessName, industry });
    return result.image || null;
  } catch (error) {
    console.error('AI logo generation failed:', error);
    rememberAiError(error);
    return null;
  }
};

export const suggestMenuItems = async (businessType: string): Promise<MenuItem[]> => {
  try {
    const result = await callAi<{ items?: MenuItem[] }>('menuItems', { businessType });
    return (result.items || []).map((item, index) => ({
      id: item.id || `ai-${index}-${Date.now()}`,
      name: item.name || 'آیتم پیشنهادی',
      price: item.price || '',
      description: item.description || '',
    }));
  } catch (error) {
    console.error('AI menu item suggestion failed:', error);
    rememberAiError(error);
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
  try {
    const result = await callAi<{ template?: Template | null }>('template', {
      prompt,
      initialCategoryId,
      businessName,
      industry,
      subIndustry,
      itemType,
    });
    return result.template || null;
  } catch (error) {
    console.error('AI template generation failed:', error);
    rememberAiError(error);
    return null;
  }
};
