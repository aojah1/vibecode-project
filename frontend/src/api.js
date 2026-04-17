const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  login:        (email, password)  => req('POST', '/auth/login', { email, password }),
  logout:       ()                 => req('POST', '/auth/logout'),
  me:           ()                 => req('GET',  '/auth/me'),

  getQuestions: ()                 => req('GET',  '/questions'),
  postQuestion: (questionText)     => req('POST', '/questions', { questionText }),
  likeQuestion: (id)               => req('POST', `/questions/${id}/like`),
  deleteQuestion:(id)              => req('DELETE',`/questions/${id}`),

  getGroups:    ()                 => req('GET',  '/groups'),
  runGrouping:  ()                 => req('POST', '/groups/run'),

  getQrCode:    ()                 => `${BASE}/qrcode`,
  getAppUrl:    ()                 => req('GET',  '/app-url'),
};
