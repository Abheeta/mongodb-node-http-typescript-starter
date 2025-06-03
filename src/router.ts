import { IncomingMessage, ServerResponse } from 'http';
import { insertUser, deleteAllUsers, getUserWithPostsAndComments, deleteUserById, postUserById} from './controllers/User';

// Utility: Read and parse request body
async function parseRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

const routes: Record<string, Handler> = {
  'GET /load': async (_req, res) => {
    res.writeHead(200);
    res.end();
  },

  'DELETE /users': async (_req, res) => {
    await deleteAllUsers();
    res.writeHead(204);
    res.end();
  },

  'PUT /users': async (req, res) => {
    try {
      const user = await parseRequestBody(req);
      const message = await insertUser(user);

      res.writeHead(201, {
        'Content-Type': 'application/json',
        'Link': `<http://localhost:3000/users/${user.id}>; rel="self"`,
      });
      res.end(JSON.stringify({ message }));
    } catch (err: any) {
      if (err.message === 'USER_EXISTS') {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'User already exists' }));
      } else if (err.message === 'INVALID_USER_DATA') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid user data' }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
  },
};

export async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const method = req.method || '';
  const url = req.url || '';
  const routeKey = `${method} ${url}`;

  try {
    if (routes[routeKey]) {
      return await routes[routeKey](req, res);
    }

    // Handle GET /users/:userId
    if (method === 'GET' && url.startsWith('/users/')) {
      const userId = url.split('/')[2];
      const user = await getUserWithPostsAndComments(userId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(user));
      return;
    }

    // Handle DELETE /users/:userId
    if (method === 'DELETE' && url.startsWith('/users/')) {
      const userId = url.split('/')[2];
      try {
        const message = await deleteUserById(userId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message }));
      } catch (err: any) {
        if (err.message === 'INVALID_ID') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid user ID' }));
        } else if (err.message === 'NOT_FOUND') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `User with id ${userId} not found.` }));
        } else {
          throw err;
        }
      }
      return;
    }

    // Handle POST /users/:userId
    if (method === 'POST' && url.startsWith('/users/')) {
      const userId = url.split('/')[2];
      try {
        const body = await parseRequestBody(req);
        if (!body.id || body.id.toString() !== userId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'userId in URL and body must match' }));
          return;
        }

        const updated = await postUserById(userId, body);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Link': `<http://localhost:3000/users/${userId}>; rel="self"`,
        });
        res.end(JSON.stringify(updated));
      } catch (err: any) {
        if (err.message === 'NOT_FOUND') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `User with id ${userId} not found.` }));
        } else {
          throw err;
        }
      }
      return;
    }

    // Fallback: 404 Not Found
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } catch (err) {
    // Global error fallback
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}
