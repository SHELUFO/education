FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY chem/package*.json ./chem/

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Build data
RUN cd chem && npm run build:data

# Expose port
EXPOSE 5188

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5188/ || exit 1

# Start application
CMD ["npm", "run", "start:chem"]