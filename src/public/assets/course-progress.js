const root = document.querySelector('[data-course]');
if (root) {
  const course = root.dataset.course;
  const locale = (location.pathname.match(/^\/(ko|en|zh)\//)?.[1]) || 'en';
  const storageKey = `fivegrid:course:${locale}:${course}`;
  const buttons = [...root.querySelectorAll('[data-lesson-id]')];
  const checkpoints = [...root.querySelectorAll('[data-checkpoint]')];

  let state = { lessons: [], checkpoints: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (Array.isArray(saved.lessons)) state.lessons = saved.lessons;
    if (Array.isArray(saved.checkpoints)) state.checkpoints = saved.checkpoints;
  } catch {
    state = { lessons: [], checkpoints: [] };
  }

  const validLessonIds = new Set(buttons.map((button) => button.dataset.lessonId));
  state.lessons = [...new Set(state.lessons.filter((id) => validLessonIds.has(id)))];
  state.checkpoints = [...new Set(state.checkpoints
    .map(Number)
    .filter((id) => Number.isInteger(id) && id >= 0 && id < checkpoints.length))];

  const persist = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* private mode */ }
  };

  const render = () => {
    buttons.forEach((button) => {
      const complete = state.lessons.includes(button.dataset.lessonId);
      button.setAttribute('aria-pressed', String(complete));
      button.closest('[data-lesson-card]')?.classList.toggle('is-complete', complete);
    });
    checkpoints.forEach((checkbox) => {
      checkbox.checked = state.checkpoints.includes(Number(checkbox.dataset.checkpoint));
    });

    const completeCount = state.lessons.length;
    const percent = buttons.length ? Math.round((completeCount / buttons.length) * 100) : 0;
    const progressLabel = root.querySelector('[data-progress-label]');
    const progressPercent = root.querySelector('[data-progress-percent]');
    const progressBar = root.querySelector('[data-progress-bar]');
    if (progressLabel) progressLabel.textContent = `${completeCount} / ${buttons.length}`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressBar) progressBar.style.width = `${percent}%`;
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.lessonId;
      state.lessons = state.lessons.includes(id)
        ? state.lessons.filter((item) => item !== id)
        : [...state.lessons, id];
      persist();
      render();
    });
  });

  checkpoints.forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const id = Number(checkbox.dataset.checkpoint);
      state.checkpoints = checkbox.checked
        ? [...new Set([...state.checkpoints, id])]
        : state.checkpoints.filter((item) => item !== id);
      persist();
      render();
    });
  });

  render();
}
