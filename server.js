const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

// Configuración de CORS
fastify.register(require('@fastify/cors'), {
  origin: '*',
});

// Configuración de Multipart (para subir archivos)
fastify.register(require('@fastify/multipart'), {
  attachFieldsToBody: true,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const ai = new GoogleGenAI(
  process.env.GOOGLE_API_KEY
    ? { apiKey: process.env.GOOGLE_API_KEY }
    : { vertexai: { project: process.env.GOOGLE_CLOUD_PROJECT, location: 'us-central1' } }
);

// Helper function to convert Buffer to Gemini inlineData format
function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    },
  };
}

fastify.post('/generate', async (request, reply) => {
  try {
    const { prompt, image, isEditing } = request.body;
    const editingMode = isEditing ? isEditing.value === 'true' : false;

    if (!prompt || !prompt.value) {
      return reply.status(400).send({ error: 'Prompt is required' });
    }

    // Because the public Gemini API might not have access to Imagen 3 via standard REST
    // without Vertex AI, we will use a text model just to test the integration flow.
    // If you have Nano Banana (Imagen 3) access, the endpoint might be slightly different.

    let promptParts = [prompt.value];

    if (image && image.mimetype && image._buf) {
      promptParts.push(fileToGenerativePart(image._buf, image.mimetype));
    }

    // Wrap the generation call to extract the base64 image or handle text fallbacks if they behave differently
    const generateImage = async (modelName) => {
      try {
        if (modelName.includes('imagen')) {
          let result;
          if (editingMode && image && image._buf) {
            // Fallback a Flash para editar si Imagen falla por permisos o sintaxis
            const flashResult = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [
                prompt.value,
                fileToGenerativePart(image._buf, image.mimetype)
              ]
            });

            // Esto nos da texto, no una imagen directa. Para lograr una modificación REAL
            // de imagen, necesitaríamos una API de inpainting funcionando. Como Imagen 3 da 500,
            // detendremos el proceso de edición aquí y arrojaremos un error explicando que
            // la edición de Imagen 3 no está disponible en la cuenta.
            throw new Error("La edición de imagen (Inpainting) con Imagen 3 no está habilitada en tu cuota o región actual en Google Cloud. El endpoint devuelve error interno (500).");

          } else {
            // Modo generar: usamos generateImages
            result = await ai.models.generateImages({
              model: modelName,
              prompt: prompt.value,
              config: {
                numberOfImages: 1,
                outputMimeType: "image/jpeg"
              }
            });
          }

          const img = result.generatedImages?.[0];
          if (img && img.image) {
            return {
              model: modelName,
              success: true,
              data: `data:${img.image.mimeType || 'image/jpeg'};base64,${img.image.imageBytes}`
            };
          }
          throw new Error("El modelo de Imagen no devolvió datos requeridos.");
        } else {
          // Utiliza generateContent para modelos Gemini textuales / vision
          const result = await ai.models.generateContent({
            model: modelName,
            contents: promptParts
          });

          const text = result.text || '';
          return {
            model: modelName,
            success: true,
            originalText: text,
            data: `https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(text.substring(0, 50))}`
          };
        }
      } catch (err) {
        return {
          model: modelName,
          success: false,
          error: err.message || err.toString()
        };
      }
    };

    // Run both generations concurrently usando los modelos más capacitados/nuevos
    const [imagenResult, flashResult] = await Promise.all([
      generateImage('imagen-3.0-generate-001'),
      generateImage('gemini-2.5-flash')
    ]);

    return {
      success: true,
      results: [imagenResult, flashResult]
    };

  } catch (error) {
    fastify.log.error(error);

    // Extraer el mensaje específico de Google Generative AI si existe
    let errorMessage = error.message || 'Error desconocido al generar la imagen';

    // Si fue un problema de cuota, API key o modelo
    if (errorMessage.includes('fetch')) {
      errorMessage = 'Error de conexión con la API de Google.';
    } else if (errorMessage.includes('key')) {
      errorMessage = 'Error con la API Key (inválida o sin permisos).';
    } else if (errorMessage.includes('404') || errorMessage.includes('503')) {
      errorMessage = `El modelo o endpoint de Imagen no está disponible o no tiene capacidad: ${errorMessage}`;
    }

    return reply.status(500).send({
      error: errorMessage,
      details: error.stack || error.toString()
    });
  }
});

const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
