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
    const { prompt, images, mask, isEditing } = request.body;
    const editingMode = isEditing ? isEditing.value === 'true' : false;

    if (!prompt || !prompt.value) {
      return reply.status(400).send({ error: 'Prompt is required' });
    }

    let promptParts = [prompt.value];

    // Fastify-multipart makes 'images' either an object (if 1 file) or an array (if multiple)
    let uploadedImages = [];
    if (images) {
      console.log('Detectado campo images en body. Tipo:', Array.isArray(images) ? 'Array' : typeof images);
      uploadedImages = Array.isArray(images) ? images : [images];
    } else {
      console.log('No se detectó campo images en request.body');
    }

    console.log(`Procesando ${uploadedImages.length} imágenes adjuntas`);

    uploadedImages.forEach((img, idx) => {
      if (img && img.mimetype && img._buf) {
        console.log(`Imagen ${idx}: validada (${img.mimetype}), buffer de ${img._buf.length} bytes`);
        promptParts.push(fileToGenerativePart(img._buf, img.mimetype));
      } else {
        console.log(`Imagen ${idx}: inválida o sin buffer`);
      }
    });

    // For backwards compatibility with the edit workflow which expects exactly 1 base image
    const baseImage = uploadedImages.length > 0 ? uploadedImages[0] : null;

    // Wrap the generation call to extract the base64 image or handle text fallbacks if they behave differently
    const generateImage = async (modelName) => {
      try {
        if (modelName.includes('imagen')) {
          let result;
          if (editingMode && baseImage && baseImage._buf) {
            // Utilizamos el modelo de Imagen para Image-to-Image / Inpainting clásico
            const editModel = 'imagen-3.0-generate-001';
            console.log(`Ejecutando edición de imagen con ${editModel}`);

            const config = {
              numberOfImages: 1,
              outputMimeType: "image/jpeg",
              editMode: "INPAINT_INSERT"
            };

            // If a mask was provided from the frontend canvas, apply it
            if (mask && mask.value) {
              // Remove the "data:image/jpeg;base64," prefix from the string
              const maskBase64 = mask.value.replace(/^data:image\/[a-z]+;base64,/, "");
              config.mask = {
                mimeType: "image/jpeg",
                bytes: maskBase64
              };
            }

            result = await ai.models.editImage({
              model: editModel,
              prompt: prompt.value,
              referenceImage: {
                mimeType: image.mimetype,
                bytes: image._buf.toString('base64')
              },
              config: config
            });

            const img = result.generatedImages?.[0];

            if (img && img.image) {
              return {
                model: editModel,
                success: true,
                data: `data:${img.image.mimeType || 'image/jpeg'};base64,${img.image.imageBytes}`
              };
            }
            throw new Error(`El modelo ${editModel} no devolvió ninguna imagen editada.`);

          } else if (uploadedImages.length > 0) {
            // Generación base pero con referencias. Imagen 3 las ignora, así que usamos 
            // el nuevo modelo multimodal Gemini 3 Pro forzando responseModalities
            console.log(`Múltiples referencias detectadas. Cambiando a gemini-3-pro-image-preview...`);
            const fallbackModel = 'gemini-3-pro-image-preview';

            const fallbackResult = await ai.models.generateContent({
              model: fallbackModel,
              contents: promptParts,
              config: {
                responseModalities: ["IMAGE"],
                imageConfig: {
                  aspectRatio: "1:1",
                  imageSize: "2K"
                }
              }
            });

            // El resultado de este modelo viene dentro del candidato como un 'part' de imagen inline
            const candidate = fallbackResult.candidates?.[0];
            const imagePart = candidate?.content?.parts?.find(p => p.inlineData);

            if (imagePart && imagePart.inlineData) {
              return {
                model: fallbackModel,
                success: true,
                data: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
              };
            }

            throw new Error("gemini-3-pro-image-preview no devolvió ninguna imagen generada.");

          } else {
            // Modo generar sin imagen base: usamos generateImages de Imagen 3
            result = await ai.models.generateImages({
              model: modelName,
              prompt: prompt.value,
              config: {
                numberOfImages: 1,
                outputMimeType: "image/jpeg"
              }
            });

            const img = result.generatedImages?.[0];
            if (img && img.image) {
              return {
                model: modelName,
                success: true,
                data: `data:${img.image.mimeType || 'image/jpeg'};base64,${img.image.imageBytes}`
              };
            }
            throw new Error("El modelo de Imagen no devolvió datos requeridos.");
          }

        } else {
          // Utiliza generateContent para modelos Gemini textuales / vision (como flash fallback)
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
