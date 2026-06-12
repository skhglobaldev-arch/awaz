import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  ArrowRight, 
  Star, 
  Wand2, 
  Sparkles, 
  Loader2,
  Layout,
  Palette,
  Type,
  Image as ImageIcon,
  Share2,
  Monitor,
  Smartphone,
  Layers,
  PenTool,
  Box,
  Zap,
  Heart,
  Menu,
  X,
  Printer
} from 'lucide-react';
import { CategoryId, Template } from '../types';
import { CATEGORIES, TEMPLATES } from '../constants';
import { generateTemplate, getLastAiErrorMessage } from '../services/geminiService';
import { useLanguage } from '../LanguageContext';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';

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
import { ErrorBoundary } from './ErrorBoundary';

interface TemplateSelectorProps {
  onSelect: (template: Template) => void;
  onBack: () => void;
  initialCategory?: CategoryId;
  showTemplatesOnLoad?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ 
  onSelect, 
  onBack,
  initialCategory,
  showTemplatesOnLoad = false
}) => {
  const { t, isRtl } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<CategoryId | 'FAVORITES'>(initialCategory || CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(CategoryId.RESTAURANT_MENU);
  const [generationStep, setGenerationStep] = useState(1);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [aiCredits, setAiCredits] = useState<number | null>(null);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('avaz_tour_completed');
    if (!tourCompleted) {
      const timer = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTour = () => {
    localStorage.setItem('avaz_tour_completed', 'true');
    setShowTour(false);
  };

  const tourSteps = [
    {
      title: t('ts_tour_welcome_title'),
      content: t('ts_tour_welcome_content'),
      target: "ai-generator-section"
    },
    {
      title: t('ts_tour_categories_title'),
      content: t('ts_tour_categories_content'),
      target: "sidebar-nav"
    },
    {
      title: t('ts_tour_search_title'),
      content: t('ts_tour_search_content'),
      target: "search-bar"
    },
    {
      title: t('ts_tour_custom_title'),
      content: t('ts_tour_custom_content'),
      target: "ai-generator-section"
    }
  ];

  const handleGenerate = async () => {
    if (!customPrompt.trim()) return;
    if (!auth.currentUser) {
      alert(isRtl ? 'برای ساخت طرح با هوش مصنوعی، ابتدا وارد حساب کاربری شوید.' : 'Sign in before generating an AI design.');
      return;
    }
    setIsGenerating(true);
    try {
      let industry = '';
      let subIndustry = '';
      let itemType = '';

      CATEGORIES.forEach(cat => {
        cat.children?.forEach(child => {
          child.subItems?.forEach(sub => {
            if (sub.id === selectedCategoryId) {
              industry = cat.name;
              subIndustry = child.name;
              itemType = sub.name;
            }
          });
        });
      });

      const fullPrompt = businessName ? `نام کسب و کار: ${businessName}. ${customPrompt}` : customPrompt;
      const template = await generateTemplate(
        fullPrompt, 
        selectedCategoryId as CategoryId,
        businessName,
        industry,
        subIndustry,
        itemType
      );

      if (template) {
        try {
          if (user) {
            const { addDoc, serverTimestamp } = await import('firebase/firestore');
            
            // Ensure all required fields are present and within limits for Firestore rules
            const designToSave = {
              ...template,
              name: template.name?.substring(0, 99) || 'طرح سفارشی',
              description: template.description?.substring(0, 999) || 'توضیحات طرح سفارشی',
              thumbnailColor: template.thumbnailColor?.substring(0, 99) || 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
              layoutType: ['classic', 'modern', 'colorful', 'minimal', 'typographic', 'elegant'].includes(template.layoutType) ? template.layoutType : 'modern',
              defaultData: template.defaultData || {},
              createdAt: serverTimestamp(),
              isCustomGenerated: true,
              authorUid: user.uid
            };
            
            await addDoc(collection(db, 'designs'), designToSave);
          }
        } catch (fsError) {
          console.error("Error saving design to Firestore:", fsError);
        }
        
        onSelect(template);
      } else {
        alert(getLastAiErrorMessage() || t('ts_gen_error'));
      }
    } catch (error) {
      console.error('Generation Failed', error);
      alert(getLastAiErrorMessage() || t('ts_gen_fail'));
    } finally {
      setIsGenerating(false);
    }
  };

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('avaz_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [savedDesigns, setSavedDesigns] = useState<Template[]>([]);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const unsubscribeSnapshot = onSnapshot(query(collection(db, 'designs')), (snapshot) => {
      const designs: Template[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          thumbnail: data.thumbnail,
          thumbnailColor: data.thumbnailColor,
          layoutType: data.layoutType,
          defaultData: data.defaultData
        } as Template;
      });
      setSavedDesigns(designs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'designs');
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setAiCredits(null);
      return;
    }
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      const value = snapshot.data()?.aiCreditsBalance;
      setAiCredits(typeof value === 'number' ? value : null);
    });
  }, [user]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const templates = useMemo(() => {
    // Only show saved designs (AI generated) if they exist, otherwise show nothing if user wants to clear "previous ones"
    // For now, we'll keep the logic but the user can clear them via the button we'll add.
    const allTemplates = savedDesigns; // Removed TEMPLATES to "hazf kon ghblia ro"
    let filtered = allTemplates;
    
    if (activeCategory === 'FAVORITES') {
      filtered = allTemplates.filter(t => favorites.includes(t.id));
    } else {
      filtered = allTemplates.filter(t => {
        const catId = t.categoryId || '';
        const matchesCategory = catId === activeCategory || 
                                catId.startsWith(activeCategory + '_');
        return matchesCategory;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        (t.name?.toLowerCase() || '').includes(query) || 
        (t.description?.toLowerCase() || '').includes(query)
      );
    }

    return filtered;
  }, [activeCategory, searchQuery, favorites, savedDesigns]);

  const category = CATEGORIES.find(c => c.id === activeCategory);
  const isFavoritesView = activeCategory === 'FAVORITES';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row relative overflow-hidden pt-16 md:pt-20" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Background Glows - More Colorful */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[180px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Mobile Sidebar Handle/Flash */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className={`fixed top-24 z-40 bg-gradient-to-l from-red-500 to-purple-600 p-2 shadow-[-5px_0_20px_rgba(239,68,68,0.3)] border-white/20 animate-pulse md:hidden ${
              isRtl ? 'right-0 rounded-l-2xl shadow-[-5px_0_20px_rgba(239,68,68,0.3)]' : 'left-0 rounded-r-2xl shadow-[5px_0_20px_rgba(239,68,68,0.3)]'
            }`}
          >
            <ArrowRight size={24} className={`text-white ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Dark Glassy Style */}
        <aside 
          id="sidebar-nav"
          className={`
          fixed inset-y-0 z-40 md:relative md:z-10 md:translate-x-0 transition-transform duration-500 ease-in-out
          ${isRtl ? 'right-0 border-l' : 'left-0 border-r'}
          ${isSidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full') + ' md:translate-x-0'}
          w-72 md:w-64 lg:w-72 bg-[#080808]/98 md:bg-white/5 backdrop-blur-3xl border-white/10 flex flex-col h-screen sticky top-0 overflow-y-auto
        `}>
          <div className="p-6 border-b border-white/10 pt-16 md:pt-6">
            <button 
              onClick={onBack}
              className={`flex items-center gap-3 text-slate-400 hover:text-white font-black transition-all mb-6 group ${isRtl ? 'flex-row' : 'flex-row-reverse justify-end'}`}
            >
              <ArrowRight size={18} className={`transition-transform ${isRtl ? 'group-hover:translate-x-1' : 'group-hover:-translate-x-1 rotate-180'}`} />
              <span className="text-sm">{t('ts_back_home')}</span>
            </button>
            
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRtl ? 'left-4' : 'right-4'}`} size={16} />
              <input 
                type="text" 
                placeholder={t('ts_search_placeholder')}
                className={`w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:border-white/20 outline-none transition-all text-white placeholder:text-slate-600 font-bold ${isRtl ? 'pl-10 pr-4' : 'pr-10 pl-4'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="p-6 space-y-2">
            <p className={`text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>{t('ts_categories_title')}</p>
            
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="space-y-2">
                <button
                  onClick={() => {
                    setActiveCategory(cat.id);
                    if (!cat.children) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all group ${isRtl ? 'flex-row' : 'flex-row-reverse'} ${
                    activeCategory === cat.id 
                    ? 'bg-gradient-to-r from-red-500 via-purple-600 to-blue-600 text-white shadow-[0_10px_30px_rgba(147,51,234,0.3)]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all ${activeCategory === cat.id ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                    <cat.icon size={20} className={activeCategory === cat.id ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                  </div>
                  <span>{t(cat.nameKey)}</span>
                </button>
                
                {/* Sub-categories Tree */}
                {cat.children && (
                  <div className={`space-y-2 mt-2 ${isRtl ? 'mr-8 border-r pr-5' : 'ml-8 border-l pl-5'} border-white/10`}>
                     {cat.children.map(child => (
                       <div key={child.id} className="space-y-2">
                          <button 
                            onClick={() => {
                              setActiveCategory(child.id as CategoryId);
                              if (!child.subItems) setIsSidebarOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 rounded-xl text-[11px] font-black transition-all ${isRtl ? 'text-right' : 'text-left'} ${
                              activeCategory === child.id 
                              ? 'text-white bg-white/10 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                          >
                             {t(child.nameKey)}
                          </button>
                          
                          {/* Sub-sub-categories */}
                          {activeCategory === child.id && child.subItems && (
                             <div className={`space-y-1 mt-1 ${isRtl ? 'mr-4 border-r pr-4' : 'ml-4 border-l pl-4'} border-white/5`}>
                                {child.subItems.map(sub => (
                                  <button 
                                    key={sub.id}
                                    onClick={() => {
                                      setActiveCategory(sub.id as CategoryId);
                                      setIsSidebarOpen(false);
                                    }}
                                    className={`w-full px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${isRtl ? 'text-right' : 'text-left'} ${
                                      activeCategory === sub.id 
                                      ? 'text-cyan-400 bg-cyan-400/5' 
                                      : 'text-slate-600 hover:text-slate-400'
                                    }`}
                                  >
                                     {t(sub.nameKey)}
                                  </button>
                                ))}
                             </div>
                          )}
                       </div>
                     ))}
                  </div>
                )}
              </div>
            ))}

            {/* Favorites Category */}
            <button
              onClick={() => {
                setActiveCategory('FAVORITES');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all group mt-4 ${isRtl ? 'flex-row' : 'flex-row-reverse'} ${
                activeCategory === 'FAVORITES' 
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-[0_10px_30px_rgba(245,158,11,0.3)]' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`p-2 rounded-xl transition-all ${activeCategory === 'FAVORITES' ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                <Heart size={20} className={activeCategory === 'FAVORITES' ? 'fill-white text-white' : 'text-slate-400 group-hover:text-white'} />
              </div>
              <span>{t('ts_favorites')}</span>
            </button>
          </div>
        </aside>

        {/* Main Content - Order 1 on mobile to appear first */}
        <main className="order-1 md:order-2 flex-1 px-2 py-0 md:p-8 lg:p-12 relative z-10 overflow-y-auto flex flex-col">
          {/* Header - Hidden on mobile to save space as requested */}
          <div className="hidden md:block max-w-4xl mx-auto text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-black text-slate-400 mb-8 tracking-widest uppercase"
            >
              <Zap size={14} className="text-red-500" />
              <span>{t('ts_platform_title')}</span>
            </motion.div>
            <h1 className="text-7xl font-black text-white mb-8 tracking-tighter leading-tight mt-0">
              {t('ts_hero_title_1')} <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-600 to-blue-600">
                {t('ts_hero_title_2')}
              </span>
            </h1>
            <p className="text-slate-400 text-xl font-bold max-w-2xl mx-auto leading-relaxed px-4">
              {t('ts_hero_subtitle')}
            </p>
          </div>

          {/* Sections Container with Flex Order */}
          <div className="flex flex-col gap-2 md:gap-20">
            {/* Template Grid Section - Order 1 on mobile, Order 2 on desktop */}
            <div className="order-1 md:order-2">
              <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-1 md:gap-4 mb-1 md:mb-12 ${isRtl ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className={`w-full md:w-auto ${isRtl ? 'text-right' : 'text-left'}`}>
                  <h3 className="text-sm md:text-4xl font-black text-white mb-0 md:mb-3">
                    {isFavoritesView || activeCategory === 'FAVORITES' 
                      ? t('ts_favorites') 
                      : t('ts_category_designs').replace('{name}', t(category?.nameKey || 'ts_ready_designs'))}
                  </h3>
                  <p className="hidden md:block text-slate-400 text-base font-bold">{t('ts_best_design_desc')}</p>
                </div>
                
                <div id="search-bar" className="relative w-full md:w-96">
                  <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRtl ? 'right-3' : 'left-3'}`} size={14} />
                  <input 
                    type="text" 
                    placeholder={t('ts_search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full bg-white/5 border border-white/10 rounded-lg md:rounded-2xl py-1.5 md:py-4 text-[10px] md:text-base text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20 transition-all font-bold ${isRtl ? 'pr-8 md:pr-14 pl-3' : 'pl-8 md:pl-14 pr-3'}`}
                  />
                </div>
              </div>

              {templates.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-8">
                  {templates.map((template) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -10 }}
                      className="group bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[1.2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl transition-all hover:bg-white/10 hover:border-white/20"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img 
                          src={template.thumbnail} 
                          alt={template.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4 md:p-8">
                          <button 
                            onClick={() => onSelect(template)}
                            className={`w-full bg-white text-black font-black py-2.5 md:py-4 rounded-lg md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 text-xs md:text-base ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}
                          >
                            <span>{t('ts_customize_button')}</span>
                            <ArrowRight size={16} className={isRtl ? '' : 'rotate-180'} />
                          </button>
                        </div>
                      </div>
                      
                      <div className={`p-2 md:p-8 ${isRtl ? 'text-right' : 'text-left'}`}>
                        <div className={`flex flex-col md:flex-row justify-between items-start mb-1 md:mb-4 ${isRtl ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                          <h4 className="text-[10px] md:text-xl font-black text-white line-clamp-1">{template.name}</h4>
                          <span className="px-1 py-0.5 md:px-3 md:py-1 bg-white/10 rounded-md md:rounded-lg text-[6px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            {template.categoryId.split('-')[0]}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[8px] md:text-sm font-bold line-clamp-1 md:line-clamp-2 leading-relaxed opacity-80">
                          {template.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 md:py-32 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[3rem]">
                  <div className="w-12 h-12 md:w-24 md:h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-8">
                    <Search size={24} className="text-slate-600" />
                  </div>
                  <h4 className="text-lg md:text-2xl font-black text-white mb-2 md:mb-4">{t('ts_no_designs_found')}</h4>
                  <p className="text-slate-500 text-[10px] md:text-sm font-bold">{t('ts_search_again')}</p>
                </div>
              )}
            </div>

            {/* Team Awaz Generator Section - Order 2 on mobile, Order 1 on desktop */}
            <div id="ai-generator-section" className="order-2 md:order-1 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-3 md:p-8 shadow-2xl relative overflow-hidden group max-w-2xl mx-auto mb-2 md:mb-20">
              {/* Animated background glows */}
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-red-500/10 blur-[100px] animate-pulse"></div>
              <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/10 blur-[100px] animate-pulse delay-700"></div>
              
              <div className="relative z-10">
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-8 ${isRtl ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className={`flex items-center gap-3 md:gap-4 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className="p-2 md:p-3 bg-gradient-to-tr from-red-500 via-purple-600 to-blue-600 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)]">
                      <Sparkles className="text-white w-4 h-4 md:w-6 md:h-6" />
                    </div>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                      <h2 className="text-base md:text-2xl font-black text-white tracking-tighter mb-0.5 md:mb-1">{t('ts_studio_title')}</h2>
                      <p className="text-slate-400 text-[9px] md:text-sm font-bold">
                        {t('ts_studio_desc')}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-[10px] font-black text-cyan-100">
                    AI Credit: {aiCredits ?? '-'}
                  </div>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center justify-between mb-4 md:mb-8 max-w-[160px] md:max-w-xs mx-auto relative">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2 z-0"></div>
                  {[1, 2, 3].map((s) => (
                    <button
                      key={s}
                      onClick={() => setGenerationStep(s)}
                      className={`relative z-10 w-5 h-5 md:w-8 md:h-8 rounded-full flex items-center justify-center font-black text-[9px] md:text-sm transition-all duration-500 ${
                        generationStep >= s 
                        ? 'bg-gradient-to-tr from-red-500 to-blue-600 text-white scale-110 shadow-lg' 
                        : 'bg-slate-900 text-slate-600 border border-white/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="min-h-[140px] md:min-h-[200px] flex flex-col justify-center">
                  {generationStep === 1 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-3 md:space-y-6 text-center"
                    >
                      <div className="max-w-md mx-auto space-y-3 md:space-y-6">
                        <h3 className="text-base md:text-2xl font-black text-white">{t('ts_step_1_title')}</h3>
                        <p className="text-slate-400 text-[9px] md:text-sm font-bold">{t('ts_step_1_desc')}</p>
                        <div className="relative group/input">
                          <select 
                            value={selectedCategoryId}
                            onChange={(e) => {
                              setSelectedCategoryId(e.target.value);
                              setGenerationStep(2);
                            }}
                            className="relative w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-2.5 md:py-4 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-xs md:text-lg font-black shadow-xl appearance-none cursor-pointer text-center"
                          >
                            {CATEGORIES.map(cat => (
                              <optgroup key={cat.id} label={t(cat.nameKey)} className="bg-slate-900">
                                {cat.children?.map(child => (
                                  child.subItems?.map(sub => (
                                    <option key={sub.id} value={sub.id}>
                                      {t(child.nameKey)} - {t(sub.nameKey)}
                                    </option>
                                  ))
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {generationStep === 2 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-3 md:space-y-6 text-center"
                    >
                      <div className="max-w-md mx-auto space-y-3 md:space-y-6">
                        <h3 className="text-base md:text-2xl font-black text-white">{t('ts_step_2_title')}</h3>
                        <p className="text-slate-400 text-[9px] md:text-sm font-bold">{t('ts_step_2_desc')}</p>
                        <div className="relative group/input">
                          <input 
                            type="text" 
                            placeholder={t('ts_step_2_placeholder')}
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setGenerationStep(3)}
                            className="relative w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-2.5 md:py-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all text-sm md:text-xl font-black shadow-xl text-center"
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center justify-center gap-4 md:gap-6">
                          <button 
                            onClick={() => setGenerationStep(1)}
                            className="text-slate-500 text-[9px] md:text-sm font-bold hover:text-slate-300 transition-colors"
                          >
                            {t('ts_gen_back')}
                          </button>
                          <button 
                            onClick={() => setGenerationStep(3)}
                            className="text-blue-400 text-[9px] md:text-sm font-bold hover:text-blue-300 transition-colors"
                          >
                            {t('ts_gen_confirm')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {generationStep === 3 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-3 md:space-y-6 text-center"
                    >
                      <div className="max-w-2xl mx-auto space-y-3 md:space-y-6">
                        <h3 className="text-base md:text-2xl font-black text-white">{t('ts_step_3_title')}</h3>
                        <p className="text-slate-400 text-[9px] md:text-sm font-bold">{t('ts_step_3_desc')}</p>
                        <div className="relative group/input">
                          <textarea 
                            placeholder={t('ts_step_3_placeholder')}
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            className="relative w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-2.5 md:py-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all text-[10px] md:text-base font-bold shadow-xl text-center min-h-[80px] md:min-h-[120px] resize-none"
                            autoFocus
                          />
                        </div>
                        
                        <div className={`flex flex-col sm:flex-row gap-2 md:gap-4 ${isRtl ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}>
                          <button 
                            onClick={() => setGenerationStep(2)}
                            className="flex-1 bg-white/5 text-white text-[9px] md:text-sm font-bold py-2.5 md:py-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                          >
                            {t('ts_gen_back')}
                          </button>
                          <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || !customPrompt.trim()}
                            className="flex-[2] bg-gradient-to-r from-red-500 via-purple-600 to-blue-600 text-white font-black text-sm md:text-xl py-2.5 md:py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3 shadow-[0_15px_40px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group/btn relative overflow-hidden"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="animate-spin w-3 h-3 md:w-5 md:h-5" />
                                <span className="text-[9px] md:text-base">{t('ts_gen_preparing')}</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={16} className="group-hover/btn:rotate-12 transition-transform" />
                                <span className="text-xs md:text-base">{t('ts_gen_button')}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Tour Popup */}
        {showTour && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="max-w-md w-full bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/20 blur-[80px]"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 blur-[80px]"></div>
              
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-red-500 via-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl transform -rotate-6">
                  <Sparkles size={40} className="text-white" />
                </div>
                
                <h3 className="text-2xl font-black text-white mb-4 tracking-tighter">{tourSteps[tourStep].title}</h3>
                <p className="text-slate-300 text-sm font-bold leading-relaxed mb-10 opacity-90">
                  {tourSteps[tourStep].content}
                </p>
                
                <div className={`flex items-center justify-between gap-4 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                  <button 
                    onClick={completeTour}
                    className="text-slate-500 text-xs font-black hover:text-white transition-colors px-2"
                  >
                    {t('ts_tour_skip')}
                  </button>
                  
                  <div className={`flex gap-3 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                    {tourStep > 0 && (
                      <button 
                        onClick={() => setTourStep(prev => prev - 1)}
                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black hover:bg-white/10 transition-all text-slate-300"
                      >
                        {t('ts_tour_prev')}
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (tourStep < tourSteps.length - 1) {
                          setTourStep(prev => prev + 1);
                        } else {
                          completeTour();
                        }
                      }}
                      className="px-10 py-3 bg-gradient-to-r from-red-500 via-purple-600 to-blue-600 rounded-2xl text-xs font-black text-white hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(147,51,234,0.3)]"
                    >
                      {tourStep === tourSteps.length - 1 ? t('ts_tour_start') : t('ts_tour_next')}
                    </button>
                  </div>
                </div>

                {/* Progress Dots */}
                <div className="flex justify-center gap-1.5 mt-8">
                  {tourSteps.map((_, i) => (
                    <div 
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === tourStep ? 'w-4 bg-red-500' : 'bg-white/10'}`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
