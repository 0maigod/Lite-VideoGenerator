const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: 'dummy' });
console.log(Object.keys(ai.models));
