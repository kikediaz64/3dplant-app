import './helpers/tsLoader.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Cargar primero el grafo real: precargar React evita reproducir el fallo
// de interoperabilidad CommonJS de registerHooks en Node 22.15.
await import('../screens/CameraView.tsx');
const { default: React } = await import('react');
const { jsx } = await import('react/jsx-runtime');

test('el loader conserva React compartido y permite crear JSX tras cargar CameraView', () => {
  assert.equal(createRequire(import.meta.url)('react'), React);
  const element = jsx('div', { children: 'loader compatible' });
  assert.ok(React.isValidElement(element));
  assert.equal(element.props.children, 'loader compatible');
});
