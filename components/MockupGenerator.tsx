import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Download, Move, RotateCw, ZoomIn, Shirt, Coffee, 
  ArrowRight, Trash2, ShoppingBag, Truck, Package, Utensils, 
  Layers, Sliders, Maximize, MousePointer2, Info, Sparkles,
  Check, ChevronDown, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';

interface MockupGeneratorProps {
  onBack: () => void;
  onOrder: (data: any, orderType: 'retail' | 'wholesale', template: any) => void;
}

export const MockupGenerator: React.FC<MockupGeneratorProps> = ({ onBack, onOrder }) => {
  const { t, isRtl } = useLanguage();
  
  const PRODUCTS = [
    {
      id: 'tshirt',
      name: t('mockup_product_tshirt_name'),
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200&auto=format&fit=crop',
      icon: Shirt,
      printArea: { top: '25%', left: '30%', width: '40%', height: '50%' },
      description: t('mockup_product_tshirt_desc'),
      category: t('mockup_product_tshirt_cat')
    },
    {
      id: 'mug',
      name: t('mockup_product_mug_name'),
      image: 'https://files.catbox.moe/v2pmz4.jpeg',
      icon: Coffee,
      printArea: { top: '28%', left: '28%', width: '44%', height: '60%' },
      description: t('mockup_product_mug_desc'),
      category: t('mockup_product_mug_cat')
    },
    {
      id: 'hoodie',
      name: t('mockup_product_hoodie_name'),
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1200&auto=format&fit=crop',
      icon: Shirt,
      printArea: { top: '32%', left: '24%', width: '36%', height: '40%' },
      description: t('mockup_product_hoodie_desc'),
      category: t('mockup_product_hoodie_cat')
    }
  ];

  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [logo, setLogo] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'product' | 'design' | 'settings'>('product');
  const [showPrintArea, setShowPrintArea] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [textLayer, setTextLayer] = useState<{ text: string, color: string, font: string } | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const initialSettings = {
    scale: 0.8,
    rotate: 0,
    x: 0,
    y: 0,
    opacity: 0.95,
    brightness: 1,
    contrast: 1,
    shadow: 0.2
  };

  const [settings, setSettings] = useState(initialSettings);

  const applyTeamAwazAutoFit = (productId: string) => {
    let autoSettings = { ...initialSettings };
    
    switch (productId) {
      case 'tshirt':
        autoSettings = { ...autoSettings, scale: 0.6, y: -20, opacity: 0.92, shadow: 0.15 };
        break;
      case 'mug':
        autoSettings = { ...autoSettings, scale: 1.05, x: -20, y: 0, opacity: 0.88, shadow: 0.12 };
        break;
      case 'hoodie':
        autoSettings = { ...autoSettings, scale: 0.75, x: 0, y: -5, opacity: 0.92, shadow: 0.18 };
        break;
    }
    
    setSettings(autoSettings);
  };

  const resetCanvas = () => {
    setSettings(initialSettings);
    setCanvasZoom(1);
  };

  const previewRef = useRef<HTMLDivElement>(null);
  const designRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isAutoFitting, setIsAutoFitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!logo) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - settings.x, y: clientY - settings.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setSettings(prev => ({
      ...prev,
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setIsAutoFitting(true);
      setTimeout(() => {
        setLogo(base64);
        applyTeamAwazAutoFit(selectedProduct.id);
        setIsAutoFitting(false);
        setIsProcessing(false);
        setActiveTab('settings');
      }, 1800);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    // @ts-ignore
    if (typeof window.html2canvas === 'undefined') {
      alert(t('mockup_label_rendering'));
      return;
    }
    
    setIsProcessing(true);
    try {
      // @ts-ignore
      const canvas = await window.html2canvas(previewRef.current, {
        useCORS: true,
        scale: 3,
        backgroundColor: null,
        logging: false
      });
      const link = document.createElement("a");
      link.download = `awaz-mockup-${selectedProduct.id}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = (type: 'retail' | 'wholesale') => {
    if (!logo) return;
    
    const dummyTemplate = {
      id: `mockup-${selectedProduct.id}`,
      name: selectedProduct.name,
      description: selectedProduct.description,
      categoryId: 'merch' as any,
      thumbnail: selectedProduct.image,
      thumbnailColor: 'from-slate-100 to-white',
      layoutType: 'classic',
      defaultData: {}
    };

    const orderData = {
      orderSource: 'mockup',
      logo,
      textLayer,
      settings,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productCategory: selectedProduct.category,
      productImage: selectedProduct.image,
      printArea: selectedProduct.printArea,
      hasLogo: Boolean(logo)
    };

    onOrder(orderData, type, dummyTemplate);
  };

  return (
    <div className={`min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-['Vazirmatn'] overflow-hidden ${isFullScreen ? 'fixed inset-0 z-[100]' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Sidebar Navigation (Mobile) */}
      {!isFullScreen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-2 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <button onClick={onBack} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            {isRtl ? <ArrowRight size={18} /> : <ArrowRight size={18} className="rotate-180" />}
          </button>
          <div className="text-center">
            <h1 className="text-base font-black text-slate-900 font-lalezar">{t('mockup_label_studio_title')}</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className={`p-2 rounded-lg transition-all ${isSidebarOpen ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}
          >
            <Sliders size={18} />
          </button>
        </div>
      )}

      {/* SIDEBAR ---------------------- */}
      <div className={`
        ${isSidebarOpen && !isFullScreen ? 'flex' : 'hidden md:flex'}
        w-full md:w-[420px] bg-white border-slate-200 shadow-2xl z-20 flex-col h-[calc(100vh-56px)] md:h-screen overflow-hidden transition-all duration-300
        ${isRtl ? 'border-l' : 'border-r'}
        ${isSidebarOpen ? 'fixed inset-x-0 bottom-0 md:relative md:inset-auto' : ''}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 md:p-6 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center justify-between mb-3 md:mb-6">
            <button 
              onClick={onBack} 
              className="flex items-center gap-2 text-slate-400 hover:text-blue-600 text-[10px] md:text-xs font-black transition-all group"
            >
              {isRtl ? <ArrowRight size={14} className="group-hover:-translate-x-1 transition-transform"/> : <ArrowRight size={14} className="rotate-180 group-hover:translate-x-1 transition-transform"/>}
              {t('mockup_back')}
            </button>
            <div className="flex gap-1.5 md:gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500"></div>
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-yellow-500"></div>
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500"></div>
            </div>
          </div>
          <h1 className="text-lg md:text-2xl font-black text-slate-900 font-lalezar flex items-center gap-2 md:gap-3">
            <Sparkles className="text-blue-600" size={18} />
            {t('mockup_label_studio_title')}
          </h1>
          <p className="text-[9px] md:text-[11px] text-slate-500 mt-1 md:mt-2 font-medium">
            {t('mockup_label_auto_fitting')}
          </p>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex border-b border-slate-100 sticky top-0 bg-white z-10">
          <button 
            onClick={() => setActiveTab('product')}
            className={`flex-1 py-3 md:py-4 text-[10px] md:text-xs font-black transition-all border-b-2 ${activeTab === 'product' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {t('mockup_tab_product')}
          </button>
          <button 
            onClick={() => setActiveTab('design')}
            className={`flex-1 py-3 md:py-4 text-[10px] md:text-xs font-black transition-all border-b-2 ${activeTab === 'design' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {t('mockup_tab_design')}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            disabled={!logo && !textLayer}
            className={`flex-1 py-3 md:py-4 text-[10px] md:text-xs font-black transition-all border-b-2 ${activeTab === 'settings' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'} disabled:opacity-30`}
          >
            {t('mockup_tab_settings')}
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'product' && (
              <motion.div 
                key="product-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  {PRODUCTS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setIsImageLoading(true);
                      }}
                      className={`
                        flex flex-col items-center p-4 rounded-2xl border-2 transition-all relative group
                        ${selectedProduct.id === p.id 
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-lg shadow-blue-100' 
                          : 'border-slate-100 hover:border-slate-200 text-slate-400 bg-white'}
                      `}
                    >
                      <div className={`p-3 rounded-xl mb-3 ${selectedProduct.id === p.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                        <p.icon size={24} />
                      </div>
                      <span className="text-[11px] font-black">{p.name}</span>
                      <span className="text-[9px] opacity-60 mt-1">{p.category}</span>
                    </button>
                  ))}
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Info className="text-blue-600 mt-0.5" size={16} />
                    <div>
                      <p className="text-[11px] font-black text-blue-900">{t('mockup_label_about_product')}</p>
                      <p className="text-[10px] text-blue-700 mt-1 leading-relaxed">{selectedProduct.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'design' && (
              <motion.div 
                key="design-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-slate-800">{t('mockup_label_upload_image')}</h3>
                  <div className={`border-2 border-dashed border-slate-200 rounded-3xl p-6 md:p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all relative group cursor-pointer bg-slate-50/50 ${isProcessing ? 'animate-pulse' : ''}`}>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={isProcessing} />
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform border border-slate-100">
                      {isProcessing ? <RotateCw className="text-blue-600 animate-spin" size={24} /> : <Upload className="text-blue-600" size={24} />}
                    </div>
                    <p className="text-[11px] md:text-xs font-black text-slate-800">
                      {isProcessing ? t('mockup_label_processing') : t('mockup_label_drop_here')}
                    </p>
                    <p className="text-[9px] md:text-[10px] text-slate-400 mt-2 font-medium">{t('mockup_label_png_hint')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-slate-800">{t('mockup_label_add_text')}</h3>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                    <input 
                      type="text" 
                      placeholder={t('mockup_label_text_placeholder')}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      onChange={(e) => setTextLayer(e.target.value ? { text: e.target.value, color: '#000000', font: 'Vazirmatn' } : null)}
                      value={textLayer?.text || ''}
                    />
                    {textLayer && (
                      <div className="flex gap-2">
                        {['#000000', '#ffffff', '#ef4444', '#3b82f6', '#10b981'].map(c => (
                          <button 
                            key={c}
                            onClick={() => setTextLayer({ ...textLayer, color: c })}
                            className={`w-6 h-6 rounded-full border ${textLayer.color === c ? 'ring-2 ring-blue-500' : ''}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {logo && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden border border-slate-100">
                      <img src={logo} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-black text-slate-800">{t('mockup_label_ready_design')}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{t('mockup_label_auto_fitting')}</p>
                    </div>
                    <button onClick={() => setLogo(null)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'settings' && (logo || textLayer) && (
              <motion.div 
                key="settings-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Transform Controls */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-slate-800 flex items-center gap-2">
                      <Maximize size={14} className="text-blue-600"/> {t('mockup_label_scale')} & {t('mockup_label_rotate')}
                    </h3>
                    <button 
                      onClick={() => setSettings({ ...settings, x: 0, y: 0, scale: 0.8, rotate: 0 })}
                      className="text-[9px] font-black text-blue-600 hover:underline"
                    >
                      {t('mockup_label_reset')}
                    </button>
                  </div>

                  <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-slate-500">
                        <span>{t('mockup_label_scale')}</span>
                        <span className="text-blue-600">{Math.round(settings.scale * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="2" step="0.01" value={settings.scale}
                        onChange={e => setSettings({ ...settings, scale: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-slate-500">{t('mockup_label_x_offset')}</span>
                        <input 
                          type="range" min="-150" max="150" value={settings.x}
                          onChange={e => setSettings({ ...settings, x: parseFloat(e.target.value) })}
                          className="w-full h-1.5 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-slate-500">{t('mockup_label_y_offset')}</span>
                        <input 
                          type="range" min="-150" max="150" value={settings.y}
                          onChange={e => setSettings({ ...settings, y: parseFloat(e.target.value) })}
                          className="w-full h-1.5 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-slate-500">
                        <span>{t('mockup_label_rotate')}</span>
                        <span className="text-blue-600">{settings.rotate}°</span>
                      </div>
                      <input 
                        type="range" min="-180" max="180" value={settings.rotate}
                        onChange={e => setSettings({ ...settings, rotate: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Realism Controls */}
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black text-slate-800 flex items-center gap-2">
                    <Layers size={14} className="text-blue-600"/> {t('mockup_label_auto_fitting')}
                  </h3>
                  
                  <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-slate-500">
                        <span>{t('mockup_label_opacity')}</span>
                        <span className="text-blue-600">{Math.round(settings.opacity * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" value={settings.opacity}
                        onChange={e => setSettings({ ...settings, opacity: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-slate-500">
                        <span>{t('mockup_label_shadow')}</span>
                        <span className="text-blue-600">{Math.round(settings.shadow * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" value={settings.shadow}
                        onChange={e => setSettings({ ...settings, shadow: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* View Options removed per user request */}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="p-4 md:p-6 border-t border-slate-100 bg-white space-y-3 md:space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
          {activeTab === 'product' && (
            <button 
              onClick={() => setActiveTab('design')}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-95"
            >
              {t('mockup_label_next_design')}
              {isRtl ? <ArrowRight size={18} className="rotate-180" /> : <ArrowRight size={18} />}
            </button>
          )}

          {activeTab === 'design' && (
            <button 
              onClick={() => setActiveTab('settings')}
              disabled={!logo && !textLayer}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {t('mockup_label_next_settings')}
              {isRtl ? <ArrowRight size={18} className="rotate-180" /> : <ArrowRight size={18} />}
            </button>
          )}

          {activeTab === 'settings' && (
            <>
              {logo || textLayer ? (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handlePurchase('retail')}
                    className="group bg-blue-600 text-white py-4 rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex flex-col items-center justify-center gap-1 active:scale-95"
                  >
                    <ShoppingBag size={18} />
                    {t('mockup_label_retail')}
                  </button>
                  <button 
                    onClick={() => handlePurchase('wholesale')}
                    className="group bg-slate-900 text-white py-4 rounded-2xl font-black text-xs hover:bg-black transition-all shadow-lg shadow-slate-100 flex flex-col items-center justify-center gap-1 active:scale-95"
                  >
                    <Truck size={18} />
                    {t('mockup_label_wholesale')}
                  </button>
                </div>
              ) : (
                <button 
                  disabled
                  className="w-full bg-slate-100 text-slate-400 py-5 rounded-2xl font-black text-xs cursor-not-allowed border border-slate-200"
                >
                  {t('mockup_label_upload_first')}
                </button>
              )}
              
              <button 
                onClick={handleDownload}
                disabled={(!logo && !textLayer) || isProcessing}
                className="w-full bg-white text-slate-700 border border-slate-200 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50 active:scale-95"
              >
                {isProcessing ? <RotateCw className="animate-spin" size={18}/> : <Download size={18} className="text-blue-600"/>}
                {t('mockup_label_download')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* MAIN CANVAS ---------------------- */}
      <div className="flex-1 bg-[#f1f5f9] flex items-start md:items-center justify-center p-0 md:p-12 overflow-auto relative transition-colors duration-500">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        
        <div className="relative w-full max-w-[700px] flex flex-col items-center gap-4 md:gap-8 pt-0 md:pt-0">
          {/* Canvas Tools Overlay */}
          <div className="absolute top-0 md:top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 md:gap-2 bg-white/80 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/20 shadow-xl">
            <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 border-l border-slate-200">
              <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${logo ? 'bg-green-500' : 'bg-slate-300'}`}></div>
              <span className="text-[9px] md:text-[10px] font-black text-slate-600">{logo ? t('mockup_label_ready_design') : t('mockup_label_no_design')}</span>
            </div>
            <button 
              onClick={() => setShowPrintArea(!showPrintArea)}
              className={`p-1 md:p-1.5 rounded-lg transition-colors ${showPrintArea ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-100'}`}
              title={t('mockup_label_print_area')}
            >
              <Maximize size={14} className="md:w-4 md:h-4" />
            </button>
            <button 
              onClick={() => setCanvasZoom(prev => Math.min(prev + 0.1, 2))}
              className="p-1 md:p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title={t('mockup_label_scale')}
            >
              <ZoomIn size={14} className="md:w-4 md:h-4" />
            </button>
            <button 
              onClick={() => setCanvasZoom(1)}
              className="p-1 md:p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors text-[9px] md:text-[10px] font-black"
            >
              100%
            </button>
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)}
              className={`p-1 md:p-1.5 rounded-lg transition-colors ${isFullScreen ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-100'}`}
              title={t('mockup_label_full_screen')}
            >
              <Maximize size={14} className="md:w-4 md:h-4" />
            </button>
            <button 
              onClick={resetCanvas}
              className="p-1 md:p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
              title={t('mockup_label_reset_canvas')}
            >
              <RotateCw size={14} className="md:w-4 md:h-4" />
            </button>
          </div>

          {/* Main Mockup Container */}
          <div 
            ref={previewRef}
            className="relative bg-white shadow-[0_30px_60px_rgba(0,0,0,0.08)] md:shadow-[0_50px_100px_rgba(0,0,0,0.08)] rounded-[2rem] md:rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-700 border-[8px] md:border-[12px] border-white flex items-center justify-center group"
            style={{ 
              width: '100%', 
              aspectRatio: '1/1',
              maxHeight: '75vh',
              transform: `scale(${canvasZoom})`,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isImageLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[11px] font-black text-slate-400">{t('mockup_label_rendering')}</p>
              </div>
            )}

            {isAutoFitting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-600/10 backdrop-blur-[2px] z-40 transition-all duration-500">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-blue-100 flex flex-col items-center gap-6"
                >
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto text-blue-600 animate-pulse" size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-900">{t('mockup_label_auto_fitting')}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">{t('mockup_label_auto_fitting_desc')}</p>
                  </div>
                  <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className="h-full bg-blue-600"
                    />
                  </div>
                </motion.div>
              </div>
            )}

            <img 
              key={selectedProduct.id}
              src={selectedProduct.image}
              className={`w-full h-full object-cover transition-all duration-700 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
              alt="Product"
              referrerPolicy="no-referrer"
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />

            {/* Print Area Indicator */}
            {showPrintArea && !isImageLoading && (
              <div 
                className="absolute border-2 border-dashed border-blue-400/40 rounded-xl pointer-events-none z-10"
                style={{
                  top: selectedProduct.printArea.top,
                  left: selectedProduct.printArea.left,
                  width: selectedProduct.printArea.width,
                  height: selectedProduct.printArea.height,
                }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                  {t('mockup_label_print_area')}
                </div>
              </div>
            )}

            {logo && (
              <div
                className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} pointer-events-auto`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                style={{
                  top: selectedProduct.printArea.top,
                  left: selectedProduct.printArea.left,
                  width: selectedProduct.printArea.width,
                  height: selectedProduct.printArea.height,
                  perspective: '1200px',
                  zIndex: 20
                }}
              >
                <div
                  ref={designRef}
                  className="w-full h-full flex items-center justify-center relative"
                  style={{
                    transform: `
                      translate(${settings.x}px, ${settings.y}px)
                      scale(${settings.scale})
                      rotate(${settings.rotate}deg)
                      ${selectedProduct.id === 'mug' ? 'perspective(1000px) rotateX(1deg) scaleX(0.94)' : ''}
                    `,
                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)'
                  }}
                >
                  <div 
                    className="relative w-full h-full flex items-center justify-center"
                    style={{
                      WebkitMaskImage: selectedProduct.id === 'mug' 
                        ? 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)' 
                        : 'none',
                      maskImage: selectedProduct.id === 'mug' 
                        ? 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)' 
                        : 'none',
                    }}
                  >
                      <img
                        src={logo}
                        alt="User Design"
                        className="max-w-full max-h-full object-contain"
                        style={{
                          opacity: settings.opacity,
                          mixBlendMode: (selectedProduct.id === 'tshirt' || selectedProduct.id === 'hoodie') ? 'multiply' : 'normal',
                          filter: `
                            contrast(1.1) 
                            brightness(0.98) 
                            saturate(1.05)
                            ${selectedProduct.id === 'mug' ? 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))' : ''}
                            drop-shadow(${settings.shadow * 10}px ${settings.shadow * 10}px ${settings.shadow * 15}px rgba(0,0,0,${settings.shadow}))
                          `
                        }}
                      />
                    {/* Symmetrical Lighting Overlay for Mug Curvature */}
                    {selectedProduct.id === 'mug' && (
                      <>
                        <div 
                          className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-40"
                          style={{
                            background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)'
                          }}
                        />
                        <div 
                          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
                          style={{
                            background: 'linear-gradient(to right, transparent 45%, rgba(255,255,255,0.5) 50%, transparent 55%)'
                          }}
                        />
                      </>
                    )}
                  </div>
                  
                  {textLayer && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      style={{
                        color: textLayer.color,
                        fontFamily: textLayer.font,
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        mixBlendMode: settings.blendMode,
                        opacity: settings.opacity,
                        filter: `drop-shadow(${settings.shadow * 5}px ${settings.shadow * 5}px ${settings.shadow * 10}px rgba(0,0,0,${settings.shadow}))`
                      }}
                    >
                      {textLayer.text}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!logo && textLayer && (
              <div
                className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} pointer-events-auto`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                style={{
                  top: selectedProduct.printArea.top,
                  left: selectedProduct.printArea.left,
                  width: selectedProduct.printArea.width,
                  height: selectedProduct.printArea.height,
                  perspective: '1200px',
                  zIndex: 20
                }}
              >
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    transform: `
                      translate(${settings.x}px, ${settings.y}px)
                      scale(${settings.scale})
                      rotate(${settings.rotate}deg)
                    `,
                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
                    color: textLayer.color,
                    fontFamily: textLayer.font,
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    mixBlendMode: settings.blendMode,
                    opacity: settings.opacity,
                    filter: `drop-shadow(${settings.shadow * 5}px ${settings.shadow * 5}px ${settings.shadow * 10}px rgba(0,0,0,${settings.shadow}))`
                  }}
                >
                  {textLayer.text}
                </div>
              </div>
            )}

            {/* Team Awaz Realism Overlays */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[3rem]">
              {selectedProduct.id === 'mug' && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-white/10 mix-blend-multiply opacity-40"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent mix-blend-overlay opacity-60 -skew-x-12 translate-x-1"></div>
                </>
              )}
              {(selectedProduct.id === 'tshirt' || selectedProduct.id === 'hoodie') && (
                <>
                  <div className="absolute inset-0 bg-black/5 mix-blend-overlay opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-white/5 mix-blend-multiply"></div>
                </>
              )}
            </div>

            {/* Branding Watermark */}
            <div className="absolute bottom-1 left-0 right-0 flex justify-center pointer-events-none">
              <div className="bg-white/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 shadow-sm">
                <span className="text-[8px] text-slate-800 font-black tracking-[0.2em] uppercase opacity-40">
                  Awaz Creative Studio • Professional Team
                </span>
              </div>
            </div>
          </div>

          {/* Canvas Footer Info */}
          <div className="flex items-center gap-8 text-slate-400">
            <div className="flex items-center gap-2">
              <MousePointer2 size={14} />
              <span className="text-[10px] font-bold">{t('mockup_footer_interactive')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers size={14} />
              <span className="text-[10px] font-bold">{t('mockup_footer_rendering')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Maximize size={14} />
              <span className="text-[10px] font-bold">{t('mockup_footer_4k')}</span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
};

