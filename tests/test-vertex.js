require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const path = require('path');
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '..', process.env.GOOGLE_APPLICATION_CREDENTIALS);
}
const { VertexAI } = require('@google-cloud/vertexai');

const { GoogleAuth } = require('google-auth-library');

async function run() {
    console.log("Iniciando prueba rápida con Vertex AI...");

    try {
        const auth = new GoogleAuth({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const authClient = await auth.getClient();

        const vertex_ai = new VertexAI({
            project: process.env.GOOGLE_CLOUD_PROJECT,
            location: 'us-central1'
        });

        // 2. Usar el modelo Gemini Flash
        const generativeModel = vertex_ai.preview.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                maxOutputTokens: 256,
            },
        });

        const request = {
            contents: [{ role: 'user', parts: [{ text: 'Hola Gemini Flash 1.5, esta es una prueba rápida vía Vertex AI. Confirma si nos escuchas.' }] }],
        };

        console.log(`Enviando petición a Vertex AI (Proyecto: ${process.env.GOOGLE_CLOUD_PROJECT}, Modelo: text-bison@002)...`);
        const resp = await generativeModel.generateContent(request);
        const contentResponse = resp.response.candidates[0].content.parts[0].text;

        console.log("\n==================================");
        console.log("✅ RESPUESTA EXITOSA DE VERTEX AI (GEMINI 1.5 FLASH):");
        console.log(contentResponse);
        console.log("==================================\n");

    } catch (err) {
        console.error("\n❌ ERROR AL CONECTAR CON VERTEX AI:");
        console.error(err.message || err);
        console.log("\nRevisa que el archivo gcp-credentials.json sea válido y que el proyecto tenga habilitada la API de Vertex AI.");
    }
}

run();
