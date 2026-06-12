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

const callAi = async <T>(task: AiTask, payload: Record<string, unknown>): Promise<T> => {
  const generateAiContent = httpsCallable<Record<string, unknown>, T>(functions, 'generateAiContent');
  const result = await generateAiContent({ task, ...payload });
  return result.data;
};

export const generateDescription = async (itemName: string, categoryName: string): Promise<string> => {
  try {
    const result = await callAi<{ text?: string }>('description', { itemName, categoryName });
    return result.text || 'توضیحات یافت نشد.';
  } catch (error) {
    console.error('AI description generation failed:', error);
    return 'برای دریافت توضیحات هوشمند، ابتدا وارد حساب کاربری شوید.';
  }
};

export const analyzeLogoDesign = async (base64Image: string): Promise<string> => {
  try {
    const result = await callAi<{ text?: string }>('analyzeLogo', { image: base64Image });
    return result.text || 'تحلیل تصویر انجام نشد.';
  } catch (error) {
    console.error('AI logo analysis failed:', error);
    return 'برای تحلیل هوشمند لوگو، ابتدا وارد حساب کاربری شوید.';
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
    return null;
  }
};

export const generateLogo = async (businessName: string, industry: string): Promise<string | null> => {
  try {
    const result = await callAi<{ image?: string | null }>('logo', { businessName, industry });
    return result.image || null;
  } catch (error) {
    console.error('AI logo generation failed:', error);
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
    return null;
  }
};
