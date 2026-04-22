import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function ModulesPanel({
    showModules,
    activeModules,
    toggleModule,
    handleGenerateJson
}) {
    if (!showModules) return null;

    const isLightingActive = activeModules.includes('lighting');
    const isModelSheetActive = activeModules.includes('modelSheet');
    const isEnhanceActive = activeModules.includes('enhancePrompt');

    return (
        <section className="absolute top-0 left-0 w-[80%] lg:w-[75%] z-50 bg-slate-950/90 backdrop-blur p-5 rounded-2xl border border-[#ff006e]/50 shadow-[0_0_40px_rgba(255,0,110,0.15)] animate-in fade-in zoom-in-95 duration-300 origin-top-left transition-all">
            <div className="space-y-4">
                <div 
                    onClick={() => toggleModule('lighting')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${isLightingActive ? 'bg-[#ff006e]/20 border-[#ff006e]/50 shadow-inner' : 'bg-slate-900/80 border-white/5 hover:border-white/20 hover:bg-slate-800/80'}`}
                >
                    <div className="flex flex-col">
                        <span className={`text-sm font-bold ${isLightingActive ? 'text-[#ff006e]' : 'text-slate-300'}`}>Estilo de Iluminación Base</span>
                        <span className="text-xs text-slate-500 mt-1">Aplica perfiles de iluminación a tu generación (Cinemático, Noir, etc).</span>
                    </div>
                </div>
                
                <div 
                    onClick={() => toggleModule('modelSheet')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${isModelSheetActive ? 'bg-[#ff006e]/20 border-[#ff006e]/50 shadow-inner' : 'bg-slate-900/80 border-white/5 hover:border-white/20 hover:bg-slate-800/80'}`}
                >
                    <div className="flex flex-col">
                        <span className={`text-sm font-bold ${isModelSheetActive ? 'text-[#ff006e]' : 'text-slate-300'}`}>Model Sheet Turnaround</span>
                        <span className="text-xs text-slate-500 mt-1">Genera proporciones anatómicas perfectas y panel de vistas para 3D.</span>
                    </div>
                </div>

                <div 
                    onClick={() => toggleModule('enhancePrompt')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${isEnhanceActive ? 'bg-[#ff006e]/20 border-[#ff006e]/50 shadow-inner' : 'bg-slate-900/80 border-white/5 hover:border-white/20 hover:bg-slate-800/80'}`}
                >
                    <div className="flex flex-col">
                        <span className={`text-sm font-bold ${isEnhanceActive ? 'text-[#ff006e]' : 'text-slate-300'}`}>Devolver prompt oculto</span>
                        <span className="text-xs text-slate-500 mt-1">Analiza automáticamente tu creación devolviendo el diagnóstico de Gemini Vision.</span>
                    </div>
                </div>

                <div className="h-px bg-white/10 w-full my-2"></div>

                <div 
                    onClick={handleGenerateJson}
                    className="p-4 rounded-xl border transition-all cursor-pointer bg-slate-900/80 border-white/5 hover:border-white/20 hover:bg-slate-800/80 group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Json from Image</span>
                            <span className="text-xs text-slate-500 mt-1">Extrae y traduce el analisis visual a un perfil técnico en formato JSON.</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            </div>
        </section>
    );
}
