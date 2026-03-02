const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');

async function run() {
    console.log("Iniciando prueba rápida de traducción con @google/genai...");

    try {
        const ai = new GoogleGenAI(
            process.env.GOOGLE_API_KEY
                ? { apiKey: process.env.GOOGLE_API_KEY }
                : { vertexai: { project: process.env.GOOGLE_CLOUD_PROJECT, location: 'us-central1' } }
        );

        const text = 'Hello world! This is a test to prove that my Google Cloud credentials and billing are working perfectly.';
        console.log(`\nTexto original (Inglés): "${text}"`);

        console.log("Enviando petición a Gemini para traducir...");
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Traduce el siguiente texto al español de forma natural:\n\n${text}`
        });

        console.log("\n==================================");
        console.log("✅ RESPUESTA EXITOSA DE GEMINI:");
        console.log(`Traducción (Español): "${result.text.trim()}"`);
        console.log("==================================\n");

    } catch (err) {
        console.error("\n❌ ERROR AL CONECTAR CON GEMINI TRANSLATION:");
        console.error(err.message || err);
    }
}

run();
