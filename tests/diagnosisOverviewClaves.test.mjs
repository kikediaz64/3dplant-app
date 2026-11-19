import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';

const { default: DiagnosisOverview } = await import('../components/diagnosis/DiagnosisOverview.tsx');
import { renderToStaticMarkup } from 'react-dom/server';

const render = titles => DiagnosisOverview({
  result: { healthStatus: 'Saludable' },
  topActions: titles.map(title => ({ title, description: `Detalle ${title}` })),
});
const list = tree => tree.props.children.at(-1).props.children[1];
const keys = titles => list(render(titles)).props.children.map(item => item.key);

test('las claves de acciones únicas se conservan al cambiar el orden', () => {
  assert.deepEqual(keys(['Poda', 'Riego']), keys(['Riego', 'Poda']).reverse());
});

test('desempata títulos repetidos sin colisiones ni depender de otras acciones', () => {
  const repeated = keys(['Poda', 'Poda', 'Poda-1']);
  assert.equal(new Set(repeated).size, 3);
  assert.deepEqual(keys(['Riego', 'Poda', 'Poda']).slice(1), repeated.slice(0, 2));
});

test('mantiene la lista numerada, los textos y el estado vacío', () => {
  const tree = render(['Poda', 'Riego']);
  assert.equal(list(tree).type, 'ol');
  assert.match(list(tree).props.className, /list-decimal/);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Qué hacer ahora/);
  assert.match(html, /<li[^>]*><span[^>]*>Poda<\/span><span[^>]*>Detalle Poda/);
  assert.equal(list(render([])).props.children, 'No hay acciones recomendadas.');
});
