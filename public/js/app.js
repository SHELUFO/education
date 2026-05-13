function render() {
  renderNav();
  const map = { home: renderHome, network: renderNetwork, learn: renderLearn, practice: renderPractice, daily: renderDailyPractice, library: renderLibrary };
  const shellClass = state.viewTransition ? "view-shell" : "view-shell no-enter";
  document.getElementById("app").innerHTML = `<div class="${shellClass}">${map[state.view]()}</div>`;
  state.viewTransition = false;
}

render();
