import { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { LIGHTING_STYLES } from './constants/lightingStyles';

// Componentes
import Header from './components/layout/Header';
import ActionToggle from './components/features/ActionToggle';
import JsonEditorModal from './components/editor/JsonEditorModal';
import MaskEditor from './components/editor/MaskEditor';
import LightingCarousel from './components/features/LightingCarousel';
import ModulesPanel from './components/panels/ModulesPanel';
import ConfigPanel from './components/panels/ConfigPanel';
import ResultViewer from './components/viewer/ResultViewer';

function App() {
    const [prompt, setPrompt] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    
    // Core state
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [originalText, setOriginalText] = useState(null);
    const [jsonResultText, setJsonResultText] = useState(null);
    const [error, setError] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    const [showModules, setShowModules] = useState(false);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [imageSize, setImageSize] = useState('1K');
    const [activeModules, setActiveModules] = useState([]);
    const useLighting = activeModules.includes('lighting');
    const useModelSheet = activeModules.includes('modelSheet');
    const enhancePrompt = activeModules.includes('enhancePrompt');
    const [selectedLighting, setSelectedLighting] = useState(null);

    const toggleModule = (moduleName) => {
        setActiveModules(prev => {
            const isActive = prev.includes(moduleName);
            if (isActive) {
                return prev.filter(m => m !== moduleName);
            } else {
                if (moduleName === 'lighting' && !selectedLighting) {
                    setSelectedLighting(LIGHTING_STYLES[0].id);
                }
                return [...prev, moduleName];
            }
        });
    };
    
    const [hasInteracted, setHasInteracted] = useState(false);

    // Canvas & Layout State
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Automatical Logo Collapse
    useEffect(() => {
        const timer = setTimeout(() => {
            setHasInteracted(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Initialize/Resize canvas when image preview changes or window resizes
    useEffect(() => {
        if (isEditing && imagePreviews.length > 0 && containerRef.current && canvasRef.current) {
            const container = containerRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            setTimeout(() => {
                const imgEl = container.querySelector('img');
                if (imgEl) {
                    canvas.width = imgEl.naturalWidth;
                    canvas.height = imgEl.naturalHeight;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }, 50);
        }
    }, [imagePreviews, isEditing]);

    // Helper to generate the final black and white mask
    const generateMaskBase64 = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const ctx = maskCanvas.getContext('2d');

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(canvas, 0, 0);

        const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;
        let hasMaskPixels = false;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
                hasMaskPixels = true;
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = 255;
            }
        }
        
        if (!hasMaskPixels) return null;
        
        ctx.putImageData(imageData, 0, 0);
        return maskCanvas.toDataURL('image/jpeg');
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            let selectedFiles;

            if (isEditing) {
                selectedFiles = [files[0]];
            } else {
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

            if (e.target) e.target.value = '';
        }
    };

    const handleRemoveImage = (indexToRemove) => {
        const newImages = images.filter((_, idx) => idx !== indexToRemove);
        const newPreviews = imagePreviews.filter((_, idx) => idx !== indexToRemove);

        setImages(newImages);
        setImagePreviews(newPreviews);

        if (newImages.length === 0 && canvasRef.current) {
            canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            const fileInput = document.getElementById('image-upload');
            if (fileInput) fileInput.value = '';
        }
    };

    const handleReorderImages = (dragIndex, dropIndex) => {
        if (dragIndex === dropIndex) return;

        setImages((prev) => {
            const newImages = [...prev];
            const [draggedItem] = newImages.splice(dragIndex, 1);
            newImages.splice(dropIndex, 0, draggedItem);
            return newImages;
        });

        setImagePreviews((prev) => {
            const newPreviews = [...prev];
            const [draggedItem] = newPreviews.splice(dragIndex, 1);
            newPreviews.splice(dropIndex, 0, draggedItem);
            return newPreviews;
        });
    };

    const handleUseAsReference = () => {
        if (!result) return;
        
        if (!isEditing && images.length >= 3) {
            alert("Ya has alcanzado el límite máximo de 3 imágenes de referencia.");
            return;
        }
        
        const arr = result.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const extension = mimeType.split('/')[1] || 'jpg';
        const b64Data = arr[1] || arr[0];

        try {
            const byteCharacters = atob(b64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
            const file = new File([blob], `generated-ref-${Date.now()}.${extension}`, { type: mimeType });
            
            if (isEditing) {
                setImages([file]);
                setImagePreviews([result]);
            } else {
                setImages(prev => [...prev, file]);
                setImagePreviews(prev => [...prev, result]);
            }
        } catch (error) {
            console.error("Error convirtiendo la imagen para referencia:", error);
        }
    };

    const handleDownload = async () => {
        if (!result) return;
        try {
            const arr = result.split(',');
            const mimeMatch = arr[0].match(/:(.*?);/);
            if (!mimeMatch || arr.length !== 2) return;
            const mimeType = mimeMatch[1];
            const extension = mimeType.split('/')[1] || 'jpg';
            const b64Data = arr[1];

            const byteCharacters = atob(b64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });

            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: `gemini-imagen.${extension}`,
                        types: [{ accept: { [mimeType]: [`.${extension}`] } }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return;
                }
            }

            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `gemini-imagen.${extension}`);
            document.body.appendChild(link);
            link.click();
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

        setLoading(true);
        setError(null);
        setResult(null);
        setOriginalText(null);
        setJsonResultText(null);
        // Cerramos paneles para enfocar en la carga
        setShowConfig(false);
        setShowModules(false);

        const formData = new FormData();

        let finalPrompt = prompt;
        if (!isEditing && useModelSheet) {
            finalPrompt = `Model reference sheet prompt: Generate a model reference sheet based on the provided image, with standard model proportions. Layout: Left panel: full-body views of the model – front, side, and back Right panel: headshots – front, profile, 3/4 view Background: plain white, evenly lit Style: realistic, high-detail, accurate anatomy, natural posture Ensure the model’s proportions, body structure, and facial features match the reference image. Output should be suitable for character turnaround reference, fashion model sheet, or 3D modeling reference. No explanatory text, no logo, no watermark, no UI interface elements, no like/save buttons, and no social-media-screenshot appearance. Additional user prompt: ${prompt}`;
        } else if (!isEditing && useLighting && selectedLighting) {
            const styleInfo = LIGHTING_STYLES.find(s => s.id === selectedLighting);
            if (styleInfo) {
                if (images.length > 0) {
                    finalPrompt = `Reilumina esta imagen llevandola al estilo elegido en ${styleInfo.name} (${styleInfo.promptInjection}). Prompt adicional del usuario: ${prompt}`;
                } else {
                    finalPrompt += `, ${styleInfo.promptInjection}`;
                }
            }
        }

        formData.append('prompt', finalPrompt);
        formData.append('isEditing', isEditing);
        formData.append('enhancePrompt', enhancePrompt);
        formData.append('aspectRatio', aspectRatio);
        formData.append('imageSize', imageSize);

        images.forEach((img) => formData.append('images', img));

        if (isEditing && images.length > 0 && canvasRef.current) {
            const maskBase64 = generateMaskBase64();
            if (maskBase64) formData.append('mask', maskBase64);
        }

        try {
            const response = await fetch('http://localhost:3002/generate', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            
            if (data.success && data.isJsonOnly) {
                setJsonResultText(data.jsonContent);
            } else if (data.success && data.results && data.results.length > 0) {
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

    const handleGenerateJson = async () => {
        if (images.length === 0) {
            setError("Sube al menos 1 imagen de referencia primero para que pueda analizarla.");
            setShowModules(false);
            return;
        }

        setLoading(true);
        setError(null);
        setJsonResultText(null);
        setShowModules(false);
        setShowConfig(false);

        const formData = new FormData();
        formData.append('jsonMode', 'true');
        // Gemini requerirá un prompt aunque mandemos el jsonMode, proveemos uno mínimo
        formData.append('prompt', "Analiza la imagen"); 
        
        // mandamos solo la primera imagen
        formData.append('images', images[0]);

        try {
            const response = await fetch('http://localhost:3002/generate', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            
            if (data.success && data.isJsonOnly) {
                setJsonResultText(data.jsonContent);
            } else {
                throw new Error(data.error || 'Generación fallida del JSON');
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Diseño centrado vs Expandido
    const isSplitLayout = loading || !!result || showConfig || showModules;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 md:py-6 md:px-12 overflow-x-hidden">
            <Header hasInteracted={hasInteracted} />

            <main className={`w-full flex flex-col lg:flex-row gap-8 transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isSplitLayout ? 'max-w-6xl' : 'max-w-2xl mx-auto'}`}>
                {/* Columna Izquierda - Formulario y Controles */}
                <section className="w-full lg:flex-1 min-w-0 space-y-6 flex flex-col relative z-30">
                    <form onSubmit={handleSubmit} className="bg-slate-900/50 p-6 rounded-2xl border border-white/10 space-y-4 shadow-xl">
                        <ActionToggle
                            showModules={showModules} setShowModules={setShowModules}
                            isEditing={isEditing} setIsEditing={setIsEditing}
                            images={images} canvasRef={canvasRef}
                            showConfig={showConfig} setShowConfig={setShowConfig}
                        />

                        <MaskEditor
                            isEditing={isEditing}
                            imagePreviews={imagePreviews}
                            handleImageChange={handleImageChange}
                            handleRemoveImage={handleRemoveImage}
                            handleReorderImages={handleReorderImages}
                            canvasRef={canvasRef}
                            containerRef={containerRef}
                        />

                        {activeModules.map(moduleName => {
                            if (moduleName === 'modelSheet' && !isEditing) {
                                return (
                                    <div key="modelSheet" className="w-full bg-[#fb5607]/10 rounded-xl border border-[#fb5607]/30 p-4 mt-2 transition-all duration-300 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                        <img src="/modulos/sheet.png" alt="Model Sheet" className="w-12 h-12 rounded-lg object-cover border border-[#fb5607]/50 shadow-[0_0_15px_rgba(251,86,7,0.3)]" />
                                        <div>
                                            <h4 className="text-sm font-bold text-[#fb5607]">Model Sheet Activo</h4>
                                            <p className="text-[10px] text-slate-400">Proporciones anatómicas estándar y turnaround 3D iluminado sobre blanco.</p>
                                        </div>
                                    </div>
                                );
                            }
                            
                            if (moduleName === 'lighting') {
                                return (
                                    <LightingCarousel
                                        key="lighting"
                                        isEditing={isEditing}
                                        useLighting={true}
                                        selectedLighting={selectedLighting}
                                        setSelectedLighting={setSelectedLighting}
                                    />
                                );
                            }
                            return null;
                        })}

                        <div className="w-full mt-2 relative">
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
                        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}
                </section>

                {/* Columna Derecha - Expansión Dinámica */}
                {isSplitLayout && (
                    <section className="w-full lg:flex-1 min-w-0 relative animate-in fade-in slide-in-from-right-8 duration-700 min-h-[400px]">
                        <ModulesPanel 
                            showModules={showModules}
                            activeModules={activeModules}
                            toggleModule={toggleModule}
                            handleGenerateJson={handleGenerateJson}
                        />
                        
                        <ConfigPanel
                            showConfig={showConfig}
                            aspectRatio={aspectRatio}
                            setAspectRatio={setAspectRatio}
                            imageSize={imageSize}
                            setImageSize={setImageSize}
                        />

                        <ResultViewer
                            loading={loading}
                            result={result}
                            originalText={originalText}
                            aspectRatio={aspectRatio}
                            handleDownload={handleDownload}
                            handleUseAsReference={handleUseAsReference}
                        />
                    </section>
                )}
            </main>

            <JsonEditorModal 
                jsonText={jsonResultText} 
                onClose={() => setJsonResultText(null)} 
            />
        </div>
    );
}

export default App;
