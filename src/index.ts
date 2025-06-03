import http from 'http';
import { handleRequest } from './router';

const server = http.createServer(handleRequest);

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
