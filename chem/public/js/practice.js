function choose(index) {
  if (state.selected !== null) return;
  const list = filteredQuestions();
  const q = list[state.questionIndex % list.length];
  if (q) recordAnswer(q, index);
  state.selected = index;
  render();
}

function renderQuestionBody(q) {
  const typeTitle = questionTypeTitles[questionTypeOf(q)] || "综合题";
  if (Array.isArray(q.options) && q.options.length) {
    const selectedCorrect = state.selected === q.answer;
    return `
      <span class="tag">${escapeHtml(typeTitle)}</span>
      ${renderQuestionAssets(q)}
      ${q.options.map((opt, index) => {
        const cls = state.selected === null ? "" : index === q.answer ? "right" : state.selected === index ? "wrong" : "";
        return `<div class="option ${cls}" onclick="choose(${index})">${"ABCD"[index]}. ${formatChemText(opt)}</div>`;
      }).join("")}
      ${state.selected === null ? "" : `
        <div class="card">
          <strong>${selectedCorrect ? "回答正确" : "需要回看连接"}</strong>
          <p>${formatChemText(q.explain)}</p>
          <div class="module-jumps">
            <button onclick="selectModule('${q.moduleId}'); setView('learn')">回看课程</button>
            ${state.profile.wrongIds.includes(q.id) ? `<button onclick="toggleWrongOnly()">进入错题练习</button>` : ""}
          </div>
        </div>
      `}
    `;
  }
  return `
    <span class="tag">${escapeHtml(typeTitle)}</span>
    ${renderQuestionAssets(q)}
    <textarea class="answer-draft" placeholder="在这里作答，大题提交后对照参考答案和评分点。"></textarea>
    <details class="card">
      <summary>参考答案与评分点</summary>
      <p>${formatChemText(answerTextOf(q))}</p>
      ${(q.scoringPoints || []).length ? `<ol>${q.scoringPoints.map(point => `<li>${formatChemText(point)}</li>`).join("")}</ol>` : ""}
      <p>${formatChemText(q.explain)}</p>
    </details>
  `;
}

function nextQuestion() {
  const list = filteredQuestions();
  if (!list.length) return;
  state.questionIndex = (state.questionIndex + 1) % list.length;
  state.selected = null;
  render();
}

function setPracticeFilter(type, value) {
  state[type] = value;
  if (type === "difficulty") state.stageId = "none";
  if (type === "questionType") state.stageId = "none";
  if (type === "practiceModuleId") state.stageId = "none";
  state.questionIndex = 0;
  state.selected = null;
  render();
}

function renderPracticeFilters() {
  const difficulties = [["all","全部"],["base","基础保分"],["boost","80+ 提升"],["full","满分冲刺"]];
  const questionTypes = [["all", "全部题型"], ...Object.keys(questionTypeTitles).map(id => [id, questionTypeTitles[id]])];
  const modules = [["all", "全部模块"], ...DATA.courseModules.map(module => [module.id, module.title])];
  const stages = [["none","自由练习"], ...DATA.stageTests.map(item => [item.id, item.title])];
  return `
    <div class="selector-grid">
      ${modules.map(([id, label]) => `<button class="${state.practiceModuleId === id ? "active" : ""}" onclick="setPracticeFilter('practiceModuleId','${id}')">${escapeHtml(label)}</button>`).join("")}
      ${difficulties.map(([id, label]) => `<button class="${state.difficulty === id ? "active" : ""}" onclick="setPracticeFilter('difficulty','${id}')">${label}</button>`).join("")}
      ${questionTypes.map(([id, label]) => `<button class="${state.questionType === id ? "active" : ""}" onclick="setPracticeFilter('questionType','${id}')">${escapeHtml(label)}</button>`).join("")}
      ${stages.map(([id, label]) => `<button class="${state.stageId === id ? "active" : ""}" onclick="setPracticeFilter('stageId','${id}')">${escapeHtml(label)}</button>`).join("")}
    </div>
    <div class="actions">
      <button class="btn ${state.wrongOnly ? "" : "secondary"}" onclick="toggleWrongOnly()">只看错题（${state.profile.wrongIds.length}）</button>
    </div>
  `;
}

function renderPractice() {
  const list = filteredQuestions();
  if (!list.length) {
    return `
      ${renderPaperBuilder()}
      <section class="panel">
        <div class="title">练习检测</div>
        ${renderPracticeFilters()}
        <div class="card">当前筛选下没有题目。</div>
      </section>
    `;
  }
  const q = list[state.questionIndex % list.length];
  return `
    ${renderPaperBuilder()}
    <section class="panel">
      <div class="title">练习检测</div>
      ${renderPracticeFilters()}
      <p>${state.questionIndex + 1} / ${list.length} <span class="tag">${escapeHtml(q.topic)}</span></p>
      <h2>${formatChemText(q.stem)}</h2>
      ${renderQuestionBody(q)}
      <div class="actions"><button class="btn" onclick="nextQuestion()">下一题</button></div>
    </section>
  `;
}
