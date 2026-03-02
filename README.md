# Gemini Image Generator

Aplicación Fullstack para generar imágenes usando la API de Gemini (Imagen 3.0).

## Requisitos

- Node.js instalado.
- Una Google AI API Key (puedes obtenerla en [Google AI Studio](https://aistudio.google.com/)).

## Configuración

1. Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:
   ```env
   GOOGLE_API_KEY=tu_api_key_aqui
   PORT=3001
   ```

## Cómo ejecutar

### 1. Servidor (Backend)
En la raíz del proyecto:
```bash
npm install
node server.js
```

### 2. Cliente (Frontend)
En la carpeta `client`:
```bash
cd client
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

## Estructura del Proyecto

- `server.js`: Servidor Fastify que procesa el prompt y la imagen usando el SDK de Google Generative AI.
- `client/`: Carpeta del frontend (React + Vite + Tailwind CSS).
- `client/src/App.jsx`: Componente principal que maneja el formulario y la generación.
