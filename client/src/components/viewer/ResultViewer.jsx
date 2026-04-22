import React from 'react';
import { Loader2, Download, ImagePlus } from 'lucide-react';

export default function ResultViewer({
    loading,
    result,
    originalText,
    aspectRatio,
    handleDownload,
    handleUseAsReference
}) {
    if (!loading && !result) return null;

    return (
        <section className={`w-full max-w-4xl lg:max-w-none transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 ${loading ? 'opacity-80' : 'opacity-100'}`}>
            <div className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative h-full flex flex-col min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                        <Loader2 className="w-12 h-12 text-[#3a86ff] animate-spin mb-4" />
                        <p className="text-white font-medium animate-pulse">Generando magia con Imagen 3...</p>
                        <p className="text-slate-400 text-sm mt-2 max-w-xs text-center">Esto puede tardar unos segundos. Se paciente.</p>
                    </div>
                )}
                
                {result ? (
                    <div className="flex bg-black relative flex-col group h-full">
                        <img 
                            src={result} 
                            alt="Generado por IA" 
                            className={`w-full h-auto max-h-[80vh] mx-auto object-contain transition-transform duration-700 ${!loading ? 'scale-100' : 'scale-105'} ${aspectRatio === '16:9' ? 'aspect-video' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square'}`}
                        />
                        <div className="absolute top-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                            <button
                                onClick={handleUseAsReference}
                                className="flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black backdrop-blur-md rounded-xl text-white font-medium border border-blue-500/50 hover:border-blue-500 transition-colors shadow-xl"
                                title="Añadir al bloque de referencias"
                            >
                                <ImagePlus className="w-4 h-4 text-blue-400" />
                                <span className="text-sm hidden sm:inline">Usar Referencia</span>
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black backdrop-blur-md rounded-xl text-white font-medium border border-white/10 transition-colors shadow-xl"
                            >
                                <Download className="w-4 h-4" />
                                <span className="text-sm hidden sm:inline">Descargar</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                        <div className="w-24 h-24 mb-6 rounded-3xl bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center">
                            <span className="text-4xl">🎨</span>
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">Lienzo en blanco</h3>
                        <p className="text-slate-400 max-w-sm">Escribe un prompt detallado en el panel y observa cómo tus ideas cobran vida.</p>
                    </div>
                )}
                
                {originalText && (
                    <div className="p-4 bg-slate-950 border-t border-white/5">
                        <h4 className="text-xs font-bold text-[#ff006e] uppercase tracking-wider mb-2">Prompt original detectado</h4>
                        <p className="text-sm text-slate-300 italic">"{originalText}"</p>
                    </div>
                )}
            </div>
        </section>
    );
}
