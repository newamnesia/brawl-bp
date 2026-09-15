import assert from "node:assert/strict";
import { test } from "node:test";
import { columnCenter, lowerRowCenter, TIDAL_WAVE, TIDAL_WAVE_WORLD } from "../src/features/miniGames/tidalWave.ts";
import { TILE_SIZE } from "../src/features/training/config.ts";

test("tidal wave divides the 21 by 33 map into a wall and 21 by 16 player area", () => {
  assert.equal(TIDAL_WAVE.mapColumns, 21);
  assert.equal(TIDAL_WAVE.mapRows, 33);
  assert.equal(TIDAL_WAVE.wallRow, 16);
  assert.equal(TIDAL_WAVE.lowerRows, 16);
  assert.equal(TIDAL_WAVE_WORLD.lowerTop - TIDAL_WAVE_WORLD.wallTop, TILE_SIZE);
});

test("player and vault use the middle column and requested lower-half rows", () => {
  assert.equal(columnCenter(TIDAL_WAVE.playerSpawn.column), 10.5 * TILE_SIZE);
  assert.equal(lowerRowCenter(TIDAL_WAVE.playerSpawn.rowFromBottom), 31.5 * TILE_SIZE);
  assert.equal(lowerRowCenter(TIDAL_WAVE.vaultSpawn.rowFromBottom), 29.5 * TILE_SIZE);
});

test("mini Brock applies the sixty-percent combat scale without changing reload", () => {
  assert.equal(TIDAL_WAVE.miniBrock.health, 3000);
  assert.ok(Math.abs(TIDAL_WAVE.miniBrock.range - 9 * TILE_SIZE * 0.6) < 1e-9);
  assert.ok(Math.abs(TIDAL_WAVE.miniBrock.explosionRadius - 1.5 * TILE_SIZE * 0.6) < 1e-9);
  assert.equal(TIDAL_WAVE.miniBrock.damage, Math.round(2320 * 0.6));
  assert.equal(TIDAL_WAVE.miniBrock.reloadSeconds, 2.1);
  assert.equal(TIDAL_WAVE.miniBrock.selectSeconds, 0.5);
  assert.equal(TIDAL_WAVE.miniBrock.aimSeconds, 1);
});
