# Lite-VideoGenerator (Gemini Image Editor)

Aplicación Fullstack para generar y alterar imágenes potenciada por la API de Vertex AI (Imagen 3.0) de Google Cloud.

## ✨ Características Principales
- **Generación Text-to-Image:** Creación de imágenes de cero utilizando el endpoint original de generación.
- **Inpainting Inteligente Quirúrgico:** Edición regional mediante el uso de máscaras (brocha en el lienzo) enviadas a `imagen-3.0-capability-001`. El modelo preserva el resto de tu imagen y reconstruye solo lo pintado.
- **Edición Global Estructural:** Opción para transformar los colores, luz o estilo de la imagen entera preservando su composición y semántica, de manera automática si no se envían píxeles de máscara.
- **Gestión Avanzada de REST AI:** Reemplazo parcial del SDK oficial de GenAI por la API nativa de Vertex debido a su demanda estricta sobre la arquitectura JSON de `baseImage` y `maskImageConfig`.

## Requisitos

- Node.js instalado (v22 recomendada).
- Cuenta de Google Cloud con facturación y uso habilitado para Vertex AI.

## Configuración ⚙️

1. Crea o modifica un archivo `.env` en la raíz del proyecto (o usa `.env.local` si manejas multi-ambientes):
   ```env
   # Usado para Autenticación vía Google Auth Library
   GOOGLE_CLOUD_PROJECT=tu_id_de_proyecto_gcp
   PORT=3002
   ```

2. Permisos Locales: Asegúrate de tener gcloud CLI autenticada a nivel de máquina ejecutando `gcloud auth application-default login` para permitir que el backend autorice tus pasarelas usando tu proyecto local.

## Cómo ejecutar 🚀

### 1. Servidor (Backend)
Levanta los servicios Fastify y de proxy de inteligencia computacional.
En la raíz del proyecto:
```bash
npm install
node server.js
```

### 2. Cliente (Frontend)
Despliegue del cliente re-escrito en React + Vite.
En la carpeta `client`:
```bash
cd client
npm install
npm run dev
```

La aplicación estará disponible de forma interactiva en `http://localhost:5173`.

## Estructura del Proyecto

- `server.js`: Backbone de Node/Fastify encargado de validar imágenes por `multipart/form-data`, y direccionar a `imagen-3.0-generate-001` (creación) o `imagen-3.0-capability-001` (edición dinámica o inpainting).
- `client/`: Base Vite + React.
- `client/src/App.jsx`: Componente maestro de la UI. Maneja estados de carga cruzados, sistema de pintura y enmascaramiento con HTML Canvas2D y generación en Base64.
- `tests/`: Scripts modulares para testear respuestas directas de la capa REST sin interfaz visual.
