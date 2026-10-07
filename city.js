import { locations } from "./locations.js";
export const WORLD_WIDTH = 1672,
  WORLD_HEIGHT = 941;
export const scenePositions = [
  [56, 29],
  [40, 32],
  [24, 31],
  [30, 48],
  [48, 42],
  [70, 58],
  [93, 83],
  [26, 70],
  [15, 37],
  [43, 56],
  [19, 58],
  [56, 43],
  [11, 68],
  [35.5, 45],
  [10, 52],
  [49, 70],
  [6, 26],
  [69, 26],
  [34, 84],
  [82, 82],
  [21, 45],
  [6, 86],
  [68, 85],
  [94, 36],
];
export function worldSize(viewWidth, viewHeight, zoom = 1) {
  const scale =
    Math.max(
      viewWidth / WORLD_WIDTH,
      viewHeight / WORLD_HEIGHT,
      960 / WORLD_WIDTH,
    ) * Math.max(1, Math.min(2.5, zoom));
  return {
    width: Math.ceil(WORLD_WIDTH * scale),
    height: Math.ceil(WORLD_HEIGHT * scale),
  };
}
export function createCity(container, onSelect) {
  const viewport = container.parentElement;
  let zoom = 1,
    drag = null;
  const art = document.createElement("img");
  art.className = "city-art";
  art.src = "assets/krasnoyarsk-world.png";
  art.alt =
    "Игровая карта Красноярска с Енисеем, мостами, городом, лесными хребтами и островами";
  art.width = WORLD_WIDTH;
  art.height = WORLD_HEIGHT;
  art.draggable = false;
  container.append(art);
  const fog = document.createElement("div");
  fog.className = "city-fog";
  fog.setAttribute("aria-hidden", "true");
  container.append(fog);
  const points = locations.map((p, i) => {
    const [x, y] = scenePositions[i],
      button = document.createElement("button");
    button.className = "city-point";
    button.dataset.id = p.id;
    button.style.left = `${x}%`;
    button.style.top = `${y}%`;
    const image = document.createElement("img");
    image.className = "world-suslik";
    image.src = "assets/map-suslik.png";
    image.alt = "";
    image.draggable = false;
    const star = document.createElement("span");
    star.className = "point-symbol";
    star.setAttribute("aria-hidden", "true");
    const number = document.createElement("span");
    number.className = "point-number";
    number.textContent = String(i + 1);
    const label = document.createElement("span");
    label.className = "point-label";
    label.textContent = p.name;
    button.append(image, star, number, label);
    button.onclick = () => onSelect(p);
    container.append(button);
    return { button, p, star };
  });
  const labels = [
    ["Енисей →", 39, 65, "river-label"],
    ["Красноярск Сити", 73, 27, ""],
    ["Остров встреч", 62, 60, ""],
    ["Убежище друзей", 85, 75, ""],
  ];
  for (const [text, x, y, cls] of labels) {
    const label = document.createElement("span");
    label.className = "landmark " + cls;
    label.textContent = text;
    label.style.left = `${x}%`;
    label.style.top = `${y}%`;
    label.setAttribute("aria-hidden", "true");
    container.append(label);
  }
  function resize(center = false) {
    const anchorX = center
        ? 0.5
        : (viewport.scrollLeft + viewport.clientWidth / 2) /
          (container.offsetWidth || WORLD_WIDTH),
      anchorY = center
        ? 0.5
        : (viewport.scrollTop + viewport.clientHeight / 2) /
          (container.offsetHeight || WORLD_HEIGHT);
    const size = worldSize(viewport.clientWidth, viewport.clientHeight, zoom);
    container.style.width = `${size.width}px`;
    container.style.height = `${size.height}px`;
    viewport.scrollLeft = anchorX * size.width - viewport.clientWidth / 2;
    viewport.scrollTop = anchorY * size.height - viewport.clientHeight / 2;
    document.querySelector("#zoom-out").disabled = zoom <= 1;
    document.querySelector("#zoom-in").disabled = zoom >= 2.5;
  }
  document.querySelector("#zoom-in").onclick = () => {
    zoom = Math.min(2.5, zoom + 0.25);
    resize();
  };
  document.querySelector("#zoom-out").onclick = () => {
    zoom = Math.max(1, zoom - 0.25);
    resize();
  };
  document.querySelector("#map-center").onclick = () => {
    zoom = 1;
    resize(true);
  };
  viewport.addEventListener("world-reset", () => {
    zoom = 1;
    resize(true);
  });
  new ResizeObserver(() => resize()).observe(viewport);
  resize(true);
  viewport.addEventListener("pointerdown", (event) => {
    if (
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      event.target.closest("button")
    )
      return;
    drag = {
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("dragging");
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!drag) return;
    viewport.scrollLeft = drag.left - (event.clientX - drag.x);
    viewport.scrollTop = drag.top - (event.clientY - drag.y);
  });
  function endDrag() {
    drag = null;
    viewport.classList.remove("dragging");
  }
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("lostpointercapture", endDrag);
  return (records) => {
    const count = records.size;
    fog.style.opacity = String(0.35 * (1 - count / 24));
    for (const { button, p, star } of points) {
      const found = records.has(p.id);
      button.classList.toggle("found", found);
      star.textContent = found ? "✦" : "";
      button.setAttribute(
        "aria-label",
        `${p.name}: ${found ? "спасён, поговорить" : "в тумане, поговорить"}`,
      );
      button.title = p.name;
    }
    container.setAttribute(
      "aria-label",
      `Карта игрового мира Красноярска. Спасено ${count} из 24 хранителей. Координаты настоящих статуй — в карточках.`,
    );
  };
}
