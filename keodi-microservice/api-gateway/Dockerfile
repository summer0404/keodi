FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install -g wait-port

COPY . .

RUN npm run build

EXPOSE 3000

CMD wait-port kafka:9092 && npm run start



