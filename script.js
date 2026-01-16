// Basic profile site client code
// - Reads GH username from <meta name="gh-username" content="...">
// - Loads local projects/previous JSON
// - Fetches public GitHub events + repos for activity and repo list
// - Optional token: <meta name="gh-token" content="..."> (NOT recommended for public commits)

const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.content || '';
const username = meta('gh-username') || 'LunaTWolf';
const token = meta('gh-token'); // leave empty for public access

// Simple headers helper
const headers = token ? { Authorization: `token ${token}` } : { Accept: 'application/vnd.github.v3+json' };

document.addEventListener('DOMContentLoaded', () => {
  // populate avatar and name
  fetch(`https://api.github.com/users/${username}`, { headers })
    .then(r => r.ok ? r.json() : Promise.reject(r))
    .then(user => {
      document.getElementById('avatar').src = user.avatar_url;
      document.getElementById('name').textContent = user.name || username;
      document.getElementById('bio').textContent = user.bio || '';
      renderSocialLinks(user);
    })
    .catch(() => { /* silent */ });

  // load local lists
  loadJSON('projects.json').then(renderProjects).catch(() => {
    document.getElementById('current-projects').innerHTML = '<li>No current projects defined (projects.json)</li>';
  });
  loadJSON('previous.json').then(renderPrevious).catch(() => {
    document.getElementById('previous-work').innerHTML = '<li>No previous work defined (previous.json)</li>';
  });

  // fetch GitHub activity and repos
  fetchActivity();
  fetchRepos();
});

function loadJSON(path) {
  return fetch(path).then(r => {
    if (!r.ok) throw new Error('not found');
    return r.json();
  });
}

function renderSocialLinks(user) {
  // minimal social links — expand as you like
  const container = document.getElementById('social');
  const links = [
    { name: 'GitHub', url: `https://github.com/${username}` },
    ...(user.blog ? [{ name: 'Website', url: user.blog }] : []),
    ...(user.twitter_username ? [{ name: 'Twitter', url: `https://twitter.com/${user.twitter_username}` }] : [])
  ];
  container.innerHTML = links.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${l.name}</a>`).join(' ');
}

function renderProjects(list) {
  const el = document.getElementById('current-projects');
  el.innerHTML = (list || []).map(p => `
    <li>
      <strong><a href="${p.link || '#'}" target="_blank" rel="noopener">${p.title}</a></strong>
      <div class="repo-meta">${p.description || ''}</div>
      ${p.tags ? `<div class="repo-meta">Tags: ${p.tags.join(', ')}</div>` : ''}
    </li>
  `).join('') || '<li>No projects listed.</li>';
}

function renderPrevious(list) {
  const el = document.getElementById('previous-work');
  el.innerHTML = (list || []).map(p => `
    <li>
      <strong>${p.title}</strong>
      <div class="repo-meta">${p.description || ''}</div>
      ${p.when ? `<div class="repo-meta">When: ${p.when}</div>` : ''}
    </li>
  `).join('') || '<li>No previous work listed.</li>';
}

function fetchActivity() {
  const url = `https://api.github.com/users/${username}/events?per_page=20`;
  fetch(url, { headers })
    .then(r => r.ok ? r.json() : Promise.reject(r))
    .then(events => {
      const container = document.getElementById('activity-list');
      if (!events || events.length === 0) {
        container.textContent = 'No recent public activity.';
        return;
      }
      container.innerHTML = events.map(ev => {
        const type = ev.type.replace(/Event$/, '');
        const repo = ev.repo?.name || '';
        const created = new Date(ev.created_at).toLocaleString();
        let desc = `${type} on <strong>${repo}</strong>`;
        // small per-type adjustments
        if (ev.type === 'PushEvent') {
          const commits = ev.payload.commits?.map(c => c.message).slice(0,2).join('; ') || '';
          desc += ` — ${commits}`;
        } else if (ev.type === 'IssuesEvent') {
          desc += ` — ${ev.payload.action} issue #${ev.payload.issue?.number}`;
        } else if (ev.type === 'PullRequestEvent') {
          desc += ` — ${ev.payload.action} PR #${ev.payload.pull_request?.number}`;
        }
        return `<div class="event"><div>${desc}</div><div class="repo-meta">${created}</div></div>`;
      }).join('');
    })
    .catch(() => {
      document.getElementById('activity-list').textContent = 'Unable to load GitHub activity.';
    });
}

function fetchRepos() {
  const url = `https://api.github.com/users/${username}/repos?sort=updated&per_page=8`;
  fetch(url, { headers })
    .then(r => r.ok ? r.json() : Promise.reject(r))
    .then(repos => {
      const el = document.getElementById('repo-list');
      el.innerHTML = (repos || []).map(r => `
        <li>
          <strong><a href="${r.html_url}" target="_blank" rel="noopener">${r.name}</a></strong>
          <div class="repo-meta">${r.description || ''}</div>
          <div class="repo-meta">⭐ ${r.stargazers_count} • ${r.language || '—'}</div>
        </li>
      `).join('') || '<li>No repos found.</li>';
    })
    .catch(() => {
      document.getElementById('repo-list').innerHTML = '<li>Unable to load repos.</li>';
    });
}
