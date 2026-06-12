import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { Language } from '../translations';

export interface AiCreditPack {
  credits: number;
  amountCents: number;
}

export interface AiCreditStatus {
  creditsBalance: number;
  creditsTotalUsed: number;
  creditsTotalGranted: number;
  creditsPurchased: number;
  freeCreditsGranted: number;
  dailyCreditsUsed: number;
  dailyImageGenerations: number;
  dailyCreditLimit: number;
  dailyImageLimit: number;
  plan: string;
  freeCredits: number;
  freeGrantBlocked?: boolean;
  customerCode?: string;
  costs: Record<string, number>;
  packs: Record<string, AiCreditPack>;
}

const AI_DEVICE_KEY = 'awaz_ai_device_id';

export const getAiDeviceId = () => {
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

export const publishCreditStatus = (status: AiCreditStatus) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('awaz:ai-credit-status', { detail: status }));
  }
};

export const refreshAiCreditStatus = async (): Promise<AiCreditStatus> => {
  const getAiCreditStatus = httpsCallable<{ deviceId: string }, AiCreditStatus>(functions, 'getAiCreditStatus');
  const result = await getAiCreditStatus({ deviceId: getAiDeviceId() });
  publishCreditStatus(result.data);
  return result.data;
};

export const createCreditCheckout = async (packId: string, language: Language) => {
  const createCreditCheckoutSession = httpsCallable<
    { packId: string; returnUrl: string; language: Language },
    { url: string; creditIntentId: string; purchaseNumber: string; credits: number }
  >(functions, 'createCreditCheckoutSession');
  const result = await createCreditCheckoutSession({ packId, returnUrl: window.location.origin, language });
  return result.data;
};

export const chargeDesignDownload = async (payload: { source: 'editor' | 'mockup'; designId?: string; categoryId?: string }) => {
  const charge = httpsCallable<
    { deviceId: string; source: 'editor' | 'mockup'; designId?: string; categoryId?: string },
    { charged: boolean; aiUsage?: { creditsRemaining: number; cost: number } }
  >(functions, 'chargeDesignDownload');
  const result = await charge({ deviceId: getAiDeviceId(), ...payload });
  if (result.data.aiUsage && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('awaz:ai-usage-updated', { detail: result.data.aiUsage }));
  }
  return result.data;
};
