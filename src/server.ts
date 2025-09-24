import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request, Response } from 'express';
import { join } from 'node:path';
import { setServerBE } from './server-BE';
import { MODE, ThemeMode } from './app/mode.token';
import { LANG } from './app/lang.token';
import { signal } from '@angular/core';


const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

setServerBE(app);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/lang-switch', (req: Request, res: Response) => {
  const lang = req.body.lang;
  res.cookie('lang', lang, { path: '/' });
  res.redirect(303, req.get('referer') || '/');
});

app.post('/mode-switch', (req: Request, res: Response) => {
  const nextMode: ThemeMode = req.body.mode === 'dark' ? 'light' : 'dark';
  res.cookie('mode', nextMode, { path: '/' });
  res.redirect(303, req.get('referer') || '/');
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  const coerceMode = (value?: string): ThemeMode => (value === 'dark' ? 'dark' : 'light');
  const mode = coerceMode(req.cookies?.mode);
  const lang = req.cookies?.lang || 'en';

  angularApp
    .handle(req, {
        providers: [
          { provide: MODE, useValue: signal<ThemeMode>(mode) },
          { provide: LANG, useValue: signal<string>(lang) },
        ]
      })
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
