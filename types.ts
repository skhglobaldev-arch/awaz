
export enum CategoryId {
  GASTRONOMY = 'gastronomy',
  RESTAURANT = 'restaurant',
  RESTAURANT_MENU = 'restaurant_menu',
  RESTAURANT_CARD = 'restaurant_card',
  RESTAURANT_BROCHURE = 'restaurant_brochure',
  RESTAURANT_LOGO = 'restaurant_logo',
  CAFE = 'cafe',
  CAFE_MENU = 'cafe_menu',
  CAFE_CARD = 'cafe_card',
  CAFE_BROCHURE = 'cafe_brochure',
  CAFE_LOGO = 'cafe_logo',
  FASTFOOD = 'fastfood',
  FASTFOOD_MENU = 'fastfood_menu',
  FASTFOOD_CARD = 'fastfood_card',
  FASTFOOD_BROCHURE = 'fastfood_brochure',
  FASTFOOD_LOGO = 'fastfood_logo',
  ICE_COFFEE = 'ice_coffee',
  CLINIC = 'clinic',
  MEDICAL_SERVICES = 'medical_services',
  MEDICAL_LOGO = 'medical_logo',
  MEDICAL_CARD = 'medical_card',
  MEDICAL_BROCHURE = 'medical_brochure',
  CORPORATE = 'corporate',
  CORPORATE_SERVICES = 'corporate_services',
  CORPORATE_LOGO = 'corporate_logo',
  CORPORATE_CARD = 'corporate_card',
  CORPORATE_BROCHURE = 'corporate_brochure'
}

export interface MenuItem {
  id: string;
  name: string;
  price: string;
  description: string;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface MenuColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
}

export interface MenuFonts {
  title: string;
  body: string;
}

export interface MenuData {
  title: string;
  subtitle: string;
  contact: string;
  logo?: string; // data URL
  backgroundImage?: string; // data URL
  colors: MenuColors;
  fonts: MenuFonts;
  sections: MenuSection[];
  customText?: string;
  border?: {
    type: 'none' | 'solid' | 'double' | 'dashed' | 'dotted';
    width: number;
    color: string;
    radius: number;
  };
}

export interface Template {
  id: string;
  categoryId: CategoryId;
  name: string;
  description: string;
  thumbnail: string; // Added thumbnail image URL
  thumbnailColor: string; // CSS gradient or color
  layoutType: 'classic' | 'modern' | 'colorful' | 'minimal' | 'typographic' | 'elegant';
  defaultData: MenuData;
}

export type ViewState = 
  | { type: 'HOME' }
  | { type: 'CATEGORY_SELECT'; categoryId: CategoryId }
  | { type: 'EDITOR'; template: Template }
  | { type: 'MOCKUP_GENERATOR' }
  | { type: 'FAVORITES' }
  | { type: 'ORDER_FORM'; template: Template; data: MenuData | any; orderType: 'retail' | 'wholesale' }
  | { type: 'ORDER_SUCCESS'; order: OrderData }
  | { type: 'PAYMENT_RETURN'; sessionId: string }
  | { type: 'PAYMENT_CANCELLED' }
  | { type: 'CUSTOM_ORDER' }
  | { type: 'ADMIN' }
  | { type: 'DASHBOARD' };

export interface OrderData {
  language?: 'fa' | 'en' | 'de' | 'fr' | 'ar';
  fullName: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  quantity: number;
  orderType: 'retail' | 'wholesale';
  templateId: string;
  templateName?: string;
  source?: 'editor' | 'mockup' | 'custom';
  productId?: string;
  productName?: string;
  items?: Array<{
    name: string;
    quantity?: number;
    unitPrice?: number;
    currency?: 'EUR';
    type?: string;
  }>;
  mockup?: {
    productId?: string;
    productName?: string;
    productCategory?: string;
    productImage?: string;
    logo?: string | null;
    textLayer?: any;
    settings?: any;
    printArea?: any;
    hasLogo?: boolean;
  };
  designData?: any;
  totalPrice: number;
  currency?: 'EUR';
  amountTotalCents?: number;
  status: 'awaiting_payment' | 'pending' | 'paid' | 'in_production' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  createdAt: string;
  userId?: string;
  userEmail?: string | null;
  userName?: string | null;
  customerCode?: string;
  id?: string;
  assignedSupplierId?: string | null;
  supplierStatus?: string;
  paymentStatus?: 'unpaid' | 'processing' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: any;
}

export type PortfolioCategory = 'all' | 'merch' | 'print' | 'branding';

export interface PortfolioItem {
  id: string;
  title: string;
  titleKey: string;
  category: PortfolioCategory;
  description: string;
  descriptionKey: string;
  img: string; // renamed from imageUrl to match usage
  tags: string[];
}

export interface FavoriteTemplate {
  templateId: string;
  savedAt: number;
}
