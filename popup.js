document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("lastWord", (data) => {
    if (data.lastWord) {
      const { word, definition, example } = data.lastWord;
      document.getElementById("word").textContent = word;
      document.getElementById("definition").textContent = definition;
      document.getElementById("example").textContent = example || "(no example)";
    } else {
      document.getElementById("word").textContent = "No word found";
    }
  });
});
