import { locations } from "./locations.js";
import { sprite } from "./sprites.js";
// Artistic scene positions, intentionally independent of real-world GPS coordinates.
export const scenePositions = [
  [55, 29],
  [35, 44],
  [18, 44],
  [91, 73],
  [42, 37],
  [73, 73],
  [88, 24],
  [31, 63],
  [10, 32],
  [30, 88],
  [51, 88],
  [56, 17],
  [66, 88],
  [79, 46],
  [7, 47],
  [84, 59],
  [20, 19],
  [63, 12],
  [13, 84],
  [38, 78],
  [26, 33],
  [71, 25],
  [88, 90],
  [8, 68],
];
export function createCity(container, onSelect) {
  const art = document.createElement("img");
  art.className = "city-art";
  art.src = "assets/krasnoyarsk-world.png";
  art.alt =
    "Художественная пиксельная панорама Красноярска: Енисей, мост, часовня на холме и скалы Столбов";
  art.width = 1536;
  art.height = 1024;
  art.draggable = false;
  container.append(art);
  const fog = document.createElement("div");
  fog.className = "city-fog";
  fog.setAttribute("aria-hidden", "true");
  container.append(fog);
  const points = locations.map((p, i) => {
    const [x, y] = scenePositions[i];
    const button = document.createElement("button");
    button.className = "city-point";
    button.dataset.id = p.id;
    button.style.left = `${x}%`;
    button.style.top = `${y}%`;
    const icon = document.createElement("span");
    icon.className = "point-symbol";
    icon.setAttribute("aria-hidden", "true");
    const number = document.createElement("span");
    number.className = "point-number";
    number.textContent = String(i + 1);
    const label = document.createElement("span");
    label.className = "point-label";
    label.textContent = p.name;
    button.append(icon, number, label);
    button.onclick = () => onSelect(p);
    container.append(button);
    return { button, p, icon };
  });
  const residents = document.createElement("div");
  residents.className = "city-residents";
  residents.setAttribute("aria-hidden", "true");
  container.append(residents);
  return (records) => {
    const count = records.size;
    fog.style.opacity = String(0.62 * (1 - count / 24));
    container.style.setProperty("--restored", count / 24);
    for (const { button, p, icon } of points) {
      const found = records.has(p.id);
      button.classList.toggle("found", found);
      icon.textContent = found ? "✦" : "?";
      button.setAttribute(
        "aria-label",
        `${p.name}: ${found ? "спасён, поговорить" : "в тумане, поговорить"}`,
      );
      button.title = p.name;
    }
    residents.replaceChildren(
      ...[...records.keys()]
        .filter((id) => locations.some((p) => p.id === id))
        .slice(-3)
        .map((id, i) => {
          const image = sprite(id, "city-resident");
          const [w, h] = image.style.aspectRatio.split("/").map(Number);
          const ratio = w / h,
            height = Math.min(85, 120 / ratio);
          image.style.width = `${((height * ratio) / 1536) * 100}%`;
          image.style.height = `${(height / 1024) * 100}%`;
          image.style.left = `${39 + i * 12}%`;
          return image;
        }),
    );
    container.setAttribute(
      "aria-label",
      `Пиксельный Красноярск. Спасено ${count} из 24 хранителей. Точки на художественной панораме не соответствуют настоящей карте.`,
    );
  };
}
