import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function start(page) {
  await page.goto("./");
  await expect(page.locator("#welcome")).toBeVisible();
  await page.locator("#team-name").fill("Енисейские следопыты");
  await page.locator("#welcome-start").click();
  await expect(page.locator(".card")).toHaveCount(24);
}
async function visit(page, id, photo) {
  await page.locator(`.card[data-id="${id}"]`).click();
  await page.locator("#mission-done").check();
  await page
    .locator("#photo")
    .setInputFiles({ name: "visit.png", mimeType: "image/png", buffer: photo });
  await page.locator("#save").click();
  await expect(page.locator("#message")).toContainText("сохранены");
  await page.locator("#detail .close").click();
}
test("mobile onboarding, artwork, search, selection and city buttons", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await expect(page.locator("#team-label")).toHaveText("Енисейские следопыты");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".card .sprite")).toHaveCount(24);
  await page.locator("#search").fill("поваренок");
  await expect(page.locator(".card")).toHaveCount(1);
  await page.locator("#search").fill("");
  await page.locator("#walk").selectOption("center");
  await expect(page.locator(".card")).toHaveCount(5);
  await page.locator(".city-point").first().click();
  await expect(page.locator("#detail-title")).toHaveText("айтишник");
  await page.locator("#detail .close").click();
  await page.locator("#walk").selectOption("all");
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("mission and photo validation, persistence, replacement and confirmed removal", async ({
  page,
}) => {
  await start(page);
  const photo = await page.screenshot();
  await page.locator(".card").first().click();
  await page.locator("#save").click();
  await expect(page.locator("#message")).toContainText("задание");
  await page.locator("#mission-done").check();
  await page.locator("#save").click();
  await expect(page.locator("#message")).toContainText("фото");
  await page.locator("#photo").setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await page.locator("#save").click();
  await expect(page.locator("#message")).toContainText("прочитать");
  await expect(page.locator("#counter")).toHaveText("0 / 24");
  await page
    .locator("#photo")
    .setInputFiles({ name: "test.png", mimeType: "image/png", buffer: photo });
  await page.locator("#save").click();
  await expect(page.locator("#message")).toContainText("сохранены");
  await page.locator("#detail .close").click();
  await page.reload();
  await expect(page.locator("#counter")).toHaveText("1 / 24");
  await expect(page.locator("#welcome")).not.toBeVisible();
  await page.locator('[data-filter="done"]').click();
  await expect(page.locator(".card")).toHaveCount(1);
  await visit(page, 0, photo);
  await expect(page.locator("#counter")).toHaveText("1 / 24");
  await page.locator(".card").click();
  await page.locator("#remove").click();
  await page.getByRole("button", { name: "Оставить", exact: true }).click();
  await expect(page.locator("#counter")).toHaveText("1 / 24");
  await page.locator("#remove").click();
  await page
    .getByRole("button", { name: "Убрать встречу", exact: true })
    .click();
  await expect(page.locator("#counter")).toHaveText("0 / 24");
});
test("first victory, backup export, rejected import and restoration retain photo data", async ({
  page,
}) => {
  await start(page);
  const photo = await page.screenshot();
  for (let id = 0; id < 5; id++) await visit(page, id, photo);
  await expect(page.locator("#counter")).toHaveText("5 / 24");
  await expect(page.locator(".earned .unlocked")).toHaveCount(1);
  await expect(page.locator("#story-title")).toHaveText("Город добрых встреч");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  const buffer = await readFile(await download.path());
  const saved = JSON.parse(buffer);
  expect(saved.visits).toHaveLength(5);
  expect(saved.team).toBe("Енисейские следопыты");
  const corrupt = {
    ...saved,
    visits: [{ ...saved.visits[0], photo: "data:image/jpeg;base64,AAAA" }],
  };
  await page.locator("#import").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(corrupt)),
  });
  await expect(page.locator("#notice-title")).toHaveText(
    "Не удалось восстановить альбом",
  );
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await expect(page.locator("#counter")).toHaveText("5 / 24");
  await page.locator(".card").first().click();
  await page.locator("#remove").click();
  await page
    .getByRole("button", { name: "Убрать встречу", exact: true })
    .click();
  await expect(page.locator("#counter")).toHaveText("4 / 24");
  await page.locator("#detail .close").click();
  await page.locator("#import").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer,
  });
  await page.getByRole("button", { name: "Восстановить", exact: true }).click();
  await expect(page.locator("#counter")).toHaveText("5 / 24");
  await page.reload();
  await expect(page.locator("#counter")).toHaveText("5 / 24");
  await page.locator(".card").first().click();
  await expect(page.locator(".detail-photo")).toBeVisible();
});
test("cached subdirectory deployment works offline including photos and artwork", async ({
  page,
  context,
}) => {
  await start(page);
  const photo = await page.screenshot();
  await visit(page, 10, photo);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#counter")).toHaveText("1 / 24");
  await expect(page.locator("#offline")).toBeVisible();
  await expect(page.locator(".card")).toHaveCount(24);
  await page.locator('.card[data-id="10"]').click();
  await expect(page.locator(".detail-photo")).toBeVisible();
  expect(
    await page
      .locator(".detail-photo")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
  await page.locator("#detail .close").click();
  await visit(page, 12, photo);
  await expect(page.locator("#counter")).toHaveText("2 / 24");
  await context.setOffline(false);
});
test("full finale and migration of original IndexedDB visits", async ({
  page,
}) => {
  await start(page);
  const photo = await page.screenshot();
  await visit(page, 0, photo);
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("suslik-adventure", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction("visits", "readwrite"),
        store = tx.objectStore("visits"),
        r = store.get(0);
      r.onsuccess = () => {
        for (let id = 1; id < 24; id++) store.put({ ...r.result, id });
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator("#counter")).toHaveText("24 / 24");
  await expect(page.locator("#story-title")).toHaveText(
    "Красноярск снова сияет",
  );
  await expect(page.locator(".city-point.found")).toHaveCount(24);
  await expect(page.locator(".city-resident")).toHaveCount(3);
  await expect(page.locator(".earned .unlocked")).toHaveCount(3);
});
test("unavailable local storage still leaves catalog usable and never claims to save", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new Error("Storage unavailable");
      },
    });
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage unavailable");
      },
    });
  });
  await page.goto("./");
  await expect(page.locator(".card")).toHaveCount(24);
  await page.locator(".card").first().click();
  await expect(page.locator("#save")).toBeDisabled();
  await expect(page.locator("#message")).toContainText("недоступно");
});
