document.addEventListener("DOMContentLoaded", () => {
	chrome.storage.local.get("lastWord", (data) => {
		const wordElem = document.getElementById("word");
		const defElem = document.getElementById("definition");
		const exElem = document.getElementById("example");
		if (data.lastWord) {
			const { word, definition, example } = data.lastWord;
			wordElem.textContent = word || "No word found";
			defElem.textContent = definition || "No definition found.";
			exElem.textContent = example || "No example found.";
		} else {
			wordElem.textContent = "No word found";
			defElem.textContent = "";
			exElem.textContent = "";
		}
	});
});
