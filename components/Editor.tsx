import React, { useState, useRef, useEffect } from 'react';
import { Template, MenuData, MenuItem, MenuSection } from '../types';
import { FONT_OPTIONS } from '../constants';
import { ArrowRight, Plus, Trash2, Download, Printer, Wand2, RefreshCw, ChevronDown, ChevronUp, Image as ImageIcon, Palette, Type, X, Upload, ZoomIn, ZoomOut, Maximize, FileText, Menu, Eye, PenTool, Sparkles, ImagePlus } from 'lucide-react';
import { generateDescription, generateBusinessCardContent, generateBackgroundImage, suggestMenuItems, generateLogo, getLastAiErrorMessage } from '../services/geminiService';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useLanguage } from '../LanguageContext';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface EditorProps {
  template: Template;
  onBack: () => void;
  onOrder: (data: MenuData, orderType: 'retail' | 'wholesale') => void;
}

type PageSize = 'A4' | 'A3' | 'A5';

// Standard 96 DPI Pixel Dimensions for precise screen rendering
// This ensures the aspect ratio is exactly maintained regardless of screen resolution
const PAGE_PIXELS: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 794, height: 1123 }, // 210mm x 297mm
  A3: { width: 1123, height: 1587 }, // 297mm x 420mm
  A5: { width: 559, height: 794 },  // 148mm x 210mm
};

export const Editor: React.FC<EditorProps> = ({ template, onBack, onOrder }) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'fa' || language === 'ar';
  const user = auth.currentUser;
  const [data, setData] = useState<MenuData>(() => {
    const defaultData = template.defaultData || {};
    return {
      title: defaultData.title || '',
      subtitle: defaultData.subtitle || '',
      contact: defaultData.contact || '',
      sections: defaultData.sections || [],
      colors: defaultData.colors || { primary: '#000000', accent: '#000000', background: '#ffffff', text: '#000000' },
      fonts: defaultData.fonts || { title: 'Vazirmatn', body: 'Vazirmatn' },
      customText: defaultData.customText || '',
      logo: defaultData.logo,
      backgroundImage: defaultData.backgroundImage
    };
  });
  const [activeTab, setActiveTab] = useState<'content' | 'design'>('content');
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('preview');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isGeneratingHeader, setIsGeneratingHeader] = useState(false);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(data.sections?.[0]?.id || null);
  const [customFonts, setCustomFonts] = useState<{ label: string, value: string }[]>([]);
  
  // Layout State
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [zoom, setZoom] = useState<number>(0.5); 
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPromptModal, setShowPromptModal] = useState<{ type: 'background', title: string, placeholder: string } | null>(null);
  const [promptValue, setPromptValue] = useState('');  
  const printRef = useRef<HTMLDivElement>(null);

  // Auto-zoom on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const targetWidth = pageSize === 'A4' ? 794 : 800; // A4 width or square
        const targetHeight = pageSize === 'A4' ? 1123 : 800;
        
        const scaleX = (width - 40) / targetWidth;
        const scaleY = (height - 40) / targetHeight;
        const newZoom = Math.min(scaleX, scaleY, 1);
        setZoom(newZoom);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pageSize]);

  // --- Auto Generation Handlers ---
  const requireAiLogin = () => {
    if (auth.currentUser) return true;
    alert(t('editor_msg_login_required'));
    return false;
  };

  const handleAutoHeader = async () => {
    if (!requireAiLogin()) return;
    setIsGeneratingHeader(true);
    const result = await generateBusinessCardContent(data.title, data.subtitle || "");
    setData(prev => ({
      ...prev,
      subtitle: result.slogan,
      contact: result.description
    }));
    setIsGeneratingHeader(false);
  };

  const handleAutoBackground = async (theme: string) => {
    if (!requireAiLogin()) return;
    if (!theme) return;

    setIsGeneratingBg(true);
    try {
      const bg = await generateBackgroundImage(theme, pageSize === 'A4' ? '9:16' : '1:1');
      if (bg) {
        setData(prev => ({ ...prev, backgroundImage: bg }));
      } else {
        alert(getLastAiErrorMessage() || t('editor_msg_generation_error'));
      }
    } catch (error: any) {
      console.error("Gemini Image Generation Error:", error);
      alert(getLastAiErrorMessage() || t('editor_msg_generation_error'));
    } finally {
      setIsGeneratingBg(false);
      setShowPromptModal(null);
      setPromptValue('');
    }
  };

  const handleAutoLogo = async () => {
    if (!requireAiLogin()) return;
    if (!data.title) {
      alert(t('editor_msg_business_name_required'));
      return;
    }

    setIsGeneratingLogo(true);
    try {
      const logo = await generateLogo(data.title, template.categoryId);
      if (logo) {
        setData(prev => ({ ...prev, logo }));
      } else {
        alert(getLastAiErrorMessage() || t('editor_msg_generation_error'));
      }
    } catch (error: any) {
      console.error("Gemini Logo Generation Error:", error);
      alert(getLastAiErrorMessage() || t('editor_msg_generation_error'));
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const openBackgroundPrompt = () => {
    setShowPromptModal({
      type: 'background',
      title: t('editor_auto_background'),
      placeholder: t('editor_placeholder_bg_prompt')
    });
  };

  const handleAutoItems = async (sectionId: string) => {
    if (!requireAiLogin()) return;
    setIsGenerating(sectionId);
    const items = await suggestMenuItems(data.title);
    if (items.length) {
      setData(prev => ({
        ...prev,
        sections: (prev.sections || []).map(s => s.id === sectionId ? { ...s, items: [...s.items, ...items] } : s)
      }));
    } else {
      alert(getLastAiErrorMessage() || t('editor_msg_generation_error'));
    }
    setIsGenerating(null);
  };

  const catId = String(template.categoryId);
  const isMenu = catId.includes('menu');
  const isLogo = catId.includes('logo');
  const isCard = catId.includes('card');
  const isBrochure = catId.includes('brochure');

  const sectionLabel = isMenu ? t('editor_section_label_menu') : isCard ? t('editor_section_label_card') : isBrochure ? t('editor_section_label_brochure') : t('editor_section_label_general');
  const addSectionLabel = isMenu ? t('editor_add_section_label_menu') : t('editor_add_section_label_general');

  // Reset data when template changes
  useEffect(() => {
    const defaultData = template.defaultData || {};
    setData({
      title: defaultData.title || '',
      subtitle: defaultData.subtitle || '',
      contact: defaultData.contact || '',
      sections: defaultData.sections || [],
      colors: defaultData.colors || { primary: '#000000', accent: '#000000', background: '#ffffff', text: '#000000' },
      fonts: defaultData.fonts || { title: 'Vazirmatn', body: 'Vazirmatn' },
      customText: defaultData.customText || '',
      logo: defaultData.logo,
      backgroundImage: defaultData.backgroundImage
    });
    setExpandedSection(defaultData.sections?.[0]?.id || null);
    setZoom(0.5); 
    setPageSize('A4'); 
  }, [template]);

  // --- Handlers ---
  const handleHeaderChange = (field: keyof MenuData | 'customText', value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleColorChange = (key: keyof MenuData['colors'], value: string) => {
    setData(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value }
    }));
  };

  const handleFontChange = (key: keyof MenuData['fonts'], value: string) => {
    setData(prev => ({
      ...prev,
      fonts: { ...prev.fonts, [key]: value }
    }));
  };

  const handleBorderChange = (key: keyof NonNullable<MenuData['border']>, value: any) => {
    setData(prev => ({
      ...prev,
      border: { ...(prev.border || { type: 'none', width: 2, color: '#000000', radius: 0 }), [key]: value }
    }));
  };

  const handleImageUpload = (key: 'logo' | 'backgroundImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Str = reader.result as string;
        // Compress image
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
            setData(prev => ({ ...prev, [key]: canvas.toDataURL('image/jpeg', 0.6) }));
          } else {
            setData(prev => ({ ...prev, [key]: base64Str }));
          }
        };
        img.onerror = () => setData(prev => ({ ...prev, [key]: base64Str }));
        img.src = base64Str;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (key: 'logo' | 'backgroundImage') => {
    setData(prev => ({ ...prev, [key]: undefined }));
  };

  const handleCustomFontUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'title' | 'body') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const timestamp = Date.now();
    const fontName = `CustomFont_${timestamp}`;
    const label = `${file.name.split('.')[0]} (${t('editor_label_custom')})`;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
       const arrayBuffer = event.target?.result as ArrayBuffer;
       try {
         // @ts-ignore
         const fontFace = new FontFace(fontName, arrayBuffer);
         await fontFace.load();
         // @ts-ignore
         document.fonts.add(fontFace);
         
         setCustomFonts(prev => [...prev, { label, value: fontName }]);
         handleFontChange(target, fontName);
       } catch (err) {
         console.error('Font loading failed:', err);
         alert(t('editor_msg_generation_error'));
       }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- Items Handlers ---
  const addSection = () => {
    const newSection: MenuSection = {
      id: Date.now().toString(),
      title: addSectionLabel,
      items: []
    };
    setData(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
    setExpandedSection(newSection.id);
  };

  const removeSection = (id: string) => {
    setData(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== id) }));
  };

  const updateSectionTitle = (id: string, title: string) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, title } : s)
    }));
  };

  const addItem = (sectionId: string) => {
    const newItem: MenuItem = {
      id: Date.now().toString(),
      name: t('editor_label_new_item'),
      price: '0',
      description: t('editor_placeholder_item_desc')
    };
    setData(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s)
    }));
  };

  const updateItem = (sectionId: string, itemId: string, field: keyof MenuItem, value: string) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, items: s.items.map(item => item.id === itemId ? { ...item, [field]: value } : item) }
          : s
      )
    }));
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, items: s.items.filter(item => item.id !== itemId) }
          : s
      )
    }));
  };

  const handleAutoDescription = async (sectionId: string, itemId: string, name: string) => {
    if (!requireAiLogin()) return;
    setIsGenerating(itemId);
    const desc = await generateDescription(name, template.categoryId);
    updateItem(sectionId, itemId, 'description', desc);
    setIsGenerating(null);
  };

  // --- Export Logic ---
  const handleDownload = async () => {
    if (!printRef.current) return;
    
    try {
      // @ts-ignore
      const canvas = await window.html2canvas(printRef.current, {
        scale: 2.5, // High resolution for crisp text
        useCORS: true,
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('printable-area');
          if (el) {
            // Reset transform to capture full size without scaling artifacts
            el.style.transform = 'none';
            el.style.margin = '0';
            el.style.boxShadow = 'none';
            el.style.position = 'relative';
            el.style.left = '0';
            el.style.top = '0';
          }
        }
      });
      const link = document.createElement('a');
      link.download = `awaz-menu-${pageSize}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed', err);
      alert(t('editor_msg_generation_error'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToPortfolio = async () => {
    if (!user) {
      alert(t('editor_msg_login_required'));
      return;
    }
    setIsSaving(true);
    try {
      const designId = `design-${Date.now()}`;
      
      // Sanitize data to remove undefined values which Firestore doesn't support
      const sanitizedData = JSON.parse(JSON.stringify(data));
      
      const name = (data.title || t('editor_label_untitled')).substring(0, 99);
      const description = (data.subtitle || template.description || t('editor_label_no_description')).substring(0, 999);
      
      const payload = {
        id: designId,
        categoryId: template.categoryId || 'general',
        name,
        description,
        thumbnail: data.backgroundImage || template.thumbnail || 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=500&auto=format&fit=crop',
        thumbnailColor: (template.thumbnailColor || '#000000').substring(0, 99),
        layoutType: ['classic', 'modern', 'colorful', 'minimal', 'typographic', 'elegant'].includes(template.layoutType || '') ? template.layoutType : 'classic',
        defaultData: sanitizedData,
        createdAt: serverTimestamp(),
        authorUid: user.uid
      };

      console.log("Saving design payload:", JSON.stringify(payload, null, 2));
      await setDoc(doc(db, 'designs', designId), payload);
      alert(t('editor_msg_save_success'));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'designs');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDERERS
  // ---------------------------------------------------------------------------

  const renderClassicPreview = () => (
    <div className="w-full h-full relative flex flex-col p-12 overflow-hidden"
      style={{ 
        backgroundColor: data.colors.background, 
        color: data.colors.text, 
        fontFamily: data.fonts.body,
        borderStyle: data.border?.type !== 'none' ? data.border?.type : 'double',
        borderWidth: data.border?.type !== 'none' ? `${data.border?.width}px` : '16px',
        borderColor: data.border?.type !== 'none' ? data.border?.color : data.colors.accent,
        borderRadius: `${data.border?.radius || 0}px`
      }}>
      {data.backgroundImage && (
        <div className="absolute inset-0 z-0 opacity-30" style={{ backgroundImage: `url(${data.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
      )}
      <div className="absolute top-4 right-4 w-24 h-24 border-t-4 border-r-4 rounded-tr-3xl opacity-50 z-10" style={{ borderColor: data.colors.accent }}></div>
      <div className="absolute top-4 left-4 w-24 h-24 border-t-4 border-l-4 rounded-tl-3xl opacity-50 z-10" style={{ borderColor: data.colors.accent }}></div>
      <div className="absolute bottom-4 right-4 w-24 h-24 border-b-4 border-r-4 rounded-br-3xl opacity-50 z-10" style={{ borderColor: data.colors.accent }}></div>
      <div className="absolute bottom-4 left-4 w-24 h-24 border-b-4 border-l-4 rounded-bl-3xl opacity-50 z-10" style={{ borderColor: data.colors.accent }}></div>

      <div className="text-center mb-12 z-10 relative">
        {data.logo && <img src={data.logo} alt="Logo" className="w-28 h-28 object-cover rounded-full mx-auto mb-4 border-4 shadow-lg" style={{ borderColor: data.colors.accent }} />}
        <h1 className="text-5xl font-black mb-3" style={{ color: data.colors.primary, fontFamily: data.fonts.title }}>{data.title}</h1>
        <div className="flex items-center justify-center gap-4">
           <span className="h-[2px] w-16 bg-current opacity-50"></span>
           <p className="text-2xl italic font-medium opacity-80" style={{ fontFamily: data.fonts.title }}>{data.subtitle}</p>
           <span className="h-[2px] w-16 bg-current opacity-50"></span>
        </div>
      </div>

      <div className="flex-1 columns-1 md:columns-2 gap-12 space-y-12 z-10 relative">
        {(data.sections || []).map((section) => (
          <div key={section.id} className="break-inside-avoid mb-8">
            <h3 className="font-bold text-3xl border-b-2 pb-2 mb-4 flex items-center justify-between" style={{ borderColor: data.colors.accent, color: data.colors.primary, fontFamily: data.fonts.title }}>{section.title}</h3>
            <div className="space-y-5">
              {(section.items || []).map((item) => (
                <div key={item.id}>
                  <div className="flex justify-between items-baseline border-b border-dashed border-current/20 pb-1">
                    <span className="font-bold text-xl">{item.name}</span>
                    <span className="font-bold text-xl" style={{ color: data.colors.primary }}>{item.price}</span>
                  </div>
                  <p className="text-base mt-1 opacity-70 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {data.customText && (
          <div className="break-inside-avoid mb-8 pt-4 border-t-2 border-current/10">
            <p className="text-lg leading-relaxed opacity-80 whitespace-pre-line">{data.customText}</p>
          </div>
        )}
      </div>
      <div className="mt-auto text-center pt-6 text-lg font-bold border-t-2 opacity-80 z-10 relative" style={{ borderColor: data.colors.accent }}>{data.contact}</div>
    </div>
  );

  const renderModernPreview = () => (
    <div className="w-full h-full relative flex flex-col p-12 overflow-hidden" 
      style={{ 
        backgroundColor: data.colors.background, 
        color: data.colors.text, 
        fontFamily: data.fonts.body,
        borderStyle: data.border?.type || 'none',
        borderWidth: `${data.border?.width || 0}px`,
        borderColor: data.border?.color || 'transparent',
        borderRadius: `${data.border?.radius || 0}px`
      }}>
      {data.backgroundImage && (
        <div className="absolute inset-0 opacity-20 z-0" style={{ backgroundImage: `url(${data.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
      )}
      <div className="relative z-10 flex items-end justify-between border-b-4 pb-8 mb-12" style={{ borderColor: data.colors.accent }}>
        <div>
          <h1 className="text-6xl font-bold tracking-wide mb-3" style={{ fontFamily: data.fonts.title }}>{data.title}</h1>
          <p className="text-3xl opacity-90" style={{ color: data.colors.primary, fontFamily: data.fonts.title }}>{data.subtitle}</p>
        </div>
        {data.logo && <img src={data.logo} className="w-32 h-32 object-contain drop-shadow-xl" alt="Logo"/>}
      </div>
      <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 content-start">
        {(data.sections || []).map((section) => (
          <div key={section.id}>
            <h3 className="text-3xl font-bold mb-6 uppercase tracking-widest" style={{ color: data.colors.primary, fontFamily: data.fonts.title }}>// {section.title}</h3>
            <div className="space-y-6">
              {(section.items || []).map((item) => (
                <div key={item.id} className="group">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-medium text-xl">{item.name}</h4>
                    <div className="flex-1 mx-3 border-b border-dotted opacity-30 relative -top-2"></div>
                    <span className="font-mono text-xl font-bold" style={{ color: data.colors.accent }}>{item.price}</span>
                  </div>
                  <p className="text-base opacity-60 font-light">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {data.customText && (
          <div className="col-span-full mt-4 p-6 bg-current/5 rounded-lg">
            <p className="text-xl leading-relaxed opacity-80 whitespace-pre-line">{data.customText}</p>
          </div>
        )}
      </div>
      <div className="relative z-10 mt-auto text-center pt-8">
         <span className="inline-block px-8 py-2 border-2 rounded-full text-sm uppercase tracking-widest opacity-70 font-bold" style={{ borderColor: data.colors.text }}>{data.contact}</span>
      </div>
    </div>
  );

  const renderColorfulPreview = () => (
    <div className="w-full h-full p-8 relative flex flex-col" 
      style={{ 
        background: data.backgroundImage ? `url(${data.backgroundImage}) center/cover` : `linear-gradient(135deg, ${data.colors.primary} 0%, ${data.colors.accent} 100%)`, 
        fontFamily: data.fonts.body,
        borderStyle: data.border?.type || 'none',
        borderWidth: `${data.border?.width || 0}px`,
        borderColor: data.border?.color || 'transparent',
        borderRadius: `${data.border?.radius || 0}px`
      }}>
      {data.backgroundImage && <div className="absolute inset-0 bg-black/30 z-0"></div>}
      <div className="flex-1 bg-white rounded-[3rem] border-8 border-white shadow-2xl p-10 flex flex-col overflow-hidden relative z-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-300 rounded-bl-full -mr-16 -mt-16 opacity-50 z-0"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-300 rounded-tr-full -ml-12 -mb-12 opacity-50 z-0"></div>
        <div className="relative z-10 text-center mb-12 transform -rotate-1">
          {data.logo && <img src={data.logo} className="w-32 h-32 mx-auto mb-4 object-contain" alt="logo"/>}
          <h1 className="text-8xl leading-none drop-shadow-lg" style={{ color: data.colors.primary, fontFamily: data.fonts.title }}>{data.title}</h1>
          <div className="inline-block bg-black text-white px-6 py-2 text-2xl mt-2 transform rotate-2" style={{ fontFamily: data.fonts.title }}>{data.subtitle}</div>
        </div>
        <div className="relative z-10 flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
          {(data.sections || []).map(section => (
            <div key={section.id} className="bg-slate-50 p-6 rounded-3xl border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]">
              <h3 className="text-4xl text-black mb-5 border-b-4 border-black pb-2 inline-block" style={{ fontFamily: data.fonts.title }}>{section.title}</h3>
              <div className="space-y-4">
                {(section.items || []).map(item => (
                  <div key={item.id} className="flex justify-between items-center group">
                    <div className="flex-1">
                      <h4 className="text-2xl leading-tight text-slate-800 font-bold">{item.name}</h4>
                      <p className="text-base font-bold text-slate-400">{item.description}</p>
                    </div>
                    <div className="bg-red-500 text-white px-4 py-2 rounded-xl text-xl font-black shadow-md transform group-hover:scale-110 transition-transform">
                      {item.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {data.customText && (
            <div className="bg-yellow-100 p-6 rounded-3xl border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]">
              <p className="text-2xl font-bold text-black whitespace-pre-line">{data.customText}</p>
            </div>
          )}
        </div>
        <div className="relative z-10 mt-8 text-center text-slate-400 font-sans text-lg font-black">{data.contact}</div>
      </div>
    </div>
  );

  const renderMinimalPreview = () => (
    <div className="w-full h-full flex flex-col p-16 relative overflow-hidden" 
      style={{ 
        backgroundColor: data.colors.background, 
        color: data.colors.text, 
        fontFamily: data.fonts.body,
        borderStyle: data.border?.type || 'none',
        borderWidth: `${data.border?.width || 0}px`,
        borderColor: data.border?.color || 'transparent',
        borderRadius: `${data.border?.radius || 0}px`
      }}>
      {data.backgroundImage && (
        <div className="absolute inset-0 opacity-10 z-0" style={{ backgroundImage: `url(${data.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
      )}
       <div className="text-center mb-20 relative z-10">
         {data.logo && <img src={data.logo} className="w-24 h-24 mx-auto mb-6 object-contain" alt="logo"/>}
         <div className="w-16 h-1.5 mx-auto mb-8" style={{ backgroundColor: data.colors.primary }}></div>
         <h1 className="text-5xl font-bold mb-3 tracking-wide" style={{ fontFamily: data.fonts.title }}>{data.title}</h1>
         <p className="text-sm font-bold uppercase tracking-[0.3em] opacity-50">{data.subtitle}</p>
       </div>
       <div className="flex-1 grid grid-cols-1 gap-16 content-start relative z-10">
         {(data.sections || []).map(section => (
           <div key={section.id}>
              <h3 className="text-lg font-bold uppercase tracking-widest mb-8 opacity-40 flex items-center gap-3" style={{ fontFamily: data.fonts.title }}>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.colors.accent }}></span>
                {section.title}
              </h3>
              <div className="space-y-8">
                {(section.items || []).map(item => (
                  <div key={item.id} className="flex justify-between items-start group hover:bg-gray-50/50 p-3 rounded transition-colors -mx-3">
                    <div>
                      <h4 className="font-bold text-2xl group-hover:text-opacity-80 transition-colors" style={{ color: data.colors.primary }}>{item.name}</h4>
                      <p className="text-base opacity-50 mt-1 max-w-[80%]">{item.description}</p>
                    </div>
                    <span className="font-bold text-2xl">{item.price}</span>
                  </div>
                ))}
              </div>
           </div>
         ))}
       </div>
       <div className="mt-auto pt-12 border-t border-gray-100 text-center text-sm opacity-40 relative z-10">{data.contact}</div>
    </div>
  );

  const renderTypographicPreview = () => (
    <div className="w-full h-full flex flex-col p-12 relative overflow-hidden" 
      style={{ 
        backgroundColor: data.colors.background, 
        color: data.colors.text, 
        fontFamily: data.fonts.body,
        borderStyle: data.border?.type || 'none',
        borderWidth: `${data.border?.width || 0}px`,
        borderColor: data.border?.color || 'transparent',
        borderRadius: `${data.border?.radius || 0}px`
      }}>
      {data.backgroundImage && (
        <div className="absolute inset-0 opacity-15 z-0" style={{ backgroundImage: `url(${data.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
      )}
      <div className="border-b-8 pb-10 mb-12 flex justify-between items-end relative z-10" style={{ borderColor: data.colors.primary }}>
         <div>
           <h1 className="text-9xl font-black leading-none uppercase" style={{ color: data.colors.primary, fontFamily: data.fonts.title }}>{data.title}</h1>
           <p className="text-3xl font-bold mt-4 uppercase tracking-widest bg-black text-white inline-block px-4 py-1" style={{ fontFamily: data.fonts.title }}>{data.subtitle}</p>
         </div>
         {data.logo && <img src={data.logo} className="w-32 h-32 object-contain mb-4" alt="logo"/>}
      </div>
      <div className="flex-1 columns-1 md:columns-2 gap-16 space-y-16 relative z-10">
        {(data.sections || []).map((section, idx) => (
          <div key={section.id} className="break-inside-avoid">
            <h3 className="text-6xl font-black mb-8 opacity-20" style={{ fontFamily: data.fonts.title }}>{idx + 1}. {section.title}</h3>
            <div className="space-y-10">
              {(section.items || []).map((item) => (
                <div key={item.id} className="relative pl-6 border-l-8" style={{ borderColor: data.colors.accent }}>
                  <div className="flex justify-between items-baseline">
                     <h4 className="text-4xl font-black leading-none" style={{ fontFamily: data.fonts.title }}>{item.name}</h4>
                     <span className="text-2xl font-bold">{item.price}</span>
                  </div>
                  <p className="text-lg font-bold uppercase opacity-50 mt-2">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto bg-black text-white p-6 text-center font-bold text-3xl uppercase tracking-widest relative z-10" style={{ fontFamily: data.fonts.title }}>{data.contact}</div>
    </div>
  );

  const renderElegantPreview = () => (
    <div className="w-full h-full flex flex-col p-16 relative overflow-hidden border-[1px] border-opacity-20" 
      style={{ 
        backgroundColor: data.colors.background, 
        color: data.colors.text, 
        fontFamily: data.fonts.body, 
        borderColor: data.border?.type !== 'none' ? data.border?.color : data.colors.primary,
        borderStyle: data.border?.type !== 'none' ? data.border?.type : 'solid',
        borderWidth: data.border?.type !== 'none' ? `${data.border?.width}px` : '1px',
        borderRadius: `${data.border?.radius || 0}px`
      }}>
       {data.backgroundImage && (
        <div className="absolute inset-0 opacity-10 z-0" style={{ backgroundImage: `url(${data.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
      )}
      <div className="absolute inset-4 border-2 border-opacity-40 pointer-events-none z-10" style={{ borderColor: data.colors.accent }}></div>
      <div className="absolute inset-6 border border-opacity-40 pointer-events-none z-10" style={{ borderColor: data.colors.accent }}></div>

      <div className="text-center mb-20 relative z-20">
        {data.logo && <img src={data.logo} className="w-28 h-28 mx-auto mb-6 object-contain" alt="logo"/>}
        <h1 className="text-6xl font-thin tracking-wider italic mb-4" style={{ fontFamily: data.fonts.title, color: data.colors.primary }}>{data.title}</h1>
        <p className="text-lg uppercase tracking-[0.2em] text-opacity-60" style={{ color: data.colors.text }}>{data.subtitle}</p>
      </div>

      <div className="flex-1 relative z-20 grid grid-cols-1 md:grid-cols-2 gap-20">
        {(data.sections || []).map((section) => (
          <div key={section.id}>
            <h3 className="text-2xl text-center border-b border-opacity-20 pb-4 mb-8 italic font-bold" style={{ borderColor: data.colors.primary, fontFamily: data.fonts.title }}>{section.title}</h3>
            <div className="space-y-8">
              {(section.items || []).map((item) => (
                <div key={item.id} className="flex justify-between items-end">
                  <div className="flex-1">
                     <h4 className="font-bold text-2xl" style={{ color: data.colors.primary }}>{item.name}</h4>
                     <p className="text-sm opacity-60 italic mt-1 max-w-[90%]">{item.description}</p>
                  </div>
                  <div className="mb-1 text-xl font-serif">{item.price}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-12 text-center relative z-20">
        <p className="text-sm tracking-widest opacity-50 uppercase">{data.contact}</p>
      </div>
    </div>
  );

  const renderCardPreview = () => (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <div 
        className="w-full h-full relative overflow-hidden flex flex-col p-12 transition-all duration-500"
        style={{ 
          backgroundColor: data.colors.background, 
          color: data.colors.text, 
          fontFamily: data.fonts.body,
          borderStyle: data.border?.type || 'none',
          borderWidth: `${data.border?.width || 0}px`,
          borderColor: data.border?.color || 'transparent',
          borderRadius: `${data.border?.radius || 0}px`
        }}
      >
        {data.backgroundImage && (
          <div className="absolute inset-0 opacity-20 z-0" style={{ backgroundImage: `url(${data.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
        )}
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-5xl font-black mb-2" style={{ color: data.colors.primary, fontFamily: data.fonts.title }}>{data.title}</h1>
              <p className="text-2xl opacity-80 font-medium italic" style={{ fontFamily: data.fonts.title }}>{data.subtitle}</p>
            </div>
            {data.logo && <img src={data.logo} alt="Logo" className="w-24 h-24 object-contain" />}
          </div>
          
          {data.customText && (
            <div className="my-4">
              <p className="text-lg opacity-60 whitespace-pre-line">{data.customText}</p>
            </div>
          )}

          <div className="mt-auto pt-6 border-t border-current/10">
            <p className="text-xl whitespace-pre-line leading-relaxed opacity-70 font-bold">{data.contact}</p>
          </div>
        </div>
        
        {/* Decorative elements for card */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-tr from-white/10 to-transparent rounded-tr-full pointer-events-none"></div>
      </div>
    </div>
  );

  const renderLogoPreview = () => (
    <div className="w-full h-full flex items-center justify-center p-12" 
      style={{ 
        backgroundColor: data.colors.background,
        borderStyle: data.border?.type || 'none',
        borderWidth: `${data.border?.width || 0}px`,
        borderColor: data.border?.color || 'transparent',
        borderRadius: `${data.border?.radius || 0}px`
      }}>
      <div className="text-center p-12 rounded-full border-[16px] border-double flex flex-col items-center justify-center aspect-square w-full h-full max-w-[700px] max-h-[700px]" style={{ borderColor: data.colors.accent }}>
        {data.logo ? (
          <img src={data.logo} alt="Logo" className="w-64 h-64 object-contain mb-6" />
        ) : (
          <div className="w-64 h-64 rounded-full bg-current/5 flex items-center justify-center mb-6">
             <span className="text-8xl font-black" style={{ color: data.colors.primary }}>{data.title.charAt(0)}</span>
          </div>
        )}
        <h1 className="text-6xl font-black uppercase tracking-widest" style={{ color: data.colors.primary, fontFamily: data.fonts.title }}>{data.title}</h1>
        <p className="text-2xl mt-4 opacity-60 font-bold" style={{ color: data.colors.text }}>{data.subtitle}</p>
      </div>
    </div>
  );

  const renderBrochurePreview = () => (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: data.colors.background, color: data.colors.text, fontFamily: data.fonts.body }}>
      <div className="flex h-full">
        {/* Three-fold brochure simulation */}
        {[1, 2, 3].map((panel) => (
          <div key={panel} className={`flex-1 p-8 border-r last:border-r-0 border-current/10 relative overflow-hidden flex flex-col ${panel === 2 ? 'bg-current/5' : ''}`}>
            {data.backgroundImage && (
              <div className="absolute inset-0 opacity-10 z-0" style={{ backgroundImage: `url(${data.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            )}
            
            <div className="relative z-10 h-full flex flex-col">
              {panel === 1 && (
                <>
                  <h2 className="text-2xl font-black mb-4" style={{ color: data.colors.primary }}>{t('editor_brochure_about_us')}</h2>
                  <p className="text-sm leading-relaxed opacity-70">{data.subtitle}</p>
                  <div className="mt-auto">
                    <h3 className="font-bold mb-2">{t('editor_brochure_contact_us')}</h3>
                    <p className="text-xs opacity-60">{data.contact}</p>
                  </div>
                </>
              )}
              
              {panel === 2 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  {data.logo && <img src={data.logo} alt="Logo" className="w-24 h-24 mb-6 object-contain" />}
                  <h1 className="text-4xl font-black mb-2" style={{ color: data.colors.primary, fontFamily: data.fonts.title }}>{data.title}</h1>
                  <div className="w-12 h-1 bg-current opacity-30 my-4"></div>
                  <p className="text-lg italic opacity-80">{data.subtitle}</p>
                </div>
              )}
              
              {panel === 3 && (
                <>
                  <h2 className="text-2xl font-black mb-4" style={{ color: data.colors.primary }}>{t('editor_brochure_services')}</h2>
                  <div className="space-y-4">
                    {(data.sections?.[0]?.items || []).slice(0, 4).map(item => (
                      <div key={item.id}>
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <p className="text-[10px] opacity-60">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPreview = () => {
    if (isCard) return renderCardPreview();
    if (isLogo) return renderLogoPreview();
    if (isBrochure) return renderBrochurePreview();

    switch (template.layoutType) {
      case 'classic': return renderClassicPreview();
      case 'modern': return renderModernPreview();
      case 'colorful': return renderColorfulPreview();
      case 'minimal': return renderMinimalPreview();
      case 'typographic': return renderTypographicPreview();
      case 'elegant': return renderElegantPreview();
      default: return renderClassicPreview();
    }
  };

  let dims = PAGE_PIXELS[pageSize];
  if (isCard) {
    dims = { width: 800, height: 480 }; // Standard business card ratio
  } else if (isLogo) {
    dims = { width: 800, height: 800 }; // Square for logo
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row bg-slate-100 overflow-hidden relative" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Mobile View Toggle */}
      <div className="md:hidden flex items-center bg-white border-b border-slate-200 p-2 z-50 gap-2">
        <button 
          onClick={onBack}
          className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
          title={t('editor_back')}
        >
          <ArrowRight size={20} />
        </button>
        <div className="flex-1 flex bg-slate-100 rounded-xl p-1">
          <button 
            onClick={() => setMobileView('preview')}
            className={`flex-1 py-2.5 rounded-lg font-black text-xs flex items-center justify-center gap-2 transition-all ${mobileView === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Eye size={16} />
            {t('editor_mobile_preview')}
          </button>
          <button 
            onClick={() => setMobileView('edit')}
            className={`flex-1 py-2.5 rounded-lg font-black text-xs flex items-center justify-center gap-2 transition-all ${mobileView === 'edit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            <PenTool size={16} />
            {t('editor_mobile_edit')}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        w-full md:w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20 h-full
        ${mobileView === 'edit' ? 'flex' : 'hidden md:flex'}
      `}>
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-bold transition-colors">
            <ArrowRight size={16} />
            {t('editor_back')}
          </button>
          <div className="flex bg-slate-200 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('content')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'content' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Type size={14} className="inline mr-1" />
              {t('editor_tab_content')}
            </button>
            <button 
              onClick={() => setActiveTab('design')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'design' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Palette size={14} className="inline mr-1" />
              {t('editor_tab_design')}
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'content' && (
            <div className="space-y-8 animate-in slide-in-from-left-2 duration-300">
              {/* Auto Tools Quick Access */}
              <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl p-3 border border-violet-100 shadow-sm mb-4">
                <h3 className="text-[10px] font-black text-violet-800 mb-2 flex items-center gap-2 uppercase tracking-wider">
                  <Sparkles size={12} />
                  {t('editor_auto_background')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleAutoHeader}
                    disabled={isGeneratingHeader}
                    className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-violet-200 hover:border-violet-400 hover:shadow-sm transition-all group text-right"
                  >
                    <div className="p-1 bg-violet-100 rounded-md group-hover:bg-violet-600 group-hover:text-white transition-colors">
                      {isGeneratingHeader ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    </div>
                    <span className="text-[9px] font-bold text-slate-700">{t('editor_generate')}</span>
                  </button>
                  <button 
                    onClick={openBackgroundPrompt}
                    disabled={isGeneratingBg}
                    className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-violet-200 hover:border-violet-400 hover:shadow-sm transition-all group text-right"
                  >
                    <div className="p-1 bg-fuchsia-100 rounded-md group-hover:bg-fuchsia-600 group-hover:text-white transition-colors">
                      {isGeneratingBg ? <RefreshCw size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                    </div>
                    <span className="text-[9px] font-bold text-slate-700">{t('editor_auto_background')}</span>
                  </button>
                </div>
              </div>

              <section className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-sm font-black text-slate-800">{t('editor_section_label_general')}</h3>
                  <button 
                    onClick={handleAutoHeader} 
                    disabled={isGeneratingHeader}
                    className="text-violet-600 hover:bg-violet-50 p-1 rounded text-xs flex items-center gap-1 font-bold"
                  >
                    {isGeneratingHeader ? <RefreshCw size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                    {t('editor_generate')}
                  </button>
                </div>
                <div className="space-y-3">
                  <input type="text" value={data.title} onChange={(e) => handleHeaderChange('title', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder={isCard ? t('editor_placeholder_business_name') : isLogo ? t('editor_placeholder_business_name') : t('editor_placeholder_business_name')}/>
                  <input type="text" value={data.subtitle} onChange={(e) => handleHeaderChange('subtitle', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder={isCard ? t('editor_placeholder_subtitle') : isLogo ? t('editor_placeholder_subtitle') : t('editor_placeholder_subtitle')}/>
                  <input type="text" value={data.contact} onChange={(e) => handleHeaderChange('contact', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder={isCard ? t('editor_placeholder_contact') : t('editor_placeholder_contact')}/>
                  <textarea value={data.customText} onChange={(e) => handleHeaderChange('customText', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={3} placeholder={t('editor_placeholder_item_desc')}/>
                </div>
              </section>

              {!isLogo && !isCard && (
                <section className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-sm font-black text-slate-800">{sectionLabel}</h3>
                    <button onClick={addSection} className="text-blue-600 hover:bg-blue-50 p-1 rounded text-xs flex items-center gap-1 font-bold">
                      <Plus size={14}/> {addSectionLabel}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(data.sections || []).map((section) => (
                      <div key={section.id} className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                        <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}>
                          <input type="text" value={section.title} onChange={(e) => updateSectionTitle(section.id, e.target.value)} onClick={(e) => e.stopPropagation()} className="bg-transparent font-bold text-sm text-slate-700 border-b border-transparent focus:border-blue-400 outline-none w-2/3"/>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAutoItems(section.id); }} 
                              disabled={isGenerating === section.id}
                              className="text-violet-500 hover:text-violet-700 p-1"
                              title={t('editor_tooltip_auto_items')}
                            >
                              {isGenerating === section.id ? <RefreshCw size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                            {expandedSection === section.id ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                          </div>
                        </div>
                        {expandedSection === section.id && (
                          <div className="p-3 bg-white border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            {(section.items || []).map((item) => (
                              <div key={item.id} className="relative group border-b border-slate-100 pb-4 last:border-0">
                                <div className="flex justify-between gap-2 mb-2">
                                  <input type="text" value={item.name} onChange={(e) => updateItem(section.id, item.id, 'name', e.target.value)} className="flex-1 font-bold text-sm border border-slate-200 rounded p-1.5" placeholder={t('editor_placeholder_item_name')}/>
                                  <input type="text" value={item.price} onChange={(e) => updateItem(section.id, item.id, 'price', e.target.value)} className="w-24 font-mono text-sm border border-slate-200 rounded p-1.5 text-left dir-ltr" placeholder={t('editor_placeholder_item_price')}/>
                                </div>
                                <div className="relative">
                                  <textarea rows={2} value={item.description} onChange={(e) => updateItem(section.id, item.id, 'description', e.target.value)} className="w-full text-xs border border-slate-200 rounded p-2 resize-none" placeholder={t('editor_placeholder_item_desc')}/>
                                  <button onClick={() => handleAutoDescription(section.id, item.id, item.name)} disabled={isGenerating === item.id} className="absolute bottom-2 left-2 text-blue-500 hover:text-blue-700 p-1 rounded bg-blue-50" title={t('editor_generate')}>
                                    {isGenerating === item.id ? <RefreshCw size={12} className="animate-spin"/> : <Sparkles size={12} />}
                                  </button>
                                </div>
                                <button onClick={() => removeItem(section.id, item.id)} className="absolute -right-2 -top-2 bg-white border text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:text-red-600"><Trash2 size={12}/></button>
                              </div>
                            ))}
                            <button onClick={() => addItem(section.id)} className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 hover:text-blue-600 hover:border-blue-400 flex items-center justify-center gap-1"><Plus size={14}/> {t('editor_button_add_item')}</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'design' && (
            <div className="space-y-8">
              <section>
                 <h3 className="text-sm font-black text-slate-800 border-b pb-2 mb-4">{t('editor_label_page_size')}</h3>
                 <div className="space-y-4">
                    <div>
                       <label className="block text-xs text-slate-500 mb-1">{t('editor_label_page_size')}</label>
                       <select value={pageSize} onChange={(e) => setPageSize(e.target.value as PageSize)} className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                         <option value="A4">A4 ({t('editor_label_standard')})</option>
                         <option value="A3">A3 ({t('editor_label_large')})</option>
                         <option value="A5">A5 ({t('editor_label_small')})</option>
                       </select>
                    </div>
                 </div>
              </section>

              <section>
                 <h3 className="text-sm font-black text-slate-800 border-b pb-2 mb-4">{t('editor_label_typography')}</h3>
                 <div className="space-y-4">
                    <div>
                       <label className="block text-xs text-slate-500 mb-1">{t('editor_label_font_title')}</label>
                       <select value={data.fonts.title} onChange={(e) => handleFontChange('title', e.target.value)} className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-white">
                         <optgroup label={t('editor_label_standard')}>
                           {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                         </optgroup>
                         {customFonts.length > 0 && (
                           <optgroup label={t('editor_label_custom_fonts')}>
                             {customFonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                           </optgroup>
                         )}
                       </select>
                       <div className="mt-2">
                          <label className="flex items-center gap-2 text-xs text-blue-600 cursor-pointer hover:text-blue-700"><Upload size={12}/> {t('editor_label_upload_font')} (Title)<input type="file" accept=".ttf,.woff,.woff2" className="hidden" onChange={(e) => handleCustomFontUpload(e, 'title')} /></label>
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs text-slate-500 mb-1">{t('editor_label_font_body')}</label>
                       <select value={data.fonts.body} onChange={(e) => handleFontChange('body', e.target.value)} className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-white">
                         <optgroup label={t('editor_label_standard')}>
                           {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                         </optgroup>
                         {customFonts.length > 0 && (
                           <optgroup label={t('editor_label_custom_fonts')}>
                             {customFonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                           </optgroup>
                         )}
                       </select>
                       <div className="mt-2">
                          <label className="flex items-center gap-2 text-xs text-blue-600 cursor-pointer hover:text-blue-700"><Upload size={12}/> {t('editor_label_upload_font')} (Body)<input type="file" accept=".ttf,.woff,.woff2" className="hidden" onChange={(e) => handleCustomFontUpload(e, 'body')} /></label>
                       </div>
                    </div>
                 </div>
              </section>

               <section>
                  <h3 className="text-sm font-black text-slate-800 border-b pb-2 mb-4">{t('editor_label_colors_images')}</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500">{t('editor_label_primary_color')}</label>
                            <div className="flex items-center gap-2"><input type="color" value={data.colors.primary} onChange={(e) => handleColorChange('primary', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0"/><span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{data.colors.primary}</span></div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500">{t('editor_label_background_color')}</label>
                            <div className="flex items-center gap-2"><input type="color" value={data.colors.background} onChange={(e) => handleColorChange('background', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0"/><span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{data.colors.background}</span></div>
                        </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs text-slate-500">{t('editor_label_logo')}</label>
                        <button 
                          onClick={handleAutoLogo}
                          disabled={isGeneratingLogo}
                          className="text-violet-600 hover:bg-violet-50 p-1 rounded text-[10px] flex items-center gap-1 font-bold border border-violet-100"
                        >
                          {isGeneratingLogo ? <RefreshCw size={10} className="animate-spin"/> : <Sparkles size={10}/>}
                          {t('editor_button_auto_logo')}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                         {data.logo ? (
                           <div className="w-12 h-12 rounded-lg border border-slate-200 p-1 bg-white relative group">
                             <img src={data.logo} className="w-full h-full object-contain" alt="logo preview"/>
                             <button onClick={() => removeImage('logo')} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity" title={t('editor_button_remove')}><X size={16} /></button>
                           </div>
                         ) : (
                           <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400"><ImageIcon size={20} /></div>
                         )}
                         <input type="file" accept="image/*" className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => handleImageUpload('logo', e)} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs text-slate-500">{t('editor_label_background_image')}</label>
                        <button 
                          onClick={openBackgroundPrompt}
                          disabled={isGeneratingBg}
                          className="text-violet-600 hover:bg-violet-50 p-1 rounded text-[10px] flex items-center gap-1 font-bold border border-violet-100"
                        >
                          {isGeneratingBg ? <RefreshCw size={10} className="animate-spin"/> : <Sparkles size={10}/>}
                          {t('editor_button_auto_bg')}
                        </button>
                      </div>
                       <div className="flex items-center gap-3">
                         {data.backgroundImage ? (
                           <div className="w-16 h-12 rounded-lg border border-slate-200 overflow-hidden relative group">
                             <img src={data.backgroundImage} className="w-full h-full object-cover" alt="bg preview"/>
                             <button onClick={() => removeImage('backgroundImage')} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity" title={t('editor_button_remove')}><X size={16} /></button>
                           </div>
                         ) : (
                           <div className="w-16 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400"><ImageIcon size={20} /></div>
                         )}
                         <input type="file" accept="image/*" className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => handleImageUpload('backgroundImage', e)} />
                      </div>
                    </div>
                  </div>
               </section>

               <section>
                  <h3 className="text-sm font-black text-slate-800 border-b pb-2 mb-4">{t('editor_label_border')}</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">{t('editor_label_border_type')}</label>
                        <select 
                          value={data.border?.type || 'none'} 
                          onChange={(e) => handleBorderChange('type', e.target.value)} 
                          className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="none">{t('editor_option_border_none')}</option>
                          <option value="solid">{t('editor_option_border_solid')}</option>
                          <option value="double">{t('editor_option_border_double')}</option>
                          <option value="dashed">{t('editor_option_border_dashed')}</option>
                          <option value="dotted">{t('editor_option_border_dotted')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">{t('editor_label_border_width')}</label>
                        <input 
                          type="range" 
                          min="0" 
                          max="20" 
                          value={data.border?.width || 0} 
                          onChange={(e) => handleBorderChange('width', parseInt(e.target.value))} 
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">{t('editor_label_border_color')}</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={data.border?.color || '#000000'} 
                            onChange={(e) => handleBorderChange('color', e.target.value)} 
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                          />
                          <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{data.border?.color || '#000000'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">{t('editor_label_border_radius')}</label>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={data.border?.radius || 0} 
                          onChange={(e) => handleBorderChange('radius', parseInt(e.target.value))} 
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  </div>
               </section>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
          <button onClick={handleDownload} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-slate-200 transition-all">
            <Download size={18} />
            {t('editor_button_download_png')}
          </button>
          <button onClick={handleSaveToPortfolio} disabled={isSaving} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-violet-200 transition-all">
            {isSaving ? <RefreshCw size={18} className="animate-spin"/> : <ImageIcon size={18} />}
            {isSaving ? t('editor_status_saving') : t('editor_button_save_portfolio')}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onOrder(data, 'retail')} className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-1 shadow-lg shadow-emerald-100 transition-all text-sm">
              {t('editor_button_order_retail')}
            </button>
            <button onClick={() => onOrder(data, 'wholesale')} className="bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-1 shadow-lg shadow-amber-100 transition-all text-sm">
              {t('editor_button_order_wholesale')}
            </button>
          </div>
          <button onClick={handlePrint} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all text-xs">
            <Printer size={14} />
            {t('editor_button_print_pdf')}
          </button>
        </div>
      </div>

      {/* PREVIEW AREA */}
      <div className={`
        flex-1 bg-slate-200 relative flex flex-col overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]
        ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'}
      `}>
        
        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur shadow-lg border border-slate-200 rounded-full p-1.5 flex items-center gap-3 z-50">
          {/* Mobile Back to Edit Button */}
          <button 
            onClick={() => setMobileView('edit')}
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full font-black text-xs shadow-md hover:bg-blue-700 transition-all"
          >
            <ArrowRight size={14} />
            <span>{t('editor_button_edit_design')}</span>
          </button>

          <div className="flex items-center gap-2 pl-2 pr-3 border-l border-slate-200">
             <FileText size={16} className="text-slate-500"/>
             <select value={pageSize} onChange={(e) => setPageSize(e.target.value as PageSize)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
               <option value="A4">A4</option>
               <option value="A3">A3</option>
               <option value="A5">A5</option>
             </select>
          </div>
          <div className="flex items-center gap-1">
             <button onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" title={t('editor_tooltip_zoom_out')}><ZoomOut size={18} /></button>
             <span className="text-xs font-mono w-10 text-center text-slate-600">{Math.round(zoom * 100)}%</span>
             <button onClick={() => setZoom(prev => Math.min(2.5, prev + 0.1))} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" title={t('editor_tooltip_zoom_in')}><ZoomIn size={18} /></button>
             <button onClick={() => setZoom(0.5)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors ml-1" title={t('editor_tooltip_reset_zoom')}><Maximize size={16} /></button>
          </div>
        </div>

        {/* Scrollable Wrapper */}
        <div ref={containerRef} className="flex-1 overflow-auto preview-scroll flex relative p-10 md:p-20">
           {/* This wrapper calculates the exact scaled size to force scrollbars */}
           <div 
             className="m-auto relative transition-all duration-200"
             style={{
               width: `${dims.width * zoom}px`,
               height: `${dims.height * zoom}px`,
               flexShrink: 0 
             }}
           >
              <div 
                id="printable-area"
                ref={printRef}
                style={{
                   width: dims.width,
                   height: dims.height,
                   transform: `scale(${zoom})`,
                   transformOrigin: 'top left',
                   backgroundColor: 'white',
                   boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.35)',
                   position: 'absolute',
                   top: 0,
                   left: 0,
                   overflow: 'hidden'
                }}
              >
                {renderPreview()}
              </div>
           </div>
        </div>
        
        {/* Dynamic Print Styles */}
        <style>{`
          @media print { 
            @page { size: ${pageSize}; margin: 0; } 
            body * { visibility: hidden; }
            #printable-area, #printable-area * { visibility: visible; }
            #printable-area { 
              position: fixed !important; 
              top: 0 !important; 
              left: 0 !important; 
              width: 100% !important; 
              height: 100% !important; 
              transform: none !important; 
              box-shadow: none !important; 
            } 
          }
        `}</style>
      </div>

      {/* Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="text-violet-600" size={20} />
                {showPromptModal.title}
              </h3>
              <button onClick={() => setShowPromptModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              {t('editor_modal_bg_desc')}
            </p>
            <textarea
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder={showPromptModal.placeholder}
              className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none resize-none mb-6"
              rows={4}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPromptModal(null)}
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
              >
                {t('editor_button_cancel')}
              </button>
              <button
                onClick={() => handleAutoBackground(promptValue)}
                disabled={!promptValue.trim() || isGeneratingBg}
                className="flex-2 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-100 flex items-center justify-center gap-2"
              >
                {isGeneratingBg ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {isGeneratingBg ? t('editor_status_generating') : t('editor_button_generate_image')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
