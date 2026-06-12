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
let state = { screen: 'home', categoryId: null, articleId: null, uid: null, editorMode: 'view' };
let activePasteMarkerP = null;
let activePasteLocation = null;
let isComposing = false;
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

// ── エディター内容の即時強制保存 ─────────────────
function forceSaveEditorContent() {
  if (state.screen !== 'editor' || !state.articleId || !state.categoryId || !state.uid) return;

  if (saveTimer) clearTimeout(saveTimer);

  let cleanHTML = '';
  if (tiptapEditor) {
    cleanHTML = restoreOriginalSrcs(tiptapEditor.getHTML(), origDataUrls);
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

  state = { screen, categoryId, articleId, uid: state.uid };

  const app = document.getElementById('app');
  app.classList.remove('visible');

  setTimeout(() => {
    app.innerHTML = '';
    if (screen === 'login')    renderLogin(app);
    else if (screen === 'home')     renderHome(app);
    else if (screen === 'category') renderCategory(app);
    else if (screen === 'editor')   renderEditor(app);
    app.classList.add('visible');
  }, 180);
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

  state = { screen: prev.screen, categoryId: prev.categoryId, articleId: prev.articleId, uid: state.uid };

  const app = document.getElementById('app');
  app.classList.remove('visible');
  setTimeout(() => {
    app.innerHTML = '';
    if (state.screen === 'home')     renderHome(app);
    if (state.screen === 'category') renderCategory(app);
    if (state.screen === 'editor')   renderEditor(app);
    app.classList.add('visible');
  }, 180);
}

// ── 右スワイプで戻る ─────────────────────
function addSwipeBack(el, onSwipe) {
  let sx = 0, sy = 0;
  let startTime = 0;
  const onStart = e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    startTime = Date.now();
  };
  const onEnd = e => {
    // 文字選択（範囲選択）中である場合は絶対に無効化する
    if (window.getSelection().toString() !== '') return;

    // タッチ時間（フリックの素早さ）を判定（300ms以上かかるゆっくりしたドラッグ選択などは除外）
    const duration = Date.now() - startTime;
    if (duration > 300) return;

    const dx = e.changedTouches[0].clientX - sx;
    const dy = Math.abs(e.changedTouches[0].clientY - sy);
    // 横方向の移動が50px以上かつ縦より横の方が大きい場合は戻る（斜め戻りの感度緩和）
    if (dx > 50 && dy < dx) onSwipe();
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

    // 横ブレを監視：横スワイプ等の動作（横移動が15pxを超え、かつ縦移動の60%以上）を検知したら即時キャンセル
    if (Math.abs(dx) > 15 && Math.abs(dx) > dy * 0.6) {
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
    
    // 最終判定：しっかり縦方向に引っ張られ、横ブレが半分以下の時だけ新規作成
    if (dy >= THRESHOLD && Math.abs(dx) < dy * 0.5) {
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
        <button class="btn-icon accent" id="btnAddCat" title="カテゴリを追加">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="btn-icon danger btn-signout" id="btnSignOut" title="サインアウト">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </header>
      
      <div id="migrationBannerContainer"></div>

      <div class="category-grid" id="catGrid">
        <div class="loading-spinner">読み込み中…</div>
      </div>
    </div>`;

  document.getElementById('btnAddCat').onclick = () => showCategoryModal();
  const showQrBtn = document.getElementById('btnShowQR');
  if (showQrBtn) showQrBtn.onclick = () => showQRCodeModal();

  const user = firebase.auth().currentUser;
  const isGuest = user && user.isAnonymous;
  const bannerContainer = document.getElementById('migrationBannerContainer');

  if (isGuest) {
    if (bannerContainer) {
      bannerContainer.innerHTML = `
        <div id="migrationBanner" style="position: relative; background: rgba(59, 130, 246, 0.1); border: 1.5px dashed #3b82f6; border-radius: 14px; padding: 0.85rem 1rem; margin: 0.75rem 0.75rem 0 0.75rem; display: flex; flex-direction: column; align-items: flex-start; gap: 0.6rem; text-align: left; animation: popIn 0.3s ease;">
          <span style="font-size: 0.82rem; color: #fff; font-weight: 500; line-height: 1.5;">💡 現在は無料ゲストとしてお試し利用中です。月額130円〜のプレミアム会員（Googleログイン）に登録すると、PCとスマホで自動同期され、万が一のデータ消失の心配もなくなります。</span>
          <button class="btn-primary" id="btnGoToLogin" style="font-size: 0.78rem; padding: 0.4rem 0.9rem; border-radius: 8px; font-weight: 700; align-self: flex-end; background: #3b82f6; border: 1px solid #2563eb;">Googleログイン / 登録</button>
        </div>
      `;
      
      const goLoginBtn = document.getElementById('btnGoToLogin');
      if (goLoginBtn) {
        goLoginBtn.onclick = () => {
          if (confirm("サインアウトしてログイン画面に戻りますか？")) {
            firebase.auth().signOut().then(() => {
              goTo('login');
            });
          }
        };
      }
    }
  }
  
  const signoutBtn = document.getElementById('btnSignOut');
  if (signoutBtn) {
    signoutBtn.onclick = async () => {
      if (confirm("サインアウトしますか？")) {
        try {
          await firebase.auth().signOut();
        } catch (err) {
          console.error("SignOut error:", err);
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
        <span class="cat-name">${esc(cat.name)}</span>`;

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
        onStart: (evt) => {
          grid.style.overflow = 'visible';
          if (evt.item) {
            evt.item.classList.add('category-drag-start-flash');
          }
        },
        onEnd: async evt => {
          grid.style.overflow = '';
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
      // 無料ユーザーのパネル上限チェック（3個まで）
      if (!catId && !state.isPremium) {
        const snapshot = await db.ref(`users/${state.uid}/categories`).once('value');
        const currentCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        if (currentCount >= 3) {
          close();
          showPurchasePrompt();
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
    </div>`;

  document.getElementById('btnHome').onclick   = () => goTo('home');
  document.getElementById('btnExportAll').onclick = () => showExportAllModal(state.categoryId);

  // ─── ソート状態 ───
  let sortField = null; // 'name' | 'date' | null
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
            <div class="article-title">${esc(title)}</div>
            <div class="article-preview">${esc(preview)}</div>
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
      <div class="move-modal-header">
        <span>移動先を選択</span>
        <button class="move-modal-close" id="moveCancelBtn">キャンセル</button>
      </div>
      <ul class="move-cat-list">
        ${others.map(c => `
          <li class="move-cat-item" data-cat-id="${c.id}"
            style="border-left:4px solid ${c.color || '#6366f1'}">
            ${esc(c.name || '（名前なし）')}
          </li>`).join('')}
      </ul>
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

    navigator.clipboard.writeText(textData)
      .then(() => alert('全メモをクリップボードに一括コピーしました！'))
      .catch(() => alert('コピーに失敗しました。'));
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
  else if (type === 'pdf' || type === 'html') {
    const articlesHTML = articles.map((art, idx) => {
      const lines = htmlToLines(art.content);
      const title = lines[0] || 'タイトルなし';
      const body = lines.slice(1);
      const bodyHTML = body.map(line => `<p>${esc(line)}</p>`).join('');

      let separatorHTML = '';
      if (idx > 0) {
        const pageNum = idx + 1;
        separatorHTML = `<div class="page-separator">---- ${pageNum}ページ目 ----</div>`;
      }

      return `
        ${separatorHTML}
        <div class="article-section">
          <h2 class="article-title">${esc(title)}</h2>
          <div class="article-body">
            ${bodyHTML}
          </div>
        </div>`;
    }).join('');

    const fullHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(catName)} - 一括エクスポート</title>
  <style>
    body {
      background-color: #0b0f19;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif;
      line-height: 1.7;
      padding: 2rem 1rem;
      max-width: 800px;
      margin: 0 auto;
    }
    .category-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #818cf8;
      border-bottom: 2px solid #312e81;
      padding-bottom: 0.5rem;
      margin-bottom: 2rem;
      text-align: center;
    }
    .article-section {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .article-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 1rem;
      border-bottom: 1px solid #374151;
      padding-bottom: 0.5rem;
    }
    .article-body {
      color: #d1d5db;
    }
    .article-body p {
      margin: 0.5rem 0;
      min-height: 1em;
    }
    .article-body img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 0.75rem 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    .page-separator {
      text-align: center;
      margin: 2.5rem 0;
      color: #6b7280;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="category-title">【${esc(catName)}】</div>
  ${articlesHTML}
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${catName}_一括エクスポート.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function createArticle(noTransition = false) {
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
    state = { screen: 'editor', categoryId: state.categoryId, articleId: newKey, uid: state.uid, pendingAutoEditMode: true, _isNewCard: true };
    
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
          <button class="btn-icon" id="btnBulkCopy" title="選択した段落をコピー" style="display: none; background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; width: 42px; height: 42px; margin-right: 0.35rem; border-radius: 12px; color: #3b82f6; transition: transform 0.2s; align-items: center; justify-content: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display: block;">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="btn-icon danger" id="btnBulkDelete" title="選択した段落をカット" style="display: none; background: rgba(239, 68, 68, 0.2); border: 1px solid var(--danger); width: 42px; height: 42px; margin-right: 0.35rem; border-radius: 12px; color: var(--danger); transition: transform 0.2s; align-items: center; justify-content: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display: block;">
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
              <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
              <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
            </svg>
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
      <div class="editor-undo-btn" id="btnUndo" style="display:none">
        <span class="undo-icon">↩</span>
        <span class="undo-label">取消</span>
      </div>
      <input type="file" id="fileInput" style="display: none;" multiple />
    </div>`;

  document.getElementById('btnBack').onclick   = () => goBack();

  // 閲覧／編集モード切り替えの制御
  function setEditorMode(mode) {
    state.editorMode = mode;
    const toggleBar = document.getElementById('btnModeToggle');
    if (!toggleBar) return;
    const proseMirrorEl = tiptapEditor ? tiptapEditor.view.dom : null;

    const undoBtn = document.getElementById('btnUndo');
    if (mode === 'edit') {
      toggleBar.className = 'mode-toggle-bar mode-edit';
      toggleBar.textContent = '編';
      if (undoBtn) undoBtn.style.display = 'flex';
      if (tiptapEditor) tiptapEditor.setEditable(true);
      if (proseMirrorEl) {
        proseMirrorEl.classList.remove('mode-view');
        cleanupAllSwipedParagraphs(proseMirrorEl);
      }
    } else {
      toggleBar.className = 'mode-toggle-bar mode-view';
      toggleBar.textContent = '閲';
      if (undoBtn) undoBtn.style.display = 'none';
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
      if (tiptapEditor) tiptapEditor.chain().focus().undo().run();
    };
  }

  // 閲覧モード中にエディタ本文をタップ → 編集モードに自動切替してカーソル点滅
  const editorEl = document.getElementById('edContent');
  if (editorEl) {
    editorEl.addEventListener('click', (e) => {
      if (state.editorMode !== 'view') return;
      // アイコンやボタンのタップは除外
      if (e.target.closest('button') || e.target.closest('.btn-icon')) return;
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

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.indexOf('image') !== -1) {
          await handleImageForTipTap(file);
        }
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

      const selectedParas = pm.querySelectorAll('p.para-selected, [data-youtube-video].para-selected');
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

      const selectedParas = pm.querySelectorAll('p.para-selected, [data-youtube-video].para-selected');
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
        showToast("段落をカットしました");
      }, 500);
    };
  }

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

    // 2. 縦方向の罫線・区切り記号（│, ┃, ├, ┤, ┼, ｜, |, │ 等）を適度な複数の半角スペースに置換
    const verticalBorderRegex = /[ \t　]*([│┃├┤┼｜\|┆┇┊┋┬┴])[ \t　]*/g;
    t = t.replace(verticalBorderRegex, '     '); // 5個の半角スペースに置き換えて美しく整形

    return t;
  }

  // ── TipTap エディター初期化 ──────────────────────────
  const edEl = document.getElementById('edContent');
  const status = document.getElementById('saveStatus');

  const { Editor: TiptapEditor, StarterKit, ImageExtension, YoutubeExtension, TaskList, TaskItem } = window.TipTapBundle;

  tiptapEditor = new TiptapEditor({
    element: edEl,
    extensions: [
      StarterKit,
      ImageExtension.configure({ allowBase64: true, inline: true, HTMLAttributes: { class: 'inserted-img' } }),
      YoutubeExtension.configure({ controls: true, nocookie: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    editable: false,
    content: '<p></p>',
    editorProps: {
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;

        // 画像貼り付けを横取りして圧縮・挿入
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = items[i].getAsFile();
            if (file) handleImageForTipTap(file);
            return true;
          }
        }

        // 罫線文字があるテキストのみ自前整形
        const text = event.clipboardData?.getData('text/plain') || '';
        const borderMatches = text.match(/[\|│┃┼├┤┌┐└┘｜┆┇┊┋┬┴]/g);
        const hasTableBorders = borderMatches && borderMatches.length >= 3 && text.includes('\n');
        if (hasTableBorders) {
          event.preventDefault();
          const cleaned = cleanAndFormatBorderLines(text);
          // 改行ごとに段落に分けて挿入
          const lines = cleaned.split('\n').filter(l => l.length > 0);
          const html = lines.map(l => `<p>${esc(l)}</p>`).join('');
          tiptapEditor.commands.insertContent(html);
          return true;
        }

        return false; // TipTapのデフォルト処理に委ねる
      },
      handleKeyDown(view, event) {
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

        // 直前段落が画像1つだけ → joinBackward をブロックしカーソルを移動
        if (
          prevNode.type.name === 'paragraph' &&
          prevNode.childCount === 1 &&
          prevNode.firstChild &&
          prevNode.firstChild.type.name === 'image'
        ) {
          // 画像段落の末尾（画像の直後）にカーソルを移動
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
      if (isComposing) return;
      if (status) { status.textContent = '編集中…'; status.className = 'save-status editing'; }
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          const content = restoreOriginalSrcs(editor.getHTML(), origDataUrls);
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

  // focusイベント: iOSキーボード表示完了を待って（500ms）カーソルを見える位置にスクロール
  tiptapEditor.on('focus', () => {
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

  // ── iOS キーボード対応: #edContent の高さを visualViewport に合わせて更新 ──
  // .screen-editor は 100dvh のまま変えず、edContent だけを縮めることで
  // キーボード下に黒い隙間が生じるのを防ぐ
  const updateEditorHeight = () => {
    const edContent = document.getElementById('edContent');
    const header = document.querySelector('.screen-editor .editor-header');
    if (!edContent || !header) return;
    const vvh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const headerH = header.getBoundingClientRect().height;
    edContent.style.height = Math.max(100, vvh - headerH) + 'px';
    edContent.style.flex = 'none';
  };
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateEditorHeight);
    window.visualViewport.addEventListener('scroll', updateEditorHeight);
  }
  updateEditorHeight(); // 初期値セット
  listeners.push(() => {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', updateEditorHeight);
      window.visualViewport.removeEventListener('scroll', updateEditorHeight);
    }
    const edContent = document.getElementById('edContent');
    if (edContent) { edContent.style.height = ''; edContent.style.flex = ''; }
  });

  // ── Firebase からコンテンツを読み込む ─────────────
  db.ref(`users/${state.uid}/articles/${state.categoryId}/${state.articleId}`).once('value', snap => {
    if (!tiptapEditor) return;

    let raw = snap.val()?.content || '';

    if (state._isNewCard) {
      state._isNewCard = false;
      tiptapEditor.commands.setContent('<p></p>', false);
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
      if (status) { status.textContent = '保存済み ✓'; status.className = 'save-status saved'; }
    }

    // 段落スワイプなどのネイティブアクションを初期化
    const proseMirrorEl = tiptapEditor.view.dom;
    initializeNativeParagraphActions(proseMirrorEl);
    // Firebase コンテンツロード後に YouTube削除ボタンを再inject（setEditorMode時点では要素がまだ無い）
    if (proseMirrorEl.classList.contains('mode-view')) {
      refreshYoutubeDeleteButtons('view');
    }
  });

}

// ── TipTap用画像圧縮・挿入ヘルパー ─────────────────
function handleImageForTipTap(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = evt => {
      const tempImg = new Image();
      tempImg.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_SIZE = 800;
        let w = tempImg.width, h = tempImg.height;
        if (w > MAX_SIZE || h > MAX_SIZE) {
          if (w > h) { h = Math.round(h * MAX_SIZE / w); w = MAX_SIZE; }
          else { w = Math.round(w * MAX_SIZE / h); h = MAX_SIZE; }
        }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(tempImg, 0, 0, w, h);
        const src = canvas.toDataURL('image/jpeg', 0.75);
        if (tiptapEditor) {
          tiptapEditor.chain().focus().setImage({ src, class: 'inserted-img' }).splitBlock().run();
        }
        resolve();
      };
      tempImg.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
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
  if (!editor) return;

  const selectedCount = editor.querySelectorAll('p.para-selected, [data-youtube-video].para-selected').length;
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
  }
}

// 単一の段落の選択状態を解除してプレーンに戻す
function cleanupSingleParagraph(p) {
  if (!p || !p.classList.contains('para-selected')) return;
  const chk = p.querySelector('.para-checkbox');
  if (chk) chk.remove();
  p.classList.remove('para-selected');
  p.removeAttribute('class');
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

  // img の contenteditable / class を除去
  let imgCount = 0;
  result = result.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
    imgCount++;
    attrs = attrs.replace(/\s+contenteditable="[^"]*"/gi, '');
    attrs = attrs.replace(/\s+class="[^"]*"/gi, '');
    return '<img' + attrs + '>';
  });
  if (imgCount) logs.push('[img] ' + imgCount + ' 件: contenteditable / class 除去');

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
  // 例: <p><img>テキスト</p> → <p><img></p><p>テキスト</p>
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
      let cur = null;
      childNodes.forEach(node => {
        if (node.nodeType === 1 && node.tagName === 'IMG') {
          if (cur) { newPs.push(cur); cur = null; }
          const imgP = document.createElement('p');
          imgP.appendChild(node.cloneNode(true));
          newPs.push(imgP);
        } else {
          if (!cur) cur = document.createElement('p');
          cur.appendChild(node.cloneNode(true));
        }
      });
      if (cur) newPs.push(cur);
      newPs.forEach(np => p.parentNode.insertBefore(np, p));
      p.parentNode.removeChild(p);
      splitCount++;
    });
    if (splitCount > 0) {
      result = splitDiv.innerHTML;
      logs.push('[split] img混在段落を ' + splitCount + ' 件分割');
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

// エディタ全体のクリーンなHTMLを抽出
function getCleanEditorHTML(editor) {
  if (tiptapEditor) return restoreOriginalSrcs(tiptapEditor.getHTML(), origDataUrls);
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

    // 文字選択（範囲選択）中はフリップ動作をキャンセル
    if (window.getSelection().toString() !== '') return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - txStart;
    const dy = Math.abs(touch.clientY - tyStart);

    if (Math.abs(dx) > 50 && dy < 40) {
      if (dx < 0) {
        // タップされた位置からエディタ直下のブロック要素を特定
        let target = e.target;
        while (target && target.parentNode !== editor) {
          target = target.parentNode;
        }
        if (!target || target === editor) return;

        if (target.hasAttribute('data-youtube-video')) {
          toggleYoutubeSelect(target, editor);
        } else if (target.tagName === 'P') {
          toggleParagraphSelect(target, editor);
        }
      } else {
        // 右フリップで前の画面に戻る
        goBack();
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
      draggable: 'p, [data-youtube-video]',
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
      draggable: 'p.para-selected',
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

  // ドラッグハンドルを全段落・YouTube要素に inject
  pm.querySelectorAll('p, [data-youtube-video]').forEach(el => {
    el.style.position = 'relative';
    const handle = document.createElement('span');
    handle.className = 'para-drag-handle';
    handle.contentEditable = 'false';
    handle.innerHTML = `<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="0" width="3" height="3" rx="0.5"/><rect x="7" y="0" width="3" height="3" rx="0.5"/><rect x="0" y="5.5" width="3" height="3" rx="0.5"/><rect x="7" y="5.5" width="3" height="3" rx="0.5"/><rect x="0" y="11" width="3" height="3" rx="0.5"/><rect x="7" y="11" width="3" height="3" rx="0.5"/></svg>`;
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
        <p class="login-desc">
          このアプリを使用するにはログインが必要です
        </p>
        <div class="login-error" id="loginError" style="display:none;"></div>
        <input type="email" class="login-input" id="loginEmail" placeholder="メールアドレス" autocomplete="email" />
        <input type="password" class="login-input" id="loginPassword" placeholder="パスワード" autocomplete="current-password" />
        <button class="login-btn btn-login-primary" id="btnLogin">ログイン</button>
        <button class="login-btn btn-login-secondary" id="btnRegister">新規登録</button>
        <div class="login-divider"><span>または</span></div>
        <button class="login-btn btn-google" id="btnGoogleLogin">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="display: block;">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Google でログイン
        </button>
      </div>
    </div>
  `;

  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  const errorDiv = document.getElementById('loginError');

  function showLoginError(msg) {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
  }

  function getFirebaseAuthErrorMessage(code) {
    const messages = {
      'auth/invalid-email': 'メールアドレスの形式が正しくありません。',
      'auth/user-disabled': 'このアカウントは無効化されています。',
      'auth/user-not-found': 'アカウントが見つかりません。新規登録してください。',
      'auth/wrong-password': 'パスワードが間違っています。',
      'auth/invalid-credential': 'メールアドレスまたはパスワードが間違っています。',
      'auth/email-already-in-use': 'このメールアドレスは既に登録されています。',
      'auth/weak-password': 'パスワードは6文字以上にしてください。',
      'auth/too-many-requests': 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください。',
      'auth/network-request-failed': 'ネットワークエラーです。接続を確認してください。',
      'auth/operation-not-allowed': '\n\n💡 Firebaseコンソールで該当の認証方式が有効になっていません。\n\n【解決方法】\nFirebaseコンソール ➤ Authentication ➤ Sign-in method で有効にしてください。',
    };
    return messages[code] || 'エラーが発生しました。もう一度お試しください。';
  }

  // ログインボタン
  document.getElementById('btnLogin').onclick = async () => {
    errorDiv.style.display = 'none';
    const email = emailInput.value.trim();
    const pass = passInput.value;
    if (!email || !pass) {
      showLoginError('メールアドレスとパスワードを入力してください。');
      return;
    }
    try {
      await firebase.auth().signInWithEmailAndPassword(email, pass);
    } catch (err) {
      console.error('Login Error:', err);
      showLoginError(getFirebaseAuthErrorMessage(err.code));
    }
  };

  // 新規登録ボタン
  document.getElementById('btnRegister').onclick = async () => {
    errorDiv.style.display = 'none';
    const email = emailInput.value.trim();
    const pass = passInput.value;
    if (!email || !pass) {
      showLoginError('メールアドレスとパスワードを入力してください。');
      return;
    }
    if (pass.length < 6) {
      showLoginError('パスワードは6文字以上にしてください。');
      return;
    }
    try {
      await firebase.auth().createUserWithEmailAndPassword(email, pass);
    } catch (err) {
      console.error('Register Error:', err);
      showLoginError(getFirebaseAuthErrorMessage(err.code));
    }
  };

  // Googleログインボタン
  document.getElementById('btnGoogleLogin').onclick = async () => {
    errorDiv.style.display = 'none';
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebase.auth().signInWithPopup(provider);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
          await firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
        } catch (redirErr) {
          showLoginError("ログイン画面の起動に失敗しました: " + redirErr.message);
        }
      } else {
        showLoginError(getFirebaseAuthErrorMessage(err.code));
      }
    }
  };

  // Enterキーでログイン
  passInput.onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('btnLogin').click();
  };
}

// 購入促進ダイアログ（無料ユーザーがパネル4個目を作ろうとした時）
function showPurchasePrompt() {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay" id="purchaseModal" style="display:flex;align-items:center;justify-content:center;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);">
      <div style="background:#1a1d24;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:2rem 1.5rem;max-width:320px;width:90%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
        <div style="font-size:2.5rem;margin-bottom:0.75rem;">🔒</div>
        <h2 style="color:#fff;font-size:1.1rem;margin-bottom:0.5rem;font-weight:800;">全機能を使うには¥100が必要です</h2>
        <p style="color:rgba(255,255,255,0.6);font-size:0.82rem;line-height:1.5;margin-bottom:1.5rem;">無料プランではパネルを3個まで作成できます。<br>購入するとパネル無制限で全機能が使えます。</p>
        <button id="btnPurchase" style="width:100%;padding:0.85rem;border:none;border-radius:14px;background:linear-gradient(135deg,#f97316,#ec4899);color:#fff;font-size:0.95rem;font-weight:800;cursor:pointer;margin-bottom:0.5rem;font-family:var(--font);transition:transform 0.15s;">¥100で購入する</button>
        <button id="btnPurchaseClose" style="width:100%;padding:0.7rem;border:none;border-radius:14px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.7);font-size:0.85rem;cursor:pointer;font-family:var(--font);">閉じる</button>
      </div>
    </div>
  `;
  document.getElementById('btnPurchaseClose').onclick = () => { root.innerHTML = ''; };
  document.getElementById('purchaseModal').onclick = (e) => { if (e.target.id === 'purchaseModal') root.innerHTML = ''; };
  document.getElementById('btnPurchase').onclick = () => {
    // Stripe Payment Link へ遷移（後で実際のURLに差し替え）
    const paymentUrl = 'https://buy.stripe.com/YOUR_PAYMENT_LINK_ID';
    window.open(paymentUrl, '_blank');
    root.innerHTML = '';
    showToast('決済ページを開きました。購入完了後、アプリを再読み込みしてください。');
  };
}

// ── 起動と認証の監視 ────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // 🔍 貼られた画像をタップした際の拡大表示（ライトボックス）イベント
  // 編集モード中はライトボックスを開かない
  document.body.addEventListener('click', e => {
    if (e.target.tagName === 'IMG' && e.target.classList.contains('inserted-img')) {
      const pm = e.target.closest('.ProseMirror');
      if (pm && !pm.classList.contains('mode-view')) return;
      showLightbox(e.target.src);
    }
  });

  const app = document.getElementById('app');
  app.innerHTML = '<div class="screen-login"><div class="loading-spinner">認証状態を確認中…</div></div>';
  app.classList.add('visible');

  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      // ログイン済み — 購入状態を読み取り
      state.uid = user.uid;
      try {
        const premSnap = await db.ref(`users/${user.uid}/isPremium`).once('value');
        state.isPremium = premSnap.val() === true;
      } catch (e) {
        state.isPremium = false;
      }
      goTo('home');
    } else {
      // 未ログイン
      state.uid = null;
      state.isPremium = false;
      goTo('login');
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
  if (!pasteBtn) return;
  if (window.globalCutParagraphs && window.globalCutParagraphs.length > 0) {
    pasteBtn.style.display = 'flex';
    pasteBtn.classList.add('pulse-delete-active');
    if (cancelBtn) cancelBtn.style.display = 'flex';
  } else {
    pasteBtn.style.display = 'none';
    pasteBtn.classList.remove('pulse-delete-active');
    if (cancelBtn) cancelBtn.style.display = 'none';
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
  
  overlay.onclick = () => {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 250);
  };
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

// PC用の画像削除ボタン（ゴミ箱アイコン）の表示・制御
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

  // 画像の上にホバーしたときに削除ボタンを表示
  editor.addEventListener('mouseover', e => {
    const img = e.target;
    if (img.tagName === 'IMG' && img.classList.contains('inserted-img')) {
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
          img.remove();
          removeDeleteBtn();
          if (tiptapEditor) {
            tiptapEditor.commands.setContent(getCleanPMHTML());
          }
        }
      };

      screenEditor.appendChild(btn);
      activeDeleteBtn = btn;
    } else {
      // ホバー対象が画像以外で、ボタン自体でもない場合
      if (activeDeleteBtn && (e.target === activeDeleteBtn || activeDeleteBtn.contains(e.target))) {
        return;
      }
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

