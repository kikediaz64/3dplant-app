import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

const { options: compilerOptions } = ts.convertCompilerOptionsFromJson(
  JSON.parse(readFileSync(new URL('../../tsconfig.json', import.meta.url), 'utf8')).compilerOptions,
  new URL('../../', import.meta.url).pathname
);

export function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL) {
    const url = new URL(specifier, context.parentURL);
    for (const ext of ['.ts', '.tsx', '.mjs']) {
      if (existsSync(new URL(url.href + ext))) return next(url.href + ext, context);
    }
  }
  return next(specifier, context);
}

export function load(url, context, next) {
  // mock.module añade parámetros a la URL; la extensión pertenece al pathname.
  if (/\.tsx?$/.test(new URL(url).pathname)) return {
    format: 'module', shortCircuit: true,
    source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
      fileName: new URL(url).pathname,
      compilerOptions
    }).outputText
  };
  return next(url, context);
}
