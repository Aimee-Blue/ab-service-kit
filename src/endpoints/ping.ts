import express from 'express';

export function ping(app: express.Express) {
  app.get('/ping', (_req, res) => {
    res.send("Yes, I'm rolling baby, doubly so!").status(200);
  });
}
