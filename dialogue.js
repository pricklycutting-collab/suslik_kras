import { sprite } from "./sprites.js";
export function createDialogue(dialog) {
  let resolveSession = null,
    frames = [],
    index = 0,
    options = {};
  const speaker = dialog.querySelector("#dialogue-speaker"),
    text = dialog.querySelector("#dialogue-text"),
    portrait = dialog.querySelector("#dialogue-portrait"),
    actions = dialog.querySelector("#dialogue-actions"),
    step = dialog.querySelector("#dialogue-step");
  function finish(completed) {
    if (!resolveSession) return;
    const resolve = resolveSession;
    resolveSession = null;
    dialog.close();
    resolve(completed);
  }
  function render() {
    const frame = frames[index];
    speaker.textContent = frame.speaker;
    text.textContent = frame.text;
    step.textContent = `${index + 1} / ${frames.length}`;
    portrait.replaceChildren();
    if (typeof frame.portrait === "number") {
      const image = sprite(frame.portrait);
      const [w, h] = image.style.aspectRatio.split("/").map(Number);
      image.style.width = `${Math.min(100, ((150 * (w / h)) / 110) * 100)}%`;
      portrait.append(image);
    } else {
      const emblem = document.createElement("span");
      emblem.className =
        frame.portrait === "fog" ? "fog-character" : "story-emblem";
      emblem.textContent = frame.portrait === "fog" ? "" : "✦";
      portrait.append(emblem);
    }
    dialog.dataset.speaker = frame.portrait === "fog" ? "fog" : "guardian";
    actions.replaceChildren();
    if (frame.choices) {
      for (const choice of frame.choices) {
        const button = document.createElement("button");
        button.className = "dialogue-choice";
        button.textContent = choice.label;
        button.onclick = () => {
          frames.splice(index + 1, 0, ...choice.next);
          index++;
          render();
        };
        actions.append(button);
      }
    } else {
      const button = document.createElement("button");
      button.className = "button";
      button.id = "dialogue-next";
      button.textContent =
        index === frames.length - 1
          ? options.completeLabel || "Продолжить приключение"
          : "Дальше →";
      button.onclick = () => {
        if (index === frames.length - 1) finish(true);
        else {
          index++;
          render();
        }
      };
      actions.append(button);
    }
    // Keep keyboard and screen-reader focus on the new line, not a removed choice.
    speaker.focus();
  }
  dialog.querySelector("#dialogue-close").onclick = () => finish(false);
  dialog.querySelector("#dialogue-skip").onclick = () => finish(true);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    finish(false);
  });
  dialog.addEventListener("close", () => {
    if (!dialog.open && resolveSession) {
      const resolve = resolveSession;
      resolveSession = null;
      resolve(false);
    }
  });
  return (script, opts = {}) => {
    if (resolveSession) finish(false);
    frames = [...script];
    index = 0;
    options = opts;
    return new Promise((resolve) => {
      resolveSession = resolve;
      dialog.showModal();
      render();
    });
  };
}
