# Use official Node image
FROM node:18

# Create app directory
WORKDIR /app

# Copy files
COPY package*.json ./
RUN npm install

COPY . .

# Expose port
EXPOSE 5000

# Start app
CMD ["npm", "run", "dev"]
