FROM node

COPY . /bringem

RUN cd /bringem; npm install;

EXPOSE  5000

CMD ["node", "/bringem/server/server.js"]