import { locations, navigationUrl, progress } from "./locations.js";
import {
  missions,
  chapter,
  milestones,
  walks,
  milestoneForNewVisit,
  backupPayload,
  validateBackup,
} from "./game.js";
import {
  loadVisits,
  saveRecord,
  deleteRecord,
  mergeRecords,
  readSetting,
  saveSetting,
} from "./storage.js";
import { sprite } from "./sprites.js";
import { createCity } from "./city.js";
import { introduction, guardianDialogue, rescueDialogue } from "./story.js";
import { createDialogue } from "./dialogue.js";
const $ = (s) => document.querySelector(s);
let records = new Map(),
  filter = "all",
  selected = null,
  busy = false,
  storageReady = false,
  team = readSetting("team"),
  installPrompt = null,
  toastTimer,
  previewUrl,
  introSeen = Boolean(readSetting("story-intro"));
const playDialogue = createDialogue($("#dialogue"));
const paintCity = createCity($("#city"), (p) => meetGuardian(p));
function closeGamePanels() {
  for (const id of ["#journal", "#album-panel", "#quest-panel"])
    if ($(id).open) $(id).close();
}
function openGamePanel(id) {
  if (busy) {
    toast("Дождитесь сохранения фото.");
    return;
  }
  closeGamePanels();
  $(id).showModal();
}
$("#collection-open").onclick = () => openGamePanel("#journal");
$("#album-open").onclick = () => openGamePanel("#album-panel");
$("#quest-open").onclick = () => openGamePanel("#quest-panel");
$("#map-open").onclick = () => {
  closeGamePanels();
  $("#city-scroll").dispatchEvent(new Event("world-reset"));
};
$("#story-replay").onclick = () => playIntro();
$("#team-edit-info").onclick = () => showWelcome();
async function playIntro() {
  if (busy) return false;
  closeGamePanels();
  const completed = await playDialogue(introduction(team), {
    completeLabel: "Выбрать хранителя в городе",
  });
  if (completed) {
    introSeen = true;
    saveSetting("story-intro", "yes");
    render();
    $("#world").scrollIntoView({ block: "start" });
  }
  return completed;
}
async function meetGuardian(point) {
  if (busy) {
    toast("Дождитесь сохранения фото.");
    return;
  }
  closeGamePanels();
  if (!introSeen && records.size === 0 && !(await playIntro())) return;
  const rescued = records.has(point.id);
  const completed = await playDialogue(guardianDialogue(point.id, rescued), {
    completeLabel: rescued
      ? "Посмотреть нашу встречу"
      : "К заданию и месту встречи",
  });
  if (completed) openDetail(point);
}
$("#story-start").onclick = playIntro;
function toast(text) {
  clearTimeout(toastTimer);
  $("#toast").textContent = text;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 6000);
}
function setBusy(value) {
  busy = value;
  for (const selector of ["#save", "#remove", "#export", "#import", "#photo"]) {
    const element = $(selector);
    if (element) element.disabled = value;
  }
}
function friendly(error) {
  return error?.name === "QuotaExceededError"
    ? "На устройстве не хватает места. Скачайте копию альбома и освободите место."
    : error?.message || "Не удалось сохранить изменения. Попробуйте ещё раз.";
}
function notice(title, text, actions = [{ label: "Понятно" }]) {
  $("#notice-title").textContent = title;
  $("#notice-text").textContent = text;
  $("#notice-actions").replaceChildren();
  return new Promise((resolve) => {
    const dialog = $("#notice");
    let handled = false;
    const finish = (value) => {
      if (handled) return;
      handled = true;
      dialog.removeEventListener("close", closed);
      dialog.close();
      resolve(value);
    };
    const closed = () => finish(false);
    dialog.addEventListener("close", closed);
    for (const action of actions) {
      const button = document.createElement("button");
      button.className = action.secondary ? "secondary" : "button";
      button.textContent = action.label;
      button.onclick = () => finish(action.value ?? true);
      $("#notice-actions").append(button);
    }
    dialog.showModal();
  });
}
function mountSprite(id, box) {
  const image = sprite(id);
  const ratio = image.style.aspectRatio.split("/").map(Number);
  const r = ratio[0] / ratio[1];
  image.style.setProperty("--sprite-ratio", image.style.aspectRatio);
  image.style.setProperty(
    "--sprite-width",
    `${Math.min(100, ((r * 165) / 250) * 100)}%`,
  );
  if (r > 1.4) image.classList.add("wide");
  box.append(image);
}
function render() {
  const count = records.size,
    next = chapter(count);
  $("#counter").textContent = `${count} / 24`;
  $("#progress").value = count;
  $("#percent").textContent = count
    ? `${progress(count, 24)}% света вернулось в город`
    : "Приключение начинается!";
  $("#chapter-counter").textContent =
    count === 24
      ? "Все хранители найдены!"
      : `До «${next.title}» — ${next.goal - count} встреч`;
  $("#story-title").textContent =
    count === 24 ? "Красноярск снова сияет" : next.title;
  $("#story").textContent =
    count === 24
      ? milestones[2].text
      : count >= 12
        ? "Город почти вспомнил себя. Соберите всю коллекцию и помогите Забывайке стать добрым облаком."
        : count >= 5
          ? "Первая победа уже ваша! Теперь найдите 12 хранителей, чтобы вернуть городу ещё больше красок."
          : "Для первой победы найдите любых пять сусликов. Можно гулять в своём темпе и продолжить в другой день.";
  $("#team-label").textContent = team || "КОМАНДА ХРАНИТЕЛЕЙ";
  $("#badges").replaceChildren(
    ...milestones.map((m) => {
      const span = document.createElement("span");
      span.textContent = `${count >= m.goal ? "✦" : "◇"} ${m.goal} · ${m.title}`;
      span.classList.toggle("unlocked", count >= m.goal);
      return span;
    }),
  );
  $("#city-weather").textContent =
    count === 24
      ? "Все хранители спасены"
      : count >= 12
        ? "Туман почти рассеялся"
        : count >= 5
          ? "Город вспоминает себя"
          : "Выберите суслика на карте";
  paintCity(records);
  $("#story-start").title =
    introSeen || count > 0 ? "Послушать завязку ещё раз" : "Начать историю";
  $("#story-start").setAttribute("aria-label", $("#story-start").title);
  const search = $("#search")
    .value.trim()
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е");
  const walk = walks.find((w) => w.id === $("#walk").value) || walks[0];
  const shown = locations.filter(
    (p) =>
      walk.ids.includes(p.id) &&
      p.name.toLocaleLowerCase("ru").replaceAll("ё", "е").includes(search) &&
      (filter === "all" || (filter === "done") === records.has(p.id)),
  );
  $("#total").textContent = `${shown.length} из 24`;
  $("#cards").replaceChildren(
    ...shown.map((p) => {
      const visit = records.get(p.id),
        button = document.createElement("button");
      button.className = "card";
      button.dataset.id = p.id;
      const art = document.createElement("div");
      art.className = "art";
      const status = document.createElement("span");
      status.className = "status";
      status.textContent = visit ? "✦ СПАСЁН" : "? В ТУМАНЕ";
      art.append(status);
      mountSprite(p.id, art);
      const body = document.createElement("div");
      body.className = "card-body";
      const title = document.createElement("h3");
      title.textContent = p.name;
      const subtitle = document.createElement("p");
      subtitle.textContent = `Место ${String(p.id + 1).padStart(2, "0")} · Красноярск`;
      const bottom = document.createElement("div");
      bottom.className = "card-bottom";
      bottom.innerHTML = `<span>${visit ? "Поговорить с другом" : "Поговорить и помочь"}</span><span aria-hidden="true">↗</span>`;
      body.append(title, subtitle, bottom);
      button.append(art, body);
      button.onclick = () => meetGuardian(p);
      return button;
    }),
  );
  $("#empty").hidden = shown.length > 0;
  $("#export").disabled = busy || !storageReady;
  $("#album-empty").hidden = records.size > 0;
  $("#album-photos").replaceChildren(
    ...[...records.values()].map((visit) => {
      const p = locations.find((point) => point.id === visit.id);
      if (!p) return document.createElement("span");
      const button = document.createElement("button");
      button.className = "album-photo";
      const image = document.createElement("img");
      image.src = visit.photo;
      image.alt = "Фото: " + p.name;
      image.loading = "lazy";
      const label = document.createElement("span");
      label.textContent = p.name;
      button.append(image, label);
      button.onclick = () => openDetail(p);
      return button;
    }),
  );
}
function clearPreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
}
function openDetail(p) {
  if (busy) {
    toast("Дождитесь сохранения — это займёт немного времени.");
    return;
  }
  closeGamePanels();
  clearPreview();
  selected = p;
  const visit = records.get(p.id);
  $("#message").textContent = "";
  $("#detail-content").innerHTML =
    `<div class="detail-hero"></div><span class="eyebrow">ХРАНИТЕЛЬ ${String(p.id + 1).padStart(2, "0")} / 24</span><h2 id="detail-title"></h2><button id="talk-again" class="secondary talk-button">Поговорить с хранителем</button><p>Одна встреча — одна искра света. Рассмотрите настоящую скульптуру и создайте маленькое семейное воспоминание.</p><div class="mission"><span class="eyebrow">ЗАДАНИЕ ДЛЯ ВАШЕЙ КОМАНДЫ</span><p id="mission-text"></p><label><input id="mission-done" type="checkbox" ${visit ? "checked" : ""}>Мы выполнили задание вместе</label></div><p class="coordinates">${p.lat}, ${p.lon} · координаты автора проекта</p><div class="map-links"><a class="secondary" href="${navigationUrl(p)}" target="_blank" rel="noopener noreferrer">Яндекс Карты ↗</a><a class="secondary" href="https://2gis.ru/krasnoyarsk?m=${p.lon},${p.lat}/17" target="_blank" rel="noopener noreferrer">2ГИС ↗</a></div>${visit ? '<img class="detail-photo" alt="Ваш памятный снимок"><p class="seen-date"></p>' : ""}<div class="detail-actions"><label class="upload">${visit ? "Заменить памятное фото" : "Сделать или выбрать фото"}<input id="photo" type="file" accept="image/*"><img id="photo-preview" class="photo-preview" alt="Предпросмотр выбранного фото" hidden></label><button class="button" id="save">${visit ? "Сохранить новое фото" : "Мы нашли суслика! ✦"}</button>${visit ? '<button class="secondary" id="remove">Убрать отметку и фото</button>' : ""}</div><p class="fine">Можно выбрать фото или камеру через меню телефона. Геолокация не проверяется. Фото не отправляется на сервер.</p>`;
  $("#detail-title").textContent = p.name;
  $("#mission-text").textContent = missions[p.id];
  $("#talk-again").onclick = () => {
    if (!busy)
      playDialogue(guardianDialogue(p.id, records.has(p.id)), {
        completeLabel: "Вернуться к карточке",
      });
  };
  mountSprite(p.id, $(".detail-hero"));
  if (visit) {
    $(".detail-photo").src = visit.photo;
    $(".seen-date").textContent =
      `✓ Встреча сохранена · ${new Intl.DateTimeFormat("ru", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Krasnoyarsk" }).format(new Date(visit.date))}`;
  }
  $("#photo").onchange = () => {
    clearPreview();
    const file = $("#photo").files[0];
    $("#photo-preview").hidden = true;
    if (file && file.type.startsWith("image/")) {
      previewUrl = URL.createObjectURL(file);
      $("#photo-preview").src = previewUrl;
      $("#photo-preview").hidden = false;
    }
  };
  $("#save").onclick = saveVisit;
  $("#save").disabled = !storageReady;
  if (!storageReady)
    $("#message").textContent =
      "Хранилище браузера недоступно. Просмотр работает, но сохранить фото сейчас нельзя.";
  if (visit) $("#remove").onclick = () => removeVisit(p);
  if (!$("#detail").open) $("#detail").showModal();
}
async function decodePhoto(file) {
  if (!file.type.startsWith("image/"))
    throw new Error(
      "Выберите изображение JPEG, PNG или другое фото, которое поддерживает браузер.",
    );
  if (file.size > 25 * 1024 * 1024)
    throw new Error("Фото слишком большое. Выберите файл до 25 МБ.");
  let image;
  try {
    image = await createImageBitmap(file);
  } catch {
    throw new Error("Не удалось прочитать фото. Попробуйте JPEG или PNG.");
  }
  const scale = Math.min(1, 1200 / Math.max(image.width, image.height)),
    canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
async function saveVisit() {
  if (busy || !storageReady) return;
  if (!$("#mission-done").checked) {
    $("#message").textContent =
      "Сначала выполните семейное задание и поставьте отметку.";
    return;
  }
  const file = $("#photo").files[0];
  if (!file) {
    $("#message").textContent = "Сначала сделайте или выберите фото суслика.";
    return;
  }
  const point = selected,
    before = records.size,
    isNew = !records.has(point.id);
  setBusy(true);
  $("#message").textContent = "Сохраняем вашу встречу…";
  try {
    const record = {
      id: point.id,
      photo: await decodePhoto(file),
      date: new Date().toISOString(),
    };
    await saveRecord(record);
    records.set(point.id, record);
    setBusy(false);
    render();
    if (selected === point && $("#detail").open) {
      openDetail(point);
      $("#message").textContent =
        "Искра света возвращена! Фото и отметка сохранены.";
      const reward = milestoneForNewVisit(before, records.size);
      if (reward) {
        const box = document.createElement("div");
        box.className = "reward";
        const h = document.createElement("h3");
        h.textContent = `✦ ${reward.title}`;
        const text = document.createElement("p");
        text.textContent = reward.text;
        box.append(h, text);
        $("#detail-content").append(box);
        box.scrollIntoView({ block: "nearest" });
        toast(`Новая награда: ${reward.title}!`);
      }
      if (isNew) {
        const backToCity = await playDialogue(
          rescueDialogue(point.id, reward),
          { completeLabel: "Вернуться в город ✦" },
        );
        if (backToCity && selected === point && $("#detail").open) {
          $("#detail").close();
          $("#world").scrollIntoView({ block: "start" });
        }
      }
    }
  } catch (error) {
    $("#message").textContent = friendly(error);
  } finally {
    setBusy(false);
  }
}
async function removeVisit(point) {
  if (busy) return;
  const confirmed = await notice(
    "Убрать эту встречу?",
    "Фото этого хранителя будет удалено из браузера, а прогресс уменьшится. Сначала можно скачать резервную копию альбома.",
    [
      { label: "Оставить", secondary: true, value: false },
      { label: "Убрать встречу", value: true },
    ],
  );
  if (!confirmed || busy) return;
  setBusy(true);
  try {
    await deleteRecord(point.id);
    records.delete(point.id);
    setBusy(false);
    render();
    if (selected === point && $("#detail").open) openDetail(point);
    toast("Встреча удалена. Хранитель снова ждёт вас.");
  } catch (error) {
    toast(friendly(error));
  } finally {
    setBusy(false);
  }
}
function showWelcome() {
  if (busy) return;
  closeGamePanels();
  $("#team-name").value = team;
  $("#welcome").showModal();
}
$("#welcome-start").onclick = () => {
  team = $("#team-name").value.trim();
  const saved = saveSetting("team", team);
  saveSetting("welcomed", "yes");
  $("#welcome").close();
  render();
  if (!saved)
    toast("Название команды не сохранилось: хранилище браузера недоступно.");
  if (!introSeen && records.size === 0) playIntro();
};
$("#help-open").onclick = showWelcome;
$("#team-edit").onclick = showWelcome;
$("#search").oninput = render;
$("#walk").onchange = () => {
  render();
  const walk = walks.find((w) => w.id === $("#walk").value);
  $("#walk-note").textContent =
    walk.id === "adventure"
      ? "Эти точки находятся далеко друг от друга. Для такой подборки могут понадобиться отдельные поездки. Пешеходный маршрут не проверен."
      : "Это подборка точек, не готовый маршрут. Проверьте пешеходный путь и переходы в картах перед прогулкой.";
};
for (const button of document.querySelectorAll("[data-filter]"))
  button.onclick = () => {
    filter = button.dataset.filter;
    for (const b of document.querySelectorAll("[data-filter]")) {
      b.classList.toggle("active", b === button);
      b.setAttribute("aria-pressed", String(b === button));
    }
    render();
  };
for (const dialog of document.querySelectorAll("dialog")) {
  if (dialog.id === "dialogue") continue;
  dialog.querySelector(".close").onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    if (dialog.id === "detail") clearPreview();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  });
}
const dialogObserver = new MutationObserver(() =>
  document.body.classList.toggle(
    "modal-open",
    Boolean(document.querySelector("dialog[open]")),
  ),
);
for (const dialog of document.querySelectorAll("dialog"))
  dialogObserver.observe(dialog, {
    attributes: true,
    attributeFilter: ["open"],
  });
$("#export").onclick = () => {
  if (busy) return;
  const blob = new Blob([JSON.stringify(backupPayload(records, team))], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `suslik-album-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Копия содержит ваши фото. Храните её в надёжном месте.");
};
$("#import").onchange = async () => {
  const file = $("#import").files[0];
  if (!file || busy) return;
  setBusy(true);
  try {
    if (file.size > 75 * 1024 * 1024)
      throw new Error("Копия слишком большая. Максимум — 75 МБ.");
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error("Не удалось прочитать JSON-файл копии.");
    }
    const backup = validateBackup(data);
    for (const record of backup.visits) {
      const blob = await (await fetch(record.photo)).blob();
      let image;
      try {
        image = await createImageBitmap(blob);
      } catch {
        throw new Error(
          "В копии повреждена фотография. Восстановление отменено.",
        );
      }
      const valid = image.width <= 1200 && image.height <= 1200;
      image.close();
      if (!valid)
        throw new Error("Фотографии в копии имеют неподдерживаемый размер.");
    }
    const confirmed = await notice(
      "Восстановить альбом?",
      `В копии ${backup.visits.length} встреч. Они добавятся к вашим; совпадающие фото будут заменены. Остальные встречи останутся. Название команды будет взято из копии.`,
      [
        { label: "Отмена", value: false, secondary: true },
        { label: "Восстановить", value: true },
      ],
    );
    if (!confirmed) return;
    await mergeRecords(backup.visits);
    records = await loadVisits();
    storageReady = true;
    team = backup.team;
    saveSetting("team", team);
    saveSetting("welcomed", "yes");
    render();
    toast("Альбом восстановлен. Продолжайте приключение!");
  } catch (error) {
    await notice("Не удалось восстановить альбом", friendly(error));
  } finally {
    $("#import").value = "";
    setBusy(false);
    render();
  }
};
let connectionCheck = 0;
async function offline() {
  const check = ++connectionCheck;
  let connected = navigator.onLine;
  if (connected)
    try {
      await fetch(new URL("connection.txt", import.meta.url), {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      connected = false;
    }
  if (check === connectionCheck) $("#offline").hidden = connected;
}
window.addEventListener("online", offline);
window.addEventListener("offline", offline);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) offline();
});
offline();
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  $("#install").hidden = false;
});
$("#install").onclick = async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  $("#install").hidden = true;
};
window.addEventListener("appinstalled", () => {
  $("#install").hidden = true;
  toast("Игра добавлена на главный экран.");
});
$("#install-help").onclick = () =>
  notice(
    "Игра на главном экране",
    "На iPhone откройте сайт в Safari: «Поделиться» → «На экран Домой». На Android откройте меню Chrome и выберите «Установить приложение» или «Добавить на главный экран». Для установки нужен опубликованный сайт с HTTPS. После первого открытия дождитесь сообщения об офлайн-доступе.",
  );
try {
  records = await loadVisits();
  storageReady = true;
  render();
  if (!readSetting("welcomed") && records.size === 0) showWelcome();
} catch {
  render();
  toast(
    "Хранилище недоступно. Просмотр доступен; фото сохранить нельзя. Попробуйте обычную вкладку другого браузера.",
  );
}
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker
    .register("./sw.js", { scope: "./" })
    .then(async (registration) => {
      await navigator.serviceWorker.ready;
      const target = registration.active || registration.waiting;
      target?.postMessage("CACHE_STATUS");
    })
    .catch(() =>
      toast("Офлайн-режим пока недоступен. Игра работает с интернетом."),
    );
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data === "OFFLINE_READY" && !readSetting("offline-ready")) {
      saveSetting("offline-ready", "yes");
      toast("Игра готова к прогулке без интернета. Карты открываются онлайн.");
    }
    if (event.data === "OFFLINE_FAILED")
      toast(
        "Не все изображения сохранены офлайн. Откройте игру ещё раз с интернетом.",
      );
  });
}
