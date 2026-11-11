export function kind(post) { return typeof post.caption === 'string' ? 'full' : 'sequence' in post ? 'details' : 'private'; }
export function title(post) { return post.publicTitle || post.topic || `Post ${post.sourcePostNumber}`; }
export function filterPosts(posts, query = '', filter = 'all') {
  const q=query.trim().toLocaleLowerCase('en-AU');
  return posts.filter(p => (filter === 'all' || kind(p) === filter || (filter==='private'&&p.requiresPrivateReview===true) || (filter==='details'&&p.requiresLilianaInput===true)) && (!q || [p.sourcePostNumber,title(p),p.hook,p.caption].filter(v=>v!==undefined).join(' ').toLocaleLowerCase('en-AU').includes(q)));
}
export function counts(posts) {
  return { total: posts.length, approved: posts.filter(p=>p.approved===true).length,
    full: posts.filter(p=>kind(p)==='full').length, details: posts.filter(p=>kind(p)==='details').length, private: posts.filter(p=>kind(p)==='private').length };
}
export function adjacentId(posts, id, delta) {
  const index=posts.findIndex(p=>p.id===id);return posts[index+delta]?.id || null;
}
