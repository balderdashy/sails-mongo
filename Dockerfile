FROM nodesource/node:4.2

ADD package.json package.json
RUN npm install
ADD . .

CMD ["npm","test"]
