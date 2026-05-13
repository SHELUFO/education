function dailyCandidateQuestions() {
  return DATA.questions.filter((question) => (
    Array.isArray(question.options) &&
    Number.isInteger(question.answer) &&
    question.options.length > question.answer
  ));
}

function dailySeed() {
  return todayKey().split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function buildDailyPractice(forceNew = false) {
  const candidates = dailyCandidateQuestions();
  const weakIds = weakModules().map((item) => item.id);
  const wrongModules = (state.profile.wrongIds || [])
    .map((id) => questionById(id))
    .filter(Boolean)
    .map((question) => question.moduleId);
  const priorityModules = [...new Set([...weakIds, ...wrongModules])].filter(Boolean);
  const used = new Set();
  const seed = dailySeed() + (forceNew ? Date.now() % 997 : 0);
  const pick = (pool, count) => {
    const sorted = pool
      .filter((question) => !used.has(question.id))
      .sort((a, b) => ((stableScore(a.id) + seed) % 997) - ((stableScore(b.id) + seed) % 997));
    const picked = sorted.slice(0, count);
    picked.forEach((question) => used.add(question.id));
    return picked;
  };
  const priority = pick(candidates.filter((question) => priorityModules.includes(question.moduleId)), 5);
  const balanced = pick(candidates.filter((question) => question.difficulty === "base"), 3);
  const mixed = pick(candidates, 10 - priority.length - balanced.length);
  const questionIds = [...priority, ...balanced, ...mixed].slice(0, 10).map((question) => question.id);
  return {
    date: todayKey(),
    questionIds,
    answers: {}
  };
}

function dailyQuestions() {
  const daily = state.dailyPractice || getDailyPractice();
  return daily.questionIds.map((id) => questionById(id)).filter(Boolean);
}

function dailyAnswerOf(question) {
  const daily = state.dailyPractice || getDailyPractice();
  return daily.answers[question.id] || null;
}

function dailyStats() {
  const questions = dailyQuestions();
  const answers = questions.map((question) => dailyAnswerOf(question)).filter(Boolean);
  const correct = answers.filter((answer) => answer.correct).length;
  const byModule = answers.reduce((map, answer) => {
    const id = answer.moduleId || "unknown";
    if (!map[id]) map[id] = { moduleId: id, title: moduleTitle(id), answered: 0, correct: 0 };
    map[id].answered += 1;
    if (answer.correct) map[id].correct += 1;
    return map;
  }, {});
  return {
    total: questions.length,
    answered: answers.length,
    correct,
    accuracy: percent(correct, answers.length),
    completed: questions.length > 0 && answers.length >= questions.length,
    weakModules: Object.values(byModule)
      .filter((item) => item.answered > 0 && item.correct / item.answered < 0.8)
      .sort((a, b) => (a.correct / a.answered) - (b.correct / b.answered))
  };
}

function chooseDaily(index) {
  const questions = dailyQuestions();
  const question = questions[state.dailyIndex % questions.length];
  if (!question || dailyAnswerOf(question)) return;
  recordDailyAnswer(question, index);
  state.selected = index;
  render();
}

function nextDailyQuestion() {
  const questions = dailyQuestions();
  if (!questions.length) return;
  state.dailyIndex = (state.dailyIndex + 1) % questions.length;
  state.selected = null;
  render();
}

function renderDailyQuestion(question) {
  const answer = dailyAnswerOf(question);
  return `
    <span class="tag">${escapeHtml(questionTypeTitles[questionTypeOf(question)] || "选择题")}</span>
    ${renderQuestionAssets(question)}
    ${question.options.map((option, index) => {
      const cls = !answer ? "" : index === question.answer ? "right" : answer.selected === index ? "wrong" : "";
      return `<div class="option ${cls}" onclick="chooseDaily(${index})">${"ABCD"[index]}. ${formatChemText(option)}</div>`;
    }).join("")}
    ${answer ? `
      <div class="card">
        <strong>${answer.correct ? "回答正确" : "已加入错题补弱"}</strong>
        <p>${formatChemText(question.explain)}</p>
        <div class="module-jumps">
          <button onclick="selectModule('${question.moduleId}'); setView('learn')">回看课程</button>
          <button onclick="practiceModule('${question.moduleId}')">同模块练习</button>
        </div>
      </div>
    ` : ""}
  `;
}

function renderStageReport(stats) {
  const moduleCards = stats.weakModules.length ? stats.weakModules.map((item) => `
    <div class="card">
      <h3>${escapeHtml(item.title)}</h3>
      <p>今日正确率：${percent(item.correct, item.answered)}，建议回看课程后做同模块练习。</p>
      <div class="actions">
        <button class="btn secondary" onclick="selectModule('${item.moduleId}'); setView('learn')">回看课程</button>
        <button class="btn" onclick="practiceModule('${item.moduleId}')">补弱练习</button>
      </div>
    </div>
  `).join("") : `<div class="card"><h3>今日状态稳定</h3><p>当前没有明显薄弱模块，可以继续做提升题或生成综合卷。</p></div>`;
  return `
    <section class="panel daily-report">
      <div class="title">阶段报告</div>
      <div class="stats-grid">
        <div><strong>${stats.answered}/${stats.total}</strong><span>完成进度</span></div>
        <div><strong>${stats.accuracy}</strong><span>今日正确率</span></div>
        <div><strong>${stats.correct}</strong><span>答对题数</span></div>
        <div><strong>${state.profile.streak}</strong><span>当前连对</span></div>
      </div>
      <div class="grid">${moduleCards}</div>
    </section>
  `;
}

function renderDailyPractice() {
  state.dailyPractice = state.dailyPractice || getDailyPractice();
  const questions = dailyQuestions();
  const stats = dailyStats();
  const question = questions[state.dailyIndex % Math.max(1, questions.length)];
  if (!questions.length || !question) {
    return `
      <section class="panel">
        <div class="title">每日练</div>
        <div class="card">当前题库里没有可自动判分的选择题。</div>
      </section>
    `;
  }
  return `
    <section class="panel hero-panel daily-hero">
      <div>
        <div class="title">每日练</div>
        <div class="subtitle">今日 ${stats.total} 题，优先覆盖错题、薄弱模块和基础保分题。</div>
      </div>
      <button class="btn secondary" onclick="resetDailyPractice()">换一组</button>
    </section>
    <section class="panel">
      <div class="daily-progress">
        ${questions.map((item, index) => {
          const answer = dailyAnswerOf(item);
          const cls = index === state.dailyIndex ? "active" : answer ? answer.correct ? "right" : "wrong" : "";
          return `<button class="${cls}" onclick="state.dailyIndex=${index}; state.selected=null; render();">${index + 1}</button>`;
        }).join("")}
      </div>
      <p>${state.dailyIndex + 1} / ${questions.length} <span class="tag">${escapeHtml(question.topic || moduleTitle(question.moduleId))}</span></p>
      <h2>${formatChemText(question.stem)}</h2>
      ${renderDailyQuestion(question)}
      <div class="actions">
        <button class="btn" onclick="nextDailyQuestion()">下一题</button>
        <button class="btn secondary" onclick="setView('practice')">进入自由练习</button>
      </div>
    </section>
    ${renderStageReport(stats)}
  `;
}
