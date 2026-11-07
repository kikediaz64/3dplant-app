import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      for (const ext of ['.ts', '.tsx']) {
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

const { diagnosisCare } = await import('../services/careGuide.ts');
const { plantStorage } = await import('../services/plantStorage.ts');
const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const { default: PlantDetail } = await import('../screens/PlantDetail.tsx');
const { default: PlantCard } = await import('../components/PlantCard.tsx');
const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: key => store.delete(key)
};
const base = { name: 'Tomate', scientificName: 'Solanum lycopersicum', location: 'Huerto', image: '', status: 'healthy', isToxic: false, needsWater: false, nextWatering: 'Mañana' };
const renderDetail = id => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [`/plant/${id}`] },
  React.createElement(Routes, null, React.createElement(Route, { path: '/plant/:id', element: React.createElement(PlantDetail) }))));

test('la guía simulada se guarda, se recupera y aparece en el detalle y en el reescaneo', () => {
  store.clear();
  const careGuide = { origin: 'Sudamérica', soil: 'Suelo drenante', fertilizer: 'Abono para tomate', seasonal: 'Proteger de heladas', watering: 'Regar al secarse la superficie, sin mojar hojas.', light: 'Sol directo', temperature: '20-28°C', humidity: 'Ventilación adecuada', commonPests: ['Mosca blanca'] };
  const plant = plantStorage.savePlant({ ...base, ...diagnosisCare(careGuide) });
  const saved = plantStorage.getSavedPlants()[0];
  assert.deepEqual(saved.careGuide, careGuide);
  assert.deepEqual(saved.careDetails, { light: careGuide.light, water: careGuide.watering, temp: careGuide.temperature, humidity: careGuide.humidity });
  const html = renderDetail(plant.id);
  for (const value of Object.values(careGuide).flat()) assert.ok(html.includes(value), value);
  assert.match(html, /Próximo riego: Mañana/);
  plantStorage.addDiagnosis(plant.id, { id: 'new', date: new Date().toISOString(), image: '', problems: [], recommendations: [] }, { status: 'healthy', image: '', ...diagnosisCare({ watering: 'Riego revisado' }) });
  assert.equal(plantStorage.getSavedPlants()[0].careGuide.watering, 'Riego revisado');
  assert.match(renderDetail(plant.id), /Riego revisado/);
});

test('sin guía no se inventan cuidados y las vistas muestran la ausencia de datos', () => {
  store.clear();
  const care = diagnosisCare(undefined);
  assert.deepEqual(care.careDetails, { light: '', water: '', temp: '', humidity: '' });
  const plant = plantStorage.savePlant({ ...base, ...care });
  const html = renderDetail(plant.id);
  assert.match(html, /Sin datos para esta planta: haz un diagnóstico nuevo para verlos/);
  assert.doesNotMatch(html, /Media|18-24°C|Originaria de regiones tropicales/);
  const card = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(PlantCard, { plant })));
  assert.match(card, /Riego: Sin datos/);
  assert.doesNotMatch(card, /Media|18-24°C/);
});

test('campos malformados de IA o de plantas importadas no rompen el detalle', () => {
  store.clear();
  const invalid = { origin: 42, watering: {}, light: false, commonPests: 'pulgón' };
  assert.equal(diagnosisCare(invalid).careDetails.water, '');
  const plant = plantStorage.savePlant({ ...base, ...diagnosisCare(undefined), careGuide: invalid });
  assert.match(renderDetail(plant.id), /Sin datos para esta planta/);
  assert.deepEqual(diagnosisCare({ commonPests: [null, 42, ' Cochinilla ', ''] }).careGuide.commonPests, ['Cochinilla']);
});

test('un reescaneo sin guía o con campos vacíos conserva los cuidados anteriores', () => {
  store.clear();
  const guide = { origin: 'Sudamérica', watering: 'Regar al secarse la superficie', light: 'Sol directo', temperature: '20-28°C', humidity: 'Ventilación adecuada', commonPests: ['Mosca blanca'] };
  const plant = plantStorage.savePlant({ ...base, ...diagnosisCare(guide) });
  const entry = { id: 'rescan', date: new Date().toISOString(), image: '', problems: [], recommendations: [] };
  for (const incoming of [undefined, {}, { watering: ' ', light: null, temperature: 42, commonPests: [] }]) {
    plantStorage.addDiagnosis(plant.id, entry, { status: 'healthy', image: 'nueva.jpg', ...diagnosisCare(incoming) });
    const saved = plantStorage.getSavedPlants()[0];
    assert.deepEqual(saved.careGuide, guide);
    assert.deepEqual(saved.careDetails, diagnosisCare(guide).careDetails);
    assert.equal(saved.image, 'nueva.jpg');
  }
  plantStorage.addDiagnosis(plant.id, entry, { status: 'healthy', image: '', ...diagnosisCare({ watering: 'Riego actualizado', commonPests: ['Pulgón'] }) });
  const saved = plantStorage.getSavedPlants()[0];
  assert.deepEqual(saved.careGuide, { ...guide, watering: 'Riego actualizado', commonPests: ['Pulgón'] });
  assert.deepEqual(saved.careDetails, { ...diagnosisCare(guide).careDetails, water: 'Riego actualizado' });
  assert.match(renderDetail(plant.id), /Riego actualizado/);
});

test('remedios muestra avisos generales sin pedir un diagnóstico que no aporta remedios', () => {
  store.clear();
  const plant = plantStorage.savePlant({ ...base, ...diagnosisCare(undefined) });
  const remedies = renderDetail(plant.id).split('Remedios caseros</h3>')[1];
  assert.ok(remedies);
  assert.doesNotMatch(remedies, /Sin datos para esta planta|leche|bicarbonato/);
  assert.match(remedies, /Muchos remedios virales son mitos/);
});

test('las plantas de ejemplo no muestran cuidados inventados en las tarjetas', async () => {
  const { MOCK_PLANTS } = await import('../constants.tsx');
  for (const plant of MOCK_PLANTS) {
    assert.deepEqual(plant.careDetails, { light: '', water: '', temp: '', humidity: '' });
    const card = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(PlantCard, { plant })));
    assert.doesNotMatch(card, /Media|20°C|18-24°C/);
    assert.match(card, /Riego: Sin datos/);
  }
});

const { otherCandidates } = await import('../services/diagnosisCandidates.ts');
test('las alternativas excluyen la especie actual, duplicados y scores bajos', () => {
  const candidate = (scientificName, score = 0.5) => ({ scientificName, score, commonNames: [], imageUrl: null });
  const result = { scientificName: 'Rosa canina', candidates: [candidate('ROSA CANINA'), candidate('Rosa gallica', 0.03), candidate('Rosa alba', 0.07), candidate('rosa alba'), candidate('Rosa rubiginosa')] };
  assert.deepEqual(otherCandidates(result).map(c => c.scientificName), ['Rosa alba', 'Rosa rubiginosa']);
  assert.deepEqual(otherCandidates({ scientificName: 'Rosa' }), []);
});

