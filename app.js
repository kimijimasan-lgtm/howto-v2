// ============================================
//  ハウツー解説 v2 – app.js
//  Firebase Realtime Database (CDN compat)
// ============================================

// ── Firebase CDN 読み込みエラー検出 ──
if (typeof firebase === 'undefined' || typeof firebase.database === 'undefined' || typeof firebase.auth === 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const errDiv = document.createElement('div');
    errDiv.style.position = 'fixed';
    errDiv.style.inset = '0';
    errDiv.style.background = '#1e293b';
    errDiv.style.color = '#f1f5f9';
    errDiv.style.padding = '2rem';
    errDiv.style.zIndex = '999999';
    errDiv.style.fontFamily = 'sans-serif';
    errDiv.style.lineHeight = '1.6';
    
    let reason = "インターネット環境がないか、セキュリティによりアプリが起動できません。";
    if (typeof firebase !== 'undefined' && typeof firebase.auth === 'undefined') {
      reason = "ブラウザの強力なキャッシュ機能により、古いHTMLと新しいプログラムが混ざって競合しています（認証ライブラリが未ロード）。";
    }

    errDiv.innerHTML = `
      <h1 style="font-size: 1.5rem; color: #f43f5e; margin-bottom: 1rem;">⚠️ アプリ起動エラー（キャッシュ不整合）</h1>
      <p style="font-weight: 700; margin-bottom: 1rem;">${reason}</p>
      <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-top: 1rem; font-size: 0.9rem; line-height: 1.6;">
        <strong>💡 超簡単な解決策：</strong><br>
        1. ブラウザで<strong>「ページを再読み込み（リロード）」</strong>を数回行ってください。<br>
        2. それでも解消しない場合は、Safariの<strong>「プライベートブラウズモード」</strong>（Chromeの場合はシークレットモード）で開いていただくか、ブラウザのキャッシュ（履歴とWebサイトデータ）をクリアしてください。これで最新版が読み込まれて完全に解決します！
      </div>
    `;
    document.body.appendChild(errDiv);
  });
  throw new Error("Firebase library is not loaded properly");
}

// ── Firebase 初期化 ──────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCWRY0dXtRqybI048q0btT-kW-rMnHfiW8",
  authDomain: "torisetu-234c3.firebaseapp.com",
  databaseURL: "https://torisetu-234c3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "torisetu-234c3",
  storageBucket: "torisetu-234c3.firebasestorage.app",
  messagingSenderId: "1036476479724",
  appId: "1:1036476479724:web:2996ecebe04f61bc448dc9",
  measurementId: "G-V24PQM9NYD"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ── テーマ管理 ────────────────────────────────────────────────────────
const THEMES = [
  { id: 'dark',     label: 'ダーク',         swatch: '#0d1117' },
  { id: 'ocean',    label: 'オーシャン',     swatch: '#102840' },
  { id: 'purple',   label: 'パープル',       swatch: '#1e0e3a' },
  { id: 'mint',     label: 'ミント',         swatch: '#eaf7f2' },
  { id: 'sepia',    label: 'セピア',         swatch: '#f5edd8' },
  { id: 'light',    label: 'ライト',         swatch: '#f2f4f7' },
  { id: 'rose',     label: 'ローズ',         swatch: '#fce0ec' },
  { id: 'lavender', label: 'ラベンダー',     swatch: '#ddd6fe' },
  { id: 'coral',    label: 'コーラル',       swatch: '#ffd4bf' },
  { id: 'gold',     label: 'ゴールド',       swatch: '#c9930a' },
  { id: 'charcoal', label: 'チャコール',     swatch: '#3a3a3c' },
  { id: 'forest',   label: 'フォレスト',     swatch: '#0d2010' },
];

function applyTheme(name) {
  const html = document.documentElement;
  ['dark', 'ocean', 'purple', 'mint', 'sepia', 'light', 'rose', 'lavender', 'coral', 'gold', 'charcoal', 'forest']
    .forEach(id => html.classList.remove('theme-' + id));
  if (name && name !== 'dark') html.classList.add('theme-' + name);
  localStorage.setItem('app-theme', name || 'dark');
}

function getCurrentTheme() {
  return localStorage.getItem('app-theme') || 'rose';
}

function showThemePicker() {
  const current = getCurrentTheme();
  const overlay = document.createElement('div');
  overlay.className = 'theme-picker-overlay';
  overlay.innerHTML = `
    <div class="theme-picker-sheet">
      <div class="theme-picker-title">テーマ色を選んでください</div>
      <div class="theme-picker-grid">
        ${THEMES.map(t => `
          <button class="theme-swatch-btn${t.id === current ? ' active' : ''}" data-theme="${t.id}">
            <span class="theme-swatch" style="background:${t.swatch}"></span>
            <span class="theme-swatch-label">${t.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  overlay.addEventListener('click', e => {
    const btn = e.target.closest('[data-theme]');
    if (btn) {
      applyTheme(btn.dataset.theme);
      document.body.removeChild(overlay);
    } else if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
  document.body.appendChild(overlay);
}

// ── カラーパレット（24色・白テキストとのコントラスト保証） ──────────
const COLORS = [
  // ブルー系
  { label: 'インディゴ',   grad: 'linear-gradient(135deg,#4f46e5,#6366f1)' },
  { label: 'バイオレット', grad: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
  { label: 'ブルー',       grad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' },
  { label: 'スカイ',       grad: 'linear-gradient(135deg,#0284c7,#0ea5e9)' },
  { label: 'シアン',       grad: 'linear-gradient(135deg,#0891b2,#06b6d4)' },
  { label: 'ネイビー',     grad: 'linear-gradient(135deg,#1e3a5f,#1e40af)' },
  // グリーン系
  { label: 'ティール',     grad: 'linear-gradient(135deg,#0d9488,#14b8a6)' },
  { label: 'エメラルド',   grad: 'linear-gradient(135deg,#059669,#10b981)' },
  { label: 'グリーン',     grad: 'linear-gradient(135deg,#16a34a,#22c55e)' },
  { label: 'ライム',       grad: 'linear-gradient(135deg,#4d7c0f,#65a30d)' },
  { label: 'フォレスト',   grad: 'linear-gradient(135deg,#14532d,#166534)' },
  { label: 'オリーブ',     grad: 'linear-gradient(135deg,#713f12,#854d0e)' },
  // レッド・ピンク・オレンジ系
  { label: 'レッド',       grad: 'linear-gradient(135deg,#b91c1c,#ef4444)' },
  { label: 'ローズ',       grad: 'linear-gradient(135deg,#9d174d,#db2777)' },
  { label: 'ピンク',       grad: 'linear-gradient(135deg,#be185d,#ec4899)' },
  { label: 'オレンジ',     grad: 'linear-gradient(135deg,#c2410c,#f97316)' },
  { label: 'アンバー',     grad: 'linear-gradient(135deg,#b45309,#f59e0b)' },
  { label: 'イエロー',     grad: 'linear-gradient(135deg,#a16207,#ca8a04)' },
  // ダーク・ニュートラル系
  { label: 'バーガンディ', grad: 'linear-gradient(135deg,#7f1d1d,#991b1b)' },
  { label: 'ブラウン',     grad: 'linear-gradient(135deg,#431407,#7c2d12)' },
  { label: 'スレート',     grad: 'linear-gradient(135deg,#334155,#64748b)' },
  { label: 'グレー',       grad: 'linear-gradient(135deg,#374151,#6b7280)' },
  { label: 'チャコール',   grad: 'linear-gradient(135deg,#111827,#374151)' },
  { label: 'ブラック',     grad: 'linear-gradient(135deg,#030712,#1f2937)' },
];
const DEFAULT_GRAD = COLORS[0].grad;

// ── 状態管理 ─────────────────────────────────
let state = { screen: 'home', categoryId: null, articleId: null, uid: null, editorMode: 'view', isPremium: false, isAnonymous: false };
let activePasteMarkerP = null;
let activePasteLocation = null;
let isComposing = false;
let isRemovingTrailingP = false; // onUpdate 内での末尾空段落除去ループ防止フラグ
// IME確定直後（同一ティック内）に発火する「幽霊Enter」を無視するためのフラグ。
// iPhoneの日本語キーボードは「変換確定」と「改行」が同じEnterキーに割り当てられており、
// 確定操作のEnterのkeydownでも isComposing が false になっているケースがあるため、
// compositionend直後の極短時間だけEnterの自前処理をスキップする。
let compositionJustEnded = false;
let toastQueue = [];
let isToastShowing = false;

function removePasteMarker() {
  const editor = document.getElementById('edContent');
  if (editor) {
    const existing = editor.querySelector('.paste-insert-line');
    if (existing) existing.remove();
  }
  activePasteMarkerP = null;
  activePasteLocation = null;
}

function showPasteMarker(targetP, location) {
  removePasteMarker(); // 既存のものを消す
  
  activePasteMarkerP = targetP;
  activePasteLocation = location;

  const editor = document.getElementById('edContent');
  if (!editor || !targetP) return;

  const marker = document.createElement('div');
  marker.className = 'paste-insert-line';
  marker.style.pointerEvents = 'none';

  // ガイドメッセージを追加
  const guide = document.createElement('div');
  guide.className = 'paste-guide-message';
  guide.textContent = 'ラインの下に貼り付け位置をタップしてください';
  guide.style.position = 'absolute';
  guide.style.top = '8px'; // ラインの少し下
  guide.style.left = '50%';
  guide.style.transform = 'translateX(-50%)';
  guide.style.background = 'rgba(249, 115, 22, 0.9)'; // オレンジ背景
  guide.style.color = '#ffffff';
  guide.style.padding = '0.35rem 0.75rem';
  guide.style.borderRadius = '6px';
  guide.style.fontSize = '0.75rem';
  guide.style.fontWeight = 'bold';
  guide.style.whiteSpace = 'nowrap';
  guide.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
  guide.style.zIndex = '9999999';
  marker.appendChild(guide);

  // targetP に対する絶対的な位置を計算する
  const rect = targetP.getBoundingClientRect();
  const editorRect = editor.getBoundingClientRect();
  const scrollTop = editor.scrollTop;

  let top = 0;
  if (location === 'before') {
    top = rect.top - editorRect.top + scrollTop - 2;
  } else {
    top = rect.bottom - editorRect.top + scrollTop - 2;
  }

  marker.style.top = `${top}px`;
  editor.appendChild(marker);
}
let listeners   = [];   // Firebase off() 用
let saveTimer   = null;
let catSortable = null;
let artSortable = null;
let navHistory  = [];   // 画面履歴スタック
let isDragging  = false; // ドラッグ並び替え中ガードフラグ
let preDragHTML = null;  // ドラッグ開始直前の TipTap HTML（DOM汚染回避用）
let paraSortable = null;
let paraSwipeListeners = [];
let justEditedArticleId = null;  // 直前に編集したカードのID（フラッシュ明滅用）
let lastDeletedContent = null;   // 削除直前のエディタHTML（Undo用）
let pasteAutoHideTimer = null;   // カット後5秒で貼り付けボタンを自動非表示
let tiptapEditor = null;         // TipTapエディターインスタンス
let origDataUrls = [];           // Safari blob: URL 復元用 data: URL 配列
let _multiTouchActive = false;   // 2本指以上の操作中はスワイプ戻る/段落選択ジェスチャーを無効化（画像ピンチとの競合防止）

// ── エディター内容の即時強制保存 ─────────────────
function forceSaveEditorContent() {
  if (state.screen !== 'editor' || !state.articleId || !state.categoryId || !state.uid) return;

  if (saveTimer) clearTimeout(saveTimer);

  let cleanHTML = '';
  if (tiptapEditor) {
    cleanHTML = getCleanEditorHTML();
  } else {
    const editor = document.getElementById('edContent');
    if (editor) cleanHTML = getCleanEditorHTML(editor);
  }

  db.ref(`users/${state.uid}/articles/${state.categoryId}/${state.articleId}`).update({
    content: cleanHTML,
    updatedAt: Date.now()
  }).catch(err => console.error("Force save error:", err));

  // TipTapインスタンスを破棄
  if (tiptapEditor) {
    tiptapEditor.destroy();
    tiptapEditor = null;
  }

  // リスナー解放
  const editor = document.getElementById('edContent');
  if (editor) cleanupNativeParagraphListeners(editor);
}

// ── 画面遷移 ─────────────────────────────────
function goTo(screen, categoryId = null, articleId = null, skipSave = false) {
  // エディターから遷移する場合は即座に強制保存
  if (state.screen === 'editor' && !skipSave) {
    justEditedArticleId = state.articleId;
    forceSaveEditorContent();
  }

  // 履歴管理
  if (screen === 'home' || screen === 'login') {
    navHistory = [];  // ホームやログインへ戻ると履歴リセット
  } else {
    navHistory.push({ screen: state.screen, categoryId: state.categoryId, articleId: state.articleId });
  }

  // 前の画面のリスナーをすべて解除
  listeners.forEach(fn => fn());
  listeners = [];
  if (saveTimer) clearTimeout(saveTimer);
  if (tiptapEditor) { tiptapEditor.destroy(); tiptapEditor = null; }

  state = { screen, categoryId, articleId, uid: state.uid, isPremium: state.isPremium, isAnonymous: state.isAnonymous };

  const app = document.getElementById('app');
  app.classList.remove('visible');

  setTimeout(() => {
    app.innerHTML = '';
    if (screen === 'login')    renderLogin(app);
    else if (screen === 'home')     renderHome(app);
    else if (screen === 'category') renderCategory(app);
    else if (screen === 'editor')   renderEditor(app);
    app.classList.add('visible');
  }, 90);
}

// ── 1つ前の画面へ戻る ────────────────────────
function goBack(skipSave = false) {
  if (navHistory.length === 0) return;

  // カテゴリ一覧からホームへ戻る際、カテゴリIDを記憶する
  if (state.screen === 'category') {
    window.justVisitedCategoryId = state.categoryId;
  }

  // エディターから戻る場合は即座に強制保存
  if (state.screen === 'editor' && !skipSave) {
    justEditedArticleId = state.articleId;
    forceSaveEditorContent();
  }

  const prev = navHistory.pop();

  listeners.forEach(fn => fn());
  listeners = [];
  if (saveTimer) clearTimeout(saveTimer);
  if (tiptapEditor) { tiptapEditor.destroy(); tiptapEditor = null; }

  state = { screen: prev.screen, categoryId: prev.categoryId, articleId: prev.articleId, uid: state.uid, isPremium: state.isPremium, isAnonymous: state.isAnonymous };

  const app = document.getElementById('app');
  app.classList.remove('visible');
  setTimeout(() => {
    app.innerHTML = '';
    if (state.screen === 'home')     renderHome(app);
    if (state.screen === 'category') renderCategory(app);
    if (state.screen === 'editor')   renderEditor(app);
    app.classList.add('visible');
  }, 90);
}

// ── 右スワイプで戻る ─────────────────────
function addSwipeBack(el, onSwipe) {
  let sx = 0, sy = 0;
  const onStart = e => {
    if (e.touches.length > 1) { _multiTouchActive = true; return; } // 画像ピンチ等の2本指操作はスワイプ判定対象外
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  };
  const onEnd = e => {
    // 2本指以上の操作（画像ピンチ等）に伴うタッチ終了はスワイプ判定しない
    if (e.touches.length > 0) return;
    if (_multiTouchActive) { _multiTouchActive = false; return; }

    // 文字選択（範囲選択）中である場合は絶対に無効化する
    if (window.getSelection().toString() !== '') return;

    const dx    = e.changedTouches[0].clientX - sx;
    const rawDy = e.changedTouches[0].clientY - sy; // 符号付き（上が負）
    const dy    = Math.abs(rawDy);
    // 速度・時間を除外し方向角度のみで判定: 右方向20px以上、かつ上への移動が30px以内
    if (dx > 20 && dy < dx * 5 && rawDy > -30) onSwipe();
  };
  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchend',   onEnd,   { passive: true });
  // 画面遷移時に必ず削除されるよう listeners に登録
  listeners.push(() => {
    el.removeEventListener('touchstart', onStart);
    el.removeEventListener('touchend',   onEnd);
  });
}

// ── プルダウンで新規メモ作成 ──────────────────────
function addPullToCreate(el) {
  const THRESHOLD = 80;
  let startX = -1;
  let startY = -1;
  let indicator = null;
  let isCancelled = false;

  const mkIndicator = () => {
    const d = document.createElement('div');
    d.className = 'pull-indicator';
    el.parentElement.insertBefore(d, el);
    return d;
  };

  const onStart = e => {
    // 並び替えドラッグ操作中の場合は新規作成を完全にガード
    if (isDragging) { startY = -1; return; }

    if (el.scrollTop === 0) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isCancelled = false;
    } else {
      startY = -1;
    }
  };
  const onMove = e => {
    if (startY < 0 || isCancelled || isDragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    // 右方向に10px以上動いたら即時キャンセル（右スワイプでのホーム戻りを確実に優先）
    if (dx > 10) {
      isCancelled = true;
      if (indicator) { indicator.remove(); indicator = null; }
      return;
    }
    // 横ブレを監視：横スワイプ等の動作（横移動が10pxを超え、かつ縦移動の40%以上）を検知したら即時キャンセル
    if (Math.abs(dx) > 10 && Math.abs(dx) > dy * 0.4) {
      isCancelled = true;
      if (indicator) { indicator.remove(); indicator = null; }
      return;
    }

    if (dy <= 0) { startY = -1; return; }
    if (!indicator) indicator = mkIndicator();
    const ratio = Math.min(dy / THRESHOLD, 1);
    indicator.style.height  = `${Math.min(dy * 0.6, 48)}px`;
    indicator.style.opacity = String(ratio);
    indicator.textContent   = ratio >= 1 ? '✚ 離して新規メモ' : '↓ 引いて新規メモ';
    indicator.classList.toggle('pull-ready', ratio >= 1);
  };
  const onEnd = e => {
    if (startY < 0 || isCancelled || isDragging) {
      if (indicator) { indicator.remove(); indicator = null; }
      startY = -1;
      return;
    }
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (indicator) { indicator.remove(); indicator = null; }
    
    // 最終判定：真下方向（右への移動が10px以下かつ横ブレが縦の15%未満）のみ新規作成
    if (dy >= THRESHOLD && dx <= 10 && Math.abs(dx) < dy * 0.15) {
      createArticle(true);
    }
    startY = -1;
  };

  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchmove',  onMove,  { passive: true });
  el.addEventListener('touchend',   onEnd,   { passive: true });
  listeners.push(() => {
    el.removeEventListener('touchstart', onStart);
    el.removeEventListener('touchmove',  onMove);
    el.removeEventListener('touchend',   onEnd);
  });
}

// ── HTML → 行配列（安全な改行認識） ──────────────
function htmlToLines(html) {
  if (!html) return [];
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  
  // スワイプチェックボックス ✔ など一時要素はパースから排除する
  const checkmarks = tmp.querySelectorAll('.para-checkbox');
  checkmarks.forEach(c => c.remove());

  // 子要素から行を抽出する（innerTextが未ロードDOMで改行を無視する問題を回避）
  const lines = [];
  Array.from(tmp.children).forEach(child => {
    const txt = child.textContent.trim();
    if (txt) {
      lines.push(txt);
    }
  });

  // 子要素が全くないフラットなテキストの場合のフォールバック
  if (lines.length === 0 && tmp.textContent.trim()) {
    return tmp.textContent.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
  }

  return lines;
}

// ── 貼り付け時のMarkdown除去・空行正規化 ──────────────────
function cleanMarkdownForPaste(text) {
  const lines = text.split('\n');
  const result = [];
  let inCodeBlock = false;

  for (let line of lines) {
    // コードブロックの開閉 (``` または ~~~)
    if (/^(`{3,}|~{3,})/.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
      continue; // フェンス行自体は除去
    }
    if (inCodeBlock) {
      result.push(line); // コードブロック内はそのまま保持
      continue;
    }

    // 見出し: # ## ### ... → テキスト部分のみ
    line = line.replace(/^#{1,6}\s+/, '');

    // 太字: **text** / __text__ → text（先に処理）
    line = line.replace(/\*\*(.+?)\*\*/g, '$1');
    line = line.replace(/__(.+?)__/g, '$1');

    // イタリック: *text* / _text_ → text（太字除去後に処理）
    line = line.replace(/\*(.+?)\*/g, '$1');
    line = line.replace(/_(.+?)_/g, '$1');

    // 取り消し線: ~~text~~ → text
    line = line.replace(/~~(.+?)~~/g, '$1');

    // インラインコード: `code` → code
    line = line.replace(/`([^`]+)`/g, '$1');

    // 箇条書き: - item / * item / + item（行頭のみ）
    line = line.replace(/^[\-\*\+]\s+/, '');

    // 番号付きリスト: 1. item（行頭のみ）
    line = line.replace(/^\d+\.\s+/, '');

    // 引用: > text → text
    line = line.replace(/^(>\s*)+/, '');

    // 水平線: --- / *** / ___ → 除去（行全体）
    if (/^[\-\*_]{3,}\s*$/.test(line.trim())) continue;

    result.push(line);
  }

  // 連続する空行を最大1行にまとめる
  const collapsed = [];
  let prevEmpty = false;
  for (const line of result) {
    const isEmpty = line.trim() === '';
    if (isEmpty && prevEmpty) continue;
    collapsed.push(line);
    prevEmpty = isEmpty;
  }

  // 先頭・末尾の空行を除去
  while (collapsed.length > 0 && collapsed[0].trim() === '') collapsed.shift();
  while (collapsed.length > 0 && collapsed[collapsed.length - 1].trim() === '') collapsed.pop();

  return collapsed.join('\n');
}

// ── HTMLコンテンツからYouTube Video IDを抽出 ───
function extractYoutubeId(html) {
  if (!html) return null;
  const match = html.match(/youtube(?:-nocookie)?\.com\/embed\/([^"&?/\s]+)/);
  return match ? match[1] : null;
}

// ── カード一覧サムネイル: YouTube + 画像を最大2件 DOM順に抽出 ───
function extractThumbnails(html) {
  if (!html) return [];
  const thumbs = [];
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const walk = node => {
    if (thumbs.length >= 2 || node.nodeType !== Node.ELEMENT_NODE) return;
    // YouTube（TipTap形式 / カスタムコンテナ両対応）
    if (node.hasAttribute('data-youtube-video') || node.classList.contains('youtube-container')) {
      const iframe = node.querySelector('iframe');
      const src = iframe ? (iframe.getAttribute('src') || '') : '';
      const m = src.match(/embed\/([^"&?/\s]+)/);
      if (m) thumbs.push(`https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`);
      return;
    }
    // 挿入画像
    if (node.tagName === 'IMG' && node.classList.contains('inserted-img')) {
      const src = node.getAttribute('src');
      if (src) thumbs.push(src);
      return;
    }
    for (const child of node.children) walk(child);
  };

  for (const child of tmp.children) walk(child);
  return thumbs;
}

// ── Markdown 記号を除去 ────────────────────────
function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')           // # 見出し
    .replace(/\*\*(.*?)\*\*/g, '$1')        // **太字**
    .replace(/__(.*?)__/g, '$1')            // __太字__
    .replace(/\*(.*?)\*/g, '$1')            // *斜体*
    .replace(/_(.*?)_/g, '$1')              // _斜体_
    .replace(/~~(.*?)~~/g, '$1')            // ~~取り消し線~~
    .replace(/`{3}[\s\S]*?`{3}/g, '')       // ```コードブロック```
    .replace(/`([^`]+)`/g, '$1')            // `インライン`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [リンク](url)→テキスト
    .replace(/^>\s+/gm, '')                 // > 引用
    .replace(/^[-*+]\s+/gm, '')             // - 箇条書き
    .replace(/^\d+\.\s+/gm, '')             // 1. 番号リスト
    .replace(/^[-*]{3,}\s*$/gm, '')         // --- 水平線
    .trim();
}

// ── DOMのテキストノードからMarkdownを除去（画像などは保持） ─────
function stripMarkdownFromDOM(el) {
  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = stripMarkdown(node.textContent);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'IMG') {
      stripMarkdownFromDOM(node);
    }
  });
}

// ============================================
//  SCREEN A: ホーム（カテゴリグリッド）
// ============================================
function renderHome(container) {
  const _homeUser = firebase.auth().currentUser;
  const _isDev = _homeUser?.email === 'kimijimasan@gmail.com';

  container.innerHTML = `
    <div class="screen-home">
      <header class="app-header">
        <button class="btn-icon btn-pc-only" id="btnShowQR" title="スマホ連動用QRコードを表示" style="margin-right: 0.25rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="3" height="3" rx="0.5"/>
            <rect x="18" y="18" width="3" height="3" rx="0.5"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
            <line x1="17" y1="7" x2="17.01" y2="7"/>
            <line x1="7" y1="17" x2="7.01" y2="17"/>
            <line x1="14" y1="18" x2="14.01" y2="18"/>
            <line x1="18" y1="14" x2="18.01" y2="14"/>
          </svg>
        </button>
        <h1 class="app-title">📋 PCスマホ連動メモ</h1>
        <button class="btn-icon" id="btnTheme" title="テーマ変更">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a10 10 0 0 1 0 20"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </button>
        <button class="btn-icon accent" id="btnAddCat" title="カテゴリを追加">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        ${_isDev ? `<button class="btn-icon" id="btnUpdateTemplate" title="テンプレートを更新" style="opacity:0.55;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>
          </svg>
        </button>` : ''}
        ${_homeUser?.isAnonymous ? `<button class="btn-icon" id="btnGuestUpgradeHint" title="Googleアカウントでログイン" style="color:#f97316;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>` : ''}
        <button class="btn-icon danger btn-signout" id="btnSignOut" title="サインアウト">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </header>
      
      <div class="category-grid" id="catGrid">
        <div class="loading-spinner">読み込み中…</div>
      </div>
      <button class="search-fab" id="btnSearchFab" title="全文検索">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
    </div>`;

  document.getElementById('btnAddCat').onclick = () => showCategoryModal();
  document.getElementById('btnTheme').onclick = () => showThemePicker();
  document.getElementById('btnSearchFab').onclick = () => showSearchModal();
  const showQrBtn = document.getElementById('btnShowQR');
  if (showQrBtn) showQrBtn.onclick = () => showQRCodeModal();

  if (_isDev) {
    document.getElementById('btnUpdateTemplate').onclick = () => saveCurrentDataAsTemplate();
  }

  const guestUpgradeBtn = document.getElementById('btnGuestUpgradeHint');
  if (guestUpgradeBtn) {
    guestUpgradeBtn.onclick = () => showLimitModal('Googleアカウントでログインすると\nパネル・メモが無制限に使えます。\nゲストのデータはそのまま引き継がれます。');
  }

  const signoutBtn = document.getElementById('btnSignOut');
  if (signoutBtn) {
    const currentUser = firebase.auth().currentUser;
    const isGuest = currentUser && currentUser.isAnonymous;

    signoutBtn.onclick = async () => {
      if (isGuest) {
        showGuestSignoutModal();
      } else {
        if (confirm('サインアウトしますか？')) {
          await firebase.auth().signOut().catch(err => console.error('SignOut error:', err));
        }
      }
    };
  }

  const ref = db.ref(`users/${state.uid}/categories`);
  const handler = ref.on('value', snap => {
    const grid = document.getElementById('catGrid');
    if (!grid) return;

    const data = snap.val();
    if (!data) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">📁</div>
          <p>カテゴリがまだありません</p>
          <button class="btn-primary" id="btnFirstCat">最初のカテゴリを作成</button>
        </div>`;
      document.getElementById('btnFirstCat').onclick = () => showCategoryModal();
      return;
    }

    const cats = Object.entries(data)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    grid.innerHTML = '';
    cats.forEach(cat => {
      const grad = cat.color || DEFAULT_GRAD;
      const card = document.createElement('div');
      card.className = 'category-card';
      card.dataset.id = cat.id;
      card.style.background = grad;
      card.innerHTML = `
        <button class="cat-edit-btn" title="編集">✏️</button>
        <span class="cat-name">${esc(cat.name)}</span>
        <span class="cat-card-count">…</span>`;

      // もし直前に訪れていたカテゴリIDであれば、戻りフラッシュ効果クラスを付与
      if (cat.id === window.justVisitedCategoryId) {
        const targetId = cat.id;
        setTimeout(() => {
          const targetCard = grid.querySelector(`[data-id="${targetId}"]`);
          if (targetCard) {
            // 1. まず画面をスムーズにスクロールさせてパネルを表示させる
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // 2. スクロールが到着するタイミング（400ms遅延）でピカピカッと白く光らせる！
            setTimeout(() => {
              targetCard.classList.add('just-visited-flash');
              setTimeout(() => {
                targetCard.classList.remove('just-visited-flash');
              }, 1000);
            }, 400);
          }
        }, 350); // 画面フェードイン（180ms遅延+200msトランジション）の完了に合わせて発火
        window.justVisitedCategoryId = null; // 即座にクリアして多重発火防止
      }

      // 全角・半角の文字数をスマートに換算し、CSS変数としてセット（CSS側でレスポンシブ自動調整）
      const vLen = getVirtualLength(cat.name);
      card.style.setProperty('--char-len', vLen);

      card.querySelector('.cat-edit-btn').onclick = e => {
        e.stopPropagation();
        showCategoryModal(cat.id, cat.name, cat.color || DEFAULT_GRAD);
      };
      card.onclick = () => goTo('category', cat.id);
      grid.appendChild(card);
    });

    // カテゴリごとのカード数を非同期取得してバッジ更新（"…" → 実数値）
    db.ref(`users/${state.uid}/articles`).once('value').then(artSnap => {
      const allArts = artSnap.val() || {};
      grid.querySelectorAll('.category-card[data-id]').forEach(cardEl => {
        const arts = allArts[cardEl.dataset.id];
        const count = arts ? Object.keys(arts).length : 0;
        const badge = cardEl.querySelector('.cat-card-count');
        if (badge) badge.textContent = count;
      });
    }).catch(() => {});

    // ドラッグ並び替え初期化
    if (window.Sortable) {
      if (catSortable) catSortable.destroy();
      catSortable = Sortable.create(grid, {
        animation: 150,
        delay: 300,
        delayOnTouchOnly: true,
        forceFallback: true,            // タッチ操作の並び替え安定化
        fallbackOnBody: false,          // bodyに移設せず位置ズレを完全防止
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        fallbackClass: 'sortable-fallback-simple', // 拡大・ズレのない極めてシンプルな指追従スタイル
        scroll: true,          // ドラッグ中のオートスクロール有効
        scrollEl: grid,        // スクロール対象を grid に明示（overflow-y:auto を維持したまま追従）
        scrollSensitivity: 60,
        scrollSpeed: 12,
        onStart: (evt) => {
          // overflow を変えずにスクロール位置を保持したまま drag を開始する
          // （'visible' にするとスクロール量がリセットされてパネルがトップに飛ぶため）
          if (evt.item) {
            evt.item.classList.add('category-drag-start-flash');
          }
        },
        onEnd: async evt => {
          if (evt.item) {
            evt.item.classList.remove('category-drag-start-flash');
            evt.item.classList.add('category-drag-end-flash');
            setTimeout(() => {
              evt.item.classList.remove('category-drag-end-flash');
            }, 600);
          }
          const cards = grid.querySelectorAll('.category-card');
          const updates = {};
          cards.forEach((c, i) => { updates[`users/${state.uid}/categories/${c.dataset.id}/order`] = i; });
          await db.ref().update(updates);
        }
      });
    }
  });
  listeners.push(() => {
    ref.off('value', handler);
    if (catSortable) { catSortable.destroy(); catSortable = null; }
  });
}

// ── 全文検索 ──────────────────────────────────────────
function showSearchModal() {
  if (document.getElementById('searchModal')) return;

  const overlay = document.createElement('div');
  overlay.className = 'search-modal-overlay';
  overlay.id = 'searchModal';
  overlay.innerHTML = `
    <div class="search-modal-box">
      <div class="search-modal-header">
        <span class="search-modal-title">全カテゴリ内の文字検索</span>
        <button class="search-modal-close" id="btnSearchClose">✕</button>
      </div>
      <div class="search-modal-form">
        <input class="search-modal-input" id="searchInput" type="search" placeholder="キーワードを入力…" autocomplete="off" />
        <button class="search-modal-run" id="btnSearchRun">検索</button>
      </div>
      <div class="search-results-area" id="searchResultsArea">
        <div class="search-empty">キーワードを入力してください</div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('btnSearchClose').onclick = close;

  const input = document.getElementById('searchInput');
  const runBtn = document.getElementById('btnSearchRun');
  const resultsArea = document.getElementById('searchResultsArea');

  const doSearch = async () => {
    const kw = input.value.trim();
    if (!kw) return;
    resultsArea.innerHTML = '<div class="search-empty">検索中…</div>';
    try {
      const results = await performFullSearch(kw);
      if (results.length === 0) {
        resultsArea.innerHTML = '<div class="search-empty">一致するメモが見つかりませんでした</div>';
        return;
      }
      resultsArea.innerHTML = '';
      const countEl = document.createElement('div');
      countEl.className = 'search-count';
      countEl.textContent = `${results.length} 件見つかりました`;
      resultsArea.appendChild(countEl);
      results.forEach(r => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
          <div class="search-result-meta">
            <span class="search-result-cat">${esc(r.catName)}</span>
            <span class="search-result-sep">›</span>
            <span class="search-result-card">${esc(r.cardName)}</span>
            <span class="search-result-para">${r.paragraph}段落目</span>
          </div>
          <div class="search-result-excerpt">${buildHighlightedExcerpt(r.excerpt, kw)}</div>`;
        item.onclick = () => {
          state.pendingScrollToParagraph = r.paragraphIndex;
          state.pendingSearchKeyword = kw;
          close();
          goTo('editor', r.catId, r.artId);
        };
        resultsArea.appendChild(item);
      });
    } catch (_) {
      resultsArea.innerHTML = '<div class="search-empty">エラーが発生しました</div>';
    }
  };

  runBtn.onclick = doSearch;
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  setTimeout(() => input.focus(), 100);
}

async function performFullSearch(keyword) {
  const kw = keyword.toLowerCase();
  const [artSnap, catSnap] = await Promise.all([
    db.ref(`users/${state.uid}/articles`).once('value'),
    db.ref(`users/${state.uid}/categories`).once('value'),
  ]);
  const categories = catSnap.val() || {};
  const allArticles = artSnap.val() || {};
  const results = [];
  for (const [catId, articles] of Object.entries(allArticles)) {
    if (!articles || typeof articles !== 'object') continue;
    const catName = categories[catId]?.name || '不明なカテゴリ';
    for (const [artId, article] of Object.entries(articles)) {
      if (!article || typeof article !== 'object') continue;
      const lines = htmlToLines(article.content || '');
      const cardName = lines[0] || '（タイトルなし）';
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(kw)) {
          results.push({ catId, artId, catName, cardName, paragraph: idx + 1, paragraphIndex: idx, excerpt: line });
        }
      });
    }
  }
  return results;
}

function buildHighlightedExcerpt(text, keyword) {
  const escaped = esc(text);
  const kwEsc = esc(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(kwEsc, 'gi'), m => `<mark class="search-highlight">${m}</mark>`);
}

// エディタ内のキーワードをスパンでラップして点滅 → durationMs 後にアンラップ
function blinkSearchKeyword(container, keyword, durationMs) {
  if (!container || !keyword) return;
  const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const spans = [];

  // テキストノードを収集（DOM変更前に全取得）
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    if (!regex.test(text)) { regex.lastIndex = 0; return; }
    regex.lastIndex = 0;
    const parent = textNode.parentNode;
    if (!parent) return;

    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
      const span = document.createElement('span');
      span.className = 'search-blink';
      span.textContent = m[0];
      frag.appendChild(span);
      spans.push(span);
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    parent.replaceChild(frag, textNode);
  });

  // 3秒後にスパンをアンラップして元のテキストノードに戻す
  setTimeout(() => {
    spans.forEach(span => {
      if (!span.parentNode) return;
      span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
    });
    container.normalize();
  }, durationMs);
}

// ── カテゴリ追加/編集モーダル（色選択統合版） ────────────
function showCategoryModal(catId = null, currentName = '', currentColor = null) {
  let selectedGrad = currentColor || COLORS[0].grad;

  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay" id="modal">
      <div class="modal-box">
        <h3>${catId ? 'カテゴリを編集' : '新しいカテゴリ'}</h3>
        <input id="catInput" class="modal-input" type="text"
               placeholder="カテゴリ名（例: 料理、IT）"
               value="${esc(currentName)}" />
        <div class="color-grid" id="colorGrid"></div>
        <div class="modal-actions">
          ${catId ? `<button class="btn-danger" id="mDel">削除</button>` : ''}
          <button class="btn-secondary" id="mCancel">キャンセル</button>
          <button class="btn-primary"   id="mSave">${catId ? '保存' : '追加'}</button>
        </div>
      </div>
    </div>`;

  const input = document.getElementById('catInput');
  const grid  = document.getElementById('colorGrid');
  const close = () => { document.getElementById('modal-root').innerHTML = ''; };
  input.focus(); input.select();

  // 色スウォッチをグリッドに追加
  COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (c.grad === selectedGrad ? ' selected' : '');
    sw.style.background = c.grad;
    sw.title = c.label;
    sw.onclick = () => {
      grid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      selectedGrad = c.grad;
    };
    grid.appendChild(sw);
  });

  document.getElementById('mCancel').onclick = close;
  document.getElementById('modal').onclick = e => { if (e.target.id === 'modal') close(); };

  document.getElementById('mSave').onclick = async () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    if (catId) {
      await db.ref(`users/${state.uid}/categories/${catId}`).update({ name, color: selectedGrad });
    } else {
      // ゲストのパネル上限チェック（3個まで）
      if (!catId && state.isAnonymous) {
        const snapshot = await db.ref(`users/${state.uid}/categories`).once('value');
        const currentCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        if (currentCount >= 3) {
          close();
          showLimitModal('ゲストはパネル3つまでです。\nGoogleアカウントでログインすると無制限になります。');
          return;
        }
      }
      const newCatRef = db.ref(`users/${state.uid}/categories`).push();
      const newCatId = newCatRef.key;
      // 1. カテゴリ自体を作成
      await newCatRef.set({
        name, color: selectedGrad, order: Date.now(), createdAt: Date.now()
      });
      // 2. 作成されたカテゴリの中に最初から「タイトルのない新規文書」を1枚同時に作成する
      const newArtRef = db.ref(`users/${state.uid}/articles/${newCatId}`).push();
      await newArtRef.set({
        content: '<p><br></p>', // 空の段落
        createdAt: Date.now(),
        updatedAt: Date.now(),
        order: Date.now()
      });
    }
    close();
  };

  if (catId) {
    document.getElementById('mDel').onclick = async () => {
      if (!confirm(`「${currentName}」を削除します。\n中のメモもすべて消えます。よろしいですか？`)) return;
      await db.ref(`users/${state.uid}/categories/${catId}`).remove();
      await db.ref(`users/${state.uid}/articles/${catId}`).remove();
      close();
    };
  }

  input.onkeydown = e => {
    if (e.key === 'Enter') document.getElementById('mSave').click();
    if (e.key === 'Escape') close();
  };
}

// ============================================
//  SCREEN B: カテゴリ内記事一覧
// ============================================
function renderCategory(container) {
  let isAutoCreating = false;
  container.innerHTML = `
    <div class="screen-category">
      <header class="app-header">
        <button class="btn-icon" id="btnHome" title="ホームへ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
          </svg>
        </button>
        <h2 class="screen-title" id="catTitle">…</h2>
        <button class="btn-icon" id="btnExportAll" title="このカテゴリの全メモを一括エクスポート">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </header>
      <div class="sort-bar" id="sortBar">
        <button class="sort-btn" id="btnSortName">名前 <span class="sort-arrow"></span></button>
        <button class="sort-btn" id="btnSortDate">期日 <span class="sort-arrow"></span></button>
      </div>
      <ul class="article-list" id="artList">
        <div class="loading-spinner">読み込み中…</div>
      </ul>
      <button class="fab-add-article" id="btnAddArticle" title="新しいカードを作成">＋</button>
    </div>`;

  document.getElementById('btnHome').onclick   = () => goTo('home');
  document.getElementById('btnExportAll').onclick = () => showExportAllModal(state.categoryId);

  // ─── ソート状態 ───
  let sortField = 'name'; // 'name' | 'date' | null（デフォルト: 名前昇順）
  let sortDir   = 'asc';
  let lastArtsData = null;
  let rerenderArts = null;

  function updateSortUI() {
    [['btnSortName', 'name'], ['btnSortDate', 'date']].forEach(([id, f]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const active = sortField === f;
      btn.classList.toggle('active', active);
      btn.querySelector('.sort-arrow').textContent = active ? (sortDir === 'asc' ? '↑' : '↓') : '';
    });
  }

  addSwipeBack(container, () => goBack());
  addPullToCreate(document.getElementById('artList'));

  // カード一覧→ホームのスワイプバック（エディターと同じ閾値・判定を直接artListにバインド）
  // SortableJS が touchend のバブルを止める場合に備えて container への登録とは別に追加
  {
    const _al = document.getElementById('artList');
    let _alSx = 0, _alSy = 0;
    const _alTouchStart = e => { _alSx = e.touches[0].clientX; _alSy = e.touches[0].clientY; };
    const _alTouchEnd = e => {
      if (isDragging) return;
      if (document.querySelector('.article-item.swiped')) return;
      const dx    = e.changedTouches[0].clientX - _alSx;
      const rawDy = e.changedTouches[0].clientY - _alSy;
      const dy    = Math.abs(rawDy);
      const isStraightDown = dy >= 80 && dx < dy * 0.2;
      const isStronglyUp   = rawDy < 0 && dy > dx * 0.5;
      if (dx > 30 && !isStraightDown && !isStronglyUp) goBack();
    };
    _al.addEventListener('touchstart', _alTouchStart, { passive: true });
    _al.addEventListener('touchend',   _alTouchEnd,   { passive: true });
    listeners.push(() => {
      _al.removeEventListener('touchstart', _alTouchStart);
      _al.removeEventListener('touchend',   _alTouchEnd);
    });
  }

  // カテゴリ名・色
  let catColor = DEFAULT_GRAD;
  const cRef = db.ref(`users/${state.uid}/categories/${state.categoryId}`);
  const cHandler = cRef.on('value', snap => {
    const val = snap.val();
    if (!val) return;
    const titleEl = document.getElementById('catTitle');
    if (titleEl) titleEl.textContent = val.name;
    catColor = val.color || DEFAULT_GRAD;
    // article-listにCSS変数としてセット → CSSで自動継承
    const artList = document.getElementById('artList');
    if (artList) artList.style.setProperty('--cat-color', catColor);
  });
  listeners.push(() => cRef.off('value', cHandler));

  // 記事一覧
  const aRef = db.ref(`users/${state.uid}/articles/${state.categoryId}`);
  
  // 1. カテゴリに入った瞬間に1回だけ件数をチェックして0件なら補充（無限非同期ループ防止）
  aRef.once('value').then(async snap => {
    const data = snap.val();
    if (!data || Object.keys(data).length === 0) {
      const newRef = aRef.push();
      try {
        await newRef.set({
          content: '<p><br></p>', // 空の段落を初期設定
          createdAt: Date.now(),
          updatedAt: Date.now(),
          order: Date.now()
        });
      } catch (err) {
        console.error("初期メモの補充に失敗しました:", err);
      }
    }
    
    // 2. 補充完了後（または既存データがある場合）にのみ、通常の監視リスナーを有効化
    bindArticlesListener();
  }).catch(err => {
    console.error("初期チェック失敗:", err);
    bindArticlesListener();
  });

  function bindArticlesListener() {
    function doRender(data) {
      lastArtsData = data;
      const list = document.getElementById('artList');
      if (!list) return;

      // リスナー内での自動補充（set）は絶対に排除する（ループ・フリーズ防止）
      if (!data || Object.keys(data).length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <p>メモがありません</p>
          </div>`;
        return;
      }

      const all = Object.entries(data).map(([id, v]) => ({ id, ...v }));

      // ピン留めを先頭に固定、それ以外はソート対象
      const pinned   = all.filter(a =>  a.pinned).sort((a, b) => (b.order || 0) - (a.order || 0));
      let   unpinned = all.filter(a => !a.pinned);

      if (sortField === 'name') {
        unpinned.sort((a, b) => {
          const ta = (htmlToLines(a.content)[0] || '').toLowerCase();
          const tb = (htmlToLines(b.content)[0] || '').toLowerCase();
          return sortDir === 'asc' ? ta.localeCompare(tb, 'ja') : tb.localeCompare(ta, 'ja');
        });
      } else if (sortField === 'date') {
        unpinned.sort((a, b) => sortDir === 'asc'
          ? (a.updatedAt || 0) - (b.updatedAt || 0)
          : (b.updatedAt || 0) - (a.updatedAt || 0));
      } else {
        unpinned.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) return b.order - a.order;
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
      }

      const arts = [...pinned, ...unpinned];

      list.innerHTML = '';
      arts.forEach((art, i) => {
        // HTML → 行分割（<p>や<br>を改行として扱う）
        const textLines = htmlToLines(art.content);
        const title   = textLines[0] || '（タイトルなし）';
        const preview = textLines.slice(1).join(' ').slice(0, 60) || '内容がありません';
        const thumbs  = extractThumbnails(art.content);

        const li = document.createElement('li');
        li.className = 'article-item';
        li.dataset.id = art.id;
        li.style.animationDelay = `${i * 40}ms`;

        // 直前編集カードのフラッシュ効果（2秒間）
        if (art.id === justEditedArticleId) {
          li.classList.add('just-edited');
          setTimeout(() => {
            li.classList.remove('just-edited');
            justEditedArticleId = null; // アニメーション終了後にクリア
          }, 2000);
        }
        li.innerHTML = `
          ${art.pinned ? '<span class="pin-indicator">📌</span>' : ''}
          <div class="article-inner">
            <div class="article-text">
              <div class="article-title">${esc(title)}</div>
              <div class="article-preview">${esc(preview)}</div>
            </div>
            ${thumbs.length > 0 ? `<div class="article-thumbs">${thumbs.map(src => `<img class="article-thumb" src="${esc(src)}" alt="" loading="lazy">`).join('')}</div>` : ''}
          </div>
          <div class="swipe-actions">
            <button class="swipe-action-btn swipe-action-pin${art.pinned ? ' is-pinned' : ''}">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
              </svg>
              ${art.pinned ? '解除' : '留め'}
            </button>
            <button class="swipe-action-btn swipe-action-duplicate">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              複写
            </button>
            <button class="swipe-action-btn swipe-action-move">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              移動
            </button>
            <button class="swipe-action-btn swipe-action-delete">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              削除
            </button>
            <button class="swipe-action-btn swipe-action-cancel" style="background: #4b5563;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              戻る
            </button>
          </div>`;

        // カード本体タップ→エディター
        li.querySelector('.article-inner').onclick = () => {
          goTo('editor', state.categoryId, art.id);
        };

        // ピン留めボタン
        li.querySelector('.swipe-action-pin').onclick = e => {
          e.stopPropagation();
          li.classList.remove('swiped');
          db.ref(`users/${state.uid}/articles/${state.categoryId}/${art.id}`)
            .update({ pinned: !art.pinned });
        };

        // 複写ボタン
        li.querySelector('.swipe-action-duplicate').onclick = async e => {
          e.stopPropagation();
          li.classList.remove('swiped');
          await duplicateArticle(art.id, state.categoryId);
        };

        // 移動ボタン
        li.querySelector('.swipe-action-move').onclick = e => {
          e.stopPropagation();
          li.classList.remove('swiped');
          showMoveModal(art.id, state.categoryId);
        };

        // 削除ボタン
        li.querySelector('.swipe-action-delete').onclick = e => {
          e.stopPropagation();
          li.classList.remove('swiped');
          deleteArticleById(art.id, state.categoryId);
        };

        // キャンセル（戻る）ボタン
        li.querySelector('.swipe-action-cancel').onclick = e => {
          e.stopPropagation();
          li.classList.remove('swiped');
        };

        // 左スワイプ検出
        let txStart = 0, tyStart = 0;
        li.addEventListener('touchstart', e => {
          txStart = e.touches[0].clientX;
          tyStart = e.touches[0].clientY;
        }, { passive: true });
        li.addEventListener('touchend', e => {
          const dx = e.changedTouches[0].clientX - txStart;
          const dy = Math.abs(e.changedTouches[0].clientY - tyStart);
          if (Math.abs(dx) > 40 && dy < Math.abs(dx) * 0.8) {
            if (dx < 0) {
              document.querySelectorAll('.article-item.swiped').forEach(el => {
                if (el !== li) el.classList.remove('swiped');
              });
              li.classList.add('swiped');
            } else {
              li.classList.remove('swiped');
            }
          }
        }, { passive: true });

        list.appendChild(li);
      });

      // 直前に編集したカードがあれば、見えている範囲に自動スクロールして連れていく
      const justEditedEl = list.querySelector('.just-edited');
      if (justEditedEl) {
        setTimeout(() => {
          justEditedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
      }

      // ドラッグ並び替え初期化
      if (window.Sortable) {
        if (artSortable) artSortable.destroy();
        artSortable = Sortable.create(list, {
          animation: 150,
          delay: 300,
          delayOnTouchOnly: true,
          forceFallback: true,
          fallbackOnBody: false,
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          fallbackClass: 'sortable-fallback-simple',
          onStart: () => {
            isDragging = true;
            list.style.overflow = 'visible';
          },
          onEnd: async evt => {
            isDragging = false;
            list.style.overflow = '';
            const items = list.querySelectorAll('.article-item');
            const updates = {};
            const total = items.length;
            items.forEach((item, i) => {
              updates[`users/${state.uid}/articles/${state.categoryId}/${item.dataset.id}/order`] = total - i;
            });
            await db.ref().update(updates);
          }
        });
      }
    } // end doRender

    rerenderArts = () => { if (lastArtsData) doRender(lastArtsData); };
    const aHandler = aRef.on('value', snap => doRender(snap.val()));
    listeners.push(() => {
      aRef.off('value', aHandler);
      rerenderArts = null;
      if (artSortable) { artSortable.destroy(); artSortable = null; }
    });
  }

  // ─── PC用「+」ボタン（pointer: fine = マウス環境のみ表示）───
  const fabBtn = document.getElementById('btnAddArticle');
  if (fabBtn) {
    const isMouseDevice = window.matchMedia('(pointer: fine)').matches;
    if (isMouseDevice) {
      fabBtn.style.display = 'flex';
      fabBtn.onclick = () => createArticle(true);
    }
  }

  // ─── ソートボタン ───
  [['btnSortName', 'name'], ['btnSortDate', 'date']].forEach(([id, field]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.onclick = () => {
      if (sortField === field) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortDir = 'asc';
      }
      updateSortUI();
      if (rerenderArts) rerenderArts();
    };
  });
  updateSortUI(); // デフォルトソート状態をUIに反映
}

// カードを別カテゴリへ移動するモーダル
async function showMoveModal(artId, currentCatId) {
  const snap = await db.ref(`users/${state.uid}/categories`).once('value');
  const cats = snap.val();
  if (!cats) return;
  const others = Object.entries(cats)
    .filter(([id]) => id !== currentCatId)
    .map(([id, v]) => ({ id, name: v.name, color: v.color, order: v.order || 0 }))
    .sort((a, b) => a.order - b.order); // ホーム画面と同じ並び順（order昇順）にする
  if (others.length === 0) { alert('移動先のカテゴリがありません'); return; }

  const overlay = document.createElement('div');
  overlay.className = 'move-modal-overlay';
  overlay.innerHTML = `
    <div class="move-modal">
      <div class="move-modal-header move-modal-header-styled">
        <span class="move-modal-title">📁 移動先を選択</span>
        <button class="move-modal-close" id="moveCancelBtn">キャンセル</button>
      </div>
      <div class="move-cat-wrap">
        <ul class="move-cat-list">
          ${others.map(c => `
            <li class="move-cat-item" data-cat-id="${c.id}"
              style="border-left:4px solid ${c.color || '#6366f1'}">
              ${esc(c.name || '（名前なし）')}
            </li>`).join('')}
        </ul>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#moveCancelBtn').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('.move-cat-item').forEach(item => {
    item.onclick = async () => {
      const destCatId = item.dataset.catId;
      const artSnap = await db.ref(`users/${state.uid}/articles/${currentCatId}/${artId}`).once('value');
      const artData = artSnap.val();
      if (!artData) { overlay.remove(); return; }

      // 移動元の記事が最後の1件かどうかチェック（1件以下の場合は自動補充フラグを立てる）
      const srcArticlesSnap = await db.ref(`users/${state.uid}/articles/${currentCatId}`).once('value');
      const srcArticles = srcArticlesSnap.val();
      const isLastOne = srcArticles && Object.keys(srcArticles).length <= 1;

      await db.ref(`users/${state.uid}/articles/${destCatId}/${artId}`).set(artData);
      await db.ref(`users/${state.uid}/articles/${currentCatId}/${artId}`).remove();

      // 最後の1件だった場合は、確実に新しいメモ（空文書）を補充する
      if (isLastOne) {
        const newRef = db.ref(`users/${state.uid}/articles/${currentCatId}`).push();
        await newRef.set({
          content: '<p><br></p>',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          order: Date.now()
        });
      }

      overlay.remove();
    };
  });
}

// カードを削除
async function deleteArticleById(artId, catId) {
  // 削除前の記事が最後の1件かどうかチェック
  const srcArticlesSnap = await db.ref(`users/${state.uid}/articles/${catId}`).once('value');
  const srcArticles = srcArticlesSnap.val();
  const isLastOne = srcArticles && Object.keys(srcArticles).length <= 1;

  await db.ref(`users/${state.uid}/articles/${catId}/${artId}`).remove();

  // 最後の1件だった場合は、確実に新しいメモ（空文書）を補充する
  if (isLastOne) {
    const newRef = db.ref(`users/${state.uid}/articles/${catId}`).push();
    await newRef.set({
      content: '<p><br></p>',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      order: Date.now()
    });
  }
}

// ── 一括エクスポートのモーダルを表示 ──────────────────
async function showExportAllModal(catId) {
  // 記事データを取得
  const snap = await db.ref(`users/${state.uid}/articles/${catId}`).once('value');
  const data = snap.val();
  if (!data) { alert('エクスポートするメモがありません'); return; }

  const articles = Object.values(data)
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return b.order - a.order;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const overlay = document.createElement('div');
  overlay.className = 'move-modal-overlay';
  overlay.innerHTML = `
    <div class="move-modal">
      <div class="move-modal-header export-modal-header">
        <span class="export-modal-title">📦 一括エクスポート<em>${articles.length}件</em></span>
        <button class="move-modal-close" id="exportCancelBtn">キャンセル</button>
      </div>
      <div class="export-choices-wrap">
        <ul class="move-cat-list">
          <li class="move-cat-item" data-type="copy" style="border-left:4px solid #6366f1">📋 クリップボードにコピー</li>
          <li class="move-cat-item" data-type="text" style="border-left:4px solid #22c55e">📄 テキストファイル (.txt)</li>
          <li class="move-cat-item" data-type="md" style="border-left:4px solid #f59e0b">📝 Markdownファイル (.md)</li>
          <li class="move-cat-item" data-type="html" style="border-left:4px solid #f97316">🌐 HTMLファイル (.html)</li>
          <li class="move-cat-item" data-type="pdf" style="border-left:4px solid #ef4444">📕 PDF</li>
        </ul>
      </div>
      <div class="export-dl-footer">
        <button class="export-dl-btn" id="exportOpenDlBtn">📂 ダウンロード先を開く</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#exportCancelBtn').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#exportOpenDlBtn').onclick = () => {
    if (isIOS) {
      window.location.href = 'shareddocuments://';
    } else if (isAndroid) {
      alert('ダウンロードフォルダをご確認ください。\nブラウザの「ダウンロード」メニューからもアクセスできます。');
    } else {
      alert('ブラウザのダウンロード一覧（Ctrl+J / ⌘+Shift+J）でファイルを確認できます。');
    }
  };

  overlay.querySelectorAll('.move-cat-item').forEach(item => {
    item.onclick = () => {
      overlay.remove();
      handleExportAllAction(item.dataset.type, articles);
    };
  });
}

// ── 実際の一括エクスポート処理の実行 ──────────────────
function handleExportAllAction(type, articles) {
  const catTitleEl = document.getElementById('catTitle');
  const catName = catTitleEl ? catTitleEl.textContent : 'カテゴリ';

  if (type === 'copy') {
    let textData = `【${catName}】\n【1ページ目】\n\n`;
    textData += articles.map((art, idx) => {
      const lines = htmlToLines(art.content);
      const title = lines[0] || '（タイトルなし）';
      const body = lines.slice(1).join('\n');
      const articleText = `■ ${title}\n${body}`;
      if (idx === 0) {
        return articleText;
      } else {
        const pageNum = idx + 1;
        return `\n\n---- 【ここから${pageNum}ページ目】 ----\n\n${articleText}`;
      }
    }).join('');

    // Clipboard API (HTTPS必須) → fallback: execCommand
    const doCopy = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(textData);
      }
      // HTTP環境・旧ブラウザ向けフォールバック
      const ta = document.createElement('textarea');
      ta.value = textData;
      ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(ta);
        return Promise.resolve();
      } catch (e) {
        document.body.removeChild(ta);
        return Promise.reject(e);
      }
    };

    doCopy()
      .then(() => alert('全メモをクリップボードに一括コピーしました！'))
      .catch(() => alert('コピーに失敗しました。\nHTTPS環境でお試しください。'));
  }
  else if (type === 'text') {
    let textData = `【${catName}】\n【1ページ目】\n\n`;
    textData += articles.map((art, idx) => {
      const lines = htmlToLines(art.content);
      const title = lines[0] || '（タイトルなし）';
      const body = lines.slice(1).join('\n');
      const articleText = `■ ${title}\n${body}`;
      if (idx === 0) {
        return articleText;
      } else {
        const pageNum = idx + 1;
        return `\n\n---- 【ここから${pageNum}ページ目】 ----\n\n${articleText}`;
      }
    }).join('');

    const blob = new Blob([textData], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${catName}_一括エクスポート.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  else if (type === 'md') {
    let mdData = `# 【${catName}】\n\n`;
    mdData += articles.map((art, idx) => {
      const lines = htmlToLines(art.content);
      const title = lines[0] || 'タイトルなし';
      const body = lines.slice(1).join('\n\n');
      const articleText = `## ${title}\n\n${body}`;
      if (idx === 0) {
        return articleText;
      } else {
        const pageNum = idx + 1;
        return `\n\n### 【ここから${pageNum}ページ目】\n\n${articleText}`;
      }
    }).join('');

    const blob = new Blob([mdData], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${catName}_一括エクスポート.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  else if (type === 'html' || type === 'pdf') {
    const buildArticlesHTML = (dark) => articles.map((art, idx) => {
      const lines = htmlToLines(art.content);
      const title = lines[0] || 'タイトルなし';
      const bodyHTML = lines.slice(1).map(line => `<p>${esc(line)}</p>`).join('');
      const sep = idx > 0
        ? `<div class="page-separator">---- ${idx + 1}ページ目 ----</div>`
        : '';
      return `${sep}<div class="article-section"><h2 class="article-title">${esc(title)}</h2><div class="article-body">${bodyHTML}</div></div>`;
    }).join('');

    // HTML出力用（ダーク）
    const buildFullHTML = (dark) => {
      const bg      = dark ? '#0b0f19' : '#ffffff';
      const text    = dark ? '#f3f4f6' : '#111827';
      const cardBg  = dark ? '#111827' : '#f9fafb';
      const cardBdr = dark ? '#1f2937' : '#e5e7eb';
      const titleC  = dark ? '#ffffff' : '#111827';
      const bodyC   = dark ? '#d1d5db' : '#374151';
      const sepC    = dark ? '#6b7280' : '#9ca3af';
      const headC   = dark ? '#818cf8' : '#4f46e5';
      return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(catName)} - 一括エクスポート</title>
<style>
body{background:${bg};color:${text};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans JP",sans-serif;line-height:1.7;padding:2rem 1rem;max-width:800px;margin:0 auto}
.category-title{font-size:1.5rem;font-weight:800;color:${headC};border-bottom:2px solid ${cardBdr};padding-bottom:.5rem;margin-bottom:2rem;text-align:center}
.article-section{background:${cardBg};border:1px solid ${cardBdr};border-radius:12px;padding:1.5rem;margin-bottom:2rem}
.article-title{font-size:1.25rem;font-weight:700;color:${titleC};margin:0 0 1rem;border-bottom:1px solid ${cardBdr};padding-bottom:.5rem}
.article-body{color:${bodyC}}.article-body p{margin:.4rem 0;min-height:1em}
.article-body img{max-width:100%;height:auto;border-radius:8px;margin:.75rem 0}
.page-separator{text-align:center;margin:2rem 0;color:${sepC};font-size:.9rem;font-weight:600}
</style></head>
<body><div class="category-title">【${esc(catName)}】</div>${buildArticlesHTML()}</body></html>`;
    };

    if (type === 'html') {
      const blob = new Blob([buildFullHTML(true)], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${catName}_一括エクスポート.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // PDF: html2pdf.js を使用（印刷向けライトテーマ）
      if (!window.html2pdf) {
        alert('PDFライブラリの読み込みに失敗しました。HTMLでのエクスポートをお試しください。');
        return;
      }
      const container = document.createElement('div');
      container.innerHTML = buildFullHTML(false);
      container.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;';
      document.body.appendChild(container);
      const filename = `${catName}_一括エクスポート.pdf`;
      const cleanupContainer = () => {
        try { document.body.removeChild(container); } catch (_) {}
      };

      window.html2pdf()
        .from(container)
        .set({
          margin: 10,
          filename,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .toPdf()
        .get('pdf')
        .then(pdf => {
          cleanupContainer();
          const arrayBuf = pdf.output('arraybuffer');
          const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
          if (isIOS) {
            // iOS Safari は <a download> を PDF に適用できないため新規タブで表示
            // ユーザーは「共有 → ファイルに保存」で保存可能
            const blob = new Blob([arrayBuf], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          } else {
            // Desktop / Android: application/octet-stream でダウンロード強制
            const blob = new Blob([arrayBuf], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          }
        })
        .catch(() => {
          cleanupContainer();
          alert('PDF生成に失敗しました。HTMLでのエクスポートをお試しください。');
        });
    }
  }
}

async function createArticle(noTransition = false) {
  // ゲストのカード上限チェック（6枚まで）
  if (state.isAnonymous) {
    const snap = await db.ref(`users/${state.uid}/articles/${state.categoryId}`).once('value');
    const count = snap.exists() ? Object.keys(snap.val()).length : 0;
    if (count >= 6) {
      showLimitModal('ゲストはパネルごとに6枚までです。\nGoogleアカウントでログインすると無制限になります。');
      return;
    }
  }

  // 通信を待たずにクライアント側で即座に一意なID（キー）を生成（遅延ゼロ）
  const newRef = db.ref(`users/${state.uid}/articles/${state.categoryId}`).push();
  const newKey = newRef.key;

  // バックグラウンドで初期データを保存（画面遷移を待たせない）
  newRef.set({
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    order: Date.now()
  }).catch(err => console.error(err));

  // 新規文書生成時は自動的に編集モードへ切り替えるフラグをセット
  state.pendingAutoEditMode = true;

  if (noTransition) {
    // 一覧を経由せず、トランジションのディレイも完全にバイパスして即座にエディターを表示
    listeners.forEach(fn => fn());
    listeners = [];
    if (saveTimer) clearTimeout(saveTimer);
    navHistory.push({ screen: state.screen, categoryId: state.categoryId, articleId: state.articleId });
    state = { screen: 'editor', categoryId: state.categoryId, articleId: newKey, uid: state.uid, pendingAutoEditMode: true, _isNewCard: true, isPremium: state.isPremium, isAnonymous: state.isAnonymous };
    
    const appEl = document.getElementById('app');
    appEl.classList.remove('visible');
    appEl.innerHTML = '';
    renderEditor(appEl);
    appEl.classList.add('visible'); // setTimeoutによる180ms遅延を完全に排除
  } else {
    goTo('editor', state.categoryId, newKey);
  }
}

// ============================================
//  SCREEN C: 記事エディター（リッチ対応）
// ============================================
function renderEditor(container) {
  container.innerHTML = `
    <div class="screen-editor">
      <header class="app-header editor-header">
        <button class="btn-icon" id="btnBack" title="一覧へ戻る">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="save-status editing" id="saveStatus">読み込み中…</span>
        <div class="editor-header-actions">
          <button class="btn-icon" id="btnBulkCopy" title="選択した段落をコピー" style="display: none; background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; width: 42px; height: 42px; margin-right: 0.75rem; border-radius: 12px; color: #3b82f6; transition: transform 0.2s; align-items: center; justify-content: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display: block;">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="btn-icon danger" id="btnBulkDelete" title="選択した段落をカット" style="display: none; background: rgba(239, 68, 68, 0.2); border: 1px solid var(--danger); width: 42px; height: 42px; margin-right: 0.75rem; border-radius: 12px; color: var(--danger); transition: transform 0.2s; align-items: center; justify-content: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display: block;">
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
              <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
              <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
            </svg>
          </button>
          <button class="btn-icon" id="btnTextFormat" title="書式を変更" style="display: none; background: rgba(139, 92, 246, 0.2); border: 1px solid #8b5cf6; width: 42px; height: 42px; margin-right: 0.75rem; border-radius: 12px; color: #8b5cf6; transition: transform 0.2s; align-items: center; justify-content: center;">
            <span style="font-size:1.6rem; line-height:1; pointer-events:none;">🚀</span>
          </button>
          <button class="btn-icon accent" id="btnPaste" title="段落を貼り付け" style="display: none; background: rgba(249, 115, 22, 0.2); border: 1px solid var(--accent); width: 42px; height: 42px; margin-right: 0.35rem; border-radius: 12px; color: var(--accent); transition: transform 0.2s; align-items: center; justify-content: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display: block;">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
          </button>
          <button class="btn-icon" id="btnPasteCancel" title="貼り付けキャンセル" style="display: none; background: #22c55e; border: 1px solid #22c55e; width: 42px; height: 42px; margin-right: 0.35rem; border-radius: 12px; color: #ffffff; transition: transform 0.2s; align-items: center; justify-content: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="display: block;">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <button class="btn-icon" id="btnAttach" title="画像を添付" style="margin-right: 0.35rem;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display: block;">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <button class="btn-icon danger" id="btnDel" title="カード全体を削除">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </header>
      <div id="edContent" class="editor-content"></div>
      <div class="mode-toggle-bar mode-view" id="btnModeToggle">閲</div>
      <div class="editor-undo-btn" id="btnUndo" title="削除した内容を復元する" style="display:none">
        <span class="undo-icon">↩</span>
        <span class="undo-label">戻す</span>
      </div>
      <div id="pasteHintBar" class="paste-hint-bar" style="display:none">貼り付け位置をタップしてください</div>
      <div id="textFormatMenu" style="display:none; position:fixed; z-index:10000; background:var(--card-bg,#1e1e1e); border:1px solid var(--border,#444); border-radius:12px; padding:8px; box-shadow:0 4px 24px rgba(0,0,0,0.5); max-width:90vw;">
        <div style="display:flex; align-items:center; gap:6px;">
          <button id="btnApplyH1" title="大見出し" style="padding:9px 16px; border:1px solid #555; background:transparent; color:var(--text,#fff); font-size:1.05rem; font-weight:900; cursor:pointer; border-radius:8px; letter-spacing:-0.5px; white-space:nowrap; transition:background 0.15s,border-color 0.15s;">H1</button>
          <button id="btnApplyH2" title="中見出し" style="padding:9px 14px; border:1px solid #555; background:transparent; color:var(--text,#fff); font-size:0.95rem; font-weight:800; cursor:pointer; border-radius:8px; letter-spacing:-0.5px; white-space:nowrap; transition:background 0.15s,border-color 0.15s;">H2</button>
          <button id="btnApplyParagraph" title="地の文（通常サイズ）" style="padding:9px 14px; border:1px solid #555; background:transparent; color:var(--text,#fff); font-size:0.85rem; font-weight:600; cursor:pointer; border-radius:8px; white-space:nowrap; transition:background 0.15s,border-color 0.15s;">地の文</button>
          <div id="textFormatDivider" style="width:1px; height:26px; background:var(--border,#444); flex-shrink:0;"></div>
        </div>
        <div id="colorPaletteRow" style="display:flex; align-items:center; gap:8px; margin-top:8px; flex-wrap:wrap;">
          <button class="color-swatch-btn" data-color="#ef4444" title="赤" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#ef4444; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#f97316" title="オレンジ" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#f97316; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#eab308" title="黄" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#eab308; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#22c55e" title="緑" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#22c55e; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#3b82f6" title="青" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#3b82f6; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#a855f7" title="紫" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#a855f7; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#000000" title="黒" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#000000; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#ffffff" title="白" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#ffffff; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#f472b6" title="ピンク" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#f472b6; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#d946ef" title="マゼンタ" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#d946ef; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#38bdf8" title="ライトブルー" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#38bdf8; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#06b6d4" title="シアン" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#06b6d4; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#84cc16" title="ライムグリーン" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#84cc16; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#92400e" title="ブラウン" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#92400e; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#d4af37" title="ゴールド" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#d4af37; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="#c0c0c0" title="シルバー" style="width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:#c0c0c0; cursor:pointer; padding:0;"></button>
          <button class="color-swatch-btn" data-color="" title="デフォルトに戻す" style="width:28px; height:28px; border-radius:50%; border:2px dashed rgba(255,255,255,0.4); background:transparent; color:#fff; font-size:0.7rem; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center;">✕</button>
        </div>
      </div>
      <div id="textFormatMenuBackdrop" style="display:none; position:fixed; inset:0; z-index:5;"></div>
      <input type="file" id="fileInput" style="display: none;" multiple />
    </div>`;

  document.getElementById('btnBack').onclick   = () => goBack();

  // Undoボタン: 編集モード中は常に表示。lastDeletedContent の有無で active/inactive を切替
  // TipTapのundo()は使用しない（全消えリスクがあるため）
  function updateUndoButtonVisibility() {
    const undoBtn = document.getElementById('btnUndo');
    if (!undoBtn || state.editorMode !== 'edit') return;
    undoBtn.style.display = 'flex';
    if (lastDeletedContent !== null) {
      undoBtn.classList.remove('inactive');
    } else {
      undoBtn.classList.add('inactive');
    }
  }

  // 閲覧／編集モード切り替えの制御
  function setEditorMode(mode) {
    state.editorMode = mode;
    const toggleBar = document.getElementById('btnModeToggle');
    if (!toggleBar) return;
    const proseMirrorEl = tiptapEditor ? tiptapEditor.view.dom : null;

    if (mode === 'edit') {
      toggleBar.className = 'mode-toggle-bar mode-edit';
      toggleBar.textContent = '編';
      if (tiptapEditor) tiptapEditor.setEditable(true);
      if (proseMirrorEl) {
        proseMirrorEl.classList.remove('mode-view');
        cleanupAllSwipedParagraphs(proseMirrorEl);
      }
      updateUndoButtonVisibility();
    } else {
      toggleBar.className = 'mode-toggle-bar mode-view';
      toggleBar.textContent = '閲';
      const undoBtn = document.getElementById('btnUndo');
      if (undoBtn) { undoBtn.style.display = 'none'; undoBtn.classList.remove('inactive'); }
      if (tiptapEditor) {
        tiptapEditor.setEditable(false);
        tiptapEditor.commands.blur();
      }
      if (proseMirrorEl) proseMirrorEl.classList.add('mode-view');
      const edContent = document.getElementById('edContent');
      if (edContent) {
        const marker = edContent.querySelector('.paste-insert-line');
        if (marker) marker.remove();
      }
      // 編集モードで表示していた画像削除ボタンが残らないように消す
      if (window._removeImageDeleteBtn) window._removeImageDeleteBtn();
    }
    refreshParaSortable(mode);
    refreshYoutubeDeleteButtons(mode);
  }
  // initializeNativeParagraphActions等の外部関数から呼べるように登録
  window._setEditorMode = setEditorMode;

  const modeBtn = document.getElementById('btnModeToggle');
  if (modeBtn) {
    modeBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (window.globalCutParagraphs && window.globalCutParagraphs.length > 0 && state.editorMode === 'view') {
        showToast("ペースト先を選択するか、ペーストを完了してください");
        return;
      }
      if (state.editorMode === 'view') {
        setEditorMode('edit');
      } else {
        setEditorMode('view');
      }
    };
  }

  const undoBtn = document.getElementById('btnUndo');
  if (undoBtn) {
    undoBtn.onclick = (e) => {
      e.stopPropagation();
      if (!tiptapEditor || lastDeletedContent === null) return;
      if (!window.confirm('1つ前の状態に戻しますか？')) return;
      tiptapEditor.commands.setContent(lastDeletedContent);
      lastDeletedContent = null;
      const pm = tiptapEditor.view.dom;
      initializeNativeParagraphActions(pm);
      if (pm.classList.contains('mode-view')) refreshYoutubeDeleteButtons('view');
      saveEditorContentDirectly();
      updateUndoButtonVisibility();
    };
  }

  // 閲覧モード中にエディタ本文をタップ → 編集モードに自動切替してカーソル点滅
  const editorEl = document.getElementById('edContent');
  if (editorEl) {
    editorEl.addEventListener('click', (e) => {
      if (state.editorMode !== 'view') return;
      // アイコンやボタンのタップは除外
      if (e.target.closest('button') || e.target.closest('.btn-icon')) return;

      // YouTubeノードはiframeに直接タッチが届くため clickイベントはここまで来ない
      // （overlayを除去済みのため、YouTubeタップはiframeが処理する）

      // posAtCoordsをsetEditorMode前に計算する（モード切替でツールバー高さが変わると
      // 座標→ドキュメント位置の変換がずれるため、元のレイアウトで取得する）
      let targetPos = null;
      if (tiptapEditor) {
        const pos = tiptapEditor.view.posAtCoords({ left: e.clientX, top: e.clientY });
        if (pos) {
          targetPos = pos.pos;
          try {
            const $pos = tiptapEditor.state.doc.resolve(pos.pos);
            if ($pos.nodeAfter && $pos.nodeAfter.type.name === 'image') {
              targetPos = pos.pos + $pos.nodeAfter.nodeSize;
            }
          } catch (_) {}
        }
      }
      setEditorMode('edit');
      if (tiptapEditor) {
        // focus()を先に呼ぶ: contenteditable要素へのfocus時にブラウザがDOM selectionを
        // リセットする。rAFで1フレーム後にsetTextSelectionを適用し上書きする。
        tiptapEditor.commands.focus();
        requestAnimationFrame(() => {
          if (tiptapEditor && !tiptapEditor.isDestroyed) {
            if (targetPos !== null) {
              tiptapEditor.commands.setTextSelection(targetPos);
            }
          }
        });
      }
    });
  }

  // 初期化時のモード設定（新規文書の場合は自動で編集モードに切り替える）
  setTimeout(() => {
    if (state.pendingAutoEditMode) {
      state.pendingAutoEditMode = false;
      setEditorMode('edit');
    } else {
      setEditorMode('view');
    }
    // refreshYoutubeDeleteButtons は setEditorMode 内で呼ばれる
  }, 50);
  document.getElementById('btnDel').onclick    = deleteArticle;

  // 貼り付けキャンセルボタン（カットを元に戻す）
  const pasteCancelBtn = document.getElementById('btnPasteCancel');
  if (pasteCancelBtn) {
    pasteCancelBtn.onclick = () => {
      if (pasteAutoHideTimer) { clearTimeout(pasteAutoHideTimer); pasteAutoHideTimer = null; }
      if (lastDeletedContent !== null && tiptapEditor) {
        tiptapEditor.commands.setContent(lastDeletedContent);
        const pm = tiptapEditor.view.dom;
        initializeNativeParagraphActions(pm);
        if (pm.classList.contains('mode-view')) refreshYoutubeDeleteButtons('view');
        saveEditorContentDirectly();
        lastDeletedContent = null;
      }
      window.globalCutParagraphs = null;
      removePasteMarker();
      updatePasteButtonState();
      showToast('カットを元に戻しました');
    };
  }

  const fileInput = document.getElementById('fileInput');
  const btnAttach = document.getElementById('btnAttach');
  if (btnAttach && fileInput) {
    fileInput.setAttribute('accept', 'image/*'); // 画像のみ受付
    btnAttach.onclick = () => {
      // 非同期での画像読み込みに備えてカーソル位置を一時退避
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        state.savedRange = sel.getRangeAt(0).cloneRange();
      } else {
        state.savedRange = null;
      }
      fileInput.click();
    };
    
    fileInput.onchange = async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      if (!tiptapEditor) return;

      // 挿入前のHTMLを退避 (Undo用)
      lastDeletedContent = tiptapEditor.getHTML();

      const imageFiles = [...files].filter(f => f.type.indexOf('image') !== -1);
      if (imageFiles.length > 0) {
        await handleMultipleImagesForTipTap(imageFiles);
      }

      state.savedRange = null;
      fileInput.value = '';
    };
  }

  const pasteBtn = document.getElementById('btnPaste');
  if (pasteBtn) {
    pasteBtn.onclick = () => {
      const pm = tiptapEditor ? tiptapEditor.view.dom : document.getElementById('edContent');
      if (pm) {
        if (activePasteMarkerP) {
          pasteCutParagraphs(pm, activePasteMarkerP, activePasteLocation);
          removePasteMarker();
        } else {
          pasteCutParagraphs(pm);
        }
      }
    };
    updatePasteButtonState();
  }

  const bulkCopyBtn = document.getElementById('btnBulkCopy');
  if (bulkCopyBtn) {
    bulkCopyBtn.onclick = () => {
      const pm = tiptapEditor ? tiptapEditor.view.dom : document.getElementById('edContent');
      if (!pm) return;

      const selectedParas = pm.querySelectorAll('p.para-selected, h1.para-selected, h2.para-selected, [data-youtube-video].para-selected');
      if (selectedParas.length === 0) return;

      window.globalCutParagraphs = Array.from(selectedParas).map(el => {
        const clone = el.cloneNode(true);
        const chk = clone.querySelector('.para-checkbox');
        if (chk) chk.remove();
        clone.classList.remove('para-selected');
        if (el.tagName === 'P') clone.removeAttribute('class');
        return clone.outerHTML;
      });

      selectedParas.forEach(p => p.classList.add('para-copy-animating'));

      setTimeout(() => {
        selectedParas.forEach(p => p.classList.remove('para-copy-animating'));
        cleanupAllSwipedParagraphs(pm);
        updatePasteButtonState();
        showToast("段落をコピーしました");
      }, 500);
    };
  }

  const bulkDelBtn = document.getElementById('btnBulkDelete');
  if (bulkDelBtn) {
    bulkDelBtn.onclick = () => {
      const pm = tiptapEditor ? tiptapEditor.view.dom : document.getElementById('edContent');
      if (!pm) return;

      const selectedParas = pm.querySelectorAll('p.para-selected, h1.para-selected, h2.para-selected, [data-youtube-video].para-selected');
      if (selectedParas.length === 0) return;

      window.globalCutParagraphs = Array.from(selectedParas).map(el => {
        const clone = el.cloneNode(true);
        const chk = clone.querySelector('.para-checkbox');
        if (chk) chk.remove();
        clone.classList.remove('para-selected');
        if (el.tagName === 'P') clone.removeAttribute('class');
        return clone.outerHTML;
      });

      lastDeletedContent = tiptapEditor ? tiptapEditor.getHTML() : '';

      selectedParas.forEach(p => p.classList.add('para-cut-animating'));

      setTimeout(() => {
        selectedParas.forEach(p => p.remove());

        // カット後に残った孤立した空段落を除去して上に詰める
        Array.from(pm.querySelectorAll('p')).forEach(p => {
          if (!p.querySelector('img') &&
              (p.childNodes.length === 0 ||
               (p.childNodes.length === 1 && p.firstChild.nodeName === 'BR'))) {
            p.remove();
          }
        });
        if (!pm.querySelector('p, h1, h2, [data-youtube-video]')) {
          pm.appendChild(document.createElement('p'));
        }

        if (isEditorEmpty()) {
          deleteArticleSilently();
          return;
        }

        // DOMの変更をTipTapの内部状態に同期
        if (tiptapEditor) {
          tiptapEditor.commands.setContent(getCleanPMHTML());
          refreshYoutubeDeleteButtons('view');
        }

        // カット後はbulk選択ボタンを消し、ペースト/キャンセルのみ表示
        const _bd = document.getElementById('btnBulkDelete');
        const _bc = document.getElementById('btnBulkCopy');
        if (_bd) { _bd.style.display = 'none'; _bd.classList.remove('pulse-delete-active'); }
        if (_bc) { _bc.style.display = 'none'; _bc.classList.remove('pulse-delete-active'); }
        updatePasteButtonState();
        // 5秒後に貼り付けボタンを自動非表示（貼り付けなければ削除扱い）
        if (pasteAutoHideTimer) clearTimeout(pasteAutoHideTimer);
        pasteAutoHideTimer = setTimeout(() => {
          window.globalCutParagraphs = null;
          updatePasteButtonState();
          pasteAutoHideTimer = null;
        }, 5000);
      }, 500);
    };
  }

  // ── テキスト書式メニュー ────────────────────────────
  const textFmtBtn = document.getElementById('btnTextFormat');
  const textFmtMenu = document.getElementById('textFormatMenu');
  const textFmtBackdrop = document.getElementById('textFormatMenuBackdrop');

  function closeTextFormatMenu() {
    if (textFmtMenu) textFmtMenu.style.display = 'none';
    if (textFmtBackdrop) textFmtBackdrop.style.display = 'none';
  }

  // ヘルパー: 選択中段落のPM内テキスト範囲を取得
  function getParaTextRange(p) {
    try {
      const insidePos = tiptapEditor.view.posAtDOM(p, 0);
      const $pos = tiptapEditor.state.doc.resolve(insidePos);
      const nodeStart = $pos.before($pos.depth);
      const node = tiptapEditor.state.doc.nodeAt(nodeStart);
      if (!node) return null;
      return { from: nodeStart + 1, to: nodeStart + node.nodeSize - 1 };
    } catch (_) { return null; }
  }

  // H1 / H2 適用（見出し含む全選択ブロックに対応）
  function applyHeadingToSelected(level) {
    const pm = tiptapEditor ? tiptapEditor.view.dom : null;
    if (!pm) return;
    const selected = Array.from(pm.querySelectorAll('p.para-selected, h1.para-selected, h2.para-selected'));
    if (selected.length === 0) return;
    // 下から上に適用してPM位置ずれを防ぐ
    [...selected].reverse().forEach(el => {
      try {
        const insidePos = tiptapEditor.view.posAtDOM(el, 0);
        tiptapEditor.chain().setTextSelection(insidePos).toggleHeading({ level }).run();
      } catch (_) {}
    });
    const pm2 = tiptapEditor.view.dom;
    cleanupAllSwipedParagraphs(pm2);
    updateBulkDeleteButtonState(pm2);
    closeTextFormatMenu();
    // 変換後の見出し要素にドラッグハンドルを再注入（TipTapがDOMノードを置き換えるため）
    if (state.editorMode === 'view') refreshYoutubeDeleteButtons('view');
  }

  // 地の文（通常段落）に戻す
  function applyParagraphToSelected() {
    const pm = tiptapEditor ? tiptapEditor.view.dom : null;
    if (!pm) return;
    const selected = Array.from(pm.querySelectorAll('p.para-selected, h1.para-selected, h2.para-selected'));
    if (selected.length === 0) return;
    [...selected].reverse().forEach(el => {
      try {
        const insidePos = tiptapEditor.view.posAtDOM(el, 0);
        tiptapEditor.chain().setTextSelection(insidePos).setParagraph().run();
      } catch (_) {}
    });
    const pm2 = tiptapEditor.view.dom;
    cleanupAllSwipedParagraphs(pm2);
    updateBulkDeleteButtonState(pm2);
    closeTextFormatMenu();
    if (state.editorMode === 'view') refreshYoutubeDeleteButtons('view');
  }

  if (textFmtBtn && textFmtMenu) {
    textFmtBtn.onclick = (e) => {
      e.stopPropagation();
      if (textFmtMenu.style.display !== 'none') { closeTextFormatMenu(); return; }

      // 選択中の要素タグからアクティブ状態を検出
      const pm = tiptapEditor ? tiptapEditor.view.dom : null;
      const allSelected = pm ? Array.from(pm.querySelectorAll('.para-selected')) : [];
      const blockMode = allSelected.length > 0;
      const allH1 = blockMode && allSelected.every(el => el.tagName === 'H1');
      const allH2 = blockMode && allSelected.every(el => el.tagName === 'H2');
      const allP  = blockMode && allSelected.every(el => el.tagName === 'P');
      const activeStyle = 'rgba(139,92,246,0.35)';
      const activeBorder = '#8b5cf6';
      const h1Btn = document.getElementById('btnApplyH1');
      const h2Btn = document.getElementById('btnApplyH2');
      const pBtn  = document.getElementById('btnApplyParagraph');
      const divider = document.getElementById('textFormatDivider');
      if (h1Btn) { h1Btn.style.background = allH1 ? activeStyle : 'transparent'; h1Btn.style.borderColor = allH1 ? activeBorder : '#555'; }
      if (h2Btn) { h2Btn.style.background = allH2 ? activeStyle : 'transparent'; h2Btn.style.borderColor = allH2 ? activeBorder : '#555'; }
      if (pBtn)  { pBtn.style.background  = allP  ? activeStyle : 'transparent'; pBtn.style.borderColor  = allP  ? activeBorder : '#555'; }

      // 見出し関連ボタンはブロック（段落）選択時のみ表示。文字色は単独テキスト選択でも常に使える
      if (h1Btn) h1Btn.style.display = blockMode ? '' : 'none';
      if (h2Btn) h2Btn.style.display = blockMode ? '' : 'none';
      if (pBtn) pBtn.style.display = blockMode ? '' : 'none';
      if (divider) divider.style.display = blockMode ? '' : 'none';

      const rect = textFmtBtn.getBoundingClientRect();
      textFmtMenu.style.top = (rect.bottom + 6) + 'px';
      textFmtMenu.style.right = (window.innerWidth - rect.right) + 'px';
      textFmtMenu.style.left = 'auto';
      textFmtMenu.style.display = 'block';
      if (textFmtBackdrop) textFmtBackdrop.style.display = 'block';
    };
  }

  if (textFmtBackdrop) textFmtBackdrop.onclick = closeTextFormatMenu;

  const btnH1 = document.getElementById('btnApplyH1');
  if (btnH1) btnH1.onclick = (e) => { e.stopPropagation(); applyHeadingToSelected(1); };

  const btnH2 = document.getElementById('btnApplyH2');
  if (btnH2) btnH2.onclick = (e) => { e.stopPropagation(); applyHeadingToSelected(2); };

  const btnP = document.getElementById('btnApplyParagraph');
  if (btnP) btnP.onclick = (e) => { e.stopPropagation(); applyParagraphToSelected(); };

  // 文字色パレット（段落・見出しの一括選択、または通常のテキスト選択の両方に対応）
  // iOS Safariで input type="color" を繰り返しタップすると誤ってダブルタップズームが
  // 発動し画面全体が拡大される不具合があったため、ネイティブピッカーは使わず
  // あらかじめ用意した色のボタンをタップした瞬間に即時反映する方式にしている。
  const applyColorToSelected = (color) => {
    const pm = tiptapEditor ? tiptapEditor.view.dom : null;
    if (!pm || !tiptapEditor) return;
    const markType = tiptapEditor.schema.marks.textStyle;
    if (!markType) return;

    const ranges = Array.from(pm.querySelectorAll('p.para-selected, h1.para-selected, h2.para-selected'))
      .map(el => getParaTextRange(el))
      .filter(r => r && r.from < r.to);

    // ブロック選択が無ければ、現在のテキスト選択範囲に適用する（見出し設定とは独立して動作）
    if (ranges.length === 0) {
      const { from, to, empty } = tiptapEditor.state.selection;
      if (!empty) ranges.push({ from, to });
    }
    if (ranges.length === 0) return;

    let tr = tiptapEditor.state.tr;
    ranges.forEach(({ from, to }) => {
      tr = color ? tr.addMark(from, to, markType.create({ color })) : tr.removeMark(from, to, markType);
    });
    tiptapEditor.view.dispatch(tr);
  };

  document.querySelectorAll('.color-swatch-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      applyColorToSelected(btn.dataset.color || null);
      const pm = tiptapEditor ? tiptapEditor.view.dom : null;
      if (pm) cleanupAllSwipedParagraphs(pm);
      updateBulkDeleteButtonState(tiptapEditor ? tiptapEditor.view.dom : null);
      closeTextFormatMenu();
    };
  });

  addSwipeBack(container, () => {
    if (state.editorMode === 'view') {
      goBack();
    }
  });

  // 罫線・特殊区切り文字を自動クリーンアップ＆スペース整形する関数
  function cleanAndFormatBorderLines(txt) {
    let t = txt || '';
    
    // 1. 横方向の罫線もどき（3つ以上連続する横線記号）の行を完全に削除
    const horizontalBorderRegex = /^[ \t]*([-_=\*~\+\.─━┄┅┈┉＝＊◆■★☆┌┐└┘├┤┬┴┼])\1{2,}[ \t]*$/gm;
    t = t.replace(horizontalBorderRegex, '');

    // 2. 縦方向の罫線・区切り記号を改行に変換（後続の ─ 等も除去して行ごとに分離）
    const verticalBorderRegex = /[ \t　]*[│┃├┤┼┌┐└┘｜\|┆┇┊┋┬┴][─━ \t　]*/g;
    t = t.replace(verticalBorderRegex, '\n');

    // 3. 連続する空行を1行に圧縮
    t = t.replace(/\n{3,}/g, '\n\n').trim();

    return t;
  }

  // ── TipTap エディター初期化 ──────────────────────────
  const edEl = document.getElementById('edContent');
  const status = document.getElementById('saveStatus');

  // 閲覧モード中、画像タップ/ピンチでProseMirrorがカーソルを置いてフォーカスしてしまう問題への対策。
  // edContent（ProseMirrorの親要素）のキャプチャフェーズで先取りして停止することで、
  // ProseMirror自身の mousedown/touchstart 処理や他のリスナーに一切イベントを渡さない。
  // 拡大モーダル機能は保留中のため、画像タップは完全に無反応でよい。
  const blockImageTouchInViewMode = (e) => {
    if (state.editorMode !== 'view') return;
    if (e.target && e.target.tagName === 'IMG' && e.target.classList.contains('inserted-img')) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }
  };
  edEl.addEventListener('mousedown', blockImageTouchInViewMode, true);
  edEl.addEventListener('touchstart', blockImageTouchInViewMode, { capture: true, passive: false });
  edEl.addEventListener('pointerdown', blockImageTouchInViewMode, true);
  edEl.addEventListener('click', blockImageTouchInViewMode, true);

  const { Editor: TiptapEditor, StarterKit, ImageExtension, YoutubeExtension, TaskList, TaskItem, TextStyleExtension } = window.TipTapBundle;

  // 1行目auto-H1: 空の1行目に初めてテキストを入力した瞬間にH1を適用するためのフラグ
  let _firstLineWasEmpty = false;
  let _autoH1Done = false;

  tiptapEditor = new TiptapEditor({
    element: edEl,
    extensions: [
      StarterKit,
      ImageExtension.configure({ allowBase64: true, inline: true, HTMLAttributes: { class: 'inserted-img' } }),
      YoutubeExtension.configure({ controls: true, nocookie: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyleExtension,
    ],
    editable: false,
    content: '<p></p>',
    editorProps: {
      // 画像タップ時のカーソル流入対策は edEl のキャプチャフェーズリスナー（blockImageTouchInViewMode）で
      // ProseMirrorに到達する前に止めているため、ここでは何もしない。
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;

        // 画像貼り付けを横取りして圧縮・グループ挿入
        const imageFiles = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) imageFiles.push(file);
          }
        }
        if (imageFiles.length > 0) {
          event.preventDefault();
          handleMultipleImagesForTipTap(imageFiles);
          return true;
        }

        const text = event.clipboardData?.getData('text/plain') || '';
        if (!text) return false;

        // YouTube URLはTipTapのパスルール（YoutubeExtension）に委ねる
        const ytUrlTest = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^#\&\?\s]+)/i;
        if (ytUrlTest.test(text.trim())) return false;

        event.preventDefault();

        // 罫線テーブル文字は専用整形
        const borderMatches = text.match(/[\|│┃┼├┤┌┐└┘｜┆┇┊┋┬┴]/g);
        const hasTableBorders = borderMatches && borderMatches.length >= 3 && text.includes('\n');
        const cleaned = hasTableBorders
          ? cleanAndFormatBorderLines(text)
          : cleanMarkdownForPaste(text);

        if (!cleaned.trim()) return true;

        // 改行ごとに段落へ変換（空行は除去して詰める）
        const lines = cleaned.split('\n');
        const html = lines
          .filter(l => l.trim() !== '')
          .map(l => `<p>${esc(l)}</p>`)
          .join('');
        if (!html) return true;
        tiptapEditor.commands.insertContent(html);
        return true;
      },
      handleKeyDown(view, event) {
        // IME確定直後の幽霊Enter（iPhoneで変換確定と改行が同キー）を抑止
        if (event.key === 'Enter' && compositionJustEnded) return true;

        if (event.key !== 'Backspace') return false;
        const { state } = view;
        const { $from, empty } = state.selection;

        // 段落先頭のカーソルのみ対象
        if (!empty || $from.parentOffset !== 0) return false;
        if ($from.parent.type.name !== 'paragraph') return false;

        const depth = $from.depth;
        const indexInParent = $from.index(depth - 1);
        if (indexInParent === 0) return false; // 前の兄弟なし

        const prevNode = $from.node(depth - 1).child(indexInParent - 1);

        // 直前段落が画像1つだけの場合の Backspace 処理
        if (
          prevNode.type.name === 'paragraph' &&
          prevNode.childCount === 1 &&
          prevNode.firstChild &&
          prevNode.firstChild.type.name === 'image'
        ) {
          // 現在段落が空 → 空段落を削除してカーソルを画像段落末尾へ（画像は残す）
          if ($from.parent.content.size === 0) {
            event.preventDefault();
            const cursorTargetPos = $from.before(depth) - 1; // 画像段落末尾の位置
            tiptapEditor.chain()
              .deleteCurrentNode()
              .setTextSelection(Math.max(1, cursorTargetPos))
              .run();
            return true;
          }
          // 現在段落にテキストあり → 画像段落末尾へカーソル移動のみ（マージしない）
          const targetPos = $from.before(depth) - 1;
          setTimeout(() => {
            if (tiptapEditor) tiptapEditor.commands.setTextSelection(targetPos);
          }, 0);
          event.preventDefault();
          return true;
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      if (isComposing || isRemovingTrailingP) return;

      // 1行目が空の状態から文字を入力した瞬間にH1を自動適用
      if (!_autoH1Done && _firstLineWasEmpty && state.editorMode === 'edit') {
        const firstNode = editor.state.doc.firstChild;
        if (firstNode && firstNode.type.name === 'paragraph' && firstNode.textContent.trim() !== '') {
          _autoH1Done = true;
          setTimeout(() => {
            if (!tiptapEditor || tiptapEditor.isDestroyed) return;
            tiptapEditor.chain().setTextSelection(1).setHeading({ level: 1 }).run();
          }, 0);
        }
      }

      // 画像段落直後の末尾空段落を即時削除（閲覧モード限定）
      // 編集モードではユーザーが Enter で意図的に追加した空段落を消さないよう除外する
      if (state.editorMode !== 'edit') {
        const { doc } = editor.state;
        if (doc.childCount >= 2) {
          const last = doc.child(doc.childCount - 1);
          const prev = doc.child(doc.childCount - 2);
          const lastIsEmpty = last.type.name === 'paragraph' && (
            last.childCount === 0 ||
            (last.childCount === 1 && last.firstChild.type.name === 'hardBreak')
          );
          const prevHasImage = prev.type.name === 'paragraph' &&
            prev.childCount > 0 && prev.lastChild && prev.lastChild.type.name === 'image';
          if (lastIsEmpty && prevHasImage) {
            isRemovingTrailingP = true;
            const from = doc.content.size - last.nodeSize;
            editor.view.dispatch(
              editor.state.tr.delete(from, doc.content.size).setMeta('addToHistory', false)
            );
            isRemovingTrailingP = false;
            return;
          }
        }
      }

      if (status) { status.textContent = '編集中…'; status.className = 'save-status editing'; }
      updateUndoButtonVisibility();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          const content = stripTrailingEmptyP(restoreOriginalSrcs(editor.getHTML(), origDataUrls));
          await db.ref(`users/${state.uid}/articles/${state.categoryId}/${state.articleId}`).update({
            content, updatedAt: Date.now()
          });
          const s = document.getElementById('saveStatus');
          if (s) { s.textContent = '保存済み ✓'; s.className = 'save-status saved'; }
        } catch {
          const s = document.getElementById('saveStatus');
          if (s) { s.textContent = '保存失敗 ✗'; s.className = 'save-status error'; }
        }
      }, 1000);
    },
    onCreate: ({ editor }) => {
      // IMEフラグ管理
      const pm = editor.view.dom;
      pm.addEventListener('compositionstart', () => { isComposing = true; });
      pm.addEventListener('compositionend', () => {
        isComposing = false;
        compositionJustEnded = true;
        setTimeout(() => { compositionJustEnded = false; }, 80);
      });
    },
  });

  // blurイベント: フォーカスが外れたとき（iOSキーボードの「完了/承認」ボタン押下など）に
  // 編集モードなら閲覧モードへ自動切替する。
  // ヘッダーボタン操作で一時的に blur が起きても focus が戻れば切替をキャンセルする。
  let _blurToViewTimer = null;
  tiptapEditor.on('blur', () => {
    _blurToViewTimer = setTimeout(() => {
      _blurToViewTimer = null;
      if (state.editorMode !== 'edit') return;
      if (!tiptapEditor || tiptapEditor.isDestroyed || tiptapEditor.isFocused) return;
      setEditorMode('view');
    }, 300);
  });

  // selectionUpdateイベント: 段落スワイプ選択なしでも、通常のテキスト選択（範囲選択）が
  // あれば書式メニュー（文字色のみ）を使えるようにボタンを表示する
  tiptapEditor.on('selectionUpdate', ({ editor }) => {
    if (state.editorMode !== 'edit') return;
    const pm = editor.view.dom;
    if (pm.querySelectorAll('.para-selected').length > 0) return; // ブロック選択中はそちら優先
    const btn = document.getElementById('btnTextFormat');
    if (!btn) return;
    btn.style.display = editor.state.selection.empty ? 'none' : 'flex';
  });

  // focusイベント: iOSキーボード表示完了を待って（500ms）カーソルを見える位置にスクロール
  tiptapEditor.on('focus', () => {
    if (_blurToViewTimer) { clearTimeout(_blurToViewTimer); _blurToViewTimer = null; }
    setTimeout(() => {
      if (!tiptapEditor || tiptapEditor.isDestroyed) return;
      try {
        const { from } = tiptapEditor.state.selection;
        const domPos = tiptapEditor.view.domAtPos(from);
        const el = domPos.node.nodeType === 3 ? domPos.node.parentElement : domPos.node;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vvHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const visibleBottom = vvHeight - 20;
        if (rect.bottom > visibleBottom) {
          const edContent = document.getElementById('edContent');
          if (edContent) edContent.scrollTop += rect.bottom - visibleBottom;
        }
      } catch (_) {}
    }, 500);
  });

  // ── iOS アドレスバー対応: #app の高さを起動時にロックして dvh 変動を防ぐ ──
  // タップ時にアドレスバーが出てきて dvh が縮小しても #app は固定高さを維持する
  const app = document.getElementById('app');
  const initialVVH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  if (app) app.style.height = initialVVH + 'px';

  // キーボード表示時のみ #app と edContent を縮める
  // 閾値を 75% にして address bar 変動（~6%）を誤検出しないようにする
  const updateEditorHeight = () => {
    const edContent = document.getElementById('edContent');
    const header = document.querySelector('.screen-editor .editor-header');
    if (!app || !edContent || !header) return;
    const vvh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const winH = window.innerHeight;
    const keyboardVisible = vvh < winH * 0.75;
    if (keyboardVisible) {
      app.style.height = vvh + 'px';
      const headerH = header.getBoundingClientRect().height;
      edContent.style.height = Math.max(100, vvh - headerH) + 'px';
      edContent.style.flex = 'none';
    } else {
      // キーボード非表示: initialVVH か vvh の大きい方を採用
      // アドレスバーが消えた際（vvh が増加）に #app を広げて表示域を最大化する
      app.style.height = Math.max(initialVVH, vvh) + 'px';
      edContent.style.height = '';
      edContent.style.flex = '';
    }
  };
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateEditorHeight);
  }
  listeners.push(() => {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', updateEditorHeight);
    }
    if (app) app.style.height = ''; // エディタ離脱時に CSS デフォルト(100dvh)に戻す
    const edContent = document.getElementById('edContent');
    if (edContent) { edContent.style.height = ''; edContent.style.flex = ''; }
  });

  // ── iPhone 横回転時に YouTube を全画面表示 ──
  // TipTap の DOM は一切変更しない（DOM 移動は MutationObserver を誤発火させて画面を破壊する）
  // 同じ src の iframe を持つ body 直下オーバーレイを生成し、requestFullscreen() でネイティブ全画面化する
  const clearYtLandscape = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (e) {}
    }
    const overlay = document.getElementById('yt-ls-overlay');
    if (overlay) overlay.remove();
    document.body.classList.remove('yt-fullscreen-active');
  };

  const applyYtLandscape = () => {
    if (state.screen !== 'editor') return;
    if (document.getElementById('yt-ls-overlay')) return; // 既に表示中
    const pm = tiptapEditor && tiptapEditor.view && tiptapEditor.view.dom;
    if (!pm) return;

    // ビューポート内で最初に見えている YouTube iframe の src を取得
    const allIframes = pm.querySelectorAll('[data-youtube-video] iframe');
    if (allIframes.length === 0) return;
    const visibleIframe = Array.from(allIframes).find(f => {
      const r = f.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    const srcIframe = visibleIframe || allIframes[0];
    const src = srcIframe.src || srcIframe.getAttribute('src') || '';
    if (!src) return;

    // 全画面オーバーレイを body に追加（TipTap の DOM は不変）
    const overlay = document.createElement('div');
    overlay.id = 'yt-ls-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;';

    const newIframe = document.createElement('iframe');
    newIframe.src = src;
    newIframe.style.cssText = 'width:100%;height:100%;border:0;';
    newIframe.setAttribute('allow', 'autoplay;fullscreen;encrypted-media;picture-in-picture');
    newIframe.setAttribute('allowfullscreen', '');

    overlay.appendChild(newIframe);
    document.body.appendChild(overlay);
    document.body.classList.add('yt-fullscreen-active');

    // ネイティブフルスクリーンを要求（iOS 16.4+ Safari / Chrome 対応）
    // orientationchange はユーザー操作とみなされるため requestFullscreen が通る場合がある
    setTimeout(() => {
      try {
        if (overlay.requestFullscreen) overlay.requestFullscreen();
        else if (overlay.webkitRequestFullscreen) overlay.webkitRequestFullscreen();
      } catch (e) {}
    }, 200);
  };

  // ユーザーが Done ボタン等でフルスクリーンを手動解除した場合にオーバーレイも閉じる
  const onFsChange = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const overlay = document.getElementById('yt-ls-overlay');
      if (overlay) overlay.remove();
      document.body.classList.remove('yt-fullscreen-active');
    }
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  const getIsLandscape = () => {
    if (typeof window.orientation !== 'undefined') return Math.abs(window.orientation) === 90;
    if (screen.orientation && screen.orientation.type) return screen.orientation.type.startsWith('landscape');
    return window.innerWidth > window.innerHeight;
  };

  const orientationChangeHandler = () => {
    setTimeout(() => {
      if (!getIsLandscape()) { clearYtLandscape(); return; }
      applyYtLandscape();
    }, 400);
  };

  window.addEventListener('orientationchange', orientationChangeHandler);
  if (screen.orientation) {
    screen.orientation.addEventListener('change', orientationChangeHandler);
  }
  listeners.push(() => {
    window.removeEventListener('orientationchange', orientationChangeHandler);
    if (screen.orientation) screen.orientation.removeEventListener('change', orientationChangeHandler);
    document.removeEventListener('fullscreenchange', onFsChange);
    document.removeEventListener('webkitfullscreenchange', onFsChange);
    clearYtLandscape();
  });

  // ── Firebase からコンテンツを読み込む ─────────────
  db.ref(`users/${state.uid}/articles/${state.categoryId}/${state.articleId}`).once('value', snap => {
    if (!tiptapEditor) return;

    let raw = snap.val()?.content || '';

    if (state._isNewCard) {
      state._isNewCard = false;
      tiptapEditor.commands.setContent('<p></p>', false);
      _firstLineWasEmpty = true; _autoH1Done = false;
      if (status) { status.textContent = '保存済み ✓'; status.className = 'save-status saved'; }
      // 編集モードで開くため setEditorMode('edit') が後から呼ばれる
    } else {
      // レガシープレースホルダーの自動修復
      const looksLikeLegacyPlaceholder = raw.includes('1行目がタイトルになります')
        && raw.includes('2行目から本文を書いてください');
      if (looksLikeLegacyPlaceholder) {
        raw = '';
        db.ref(`users/${state.uid}/articles/${state.categoryId}/${state.articleId}`)
          .update({ content: '', updatedAt: Date.now() }).catch(() => {});
      }

      let displayHTML;
      const isHTML = raw.trimStart().startsWith('<');

      if (!isHTML) {
        const decoded = raw
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/?(div|p|h\d|li)[^>]*>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        const lines = decoded.split('\n').map(l => stripMarkdown(l.trim())).filter(l => l.length > 0);
        displayHTML = lines.map(l => `<p>${esc(l)}</p>`).join('') || '<p></p>';
        db.ref(`users/${state.uid}/articles/${state.categoryId}/${state.articleId}`)
          .update({ content: displayHTML, updatedAt: Date.now() }).catch(() => {});
      } else {
        const tmp = document.createElement('div');
        tmp.innerHTML = raw;
        stripMarkdownFromDOM(tmp);
        displayHTML = tmp.innerHTML || '<p></p>';
        if (displayHTML !== raw) {
          db.ref(`users/${state.uid}/articles/${state.categoryId}/${state.articleId}`)
            .update({ content: displayHTML, updatedAt: Date.now() }).catch(() => {});
        }
      }

      origDataUrls = extractDataUrls(displayHTML);
      displayHTML = preprocessHTMLForTipTap(displayHTML).html;
      tiptapEditor.commands.setContent(displayHTML, false);
      // setContent 後に TipTap が末尾空段落を自動追加した場合は再 setContent で除去
      {
        const postHTML = tiptapEditor.getHTML();
        const postCleaned = stripTrailingEmptyP(postHTML);
        if (postCleaned !== postHTML) {
          tiptapEditor.commands.setContent(postCleaned, false);
        }
      }
      // ロード後の1行目状態を確認してauto-H1フラグを初期化
      {
        const firstNode = tiptapEditor.state.doc.firstChild;
        _firstLineWasEmpty = !firstNode || (firstNode.type.name === 'paragraph' && firstNode.textContent.trim() === '');
        _autoH1Done = false;
      }
      if (status) { status.textContent = '保存済み ✓'; status.className = 'save-status saved'; }
    }

    // setContent がUndo履歴に残るのを防ぐ（ロード前の空状態へのUndoを不可能にする）
    // EditorState.createで同じdocを持つが履歴が空の新鮮な状態に差し替える
    try {
      const curState = tiptapEditor.view.state;
      const freshState = curState.constructor.create({
        doc: curState.doc,
        plugins: curState.plugins,
      });
      tiptapEditor.view.updateState(freshState);
    } catch (e) { /* 念のため握りつぶす */ }

    // 段落スワイプなどのネイティブアクションを初期化
    const proseMirrorEl = tiptapEditor.view.dom;
    initializeNativeParagraphActions(proseMirrorEl);
    // Firebase コンテンツロード後に YouTube削除ボタンを再inject（setEditorMode時点では要素がまだ無い）
    if (proseMirrorEl.classList.contains('mode-view')) {
      refreshYoutubeDeleteButtons('view');
    }
    // 全文検索からジャンプしてきた場合は指定段落にスクロール＋キーワード点滅
    if (state.pendingScrollToParagraph !== undefined) {
      const paraIdx = state.pendingScrollToParagraph;
      const searchKw = state.pendingSearchKeyword || null;
      delete state.pendingScrollToParagraph;
      delete state.pendingSearchKeyword;
      setTimeout(() => {
        const pm = tiptapEditor?.view?.dom;
        if (!pm) return;
        const paras = Array.from(pm.children).filter(
          el => !el.classList.contains('paste-insert-line') && !el.classList.contains('insert-line')
        );
        const target = paras[paraIdx];
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (searchKw) blinkSearchKeyword(pm, searchKw, 3000);
      }, 400);
    }
  });

}

// ── TipTap用画像圧縮・レイアウト挿入ヘルパー群 ───────────────

// 画像ファイルを圧縮して {src, w, h, isPortrait} を返す
function compressImageForLayout(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = evt => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800;
        let w = img.width, h = img.height;
        if (w > MAX_SIZE || h > MAX_SIZE) {
          if (w > h) { h = Math.round(h * MAX_SIZE / w); w = MAX_SIZE; }
          else { w = Math.round(w * MAX_SIZE / h); h = MAX_SIZE; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve({ src: canvas.toDataURL('image/jpeg', 0.75), w, h, isPortrait: h > w });
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// 画像HTMLをエディターに独立した段落として挿入するコアヘルパー
// ・カーソルが空段落 → その段落を置換（split で余分な空段落を作らない）
// ・カーソルが文字段落 → 段落末尾の直後に挿入（テキストと混在しない）
// ・挿入後のカーソルは「直後のブロック（なければ新規空段落）」へ移動
function _insertImageBlock(imgHtml) {
  if (!tiptapEditor) return;
  const { state } = tiptapEditor;
  const $from    = state.doc.resolve(state.selection.from);
  if ($from.depth < 1) return;

  const paraStart = $from.before(1);
  const paraEnd   = $from.after(1);
  const curPara   = $from.node(1);
  const isEmpty   = curPara.type.name === 'paragraph' &&
    (curPara.childCount === 0 ||
     (curPara.childCount === 1 && curPara.firstChild.type.name === 'hardBreak'));

  tiptapEditor.chain()
    .focus()
    .insertContentAt(isEmpty ? { from: paraStart, to: paraEnd } : paraEnd, imgHtml)
    .command(({ tr, state: st, dispatch }) => {
      if (!dispatch) return true;
      try {
        const { from } = tr.selection;
        const $f  = tr.doc.resolve(from);
        const nxt = $f.after($f.depth >= 1 ? 1 : 0);
        if (nxt < tr.doc.content.size) {
          // 直後に既存ブロックがあれば余分な空段落を追加せずそこへ移動
          tr.setSelection(st.selection.constructor.near(tr.doc.resolve(nxt + 1)));
        } else {
          // ドキュメント末尾のときだけ空段落を1つ追加
          tr.insert(nxt, st.schema.nodes.paragraph.create());
          tr.setSelection(st.selection.constructor.near(tr.doc.resolve(nxt + 1)));
        }
      } catch (e) {}
      return true;
    })
    .run();
}

// 1枚の画像をTipTapに挿入（portrait/landscape に応じたクラスを付与）
function insertSingleImageIntoTipTap(data) {
  return new Promise(resolve => {
    if (!tiptapEditor) { resolve(); return; }
    const cls = data.isPortrait ? 'portrait-img' : 'landscape-img';
    _insertImageBlock(`<p><img class="${cls}" src="${data.src}"></p>`);
    resolve();
  });
}

// 縦画像をグループ（2枚 or 4枚）として1段落にまとめて挿入
function insertPortraitGroupIntoTipTap(imageData) {
  if (!tiptapEditor) return;
  const imgHtml = imageData.map(d => `<img class="portrait-img" src="${d.src}">`).join('');
  _insertImageBlock(`<p>${imgHtml}</p>`);
}

// 複数画像を向き・枚数に応じてレイアウト分けして挿入
async function handleMultipleImagesForTipTap(files) {
  const imageData = await Promise.all(files.map(compressImageForLayout));
  const count = imageData.length;
  if (count === 0) return;

  const allPortrait = imageData.every(d => d.isPortrait);

  // 1枚 or 縦横混在: 個別に縦積み
  if (!allPortrait || count === 1) {
    for (const d of imageData) {
      await insertSingleImageIntoTipTap(d);
    }
    return;
  }

  // 縦画像のみ: 枚数に応じたグループレイアウト
  if (count === 2) {
    insertPortraitGroupIntoTipTap(imageData);
  } else if (count === 3) {
    insertPortraitGroupIntoTipTap(imageData.slice(0, 2));
    await insertSingleImageIntoTipTap(imageData[2]);
  } else {
    insertPortraitGroupIntoTipTap(imageData.slice(0, 4));
    for (const d of imageData.slice(4)) {
      await insertSingleImageIntoTipTap(d);
    }
  }
}

// ファイル入力・クリップアイコンからの単体挿入用（後方互換）
function handleImageForTipTap(file) {
  return compressImageForLayout(file).then(d => insertSingleImageIntoTipTap(d));
}


async function deleteArticle() {
  if (!confirm("このメモを完全に削除します。よろしいですか？")) return;
  await db.ref(`users/${state.uid}/articles/${state.categoryId}/${state.articleId}`).remove();
  goTo('category', state.categoryId, null, true);
}

// 直接Firebaseから無音でカードを完全削除する（最後の段落削除時）
async function deleteArticleSilently() {
  if (!state.articleId || !state.categoryId || !state.uid) return;
  await db.ref(`users/${state.uid}/articles/${state.categoryId}/${state.articleId}`).remove();
  goTo('category', state.categoryId, null, true);
}

// 既存のメモを複製してコピー元のすぐ上に挿入する
async function duplicateArticle(artId, categoryId) {
  try {
    // 1. 対象カードのデータを取得
    const snap = await db.ref(`users/${state.uid}/articles/${categoryId}/${artId}`).once('value');
    const original = snap.val();
    if (!original) return;

    // 2. 現在の全カードリストを取得してソート（表示時と同じロジック）
    const allSnap = await db.ref(`users/${state.uid}/articles/${categoryId}`).once('value');
    const allData = allSnap.val() || {};
    const arts = Object.entries(allData)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return b.order - a.order;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });

    // 3. コピー元カードのインデックスを特定
    const targetIndex = arts.findIndex(a => a.id === artId);
    if (targetIndex === -1) return;

    // 4. 新しいカードをプッシュしてキーを生成
    const newRef = db.ref(`users/${state.uid}/articles/${categoryId}`).push();
    const newKey = newRef.key;

    // 5. 複製するデータを作成
    const duplicateData = {
      content: original.content || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 6. 新しい配列を作成し、コピー元の上に挿入
    const newArts = [...arts];
    newArts.splice(targetIndex, 0, { id: newKey, ...duplicateData });

    // 7. 先に複製データを Firebase に新規保存 (update 時の重複パスエラーを防止)
    await db.ref(`users/${state.uid}/articles/${categoryId}/${newKey}`).set(duplicateData);

    // 8. 全カードの order を新しい順序に合わせて一括更新
    const updates = {};
    const total = newArts.length;
    newArts.forEach((art, i) => {
      updates[`users/${state.uid}/articles/${categoryId}/${art.id}/order`] = total - i;
    });
    
    // 複写されたカードにフラッシュ効果を入れるため、justEditedArticleId を新しいカード of IDにセットする！
    justEditedArticleId = newKey;

    await db.ref().update(updates);
  } catch (err) {
    console.error("Duplicate article failed:", err);
  }
}


// エディタのプレーンなコンテンツが完全に空であるかを判定
function isEditorEmpty() {
  if (tiptapEditor) {
    return tiptapEditor.isEmpty;
  }
  return true;
}

// ── ユーティリティ ───────────────────────────
// 太陽マーク「☀︎」(U+2600 + U+FE0E) などの異体字セレクタおよびゼロ幅スペースを除去し、段落合体バグを防止する
function cleanupInvalidUnicodeCharacters(editor) {
  if (!editor) return;

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    removeInvalidUnicodeFromNode(editor);
    return;
  }

  let anchor = sel.anchorNode;
  if (!anchor || !editor.contains(anchor)) {
    removeInvalidUnicodeFromNode(editor);
    return;
  }

  // キャレットのある親段落 p を特定
  let targetP = anchor;
  if (targetP.nodeType === Node.TEXT_NODE) {
    targetP = targetP.parentNode;
  }
  while (targetP && targetP.parentNode !== editor) {
    targetP = targetP.parentNode;
  }

  if (targetP && targetP.tagName === 'P') {
    const caretPos = getCaretCharacterOffsetWithin(targetP);
    const removedCount = removeInvalidUnicodeFromNode(targetP);

    if (removedCount > 0) {
      setCaretCharacterOffsetWithin(targetP, Math.max(0, caretPos - removedCount));
    }
  } else {
    // 予期しない構造の場合のフォールバック
    const caretPos = getCaretCharacterOffsetWithin(editor);
    const removedCount = removeInvalidUnicodeFromNode(editor);
    if (removedCount > 0) {
      setCaretCharacterOffsetWithin(editor, Math.max(0, caretPos - removedCount));
    }
  }
}

function removeInvalidUnicodeFromNode(node) {
  let count = 0;
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    // \ufe0e, \ufe0f (異体字セレクタ) と \u200b (ゼロ幅スペース) を除去
    const cleaned = text.replace(/[\ufe0e\ufe0f\u200b]/g, '');
    if (cleaned !== text) {
      count += (text.length - cleaned.length);
      node.textContent = cleaned;
    }
  } else {
    for (let i = 0; i < node.childNodes.length; i++) {
      count += removeInvalidUnicodeFromNode(node.childNodes[i]);
    }
  }
  return count;
}

function getCaretCharacterOffsetWithin(element) {
  let caretOffset = 0;
  const doc = element.ownerDocument || element.document;
  const win = doc.defaultView || doc.parentWindow;
  const sel = win.getSelection();
  if (sel.rangeCount > 0) {
    const range = win.getSelection().getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    caretOffset = preCaretRange.toString().length;
  }
  return caretOffset;
}

function setCaretCharacterOffsetWithin(element, offset) {
  let charIndex = 0;
  const range = document.createRange();
  range.setStart(element, 0);
  range.collapse(true);
  
  const nodeQueue = [element];
  let found = false;
  
  while (nodeQueue.length > 0 && !found) {
    const node = nodeQueue.shift();
    if (node.nodeType === Node.TEXT_NODE) {
      const nextCharIndex = charIndex + node.length;
      if (offset >= charIndex && offset <= nextCharIndex) {
        range.setStart(node, offset - charIndex);
        range.collapse(true);
        found = true;
      }
      charIndex = nextCharIndex;
    } else {
      let i = node.childNodes.length;
      while (i--) {
        nodeQueue.unshift(node.childNodes[i]);
      }
    }
  }
  
  if (found) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function getVirtualLength(str) {
  let len = 0;
  for (let i = 0; i < (str || '').length; i++) {
    if (str.charCodeAt(i) <= 127) {
      len += 0.5;
    } else {
      len += 1.0;
    }
  }
  return len;
}

function esc(str) {
  return String(str || '').replace(/[&<>'"]/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])
  );
}

// ── 段落の常時スワイプ一括削除制御 ─────────────────
let activeGlobalEditorClickCleanup = null;

// エディタロード時にスワイプ選択を自動バインド
// エディタ内のHTML構造を常にPタグ（画像も含む）に平坦化・正規化する
function normalizeEditorHTML(editor) {
  if (!editor) return;

  // 全ての挿入画像に確実にcontentEditable="false"を付与して変形つまみ等の発生を根絶する
  editor.querySelectorAll('img').forEach(img => {
    img.setAttribute('contenteditable', 'false');
  });

  // 🎥 YouTubeリンクの自動埋め込み展開 (Shorts URL にも対応)
  editor.querySelectorAll('p').forEach(p => {
    const text = p.textContent.trim();
    const ytMatch = text.match(/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^#\&\?\s]+)/i);
    if (ytMatch) {
      const videoId = ytMatch[4];
      const iframeContainer = document.createElement('div');
      iframeContainer.className = 'youtube-container';
      iframeContainer.contentEditable = 'false';
      iframeContainer.innerHTML = `
        <iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      `;
      p.innerHTML = '';
      p.appendChild(iframeContainer);
      
      // その下に操作用の空段落がなければ追加
      if (!p.nextSibling) {
        const nextP = document.createElement('p');
        nextP.appendChild(document.createElement('br'));
        p.parentNode.appendChild(nextP);
      }
    }
  });

  // Pタグの内部の BR タグを境界として、Pタグを別々のPタグ（段落）に自動分割する！
  // これにより画面上の改行がすべて個別の段落として扱われるようになります。
  let hasSplit = false;

  // 入力中・編集中の段落のDOM破壊によるカーソル（キャレット）消失バグを防ぐため、現在の選択位置を取得
  const sel = window.getSelection();
  let activeNode = null;
  if (sel && sel.rangeCount > 0) {
    activeNode = sel.getRangeAt(0).startContainer;
  }

  const pTags = Array.from(editor.querySelectorAll('p'));
  pTags.forEach(p => {
    // 現在カーソルがある段落は、文字入力中の自動マージ等のバグを防ぐため分割対象外にする
    if (activeNode && (p.contains(activeNode) || p === activeNode)) {
      return;
    }

    const brs = p.querySelectorAll('br');
    // 単なる空段落 <p><br></p> は分割対象外
    if (brs.length === 0 || (brs.length === 1 && p.textContent.trim() === '' && !p.querySelector('img'))) {
      return;
    }

    const parent = p.parentNode;
    const childNodes = Array.from(p.childNodes);
    let currentNewP = document.createElement('p');
    if (p.className) currentNewP.className = p.className;

    childNodes.forEach(node => {
      if (node.tagName === 'BR') {
        // 現在構築中のPタグにコンテンツがあれば挿入
        if (currentNewP.childNodes.length > 0) {
          parent.insertBefore(currentNewP, p);
          currentNewP = document.createElement('p');
          if (p.className) currentNewP.className = p.className;
        } else {
          // 直前がBRなどで空なら、空行段落 <p><br></p> を挿入
          const emptyP = document.createElement('p');
          emptyP.appendChild(document.createElement('br'));
          parent.insertBefore(emptyP, p);
        }
      } else {
        // チェックスパンは再構築されるため除外
        if (node.classList && node.classList.contains('para-checkbox')) {
          return;
        }
        currentNewP.appendChild(node.cloneNode(true));
      }
    });

    // 最後に残ったPタグを挿入
    if (currentNewP.childNodes.length > 0) {
      parent.insertBefore(currentNewP, p);
    } else {
      const emptyP = document.createElement('p');
      emptyP.appendChild(document.createElement('br'));
      parent.insertBefore(emptyP, p);
    }

    p.remove();
    hasSplit = true;
  });

  let needNormalize = false;
  // 直接の子要素をチェック
  for (let child of editor.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== '') {
      needNormalize = true;
      break;
    }
    if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'P' && !child.classList.contains('youtube-container')) {
      needNormalize = true;
      break;
    }
  }

  if (needNormalize || hasSplit) {
    const tempDiv = document.createElement('div');
    let currentP = null;

    // 子ノードを走査し、すべてPタグまたは特別に許可したDIVコンテナにする
    Array.from(editor.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.replace(/\s+/g, '') === '') {
          return;
        }
        if (!currentP) {
          currentP = document.createElement('p');
          tempDiv.appendChild(currentP);
        }
        currentP.appendChild(document.createTextNode(text));
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName;
        if (tagName === 'P') {
          currentP = node.cloneNode(true);
          tempDiv.appendChild(currentP);
        } else if (tagName === 'BR') {
          currentP = document.createElement('p');
          currentP.appendChild(document.createElement('br'));
          tempDiv.appendChild(currentP);
          currentP = null;
        } else if (tagName === 'IMG') {
          currentP = document.createElement('p');
          const clonedImg = node.cloneNode(true);
          clonedImg.setAttribute('contenteditable', 'false');
          currentP.appendChild(clonedImg);
          tempDiv.appendChild(currentP);
          currentP = null;
        } else if (node.classList.contains('youtube-container')) {
          // 特別なコンテナはそのまま複製して維持（末尾飛ばしバグを解消）
          tempDiv.appendChild(node.cloneNode(true));
          currentP = null;
        } else {
          // P以外の要素の中身を取り出してPにする
          const p = document.createElement('p');
          while (node.firstChild) {
            p.appendChild(node.firstChild);
          }
          if (node.className) p.className = node.className;
          tempDiv.appendChild(p);
          currentP = null;
        }
      }
    });

    const newHTML = tempDiv.innerHTML || '<p><br></p>';
    if (editor.innerHTML !== newHTML) {
      editor.innerHTML = newHTML;
    }
  }
}

// クリック位置 clientY に最も近い ProseMirror 直接子要素を返す
function findNearestEditorChild(proseMirror, clientY) {
  const children = Array.from(proseMirror.children).filter(
    el => !el.classList.contains('paste-insert-line') && !el.classList.contains('insert-line')
  );
  if (children.length === 0) return null;
  for (const child of children) {
    const r = child.getBoundingClientRect();
    if (clientY >= r.top && clientY <= r.bottom) return child;
  }
  let best = null;
  let bestDist = Infinity;
  for (const child of children) {
    const r = child.getBoundingClientRect();
    const dist = Math.abs(clientY - (r.top + r.bottom) / 2);
    if (dist < bestDist) { bestDist = dist; best = child; }
  }
  return best;
}

function initializeNativeParagraphActions(editor) {
  if (!editor) return;

  // 閲覧モード中且つペーストバッファが存在する時のタップ（挿入マーカー）制御
  editor.addEventListener('click', (e) => {
    if (state.editorMode !== 'view' || !window.globalCutParagraphs || window.globalCutParagraphs.length === 0) {
      return;
    }
    // マーカー自身のクリックは無視
    if (e.target.classList.contains('paste-insert-line') || e.target.closest('.paste-insert-line')) return;

    // ProseMirror 直接子まで遡る（<p>・[data-youtube-video] どちらも対応）
    let targetEl = null;
    if (e.target === editor) {
      targetEl = findNearestEditorChild(editor, e.clientY);
    } else {
      targetEl = e.target;
      while (targetEl && targetEl.parentNode !== editor) {
        targetEl = targetEl.parentNode;
      }
      if (!targetEl || targetEl.classList.contains('paste-insert-line')) {
        targetEl = findNearestEditorChild(editor, e.clientY);
      }
    }

    if (!targetEl) { removePasteMarker(); return; }

    e.stopPropagation();
    e.preventDefault();
    const rect = targetEl.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const location = (relativeY < rect.height / 2) ? 'before' : 'after';
    if (activePasteMarkerP === targetEl && activePasteLocation === location) {
      removePasteMarker();
    } else {
      showPasteMarker(targetEl, location);
    }
  });

  // PC用画像削除ボタンのセットアップ
  setupImageDeleteButtons(editor);

  // 画像移動は段落ドラッグハンドル（⠿）でSortableJSが処理するため独自実装は不要

  // 各段落（<p>）にスワイプイベントをバインド
  bindParagraphSwipeEvents(editor);

  // paraSortable は setEditorMode 経由で refreshParaSortable が初期化する

  // キー入力でスワイプ選択・ペーストバッファをクリア
  editor.onkeydown = (e) => {
    cleanupAllSwipedParagraphs(editor);
    const isCharacterKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey;
    if (isCharacterKey || e.key === 'Backspace' || e.key === 'Delete') {
      if (window.globalCutParagraphs && window.globalCutParagraphs.length > 0) {
        window.globalCutParagraphs = null;
        updatePasteButtonState();
      }
    }
    // Enter・段落分割はTipTap（ProseMirror）が処理するため自前ハンドリングは不要
  };

  // フォーカスイン時のスクロールリセット（iOS仮想キーボード表示時のヘッダー消失防止）
  // Firebase の on('value') のたびに initializeNativeParagraphActions が呼ばれるため
  // 古いリスナーを必ず除去してからつけ直し、スタック累積を防ぐ
  if (editor._focusinHandler) editor.removeEventListener('focusin', editor._focusinHandler);
  if (editor._blurHandler)    editor.removeEventListener('blur',    editor._blurHandler);
  if (editor._scrollLockTimer) { clearInterval(editor._scrollLockTimer); editor._scrollLockTimer = null; }

  editor._blurHandler = () => {
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }, 80);
  };
  editor.addEventListener('blur', editor._blurHandler);

  // エディタ外のクリックで選択解除
  const outsideClickListener = (e) => {
    if (!editor.contains(e.target) && !e.target.closest('#btnBulkDelete') && !e.target.closest('#btnPaste') && !e.target.closest('#undo-toast')) {
      cleanupAllSwipedParagraphs(editor);
    }
  };
  document.addEventListener('click', outsideClickListener);
  activeGlobalEditorClickCleanup = outsideClickListener;

}

// 空段落（テキストも画像も持たない <p>）かどうか判定
function isEmptyParagraph(p) {
  return p.tagName === 'P' &&
    !p.querySelector('img') &&
    p.textContent.trim() === '';
}

// 特定の段落を選択（チェック）状態にする/解除する（☑️のトグル）
function toggleParagraphSelect(p, editor) {
  if (!p) return;

  const hasSelected = p.classList.contains('para-selected');

  if (hasSelected) {
    // 選択解除
    p.classList.remove('para-selected');
    const chk = p.querySelector('.para-checkbox');
    if (chk) chk.remove();
  } else {
    // 選択（チェックON）
    p.classList.add('para-selected');
    
    // チェックボックススパンを左端に生成（鮮烈に目立つ赤レ点 ✔）
    const chk = document.createElement('span');
    chk.className = 'para-checkbox';
    chk.contentEditable = 'false'; // 編集不可にして誤入力を防ぐ
    chk.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    
    p.insertBefore(chk, p.firstChild);

    // チェックマーク自体をタップしても解除できるようにイベントを紐付け
    chk.onclick = (e) => {
      e.stopPropagation();
      toggleParagraphSelect(p, editor);
    };
  }

  // 一括削除ボタンの表示状態を更新
  updateBulkDeleteButtonState(editor);
}

// YouTube ノードの選択トグル（para-selected を付け外し）
function toggleYoutubeSelect(ytDiv, editor) {
  if (ytDiv.classList.contains('para-selected')) {
    ytDiv.classList.remove('para-selected');
    const chk = ytDiv.querySelector('.para-checkbox');
    if (chk) chk.remove();
  } else {
    ytDiv.classList.add('para-selected');
    const chk = document.createElement('span');
    chk.className = 'para-checkbox';
    chk.contentEditable = 'false';
    chk.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    chk.onclick = (e) => {
      e.stopPropagation();
      toggleYoutubeSelect(ytDiv, editor);
    };
    ytDiv.appendChild(chk);
  }
  updateBulkDeleteButtonState(editor);
}

// 一括削除ボタンの表示/非表示とアニメーションクラスのトグル
function updateBulkDeleteButtonState(editor) {
  const bulkDelBtn = document.getElementById('btnBulkDelete');
  const bulkCopyBtn = document.getElementById('btnBulkCopy');
  const textFmtBtn = document.getElementById('btnTextFormat');
  if (!editor) return;

  const selectedCount = editor.querySelectorAll('p.para-selected, h1.para-selected, h2.para-selected, [data-youtube-video].para-selected').length;
  if (selectedCount > 0) {
    if (bulkDelBtn) {
      bulkDelBtn.style.display = 'flex';
      bulkDelBtn.style.transform = 'scale(1.15)';
      bulkDelBtn.classList.add('pulse-delete-active');
    }
    if (bulkCopyBtn) {
      bulkCopyBtn.style.display = 'flex';
      bulkCopyBtn.style.transform = 'scale(1.15)';
      bulkCopyBtn.classList.add('pulse-delete-active');
    }
    if (textFmtBtn) {
      textFmtBtn.style.display = 'flex';
      textFmtBtn.style.transform = 'scale(1.15)';
    }
  } else {
    if (bulkDelBtn) {
      bulkDelBtn.style.display = 'none';
      bulkDelBtn.style.transform = 'scale(1)';
      bulkDelBtn.classList.remove('pulse-delete-active');
    }
    if (bulkCopyBtn) {
      bulkCopyBtn.style.display = 'none';
      bulkCopyBtn.style.transform = 'scale(1)';
      bulkCopyBtn.classList.remove('pulse-delete-active');
    }
    if (textFmtBtn) {
      textFmtBtn.style.display = 'none';
      textFmtBtn.style.transform = 'scale(1)';
    }
  }
}

// 単一の段落の選択状態を解除してプレーンに戻す
function cleanupSingleParagraph(p) {
  if (!p || !p.classList.contains('para-selected')) return;
  const chk = p.querySelector('.para-checkbox');
  if (chk) chk.remove();
  p.classList.remove('para-selected');
  if (!p.classList.length) p.removeAttribute('class');
}

// すべての段落の選択状態をクリーンアップ
function cleanupAllSwipedParagraphs(editor) {
  if (!editor) return;
  const selectedParas = Array.from(editor.querySelectorAll('.para-selected'));
  selectedParas.forEach(p => cleanupSingleParagraph(p));
  updateBulkDeleteButtonState(editor);
}

// ProseMirror DOM から注入UI要素を除いたクリーンな innerHTML を返す
// setContent に渡す際は必ずこれを使うこと（para-drag-handle等が混入すると空段落が生成される）
function getCleanPMHTML() {
  if (!tiptapEditor) return '<p></p>';
  const clone = tiptapEditor.view.dom.cloneNode(true);
  clone.querySelectorAll(
    '.para-drag-handle, .yt-del-btn, .para-checkbox, .swipe-action-btn, .paste-guide-message, .paste-insert-line'
  ).forEach(el => el.remove());
  return clone.innerHTML || '<p></p>';
}

// ── TipTap HTML 前後処理 ──────────────────────────────────────────────────

function extractDataUrls(html) {
  const urls = [];
  html.replace(/<img\b[^>]*\bsrc="(data:[^"]+)"/gi, (_, src) => urls.push(src));
  return urls;
}

// setContent 前処理: 既存HTMLをTipTap互換形式に変換
function preprocessHTMLForTipTap(html) {
  const logs = [];
  let result = html;

  // img の contenteditable / inserted-img class を除去（portrait-img / landscape-img は保持）
  let imgCount = 0;
  result = result.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
    imgCount++;
    attrs = attrs.replace(/\s+contenteditable="[^"]*"/gi, '');
    attrs = attrs.replace(/(\s+class="([^"]*)")/gi, (_m, _full, cls) => {
      const keep = cls.split(/\s+/)
        .filter(c => c === 'portrait-img' || c === 'landscape-img')
        .join(' ');
      return keep ? ` class="${keep}"` : '';
    });
    return '<img' + attrs + '>';
  });
  if (imgCount) logs.push('[img] ' + imgCount + ' 件: contenteditable / class 処理（portrait-img/landscape-img 保持）');

  // <p class="..."> の class を除去
  result = result.replace(/<p(\s[^>]*)>/gi, (match, attrs) => {
    if (!attrs.includes('class=')) return match;
    const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || '';
    logs.push('[p] class 除去: "' + cls + '"');
    return '<p' + attrs.replace(/\s*class="[^"]*"/, '') + '>';
  });

  // YouTube コンテナを TipTap ノード形式に変換
  const ytRe =
    /<p>\s*<div[^>]*class="youtube-container"[^>]*>[\s\S]*?src="[^"]*youtube\.com\/embed\/([^?"&#\s]+)[^"]*"[\s\S]*?<\/div>\s*<\/p>/gi;
  let ytCount = 0;
  result = result.replace(ytRe, (match, videoId) => {
    ytCount++;
    logs.push('[YouTube #' + ytCount + '] videoId: ' + videoId);
    return '<div data-youtube-video><iframe src="https://www.youtube.com/embed/' + videoId + '"></iframe></div>';
  });

  // <p>内にimgとテキストが混在している場合、imgを別<p>に分割
  // portrait-img は連続するものを同一<p>にまとめる（グループを維持）
  {
    const splitDiv = document.createElement('div');
    splitDiv.innerHTML = result;
    let splitCount = 0;
    Array.from(splitDiv.querySelectorAll('p')).forEach(p => {
      const childNodes = Array.from(p.childNodes);
      const hasImg = childNodes.some(n => n.nodeType === 1 && n.tagName === 'IMG');
      if (!hasImg) return;
      const hasOther = childNodes.some(n =>
        (n.nodeType === 3 && n.textContent.trim()) ||
        (n.nodeType === 1 && n.tagName !== 'IMG')
      );
      if (!hasOther) return;
      const newPs = [];
      let curPortraits = [];
      let curText = null;
      const flushPortraits = () => {
        if (curPortraits.length === 0) return;
        const imgP = document.createElement('p');
        curPortraits.forEach(img => imgP.appendChild(img.cloneNode(true)));
        newPs.push(imgP);
        curPortraits = [];
      };
      const flushText = () => {
        if (!curText) return;
        newPs.push(curText);
        curText = null;
      };
      childNodes.forEach(node => {
        if (node.nodeType === 1 && node.tagName === 'IMG') {
          const cls = node.getAttribute('class') || '';
          flushText();
          if (cls.includes('portrait-img')) {
            curPortraits.push(node);
          } else {
            flushPortraits();
            const imgP = document.createElement('p');
            imgP.appendChild(node.cloneNode(true));
            newPs.push(imgP);
          }
        } else {
          flushPortraits();
          if (!curText) curText = document.createElement('p');
          curText.appendChild(node.cloneNode(true));
        }
      });
      flushPortraits();
      flushText();
      newPs.forEach(np => p.parentNode.insertBefore(np, p));
      p.parentNode.removeChild(p);
      splitCount++;
    });
    if (splitCount > 0) {
      result = splitDiv.innerHTML;
      logs.push('[split] img混在段落を ' + splitCount + ' 件分割（portrait-img グループ維持）');
    }
  }

  return { html: result, logs };
}

// getHTML() 後処理: Safari が data: を blob: に変換した場合に復元
function restoreOriginalSrcs(rawOut, dataUrls) {
  let idx = 0;
  return rawOut.replace(/\bsrc="(blob:[^"]+)"/gi, (match) => {
    const orig = dataUrls[idx++];
    return orig ? 'src="' + orig + '"' : match;
  });
}

// TipTapが画像末尾に自動追加する空 <p></p>/<p><br></p> を除去（保存のたびに蓄積するのを防ぐ）
function stripTrailingEmptyP(html) {
  const stripped = html.replace(/(<p>(\s|<br\s*\/?>|&nbsp;)*<\/p>)+$/, '');
  return stripped || '<p></p>';
}

// エディタ全体のクリーンなHTMLを抽出
function getCleanEditorHTML(editor) {
  if (tiptapEditor) return stripTrailingEmptyP(restoreOriginalSrcs(tiptapEditor.getHTML(), origDataUrls));
  if (!editor) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = editor.innerHTML;
  removeInvalidUnicodeFromNode(tempDiv);
  Array.from(tempDiv.children).forEach(child => {
    const chk = child.querySelector('.para-checkbox');
    if (chk) chk.remove();
    child.classList.remove('para-selected');
    if (child.tagName === 'P') child.removeAttribute('class');
  });
  return tempDiv.innerHTML;
}

// 直接FirebaseにクリーンHTMLを同期保存
function saveEditorContentDirectly() {
  if (!state.articleId || !state.categoryId || !state.uid) return;
  const content = getCleanEditorHTML();
  db.ref(`users/${state.uid}/articles/${state.categoryId}/${state.articleId}`).update({
    content,
    updatedAt: Date.now()
  }).catch(err => console.error("Save error:", err));
}

// スワイプイベントのバインド (イベントデリゲーション方式)
function bindParagraphSwipeEvents(editor) {
  cleanupNativeParagraphListeners(editor);

  let txStart = 0, tyStart = 0;
  const touchStartHandler = e => {
    if (state.editorMode === 'edit') return; // 編集モード時はスワイプ無効
    if (e.touches.length > 1) { _multiTouchActive = true; return; } // 画像ピンチ等の2本指操作はスワイプ判定対象外
    txStart = e.touches[0].clientX;
    tyStart = e.touches[0].clientY;

    // 編集状態でキーボードが開いている際、フリップしようとタッチした瞬間にフォーカスを外し（blur）、
    // 画面スクロール位置を最上部に強制リセットして、隠れていたトップバーを即座に復活させる
    const editorEl = document.getElementById('edContent');
    const proseMirrorEl = tiptapEditor ? tiptapEditor.view.dom : null;
    if (editorEl && (document.activeElement === editorEl || document.activeElement === proseMirrorEl)) {
      if (proseMirrorEl) proseMirrorEl.blur(); else editorEl.blur();
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        const app = document.getElementById('app');
        if (app) app.scrollTop = 0;
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
      }, 50);
    }
  };
  const touchEndHandler = e => {
    if (state.editorMode === 'edit') return; // 編集モード時はスワイプ無効

    // 2本指以上の操作（画像ピンチ等）に伴うタッチ終了はスワイプ/選択判定しない
    if (e.touches.length > 0) return;
    if (_multiTouchActive) { _multiTouchActive = false; return; }

    // 文字選択（範囲選択）中はフリップ動作をキャンセル
    if (window.getSelection().toString() !== '') return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - txStart;
    const rawDy = touch.clientY - tyStart;
    const dy = Math.abs(rawDy);

    // 真下スワイプ（横ズレが縦の20%未満かつ縦80px以上）以外の右方向ジェスチャーはすべて戻る
    const isStraightDown = dy >= 80 && dx < dy * 0.2;
    // 上方向への移動量が右方向の半分を超えたら上スクロールとみなし戻らない
    // （dy > dx * 2 は閾値が厳しすぎ、斜め上フリップが誤ってgoBackを発火させていた）
    const isStronglyUp = rawDy < 0 && dy > dx * 0.5;
    if (dx > 30 && !isStraightDown && !isStronglyUp) {
      // 右フリップで前の画面に戻る（緩いルール）
      goBack();
    } else if (dx < -50 && dy < 40) {
      // 左フリップで段落選択（厳しいルールを維持）
      let target = e.target;
      while (target && target.parentNode !== editor) {
        target = target.parentNode;
      }
      if (!target || target === editor) return;

      // YouTubeはスマホではスワイプ選択しない（タップ直接再生を優先）
      // 段落・見出し（H1/H2）を選択対象とする
      if (target.tagName === 'P' || target.tagName === 'H1' || target.tagName === 'H2') {
        toggleParagraphSelect(target, editor);
      }
    } else if (Math.abs(dx) <= 15 && dy <= 15 && window.globalCutParagraphs && window.globalCutParagraphs.length > 0) {
      // 短タップ＋カットバッファあり → 貼り付けマーカーを設定
      // e.preventDefault() により合成 click イベントの二重発火を防ぐ
      e.preventDefault();
      let targetEl = e.target;
      while (targetEl && targetEl.parentNode !== editor) {
        targetEl = targetEl.parentNode;
      }
      if (!targetEl || targetEl.classList.contains('paste-insert-line')) {
        targetEl = findNearestEditorChild(editor, touch.clientY);
      }
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const relativeY = touch.clientY - rect.top;
        const location = (relativeY < rect.height / 2) ? 'before' : 'after';
        if (activePasteMarkerP === targetEl && activePasteLocation === location) {
          removePasteMarker();
        } else {
          showPasteMarker(targetEl, location);
        }
      }
    }
  };

  editor.addEventListener('touchstart', touchStartHandler, { passive: true });
  editor.addEventListener('touchend',   touchEndHandler,   { passive: false }); // 貼り付けマーカー用に preventDefault が必要

  paraSwipeListeners.push({
    element: editor,
    start: touchStartHandler,
    end: touchEndHandler
  });
}

// 登録されたイベントやグローバルリスナーの解放
function cleanupNativeParagraphListeners(editor) {
  paraSwipeListeners.forEach(item => {
    if (item.element) {
      item.element.removeEventListener('touchstart', item.start);
      item.element.removeEventListener('touchend', item.end);
    }
  });
  paraSwipeListeners = [];

  if (activeGlobalEditorClickCleanup) {
    document.removeEventListener('click', activeGlobalEditorClickCleanup);
    activeGlobalEditorClickCleanup = null;
  }
}

// Undo（元に戻す）トーストの表示
function showUndoToast(editor) {
  const existing = document.getElementById('undo-toast');
  if (existing) {
    const oldCleanup = existing.cleanupEvents;
    if (oldCleanup) oldCleanup();
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'undo-toast';
  toast.className = 'undo-toast-wrapper';
  toast.innerHTML = `
    <div class="undo-toast-box">
      <span>段落を削除しました</span>
      <button class="undo-btn" id="btnUndoAction">元に戻す</button>
    </div>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  const hideToast = () => {
    toast.classList.remove('visible');
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 400);
    if (cleanupListeners) cleanupListeners();
  };

  // ユーザーの次の操作を監視して消去するイベントリスナー
  const onNextAction = () => {
    hideToast();
  };

  const cleanupListeners = () => {
    editor.removeEventListener('keydown', onNextAction);
    editor.removeEventListener('scroll', onNextAction);
    document.removeEventListener('scroll', onNextAction);
  };

  // リスナー登録
  editor.addEventListener('keydown', onNextAction, { passive: true });
  editor.addEventListener('scroll', onNextAction, { passive: true });
  document.addEventListener('scroll', onNextAction, { passive: true });

  // 既存のトースト削除時にイベントを解除できるように参照を埋め込む
  toast.cleanupEvents = cleanupListeners;

  // 画面遷移時に必ず消えるよう listeners にも登録
  listeners.push(() => {
    cleanupListeners();
    if (toast.parentNode) toast.remove();
  });

  document.getElementById('btnUndoAction').onclick = async (e) => {
    e.stopPropagation();
    if (lastDeletedContent !== null && tiptapEditor) {
      tiptapEditor.commands.setContent(lastDeletedContent);
      const pm = tiptapEditor.view.dom;
      initializeNativeParagraphActions(pm);
      if (pm.classList.contains('mode-view')) refreshYoutubeDeleteButtons('view');
      updateBulkDeleteButtonState(pm);
      lastDeletedContent = null;
    }
    hideToast();
  };
}

// カットした段落的貼り付け処理
function pasteCutParagraphs(editor, targetP = null, location = 'after') {
  if (!window.globalCutParagraphs || window.globalCutParagraphs.length === 0) return;
  // ガイドメッセージ(.paste-guide-message)がFirebaseに保存・表示されるバグを防ぐ
  removePasteMarker();
  
  let parentP = targetP;
  let refLocation = location;

  // Cross-card fix: 別カードから持ち越した参照がDOMから切り離されている場合はクリア
  if (parentP && !editor.contains(parentP)) {
    parentP = null;
  }

  if (!parentP) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      parentP = range.commonAncestorContainer;
      if (parentP.nodeType === Node.TEXT_NODE) parentP = parentP.parentNode;
      while (parentP && parentP.parentNode !== editor) {
        parentP = parentP.parentNode;
      }
      refLocation = 'after';
    }
  }

  let inserted = false;
  const insertedElements = [];
  const parentNode = editor;

  // <p> も [data-youtube-video] も挿入基準として受け付ける
  if (parentP && editor.contains(parentP) && (parentP.tagName === 'P' || parentP.hasAttribute('data-youtube-video'))) {
    let refNode = parentP;
    window.globalCutParagraphs.forEach((html, idx) => {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const newEl = temp.firstElementChild;
      if (!newEl) return;
      
      insertedElements.push(newEl);
      
      // 親段落のテキストが完全に空（または <br> のみ）かつ1枚目の場合、そこに直接置換する
      if (idx === 0 && refNode === parentP && parentP.textContent.trim() === '' && !parentP.querySelector('img') && parentP.parentNode) {
        parentP.parentNode.replaceChild(newEl, parentP);
        refNode = newEl;
      } else {
        // 2枚目以降、またはコンテンツがある場合
        const currentParent = refNode.parentNode || parentNode;
        if (idx === 0 && refLocation === 'before') {
          currentParent.insertBefore(newEl, refNode);
        } else {
          currentParent.insertBefore(newEl, refNode.nextSibling);
        }
        refNode = newEl;
      }
    });
    inserted = true;
  }
  
  if (!inserted) {
    // ターゲットもキャレットもない場合は末尾に挿入
    window.globalCutParagraphs.forEach(html => {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const newEl = temp.firstElementChild;
      if (newEl) {
        editor.appendChild(newEl);
        insertedElements.push(newEl);
      }
    });
  }
  
  // 挿入された段落にフラッシュ効果を与える
  insertedElements.forEach(el => {
    el.classList.add('para-paste-animating');
  });
  
  // 挿入後にTipTapの内部状態を同期して保存
  if (tiptapEditor) {
    tiptapEditor.commands.setContent(getCleanPMHTML());
  }
  
  // 1秒後にフラッシュクラスを除去
  setTimeout(() => {
    insertedElements.forEach(el => {
      el.classList.remove('para-paste-animating');
      if (el.getAttribute('class') === '') el.removeAttribute('class');
    });
  }, 1000);
  
  // ペースト完了後にメモリをクリア
  if (pasteAutoHideTimer) { clearTimeout(pasteAutoHideTimer); pasteAutoHideTimer = null; }
  window.globalCutParagraphs = null;
  updatePasteButtonState();
  
  // 貼り付け完了後は閲覧モードに自動切替
  if (typeof window._setEditorMode === 'function') window._setEditorMode('view');
  
  showToast("段落を貼り付けました");
}

// 閲覧/編集モードに応じて paraSortable を再生成
function refreshParaSortable(mode) {
  if (paraSortable) { paraSortable.destroy(); paraSortable = null; }
  if (!window.Sortable || !tiptapEditor) return;
  const editor = tiptapEditor.view.dom;
  if (mode === 'view') {
    paraSortable = Sortable.create(editor, {
      draggable: 'p, h1, h2, [data-youtube-video]',
      handle: '.para-drag-handle',
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      scroll: true,
      scrollSensitivity: 80,
      scrollSpeed: 10,
      forceAutoScrollFallback: true,
      onStart: () => {
        isDragging = true;
        preDragHTML = tiptapEditor ? tiptapEditor.getHTML() : null;
      },
      onEnd: (evt) => {
        isDragging = false;
        if (!tiptapEditor) return;
        if (preDragHTML && evt.oldIndex !== evt.newIndex) {
          // ドラッグ前のクリーンなHTMLを基準に段落順を組み替え
          // DOM読み取りを避けることで TipTap MutationObserver の誤再調整を防ぐ
          const tempDiv = document.createElement('div');
          const { html: cleanHTML } = preprocessHTMLForTipTap(preDragHTML);
          tempDiv.innerHTML = cleanHTML;
          const blocks = Array.from(tempDiv.children);
          if (evt.oldIndex < blocks.length) {
            const [moved] = blocks.splice(evt.oldIndex, 1);
            blocks.splice(evt.newIndex, 0, moved);
            const newDiv = document.createElement('div');
            blocks.forEach(b => newDiv.appendChild(b));
            tiptapEditor.commands.setContent(newDiv.innerHTML);
          }
        }
        preDragHTML = null;
        refreshYoutubeDeleteButtons('view');
      }
    });
  } else {
    paraSortable = Sortable.create(editor, {
      draggable: 'p.para-selected, h1.para-selected, h2.para-selected',
      delay: 150,
      delayOnTouchOnly: true,
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onStart: () => { isDragging = true; },
      onEnd: () => {
        isDragging = false;
        if (tiptapEditor) {
          tiptapEditor.commands.setContent(getCleanPMHTML());
        }
      }
    });
  }
}

// YouTube削除ボタン＆ドラッグハンドルをDOMに直接inject（閲覧モード時）
function refreshYoutubeDeleteButtons(mode) {
  if (!tiptapEditor) return;
  const pm = tiptapEditor.view.dom;

  // 既存のオーバーレイをすべてクリーンアップ
  pm.querySelectorAll('.yt-del-btn').forEach(b => b.remove());
  pm.querySelectorAll('.para-drag-handle').forEach(h => h.remove());
  pm.querySelectorAll('[data-youtube-video]').forEach(yt => {
    if (yt._ytEnter) yt.removeEventListener('mouseenter', yt._ytEnter);
    if (yt._ytLeave) yt.removeEventListener('mouseleave', yt._ytLeave);
    yt.classList.remove('yt-hovered');
    delete yt._ytEnter;
    delete yt._ytLeave;
  });
  if (mode !== 'view') return;

  pm.querySelectorAll('[data-youtube-video]').forEach(ytDiv => {
    const btn = document.createElement('button');
    btn.className = 'yt-del-btn';
    btn.contentEditable = 'false';
    btn.title = 'YouTube動画を削除';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>`;

    // CSS :hover が動かない環境向けのJS補完
    ytDiv._ytEnter = () => ytDiv.classList.add('yt-hovered');
    ytDiv._ytLeave = () => ytDiv.classList.remove('yt-hovered');
    ytDiv.addEventListener('mouseenter', ytDiv._ytEnter);
    ytDiv.addEventListener('mouseleave', ytDiv._ytLeave);

    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      lastDeletedContent = tiptapEditor ? tiptapEditor.getHTML() : '';
      ytDiv.remove();
      if (tiptapEditor) {
        tiptapEditor.commands.setContent(getCleanPMHTML());
        refreshYoutubeDeleteButtons('view');
      }
      showToast('YouTube動画を削除しました');
    };

    ytDiv.appendChild(btn);
  });

  // ドラッグハンドルを全段落・見出し・YouTube要素に inject
  pm.querySelectorAll('p, h1, h2, [data-youtube-video]').forEach(el => {
    el.style.position = 'relative';
    const handle = document.createElement('span');
    handle.className = 'para-drag-handle';
    handle.contentEditable = 'false';
    handle.innerHTML = `<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="0" width="3" height="3" rx="0.5"/><rect x="7" y="0" width="3" height="3" rx="0.5"/><rect x="0" y="5.5" width="3" height="3" rx="0.5"/><rect x="7" y="5.5" width="3" height="3" rx="0.5"/><rect x="0" y="11" width="3" height="3" rx="0.5"/><rect x="7" y="11" width="3" height="3" rx="0.5"/></svg>`;
    // 画像のみを含む段落はハンドルを上部に配置（画像中央に重なると紛らわしいため）
    const hasImgOnly = el.tagName === 'P' && el.querySelector('img.inserted-img') &&
      el.textContent.trim() === '';
    if (hasImgOnly) {
      handle.style.top = '8px';
      handle.style.transform = 'none';
    }
    el.insertBefore(handle, el.firstChild);
  });
}

// ── PCからスマホへの同期用QRコードモーダル ──────────
function showQRCodeModal() {
  const url = window.location.href;
  const isLocalFile = url.startsWith('file:');
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

  let localWarningHTML = '';
  if (isLocalFile) {
    localWarningHTML = `
      <div style="background: rgba(239, 68, 68, 0.15); border-radius: 12px; padding: 0.75rem; border: 1.5px dashed #ef4444; margin-top: 0.5rem; text-align: left; margin-bottom: 1.25rem;">
        <span style="font-size: 0.85rem; font-weight: 800; color: #f87171; display: block; margin-bottom: 0.25rem;">💡 スマホで表示されない原因：</span>
        <span style="font-size: 0.75rem; color: #e5e7eb; line-height: 1.55; display: block;">
          PCでHTMLファイルを直接ダブルクリックして開いているため（file:/// 形式）、スマホからPCのファイルを読み取ることができません。<br>
          <strong style="color: #f97316; display: block; margin-top: 0.35rem; margin-bottom: 0.15rem;">【解決策】</strong>
          このメモアプリを Netlify や GitHub Pages などのサーバーにアップロード（デプロイ）し、その「公開されたURL（https://...）」でPCとスマホの両方からアクセスしてください。
        </span>
      </div>
    `;
  } else if (isLocalhost) {
    localWarningHTML = `
      <div style="background: rgba(245, 158, 11, 0.15); border-radius: 12px; padding: 0.75rem; border: 1.5px dashed #f59e0b; margin-top: 0.5rem; text-align: left; margin-bottom: 1.25rem;">
        <span style="font-size: 0.85rem; font-weight: 800; color: #fbbf24; display: block; margin-bottom: 0.25rem;">💡 スマホで表示されない原因：</span>
        <span style="font-size: 0.75rem; color: #e5e7eb; line-height: 1.55; display: block;">
          PCでローカル開発サーバー（localhost）を起動しているため、スマホがPCの場所を特定できません。<br>
          <strong style="color: #fbbf24; display: block; margin-top: 0.35rem; margin-bottom: 0.15rem;">【解決策】</strong>
          1. PCとスマホを<strong>「同じWi-Fi」</strong>に接続します。<br>
          2. PCのIPアドレス（例: 192.168.X.X）を調べ、ブラウザで <code>http://[PCのIPアドレス]:[ポート番号]</code> で開いた状態でQRコードを表示させてください。
        </span>
      </div>
    `;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'qrModalOverlay';
  overlay.innerHTML = `
    <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 10000;">
      <div class="modal-box" style="border: 2px solid #ef4444; max-width: 360px; text-align: center; background: #1c2230; padding: 1.5rem; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
        <div style="background: rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 0.75rem; border: 1px solid rgba(239, 68, 68, 0.3); margin-bottom: 1.25rem;">
          <span style="font-size: 1.25rem; display: block; margin-bottom: 0.35rem; font-weight: 800; color: #f87171;">⚠️【厳重注意】</span>
          <span style="font-size: 0.8rem; font-weight: 700; color: #fca5a5; line-height: 1.55; display: block;">
            このQRコードはあなた専用のFirebase同期URLです。<br>
            他人に読み取られないよう十分に注意してください！
          </span>
        </div>
        <div style="background: #fff; padding: 1rem; border-radius: 16px; display: inline-block; box-shadow: 0 4px 16px rgba(0,0,0,0.3); margin-bottom: 1.25rem;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}" alt="スマホ連動用QRコード" style="display: block; width: 200px; height: 200px; image-rendering: pixelated;"/>
        </div>
        ${localWarningHTML}
        <button class="btn-secondary" id="qrCloseBtn" style="width: 100%; border-radius: 12px; padding: 0.75rem; font-weight: 700;">閉じる</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#qrCloseBtn').onclick = close;
  overlay.onclick = e => { if (e.target === overlay || e.target.id === 'qrModalOverlay') close(); };
}

// ── SCREEN: ログイン画面（メール・パスワード認証） ──────────
function renderLogin(container) {
  container.innerHTML = `
    <div class="screen-login">
      <div class="login-glass-bg"></div>
      <div class="login-card">
        <div class="login-logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
        </div>
        <h1 class="login-title">PCスマホ連動メモ</h1>
        <p class="login-desc">Googleアカウントでログインすると<br>PC・スマホ間でメモが自動同期されます</p>
        <div class="login-error" id="loginError" style="display:none;"></div>
        <button class="login-btn btn-google" id="btnGoogleLogin">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Googleでログイン
        </button>
        <button class="login-btn btn-guest" id="btnGuestLogin">ゲストとして試す</button>
      </div>
    </div>
  `;

  const errorDiv = document.getElementById('loginError');

  function showLoginError(msg) {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
  }

  // Googleログインボタン
  document.getElementById('btnGoogleLogin').onclick = async () => {
    errorDiv.style.display = 'none';
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebase.auth().signInWithPopup(provider);
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
          await firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
        } catch (redirErr) {
          showLoginError('ログイン画面の起動に失敗しました。もう一度お試しください。');
        }
      } else if (err.code !== 'auth/popup-closed-by-user') {
        showLoginError('ログインに失敗しました。もう一度お試しください。');
      }
    }
  };

  // ゲストログインボタン（匿名認証）
  document.getElementById('btnGuestLogin').onclick = async () => {
    errorDiv.style.display = 'none';
    const btn = document.getElementById('btnGuestLogin');
    if (btn) { btn.disabled = true; btn.textContent = '接続中…'; }
    try {
      await firebase.auth().signInAnonymously();
      // onAuthStateChanged が発火してホームに遷移する
    } catch (err) {
      console.error('Anonymous Sign-In Error:', err);
      if (btn) { btn.disabled = false; btn.textContent = 'ゲストとして試す'; }
      showLoginError('ゲストログインに失敗しました。もう一度お試しください。');
    }
  };
}

// 上限到達ダイアログ（無料プランの各制限に到達した時）
function showGuestSignoutModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay" id="guestSignoutModal" style="display:flex;align-items:center;justify-content:center;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);">
      <div style="background:#1a1d24;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:2rem 1.5rem;max-width:320px;width:90%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
        <div style="font-size:2.5rem;margin-bottom:0.75rem;">⚠️</div>
        <p style="color:rgba(255,255,255,0.85);font-size:0.95rem;font-weight:700;margin-bottom:0.5rem;">サインアウトするとゲストデータが失われます</p>
        <p style="color:rgba(255,255,255,0.55);font-size:0.85rem;line-height:1.6;margin-bottom:1.5rem;">課金してデータを引き継ぎますか？</p>
        <button id="btnGuestSignoutUpgrade" style="width:100%;padding:0.85rem;border:none;border-radius:14px;background:linear-gradient(135deg,#f97316,#ec4899);color:#fff;font-size:0.95rem;font-weight:800;cursor:pointer;margin-bottom:0.5rem;font-family:var(--font);">課金する</button>
        <button id="btnGuestSignoutLogoff" style="width:100%;padding:0.7rem;border:none;border-radius:14px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);font-size:0.85rem;cursor:pointer;margin-bottom:0.4rem;font-family:var(--font);">課金しないでログオフする</button>
        <button id="btnGuestSignoutCancel" style="width:100%;padding:0.6rem;border:none;background:none;color:rgba(255,255,255,0.35);font-size:0.8rem;cursor:pointer;font-family:var(--font);">キャンセル</button>
      </div>
    </div>
  `;
  const close = () => { root.innerHTML = ''; };
  document.getElementById('btnGuestSignoutCancel').onclick = close;
  document.getElementById('guestSignoutModal').onclick = (e) => { if (e.target.id === 'guestSignoutModal') close(); };
  document.getElementById('btnGuestSignoutLogoff').onclick = async () => {
    close();
    await firebase.auth().signOut().catch(err => console.error('SignOut error:', err));
  };
  document.getElementById('btnGuestSignoutUpgrade').onclick = () => {
    close();
    showLimitModal('データをGoogleアカウントに引き継いで\n課金プランにアップグレードできます。');
  };
}

function showLimitModal(message) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay" id="limitModal" style="display:flex;align-items:center;justify-content:center;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);">
      <div style="background:#1a1d24;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:2rem 1.5rem;max-width:320px;width:90%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
        <div style="font-size:2.5rem;margin-bottom:0.75rem;">🔒</div>
        <p style="color:rgba(255,255,255,0.75);font-size:0.92rem;line-height:1.6;margin-bottom:1.5rem;white-space:pre-line;">${message}</p>
        <button id="btnUpgrade" style="width:100%;padding:0.85rem;border:none;border-radius:14px;background:linear-gradient(135deg,#f97316,#ec4899);color:#fff;font-size:0.95rem;font-weight:800;cursor:pointer;margin-bottom:0.5rem;font-family:var(--font);">アップグレードする</button>
        <button id="btnLimitClose" style="width:100%;padding:0.7rem;border:none;border-radius:14px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);font-size:0.85rem;cursor:pointer;font-family:var(--font);">閉じる</button>
      </div>
    </div>
  `;
  document.getElementById('btnLimitClose').onclick = () => { root.innerHTML = ''; };
  document.getElementById('limitModal').onclick = (e) => { if (e.target.id === 'limitModal') root.innerHTML = ''; };
  document.getElementById('btnUpgrade').onclick = async () => {
    root.innerHTML = '';
    const currentUser = firebase.auth().currentUser;
    const isGuest = currentUser && currentUser.isAnonymous;
    if (isGuest) {
      // ゲストユーザー: Googleアカウントにデータを引き継ぎながら連携
      if (confirm('ゲストのデータをGoogleアカウントに引き継ぎます。\nこれまでのメモはそのまま使えます。')) {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
          await currentUser.linkWithPopup(provider);
          // 連携成功 — onAuthStateChanged が再発火してホームが再描画される
        } catch (err) {
          if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
            await currentUser.linkWithRedirect(provider).catch(() => {});
          } else if (err.code === 'auth/credential-already-in-use' && err.credential) {
            // このGoogleアカウントはすでに別ユーザーとして登録済み
            // → データ引き継ぎはできずそのアカウントに切り替わる
            const ok = confirm('このGoogleアカウントはすでに登録済みです。\nゲストのデータは引き継がれません。\nそのままログインしますか？');
            if (ok) {
              await firebase.auth().signInWithCredential(err.credential).catch(() => {});
            }
          }
        }
      }
    } else {
      // 非ゲストユーザー: Stripe 課金ページへ
      const paymentUrl = 'https://buy.stripe.com/YOUR_PAYMENT_LINK_ID';
      window.open(paymentUrl, '_blank');
    }
  };
}

// ── テンプレートコンテンツ定数（createSampleData のフォールバック用。saveCurrentDataAsTemplate はFirebaseから読む）──
const TEMPLATE_EXPLANATION_CARDS = [];

// ── 新規ユーザー向けサンプルデータ作成（テンプレートが存在しない場合のフォールバック）──
async function createSampleData(uid) {
  const now = Date.now();

  // カテゴリ1: 解説（インディゴ）— 10枚のカード
  const cat1Ref = db.ref(`users/${uid}/categories`).push();
  await cat1Ref.set({
    name: '解説',
    color: 'linear-gradient(135deg,#4f46e5,#6366f1)',
    order: 1,
    createdAt: now,
  });

  // カード1が最上部になるよう order を降順に設定（デフォルトソートが b.order - a.order）
  await Promise.all(TEMPLATE_EXPLANATION_CARDS.map((content, i) => {
    const ref = db.ref(`users/${uid}/articles/${cat1Ref.key}`).push();
    return ref.set({
      content,
      createdAt: now,
      updatedAt: now,
      order: now + (TEMPLATE_EXPLANATION_CARDS.length - i),
    });
  }));

  // カテゴリ2: メモ（エメラルド）
  const cat2Ref = db.ref(`users/${uid}/categories`).push();
  const art2Ref = db.ref(`users/${uid}/articles/${cat2Ref.key}`).push();
  await Promise.all([
    cat2Ref.set({
      name: 'メモ',
      color: 'linear-gradient(135deg,#059669,#10b981)',
      order: 2,
      createdAt: now,
    }),
    art2Ref.set({
      content: '<p>最初のメモ</p><p>ここにメモを書いてください</p>',
      createdAt: now,
      updatedAt: now,
      order: now,
    }),
  ]);
}

// ── テンプレートからユーザーデータをコピー ───────────────────
async function copyTemplateToUser(uid) {
  const templateSnap = await db.ref('templates/default').once('value');
  if (!templateSnap.exists()) {
    // テンプレートがなければ静的サンプルデータにフォールバック
    await createSampleData(uid);
    return;
  }

  const tmpl = templateSnap.val();
  const cats = tmpl.categories || {};
  const arts = tmpl.articles || {};
  const now = Date.now();

  // カテゴリをコピーしながら旧キー→新キーのマッピングを作成
  const keyMap = {};
  for (const [oldKey, cat] of Object.entries(cats)) {
    const newRef = db.ref(`users/${uid}/categories`).push();
    keyMap[oldKey] = newRef.key;
    await newRef.set({ ...cat, createdAt: now });
  }

  // 記事をコピー（新カテゴリキーに紐づけ）
  const artWrites = [];
  for (const [oldCatKey, articles] of Object.entries(arts)) {
    const newCatKey = keyMap[oldCatKey];
    if (!newCatKey) continue;
    for (const art of Object.values(articles)) {
      const newRef = db.ref(`users/${uid}/articles/${newCatKey}`).push();
      artWrites.push(newRef.set({ ...art, createdAt: now, updatedAt: now }));
    }
  }
  await Promise.all(artWrites);
}

// ── 開発者：現在のパネルをテンプレートとして保存 ─────────────
async function saveCurrentDataAsTemplate() {
  const uid = state.uid;

  const [catSnap, artSnap] = await Promise.all([
    db.ref(`users/${uid}/categories`).once('value'),
    db.ref(`users/${uid}/articles`).once('value'),
  ]);

  const catData = catSnap.val();
  const artData = artSnap.val();

  if (!catData) {
    alert('カテゴリが見つかりません。');
    return;
  }

  // order 昇順でパネルを並べる
  const sortedCats = Object.entries(catData).sort(([, a], [, b]) => a.order - b.order);

  // チェックボックス選択モーダルを表示し、選択されたキー配列を返す Promise
  const selectedKeys = await new Promise(resolve => {
    const root = document.getElementById('modal-root');
    const rows = sortedCats.map(([key, cat]) => {
      const artCount = artData?.[key] ? Object.keys(artData[key]).length : 0;
      return `
        <label style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.75rem;border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.04);margin-bottom:0.4rem;">
          <input type="checkbox" data-key="${key}" style="width:18px;height:18px;accent-color:#6366f1;cursor:pointer;flex-shrink:0;">
          <span style="flex:1;color:#fff;font-size:0.9rem;font-weight:600;">${cat.name}</span>
          <span style="color:rgba(255,255,255,0.4);font-size:0.8rem;">${artCount}枚</span>
        </label>`;
    }).join('');

    root.innerHTML = `
      <div class="modal-overlay" id="templateSelectModal" style="display:flex;align-items:center;justify-content:center;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);">
        <div style="background:#1a1d24;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:1.75rem 1.5rem;max-width:320px;width:90%;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
          <p style="color:#fff;font-size:0.95rem;font-weight:700;margin-bottom:1rem;text-align:center;">テンプレートに含めるパネルを選択</p>
          <div style="max-height:60vh;overflow-y:auto;margin-bottom:1.25rem;padding-right:2px;">${rows}</div>
          <button id="btnTemplateSave" style="width:100%;padding:0.85rem;border:none;border-radius:14px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;font-size:0.95rem;font-weight:800;cursor:pointer;margin-bottom:0.5rem;font-family:var(--font);">保存する</button>
          <button id="btnTemplateCancel" style="width:100%;padding:0.7rem;border:none;border-radius:14px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);font-size:0.85rem;cursor:pointer;font-family:var(--font);">キャンセル</button>
        </div>
      </div>`;

    const close = (result) => { root.innerHTML = ''; resolve(result); };

    document.getElementById('btnTemplateCancel').onclick = () => close(null);
    document.getElementById('templateSelectModal').onclick = (e) => {
      if (e.target.id === 'templateSelectModal') close(null);
    };
    document.getElementById('btnTemplateSave').onclick = () => {
      const checked = [...root.querySelectorAll('input[data-key]:checked')].map(el => el.dataset.key);
      close(checked);
    };
  });

  if (!selectedKeys || selectedKeys.length === 0) return;

  const now = Date.now();
  const categories = {};
  const articles = {};

  for (const oldCatKey of selectedKeys) {
    const cat = catData[oldCatKey];
    const newCatKey = db.ref().push().key;
    categories[newCatKey] = {
      name: cat.name,
      color: cat.color,
      order: cat.order,
      createdAt: now,
    };

    const catArts = artData?.[oldCatKey];
    if (catArts) {
      articles[newCatKey] = {};
      const sorted = Object.values(catArts).sort((a, b) => b.order - a.order);
      sorted.forEach((art, i) => {
        const newArtKey = db.ref().push().key;
        articles[newCatKey][newArtKey] = {
          content: art.content,
          createdAt: now,
          updatedAt: now,
          order: now + (sorted.length - i),
        };
      });
    }
  }

  await db.ref('templates/default').set({ categories, articles });
  showToast(`テンプレートを更新しました（${selectedKeys.length}パネル）`);
}

// ── 起動と認証の監視 ────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  applyTheme(getCurrentTheme());
  // 🔍 画像タップでの拡大表示（ライトボックス）機能は一旦保留中。
  // 閲覧モードでの画像タップは何も起きない（無反応）でよい。
  // カーソルが入り込まないようにする修正（editorProps.handleDOMEvents の mousedown/touchstart）は維持。

  const app = document.getElementById('app');
  app.innerHTML = '<div class="auth-init-loading"><div class="loading-spinner">読み込み中…</div></div>';
  app.classList.add('visible');

  // getRedirectResult() を onAuthStateChanged の外で呼ぶと
  // Firebase のセッション復元前に null が先発火してログイン画面が瞬間表示される。
  // null ハンドラ内で初めて呼ぶことで、正常な初期化フローを妨げない。
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      // ログイン済み — 購入状態を読み取り
      state.uid = user.uid;
      state.isAnonymous = user.isAnonymous;
      try {
        const premSnap = await db.ref(`users/${user.uid}/isPremium`).once('value');
        state.isPremium = premSnap.val() === true;
      } catch (e) {
        state.isPremium = false;
      }
      // 新規ユーザー: カテゴリが1件もなければテンプレートをコピー（開発者は除外）
      try {
        const catSnap = await db.ref(`users/${user.uid}/categories`).once('value');
        if (!catSnap.exists() && user.email !== 'kimijimasan@gmail.com') {
          await copyTemplateToUser(user.uid);
        }
      } catch (e) { /* 非致命的 */ }
      goTo('home');
    } else {
      // null の場合: signInWithRedirect 後は処理完了前に null で先発火するため
      // getRedirectResult() で結果を確認してから判断する
      await firebase.auth().getRedirectResult().catch(() => null);
      if (!firebase.auth().currentUser) {
        state.uid = null;
        state.isPremium = false;
        state.isAnonymous = false;
        goTo('login');
      }
      // currentUser が非 null なら redirect 成功 → user あり で再発火するので何もしない
    }
  });
});

// ── 添付ファイル（写真・書類）関連の補助関数 ────────────────

// 写真の自動縮小・圧縮・挿入
async function handleAttachedImage(file, editor) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(evt) {
      const base64Src = evt.target.result;
      const tempImg = new Image();
      tempImg.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_SIZE = 800;
        let width = tempImg.width;
        let height = tempImg.height;
        
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(tempImg, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        
        const img = document.createElement('img');
        img.src = compressedBase64;
        img.className = 'inserted-img inserted-img-highlight';
        img.contentEditable = 'false';
        
        const pImg = document.createElement('p');
        pImg.appendChild(img);
        
        insertNodeAtCursor(pImg, editor);
        // 3秒後に黄色枚を除去
        setTimeout(() => { img.classList.remove('inserted-img-highlight'); }, 3000);
        resolve();
      };
      tempImg.src = base64Src;
    };
    reader.readAsDataURL(file);
  });
}

// ドキュメント（PDF等）の添付カード挿入
async function handleAttachedDocument(file, editor) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(evt) {
      const base64Data = evt.target.result;
      
      const docCard = document.createElement('div');
      docCard.className = 'attached-file-card';
      docCard.contentEditable = 'false';
      
      const sizeKB = (file.size / 1024).toFixed(1);
      
      docCard.innerHTML = `
        <div class="file-card-inner" onclick="downloadBase64File('${base64Data}', '${file.name}')">
          <div class="file-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </div>
          <div class="file-card-info">
            <div class="file-card-name">${esc(file.name)}</div>
            <div class="file-card-size">${sizeKB} KB (タップで保存)</div>
          </div>
        </div>
      `;
      
      const pDoc = document.createElement('p');
      pDoc.appendChild(docCard);
      
      insertNodeAtCursor(pDoc, editor);
      resolve();
    };
    reader.readAsDataURL(file);
  });
}

// 添付ファイルのダウンロード処理（グローバル関数化）
function downloadBase64File(base64Data, fileName) {
  const a = document.createElement('a');
  a.href = base64Data;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
window.downloadBase64File = downloadBase64File;

// カーソル（キャレット）位置にノードを綺麗に挿入する共通関数（余分な空段落バグを完全に修正！）
function insertNodeAtCursor(node, editor) {
  const sel = window.getSelection();
  let inserted = false;
  
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      
      // カーソル位置の親段落を特定
      let parentP = range.commonAncestorContainer;
      if (parentP.nodeType === Node.TEXT_NODE) {
        parentP = parentP.parentNode;
      }
      while (parentP && parentP.parentNode !== editor) {
        parentP = parentP.parentNode;
      }
      
      if (parentP && parentP.tagName === 'P') {
        // 親段落のテキストが完全に空（または <br> のみ）の場合
        if (parentP.textContent.trim() === '' && !parentP.querySelector('img')) {
          parentP.innerHTML = '';
          parentP.appendChild(node.firstChild); // 空段落に中身を直接入れ替える
          inserted = true;
          
          // その直後に空段落がなければ追加
          if (!parentP.nextSibling) {
            const nextP = document.createElement('p');
            nextP.appendChild(document.createElement('br'));
            parentP.parentNode.insertBefore(nextP, parentP.nextSibling);
          }
        } else {
          // コンテンツがある場合は、その親段落の直後に挿入
          parentP.parentNode.insertBefore(node, parentP.nextSibling);
          inserted = true;
          
          // 新しく空段落を1つ追加し、そこにカーソルを合わせる（すでに下に空行がある場合はそれを利用して2重改行を防ぐ）
          let nextP = node.nextSibling;
          if (!nextP || nextP.tagName !== 'P' || nextP.textContent.trim() !== '' || nextP.querySelector('img')) {
            nextP = document.createElement('p');
            nextP.appendChild(document.createElement('br'));
            node.parentNode.insertBefore(nextP, node.nextSibling);
          }
          
          const newRange = document.createRange();
          newRange.setStart(nextP, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
    }
  }
  
  if (!inserted) {
    editor.appendChild(node);
    const nextP = document.createElement('p');
    nextP.appendChild(document.createElement('br'));
    editor.appendChild(nextP);
  }
}



// クリップボードのペーストボタンの表示制御
function updatePasteButtonState() {
  const pasteBtn = document.getElementById('btnPaste');
  const cancelBtn = document.getElementById('btnPasteCancel');
  const attachBtn = document.getElementById('btnAttach');
  const delBtn = document.getElementById('btnDel');
  const hintBar = document.getElementById('pasteHintBar');
  if (!pasteBtn) return;
  if (window.globalCutParagraphs && window.globalCutParagraphs.length > 0) {
    pasteBtn.style.display = 'flex';
    pasteBtn.classList.add('pulse-delete-active');
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (attachBtn) attachBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (hintBar) hintBar.style.display = 'block';
  } else {
    pasteBtn.style.display = 'none';
    pasteBtn.classList.remove('pulse-delete-active');
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (attachBtn) attachBtn.style.display = '';
    if (delBtn) delBtn.style.display = '';
    if (hintBar) hintBar.style.display = 'none';
    removePasteMarker();
  }
}

// 🔍 貼られた画像をタップした際の拡大表示（ライトボックス）
function showLightbox(src) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-content">
      <img src="${src}" class="lightbox-img" />
    </div>
  `;
  document.body.appendChild(overlay);

  const img = overlay.querySelector('.lightbox-img');

  // iOS Safari: visualViewport.height でオーバーレイの高さを正確に設定
  // position:fixed + inset:0 は layoutViewport 基準になりアドレスバー分が切れるため
  const applyLightboxSize = () => {
    const vvh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    overlay.style.height = vvh + 'px';
    const content = overlay.querySelector('.lightbox-content');
    if (content) content.style.maxHeight = Math.floor(vvh * 0.92) + 'px';
  };
  applyLightboxSize();
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyLightboxSize);
  }

  const closeLightbox = () => {
    overlay.classList.add('fade-out');
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', applyLightboxSize);
    }
    setTimeout(() => overlay.remove(), 250);
  };

  // モーダル外（背景）タップで閉じる。画像自体のタップはピンチ/ダブルタップ操作のため無視
  overlay.onclick = (e) => {
    if (e.target === overlay) closeLightbox();
  };

  // ── ピンチズーム ────────────────────────────
  let scale = 1;
  let originX = 0, originY = 0; // 画像中心からの平行移動量(px)
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let panStartX = 0, panStartY = 0;
  let panStartOriginX = 0, panStartOriginY = 0;
  let isPanning = false;

  const applyTransform = () => {
    img.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
  };

  const resetZoom = () => {
    scale = 1;
    originX = 0;
    originY = 0;
    img.classList.remove('zooming');
    applyTransform();
  };

  const dist = (t0, t1) => Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);

  img.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchStartDist = dist(e.touches[0], e.touches[1]);
      pinchStartScale = scale;
      img.classList.add('zooming');
    } else if (e.touches.length === 1 && scale > 1) {
      isPanning = true;
      panStartX = e.touches[0].clientX;
      panStartY = e.touches[0].clientY;
      panStartOriginX = originX;
      panStartOriginY = originY;
      img.classList.add('zooming');
    }
  }, { passive: false });

  img.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinchStartDist > 0) {
      e.preventDefault();
      const newDist = dist(e.touches[0], e.touches[1]);
      scale = Math.min(4, Math.max(1, pinchStartScale * (newDist / pinchStartDist)));
      applyTransform();
    } else if (e.touches.length === 1 && isPanning) {
      e.preventDefault();
      originX = panStartOriginX + (e.touches[0].clientX - panStartX);
      originY = panStartOriginY + (e.touches[0].clientY - panStartY);
      applyTransform();
    }
  }, { passive: false });

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) pinchStartDist = 0;
    if (e.touches.length === 0) {
      isPanning = false;
      img.classList.remove('zooming');
      if (scale <= 1) resetZoom();
    }
  };
  img.addEventListener('touchend', onTouchEnd);
  img.addEventListener('touchcancel', onTouchEnd);

  // ダブルタップで元のサイズに戻す
  let lastTapTime = 0;
  img.addEventListener('touchend', (e) => {
    if (e.touches.length > 0) return;
    const now = Date.now();
    if (now - lastTapTime < 300) {
      resetZoom();
      lastTapTime = 0;
    } else {
      lastTapTime = now;
    }
  });

  // PC（マウス）でのダブルクリックでも同様に戻せるようにする
  img.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    resetZoom();
  });

  // 画像自体のクリックでオーバーレイが閉じないようにする
  img.addEventListener('click', (e) => e.stopPropagation());
}

// トーストメッセージをキュー管理で順次表示する関数
function showToast(msg) {
  toastQueue.push(msg);
  processToastQueue();
}

function processToastQueue() {
  if (isToastShowing || toastQueue.length === 0) return;
  
  isToastShowing = true;
  const msg = toastQueue.shift();
  
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = msg;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('visible');
  }, 50);
  
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.remove();
      isToastShowing = false;
      processToastQueue();
    }, 300);
  }, 2200);
}

// スマホ・PC共用 画像長押しドラッグ＆ドロップ移動の制御
function setupImageDragAndDrop(editor) {
  if (!editor) return;

  let dragTarget = null; // ドラッグ対象の画像 (IMG)
  let activeP = null;    // 画像が含まれている親段落 (P)
  let ghostEl = null;    // ポップアップ（クローンプレビュー）要素
  let insertLine = null; // 挿入箇所を示すライン
  let insertPosition = null; // { targetP: HTMLElement, location: 'before' | 'after' }
  let pressTimer = null;
  let isDraggingImg = false;
  let startX = 0, startY = 0;

  // 挿入ラインインジケーターの生成
  const showInsertLine = (targetP, location) => {
    if (!insertLine) {
      insertLine = document.createElement('div');
      insertLine.style.height = '4px';
      insertLine.style.background = '#f97316'; // 鮮やかなオレンジ
      insertLine.style.boxShadow = '0 0 8px #f97316';
      insertLine.style.borderRadius = '2px';
      insertLine.style.position = 'absolute';
      insertLine.style.left = '1.25rem';
      insertLine.style.right = '1.25rem';
      insertLine.style.zIndex = '1000';
      insertLine.style.pointerEvents = 'none';
      insertLine.style.transition = 'top-offset 0.1s ease';
    }

    const rect = targetP.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const scrollTop = editor.scrollTop;

    // editorの相対位置を計算
    let top = 0;
    if (location === 'before') {
      top = rect.top - editorRect.top + scrollTop - 2;
    } else {
      top = rect.bottom - editorRect.top + scrollTop - 2;
    }

    insertLine.style.top = `${top}px`;
    if (!insertLine.parentNode) {
      editor.appendChild(insertLine);
    }

    insertPosition = { targetP, location };
  };

  const removeInsertLine = () => {
    if (insertLine && insertLine.parentNode) {
      insertLine.remove();
    }
    insertPosition = null;
  };

  // タッチ・マウス操作 of 共有ハンドラ
  const onStart = (e, clientX, clientY, target) => {
    if (target.tagName !== 'IMG' || !target.classList.contains('inserted-img')) return;
    // 編集モード中は画像タッチをTipTapに委ねる（カーソル配置・選択を妨げない）
    if (!editor.classList.contains('mode-view')) return;

    // 長押し保存メニューや標準ドラッグをキャンセルして競合を防止
    // ※ stopPropagation は呼ばない — touchstart を bindParagraphSwipeEvents に伝えてスワイプ遷移を有効にする
    if (e.cancelable) {
      e.preventDefault();
    }

    dragTarget = target;
    activeP = target.closest('p');
    if (!activeP) return;

    startX = clientX;
    startY = clientY;

    if (pressTimer) clearTimeout(pressTimer);
    
    // 350msの長押しでポップアップ起動
    pressTimer = setTimeout(() => {
      isDraggingImg = true;
      
      // キーボードを閉じる
      if (document.activeElement === editor) {
        editor.blur();
      }

      // クローン（ポップアッププレビュー）の生成
      ghostEl = dragTarget.cloneNode(true);
      ghostEl.style.position = 'fixed';
      ghostEl.style.width = `${dragTarget.offsetWidth}px`;
      ghostEl.style.height = `${dragTarget.offsetHeight}px`;
      ghostEl.style.opacity = '0.85';
      ghostEl.style.zIndex = '99999';
      ghostEl.style.pointerEvents = 'none';
      ghostEl.style.transform = 'scale(1.05)'; // 少し浮かび上がる効果
      ghostEl.style.boxShadow = '0 15px 30px rgba(0,0,0,0.5)';
      ghostEl.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
      document.body.appendChild(ghostEl);

      // 元画像を半透明化
      dragTarget.style.opacity = '0.35';

      updateGhostPosition(clientX, clientY);
    }, 350);
  };

  const updateGhostPosition = (clientX, clientY) => {
    if (!ghostEl) return;
    ghostEl.style.left = `${clientX - ghostEl.offsetWidth / 2}px`;
    ghostEl.style.top = `${clientY - ghostEl.offsetHeight / 2}px`;
  };

  const onMove = (e, clientX, clientY) => {
    // 指やマウスが動いた場合、長押し前ならキャンセル
    if (!isDraggingImg) {
      if (Math.abs(clientX - startX) > 10 || Math.abs(clientY - startY) > 10) {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      }
      return;
    }

    e.preventDefault();
    updateGhostPosition(clientX, clientY);

    // 指の直下にある段落を検知
    const elements = document.elementsFromPoint(clientX, clientY);
    let targetP = null;
    for (let el of elements) {
      if (el.tagName === 'P' && editor.contains(el)) {
        targetP = el;
        break;
      }
    }

    if (targetP) {
      const rect = targetP.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      // 段落の真ん中より上なら前に、下なら後ろに挿入ラインを表示
      const location = relativeY < rect.height / 2 ? 'before' : 'after';
      showInsertLine(targetP, location);
    } else {
      removeInsertLine();
    }
  };

  const onEnd = (e) => {
    if (!isDraggingImg) {
      // タップか否かをスワイプ距離で判定（右スワイプで一覧に戻るジェスチャーと区別）
      let endX = startX, endY = startY;
      if (e && e.changedTouches && e.changedTouches.length > 0) {
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;
      } else if (e && typeof e.clientX === 'number') {
        endX = e.clientX;
        endY = e.clientY;
      }
      const movedX = Math.abs(endX - startX);
      const movedY = Math.abs(endY - startY);
      const isSwipe = movedX > 30 && movedX > movedY;

      // pressTimer が残っており、かつスワイプでない（小さな移動）場合のみタップとみなす
      if (pressTimer && dragTarget && !isSwipe) {
        showLightbox(dragTarget.src);
      }
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      dragTarget = null;
      activeP = null;
      return;
    }

    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }

    isDraggingImg = false;
    
    // 元画像の不透明度を復元
    if (dragTarget) {
      dragTarget.style.opacity = '';
    }

    // クローンとインジケーターの消去
    if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }

    if (insertPosition && dragTarget && activeP) {
      const { targetP, location } = insertPosition;
      
      // 画像段落ごと移動させる
      if (activeP !== targetP) {
        const parent = editor;
        if (location === 'before') {
          parent.insertBefore(activeP, targetP);
        } else {
          parent.insertBefore(activeP, targetP.nextSibling);
        }
        
        // TipTap内部状態を同期して保存
        if (tiptapEditor) {
          tiptapEditor.commands.setContent(getCleanPMHTML());
        }
        showToast("画像を移動しました");
      }
    }

    removeInsertLine();
    dragTarget = null;
    activeP = null;
  };

  // タッチイベントのバインド
  editor.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      onStart(e, e.touches[0].clientX, e.touches[0].clientY, e.target);
    }
  }, { passive: false });

  editor.addEventListener('touchmove', e => {
    if (isDraggingImg && e.touches.length === 1) {
      onMove(e, e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  editor.addEventListener('touchend', e => onEnd(e));
  editor.addEventListener('touchcancel', e => onEnd(e));

  // マウスイベントのバインド
  editor.addEventListener('mousedown', e => {
    if (e.button === 0) { // 左クリックのみ
      onStart(e, e.clientX, e.clientY, e.target);
    }
  });

  const mouseMoveHandler = e => {
    if (isDraggingImg) {
      onMove(e, e.clientX, e.clientY);
    }
  };

  const mouseUpHandler = () => {
    onEnd();
  };

  document.addEventListener('mousemove', mouseMoveHandler);
  document.addEventListener('mouseup', mouseUpHandler);

  // エディタアンロード時のイベント解放用（listenersへ登録）
  listeners.push(() => {
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
  });
}

// 画像削除ボタン（ゴミ箱アイコン）の表示・制御
// 編集モードでのみ表示する（閲覧モードでの画像タップは拡大モーダルを優先するため）
function setupImageDeleteButtons(editor) {
  if (!editor) return;
  let activeDeleteBtn = null;
  let activeImg = null;

  const removeDeleteBtn = () => {
    if (activeDeleteBtn) {
      activeDeleteBtn.remove();
      activeDeleteBtn = null;
      activeImg = null;
    }
  };
  // 画面遷移（閲覧モードへの切替）時に外部から削除ボタンを消せるように公開
  window._removeImageDeleteBtn = removeDeleteBtn;

  const showDeleteBtnFor = (img) => {
    if (activeImg === img) return;
    removeDeleteBtn();
    activeImg = img;

    const screenEditor = editor.closest('.screen-editor');
    if (!screenEditor) return;

    const btn = document.createElement('button');
    btn.className = 'img-delete-btn';
    btn.innerHTML = '✖';
    btn.title = '画像を削除';
    btn.contentEditable = 'false';
    btn.style.position = 'absolute';

    // screenEditor を基準とした相対座標を計算して配置を安定させる
    const rect = img.getBoundingClientRect();
    const parentRect = screenEditor.getBoundingClientRect();
    const top = rect.top - parentRect.top;
    const left = rect.left - parentRect.left;

    btn.style.top = `${top + 8}px`;
    btn.style.left = `${left + 8}px`;
    btn.style.zIndex = '150';

    // mousedownでフォーカスがエディタから移動するのを防ぎ、blurイベントによるボタン消滅を防ぐ
    btn.onmousedown = (event) => {
      event.preventDefault();
    };

    btn.onclick = (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (confirm('この画像を削除しますか？')) {
        lastDeletedContent = tiptapEditor ? tiptapEditor.getHTML() : '';
        img.remove();
        removeDeleteBtn();
        if (tiptapEditor) {
          tiptapEditor.commands.setContent(getCleanPMHTML());
        }
      }
    };

    screenEditor.appendChild(btn);
    activeDeleteBtn = btn;
  };

  // PC: 画像の上にホバーしたときに削除ボタンを表示（編集モードのみ）
  editor.addEventListener('mouseover', e => {
    const img = e.target;
    if (state.editorMode === 'edit' && img.tagName === 'IMG' && img.classList.contains('inserted-img')) {
      showDeleteBtnFor(img);
    } else if (!(activeDeleteBtn && (e.target === activeDeleteBtn || activeDeleteBtn.contains(e.target)))) {
      removeDeleteBtn();
    }
  });

  // スマホ: 編集モード中に画像をタップしたら削除ボタンを表示
  // （閲覧モードのタップは document.body の click リスナーが拡大モーダルを開く）
  editor.addEventListener('click', e => {
    if (_multiTouchActive) return; // ピンチ操作の延長で誤発火させない
    if (state.editorMode !== 'edit') return;
    const img = e.target;
    if (img.tagName === 'IMG' && img.classList.contains('inserted-img')) {
      e.stopPropagation();
      showDeleteBtnFor(img);
    } else if (!(activeDeleteBtn && (e.target === activeDeleteBtn || activeDeleteBtn.contains(e.target)))) {
      removeDeleteBtn();
    }
  });

  // エディタからマウスが外れたら削除ボタンを消す
  editor.addEventListener('mouseleave', e => {
    setTimeout(() => {
      if (activeDeleteBtn) {
        const isHoverBtn = activeDeleteBtn.matches(':hover');
        const isHoverImg = activeImg && activeImg.matches(':hover');
        if (!isHoverBtn && !isHoverImg) {
          removeDeleteBtn();
        }
      }
    }, 150);
  });

  // スクロールや入力、フォーカスが外れたら位置がズレるので消去
  editor.addEventListener('scroll', removeDeleteBtn, { passive: true });
  editor.addEventListener('input', removeDeleteBtn);
  editor.addEventListener('blur', () => setTimeout(removeDeleteBtn, 200));
}

