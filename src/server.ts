import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request, Response } from 'express';
import { join } from 'node:path';
import { CustomRequest, setServerBE } from './server-BE';
import { MODE, ThemeMode } from './app/mode.token';
import { LANG } from './app/lang.token';
import { signal, REQUEST } from '@angular/core';
import { TOKEN } from './app/user.token';


const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

setServerBE(app);

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

app.use((req: CustomRequest, res, next) => {
  if (req.session && typeof req.session.token !== 'string') {
    const cookieToken = typeof req.cookies?.token === 'string' ? req.cookies.token.trim() : '';
    if (cookieToken) {
      req.session.token = cookieToken;
    }
  }

  next();
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req: CustomRequest, res, next) => {
  const coerceMode = (value?: string): ThemeMode => (value === 'dark' ? 'dark' : 'light');
  const coerceLang = (value?: string) => (value && value.trim() ? value : 'en');
  const coerceToken = (value?: string) => (value && value.trim() ? value : '');
  const mode = coerceMode(req.cookies?.mode);
  const lang = coerceLang(req.cookies?.lang);
  if (req.session?.token) {
    res.cookie('token', req.session.token, { path: '/' });
  }

   console.log('Session token2:', req.session?.token);
  const token = coerceToken(req.cookies?.token ?? req.session?.token);

  angularApp
    .handle(req, {
        providers: [
          { provide: MODE, useValue: signal<ThemeMode>(mode) },
          { provide: LANG, useValue: signal<string>(lang) },
          { provide: TOKEN, useValue: signal<string>(token) },
         { provide: REQUEST, useValue: req },
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
