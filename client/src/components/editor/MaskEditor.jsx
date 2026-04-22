import React, { useState } from 'react';
import { Brush, Eraser, X, ImagePlus } from 'lucide-react';

export default function MaskEditor({
    isEditing,
    imagePreviews,
    handleImageChange,
    handleRemoveImage,
    handleReorderImages,
    canvasRef,
    containerRef
}) {
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const [isErasing, setIsErasing] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== dropIndex && handleReorderImages) {
            handleReorderImages(draggedIndex, dropIndex);
        }
        setDraggedIndex(null);
    };

    // Dibuja en el canvas
    const draw = (e) => {
        if (!isDrawing || !canvasRef.current || !containerRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (isErasing) {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const startDrawing = (e) => {
        e.preventDefault();
        setIsDrawing(true);
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.beginPath();
            draw(e);
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (canvasRef.current) {
            canvasRef.current.getContext('2d').beginPath();
        }
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-slate-300 mb-2 text-wrap">
                {isEditing ? "Sube la imagen que quieres modificar (Requerido) *" : "Imágenes de Referencia Múltiples (Opcional)"}
            </label>
            <div className="relative group">
                <input
                    type="file"
                    multiple={!isEditing}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                />
                {isEditing ? (
                    imagePreviews.length > 0 ? (
                        <div className="space-y-4">
                            <div ref={containerRef} className="relative flex justify-center bg-black/20 rounded-xl overflow-hidden touch-none group/preview">
                                <img
                                    src={imagePreviews[0]}
                                    alt="Main Preview"
                                    className="max-h-[50vh] w-auto object-contain pointer-events-none"
                                />
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={startDrawing}
                                    onMouseUp={stopDrawing}
                                    onMouseOut={stopDrawing}
                                    onMouseMove={draw}
                                    onTouchStart={startDrawing}
                                    onTouchEnd={stopDrawing}
                                    onTouchCancel={stopDrawing}
                                    onTouchMove={draw}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 h-full z-10 cursor-crosshair touch-none"
                                    style={{ maxWidth: '100%', objectFit: 'contain' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(0)}
                                    className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-red-500/90 text-white/80 hover:text-white rounded-full backdrop-blur-md opacity-0 group-hover/preview:opacity-100 transition-all z-20 shadow-sm"
                                    title="Quitar imagen principal"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                                <div className="flex bg-slate-800 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsErasing(false)}
                                        className={`p-2 rounded-md transition-colors ${!isErasing ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                        title="Pincel"
                                    >
                                        <Brush className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsErasing(true)}
                                        className={`p-2 rounded-md transition-colors ${isErasing ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                        title="Borrador"
                                    >
                                        <Eraser className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex-1 flex items-center gap-3">
                                    <span className="text-xs text-slate-400 font-medium min-w-[60px]">Tamaño</span>
                                    <input
                                        type="range"
                                        min="5"
                                        max="100"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const canvas = canvasRef.current;
                                        if (canvas) {
                                            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                                        }
                                    }}
                                    className="text-xs font-medium px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                    Limpiar Máscara
                                </button>
                            </div>
                            <div className="flex justify-center">
                                <label htmlFor="image-upload" className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer underline underline-offset-4 decoration-white/20">
                                    Cambiar imagen
                                </label>
                            </div>
                        </div>
                    ) : (
                        <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-40 bg-slate-800 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-slate-800/80 hover:border-blue-500/50 transition-all overflow-hidden">
                            <ImagePlus className="w-8 h-8 text-slate-500 mb-2" />
                            <span className="text-slate-500 text-sm">Haz clic para subir imagen original</span>
                        </label>
                    )
                ) : (
                    <div className="flex flex-col gap-2 w-full mt-2">
                        <span className="text-xs text-slate-500 font-medium px-1">Referencias (Máx. 3 imágenes)</span>
                        <div className="flex flex-wrap gap-4 p-3 bg-slate-800/50 rounded-xl border border-white/5 w-full min-h-[80px] items-center">
                            {imagePreviews.map((preview, idx) => (
                                <div 
                                    key={idx} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, idx)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, idx)}
                                    className={`relative group/thumb w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-grab active:cursor-grabbing ${draggedIndex === idx ? 'opacity-50 scale-95 border-[#fb5607]' : 'border-slate-700 hover:border-blue-500 bg-slate-900 border-dashed'}`}
                                >
                                    <img src={preview} alt={`Thumb ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveImage(idx);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-full backdrop-blur-md opacity-0 group-hover/thumb:opacity-100 transition-all z-20"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {imagePreviews.length < 3 && (
                                <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-16 h-16 bg-slate-800/80 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:bg-slate-700/80 hover:border-blue-500/50 transition-all overflow-hidden shrink-0">
                                    <ImagePlus className="w-6 h-6 text-slate-500" />
                                </label>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
