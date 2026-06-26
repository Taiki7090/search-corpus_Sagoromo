// 簡易 IIIF ビューア
// 丁数・行数セルの IIIF アイコンをクリックすると、サブウィンドウ(フローティングパネル)が開き、
// 参照している行(zone)の画像を表示し、その座標範囲を四角で囲って示す。
//
// 依存: js/data/sagoromo-line-map.js の lookupLine()
//   lookupLine() は {pb, lb, facs, ulx, uly, lrx, lry, image, graphic, canvas, imgW, imgH} を返す。
//   image は IIIF Image API の識別子。`{image}/full/{w},/0/{quality}.{format}` で
//   幅 w(px) に縮小した画像が得られる (IIIF Image API 2.0 / level1)。
//   quality.format は資料により異なる (国立公文書館=native.jpg / NDL=default.jpg)。

import { lookupLine } from "../data/sagoromo-line-map.js";
import { escapeHtml } from "../utils/text-utils.js";

const BASE_IMG_WIDTH = 1600; // 取得する画像の基準幅(px)。ズーム時の解像度に影響。
const MIN_ZOOM = 1; // zoom=1 でステージ横幅にフィット
const MAX_ZOOM = 6;
const DEFAULT_ZOOM = 1.5;
const WHEEL_STEP = 1.15; // ホイール1ノッチあたりの倍率

let stylesInjected = false;
let panelEl = null;
let onResize = null;
let onFsChange = null;

const IIIF_ICON_SRC = "resources/images/iiif-logo.png";

/**
 * 丁数・行数セルに添える IIIF アイコン(公式ロゴ画像)の HTML を返す。
 * 座標情報が無い(対象資料以外)場合は空文字。クリックでビューアを開く。
 */
export function iiifIconHtml(fileName, startPos) {
  const line = lookupLine(fileName, startPos);
  if (!line || line.ulx == null) return "";
  const label = `${line.pb}-${line.lb}`;
  return (
    `<img class="iiif-icon" src="${IIIF_ICON_SRC}" alt="IIIF"` +
    ` data-file="${escapeHtml(String(fileName))}" data-pos="${startPos}"` +
    ` title="IIIF画像ビューアを開く (${escapeHtml(label)})" />`
  );
}

/**
 * 丁数・行数セルの中身 HTML を返す。
 * 丁数・行数のテキストを左、IIIF アイコンを右に寄せて 1 行に収める。
 */
export function pageLineCellHtml(pageLineText, fileName, startPos) {
  const text = pageLineText || "";
  if (!text) return "";
  return (
    `<span class="page-line-cell">` +
    `<span class="page-line-text">${escapeHtml(text)}</span>` +
    iiifIconHtml(fileName, startPos) +
    `</span>`
  );
}

function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const css = `
.iiif-icon{height:18px;width:auto;margin-left:5px;vertical-align:middle;
  cursor:pointer;display:inline-block;flex:0 0 auto;}
.iiif-icon:hover{opacity:.7;}

.page-line-cell{display:flex;align-items:center;justify-content:space-between;
  gap:4px;white-space:nowrap;}
.page-line-text{overflow:hidden;text-overflow:ellipsis;}

.iiif-viewer{position:fixed;z-index:11000;width:520px;max-width:94vw;
  background:var(--surface-color,#fff);border:1px solid var(--border-color,#ddd);
  border-radius:8px;box-shadow:0 10px 36px rgba(75,68,132,.32);
  display:flex;flex-direction:column;font-family:inherit;
  color:var(--text-color,#333);overflow:hidden;}
.iiif-viewer__header{display:flex;align-items:center;gap:8px;
  padding:8px 10px;background:var(--primary-color,#7c75b8);color:#fff;
  cursor:move;user-select:none;}
.iiif-viewer__title{font-size:13px;font-weight:600;flex:1;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;}
.iiif-viewer__btn{display:inline-flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,.18);color:#fff;border:none;
  width:26px;height:24px;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;}
.iiif-viewer__btn:hover{background:rgba(255,255,255,.36);}
.iiif-viewer__close{font-size:18px;}
.iiif-viewer__stage{position:relative;width:100%;height:560px;max-height:70vh;
  overflow:auto;background:#2e2b3d;cursor:grab;
  scrollbar-width:none;-ms-overflow-style:none;}
.iiif-viewer__stage::-webkit-scrollbar{display:none;width:0;height:0;}
.iiif-viewer__stage.is-panning{cursor:grabbing;}
.iiif-viewer__wrap{position:relative;width:100%;transform-origin:top left;}
.iiif-viewer__img{display:block;width:100%;height:auto;}
.iiif-viewer__rect{position:absolute;border:3px solid var(--primary-color,#7c75b8);
  background:transparent;pointer-events:auto;box-sizing:border-box;cursor:inherit;
  transition:border-color .12s ease;}
.iiif-viewer__rect:hover{border-color:#ffe600;}
.iiif-viewer__footer{display:flex;align-items:center;gap:10px;
  padding:6px 10px;font-size:11px;color:var(--text-color-light,#666);
  background:var(--primary-color-light,#f1f1f8);
  border-top:1px solid var(--border-color,#ddd);}
.iiif-viewer__footer a{color:var(--primary-color-dark,#4b4484);}
.iiif-viewer__loading{position:absolute;inset:0;display:flex;align-items:center;
  justify-content:center;color:#d8d5e6;font-size:13px;}
.iiif-viewer:fullscreen{width:100vw;height:100vh;max-width:none;
  border:none;border-radius:0;}
.iiif-viewer:fullscreen .iiif-viewer__stage{height:auto;max-height:none;flex:1 1 auto;}
`;
  const style = document.createElement("style");
  style.id = "iiif-viewer-styles";
  style.textContent = css;
  document.head.appendChild(style);
}

function buildImageUrl(line, width) {
  // IIIF Image API: {identifier}/{region}/{size}/{rotation}/{quality}.{format}
  // quality.format は資料により異なる(国立公文書館=native.jpg / NDL=default.jpg)ため、
  // line.graphic 末尾の "{quality}.{format}" をそのまま流用する。
  const qualityFormat = (line.graphic || "").split("/").pop() || "native.jpg";
  return `${line.image}/full/${width},/0/${qualityFormat}`;
}

export function openIiifViewer(fileName, startPos) {
  const line = lookupLine(fileName, startPos);
  if (!line || line.ulx == null) return;
  injectStyles();
  closeIiifViewer();

  let zoom = DEFAULT_ZOOM;

  panelEl = document.createElement("div");
  panelEl.className = "iiif-viewer";
  panelEl.innerHTML = `
    <div class="iiif-viewer__header">
      <span class="iiif-viewer__title">${escapeHtml(line.pb)} ・ ${line.lb} — IIIF</span>
      <button type="button" class="iiif-viewer__btn" data-act="fullscreen" title="全画面表示">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
      </button>
      <button type="button" class="iiif-viewer__btn iiif-viewer__close" data-act="close" title="閉じる">×</button>
    </div>
    <div class="iiif-viewer__stage">
      <div class="iiif-viewer__wrap">
        <img class="iiif-viewer__img" alt="丁 ${escapeHtml(line.pb)} ${line.lb}行" />
        <div class="iiif-viewer__rect"></div>
      </div>
      <div class="iiif-viewer__loading">画像を読み込み中…</div>
    </div>
    <div class="iiif-viewer__footer">
      <span>座標 ${line.ulx},${line.uly} – ${line.lrx},${line.lry}</span>
      <a href="${escapeHtml(line.graphic || line.canvas)}" target="_blank" rel="noopener noreferrer">画像を別タブで開く</a>
    </div>`;
  document.body.appendChild(panelEl);

  // 画面中央に配置
  const rect = panelEl.getBoundingClientRect();
  panelEl.style.left = Math.max(8, (window.innerWidth - rect.width) / 2) + "px";
  panelEl.style.top = Math.max(8, (window.innerHeight - rect.height) / 2 - 20) + "px";

  const stage = panelEl.querySelector(".iiif-viewer__stage");
  const wrap = panelEl.querySelector(".iiif-viewer__wrap");
  const img = panelEl.querySelector(".iiif-viewer__img");
  const rectBox = panelEl.querySelector(".iiif-viewer__rect");
  const loading = panelEl.querySelector(".iiif-viewer__loading");

  // 行(zone)の枠を画像に対する % で配置 → ズームしても追従する
  const pct = (v) => v.toFixed(4) + "%";
  rectBox.style.left = pct((line.ulx / line.imgW) * 100);
  rectBox.style.top = pct((line.uly / line.imgH) * 100);
  rectBox.style.width = pct(((line.lrx - line.ulx) / line.imgW) * 100);
  rectBox.style.height = pct(((line.lry - line.uly) / line.imgH) * 100);

  // pivot: {x,y}=ステージ内座標(その点を固定してズーム) / null=対象行を中央に
  function setZoom(target, pivot) {
    const baseW = stage.clientWidth; // zoom=1 で横幅にフィット
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, target));
    const oldW = parseFloat(wrap.style.width) || baseW * zoom;
    const oldH = parseFloat(wrap.style.height) || oldW * (line.imgH / line.imgW);
    let rx, ry;
    if (pivot) {
      rx = (stage.scrollLeft + pivot.x) / (oldW || 1);
      ry = (stage.scrollTop + pivot.y) / (oldH || 1);
    }
    zoom = newZoom;
    const w = baseW * zoom;
    const h = w * (line.imgH / line.imgW);
    wrap.style.width = w + "px";
    wrap.style.height = h + "px"; // %指定の枠を確実に解決させる
    if (pivot) {
      stage.scrollLeft = rx * w - pivot.x;
      stage.scrollTop = ry * h - pivot.y;
    } else {
      const cx = ((line.ulx + line.lrx) / 2 / line.imgW) * w;
      const cy = ((line.uly + line.lry) / 2 / line.imgH) * h;
      stage.scrollLeft = cx - stage.clientWidth / 2;
      stage.scrollTop = cy - stage.clientHeight / 2;
    }
  }
  function toggleFullscreen() {
    if (document.fullscreenElement === panelEl) document.exitFullscreen?.();
    else panelEl.requestFullscreen?.();
  }

  img.addEventListener("load", () => {
    loading.style.display = "none";
    setZoom(zoom, null); // 初期ズームで対象行を中央に
  });
  img.addEventListener("error", () => {
    loading.textContent = "画像を読み込めませんでした";
  });
  img.src = buildImageUrl(line, BASE_IMG_WIDTH);

  // ヘッダ操作
  panelEl.querySelector(".iiif-viewer__header").addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "close") return closeIiifViewer();
    if (act === "fullscreen") toggleFullscreen();
  });

  // マウスホイールでズーム(カーソル位置を中心に)
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      const pivot = { x: e.clientX - r.left, y: e.clientY - r.top };
      setZoom(zoom * (e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP), pivot);
    },
    { passive: false }
  );

  enableDragMove(panelEl, panelEl.querySelector(".iiif-viewer__header"));
  enablePan(stage);
  onResize = () => setZoom(zoom, null);
  window.addEventListener("resize", onResize, { passive: true });
  // 全画面の切替でステージ寸法が変わるため、対象行を中央に再配置
  onFsChange = () => requestAnimationFrame(() => setZoom(zoom, null));
  document.addEventListener("fullscreenchange", onFsChange);
}

export function closeIiifViewer() {
  if (onResize) {
    window.removeEventListener("resize", onResize);
    onResize = null;
  }
  if (onFsChange) {
    document.removeEventListener("fullscreenchange", onFsChange);
    onFsChange = null;
  }
  if (document.fullscreenElement === panelEl && panelEl) document.exitFullscreen?.();
  if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
  panelEl = null;
}

// ヘッダをドラッグしてウィンドウを移動
function enableDragMove(win, handle) {
  let sx, sy, ox, oy, dragging = false;
  handle.addEventListener("mousedown", (e) => {
    if (e.target.closest("[data-act]")) return; // ボタン上は除外
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    const r = win.getBoundingClientRect();
    ox = r.left; oy = r.top;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    win.style.left = ox + (e.clientX - sx) + "px";
    win.style.top = oy + (e.clientY - sy) + "px";
  });
  document.addEventListener("mouseup", () => { dragging = false; });
}

// ステージをドラッグしてパン(スクロール)
function enablePan(stage) {
  let sx, sy, sl, st, panning = false;
  stage.addEventListener("mousedown", (e) => {
    panning = true; stage.classList.add("is-panning");
    sx = e.clientX; sy = e.clientY; sl = stage.scrollLeft; st = stage.scrollTop;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!panning) return;
    stage.scrollLeft = sl - (e.clientX - sx);
    stage.scrollTop = st - (e.clientY - sy);
  });
  document.addEventListener("mouseup", () => {
    panning = false; stage.classList.remove("is-panning");
  });
}

// 結果テーブル上の IIIF アイコンクリックを委譲で捕捉 (テーブル再描画に強い)
document.addEventListener("click", (e) => {
  const icon = e.target.closest(".iiif-icon");
  if (!icon) return;
  e.preventDefault();
  e.stopPropagation();
  openIiifViewer(icon.dataset.file, parseInt(icon.dataset.pos, 10));
});

// Esc で閉じる
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeIiifViewer();
});

// アイコンのサイズ等のスタイルを先に注入しておく
// (初回検索でビューア未起動でもアイコンが正しいサイズで表示されるように)
injectStyles();
