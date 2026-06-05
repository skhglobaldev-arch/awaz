import React, { useState, useEffect } from 'react';
import { Eye, Heart, Share2, ExternalLink, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface PortfolioSectionProps {
  onSelect?: (template: any) => void;
}

export const PortfolioSection: React.FC<PortfolioSectionProps> = ({ onSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [displayItems, setDisplayItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragStart, setDragStart] = useState(0);
  const { t, isRtl } = useLanguage();

  useEffect(() => {
    const q = query(collection(db, 'designs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDisplayItems(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'designs');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAutoPlay || displayItems.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlay, displayItems.length]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % displayItems.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);

  const handleDragEnd = (e: any, info: any) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      prev();
    } else if (info.offset.x < -threshold) {
      next();
    }
  };

  if (loading) {
    return (
      <section id="portfolio" className="py-32 px-4 bg-[#0a0a0a] text-white flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black">{t('portfolio_loading')}</p>
        </div>
      </section>
    );
  }

  if (displayItems.length === 0) {
    return (
      <section id="portfolio" className="py-32 px-4 bg-[#0a0a0a] text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-tight">
            {t('portfolio_main_title')} <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-magenta-400 to-yellow-400">
              {t('portfolio_subtitle')}
            </span>
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-[3rem] p-20 backdrop-blur-xl max-w-2xl mx-auto">
            <Sparkles className="w-16 h-16 text-cyan-400 mx-auto mb-6 animate-pulse" />
            <p className="text-2xl font-black mb-4">{t('portfolio_empty_title')}</p>
            <p className="text-slate-400 leading-relaxed">
              {t('portfolio_empty_desc')}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="portfolio" className="py-32 px-4 bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter leading-tight">
              {t('portfolio_main_title')} <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 animate-gradient-x">
                {t('portfolio_subtitle')}
              </span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg font-light leading-relaxed opacity-80">
              {t('portfolio_desc')}
            </p>
          </motion.div>
        </div>

        {/* 3D Carousel Container */}
        <div className="relative h-[500px] md:h-[700px] flex items-center justify-center perspective-[2500px]">
          <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
            <AnimatePresence mode="popLayout">
              {displayItems.map((item, index) => {
                const total = displayItems.length;
                const offset = (index - currentIndex + total) % total;
                
                // Show up to 7 items for a more "circular" feel
                const visibleRange = 3;
                let isVisible = false;
                if (offset <= visibleRange || offset >= total - visibleRange) {
                  isVisible = true;
                }

                if (!isVisible) return null;

                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                
                // Calculate position on a cylinder
                const angleStep = 40; // degrees
                const radius = isMobile ? 300 : 800;
                
                let normalizedOffset = offset;
                if (offset > visibleRange) normalizedOffset = offset - total;

                const angle = normalizedOffset * angleStep;
                const radian = (angle * Math.PI) / 180;

                const x = Math.sin(radian) * radius;
                const z = (Math.cos(radian) - 1) * radius;
                const rotateY = angle;
                const opacity = Math.max(0, 1 - Math.abs(normalizedOffset) * 0.3);
                const scale = 1 - Math.abs(normalizedOffset) * 0.1;
                const zIndex = 100 - Math.abs(normalizedOffset) * 10;

                return (
                  <motion.div
                    key={item.id}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={handleDragEnd}
                    initial={false}
                    animate={{
                      x,
                      z,
                      rotateY,
                      opacity,
                      scale,
                      zIndex,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 25,
                    }}
                    onMouseEnter={() => setIsAutoPlay(false)}
                    onMouseLeave={() => setIsAutoPlay(true)}
                    onClick={() => onSelect && onSelect(item)}
                    className="absolute w-[280px] md:w-[400px] h-[450px] md:h-[600px] rounded-[2.5rem] overflow-hidden bg-zinc-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer group select-none"
                  >
                    <img 
                      src={item.thumbnail || item.img} 
                      alt={item.name || item.title} 
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                    
                    <div className={`absolute bottom-0 left-0 right-0 p-8 ${isRtl ? 'text-right' : 'text-left'}`}>
                      <div className={`flex gap-2 mb-3 ${isRtl ? 'justify-end' : 'justify-start'}`}>
                        {(item.tags || [item.categoryId]).slice(0, 2).map((tag: string) => (
                          <span key={tag} className="text-[8px] font-black uppercase tracking-widest bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black text-white mb-2 group-hover:text-blue-400 transition-colors">{item.name || item.title}</h3>
                      <p className="text-slate-400 text-xs font-light line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">{item.description}</p>
                      
                      <div className="mt-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                          <span>{t('portfolio_view_design')}</span>
                          <ExternalLink size={14} />
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2.5 bg-white/5 rounded-full hover:bg-pink-500/20 hover:text-pink-500 transition-all">
                            <Heart size={16} />
                          </button>
                          <button className="p-2.5 bg-white/5 rounded-full hover:bg-blue-500/20 hover:text-blue-500 transition-all">
                            <Share2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-20 pointer-events-none">
            <button 
              onClick={isRtl ? next : prev}
              className="p-5 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-full text-white transition-all pointer-events-auto hover:scale-110"
            >
              {isRtl ? <ChevronLeft size={32} /> : <ChevronRight size={32} />}
            </button>
            <button 
              onClick={isRtl ? prev : next}
              className="p-5 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-full text-white transition-all pointer-events-auto hover:scale-110"
            >
              {isRtl ? <ChevronRight size={32} /> : <ChevronLeft size={32} />}
            </button>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="flex justify-center gap-3 mt-12">
          {displayItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                currentIndex === idx ? 'w-12 bg-cyan-400' : 'w-3 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Call to Action - Removed as per request */}
      </div>
      {/* Fade effect */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent"></div>
    </section>
  );
};
