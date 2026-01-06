(function() {
  'use strict';

  var config = {
    apiKey: window.FOUNDRY_API_KEY || '',
    apiBase: window.FOUNDRY_API_BASE || '',
    position: window.FOUNDRY_POSITION || 'bottom-right',
    color: window.FOUNDRY_COLOR || '#52525b' // Subtle gray
  };

  if (!config.apiKey) {
    console.error('Foundry Widget: FOUNDRY_API_KEY is required');
    return;
  }

  // Detect API base from script src
  if (!config.apiBase) {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf('foundry-widget.js') !== -1) {
        var url = new URL(scripts[i].src);
        config.apiBase = url.origin;
        break;
      }
    }
  }

  var state = {
    selecting: false,
    selectedElement: null,
    elementData: null
  };

  var elements = {};

  // Inject styles
  function injectStyles() {
    var css = [
      '.fnd-btn{position:fixed;z-index:999998;width:44px;height:44px;padding:0;border:none;border-radius:50%;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:all 0.2s;display:flex;align-items:center;justify-content:center}',
      '.fnd-btn:hover{transform:scale(1.05);box-shadow:0 4px 12px rgba(0,0,0,0.2)}',
      '.fnd-btn svg{width:20px;height:20px}',
      '.fnd-btn.bottom-right{bottom:20px;right:20px}',
      '.fnd-btn.bottom-left{bottom:20px;left:20px}',
      '.fnd-btn.top-right{top:20px;right:20px}',
      '.fnd-btn.top-left{top:20px;left:20px}',
      '.fnd-btn.selecting{animation:fnd-pulse 1.5s ease-in-out infinite}',
      '@keyframes fnd-pulse{0%,100%{box-shadow:0 0 0 0 rgba(232,81,2,0.4)}50%{box-shadow:0 0 0 10px rgba(232,81,2,0)}}',
      '@keyframes fnd-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '.fnd-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:999996;cursor:crosshair}',
      '.fnd-highlight{position:fixed;z-index:999997;pointer-events:none;border:3px solid #E85102;border-radius:4px;background:rgba(232,81,2,0.1);transition:all 0.1s}',
      '.fnd-modal-bg{position:fixed;top:0;left:0;right:0;bottom:0;z-index:999998;background:rgba(0,0,0,0.5)}',
      '.fnd-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;background:#fff;border-radius:8px;padding:24px;width:500px;max-width:calc(100vw - 40px);box-shadow:0 20px 40px rgba(0,0,0,0.2);font-family:monospace}',
      '.fnd-modal h3{margin:0 0 8px;font-size:16px;text-transform:uppercase;letter-spacing:0.1em}',
      '.fnd-element{background:#f5f5f0;border-radius:4px;padding:8px 12px;margin-bottom:16px;font-size:12px;color:#666}',
      '.fnd-element code{background:#e0e3d6;padding:2px 6px;border-radius:2px}',
      '.fnd-textarea{width:100%;min-height:100px;padding:12px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;resize:vertical;margin-bottom:16px;box-sizing:border-box}',
      '.fnd-textarea:focus{outline:none;border-color:#E85102}',
      '.fnd-btns{display:flex;gap:8px;justify-content:flex-end}',
      '.fnd-submit,.fnd-cancel{padding:10px 20px;border-radius:4px;font-family:monospace;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;cursor:pointer;transition:opacity 0.2s;border:none}',
      '.fnd-submit{background:#000;color:#fff}',
      '.fnd-cancel{background:transparent;color:#999}',
      '.fnd-submit:hover,.fnd-cancel:hover{opacity:0.8}',
      '.fnd-submit:disabled{opacity:0.5;cursor:not-allowed}',
      '.fnd-success{text-align:center;padding:20px}',
      '.fnd-success svg{width:48px;height:48px;color:#22c55e;margin:0 auto 12px;display:block}'
    ].join('');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Icon
  var icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M40,130.42c72-89.55,104,84.71,176-4.84" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>';

  // Create main button
  function createButton() {
    var btn = document.createElement('button');
    btn.className = 'fnd-btn ' + config.position;
    btn.style.backgroundColor = config.color;
    btn.style.color = '#fff';
    btn.innerHTML = icon;
    btn.onclick = startSelection;
    document.body.appendChild(btn);
    elements.btn = btn;
  }

  // Start element selection mode
  function startSelection() {
    state.selecting = true;
    elements.btn.classList.add('selecting');

    // Create overlay
    elements.overlay = document.createElement('div');
    elements.overlay.className = 'fnd-overlay';
    elements.overlay.onclick = handleClick;
    document.body.appendChild(elements.overlay);

    // Create highlighter
    elements.highlight = document.createElement('div');
    elements.highlight.className = 'fnd-highlight';
    elements.highlight.style.display = 'none';
    document.body.appendChild(elements.highlight);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
  }

  function handleMouseMove(e) {
    if (!state.selecting) return;

    elements.overlay.style.pointerEvents = 'none';
    var el = document.elementFromPoint(e.clientX, e.clientY);
    elements.overlay.style.pointerEvents = 'auto';

    if (el && !el.classList.contains('fnd-btn')) {
      var rect = el.getBoundingClientRect();
      elements.highlight.style.display = 'block';
      elements.highlight.style.top = rect.top + 'px';
      elements.highlight.style.left = rect.left + 'px';
      elements.highlight.style.width = rect.width + 'px';
      elements.highlight.style.height = rect.height + 'px';
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') cancelSelection();
  }

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();

    elements.overlay.style.pointerEvents = 'none';
    var el = document.elementFromPoint(e.clientX, e.clientY);
    elements.overlay.style.pointerEvents = 'auto';

    if (el && !el.classList.contains('fnd-btn')) {
      state.selectedElement = el;
      state.elementData = captureElement(el);
      endSelection();
      showModal();
    }
  }

  function captureElement(el) {
    var data = { tag: el.tagName.toLowerCase() };
    if (el.id) data.id = el.id;
    if (el.classList.length) data.classes = Array.from(el.classList);
    var text = (el.textContent || '').trim().slice(0, 200);
    if (text) data.textContent = text;
    data.xpath = getXPath(el);

    // Parent hierarchy (up to 3 levels)
    var parents = [];
    var parent = el.parentElement;
    var depth = 0;
    while (parent && depth < 3) {
      parents.push({
        tag: parent.tagName.toLowerCase(),
        id: parent.id || undefined,
        classes: parent.classList.length ? Array.from(parent.classList) : undefined
      });
      parent = parent.parentElement;
      depth++;
    }
    if (parents.length) data.parentHierarchy = parents;

    return data;
  }

  function getXPath(el) {
    var parts = [];
    while (el && el.nodeType === 1) {
      var idx = 1;
      var sib = el.previousElementSibling;
      while (sib) {
        if (sib.tagName === el.tagName) idx++;
        sib = sib.previousElementSibling;
      }
      parts.unshift(el.tagName.toLowerCase() + '[' + idx + ']');
      el = el.parentElement;
    }
    return '/' + parts.join('/');
  }

  function cancelSelection() {
    endSelection();
    resetButton();
  }

  function endSelection() {
    state.selecting = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('keydown', handleKeyDown);
    if (elements.overlay) { elements.overlay.remove(); elements.overlay = null; }
    if (elements.highlight) { elements.highlight.remove(); elements.highlight = null; }
  }

  function resetButton() {
    elements.btn.classList.remove('selecting');
  }

  function showModal() {
    var bg = document.createElement('div');
    bg.className = 'fnd-modal-bg';
    bg.onclick = closeModal;
    elements.modalBg = bg;

    var modal = document.createElement('div');
    modal.className = 'fnd-modal';

    var elInfo = state.elementData;
    // Show truncated text content for display
    var displayText = elInfo.textContent ? elInfo.textContent.slice(0, 100) : elInfo.tag;
    if (elInfo.textContent && elInfo.textContent.length > 100) displayText += '...';

    modal.innerHTML = [
      '<h3>Share Feedback</h3>',
      '<div class="fnd-element">Selected: <code>' + displayText + '</code></div>',
      '<textarea class="fnd-textarea" placeholder="Describe your feedback, suggestion, or issue..."></textarea>',
      '<div class="fnd-btns">',
      '<button class="fnd-cancel">Cancel</button>',
      '<button class="fnd-submit">Submit</button>',
      '</div>'
    ].join('');

    elements.modal = modal;
    document.body.appendChild(bg);
    document.body.appendChild(modal);

    modal.querySelector('.fnd-cancel').onclick = closeModal;
    modal.querySelector('.fnd-submit').onclick = submitFeedback;
    modal.querySelector('.fnd-textarea').focus();
  }

  function closeModal() {
    if (elements.modalBg) { elements.modalBg.remove(); elements.modalBg = null; }
    if (elements.modal) { elements.modal.remove(); elements.modal = null; }
    state.selectedElement = null;
    state.elementData = null;
    resetButton();
  }

  function submitFeedback() {
    var textarea = elements.modal.querySelector('.fnd-textarea');
    var description = textarea.value.trim();

    if (!description) {
      textarea.style.borderColor = '#dc2626';
      return;
    }

    var submitBtn = elements.modal.querySelector('.fnd-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    var payload = {
      description: description,
      pageUrl: window.location.href,
      pageTitle: document.title,
      elementData: state.elementData
    };

    fetch(config.apiBase + '/api/widget/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.apiKey
      },
      body: JSON.stringify(payload)
    })
    .then(function(res) {
      if (!res.ok) throw new Error('Failed');
      showSuccess();
    })
    .catch(function() {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
      textarea.style.borderColor = '#dc2626';
    });
  }

  function showSuccess() {
    elements.modal.innerHTML = [
      '<div class="fnd-success">',
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">',
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
      '</svg>',
      '<h3>Thanks!</h3>',
      '<p style="color:#666;font-size:14px">Your feedback has been submitted.</p>',
      '</div>'
    ].join('');

    setTimeout(closeModal, 2000);
  }

  // Initialize
  injectStyles();
  createButton();
})();
