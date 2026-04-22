import React from 'react';
import { RectangleVertical, Square, RectangleHorizontal } from 'lucide-react';

export default function ConfigPanel({
    showConfig,
    aspectRatio,
    setAspectRatio,
    imageSize,
    setImageSize
}) {
    if (!showConfig) return null;

    return (
        <section className="absolute top-0 left-0 w-[80%] lg:w-[75%] z-50 bg-slate-950/90 backdrop-blur p-5 rounded-2xl border border-[#ff006e]/50 shadow-[0_0_40px_rgba(255,0,110,0.15)] animate-in fade-in zoom-in-95 duration-300 origin-top-left transition-all">
            <div className="space-y-6">
                <div className="bg-slate-900/80 p-5 rounded-xl border border-white/5 shadow-inner">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-medium">Aspect Ratio</h3>
                        <div className="flex items-center gap-3 text-slate-300">
                            <span className="text-sm font-mono tracking-widest">{aspectRatio.replace(':', ' : ')}</span>
                            <div className="p-1 bg-slate-800 rounded border border-white/10">
                                {['9:16', '3:4'].includes(aspectRatio) ? <RectangleVertical className="w-4 h-4" /> : aspectRatio === '1:1' ? <Square className="w-4 h-4" /> : <RectangleHorizontal className="w-4 h-4" />}
                            </div>
                        </div>
                    </div>

                    {/* Segmented Control */}
                    <div className="flex p-1 bg-slate-950/50 rounded-full mb-8 border border-white/5 relative">
                        <button
                            type="button"
                            onClick={() => setAspectRatio('9:16')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-full z-10 transition-all ${['9:16', '3:4'].includes(aspectRatio) ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Portrait
                        </button>
                        <button
                            type="button"
                            onClick={() => setAspectRatio('1:1')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-full z-10 transition-all ${aspectRatio === '1:1' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Square
                        </button>
                        <button
                            type="button"
                            onClick={() => setAspectRatio('16:9')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-full z-10 transition-all ${['4:3', '16:9'].includes(aspectRatio) ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Landscape
                        </button>
                        {/* Animated Pill Background */}
                        <div
                            className="absolute top-1 bottom-1 w-[calc(33.33%-4px)] bg-[#ff006e] rounded-full transition-transform duration-300 shadow-sm pointer-events-none"
                            style={{ transform: `translateX(${['9:16', '3:4'].includes(aspectRatio) ? '2px' : aspectRatio === '1:1' ? 'calc(100% + 2px)' : 'calc(200% + 2px)'})` }}
                        ></div>
                    </div>

                    {/* Slider */}
                    <div className="px-2">
                        <input
                            type="range" min="0" max="4" step="1"
                            value={['9:16', '3:4', '1:1', '4:3', '16:9'].indexOf(aspectRatio)}
                            onChange={(e) => setAspectRatio(['9:16', '3:4', '1:1', '4:3', '16:9'][e.target.value])}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white hover:accent-red-400 transition-colors"
                        />
                        <div className="flex justify-between mt-2 text-[10px] text-slate-600 font-mono">
                            <span>9:16</span>
                            <span>3:4</span>
                            <span>1:1</span>
                            <span>4:3</span>
                            <span>16:9</span>
                        </div>
                    </div>

                    {/* Size/Quality Control */}
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-medium text-sm">Calidad Base (Resolución)</h3>
                            <span className="text-sm font-mono tracking-widest text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-white/10">{imageSize}</span>
                        </div>
                        <div className="flex p-1 bg-slate-950/50 rounded-full border border-white/5 relative">
                            <button
                                type="button"
                                onClick={() => setImageSize('1K')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-full z-10 transition-all ${imageSize === '1K' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                1K
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageSize('2K')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-full z-10 transition-all ${imageSize === '2K' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                2K
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageSize('4K')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-full z-10 transition-all ${imageSize === '4K' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                4K
                            </button>
                            {/* Animated Pill Background */}
                            <div
                                className="absolute top-1 bottom-1 w-[calc(33.33%-4px)] bg-[#ff006e] rounded-full transition-transform duration-300 shadow-sm pointer-events-none"
                                style={{ transform: `translateX(${imageSize === '1K' ? '2px' : imageSize === '2K' ? 'calc(100% + 2px)' : 'calc(200% + 2px)'})` }}
                            ></div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
