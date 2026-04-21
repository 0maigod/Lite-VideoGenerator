const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const { GoogleAuth } = require('google-auth-library');
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
    const { prompt, images, mask, isEditing, enhancePrompt, aspectRatio, imageSize } = request.body;
    const editingMode = isEditing ? isEditing.value === 'true' : false;
    const shouldEnhance = enhancePrompt ? enhancePrompt.value === 'true' : false;
    const ratio = aspectRatio ? aspectRatio.value : '1:1';
    const resolution = imageSize ? imageSize.value : '2K';

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
            const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
            const client = await auth.getClient();
            const token = await client.getAccessToken();
            const project = process.env.GOOGLE_CLOUD_PROJECT || await auth.getProjectId();

            const payload = {
              instances: [
                {
                  prompt: prompt.value,
                  referenceImages: [
                    {
                      referenceType: "REFERENCE_TYPE_RAW",
                      referenceImage: { bytesBase64Encoded: baseImage._buf.toString('base64'), mimeType: baseImage.mimetype || 'image/jpeg' },
                      referenceId: 1
                    }
                  ]
                }
              ],
              parameters: {
                editMode: "EDIT_MODE_DEFAULT", // Fallback to global Image-to-Image style if no mask is provided
                numberOfImages: 1,
                outputMimeType: "image/jpeg"
              }
            };

            if (mask && mask.value) {
              payload.parameters.editMode = "EDIT_MODE_INPAINT_INSERTION"; // Switch to strict regional inpainting because a mask exists
              const maskBase64 = mask.value.replace(/^data:image\/[a-z]+;base64,/, "");
              payload.instances[0].referenceImages.push({
                referenceType: "REFERENCE_TYPE_MASK",
                referenceImage: { bytesBase64Encoded: maskBase64, mimeType: "image/jpeg" }, // Note: App.jsx mask is image/jpeg
                referenceId: 2,
                maskImageConfig: { maskMode: 'MASK_MODE_USER_PROVIDED' }
              });
            }

            const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${project}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;
            
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token.token}`, 
                'Content-Type': 'application/json' 
              },
              body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error?.message || "Error generating image");
            }

            const prediction = data.predictions?.[0];
            if (prediction && prediction.bytesBase64Encoded) {
              return {
                model: 'imagen-3.0-generate-001',
                success: true,
                data: `data:${prediction.mimeType || 'image/jpeg'};base64,${prediction.bytesBase64Encoded}`
              };
            } else {
              throw new Error("No image was successfully generated");
            }

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
                  aspectRatio: ratio,
                  imageSize: resolution
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
                outputMimeType: "image/jpeg",
                aspectRatio: ratio
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
            isTextOnly: true
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

    // Run both generations concurrently usando los modelos más capacitados/nuevos si se requiere
    const promises = [generateImage('imagen-3.0-generate-001')];
    if (shouldEnhance) {
      promises.push(generateImage('gemini-2.5-flash'));
    }

    const results = await Promise.all(promises);

    return {
      success: true,
      results: results
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
