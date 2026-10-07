import test from "node:test";
import assert from "node:assert/strict";
import {
  introduction,
  guardianStories,
  guardianDialogue,
  rescueDialogue,
} from "../story.js";
import { scenePositions } from "../city.js";
import { locations } from "../locations.js";
import { missions } from "../game.js";
test("all 24 guardians have personal dialogue, alternative replies, task and rescued state", () => {
  assert.equal(guardianStories.length, 24);
  assert.equal(new Set(guardianStories.map((s) => s[0])).size, 24);
  for (const p of locations) {
    const before = guardianDialogue(p.id),
      after = guardianDialogue(p.id, true);
    assert.equal(before[0].speaker, p.name);
    assert.equal(before[0].portrait, p.id);
    assert.equal(before[1].choices.length, 2);
    assert.notEqual(
      before[1].choices[0].next[0].text,
      before[1].choices[1].next[0].text,
    );
    assert.equal(before[2].text, missions[p.id]);
    assert.equal(after[0].text, guardianStories[p.id][2]);
    assert.ok(after.every((f) => !f.choices));
  }
  assert.throws(() => guardianDialogue(24));
});
test("opening and milestone dialogue explain the conflict and reconcile villain at the finale", () => {
  const intro = introduction("Наши герои");
  assert.ok(intro.some((f) => f.text.includes("Наши герои")));
  assert.ok(intro.some((f) => f.speaker === "Забывайка"));
  assert.equal(intro.at(-1).choices.length, 2);
  for (const goal of [5, 12, 24])
    assert.ok(
      rescueDialogue(0, { goal }).some((f) => f.speaker === "Забывайка"),
    );
  assert.equal(rescueDialogue(0).length, 1);
  assert.match(
    rescueDialogue(0, { goal: 24 }).at(-2).text,
    /не буду прятать город/,
  );
});
test("every scene point is reachable and separated at the mobile panorama size", () => {
  assert.equal(scenePositions.length, 24);
  for (const [x, y] of scenePositions) {
    assert.ok(x > 4 && x < 96);
    assert.ok(y > 5 && y < 95);
  }
  for (let i = 0; i < scenePositions.length; i++)
    for (let j = i + 1; j < scenePositions.length; j++) {
      const [x1, y1] = scenePositions[i],
        [x2, y2] = scenePositions[j];
      assert.ok(
        Math.abs(x1 - x2) * 7.2 > 44 || Math.abs(y1 - y2) * 4.8 > 48,
        `overlapping markers ${i}/${j}`,
      );
    }
});
