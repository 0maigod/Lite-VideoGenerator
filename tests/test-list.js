const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');

async function run() {
    console.log("Consultando modelos disponibles en Vertex AI usando @google/genai...");
    try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT;
        const ai = new GoogleGenAI({
            vertexai: {
                project: projectId,
                location: 'us-central1', // Using us-central1 again as global is not well supported for listing models
            }
        });

        // Use pagination iterator if ai.models.list() provides it
        console.log(`Haciendo request a través del SDK @google/genai para el proyecto ${projectId}`);
        let modelsCount = 0;
        const geminiModels = [];
        try {
            const page = await ai.models.list();
            for await (const model of page) {
                modelsCount++;
                if (model.name && model.name.toLowerCase().includes('gemini')) {
                    geminiModels.push(model.name);
                }
            }
        } catch (listErr) {
            console.error("Error al listar modelos:", listErr.message || listErr);
        }

        console.log(`\n¡Éxito! Se encontraron ${modelsCount} modelos en total.`);
        console.log("Modelos Gemini disponibles:");
        geminiModels.forEach(m => console.log("- " + m));

    } catch (err) {
        console.error("\n❌ ERROR AL CONSULTAR MODELOS:");
        console.error(err.message || err);
    }
}

run();
