# Usar una imagen oficial liviana de Node.js basada en Alpine Linux
FROM node:20-alpine

# Establecer directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar archivos de configuración de dependencias
COPY package*.json ./

# Instalar dependencias esenciales de producción
RUN npm install --only=production

# Copiar todo el código fuente del proyecto
COPY . .

# Asegurar la creación de las carpetas de datos requeridas
RUN mkdir -p data/samples data/comparisons data/uploads

# Exponer el puerto del servidor (3000)
EXPOSE 3000

# Configurar variables de entorno recomendadas para producción
ENV NODE_ENV=production
ENV PORT=3000

# Comando por defecto para iniciar la aplicación
CMD ["npm", "start"]
