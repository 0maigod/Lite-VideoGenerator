const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');

async function run() {
    console.log("Probando la API Key...");
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Hola, esto es una prueba corta. Responde únicamente con 'La API Key funciona perfectamente!'."
        });
        console.log("Respuesta de Gemini:\n", result.text);
    } catch (err) {
        console.error("Error al conectar con la API:\n", err.message || err);
    }
}
run();
