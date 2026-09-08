import test from 'node:test';
import assert from 'node:assert/strict';
import { isArtifactUrl, isImageArtifact } from '../src/lib/artifacts.ts';
test('only published local URLs are artifact links; raster images preview', () => {
  const prefix = '/files/1234567890abcdef/';
  assert.ok(isArtifactUrl(prefix + 'report.csv'));
  assert.ok(isImageArtifact(prefix + 'cat.PNG'));
  for (const url of [prefix+'report.pdf', prefix+'page.svg', prefix+'page.html']) assert.equal(isImageArtifact(url), false);
  for (const url of ['/Users/me/cat.png', 'https://example.com'+prefix+'cat.png', prefix+'../secret', prefix+'%2e%2e', '/files/bad/cat.png']) assert.equal(isArtifactUrl(url), false);
});
