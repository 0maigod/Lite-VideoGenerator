const { GoogleGenAI, RawReferenceImage } = require('@google/genai');

async function run() {
  const ai = new GoogleGenAI({ vertexai: { project: 'test-project', location: 'us-central1' } });
  
  // Intercept the request to spy on the exact payload structure!
  const originalFetch = global.fetch;
  global.fetch = async (url, opts) => {
    console.log(JSON.stringify(JSON.parse(opts.body), null, 2));
    return { ok: true, json: async () => ({}) };
  };

  const refImg = new RawReferenceImage();
  refImg.referenceId = 1;
  refImg.referenceType = 'TEM'; // anything
  refImg.referenceImage = {
    mimeType: 'image/jpeg',
    imageBytes: 'bWFjayBiYXNlNjQ='
  };

  try {
    await ai.models.editImage({
      model: 'imagen-3.0-capability-001',
      prompt: 'test prompt',
      referenceImages: [refImg],
      config: {
        editMode: "INPAINT_INSERT",
        mask: {
          mimeType: 'image/png',
          imageBytes: 'bWFjayBiYXNlNjQy'
        }
      }
    });
  } catch (e) {
    if (!e.message.includes('fetch')) {
      // Ignore response parse errors
    }
  }
}
run();
