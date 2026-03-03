import { useState, useRef, useEffect } from 'react';
import { ImagePlus, Send, Loader2, Sparkles, Wand2, Eraser, Brush, X, Download } from 'lucide-react';

function App() {
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [originalText, setOriginalText] = useState(null);
    const [error, setError] = useState(null);

    // Canvas & Drawing State
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const [isErasing, setIsErasing] = useState(false);

    // Initialize/Resize canvas when image preview changes or window resizes
    useEffect(() => {
        if (isEditing && imagePreview && containerRef.current && canvasRef.current) {
            const container = containerRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // Match canvas size to actual loaded image dimensions in the DOM
            // We use setTimeout to ensure the img element has rendered its layout
            setTimeout(() => {
                const imgEl = container.querySelector('img');
                if (imgEl) {
                    canvas.width = imgEl.width;
                    canvas.height = imgEl.height;

                    // Initialize with pure black (Imagen editImage uses black for "keep", white for "modify", or vice versa depending on config)
                    // We'll use transparent background and draw white. Later we'll composite to a black/white mask.
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }, 50);
        }
    }, [imagePreview, isEditing]);

    const startDrawing = (e) => {
        if (!isEditing || !canvasRef.current) return;
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (canvasRef.current) {
            canvasRef.current.getContext('2d').beginPath();
        }
    };

    const draw = (e) => {
        if (!isDrawing || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        // Calculate scale factors in case CSS scales the canvas
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (isErasing) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // Semi-transparent white for visibility
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    // Helper to generate the final black and white mask
    const generateMaskBase64 = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const ctx = maskCanvas.getContext('2d');

        // Fill background with black (areas to keep)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

        // Draw the user strokes in solid white (areas to edit)
        // We temporarily change composite so the transparent white strokes become solid white
        ctx.globalCompositeOperation = 'source-over';

        // We need to re-draw the original canvas but make all non-transparent pixels pure white
        ctx.drawImage(canvas, 0, 0);

        // Force all drawn pixels to pure white
        const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            // If the pixel from the user's canvas has any alpha
            if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
                data[i] = 255;     // red
                data[i + 1] = 255; // green
                data[i + 2] = 255; // blue
                data[i + 3] = 255; // alpha
            }
        }
        ctx.putImageData(imageData, 0, 0);

        return maskCanvas.toDataURL('image/jpeg');
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
        setImagePreview(null);
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        }
        // Reset file input if needed
        const fileInput = document.getElementById('image-upload');
        if (fileInput) fileInput.value = '';
    };

    const handleDownload = () => {
        if (!result) return;

        // Convert Base64 data URI to a Blob to prevent corrupted downloads in some browsers
        const arr = result.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `gemini-imagen-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up memory
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt) return;

        setLoading(true);
        setError(null);
        setLoading(true);
        setError(null);
        setResult(null);
        setOriginalText(null);

        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('isEditing', isEditing);
        if (image) {
            formData.append('image', image);
        }

        if (isEditing && image && canvasRef.current) {
            const maskBase64 = generateMaskBase64();
            if (maskBase64) {
                formData.append('mask', maskBase64);
            }
        }

        try {
            const response = await fetch('http://localhost:3002/generate', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.success && data.results && data.results.length > 0) {
                // Find the image result first (from imagen)
                const imgResult = data.results.find(r => r.model.includes('imagen')) || data.results[0];
                const textResult = data.results.find(r => r.model.includes('gemini'));

                if (imgResult.success) {
                    setResult(imgResult.data);
                } else {
                    throw new Error(imgResult.error || 'Generación de imagen fallida');
                }

                if (textResult && textResult.success) {
                    setOriginalText(textResult.originalText);
                }
            } else {
                throw new Error(data.error || 'Generación fallida');
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 md:p-12">
            <header className="max-w-4xl w-full mb-12 text-center">
                <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Gemini Image Generator
                </h1>
                <p className="text-slate-400 text-lg">
                    Crea imágenes impresionantes usando IA generativa (Imagen 3.0)
                </p>
            </header>

            <main className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="space-y-6">
                    <form onSubmit={handleSubmit} className="bg-slate-900/50 p-6 rounded-2xl border border-white/10 space-y-4">

                        {/* Action Mode Toggle */}
                        <div className="flex bg-slate-800 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!isEditing ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Generar desde cero
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${isEditing ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Editar Imagen
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {isEditing ? "Prompt de Edición (Ej: ponle un sombrero)" : "Prompt de Generación"}
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={isEditing ? "Añádele lentes de sol virtuales..." : "Un astronauta cabalgando un unicornio en Marte..."}
                                className="w-full h-32 bg-slate-800 border-white/5 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 text-wrap">
                                {isEditing ? "Sube la imagen que quieres modificar (Requerido) *" : "Imagen de Referencia (Opcional)"}
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="hidden"
                                    id="image-upload"
                                />
                                {imagePreview ? (
                                    <div className="space-y-4">
                                        <div
                                            ref={containerRef}
                                            className="relative flex justify-center bg-black/20 rounded-xl overflow-hidden touch-none group/preview"
                                        >
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="max-h-[50vh] w-auto object-contain pointer-events-none"
                                            />
                                            {isEditing && (
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
                                            )}

                                            {/* Remove Image Button */}
                                            <button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-red-500/90 text-white/80 hover:text-white rounded-full backdrop-blur-md opacity-0 group-hover/preview:opacity-100 transition-all z-20 shadow-sm"
                                                title="Quitar imagen"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Drawing Tools (Only in Editing Mode) */}
                                        {isEditing && (
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
                                        )}

                                        <div className="flex justify-center">
                                            <label
                                                htmlFor="image-upload"
                                                className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer underline underline-offset-4 decoration-white/20"
                                            >
                                                Cambiar imagen
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <label
                                        htmlFor="image-upload"
                                        className="flex flex-col items-center justify-center w-full h-40 bg-slate-800 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-slate-800/80 hover:border-blue-500/50 transition-all overflow-hidden"
                                    >
                                        <ImagePlus className="w-8 h-8 text-slate-500 mb-2" />
                                        <span className="text-slate-500 text-sm">Haz clic para subir imagen</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !prompt || (isEditing && !image)}
                            className={`w-full py-4 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors overflow-hidden ${isEditing ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isEditing ? <Wand2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                    {isEditing ? "Editar Imagen" : "Generar Imagen"}
                                </>
                            )}
                        </button>
                    </form>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </section>

                <section className="flex flex-col items-center justify-center min-h-[400px] bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden relative">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative" />
                            </div>
                            <p className="text-slate-400 animate-pulse">Imaginando tu creación...</p>
                        </div>
                    ) : result ? (
                        <div className="w-full h-full flex flex-col p-4 animate-in fade-in duration-500 overflow-y-auto max-h-[600px]">
                            <div className="relative group/result">
                                <img src={result} alt="Generated" className="w-full h-auto rounded-lg shadow-2xl" />

                                {/* Download Button */}
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white/80 hover:text-white rounded-full backdrop-blur-md opacity-0 group-hover/result:opacity-100 transition-all z-20 shadow-sm"
                                    title="Descargar imagen"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="mt-4 text-slate-400 text-sm italic border-b border-white/10 pb-4">"{prompt}"</p>
                            {originalText && (
                                <div className="mt-4 text-slate-300 text-sm whitespace-pre-wrap">
                                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-blue-400" />
                                        Respuesta de Gemini
                                    </h3>
                                    {originalText}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center p-8">
                            <Sparkles className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500">Tu obra maestra aparecerá aquí</p>
                        </div>
                    )}
                </section>
            </main>

            <footer className="mt-auto py-8 text-slate-600 text-sm">
                Potenciado por Gemini API & Imagen 3.0
            </footer>
        </div >
    );
}

export default App;
