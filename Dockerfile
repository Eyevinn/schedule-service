FROM node:24-slim

WORKDIR /app
ADD . .
RUN npm install
RUN npm run build
CMD ["npm", "start"]
