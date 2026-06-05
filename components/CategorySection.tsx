import React, { useState } from 'react';
import { CATEGORIES } from '../constants';
import { CategoryId } from '../types';
import { Sparkles, ArrowRight, Palette, ChevronLeft, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';

interface CategorySectionProps {
  onSelect: (id: CategoryId) => void;
  onCustomOrder?: () => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({ onSelect, onCustomOrder }) => {
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const { t, isRtl } = useLanguage();

  const toggleSub = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubId(expandedSubId === id ? null : id);
  };

  return (
    <section id="categories" className="py-32 bg-[#080808] relative overflow-hidden">
      {/* Vibrant Background Elements */}
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-magenta-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Tree Diagram Layout */}
        <div className="relative flex flex-col items-center">
          {/* Root Node */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="relative z-20 mb-24"
          >
            <div className="px-12 py-6 bg-gradient-to-r from-cyan-600 via-magenta-600 to-yellow-600 rounded-[2.5rem] text-white font-black text-2xl shadow-[0_20px_50px_rgba(236,72,153,0.3)] border border-white/20 flex items-center gap-4 group cursor-default">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse group-hover:scale-150 transition-transform"></div>
              {t('studio_services')}
            </div>
            {/* Connecting Lines Down */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-white/20 to-transparent"></div>
          </motion.div>

          {/* Branches Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 w-full relative">
            {/* Horizontal Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-0 left-[16.6%] right-[16.6%] h-px bg-white/10"></div>

            {CATEGORIES.map((category, idx) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="relative flex flex-col items-center group"
              >
                {/* Vertical Line to Branch */}
                <div className="hidden md:block absolute -top-12 w-px h-12 bg-white/10"></div>

                {/* Category Node (Glassy Card) */}
                <div 
                  className="w-full bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-8 md:p-10 transition-all duration-700 hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-4 relative overflow-hidden group/card shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                >
                  {/* Decorative Gradient Background */}
                  <div className={`absolute -top-10 -right-10 w-48 h-48 bg-gradient-to-br ${category.color} opacity-20 blur-[80px] group-hover/card:opacity-40 transition-opacity duration-700`}></div>
                  
                  <div className="flex flex-col items-center text-center relative z-10">
                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.5rem] bg-gradient-to-br ${category.color} flex items-center justify-center mb-6 md:mb-8 shadow-2xl transform group-hover/card:rotate-12 transition-transform duration-500 relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                      <category.icon size={32} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" />
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-4">
                      {t(category.nameKey as any)}
                    </h3>
                    <p className="text-slate-400 text-xs md:text-sm font-light leading-relaxed mb-8 md:mb-10 opacity-70">
                      {t(category.descriptionKey as any)}
                    </p>

                    {/* Sub-items (Interactive Tree Branches) */}
                    <div className="w-full space-y-3 md:space-y-4">
                       {category.children?.map((child) => (
                         <div key={child.id} className="relative">
                            <button 
                              onClick={(e) => toggleSub(child.id, e)}
                              className={`w-full flex items-center justify-between px-5 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all group/item ${
                                expandedSubId === child.id 
                                ? 'bg-white/15 text-white border-white/30' 
                                : 'bg-white/5 text-white/80 border-white/5 hover:bg-white/10 hover:text-white'
                              } border`}
                            >
                               <span>{t(child.nameKey as any)}</span>
                               <div className="flex items-center gap-2">
                                 {expandedSubId === child.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                 <ArrowRight 
                                   size={14} 
                                   onClick={(e) => { e.stopPropagation(); onSelect(child.id); }}
                                   className={`opacity-0 group-hover/item:opacity-100 transition-opacity hover:text-cyan-400 ${isRtl ? 'rotate-180' : ''}`} 
                                 />
                               </div>
                            </button>
                            
                            {/* Sub-sub-items (Visual Tree) */}
                            <AnimatePresence>
                              {expandedSubId === child.id && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className={`overflow-hidden mt-2 ${isRtl ? 'ml-4 border-l-2 pr-0 pl-4' : 'mr-4 border-r-2 pr-4'} space-y-2 border-white/10`}
                                >
                                   {child.subItems?.map((sub) => (
                                     <button 
                                       key={sub.id}
                                       onClick={(e) => { e.stopPropagation(); onSelect(sub.id); }}
                                       className={`block text-[10px] md:text-[11px] text-slate-400 hover:text-cyan-400 transition-colors ${isRtl ? 'text-left' : 'text-right'} w-full py-1`}
                                     >
                                        • {t(sub.nameKey as any)}
                                     </button>
                                   ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                         </div>
                       ))}
                    </div>

                    <button 
                      onClick={() => onSelect(category.id)}
                      className="mt-10 md:mt-12 flex items-center gap-2 text-cyan-400 font-black text-[10px] md:text-xs group-hover/card:gap-4 transition-all hover:text-white"
                    >
                       <span>{t('view_all_services')}</span>
                       {isRtl ? <ChevronLeft size={14} /> : <ArrowRight size={14} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-32 text-center"
        >
          <div className="inline-block p-1 rounded-full bg-gradient-to-r from-cyan-500 via-magenta-500 to-yellow-500 mb-8">
             <button 
               onClick={onCustomOrder}
               className="px-12 py-5 bg-[#080808] rounded-full text-white font-black text-lg hover:bg-transparent transition-all"
             >
                {t('free_consultation')}
             </button>
          </div>
          <p className="text-slate-500 text-sm">{t('ready_to_soar')}</p>
        </motion.div>
      </div>
    </section>
  );
};
