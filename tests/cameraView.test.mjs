import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      for (const ext of ['.ts', '.tsx', '.mjs']) {
        if (existsSync(new URL(url.href + ext))) return next(url.href + ext, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.tsx?$/.test(url)) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
      }).outputText
    };
    return next(url, context);
  }
});

const { default: CameraView } = await import('../screens/CameraView.tsx');
const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { MemoryRouter } = await import('react-router-dom');

test('CameraView presenta el contador, la captura y el diagnóstico cuando hay fotos', () => {
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(CameraView)));
  assert.match(html, /0\/3 fotos/);
  assert.match(html, /capture="environment"/);
  assert.doesNotMatch(html, /Diagnosticar \(/);
});

test('CameraView limita la colección a tres, permite quitar miniaturas y advierte sobre una foto mala', async () => {
  const source = readFileSync(new URL('../screens/CameraView.tsx', import.meta.url), 'utf8');
  assert.match(source, /photosRef\.current\.length >= 3/);
  assert.match(source, /Puedes añadir hasta 3 fotos\./);
  assert.match(source, /aria-label=\{`Quitar foto \$\{index \+ 1\}`\}/);
  assert.match(source, /updatePhotos\(photosRef\.current\.filter\(\(_, i\) => i !== index\)\)/);
  assert.match(source, /assessPhoto\(photo\)/);
  assert.match(source, /window\.confirm\(warning \+ ' Puedes continuar igualmente\.'\)/);
});
