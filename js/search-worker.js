// The full text is fetched only when the reader explicitly requests it.
let database;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
self.onmessage = async ({ data: { id, query } }) => {
  try {
    if (!database) database = fetch('/search-full.json').then(response => {
      if (!response.ok) throw new Error('Search unavailable');
      return response.json();
    }).catch(error => { database = null; throw error; });
    const posts = await database;
    const words = query.toLowerCase().trim().split(/[-\s]+/).filter(Boolean);
    const results = words.length ? posts.flatMap(post => {
      const content = post.content.toLowerCase();
      const positions = words.map(word => content.indexOf(word)).filter(index => index >= 0);
      if (!positions.length && !words.some(word => post.title.toLowerCase().includes(word))) return [];
      const excerpts = positions.map(index => post.content.slice(Math.max(0, index - 30), index + 160));
      return [{ title: escape(post.title), url: post.url, content: escape(excerpts.join(' … ')) }];
    }) : [];
    self.postMessage({ id, results });
  } catch (error) { self.postMessage({ id, error: '全文搜索加载失败，请重试。' }); }
};
