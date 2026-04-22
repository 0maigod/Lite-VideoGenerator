import React, { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';

export default function JsonEditorModal({ jsonText, onClose }) {
    const [text, setText] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (jsonText) {
            setText(jsonText);
        }
    }, [jsonText]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Error copiando texto: ", err);
        }
    };

    if (!jsonText) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center p-4 border-b border-white/10 bg-slate-800/50">
                    <h3 className="text-lg font-bold text-white">Json From Image</h3>
                    <button 
                        onClick={onClose}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-300 border border-white/5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 p-4 overflow-hidden flex flex-col">
                    <p className="text-xs text-slate-400 mb-2">Puedes editar este código o copiarlo directamente.</p>
                    <textarea 
                        className="flex-1 w-full bg-[#0d1117] text-[#c9d1d9] font-mono text-sm p-4 rounded-xl border border-white/5 focus:outline-none focus:border-[#fb5607]/50 focus:ring-1 focus:ring-[#fb5607]/50 resize-none"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        spellCheck={false}
                    />
                </div>

                <div className="p-4 border-t border-white/10 bg-slate-800/50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 font-medium text-sm text-slate-300 hover:text-white transition-colors"
                    >
                        Cerrar
                    </button>
                    <button 
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-all ${copied ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-[#fb5607] text-white hover:bg-[#ff006e] shadow-[0_0_15px_rgba(251,86,7,0.4)]'}`}
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4" />
                                Copiado
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                Copiar al Portapapeles
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
