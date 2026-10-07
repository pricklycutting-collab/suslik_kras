import { test, expect } from "@playwright/test";
async function advance(page) {
  await page.locator("#dialogue-next").click();
}
async function intro(page) {
  await page.goto("./");
  await page.locator("#team-name").fill("Светлячки");
  await page.locator("#welcome-start").click();
  await expect(page.locator("#dialogue-speaker")).toHaveText("Рассказчик");
  await advance(page);
  await expect(page.locator("#dialogue-text")).toContainText("Светлячки");
  await advance(page);
  await expect(page.locator("#dialogue-speaker")).toHaveText("Забывайка");
  await advance(page);
  await page
    .getByRole("button", {
      name: "А можно помочь самому Забывайке?",
      exact: true,
    })
    .click();
  await expect(page.locator("#dialogue-text")).toContainText(
    "друзей не нужно прятать",
  );
  await advance(page);
  await expect(page.locator("#dialogue")).not.toBeVisible();
}
test("intro choice, scene conversation, rescue gratitude and repeat visit form a complete story loop", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await intro(page);
  const photo = await page.screenshot();
  const point = page.locator('.city-point[data-id="8"]');
  await point.click();
  await expect(page.locator("#dialogue-speaker")).toHaveText("художник");
  await expect(page.locator("#dialogue-text")).toContainText("красок");
  await advance(page);
  await page
    .getByRole("button", { name: "Что поможет вернуть память?", exact: true })
    .click();
  await expect(page.locator("#dialogue-text")).toContainText(
    "краски ещё прячутся",
  );
  await page.screenshot({ path: "test-results/story-mobile.png" });
  await advance(page);
  await expect(page.locator("#dialogue-text")).toContainText("три цвета");
  await advance(page);
  await advance(page);
  await expect(page.locator("#detail-title")).toHaveText("художник");
  await page.locator("#mission-done").check();
  await page
    .locator("#photo")
    .setInputFiles({ name: "visit.png", mimeType: "image/png", buffer: photo });
  await page.locator("#save").click();
  await expect(page.locator("#dialogue-text")).toContainText(
    "вернули мою палитру",
  );
  await advance(page);
  await expect(page.locator("#detail")).not.toBeVisible();
  await expect(point).toHaveClass(/found/);
  await expect(page.locator("#counter")).toHaveText("1 / 24");
  await point.click();
  await expect(page.locator("#dialogue-text")).toContainText(
    "вернули мою палитру",
  );
  await page.locator("#dialogue-close").click();
  await expect(page.locator("#detail")).not.toBeVisible();
  await page.reload();
  await expect(page.locator("#welcome")).not.toBeVisible();
  await expect(page.locator("#dialogue")).not.toBeVisible();
  await expect(page.locator("#counter")).toHaveText("1 / 24");
  expect(errors).toEqual([]);
});
test("cancelling a conversation never unlocks a guardian and all scene points are accessible on phones", async ({
  page,
}) => {
  await intro(page);
  const all = page.locator(".city-point");
  await expect(all).toHaveCount(24);
  for (let id = 0; id < 24; id++) {
    const p = page.locator(`.city-point[data-id="${id}"]`);
    await p.click();
    await expect(page.locator("#dialogue")).toBeVisible();
    await page.locator("#dialogue-close").click();
    await expect(page.locator("#detail")).not.toBeVisible();
  }
  await expect(page.locator("#counter")).toHaveText("0 / 24");
  await expect(page.locator(".city-point.found")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator('.city-point[data-id="23"]').click();
  await page.locator("#dialogue-skip").click();
  await expect(page.locator("#detail-title")).toHaveText("с зонтиком");
});
