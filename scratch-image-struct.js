const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { GoogleGenAI } = require('@google/genai');

async function run() {
    try {
        const ai = new GoogleGenAI({ vertexai: { project: process.env.GOOGLE_CLOUD_PROJECT, location: 'us-central1' } });
        const result = await ai.models.generateImages({
            model: "imagen-3.0-generate-001",
            prompt: "A quick test image of a futuristic city",
            config: { numberOfImages: 1, outputMimeType: "image/jpeg" }
        });
        const img = result.generatedImages[0];
        console.log("Image keys:", Object.keys(img));
        if (img.image) {
            console.log("Key image exists. Keys inside:", Object.keys(img.image));
            const imageBytes = img.image.imageBytes;
            console.log("imageBytes type:", typeof imageBytes, "length:", imageBytes ? imageBytes.length : 0);
        }
    } catch (e) {
        console.error(e);
    }
}
run();
