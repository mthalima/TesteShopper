# Use an official Node.js runtime as a parent image
FROM node:18 AS frontend-builder

# Set the working directory
WORKDIR /backend/frontend
ENV GOOGLE_API_KEY = YOUR_GOOGLE_API_KEY
EXPOSE 80

# Copy the frontend package.json and install dependencies
COPY /package*.json ./
RUN npm install

# Copy the frontend source code and build it
COPY frontend/ ./
RUN npm run build

# Use another Node.js runtime as a parent image for the backend
FROM node:18

# Set the working directory
WORKDIR /backend

# Copy the backend package.json and install dependencies
COPY ./package*.json ./
RUN npm install

# Copy the build from the frontend-builder stage
COPY --from=frontend-builder /backend/frontend/build ./public

# Copy the backend source code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Command to run the backend
CMD ["npm", "run", "dev"]