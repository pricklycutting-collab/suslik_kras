import { locations } from "./locations.js";
import { sprite } from "./sprites.js";
export function createCity(container, onSelect) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 360;
  canvas.setAttribute("aria-hidden", "true");
  container.append(canvas);
  const points = locations.map((p, i) => {
    const x = 34 + (i % 8) * 73,
      y = 137 + Math.floor(i / 8) * 50;
    const button = document.createElement("button");
    button.className = "city-point";
    button.style.left = `${(x / 600) * 100}%`;
    button.style.top = `${(y / 360) * 100}%`;
    button.textContent = String(i + 1);
    button.addEventListener("click", () => onSelect(p));
    container.append(button);
    return { x, y, button, p };
  });
  const residents = document.createElement("div");
  residents.className = "city-residents";
  residents.setAttribute("aria-hidden", "true");
  container.append(residents);
  const ctx = canvas.getContext("2d");
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  function tree(x, y) {
    rect(x + 6, y + 13, 4, 16, "#70553b");
    rect(x + 3, y + 7, 10, 17, "#507054");
    rect(x, y + 13, 16, 9, "#507054");
    rect(x + 5, y, 6, 17, "#507054");
  }
  return (records) => {
    const count = records.size,
      light = count / 24;
    rect(0, 0, 600, 360, "#dfe9d8");
    rect(455, 18, 35, 35, "#edc774");
    rect(449, 25, 47, 21, "#edc774");
    rect(0, 72, 600, 25, "#a1b298");
    rect(15, 58, 40, 38, "#a1b298");
    rect(71, 44, 50, 52, "#a1b298");
    rect(78, 32, 34, 26, "#a1b298");
    rect(143, 64, 60, 32, "#a1b298");
    rect(208, 52, 38, 45, "#a1b298");
    rect(0, 97, 600, 167, "#bbc5a1");
    rect(0, 257, 600, 103, "#79aaa7");
    for (let i = 0; i < 12; i++) {
      const x = (i * 97) % 600,
        y = 274 + (i % 5) * 17;
      rect(x, y, 28, 3, "#acd0c4");
    }
    // Stylised Krasnoyarsk motifs: hilltop chapel and a bridge over the river.
    rect(385, 49, 50, 48, "#668463");
    rect(375, 66, 70, 31, "#668463");
    rect(398, 35, 24, 31, "#eee9d1");
    rect(405, 22, 10, 14, "#e3bd69");
    rect(403, 29, 14, 6, "#e3bd69");
    rect(408, 15, 4, 10, "#876a43");
    rect(401, 46, 5, 8, "#9c9d80");
    rect(415, 46, 4, 8, "#9c9d80");
    rect(30, 314, 540, 10, "#e0d9b7");
    rect(45, 295, 6, 21, "#e0d9b7");
    rect(550, 295, 6, 21, "#e0d9b7");
    for (let x = 45; x < 560; x += 17) {
      rect(x, 304, 2, 11, "#eee8d2");
      rect(x, 320, 7, 26, "#b4bb9d");
    }
    for (const [i, point] of points.entries()) {
      const { x, y } = point;
      const found = records.has(point.p.id);
      const wall = ["#d4b58c", "#e4d5b2", "#b7c6b2"][i % 3];
      rect(x - 18, y - 15, 36, 28, wall);
      rect(x - 23, y - 19, 46, 6, "#657358");
      rect(x - 17, y - 24, 34, 7, "#657358");
      rect(x - 6, y + 2, 9, 12, "#897052");
      for (const wx of [x - 13, x + 7])
        rect(wx, y - 10, 6, 7, found ? "#ffd57d" : "#839689");
      point.button.classList.toggle("found", found);
      point.button.setAttribute(
        "aria-label",
        `${point.p.name}: ${found ? "найден" : "ещё впереди"}`,
      );
      point.button.title = point.p.name;
    }
    for (const [x, y] of [
      [3, 154],
      [577, 190],
      [10, 227],
      [572, 244],
      [344, 96],
      [478, 78],
    ])
      tree(x, y);
    if (count < 24) {
      ctx.fillStyle = `rgba(238,242,230,${0.47 * (1 - light)})`;
      ctx.fillRect(0, 90, 600, 167);
    }
    residents.replaceChildren(
      ...[...records.keys()]
        .filter((id) => locations.some((p) => p.id === id))
        .slice(-3)
        .map((id, i) => {
          const image = sprite(id, "city-resident");
          const [w, h] = image.style.aspectRatio.split("/").map(Number);
          const ratio = w / h,
            height = Math.min(75, 115 / ratio);
          image.style.width = `${((height * ratio) / 600) * 100}%`;
          image.style.height = `${(height / 360) * 100}%`;
          image.style.left = `${25 + i * 25}%`;
          return image;
        }),
    );
    container.setAttribute(
      "aria-label",
      `Ваш пиксельный город. Найдено ${count} из 24 хранителей. Это игровая сцена, не карта.`,
    );
  };
}
