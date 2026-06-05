import { CategoryId, Template, PortfolioItem } from './types';
import { Utensils, Stethoscope, Building2 } from 'lucide-react';

export const CATEGORIES = [
  {
    id: CategoryId.GASTRONOMY,
    name: 'گاسترونومی',
    nameKey: 'category_gastronomy',
    description: 'مجموعه کامل خدمات طراحی و چاپ برای صنعت خوراکی و نوشیدنی.',
    descriptionKey: 'category_gastronomy_desc',
    icon: Utensils,
    color: 'from-orange-500 to-red-600',
    img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop',
    children: [
      {
        id: CategoryId.RESTAURANT,
        name: 'رستوران',
        nameKey: 'category_restaurant',
        subItems: [
          { id: CategoryId.RESTAURANT_MENU, name: 'منو', nameKey: 'item_menu' },
          { id: CategoryId.RESTAURANT_CARD, name: 'کارت ویزیت', nameKey: 'item_card' },
          { id: CategoryId.RESTAURANT_BROCHURE, name: 'بروشور', nameKey: 'item_brochure' },
          { id: CategoryId.RESTAURANT_LOGO, name: 'لوگو', nameKey: 'item_logo' }
        ]
      },
      {
        id: CategoryId.CAFE,
        name: 'کافی شاپ',
        nameKey: 'category_cafe',
        subItems: [
          { id: CategoryId.CAFE_MENU, name: 'منو', nameKey: 'item_menu' },
          { id: CategoryId.CAFE_CARD, name: 'کارت ویزیت', nameKey: 'item_card' },
          { id: CategoryId.CAFE_BROCHURE, name: 'بروشور', nameKey: 'item_brochure' },
          { id: CategoryId.CAFE_LOGO, name: 'لوگو', nameKey: 'item_logo' }
        ]
      },
      {
        id: CategoryId.FASTFOOD,
        name: 'فست فود',
        nameKey: 'category_fastfood',
        subItems: [
          { id: CategoryId.FASTFOOD_MENU, name: 'منو', nameKey: 'item_menu' },
          { id: CategoryId.FASTFOOD_CARD, name: 'کارت ویزیت', nameKey: 'item_card' },
          { id: CategoryId.FASTFOOD_BROCHURE, name: 'بروشور', nameKey: 'item_brochure' },
          { id: CategoryId.FASTFOOD_LOGO, name: 'لوگو', nameKey: 'item_logo' }
        ]
      }
    ]
  },
  {
    id: CategoryId.CLINIC,
    name: 'پزشکی و زیبایی',
    nameKey: 'category_clinic',
    description: 'بروشورها و لیست خدمات با طراحی سفید، تمیز و اعتماد‌بخش.',
    descriptionKey: 'category_clinic_desc',
    icon: Stethoscope,
    color: 'from-cyan-400 to-blue-600',
    img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=800&auto=format&fit=crop',
    children: [
      {
        id: CategoryId.MEDICAL_SERVICES,
        name: 'خدمات پزشکی',
        nameKey: 'category_medical',
        subItems: [
          { id: CategoryId.MEDICAL_LOGO, name: 'لوگو', nameKey: 'item_logo' },
          { id: CategoryId.MEDICAL_CARD, name: 'کارت ویزیت', nameKey: 'item_card' },
          { id: CategoryId.MEDICAL_BROCHURE, name: 'بروشور', nameKey: 'item_brochure' }
        ]
      }
    ]
  },
  {
    id: CategoryId.CORPORATE,
    name: 'شرکتی و اداری',
    nameKey: 'category_corporate',
    description: 'ست اداری، سربرگ و کارت ویزیت رسمی برای کسب‌وکارهای حرفه‌ای.',
    descriptionKey: 'category_corporate_desc',
    icon: Building2,
    color: 'from-blue-600 to-indigo-700',
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop',
    children: [
      {
        id: CategoryId.CORPORATE_SERVICES,
        name: 'خدمات شرکتی',
        nameKey: 'category_corporate_services',
        subItems: [
          { id: CategoryId.CORPORATE_LOGO, name: 'لوگو', nameKey: 'item_logo' },
          { id: CategoryId.CORPORATE_CARD, name: 'کارت ویزیت', nameKey: 'item_card' },
          { id: CategoryId.CORPORATE_BROCHURE, name: 'بروشور', nameKey: 'item_brochure' }
        ]
      }
    ]
  }
];

export const FONT_OPTIONS = [
  { label: 'وزیرمتن (استاندارد)', value: 'Vazirmatn' },
  { label: 'لاله‌زار (ضخیم)', value: 'Lalezar' },
  { label: 'امیری (کلاسیک)', value: 'Amiri' },
  { label: 'ریم کوفی (مدرن)', value: 'Reem Kufi' },
  { label: 'دست‌نویس (Caveat)', value: 'Caveat' },
];

export const TEMPLATES: Template[] = [];


export const PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    id: 'p1',
    title: 'منوی رستوران آواز',
    titleKey: 'port_p1_title',
    category: 'print',
    description: 'طراحی مینیمال منو برای رستوران آواز با تم رنگی گرم.',
    descriptionKey: 'port_p1_desc',
    tags: ['منو', 'رستوران', 'طراحی'],
    img: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'p2',
    title: 'کارت ویزیت خلاقانه',
    titleKey: 'port_p2_title',
    category: 'branding',
    description: 'کارت ویزیت با طراحی مدرن و استفاده از فضای منفی.',
    descriptionKey: 'port_p2_desc',
    tags: ['کارت ویزیت', 'شرکتی', 'مدرن'],
    img: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'p3',
    title: 'ماگ تبلیغاتی آواز',
    titleKey: 'port_p3_title',
    category: 'merch',
    description: 'طراحی ماگ با لوگوی آواز و تم رنگی بنفش.',
    descriptionKey: 'port_p3_desc',
    tags: ['ماگ', 'هدیه', 'تبلیغات'],
    img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'p4',
    title: 'طراحی لوگو استودیو آواز',
    titleKey: 'port_p4_title',
    category: 'branding',
    description: 'لوگوی اختصاصی استودیو آواز با استفاده از المان‌های صوتی و بصری.',
    descriptionKey: 'port_p4_desc',
    tags: ['لوگو', 'برندینگ', 'خلاقیت'],
    img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop'
  }
];

