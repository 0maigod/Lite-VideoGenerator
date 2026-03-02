const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { GoogleGenAI } = require('@google/genai');

async function listModels() {
    try {
        const ai = new GoogleGenAI(
            process.env.GOOGLE_API_KEY
                ? { apiKey: process.env.GOOGLE_API_KEY }
                : { vertexai: { project: process.env.GOOGLE_CLOUD_PROJECT, location: 'us-central1' } }
        );
        const models = [];
        const page = await ai.models.list();
        for await (const model of page) {
            models.push(model.name);
        }
        console.log(JSON.stringify(models, null, 2));
    } catch (err) {
        console.error("Error:", err.message);
    }
}
listModels();
