const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');

async function run() {
    console.log("Probando la generación de imágenes...");
    try {
        const ai = new GoogleGenAI(
            process.env.GOOGLE_API_KEY
                ? { apiKey: process.env.GOOGLE_API_KEY }
                : { vertexai: { project: process.env.GOOGLE_CLOUD_PROJECT, location: 'us-central1' } }
        );

        const result = await ai.models.generateImages({
            model: "imagen-3.0-generate-001",
            prompt: "Una prueba corta de una ciudad futurista",
            config: {
                numberOfImages: 1,
                outputMimeType: "image/jpeg"
            }
        });
        console.log("Respuesta obtenida con éxito!");

        if (result.generatedImages && result.generatedImages.length > 0) {
            console.log("¡Se generó una imagen correctamente!");
            console.log("Imagen disponible en formato Base64");
        } else {
            console.log("No devolvió imagen.");
        }
    } catch (err) {
        console.error("Error al conectar con la API:\n", err.message || err);
    }
}
run();
