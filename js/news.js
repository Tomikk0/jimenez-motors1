const NEWS_TABLE = 'news_posts';
let newsItems = [];

function showNewsMessage(text, type = 'success') {
  showMessage(text, type, 'newsMessage');
}

function updateNewsAdminState() {
  try {
    const adminActions = document.getElementById('newsAdminActions');
    if (adminActions) {
      adminActions.style.display = isAdmin() ? 'flex' : 'none';
    }

    // Toggle delete buttons based on admin state
    const deleteButtons = document.querySelectorAll('[data-news-delete-btn]');
    deleteButtons.forEach(btn => {
      btn.style.display = isAdmin() ? 'inline-flex' : 'none';
    });
  } catch (error) {
    console.error('updateNewsAdminState error:', error);
  }
}

function formatNewsDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function renderNewsList(items = newsItems) {
  try {
    const container = document.getElementById('newsList');
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!items || items.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'car-card-empty';
      emptyState.textContent = '📰 Jelenleg nincs közzétett hír.';
      container.appendChild(emptyState);
      updateNewsAdminState();
      return;
    }

    items.forEach(item => {
      const article = document.createElement('article');
      article.className = 'marketplace-news-card';

      const titleEl = document.createElement('h3');
      titleEl.innerHTML = escapeHtml(item.title || '');

      const bodyEl = document.createElement('p');
      const content = (item.content || item.description || '').toString();
      bodyEl.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');

      const metaWrapper = document.createElement('div');
      metaWrapper.className = 'marketplace-news-meta';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'marketplace-news-date';
      dateSpan.textContent = formatNewsDate(item.published_at || item.created_at);
      metaWrapper.appendChild(dateSpan);

      if (item.created_by) {
        const authorSpan = document.createElement('span');
        authorSpan.className = 'marketplace-news-author';
        authorSpan.textContent = ` • ${item.created_by}`;
        metaWrapper.appendChild(authorSpan);
      }

      article.appendChild(titleEl);
      article.appendChild(bodyEl);
      article.appendChild(metaWrapper);

      if (isAdmin()) {
        const actions = document.createElement('div');
        actions.className = 'news-card-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'marketplace-outline-btn news-delete-btn';
        deleteBtn.setAttribute('data-news-delete-btn', 'true');
        deleteBtn.textContent = '🗑️ Hír törlése';
        deleteBtn.onclick = () => deleteNews(item.id);

        actions.appendChild(deleteBtn);
        article.appendChild(actions);
      }

      container.appendChild(article);
    });

    updateNewsAdminState();
  } catch (error) {
    console.error('renderNewsList error:', error);
  }
}

async function loadNews({ showSpinner = true } = {}) {
  const container = document.getElementById('newsList');
  if (!container) {
    return;
  }

  if (showSpinner) {
    container.innerHTML = '<div class="car-card-loading">Hírek betöltése...</div>';
  }

  try {
    let response = await supabase
      .from(NEWS_TABLE)
      .select('*')
      .order('published_at', { ascending: false });

    if (response.error && isMissingPublishedAtError(response.error)) {
      response = await supabase
        .from(NEWS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });
    }

    if (response.error) {
      throw response.error;
    }

    const data = response.data || [];

    newsItems = data.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content || item.body || '',
      description: item.description || '',
      published_at: item.published_at || item.publishedAt || item.created_at,
      created_at: item.created_at,
      created_by: item.created_by || item.author || ''
    }));

    renderNewsList(newsItems);
  } catch (error) {
    console.error('News load error:', error);
    container.innerHTML = '<div class="car-card-empty">❌ Hiba történt a hírek betöltésekor.</div>';
    showNewsMessage('Nem sikerült betölteni a híreket.', 'error');
  }
}

function isMissingPublishedAtError(error) {
  if (!error || !error.message) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('published_at') && message.includes('column');
}

function openAddNewsModal() {
  if (!isAdmin()) {
    showNewsMessage('🔒 Nincs jogosultságod hírt közzétenni.', 'error');
    return;
  }

  const modal = document.getElementById('addNewsModal');
  if (!modal) {
    return;
  }

  const dateInput = document.getElementById('newsDate');
  if (dateInput) {
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
  }

  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('open');
  modal.style.display = '';
  document.body.classList.add('modal-open');
}

function closeAddNewsModal({ resetForm = true } = {}) {
  const modal = document.getElementById('addNewsModal');
  if (!modal) {
    return;
  }

  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('open');
  modal.style.display = 'none';
  document.body.classList.remove('modal-open');

  if (resetForm) {
    resetNewsForm();
  }
}

function resetNewsForm() {
  const form = document.getElementById('newsForm');
  if (form) {
    form.reset();
  }
  const message = document.getElementById('newsModalMessage');
  if (message) {
    message.style.display = 'none';
    message.textContent = '';
    message.className = 'message';
  }
}

function showNewsModalMessage(text, type = 'success') {
  showMessage(text, type, 'newsModalMessage');
}

function setNewsFormLoading(isLoading) {
  const submitBtn = document.getElementById('saveNewsButton');
  if (submitBtn) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? '⏳ Mentés...' : '💾 Hír közzététele';
  }
}

function bindNewsModalEvents() {
  try {
    const openBtn = document.getElementById('openAddNewsModalBtn');
    if (openBtn && !openBtn.dataset.newsModalBound) {
      openBtn.dataset.newsModalBound = 'true';
      openBtn.onclick = event => {
        event?.preventDefault?.();
        openAddNewsModal();
      };
    }

    const form = document.getElementById('newsForm');
    if (form && !form.dataset.newsModalBound) {
      form.dataset.newsModalBound = 'true';
      form.addEventListener('submit', submitNewsForm);
    }

    const closeBtn = document.querySelector('#addNewsModal .modern-modal-close');
    if (closeBtn && !closeBtn.dataset.newsModalBound) {
      closeBtn.dataset.newsModalBound = 'true';
      closeBtn.addEventListener('click', () => closeAddNewsModal());
    }

    const overlay = document.querySelector('#addNewsModal .modern-modal-overlay');
    if (overlay && !overlay.dataset.newsModalBound) {
      overlay.dataset.newsModalBound = 'true';
      overlay.addEventListener('click', () => closeAddNewsModal());
    }
  } catch (error) {
    console.error('bindNewsModalEvents error:', error);
  }
}

async function submitNewsForm(event) {
  if (event) {
    event.preventDefault();
  }

  if (!isAdmin()) {
    showNewsModalMessage('Nincs jogosultságod hírt közzétenni.', 'error');
    return;
  }

  const titleInput = document.getElementById('newsTitle');
  const bodyInput = document.getElementById('newsContent');
  const dateInput = document.getElementById('newsDate');

  const title = titleInput ? titleInput.value.trim() : '';
  const content = bodyInput ? bodyInput.value.trim() : '';
  const publishedDate = dateInput ? dateInput.value : '';

  if (!title) {
    showNewsModalMessage('Add meg a hír címét!', 'warning');
    return;
  }

  if (!content) {
    showNewsModalMessage('Írj tartalmat a hírhez!', 'warning');
    return;
  }

  try {
    setNewsFormLoading(true);

    const payload = {
      title,
      content,
      published_at: publishedDate ? new Date(publishedDate).toISOString() : new Date().toISOString(),
      created_by: currentUser?.tagName || currentUser?.username || null
    };

    const { data, error } = await supabase
      .from(NEWS_TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

if (data) {
  await loadNews({ showSpinner: false });
}

    showNewsMessage('Új hír közzétéve!', 'success');
    closeAddNewsModal();
  } catch (error) {
    console.error('submitNewsForm error:', error);
    showNewsModalMessage('Nem sikerült közzétenni a hírt.', 'error');
  } finally {
    setNewsFormLoading(false);
  }
}
if (data && !newsItems.some(item => item.id === data.id)) {
  newsItems.unshift(data);
  renderNewsList(newsItems);
}


document.addEventListener('DOMContentLoaded', () => {
  bindNewsModalEvents();
});

window.openAddNewsModal = openAddNewsModal;
window.closeAddNewsModal = closeAddNewsModal;
window.submitNewsForm = submitNewsForm;
window.loadNews = loadNews;
window.deleteNews = deleteNews;
window.bindNewsModalEvents = bindNewsModalEvents;

async function deleteNews(id) {
  if (!isAdmin()) {
    showNewsMessage('Nincs jogosultságod a törléshez.', 'error');
    return;
  }

  if (!id) {
    return;
  }

  const confirmed = confirm('Biztosan törlöd ezt a hírt?');
  if (!confirmed) {
    return;
  }

  try {
    const { error } = await supabase
      .from(NEWS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    newsItems = newsItems.filter(item => item.id !== id);
    renderNewsList(newsItems);
    showNewsMessage('Hír törölve.', 'success');
  } catch (error) {
    console.error('deleteNews error:', error);
    showNewsMessage('Nem sikerült törölni a hírt.', 'error');
  }
}
