import React from 'react';
import { Pizza, SlidersHorizontal } from 'lucide-react';

export default function ActionToggle({
    showModules,
    setShowModules,
    isEditing,
    setIsEditing,
    images,
    canvasRef,
    showConfig,
    setShowConfig
}) {
    return (
        <div className="flex bg-slate-800 p-1 rounded-xl gap-1">
            <button
                type="button"
                onClick={() => setShowModules(!showModules)}
                className={`flex-none p-2 rounded-lg transition-colors flex items-center justify-center ${showModules ? 'bg-[#ff006e] text-white shadow' : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600'}`}
                title="Módulos"
            >
                <Pizza className="w-5 h-5" />
            </button>
            <button
                type="button"
                onClick={() => {
                    setIsEditing(false);
                    if (images.length > 0 && canvasRef.current) {
                        const canvas = canvasRef.current;
                        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                    }
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors overflow-hidden ${!isEditing ? 'bg-[#3a86ff] text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
                Imaginar
            </button>
            <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors overflow-hidden ${isEditing ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
                Editar Imagen
            </button>
            <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className={`flex-none p-2 rounded-lg transition-colors flex items-center justify-center ${showConfig ? 'bg-[#ff006e] text-white shadow' : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600'}`}
                title="Configuración"
            >
                <SlidersHorizontal className="w-5 h-5" />
            </button>
        </div>
    );
}
