import { useState } from 'react';
import { ImagePlus, Send, Loader2, Sparkles } from 'lucide-react';

function App() {
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [originalText, setOriginalText] = useState(null);
    const [error, setError] = useState(null);

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
        if (image) {
            formData.append('image', image);
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
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Prompt</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Un astronauta cabalgando un unicornio en Marte, estilo digital art..."
                                className="w-full h-32 bg-slate-800 border-white/5 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 text-wrap">Imagen de Referencia (Opcional)</label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="hidden"
                                    id="image-upload"
                                />
                                <label
                                    htmlFor="image-upload"
                                    className="flex flex-col items-center justify-center w-full h-40 bg-slate-800 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-slate-800/80 hover:border-blue-500/50 transition-all overflow-hidden"
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <ImagePlus className="w-8 h-8 text-slate-500 mb-2" />
                                            <span className="text-slate-500 text-sm">Haz clic para subir imagen</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !prompt}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors overflow-hidden"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Generar Imagen
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
                            <img src={result} alt="Generated" className="w-full h-auto rounded-lg shadow-2xl" />
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
        </div>
    );
}

export default App;
