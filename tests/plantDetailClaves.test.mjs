import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import './helpers/tsLoader.mjs';

const [{ default: PlantCareSections }, { default: PlantDiagnosisDetails }] = await Promise.all([
  import('../components/plant-detail/PlantCareSections.tsx'),
  import('../components/plant-detail/PlantDiagnosisDetails.tsx'),
]);

const plant = {
  id: 'plant-1', name: 'Monstera', scientificName: 'Monstera deliciosa', location: 'Casa', image: '',
  status: 'healthy', needsWater: false, careDetails: { light: '', water: '', temp: '', humidity: '' }, nextWatering: 'mañana',
};

function findLists(node, found = []) {
  if (!React.isValidElement(node)) return found;
  if (node.type === 'ul') found.push(node);
  React.Children.forEach(node.props.children, child => findLists(child, found));
  return found;
}

function listKeys(component, texts) {
  const tree = component(texts);
  const expected = texts.join('');
  const list = findLists(tree).find(candidate => React.Children.toArray(candidate.props.children)
    .map(item => item.props.children).join('') === expected);
  assert.ok(list, `no se encontró la lista: ${expected}`);
  return React.Children.toArray(list.props.children).map(item => item.key);
}

const cases = [
  ['plagas comunes', texts => PlantCareSections({ plant, guide: { commonPests: texts }, exportReminder() {} })],
  ['problemas', texts => PlantDiagnosisDetails({ plant: { ...plant, diagnosis: { health: '', problems: texts, recommendations: [] } } })],
  ['recomendaciones', texts => PlantDiagnosisDetails({ plant: { ...plant, diagnosis: { health: '', problems: [], recommendations: texts } } })],
];

for (const [name, render] of cases) {
  test(`${name}: claves estables con textos repetidos y texto visible`, () => {
    const repeated = ['Pulgón', 'Mosca blanca', 'Pulgón'];
    const originalKeys = listKeys(render, repeated);
    assert.equal(new Set(originalKeys).size, repeated.length);
    assert.deepEqual(listKeys(render, ['Pulgón', 'Pulgón', 'Mosca blanca']), [originalKeys[0], originalKeys[2], originalKeys[1]]);

    const html = renderToStaticMarkup(render(['Pulgón', 'Mosca blanca', 'Pulgón']));
    assert.match(html, /Pulgón/);
    assert.match(html, /Mosca blanca/);
    assert.equal((html.match(/Pulgón/g) || []).length, 2);
  });
}
