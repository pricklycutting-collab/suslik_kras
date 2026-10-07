import test from "node:test";
import assert from "node:assert/strict";
import {
  missions,
  chapter,
  earned,
  milestoneForNewVisit,
  backupPayload,
  validateBackup,
  walks,
} from "../game.js";
import { locations } from "../locations.js";
const visit = {
  id: 0,
  photo: "data:image/jpeg;base64,/9j/AA==",
  date: "2026-10-07T12:00:00Z",
};
test("first victory, next chapter and finale occur at 5, 12 and 24 unique visits", () => {
  assert.equal(chapter(0).goal, 5);
  assert.equal(chapter(4).goal, 5);
  assert.equal(chapter(5).goal, 12);
  assert.equal(chapter(12).goal, 24);
  assert.equal(earned(4).length, 0);
  assert.equal(earned(5).length, 1);
  assert.equal(earned(24).length, 3);
  assert.equal(milestoneForNewVisit(4, 5).goal, 5);
  assert.equal(milestoneForNewVisit(5, 5), null);
  assert.equal(milestoneForNewVisit(23, 24).goal, 24);
});
test("backup round trip preserves visit identity, photo, date and team", () => {
  const parsed = validateBackup(
    JSON.parse(JSON.stringify(backupPayload(new Map([[0, visit]]), "Семья"))),
  );
  assert.deepEqual(parsed, { team: "Семья", visits: [visit] });
});
test("malformed backups cannot inject unknown identities, duplicate points or unsafe photo URLs", () => {
  const base = () => backupPayload(new Map([[0, visit]]));
  for (const mutate of [
    (b) => (b.version = 2),
    (b) => (b.team = "<".repeat(41)),
    (b) => b.visits.push(visit),
    (b) => (b.visits[0] = { ...visit, id: 24 }),
    (b) => (b.visits[0] = { ...visit, id: "0" }),
    (b) => (b.visits[0] = { ...visit, photo: "javascript:alert(1)" }),
    (b) => (b.visits[0] = { ...visit, date: "yesterday" }),
    (b) => (b.visits[0] = { ...visit, photo: "data:image/jpeg;base64,@@@" }),
  ]) {
    const b = base();
    mutate(b);
    assert.throws(() => validateBackup(b));
  }
  assert.throws(() => validateBackup(null));
  assert.throws(() =>
    validateBackup({
      format: "suslik-kras",
      version: 1,
      team: "",
      visits: Array(25).fill(visit),
    }),
  );
});
test("all guardians have distinct family missions and walk selections refer to actual points", () => {
  assert.equal(missions.length, 24);
  assert.equal(new Set(missions).size, 24);
  for (const walk of walks) {
    assert.equal(new Set(walk.ids).size, walk.ids.length);
    assert.ok(walk.ids.every((id) => locations.some((p) => p.id === id)));
  }
});
