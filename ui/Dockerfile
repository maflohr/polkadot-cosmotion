FROM node:19
ARG API_URL
ENV VUE_APP_API_URL $API_URL

RUN npm i -g @vue/cli

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "serve"]
