/**
 * Validates that every conditional question appears *after* the question it depends on.
 * Uses loose ID matching (==) so numeric DB ids and string client ids (e.g. "q_123") both work.
 * If the parent id cannot be found (orphan), we skip that rule so reorder isn't permanently blocked.
 * @param {Array<{ id: unknown, condition_question_id?: unknown }>} questions
 * @returns {boolean}
 */
export function isOrderValidForConditions(questions) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.condition_question_id == null || q.condition_question_id === "") {
      continue;
    }
    const pIdx = questions.findIndex(
      (p) => p.id == q.condition_question_id,
    );
    if (pIdx === -1) {
      continue;
    }
    if (pIdx >= i) {
      return false;
    }
  }
  return true;
}
