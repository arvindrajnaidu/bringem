FROM node

COPY . /bringem

RUN cd /bringem; npm install;

EXPOSE  80
EXPOSE  443

CMD ["node", "/bringem/server/server.js"]