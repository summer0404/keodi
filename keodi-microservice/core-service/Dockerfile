FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install && npm install -g wait-port

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3003

CMD wait-port kafka:9092 && npx prisma migrate deploy && npm run start