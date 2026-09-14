// frontend/src/utils/mediaStore.js
// In-memory holder for recorded answer clips during a single interview session.
// Blobs can't be put in localStorage (JSON only), and we no longer upload them
// one-by-one — we hold them here until the interview finishes, then send
// everything to /api/analyze-interview-batch in one request.
const clips = new Map();

export const mediaStore = {
  set(questionId, blob) { clips.set(String(questionId), blob); },
  get(questionId) { return clips.get(String(questionId)) || null; },
  has(questionId) { return clips.has(String(questionId)); },
  delete(questionId) { clips.delete(String(questionId)); },
  clear() { clips.clear(); },
  all() { return clips; }, // Map<questionId, Blob> — passed straight to analyzeInterviewBatch
};