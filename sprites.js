const sheets = {
  a: ["01-adventurers.png", 1374, 1145],
  b: ["02-umbrella-medic-obrada-teacher.png", 1254, 1254],
  c: ["03-inspector-klim-cosmonaut-cook.png", 1225, 1284],
  d: ["04-sail-it-sauna-vovchik-miner.png", 1536, 1024],
  e: ["05-wrestler.png", 1074, 1464],
  f: ["06-football-coins-artist-reader-newlyweds.png", 1536, 1024],
};
// Display regions in the original concept sheets; source images remain unchanged.
const regions = {
  0: ["d", 630, 130, 500, 360],
  1: ["c", 100, 10, 410, 600],
  2: ["b", 590, 620, 635, 570],
  3: ["c", 710, 610, 500, 640],
  4: ["b", 740, 40, 400, 550],
  5: ["f", 980, 555, 545, 450],
  6: ["d", 895, 520, 390, 455],
  7: ["a", 20, 80, 515, 480],
  8: ["f", 1010, 20, 500, 500],
  9: ["f", 35, 560, 750, 440],
  10: ["f", 45, 20, 430, 505],
  11: ["d", 530, 480, 330, 495],
  12: ["e", 200, 60, 650, 1340],
  13: ["a", 685, 575, 545, 535],
  14: ["f", 515, 20, 480, 500],
  15: ["d", 15, 0, 580, 510],
  16: ["a", 255, 565, 410, 535],
  17: ["c", 95, 620, 460, 640],
  18: ["a", 965, 20, 390, 555],
  19: ["b", 115, 620, 440, 580],
  20: ["c", 725, 15, 440, 595],
  21: ["a", 560, 35, 365, 520],
  22: ["d", 1140, 10, 380, 505],
  23: ["b", 40, 245, 640, 305],
};
export function sprite(id, className = "") {
  const [sheet, x, y, w, h] = regions[id],
    [file, width, height] = sheets[sheet];
  const box = document.createElement("span");
  box.className = "sprite " + className;
  box.setAttribute("aria-hidden", "true");
  box.style.aspectRatio = `${w}/${h}`;
  box.style.backgroundImage = `url("assets/concepts/${file}")`;
  box.style.backgroundSize = `${(width / w) * 100}% ${(height / h) * 100}%`;
  box.style.backgroundPosition = `${(x / (width - w)) * 100}% ${(y / (height - h)) * 100}%`;
  return box;
}
