import { useState, useRef, useEffect } from 'react';
import { ImagePlus, Send, Loader2, Sparkles, Wand2, Eraser, Brush, X, Download, SlidersHorizontal, ChevronDown, RectangleHorizontal, RectangleVertical, Square } from 'lucide-react';
import { LIGHTING_STYLES } from './constants/lightingStyles';

function App() {
    const [prompt, setPrompt] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [originalText, setOriginalText] = useState(null);
    const [error, setError] = useState(null);
    const [enhancePrompt, setEnhancePrompt] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [imageSize, setImageSize] = useState('2K');
    const [hasInteracted, setHasInteracted] = useState(false);
    const [useLighting, setUseLighting] = useState(false);
    const [selectedLighting, setSelectedLighting] = useState(null);

    // Trigger logo collapse on first meaningful user interaction
    useEffect(() => {
        if (!hasInteracted && (prompt.length > 0 || images.length > 0 || isEditing || showConfig || enhancePrompt)) {
            setHasInteracted(true);
        }
    }, [prompt, images, isEditing, showConfig, enhancePrompt, hasInteracted]);

    // Ocultar encabezado cuando scrollea hacia abajo el usuario
    useEffect(() => {
        const handleScroll = () => {
            if (!hasInteracted && window.scrollY > 15) {
                setHasInteracted(true);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasInteracted]);

    // Canvas & Drawing State
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const [isErasing, setIsErasing] = useState(false);

    // Initialize/Resize canvas when image preview changes or window resizes
    useEffect(() => {
        if (isEditing && imagePreviews.length > 0 && containerRef.current && canvasRef.current) {
            const container = containerRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // Match canvas size to actual loaded image dimensions in the DOM
            // We use setTimeout to ensure the img element has rendered its layout
            setTimeout(() => {
                const imgEl = container.querySelector('img');
                if (imgEl) {
                    canvas.width = imgEl.naturalWidth;
                    canvas.height = imgEl.naturalHeight;

                    // Initialize with pure black (Imagen editImage uses black for "keep", white for "modify", or vice versa depending on config)
                    // We'll use transparent background and draw white. Later we'll composite to a black/white mask.
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }, 50);
        }
    }, [imagePreviews, isEditing]);

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
        let hasMaskPixels = false;
        
        for (let i = 0; i < data.length; i += 4) {
            // If the pixel from the user's canvas has any color/alpha
            if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
                hasMaskPixels = true;
                data[i] = 255;     // red
                data[i + 1] = 255; // green
                data[i + 2] = 255; // blue
                data[i + 3] = 255; // alpha
            }
        }
        
        if (!hasMaskPixels) {
            return null; // If the user didn't draw anything, return null so no mask is sent (triggers global editing on backend)
        }
        
        ctx.putImageData(imageData, 0, 0);

        return maskCanvas.toDataURL('image/jpeg');
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            let selectedFiles;

            if (isEditing) {
                // In editing mode, we only explicitly support 1 base image and ALWAYS replace it
                selectedFiles = [files[0]];
            } else {
                // In generation mode, append new files to existing ones up to max of 3
                const maxAllowed = 3 - images.length;
                if (maxAllowed <= 0) {
                    alert("Ya has alcanzado el límite máximo de 3 imágenes de referencia.");
                    return;
                }

                const filesToAdd = files.slice(0, maxAllowed);
                if (files.length > maxAllowed) {
                    alert(`Solo se pudieron añadir ${maxAllowed} imagen(es) para no exceder el límite de 3.`);
                }
                selectedFiles = [...images, ...filesToAdd];
            }

            setImages(selectedFiles);

            // Re-generate previews for all files (both old and new to keep it simple and synced)
            const newPreviews = [];
            let loadedCount = 0;

            selectedFiles.forEach((file, index) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    newPreviews[index] = reader.result;
                    loadedCount++;
                    if (loadedCount === selectedFiles.length) {
                        setImagePreviews(newPreviews);
                    }
                };
                reader.readAsDataURL(file);
            });

            // Clear the file input so the user can select the same file again if they want
            if (e.target) e.target.value = '';
        }
    };

    const handleRemoveImage = (indexToRemove) => {
        const newImages = images.filter((_, idx) => idx !== indexToRemove);
        const newPreviews = imagePreviews.filter((_, idx) => idx !== indexToRemove);

        setImages(newImages);
        setImagePreviews(newPreviews);

        if (newImages.length === 0 && canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            const fileInput = document.getElementById('image-upload');
            if (fileInput) fileInput.value = '';
        }
    };

    const handleDownload = async () => {
        if (!result) return;

        try {
            // 1. Extraer el base64 puro y su mimeType de un string tipo "data:image/jpeg;base64,....."
            const arr = result.split(',');
            const mimeMatch = arr[0].match(/:(.*?);/);

            if (!mimeMatch || arr.length !== 2) {
                console.error("Formato de imagen inválido");
                return;
            }

            const mimeType = mimeMatch[1]; // ej. "image/jpeg" o "image/png"
            const b64Data = arr[1];

            // Extraer extensión dinámica basada en el mimeType
            // Si el mimeType es image/png, guardará '.png', por defecto '.jpg'
            const extension = mimeType.split('/')[1] || 'jpg';

            // 2. Convertir Base64 a un Blob (mejor rendimiento para imágenes 4K)
            const byteCharacters = atob(b64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });

            // 3. Intentar usar File System Access API para elegir DONDE guardar
            if ('showSaveFilePicker' in window) {
                try {
                    const opts = {
                        suggestedName: `gemini-imagen.${extension}`,
                        types: [{
                            description: 'Imagen Generada por Gemini',
                            accept: { [mimeType]: [`.${extension}`] },
                        }],
                    };
                    // Mostrar diálogo "Guardar como..."
                    const handle = await window.showSaveFilePicker(opts);
                    // Escribir el blob al archivo
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    return; // Terminamos con éxito
                } catch (err) {
                    // Si el error es AbortError, el usuario canceló la ventana. No hacemos nada.
                    if (err.name === 'AbortError') return;
                    console.error("Falló showSaveFilePicker. Usando fallback tradicional...", err);
                    // Si falla por otra razón (ej. falta de soporte real), dejamos caer al fallback de abajo
                }
            }

            // 4. Fallback tradicional (Descarga automática) para navegadores no compatibles (ej. Firefox)
            const blobUrl = URL.createObjectURL(blob);

            // Iniciar descarga forzada con nombre dinámico
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `gemini-imagen.${extension}`);

            document.body.appendChild(link);
            link.click();

            // Limpiar el DOM y liberar la memoria RAM
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);

        } catch (error) {
            console.error("Error procesando la descarga:", error);
            setError("No se pudo descargar la imagen correctamente.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt) return;

        setHasInteracted(true);
        setLoading(true);
        setError(null);
        setResult(null);
        setOriginalText(null);

        const formData = new FormData();

        // Build the final prompt by optionally injecting lighting style
        let finalPrompt = prompt;
        if (isEditing && useLighting && selectedLighting) {
            const styleInfo = LIGHTING_STYLES.find(s => s.id === selectedLighting);
            if (styleInfo) {
                finalPrompt += `, ${styleInfo.promptInjection}`;
            }
        }

        formData.append('prompt', finalPrompt);
        formData.append('isEditing', isEditing);
        formData.append('enhancePrompt', enhancePrompt);
        formData.append('aspectRatio', aspectRatio);
        formData.append('imageSize', imageSize);

        images.forEach((img) => {
            formData.append('images', img);
        });

        if (isEditing && images.length > 0 && canvasRef.current) {
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
                // Find the image result first (from imagen or gemini multimodal)
                const imgResult = data.results.find(r => r.data) || data.results[0];
                const textResult = data.results.find(r => r.isTextOnly);

                if (imgResult.success && imgResult.data) {
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
            <header className={`w-full flex ${hasInteracted ? 'justify-between items-center mb-8 px-4 md:px-8 max-w-[1400px]' : 'flex-col items-center mb-12 text-center max-w-4xl'} transition-all duration-700 mx-auto`}>
                <div className={`flex flex-col ${hasInteracted ? '' : 'items-center'}`}>
                    <h1 className={`font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent transition-all duration-700 ${hasInteracted ? 'text-3xl tracking-widest' : 'text-3xl md:text-5xl mb-4'}`}>
                        {hasInteracted ? 'GIG' : 'Gemini Image Generator'}
                    </h1>
                    {!hasInteracted && (
                        <p className="text-slate-400 text-lg animate-in fade-in duration-500">
                            Crea imágenes impresionantes usando IA generativa (Imagen 3.0)
                        </p>
                    )}
                </div>
                {hasInteracted && (
                    <div className="font-bold text-white text-lg animate-in fade-in slide-in-from-right-4 duration-700 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-black shadow-lg shadow-purple-500/20">FZ</div>
                    </div>
                )}
            </header>

            <main className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="space-y-6">
                    <form onSubmit={handleSubmit} className="bg-slate-900/50 p-6 rounded-2xl border border-white/10 space-y-4">

                        {/* Action Mode Toggle */}
                        <div className="flex bg-slate-800 p-1 rounded-xl gap-1">
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
                                Generar desde cero
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
                                    /* --- MODO EDICIÓN --- */
                                    imagePreviews.length > 0 ? (
                                        <div className="space-y-4">
                                            {/* Main Preview (First Image or Canvas Base) */}
                                            <div
                                                ref={containerRef}
                                                className="relative flex justify-center bg-black/20 rounded-xl overflow-hidden touch-none group/preview"
                                            >
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

                                            {/* Drawing Tools */}
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
                                            <span className="text-slate-500 text-sm">Haz clic para subir imagen original</span>
                                        </label>
                                    )
                                ) : (
                                    /* --- MODO GENERACIÓN --- */
                                    <div className="flex flex-col gap-2 w-full mt-2">
                                        <span className="text-xs text-slate-500 font-medium px-1">
                                            Referencias (Máx. 3 imágenes)
                                        </span>
                                        <div className="flex flex-wrap gap-4 p-3 bg-slate-800/50 rounded-xl border border-white/5 w-full min-h-[80px] items-center">
                                            {/* Mostrar las miniaturas seleccionadas */}
                                            {imagePreviews.map((preview, idx) => (
                                                <div key={idx} className="relative group/thumb w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-700 hover:border-blue-500 transition-colors bg-slate-900 border-dashed shrink-0">
                                                    <img src={preview} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
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

                                            {/* Botón para agregar más */}
                                            {imagePreviews.length < 3 && (
                                                <label htmlFor="image-upload" className="flex flex-row items-center justify-center h-16 px-4 bg-slate-800 rounded-lg border-2 border-dashed border-slate-600 hover:border-slate-400 cursor-pointer transition-colors shrink-0 gap-2">
                                                    <ImagePlus className="w-5 h-5 text-slate-400" />
                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 text-center">Subir ({imagePreviews.length}/3)</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- CARRUSEL DE ILUMINACIÓN (Solo Edición) --- */}
                        {isEditing && (
                            <div className="w-full bg-slate-900/40 rounded-xl border border-white/5 p-4 mt-2 transition-all duration-300">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="useLighting"
                                        checked={useLighting}
                                        onChange={(e) => {
                                            setUseLighting(e.target.checked);
                                            if (e.target.checked && !selectedLighting) {
                                                setSelectedLighting(LIGHTING_STYLES[0].id);
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 border text-[#fb5607] focus:ring-[#fb5607]/50 cursor-pointer accent-[#fb5607] transition-colors"
                                    />
                                    <label htmlFor="useLighting" className="text-sm font-medium text-slate-300 cursor-pointer">
                                        Inyectar Estilo de Iluminación Base
                                    </label>
                                </div>

                                {useLighting && (
                                    <div className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                        {LIGHTING_STYLES.map((style) => (
                                            <div
                                                key={style.id}
                                                onClick={() => setSelectedLighting(style.id)}
                                                className={`flex flex-col items-center gap-2 cursor-pointer group shrink-0 w-20 transition-all duration-300 ${selectedLighting === style.id ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-100'}`}
                                            >
                                                <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedLighting === style.id ? 'border-[#fb5607] shadow-lg shadow-[#fb5607]/20' : 'border-transparent group-hover:border-slate-500'}`}>
                                                    <img src={style.image} alt={style.name} className="w-full h-full object-cover" />
                                                </div>
                                                <span className={`text-[10px] text-center leading-tight font-medium ${selectedLighting === style.id ? 'text-[#fb5607]' : 'text-slate-400'}`}>
                                                    {style.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="w-full mt-2">
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

                        <button
                            type="submit"
                            disabled={loading || !prompt || (isEditing && images.length === 0)}
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

                <div className="relative w-full h-full">
                    {showConfig && (
                        <section className="absolute top-0 left-0 w-[80%] lg:w-[75%] z-50 bg-slate-950 p-5 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-300 origin-top-left">
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

                                    <div className="mt-6 pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-4 px-2">
                                            <input
                                                type="checkbox"
                                                id="enhance"
                                                checked={enhancePrompt}
                                                onChange={(e) => setEnhancePrompt(e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 border text-[#ff006e] focus:ring-[#ff006e] focus:ring-offset-slate-900 cursor-pointer accent-[#ff006e] transition-colors"
                                            />
                                            <label htmlFor="enhance" className="text-sm text-slate-300 font-medium cursor-pointer flex flex-col">
                                                Devolver prompt oculto
                                                <span className="text-xs text-slate-500 font-normal">
                                                    Analiza automáticamente tu creación devolviendo el diagnóstico detallado (Gemini Vision)
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    <section
                        className="flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden relative transition-all duration-700 w-full"
                        style={{ aspectRatio: aspectRatio.replace(':', '/'), minHeight: '300px', maxHeight: '85vh' }}
                    >
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
                </div>
            </main>

            <footer className="mt-auto py-8 text-slate-600 text-sm">
                Potenciado por Gemini API & Imagen 3.0
            </footer>
        </div >
    );
}

export default App;
