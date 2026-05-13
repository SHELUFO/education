function filteredQuestions() {
  const stage = DATA.stageTests.find(item => item.id === state.stageId);
  const source = stage ? DATA.questions.filter(q => stage.questions.includes(q.id)) : DATA.questions;
  return source.filter(q => (
    (state.difficulty === "all" || q.difficulty === state.difficulty) &&
    (state.questionType === "all" || questionTypeOf(q) === state.questionType) &&
    (state.practiceModuleId === "all" || state.stageId !== "none" || q.moduleId === state.practiceModuleId) &&
    (!state.wrongOnly || state.profile.wrongIds.includes(q.id))
  ));
}
