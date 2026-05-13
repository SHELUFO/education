function saveDoc() {
  const title = document.getElementById("docTitle").value.trim();
  const content = document.getElementById("docContent").value.trim();
  if (!title || !content) return alert("标题和内容必填");
  state.docs.unshift({ title, content, type: "本地资料" });
  saveDocs(state.docs);
  render();
}

function renderCommercialHealth() {
  const snapshot = readinessSnapshot();
  const moduleRows = DATA.courseModules.map((module) => {
    const count = snapshot.moduleCounts[module.id] || 0;
    const status = count >= 30 ? "达标" : count >= 10 ? "需扩充" : "偏少";
    return `<div class="quality-row"><strong>${escapeHtml(module.title)}</strong><span>${count} 题</span><span class="${count >= 30 ? "ok" : "warn"}">${status}</span></div>`;
  }).join("");
  const typeRows = Object.keys(questionTypeTitles).map((type) => {
    const count = snapshot.typeCounts[type] || 0;
    return `<div class="quality-row"><strong>${escapeHtml(questionTypeTitles[type])}</strong><span>${count} 题</span><span class="${count >= 20 ? "ok" : "warn"}">${count >= 20 ? "达标" : "需补题"}</span></div>`;
  }).join("");
  return `
    <section class="panel">
      <div class="title">商业化体检</div>
      <div class="stats-grid">
        <div><strong>${snapshot.totalQuestions}</strong><span>当前题量</span></div>
        <div><strong>${snapshot.commercialTarget}</strong><span>首个商业题量目标</span></div>
        <div><strong>${snapshot.reviewed}</strong><span>已标记审校题</span></div>
        <div><strong>${snapshot.readinessScore}</strong><span>准备度估算</span></div>
      </div>
      ${renderAccordion("模块题量覆盖", `<div class="quality-list">${moduleRows}</div>`, true)}
      ${renderAccordion("题型覆盖", `<div class="quality-list">${typeRows}</div>`)}
      <p class="muted">体检按单机可售版门槛估算：每模块 30 题、每大题型 80 题、总题量 1600+、题目完成审校。</p>
    </section>
  `;
}

function renderProfileTools() {
  return `
    <section class="panel">
      <div class="title">学习记录</div>
      <div class="stats-grid">
        <div><strong>${state.profile.answered}</strong><span>累计答题</span></div>
        <div><strong>${state.profile.correct}</strong><span>答对题数</span></div>
        <div><strong>${state.profile.wrongIds.length}</strong><span>错题本</span></div>
        <div><strong>${state.profile.completedModules.length}</strong><span>完成课程</span></div>
      </div>
      <div class="actions">
        <button class="btn secondary" onclick="exportProfile()">导出学习记录</button>
        <button class="btn secondary" onclick="resetProfile()">清空记录</button>
      </div>
      ${renderAccordion("导入学习记录", `
        <textarea id="profileImportContent" placeholder="粘贴之前导出的学习记录 JSON"></textarea>
        <button class="btn" onclick="importProfile()">导入</button>
      `)}
    </section>
  `;
}

function renderLibrary() {
  const docs = [...DATA.builtInDocs, ...state.docs].map(normalizeDoc);
  const docCards = docs.map(doc => (
    `<div class="card"><h3>${escapeHtml(doc.title)}</h3><span class="tag">${escapeHtml(doc.type || "资料")}</span><p>${formatChemText(doc.content)}</p></div>`
  )).join("");
  const examCards = (DATA.examPapers || []).map(item => `
    <div class="card">
      <h3>${escapeHtml(item.title)}</h3>
      <span class="tag">${escapeHtml(item.exam)} · ${escapeHtml(item.region)} · ${escapeHtml(item.year)}</span>
      <span class="tag">${escapeHtml(item.sourceStatus)}</span>
      <p>${formatChemText(item.summary)}</p>
      <p class="muted">${formatChemText(item.importHint)}</p>
    </div>
  `).join("");
  const sourceCards = (DATA.examSources || []).map(item => `
    <div class="card">
      <h3>${escapeHtml(item.title)}</h3>
      <span class="tag">${escapeHtml(item.exam)} · ${escapeHtml(item.region)}</span>
      <span class="tag">${escapeHtml(item.sourceType)}</span>
      <p>${formatChemText(item.classifyHint)}</p>
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开来源</a>
    </div>
  `).join("");
  const packCards = (DATA.examQuestionPacks || []).map(item => `
    <div class="card">
      <h3>${escapeHtml(item.title)}</h3>
      <span class="tag">${escapeHtml(item.status)}</span>
      <p>${formatChemText(item.description)}</p>
    </div>
  `).join("");
  return `
    ${renderCommercialHealth()}
    ${renderProfileTools()}
    <section class="panel">
      <div class="title">资料库</div>
      <input id="docTitle" placeholder="标题" />
      <textarea id="docContent" placeholder="粘贴补充知识、题目或讲解"></textarea>
      <button class="btn" onclick="saveDoc()">保存到本地浏览器</button>
    </section>
    <section class="panel">
      <div class="title">近年真题索引</div>
      <div class="grid">${examCards}</div>
    </section>
    <section class="panel">
      <div class="title">官方来源与知识区归类</div>
      <div class="grid">${sourceCards}</div>
    </section>
    <section class="panel">
      <div class="title">本地真题内容包</div>
      <div class="grid">${packCards}</div>
    </section>
    <section class="grid">${docCards}</section>
  `;
}
