// ====== 自定义光标 ======
const cursorDot = document.createElement('div');
cursorDot.className = 'cursor-dot';
const cursorRing = document.createElement('div');
cursorRing.className = 'cursor-ring';
document.body.appendChild(cursorDot);
document.body.appendChild(cursorRing);

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let ringX = mouseX, ringY = mouseY;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
});

function animateRing() {
  ringX += (mouseX - ringX) * 0.18;
  ringY += (mouseY - ringY) * 0.18;
  cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
  requestAnimationFrame(animateRing);
}
animateRing();

document.querySelectorAll('button, a, .thumb, .card').forEach(el => {
  el.addEventListener('mouseenter', () => cursorRing.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursorRing.classList.remove('hover'));
});

// ====== 大标题：词级动画（CSS 已声明，无需 JS 注入索引） ======

// 切图布局后不再需要动态拟合字号（v40：grid 1fr | 376px | 1fr 已自适应）
function fitBigTitle() {
  // no-op: 布局现在由 CSS grid 完全控制
}

window.addEventListener('load', () => {
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitBigTitle);
  } else {
    fitBigTitle();
  }
});
window.addEventListener('resize', () => {
  const title = document.querySelector('.big-title');
  if (title) title.style.fontSize = '';
});

// ====== 矢量角色：整体随鼠标轻微位移 + 瞳孔注视 ======
const emojiWrap = document.getElementById('emojiWrap');
const charSvg = emojiWrap ? emojiWrap.querySelector('.char') : null;
const pupilL = document.querySelector('.pupil-l');
const pupilR = document.querySelector('.pupil-r');

const EYE_L = { cx: 82, cy: 96, r: 5 };
const EYE_R = { cx: 118, cy: 96, r: 5 };

function updateCharTransform() {
  if (!emojiWrap || !charSvg) return;
  const rect = emojiWrap.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const dx = mouseX - cx;
  const dy = mouseY - cy;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  const moveR = Math.min(dist / 22, 8);
  const tx = Math.cos(angle) * moveR;
  const ty = Math.sin(angle) * moveR;
  const rot = (dx / window.innerWidth) * 6;
  charSvg.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;

  if (pupilL && pupilR) {
    const px = Math.cos(angle) * EYE_L.r;
    const py = Math.sin(angle) * EYE_L.r;
    pupilL.setAttribute('cx', EYE_L.cx + px);
    pupilL.setAttribute('cy', EYE_L.cy + py);
    pupilR.setAttribute('cx', EYE_R.cx + px);
    pupilR.setAttribute('cy', EYE_R.cy + py);
  }
}

document.addEventListener('mousemove', updateCharTransform);

// ====== 背景环境光：鼠标微视差（极克制） ======
const ambients = document.querySelectorAll('.ambient');
document.addEventListener('mousemove', () => {
  const nx = (mouseX / window.innerWidth - 0.5);
  const ny = (mouseY / window.innerHeight - 0.5);
  ambients.forEach((el, i) => {
    const factor = (i + 1) * 8;
    el.style.translate = `${nx * factor}px ${ny * factor}px`;
  });
});

// 偶尔眨眼
function blink() {
  const eyes = document.querySelectorAll('.eye');
  eyes.forEach(e => {
    e.animate(
      [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.1)' }, { transform: 'scaleY(1)' }],
      { duration: 220, easing: 'ease-out', iterations: 1 }
    );
    e.style.transformOrigin = 'center';
    e.style.transformBox = 'fill-box';
  });
  setTimeout(blink, 2400 + Math.random() * 3000);
}
setTimeout(blink, 2800);

// ====== 缩略图 Stack 循环（React Bits 风格） ======
// 所有卡片始终可见；顶卡每隔 N 秒被发回底部，下一张升至顶部
let tsCycleTimer = null;
let tsPushTimer = null;
let tsCyclingInitTimer = null;
const tsStack = document.querySelector('.thumb-stack');
const tsCards = Array.from(document.querySelectorAll('.ts-card'));
// 当前栈顺序：数组索引小=栈底，大=栈顶
// 初始：ts-1(底) → ts-2 → ts-3 → ts-4(顶)
let tsOrder = tsCards.slice();

function applyStackOrder() {
  // 给每张卡设置 data-idx：0=底 .. 3=顶
  tsOrder.forEach((card, i) => {
    card.setAttribute('data-idx', String(i));
  });
}

function startTsCycle() {
  if (!tsStack) return;
  // 清理可能遗留的定时器
  if (tsPushTimer) clearTimeout(tsPushTimer);
  if (tsCyclingInitTimer) clearTimeout(tsCyclingInitTimer);

  // 入场：先按出现顺序设 data-enter（控制坠落延迟）
  tsCards.forEach((card, i) => {
    card.setAttribute('data-enter', String(i));
  });
  applyStackOrder();
  // 触发入场（CSS 中 .ts-stack-ready 控制目标位置）
  tsStack.classList.add('ts-stack-ready');

  // 缩略图开始坠落的瞬间（与首卡 2.50s 延迟启动相匹配，即 SPACE 揭幕完成时），
  // 把 .big-title 的中缝从 16px 推到 512px，做出 "缩略图把英文挤开" 的视觉
  const bigTitle = document.querySelector('.big-title');
  tsPushTimer = setTimeout(() => {
    if (bigTitle) bigTitle.classList.add('thumb-pushed');
  }, 2500);

  // 入场动画结束后切到循环态：移除 data-enter（清除 delay），加 .ts-cycling
  // 最后一张延迟 2.74s + transition 0.85s ≈ 3.6s，留一丁点 buffer
  tsCyclingInitTimer = setTimeout(() => {
    tsCards.forEach(card => card.removeAttribute('data-enter'));
    tsStack.classList.add('ts-cycling');

    // 自动循环：每 2s 把顶卡发回底部
    tsCycleTimer = setInterval(() => {
      // 取栈顶（数组末尾）放到栈底（数组头部）
      const top = tsOrder.pop();
      tsOrder.unshift(top);
      applyStackOrder();
    }, 2000);
  }, 3700);
}

function stopTsCycle() {
  if (tsCycleTimer) { clearInterval(tsCycleTimer); tsCycleTimer = null; }
  if (tsPushTimer) { clearTimeout(tsPushTimer); tsPushTimer = null; }
  if (tsCyclingInitTimer) { clearTimeout(tsCyclingInitTimer); tsCyclingInitTimer = null; }
  if (tsStack) {
    tsStack.classList.remove('ts-stack-ready', 'ts-cycling');
  }
  const bigTitle = document.querySelector('.big-title');
  if (bigTitle) bigTitle.classList.remove('thumb-pushed');
  tsCards.forEach(card => {
    card.removeAttribute('data-enter');
    card.removeAttribute('data-idx');
  });
  tsOrder = tsCards.slice();
}

// ====== 进入作品集 ======
const intro = document.getElementById('intro');
const portfolio = document.getElementById('portfolio');
const enterBtn = document.getElementById('enterBtn');
const backBtn = document.getElementById('backBtn');

// ====== 大字逐个揭幕（JS → WU → DESIGN → SPACE） ======
// 用 JS 按数组顺序逐个加 .wipe-go 触发，顺序与间隔完全由代码掌控，
// 不依赖 CSS animation-delay（曾被简写/优先级反复覆盖导致 4 字同时动）。
// 相邻字启动间隔(ms)：必须 ≥ 单字揭幕时长(CSS 0.55s)，否则会重叠。
// 600 = 550ms 揭幕 + 50ms 喘息，确保前一个字完整播完才轮到下一个。
const WORD_WIPE_GAP = 600;
let wordWipeTimers = [];

function resetWordWipe() {
  wordWipeTimers.forEach(t => clearTimeout(t));
  wordWipeTimers = [];
  document.querySelectorAll('.big-row .word').forEach(w => w.classList.remove('wipe-go'));
}

function startWordWipe() {
  resetWordWipe();
  // 严格按出现顺序：第一行左 JS → 第一行右 WU → 第二行左 DESIGN → 第二行右 SPACE
  const order = ['.word-l-top', '.word-r-top', '.word-l-bot', '.word-r-bot'];
  order.forEach((sel, i) => {
    const el = document.querySelector('.big-row ' + sel);
    if (!el) return;
    const t = setTimeout(() => el.classList.add('wipe-go'), 150 + i * WORD_WIPE_GAP);
    wordWipeTimers.push(t);
  });
}

let _entering = false;
function enterPortfolio() {
  if (_entering) return;      // 防重入：pointerdown/click 双触发或多次点击只生效一次
  _entering = true;
  // 立即给按钮加按下态（变白），保证移动端 pointerdown 后能看到白色反馈
  if (enterBtn) enterBtn.classList.add('is-pressed');
  // 极短延迟(120ms)：既让白色按下态渲染出来，又几乎无感知，随后立即切换
  setTimeout(doEnterPortfolio, 120);
}
function doEnterPortfolio() {
  intro.classList.add('exiting');
  intro.hidden = true;
  portfolio.hidden = false;
  document.body.classList.add('portfolio-active');
  portfolio.classList.add('entering');
  portfolio.classList.remove('entered-done');
  window.scrollTo({ top: 0, behavior: 'instant' });
  // 触发顶部 banner 动画（每次进入都重新跑）
  portfolio.classList.remove('entered');
  // 清空 inline 字号让 CSS budget 重新生效（之前 fit 可能留下了小值）
  const title = document.querySelector('.big-title');
  if (title) title.style.fontSize = '';
  // 强制 reflow 让 animation-play-state 重置生效
  void portfolio.offsetWidth;
  requestAnimationFrame(() => {
    portfolio.classList.add('entered');
    // 在显示并 reflow 后再做兜底 fit（仅在真的溢出时缩）
    requestAnimationFrame(() => fitBigTitle());
    // 大字逐个揭幕：JS → WU → DESIGN → SPACE，顺序由 JS 循环严格保证
    startWordWipe();
    // 启动 Stack 入场 + 循环（入场延迟在 CSS 中通过 data-enter 控制）
    startTsCycle();
  });
  // 入场动画结束后清除 entering（避免 transform/filter 残留破坏 .port-nav 的 fixed 定位）
  setTimeout(() => {
    portfolio.classList.remove('entering');
    portfolio.classList.add('entered-done');
  }, 1100);
}

function backToIntro() {
  stopTsCycle();
  resetWordWipe();
  _entering = false;          // 重置入场锁，允许再次进入
  if (enterBtn) enterBtn.classList.remove('is-pressed');  // 清除按钮按下态
  portfolio.classList.remove('entering');
  portfolio.classList.remove('entered');
  portfolio.classList.remove('entered-done');
  portfolio.hidden = true;
  intro.hidden = false;
  intro.classList.remove('exiting');
  document.body.classList.remove('portfolio-active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// 用 pointerdown 替代 click：消除移动端 ~300ms 点击延迟，按下即响应。
// pointerdown 同时覆盖鼠标/触屏/触控笔；配合 enterPortfolio 内部 _entering 锁防重复触发。
enterBtn.addEventListener('pointerdown', enterPortfolio);
backBtn.addEventListener('click', backToIntro);

// ====== 顶部导航三个 tab：Home / Text / Work ======
// Home → 作品集页顶部；Text → 中间逐字宣言；Work → 作品网格标题
const navHome = document.getElementById('navHome');
const navText = document.getElementById('navText');
const navWork = document.getElementById('navWork');
const navLinks = document.querySelectorAll('.nav-links a');

function setActiveNav(activeEl) {
  navLinks.forEach(a => a.classList.remove('active'));
  if (activeEl) activeEl.classList.add('active');
}

// 平滑滚动到指定 Y
// 注意：window.scrollTo({behavior:'smooth'}) 在以下场景会被浏览器降级为瞬时跳：
//   - 用户系统/浏览器开了"减少动效" (prefers-reduced-motion: reduce)
//   - 部分小屏移动浏览器、低端 Android WebView 不支持 smooth
//   - 部分桌面 Safari 老版本忽略 smooth
// 改用 rAF 自己写一个缓动动画，保证所有屏幕一致体验
let _scrollAnimRAF = 0;
function smoothScrollToY(y) {
  const targetY = Math.max(0, y | 0);
  const startY = window.pageYOffset || document.documentElement.scrollTop || 0;
  const dist = targetY - startY;
  if (Math.abs(dist) < 2) { window.scrollTo(0, targetY); return; }
  // 距离自适应时长（放慢版）：300px 内 ~700ms，2000px ~1200ms，最长 ~1600ms
  const dur = Math.min(1600, Math.max(700, Math.abs(dist) * 0.6));
  const startT = performance.now();
  // easeInOutCubic
  const easing = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  if (_scrollAnimRAF) cancelAnimationFrame(_scrollAnimRAF);
  function tick(now) {
    const t = Math.min(1, (now - startT) / dur);
    const e = easing(t);
    window.scrollTo(0, startY + dist * e);
    if (t < 1) _scrollAnimRAF = requestAnimationFrame(tick);
    else _scrollAnimRAF = 0;
  }
  _scrollAnimRAF = requestAnimationFrame(tick);
}

// 动态计算 fixed nav 高度（用于 scrollToSelector 的 offset）
// 实际 offset = navHeight + 64px 留白（模块顶部内容距导航栏 64px，避免太贴近）
function getNavOffset() {
  const nav = document.querySelector('.port-nav');
  const navH = nav ? nav.getBoundingClientRect().height : 64;
  return navH + 64;
}

function scrollToTopOfPortfolio() {
  smoothScrollToY(0);
}

// 动态 spacer：保证 #work / #text 等模块的"标题"可以真正滚到 navOffset 位置
// 不加这个，浏览器在「目标 Y > maxScrollY」时会把滚动钳到底部，标题就还在视口下方看不见
function ensureScrollSpacer(targetY) {
  let sp = document.getElementById('__scrollSpacer');
  if (!sp) {
    sp = document.createElement('div');
    sp.id = '__scrollSpacer';
    sp.style.cssText = 'width:1px;height:0;pointer-events:none;visibility:hidden;';
    document.body.appendChild(sp);
  }
  const docH = document.documentElement.scrollHeight;
  const winH = window.innerHeight;
  const maxScroll = docH - winH;
  const need = targetY - maxScroll;
  if (need > 0) {
    const cur = parseFloat(sp.style.height) || 0;
    sp.style.height = (cur + need + 8) + 'px';
  }
}

function scrollToSelector(sel, offset) {
  const el = document.querySelector(sel);
  if (!el) return;
  if (typeof offset !== 'number') offset = getNavOffset();
  // 用 rect.top + pageYOffset 计算绝对 Y，offset = nav 高度 + 64px 留白
  const rect = el.getBoundingClientRect();
  const y = Math.max(0, rect.top + window.pageYOffset - offset);
  // 关键修复：大屏 / 短文档时，maxScroll 可能 < y，浏览器会把滚动钳到底部
  // 先保证文档底部有足够空间能让 y 真正可滚到
  ensureScrollSpacer(y);
  smoothScrollToY(y);
}

// 防止三重事件兜底（直接监听 + 容器委托 + window capture）重复触发
// 同一次点击如果在 50ms 内被多个 handler 命中，只执行第一次
let _navClickLockUntil = 0;

// 统一处理三个 tab 的点击
function handleNavClick(which, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const now = Date.now();
  if (now < _navClickLockUntil) return;
  _navClickLockUntil = now + 100;
  if (which === 'home') { setActiveNav(navHome); scrollToTopOfPortfolio(); }
  else if (which === 'text') { setActiveNav(navText); scrollToSelector('#text'); }
  else if (which === 'work') { setActiveNav(navWork); scrollToSelector('#work'); }
}

if (navHome) navHome.addEventListener('click', (e) => handleNavClick('home', e));
if (navText) navText.addEventListener('click', (e) => handleNavClick('text', e));
if (navWork) navWork.addEventListener('click', (e) => handleNavClick('work', e));

// 兜底 1：在 .nav-links 容器上事件委托（capture 阶段，最早命中）
const navLinksEl = document.querySelector('.nav-links');
if (navLinksEl && !navLinksEl._delegateBound) {
  navLinksEl.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    if (a.id === 'navHome') { e.preventDefault(); handleNavClick('home'); }
    else if (a.id === 'navText') { e.preventDefault(); handleNavClick('text'); }
    else if (a.id === 'navWork') { e.preventDefault(); handleNavClick('work'); }
  }, true);
  navLinksEl._delegateBound = true;
}

// 兜底 2：window capture 阶段全局兜底（解决 backdrop-filter / stacking context 导致 hit-test 偶发失效）
window.addEventListener('click', (e) => {
  if (!portfolio || portfolio.hidden) return;
  const a = e.target.closest && e.target.closest('.nav-links a');
  if (!a) return;
  if (a.id === 'navHome') { e.preventDefault(); handleNavClick('home'); }
  else if (a.id === 'navText') { e.preventDefault(); handleNavClick('text'); }
  else if (a.id === 'navWork') { e.preventDefault(); handleNavClick('work'); }
}, true);

// 滚动时根据可视区自动高亮当前 tab
(() => {
  if (!navHome && !navText && !navWork) return;
  let ticking = false;
  function updateActiveOnScroll() {
    if (portfolio.hidden) return;
    const y = window.pageYOffset;
    const textEl = document.getElementById('text');
    const workEl = document.getElementById('work');
    const textTop = textEl ? textEl.getBoundingClientRect().top + y : Infinity;
    const workTop = workEl ? workEl.getBoundingClientRect().top + y : Infinity;
    const threshold = window.innerHeight * 0.4;
    let target = navHome;
    if (y + threshold >= workTop) target = navWork;
    else if (y + threshold >= textTop) target = navText;
    else target = navHome;
    if (target && !target.classList.contains('active')) setActiveNav(target);
  }
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateActiveOnScroll();
      ticking = false;
    });
  }, { passive: true });
})();
// logo 点击也回入场页
document.querySelectorAll('.port-nav .logo-personal').forEach(l => {
  l.addEventListener('click', (e) => {
    e.preventDefault();
    backToIntro();
  });
});

// ====== 卡片 3D 倾斜 + Border Glow（鼠标靠近边缘时边框 + 外发光出现） ======
document.querySelectorAll('.card').forEach(card => {
  // 注入边发光层（外溢光晕）—— 用 ::before / ::after 做 mesh-gradient 边框 + 内填充
  if (!card.querySelector('.edge-light')) {
    const el = document.createElement('span');
    el.className = 'edge-light';
    card.prepend(el);
  }

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 3D 倾斜（保留原效果）
    const rx = x / rect.width - 0.5;
    const ry = y / rect.height - 0.5;
    card.style.transform = `translateY(-8px) perspective(1000px) rotateX(${-ry * 6}deg) rotateY(${rx * 6}deg)`;

    // Border Glow 算法（移植自 react-bits BorderGlow）
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    let kx = Infinity, ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1); // 0=中心，1=边缘
    let angle = 0;
    if (dx !== 0 || dy !== 0) {
      const rad = Math.atan2(dy, dx);
      angle = rad * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
    }
    card.style.setProperty('--edge-proximity', (edge * 100).toFixed(2));
    card.style.setProperty('--cursor-angle', angle.toFixed(2) + 'deg');
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.setProperty('--edge-proximity', '0');
  });

  // 点击卡片 → 打开二级详情页
  card.addEventListener('click', () => {
    const projectId = card.getAttribute('data-project');
    if (projectId) openProjectDetail(projectId);
  });
});

// ====== 作品集二级详情页 ======
const projectDetail = document.getElementById('project');
const pdBack = document.getElementById('pdBack');
const pdTitle = document.getElementById('pdTitle');
const pdTitleCn = document.getElementById('pdTitleCn');
const pdSub = document.getElementById('pdSub');
const pdTags = document.getElementById('pdTags');
const pdGallery = document.getElementById('pdGallery');
const pdContinueGrid = document.getElementById('pdContinueGrid');

// 每个项目的图集
// aether（2025 年下半年 / 创意视觉）：postimg CDN 直链（来自 https://postimg.cc/gallery/FXq8NwX）
//   每条记录可以是 string（picsum id，仍走旧逻辑）或 { url, variant } 对象（直接外链 + 自定义版式）
//   variant: 'wide' = 占两列 16:9，'tall' = 单列 3:4，留空 = 单列 4:3
// 其他项目继续用 picsum demo，等待真实素材替换
const projectGalleries = {
  aether: [
    { url: 'assets/aether/00-head.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/Z525v5fN/01.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/4xqxHx8K/02.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/kgzgRgj4/03.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/3xVx0xLr/04.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/GmVmTmMr/05.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/DwHw4wCh/06.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/rwKppr9F/07.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/GmHppyj3/08.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/kXj49cKs/09.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/Kv9zFNBN/10.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/3JLR7BmC/11.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/bN6J8Tk3/12.png', variant: 'wide' },
    { url: 'https://i.postimg.cc/5N90ZGYH/13.png', variant: 'wide' },
    { url: 'assets/aether/99-tail.jpg', variant: 'wide' },
  ],
  // lumen（2025 年上半年 / 构成设计）：postimg CDN 直链（来自 https://postimg.cc/gallery/2VNvhV5）+ 本地头尾插图
  lumen: [
    { url: 'assets/lumen/00-head.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/NFXj4qLS/01.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/wvZBLTTz/02.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/FR8K3ssQ/03.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/gJQ08kkW/04.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/bJWvkNNc/05.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/LXwsL64b/06.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/d1p0rtQf/07.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/50TtLN9K/08.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/9MKfZFXJ/09.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/nzgLBcVv/10.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/vBkmfH8f/11.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/hj6GTP4x/12.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/G2H24sRz/13.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/G2H24sRj/14.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/j5L5DJTQ/15.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/fLJLV0s7/16.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/TwpwKWxg/17.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/ydkdDSK3/18.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/xCcCXbQk/19.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/HxVxr7m7/20.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/63y38GK2/21.jpg', variant: 'wide' },
    { url: 'https://i.postimg.cc/sXvXMZzX/22.jpg', variant: 'wide' },
    { url: 'assets/lumen/99-tail.jpg', variant: 'wide' },
  ],
  // nova（2024 年下半年 / IP 及场景）：本地资源 assets/nova/01-26.jpg + 本地头尾插图
  nova: [
    { url: 'assets/nova/00-head.jpg', variant: 'wide' },
    { url: 'assets/nova/01.jpg', variant: 'wide' },
    { url: 'assets/nova/02.jpg', variant: 'wide' },
    { url: 'assets/nova/03.jpg', variant: 'wide' },
    { url: 'assets/nova/04.jpg', variant: 'wide' },
    { url: 'assets/nova/05.jpg', variant: 'wide' },
    { url: 'assets/nova/06.jpg', variant: 'wide' },
    { url: 'assets/nova/07.jpg', variant: 'wide' },
    { url: 'assets/nova/08.jpg', variant: 'wide' },
    { url: 'assets/nova/09.jpg', variant: 'wide' },
    { url: 'assets/nova/10.jpg', variant: 'wide' },
    { url: 'assets/nova/11.jpg', variant: 'wide' },
    { url: 'assets/nova/12.jpg', variant: 'wide' },
    { url: 'assets/nova/13.jpg', variant: 'wide' },
    { url: 'assets/nova/14.jpg', variant: 'wide' },
    { url: 'assets/nova/15.jpg', variant: 'wide' },
    { url: 'assets/nova/16.jpg', variant: 'wide' },
    { url: 'assets/nova/17.jpg', variant: 'wide' },
    { url: 'assets/nova/18.jpg', variant: 'wide' },
    { url: 'assets/nova/19.jpg', variant: 'wide' },
    { url: 'assets/nova/20.jpg', variant: 'wide' },
    { url: 'assets/nova/21.jpg', variant: 'wide' },
    { url: 'assets/nova/22.jpg', variant: 'wide' },
    { url: 'assets/nova/23.jpg', variant: 'wide' },
    { url: 'assets/nova/24.jpg', variant: 'wide' },
    { url: 'assets/nova/25.jpg', variant: 'wide' },
    { url: 'assets/nova/26.jpg', variant: 'wide' },
    { url: 'assets/nova/99-tail.jpg', variant: 'wide' },
  ],
  // echo（2024 年上半年 / 工作项目）：本地资源 assets/echo/01-17.jpg + 本地头尾插图
  echo: [
    { url: 'assets/echo/00-head.jpg', variant: 'wide' },
    { url: 'assets/echo/01.jpg', variant: 'wide' },
    { url: 'assets/echo/02.jpg', variant: 'wide' },
    { url: 'assets/echo/03.jpg', variant: 'wide' },
    { url: 'assets/echo/04.jpg', variant: 'wide' },
    { url: 'assets/echo/05.jpg', variant: 'wide' },
    { url: 'assets/echo/06.jpg', variant: 'wide' },
    { url: 'assets/echo/07.jpg', variant: 'wide' },
    { url: 'assets/echo/08.jpg', variant: 'wide' },
    { url: 'assets/echo/09.jpg', variant: 'wide' },
    { url: 'assets/echo/10.jpg', variant: 'wide' },
    { url: 'assets/echo/11.jpg', variant: 'wide' },
    { url: 'assets/echo/12.jpg', variant: 'wide' },
    { url: 'assets/echo/13.jpg', variant: 'wide' },
    { url: 'assets/echo/14.jpg', variant: 'wide' },
    { url: 'assets/echo/15.jpg', variant: 'wide' },
    { url: 'assets/echo/16.jpg', variant: 'wide' },
    { url: 'assets/echo/17.jpg', variant: 'wide' },
    { url: 'assets/echo/99-tail.jpg', variant: 'wide' },
  ],
  // drift（2023 年下半年 / 工作项目）：本地资源 assets/drift/01-61.jpg
  drift: [
    { url: 'assets/drift/01.jpg', variant: 'wide' },
    { url: 'assets/drift/02.jpg', variant: 'wide' },
    { url: 'assets/drift/03.jpg', variant: 'wide' },
    { url: 'assets/drift/04.jpg', variant: 'wide' },
    { url: 'assets/drift/05.jpg', variant: 'wide' },
    { url: 'assets/drift/06.jpg', variant: 'wide' },
    { url: 'assets/drift/07.jpg', variant: 'wide' },
    { url: 'assets/drift/08.jpg', variant: 'wide' },
    { url: 'assets/drift/09.jpg', variant: 'wide' },
    { url: 'assets/drift/10.jpg', variant: 'wide' },
    { url: 'assets/drift/11.jpg', variant: 'wide' },
    { url: 'assets/drift/12.jpg', variant: 'wide' },
    { url: 'assets/drift/13.jpg', variant: 'wide' },
    { url: 'assets/drift/14.jpg', variant: 'wide' },
    { url: 'assets/drift/15.jpg', variant: 'wide' },
    { url: 'assets/drift/16.jpg', variant: 'wide' },
    { url: 'assets/drift/17.jpg', variant: 'wide' },
    { url: 'assets/drift/18.jpg', variant: 'wide' },
    { url: 'assets/drift/19.jpg', variant: 'wide' },
    { url: 'assets/drift/20.jpg', variant: 'wide' },
    { url: 'assets/drift/21.jpg', variant: 'wide' },
    { url: 'assets/drift/22.jpg', variant: 'wide' },
    { url: 'assets/drift/23.jpg', variant: 'wide' },
    { url: 'assets/drift/24.jpg', variant: 'wide' },
    { url: 'assets/drift/25.jpg', variant: 'wide' },
    { url: 'assets/drift/26.jpg', variant: 'wide' },
    { url: 'assets/drift/27.jpg', variant: 'wide' },
    { url: 'assets/drift/28.jpg', variant: 'wide' },
    { url: 'assets/drift/29.jpg', variant: 'wide' },
    { url: 'assets/drift/30.jpg', variant: 'wide' },
    { url: 'assets/drift/31.jpg', variant: 'wide' },
    { url: 'assets/drift/32.jpg', variant: 'wide' },
    { url: 'assets/drift/33.jpg', variant: 'wide' },
    { url: 'assets/drift/34.jpg', variant: 'wide' },
    { url: 'assets/drift/35.jpg', variant: 'wide' },
    { url: 'assets/drift/36.jpg', variant: 'wide' },
    { url: 'assets/drift/37.jpg', variant: 'wide' },
    { url: 'assets/drift/38.jpg', variant: 'wide' },
    { url: 'assets/drift/39.jpg', variant: 'wide' },
    { url: 'assets/drift/40.jpg', variant: 'wide' },
    { url: 'assets/drift/41.jpg', variant: 'wide' },
    { url: 'assets/drift/42.jpg', variant: 'wide' },
    { url: 'assets/drift/43.jpg', variant: 'wide' },
    { url: 'assets/drift/44.jpg', variant: 'wide' },
    { url: 'assets/drift/45.jpg', variant: 'wide' },
    { url: 'assets/drift/46.jpg', variant: 'wide' },
    { url: 'assets/drift/47.jpg', variant: 'wide' },
    { url: 'assets/drift/48.jpg', variant: 'wide' },
    { url: 'assets/drift/49.jpg', variant: 'wide' },
    { url: 'assets/drift/50.jpg', variant: 'wide' },
    { url: 'assets/drift/51.jpg', variant: 'wide' },
    { url: 'assets/drift/52.jpg', variant: 'wide' },
    { url: 'assets/drift/53.jpg', variant: 'wide' },
    { url: 'assets/drift/54.jpg', variant: 'wide' },
    { url: 'assets/drift/55.jpg', variant: 'wide' },
    { url: 'assets/drift/56.jpg', variant: 'wide' },
    { url: 'assets/drift/57.jpg', variant: 'wide' },
    { url: 'assets/drift/58.jpg', variant: 'wide' },
    { url: 'assets/drift/59.jpg', variant: 'wide' },
    { url: 'assets/drift/60.jpg', variant: 'wide' },
    { url: 'assets/drift/61.jpg', variant: 'wide' },
  ],
  // mono（2023 年上半年 / 工作项目）：本地资源 assets/mono/01-30.png
  mono: [
    { url: 'assets/mono/01.jpg', variant: 'wide' },
    { url: 'assets/mono/02.jpg', variant: 'wide' },
    { url: 'assets/mono/03.jpg', variant: 'wide' },
    { url: 'assets/mono/04.jpg', variant: 'wide' },
    { url: 'assets/mono/05.jpg', variant: 'wide' },
    { url: 'assets/mono/06.jpg', variant: 'wide' },
    { url: 'assets/mono/07.jpg', variant: 'wide' },
    { url: 'assets/mono/08.jpg', variant: 'wide' },
    { url: 'assets/mono/09.jpg', variant: 'wide' },
    { url: 'assets/mono/10.jpg', variant: 'wide' },
    { url: 'assets/mono/11.jpg', variant: 'wide' },
    { url: 'assets/mono/12.jpg', variant: 'wide' },
    { url: 'assets/mono/13.jpg', variant: 'wide' },
    { url: 'assets/mono/14.jpg', variant: 'wide' },
    { url: 'assets/mono/15.jpg', variant: 'wide' },
    { url: 'assets/mono/16.jpg', variant: 'wide' },
    { url: 'assets/mono/17.jpg', variant: 'wide' },
    { url: 'assets/mono/18.jpg', variant: 'wide' },
    { url: 'assets/mono/19.jpg', variant: 'wide' },
    { url: 'assets/mono/20.jpg', variant: 'wide' },
    { url: 'assets/mono/21.jpg', variant: 'wide' },
    { url: 'assets/mono/22.jpg', variant: 'wide' },
    { url: 'assets/mono/23.jpg', variant: 'wide' },
    { url: 'assets/mono/24.jpg', variant: 'wide' },
    { url: 'assets/mono/25.jpg', variant: 'wide' },
    { url: 'assets/mono/26.jpg', variant: 'wide' },
    { url: 'assets/mono/27.jpg', variant: 'wide' },
    { url: 'assets/mono/28.jpg', variant: 'wide' },
    { url: 'assets/mono/29.jpg', variant: 'wide' },
    { url: 'assets/mono/30.jpg', variant: 'wide' },
  ],
  glacier: [
    { url: 'assets/glacier/01.jpg', variant: 'wide' },
    { url: 'assets/glacier/02.jpg', variant: 'wide' },
    { url: 'assets/glacier/03.jpg', variant: 'wide' },
    { url: 'assets/glacier/04.jpg', variant: 'wide' },
    { url: 'assets/glacier/05.jpg', variant: 'wide' },
    { url: 'assets/glacier/06.jpg', variant: 'wide' },
    { url: 'assets/glacier/07.jpg', variant: 'wide' },
    { url: 'assets/glacier/08.jpg', variant: 'wide' },
    { url: 'assets/glacier/09.jpg', variant: 'wide' },
    { url: 'assets/glacier/10.jpg', variant: 'wide' },
    { url: 'assets/glacier/11.jpg', variant: 'wide' },
    { url: 'assets/glacier/12.jpg', variant: 'wide' },
    { url: 'assets/glacier/13.jpg', variant: 'wide' },
    { url: 'assets/glacier/14.jpg', variant: 'wide' },
    { url: 'assets/glacier/15.jpg', variant: 'wide' },
    { url: 'assets/glacier/16.jpg', variant: 'wide' },
    { url: 'assets/glacier/17.jpg', variant: 'wide' },
    { url: 'assets/glacier/18.jpg', variant: 'wide' },
    { url: 'assets/glacier/19.jpg', variant: 'wide' },
    { url: 'assets/glacier/20.jpg', variant: 'wide' },
    { url: 'assets/glacier/21.jpg', variant: 'wide' },
    { url: 'assets/glacier/22.jpg', variant: 'wide' },
    { url: 'assets/glacier/23.jpg', variant: 'wide' },
    { url: 'assets/glacier/24.jpg', variant: 'wide' },
    { url: 'assets/glacier/25.jpg', variant: 'wide' },
    { url: 'assets/glacier/26.jpg', variant: 'wide' },
    { url: 'assets/glacier/27.jpg', variant: 'wide' },
    { url: 'assets/glacier/28.jpg', variant: 'wide' },
    { url: 'assets/glacier/29.jpg', variant: 'wide' },
    { url: 'assets/glacier/30.jpg', variant: 'wide' },
    { url: 'assets/glacier/31.jpg', variant: 'wide' },
    { url: 'assets/glacier/32.jpg', variant: 'wide' },
    { url: 'assets/glacier/33.jpg', variant: 'wide' },
    { url: 'assets/glacier/34.jpg', variant: 'wide' },
    { url: 'assets/glacier/35.jpg', variant: 'wide' },
    { url: 'assets/glacier/36.jpg', variant: 'wide' },
    { url: 'assets/glacier/37.jpg', variant: 'wide' },
    { url: 'assets/glacier/38.jpg', variant: 'wide' },
    { url: 'assets/glacier/39.jpg', variant: 'wide' },
    { url: 'assets/glacier/40.jpg', variant: 'wide' },
    { url: 'assets/glacier/41.jpg', variant: 'wide' },
    { url: 'assets/glacier/42.jpg', variant: 'wide' },
    { url: 'assets/glacier/43.jpg', variant: 'wide' },
    { url: 'assets/glacier/44.jpg', variant: 'wide' },
    { url: 'assets/glacier/45.jpg', variant: 'wide' },
    { url: 'assets/glacier/46.jpg', variant: 'wide' },
    { url: 'assets/glacier/47.jpg', variant: 'wide' },
    { url: 'assets/glacier/48.jpg', variant: 'wide' },
    { url: 'assets/glacier/49.jpg', variant: 'wide' },
    { url: 'assets/glacier/50.jpg', variant: 'wide' },
    { url: 'assets/glacier/51.jpg', variant: 'wide' },
    { url: 'assets/glacier/52.jpg', variant: 'wide' },
    { url: 'assets/glacier/53.jpg', variant: 'wide' },
    { url: 'assets/glacier/54.jpg', variant: 'wide' },
    { url: 'assets/glacier/55.jpg', variant: 'wide' },
    { url: 'assets/glacier/56.jpg', variant: 'wide' },
    { url: 'assets/glacier/57.jpg', variant: 'wide' },
    { url: 'assets/glacier/58.jpg', variant: 'wide' },
    { url: 'assets/glacier/59.jpg', variant: 'wide' },
    { url: 'assets/glacier/60.jpg', variant: 'wide' },
    { url: 'assets/glacier/61.jpg', variant: 'wide' },
    { url: 'assets/glacier/62.jpg', variant: 'wide' },
    { url: 'assets/glacier/63.jpg', variant: 'wide' },
    { url: 'assets/glacier/64.jpg', variant: 'wide' },
    { url: 'assets/glacier/65.jpg', variant: 'wide' },
  ],
};

// 预先把 7 张卡片元数据缓存下来（顺序 = DOM 顺序）
const allProjects = Array.from(document.querySelectorAll('.card[data-project]')).map(c => ({
  id:    c.dataset.project,
  chipLabel: c.dataset.chipLabel,
  chipTone:  c.dataset.chipTone,
  chipIcon:  c.dataset.chipIcon,
  enPeriod:  c.dataset.enPeriod,
  enTitle:   c.dataset.enTitle,
  cnTitle:   c.dataset.cnTitle,
  cnSub:     c.dataset.cnSub,
  // 卡片正面 h4 文本（如 "2025 年下半年"）—— 详情页中文副标题用这个
  cardTitle: (c.querySelector('.card-info h4')?.textContent || '').trim(),
  // 卡片正面 p 文本（英文一句话副标题）—— 详情页小字英文用这个
  cardSub:   (c.querySelector('.card-info p')?.textContent || '').trim(),
  // 卡片正面的标签（UI/UX、System、Motion 等），按出现顺序读取
  tags:      Array.from(c.querySelectorAll('.tags span')).map(s => s.textContent.trim()),
}));

function openProjectDetail(projectId) {
  const meta = allProjects.find(p => p.id === projectId);
  if (!meta || !projectDetail) return;

  // 头部信息（4 行 + 标签）
  // ① 主标题（英文）= 卡片主标题的英文翻译（enPeriod）
  //    - 全部大写
  //    - 标题中"最重要的关键信息"（年份，如 2025/2024/2023/2022）用蓝色渐变高亮
  //      渐变色：#7B8AFF → #49B2E3
  // ② 中文 = 卡片正面主标题 h4 文本（cardTitle，例如 "2025 年下半年"）
  // ③ 英文小字 = 卡片正面副标题 p 文本（cardSub，如 "Next-gen operating system interface for spatial computing."）
  // ④ 标签胶囊 = 卡片正面 .tags 里的 span 文本
  const rawTitle = meta.enPeriod || meta.enTitle || meta.cardTitle || '';
  const upperTitle = rawTitle.toUpperCase();
  // 用正则把 4 位年份包成 .pd-title-accent，例如 2025/2024/2023/2022
  const highlightedTitle = upperTitle.replace(
    /(\b(?:19|20)\d{2}\b)/g,
    '<span class="pd-title-accent">$1</span>'
  );
  pdTitle.innerHTML = highlightedTitle;
  if (pdTitleCn) pdTitleCn.textContent = meta.cardTitle || meta.cnTitle;
  pdSub.textContent = meta.cardSub || meta.enTitle || '';
  if (pdTags) {
    pdTags.innerHTML = (meta.tags || []).map(t => `<span>${t}</span>`).join('');
  }

  // 图集：支持两种格式
  //   1) string —— 旧 demo 数据，picsum id，沿用 6 张默认 variantOrder
  //   2) { url, variant } —— 真实素材外链，按对象自带 variant 渲染
  // 排列规则（image#1 标注）：行优先填充 —— 第一行 [1,2,3,4]、第二行 [5,6,7,8]…
  // 即图 i 进入第 (i % cols) 列；同一列内按 DOM 顺序自顶向下排列
  const items = projectGalleries[projectId] || projectGalleries.aether;
  const variantOrder = ['wide', '', '', 'tall', '', 'tall'];

  // 把单张图渲染成 HTML 片段
  // data-order 记录原 items 数组索引（视觉"从左往右、从上往下"顺序），
  // 用于 lightbox 切换时按视觉顺序而非按列优先 DOM 顺序遍历
  const renderPhoto = (item, i) => {
    if (typeof item === 'object' && item && item.url) {
      const variant = item.variant || '';
      return `<div class="pd-photo ${variant}"><img src="${item.url}" alt="${meta.cnTitle} 项目相关图 ${i + 1}" data-order="${i}" loading="lazy" /></div>`;
    }
    const variant = variantOrder[i] || '';
    const w = variant === 'wide' ? 1600 : 800;
    const h = variant === 'wide' ? 900 : (variant === 'tall' ? 1067 : 600);
    return `<div class="pd-photo ${variant}"><img src="https://picsum.photos/id/${item}/${w}/${h}" alt="${meta.cnTitle} 项目相关图 ${i + 1}" data-order="${i}" loading="lazy" /></div>`;
  };

  // 根据视口宽度决定列数（断点对齐 image#2 反馈：大部分窗口宽度都应至少 2 列）
  //   ≥1180px → 4 列；≥860px → 3 列；<860px → 2 列（最少保持 2 列，含手机竖屏）
  const getColCount = () => {
    const w = window.innerWidth;
    if (w >= 1180) return 4;
    if (w >= 860) return 3;
    return 2;
  };

  // 按行优先（i % cols）把图分发进 cols 个列容器
  const layoutGallery = () => {
    const cols = getColCount();
    // 构建 cols 个空数组，按 i % cols 分发
    const buckets = Array.from({ length: cols }, () => []);
    items.forEach((item, i) => {
      buckets[i % cols].push(renderPhoto(item, i));
    });
    pdGallery.innerHTML = buckets
      .map(col => `<div class="pd-col">${col.join('')}</div>`)
      .join('');
    // 骨架图：图片加载完成后给 .pd-photo 加 .loaded（解除 16:9 骨架占位 + 淡入）
    pdGallery.querySelectorAll('.pd-photo').forEach(photo => {
      const img = photo.querySelector('img');
      if (!img) return;
      if (img.complete && img.naturalWidth > 0) {
        photo.classList.add('loaded');           // 已缓存：直接显示
      } else {
        img.addEventListener('load', () => photo.classList.add('loaded'), { once: true });
        // 加载失败也解除骨架，避免一直转
        img.addEventListener('error', () => photo.classList.add('loaded'), { once: true });
      }
    });
  };
  layoutGallery();

  // 窗口尺寸变化时重新分配（防抖）
  if (pdGallery._resizeHandler) {
    window.removeEventListener('resize', pdGallery._resizeHandler);
  }
  let resizeTimer = null;
  pdGallery._resizeHandler = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutGallery, 120);
  };
  window.addEventListener('resize', pdGallery._resizeHandler);

  // 继续预览（其他 6 个项目）
  const others = allProjects.filter(p => p.id !== projectId);
  pdContinueGrid.innerHTML = others.map(p => `
    <a class="pd-next-item" data-project="${p.id}" href="#project">
      <h3 class="pd-next-title">${p.cardTitle}</h3>
      <p class="pd-next-sub">${p.cardSub}</p>
      <span class="pd-next-cta">
        <span class="pd-next-cta-text">探索</span>
        <span class="pd-next-cta-arrow" aria-hidden="true">→</span>
      </span>
    </a>
  `).join('');
  // 给"继续预览"里的项目入口绑定切换 + Border Glow 发光效果（与首页 .card 一致）
  pdContinueGrid.querySelectorAll('.pd-next-item').forEach(item => {
    // 注入 edge-light 层
    if (!item.querySelector('.edge-light')) {
      const el = document.createElement('span');
      el.className = 'edge-light';
      item.prepend(el);
    }
    // mousemove → 计算 edge-proximity / cursor-angle（复用主页 .card 算法）
    item.addEventListener('mousemove', (e) => {
      const rect = item.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      let kx = Infinity, ky = Infinity;
      if (dx !== 0) kx = cx / Math.abs(dx);
      if (dy !== 0) ky = cy / Math.abs(dy);
      const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
      let angle = 0;
      if (dx !== 0 || dy !== 0) {
        const rad = Math.atan2(dy, dx);
        angle = rad * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;
      }
      item.style.setProperty('--edge-proximity', (edge * 100).toFixed(2));
      item.style.setProperty('--cursor-angle', angle.toFixed(2) + 'deg');
    });
    item.addEventListener('mouseleave', () => {
      item.style.setProperty('--edge-proximity', '0');
    });
    // 点击切换详情（直接监听）
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openProjectDetail(item.dataset.project);
      projectDetail.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  // 兜底：在 pdContinueGrid 容器上事件委托（捕获阶段，最早命中），
  // 防止某些屏幕/内核下 mask-image / mix-blend-mode / 子元素 hit-test 异常导致直接监听失效
  if (!pdContinueGrid._delegateBound) {
    pdContinueGrid.addEventListener('click', (e) => {
      const item = e.target.closest && e.target.closest('.pd-next-item');
      if (item && item.dataset.project) {
        e.preventDefault();
        openProjectDetail(item.dataset.project);
        projectDetail.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, true);
    pdContinueGrid._delegateBound = true;
  }

  // 显示详情页 & 锁定背景滚动
  projectDetail.hidden = false;
  document.body.classList.add('project-active');
  projectDetail.scrollTop = 0;
}

function closeProjectDetail() {
  if (!projectDetail) return;
  projectDetail.hidden = true;
  document.body.classList.remove('project-active');
}

if (pdBack) {
  pdBack.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeProjectDetail();
  });
}

// 兜底 1：在整个 .project-detail 上做事件委托
if (projectDetail) {
  projectDetail.addEventListener('click', (e) => {
    const back = e.target.closest('.pd-back');
    if (back) {
      e.preventDefault();
      closeProjectDetail();
    }
  });
}

// 兜底 2：window capture 阶段提前命中（避免任何祖先 stopPropagation 拦截）
window.addEventListener('click', (e) => {
  const back = e.target.closest && e.target.closest('.pd-back');
  if (back && projectDetail && !projectDetail.hidden) {
    e.preventDefault();
    closeProjectDetail();
  }
}, true);

// 兜底 3：window capture 阶段提前命中"猜你想看"卡片点击
// 解决某些屏幕（特别是 iOS Safari / 触摸屏）下 mask-image 装饰层导致 hit-test 异常的问题
window.addEventListener('click', (e) => {
  if (!projectDetail || projectDetail.hidden) return;
  const item = e.target.closest && e.target.closest('.pd-next-item');
  if (item && item.dataset.project) {
    e.preventDefault();
    openProjectDetail(item.dataset.project);
    projectDetail.scrollTo({ top: 0, behavior: 'smooth' });
  }
}, true);

// ====== 键盘可用性 ======
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !intro.hidden) {
    enterPortfolio();
  }
  if (e.key === 'Escape') {
    if (projectDetail && !projectDetail.hidden) {
      closeProjectDetail();
    } else if (!portfolio.hidden) {
      backToIntro();
    }
  }
});

// ====== 实时时钟（入场页右上） ======
const clockEl = document.getElementById('introClock');
function tickClock() {
  if (!clockEl) return;
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
tickClock();
setInterval(tickClock, 1000);

/* ============================================
   滚动渐显（一整段排版）
   - 词级 .srw / .sr-accent：每个 token 自身中线越过屏幕中线（vh*0.55）时才点亮
     → 视觉上"该行/该词滚到屏幕中间时才开始变清晰"
   - 行内 .sr-img：图片自身中线越过屏幕中线时"从中间撑开"
   ============================================ */
(function initScrollReveal(){
  const root = document.querySelector('.scroll-reveal');
  if (!root) return;
  // 词级 token（不含图片）
  const tokens = [...root.querySelectorAll('.srw, .sr-accent')];
  // 行内图片
  const imgs = [...root.querySelectorAll('.sr-img')];
  const sub = root.querySelector('.sr-sub');
  if (!tokens.length && !imgs.length && !sub) return;

  let ticking = false;

  function update(){
    ticking = false;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    /* 触发线：屏幕正中线（vh*0.5）。
       v87 之前用 0.55 略偏下，配合 stagger 后第一个 token 还没真到屏幕中央就开始亮，
       用户希望"元素滚到屏幕中间才开始高亮"，所以拉回 0.5。 */
    const triggerY = vh * 0.5;

    /* —— 词级 + 行内图片：按"行级触发 + DOM 顺序"做扫亮 ——
       用户精确需求：当一行的 mid 距离屏幕中心还有 LINE_LEAD_PX(40) 时，行最左 token 开始亮；
       行 mid 到达屏幕中心时，行最右 token 亮完。整行扫亮发生在 mid 从
       (triggerY + LINE_LEAD_PX) 滚动到 triggerY 这 40px 距离内。

       关键修复（v90）：
       1) **抖动根因**：之前用 `left` 算 ratio，emoji 撑开会推动右侧文字 left → ratio 重算
          → 触发线变 → 个别 token 状态翻转 → 又触发回流，形成反馈循环（用户看到的"左右晃动"）
          解决：改用 **DOM 顺序索引**（即 token 在 .sr-text 子元素列表中的位置）算 ratio，
          DOM 顺序在滚动 / 撑开动画过程中**永远不变**，根除反馈循环
       2) **整句一起亮根因**：emoji 默认 max-width:0，未撑开时 left 与紧邻 token 几乎重合，
          且单 token 行（最后一行可能只有 1~2 个 token）的 left span = 0 → 整行 ratio 全等
          → 整句一起亮。改用 DOM 顺序后，每个元素在行内有唯一 idx → 必定 stagger
       3) **emoji 提前撑开**：emoji 不再走"自身在行内 ratio"，而是**复用它前一个 token 的 ratio**
          + 一个固定额外延迟 EMOJI_AFTER_PREV，让 emoji 必须等前一个 token 亮完才开始撑开
    */
    const LINE_LEAD_PX = 40; // 提前量：行 mid 距屏幕中心 40px 时本行开始扫亮
    const EMOJI_AFTER_PREV = 18; // emoji 触发线在它前一个 token 触发线基础上再下沉 18px → emoji 在前一个 token 亮完后再撑开
    // 取 .sr-text 容器的子元素 DOM 顺序作为稳定 index
    const srText = root.querySelector('.sr-text');
    if (!srText) return;
    const orderedKids = [...srText.children]; // 严格 DOM 顺序（含 .srw 和 .sr-img）
    // 按 top 分行；同一行内的 items 用 DOM 顺序排序（稳定，不受 emoji 撑开影响）
    const lineMap = new Map(); // top → { items: [{el, domIdx, mid, kind, prevTokDomIdx}] }
    let lastTokDomIdx = -1; // 用于给 emoji 关联到它前一个 token 的 idx
    orderedKids.forEach((el, domIdx) => {
      const isImg = el.classList.contains('sr-img');
      const isTok = el.classList.contains('srw') || el.classList.contains('sr-accent');
      if (!isImg && !isTok) return;
      const r = el.getBoundingClientRect();
      const top = Math.round(r.top);
      if (!lineMap.has(top)) lineMap.set(top, { items: [] });
      lineMap.get(top).items.push({
        el,
        domIdx,
        mid: r.top + r.height / 2,
        kind: isImg ? 'img' : 'tok',
        prevTokDomIdx: isImg ? lastTokDomIdx : -1, // emoji 记录它前一个 token 的全局 domIdx
      });
      if (isTok) lastTokDomIdx = domIdx;
    });
    // 每行内按 DOM 顺序计算 ratio（0~1），换算触发线
    lineMap.forEach((line) => {
      // 行内只统计 token 的 ratio 基准（emoji 复用其前一个 token 的 ratio）
      const tokItems = line.items.filter((x) => x.kind === 'tok');
      if (tokItems.length === 0) {
        // 行内全是 emoji（极端情况），所有 emoji 用 ratio=1（行末才亮）
        line.items.forEach(({ el, mid }) => {
          const tokenTrigger = triggerY - EMOJI_AFTER_PREV;
          const on = mid < tokenTrigger;
          if (on !== el.classList.contains('is-on')) el.classList.toggle('is-on', on);
        });
        return;
      }
      const span = Math.max(1, tokItems.length - 1); // 行内 token 数 - 1（避免单 token 行除 0）
      // 给行内每个 token 算 ratio（按 DOM 顺序在行内的 idx）
      const tokRatioMap = new Map(); // domIdx → ratio
      tokItems.forEach((it, i) => {
        const ratio = tokItems.length === 1 ? 1 : i / span;
        tokRatioMap.set(it.domIdx, ratio);
      });
      line.items.forEach(({ el, mid, kind, domIdx, prevTokDomIdx }) => {
        let ratio;
        if (kind === 'tok') {
          ratio = tokRatioMap.get(domIdx);
        } else {
          // emoji：复用它前一个 token 的 ratio；如果前一个 token 不在本行，用本行第一个 token 的 ratio
          ratio = tokRatioMap.has(prevTokDomIdx) ? tokRatioMap.get(prevTokDomIdx) : 0;
        }
        let tokenTrigger = triggerY + LINE_LEAD_PX * (1 - ratio);
        // emoji 在它"前一个 token 触发线"基础上再下沉一点，强制晚于前一个 token 亮
        if (kind === 'img') tokenTrigger -= EMOJI_AFTER_PREV;
        const on = mid < tokenTrigger;
        if (on !== el.classList.contains('is-on')) {
          el.classList.toggle('is-on', on);
        }
      });
    });

    /* —— 副标 —— */
    if (sub) {
      const r = sub.getBoundingClientRect();
      const subMid = r.top + r.height / 2;
      const on = subMid < triggerY;
      if (on !== sub.classList.contains('is-on')) {
        sub.classList.toggle('is-on', on);
      }
    }
  }

  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  // 初始化
  requestAnimationFrame(update);
})();

/* ============================================================
   图片预览 lightbox
   - 事件委托：监听 #pdGallery 的 click，捕获 .pd-photo img
   - 状态：scale（当前缩放）、tx/ty（平移偏移，已乘 scale 之后的像素值）
   - 交互：
       1. 点击图片 → 1× ↔ 2× 切换（鼠标位置为锚点）
       2. 滚轮 → 以鼠标位置为锚点缩放
       3. 鼠标拖拽 → 平移（scale > 1 时）
       4. 工具栏 +/− → 0.25 步进
       5. ESC / 点击背景 / 关闭按钮 → 关闭
   ============================================================ */
(() => {
  const lb       = document.getElementById('lightbox');
  if (!lb) return;
  const lbStage  = document.getElementById('lbStage');
  const lbImg    = document.getElementById('lbImg');
  const lbClose  = document.getElementById('lbClose');
  const lbZoomIn = document.getElementById('lbZoomIn');
  const lbZoomOut= document.getElementById('lbZoomOut');
  const lbCenter = document.getElementById('lbCenter');
  const lbPrev   = document.getElementById('lbPrev');
  const lbNext   = document.getElementById('lbNext');
  const lbPct    = document.getElementById('lbPct');
  const gallery  = document.getElementById('pdGallery');

  const MIN = 0.25, MAX = 6, STEP = 0.25;
  let scale = 1, tx = 0, ty = 0;
  // 当前预览的图片列表 + 索引
  let list = [];        // [{src, alt}]
  let index = 0;

  /* ---------- 液态玻璃 displacement map 生成 ---------- */
  // 为 #lbGlassMap 动态生成一张随 toolbar 尺寸适配的 displacement 贴图
  // 原理：双向线性渐变（红轴 ←→、蓝轴 ↕）+ 中央亮块（被 blur）形成法线般的位移图
  // feDisplacementMap 用此贴图把 toolbar 后面的图像按 R/G 通道偏移，产生折射感
  const lbToolbar = document.querySelector('.lb-toolbar');
  const lbGlassMap = document.getElementById('lbGlassMap');
  const GLASS_BORDER_WIDTH = 0.07;
  const GLASS_BRIGHTNESS = 55;
  const GLASS_OPACITY = 0.93;
  const GLASS_BLUR = 11;
  const updateGlassMap = () => {
    if (!lbToolbar || !lbGlassMap) return;
    const rect = lbToolbar.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const r = Math.min(w, h) / 2;
    const edge = Math.min(w, h) * (GLASS_BORDER_WIDTH * 0.5);
    const svg = `
      <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lbR" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="lbB" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${w}" height="${h}" fill="black"/>
        <rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="url(#lbR)"/>
        <rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="url(#lbB)" style="mix-blend-mode:difference"/>
        <rect x="${edge}" y="${edge}" width="${w - edge * 2}" height="${h - edge * 2}" rx="${r}" fill="hsl(0 0% ${GLASS_BRIGHTNESS}% / ${GLASS_OPACITY})" style="filter:blur(${GLASS_BLUR}px)"/>
      </svg>
    `;
    lbGlassMap.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(svg)}`);
  };
  // 监听 toolbar 尺寸变化（移动/桌面切换、bar 内容变更）
  if (lbToolbar && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => requestAnimationFrame(updateGlassMap)).observe(lbToolbar);
  }
  window.addEventListener('resize', () => requestAnimationFrame(updateGlassMap));

  const apply = () => {
    lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    lbPct.textContent = Math.round(scale * 100) + '%';
    lbStage.dataset.zoomed = scale > 1.001 ? 'true' : 'false';
    lbZoomOut.disabled = scale <= MIN + 0.0001;
    lbZoomIn.disabled  = scale >= MAX - 0.0001;
    // 居中按钮：仅当有偏移时可点（无偏移时 disabled）
    if (lbCenter) lbCenter.disabled = Math.abs(tx) < 0.5 && Math.abs(ty) < 0.5;
    // 上/下一张：只有一张时禁用
    if (lbPrev) lbPrev.disabled = list.length < 2;
    if (lbNext) lbNext.disabled = list.length < 2;
  };

  const reset = () => { scale = 1; tx = 0; ty = 0; apply(); };

  // 以舞台中某点（视口坐标 cx/cy）为锚点缩放到 newScale
  const zoomAt = (cx, cy, newScale) => {
    newScale = Math.max(MIN, Math.min(MAX, newScale));
    const rect = lbStage.getBoundingClientRect();
    // 锚点相对于 stage 中心的偏移
    const ox = cx - (rect.left + rect.width / 2);
    const oy = cy - (rect.top + rect.height / 2);
    const ratio = newScale / scale;
    // 让锚点在缩放前后保持在视口同一位置：tx 也按 ratio 缩放，再让锚点位移补偿
    tx = ox - (ox - tx) * ratio;
    ty = oy - (oy - ty) * ratio;
    scale = newScale;
    apply();
  };

  // 仅平移居中（保留当前缩放）
  const center = () => {
    tx = 0; ty = 0;
    apply();
  };

  // 切换到列表中的指定 index（带边界 wrap）
  const showAt = (i) => {
    if (!list.length) return;
    index = ((i % list.length) + list.length) % list.length;
    const item = list[index];
    lbImg.src = item.src;
    lbImg.alt = item.alt || '';
    reset();
  };

  // FLIP 过渡：从源缩略图飞到目标位置（或反向）
  // 通过临时覆盖 lb-img 的 transform 实现，过渡结束后还原 apply()
  let sourceRect = null;
  const flipFrom = (rect) => {
    if (!rect) return;
    // 等图片有最终布局尺寸
    const playFlip = () => {
      const finalRect = lbImg.getBoundingClientRect();
      if (!finalRect.width || !finalRect.height) return;
      const sx = rect.width  / finalRect.width;
      const sy = rect.height / finalRect.height;
      const dx = (rect.left + rect.width  / 2) - (finalRect.left + finalRect.width  / 2);
      const dy = (rect.top  + rect.height / 2) - (finalRect.top  + finalRect.height / 2);
      // 初始状态：缩放并位移到源位置（暂时关闭 transition 避免初始也走动画）
      lbImg.style.transition = 'none';
      lbImg.style.transform = `translate(${dx}px, ${dy}px) scale(${Math.max(sx, sy)})`;
      lbImg.style.opacity = '0';
      // 下一帧恢复 transition 并清零 transform
      requestAnimationFrame(() => {
        lbImg.style.transition = '';
        lbImg.style.opacity = '';
        lbImg.style.transform = '';
        // transition 走完后 apply() 重新接管
        setTimeout(() => apply(), 380);
      });
    };
    if (lbImg.complete && lbImg.naturalWidth) {
      // 已加载，下一帧布局完成后播放
      requestAnimationFrame(playFlip);
    } else {
      lbImg.addEventListener('load', playFlip, { once: true });
    }
  };
  const flipTo = (rect, done) => {
    if (!rect) { done && done(); return; }
    const finalRect = lbImg.getBoundingClientRect();
    if (!finalRect.width || !finalRect.height) { done && done(); return; }
    const sx = rect.width  / finalRect.width;
    const sy = rect.height / finalRect.height;
    const dx = (rect.left + rect.width  / 2) - (finalRect.left + finalRect.width  / 2);
    const dy = (rect.top  + rect.height / 2) - (finalRect.top  + finalRect.height / 2);
    // 当前已是 apply 状态（可能 scale=1 居中），让 transition 接管
    lbImg.style.transform = `translate(${dx}px, ${dy}px) scale(${Math.max(sx, sy)})`;
    lbImg.style.opacity = '0';
    setTimeout(() => { done && done(); }, 320);
  };

  const open = (items, startIndex = 0, sourceEl = null) => {
    list = items.slice();
    index = startIndex;
    sourceRect = sourceEl ? sourceEl.getBoundingClientRect() : null;
    showAt(index);
    lb.hidden = false;
    requestAnimationFrame(() => { lb.dataset.open = 'true'; updateGlassMap(); });
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (sourceRect) flipFrom(sourceRect);
  };
  const close = () => {
    const finish = () => {
      lb.dataset.open = 'false';
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(() => {
        lb.hidden = true;
        lbImg.src = '';
        lbImg.style.transform = '';
        lbImg.style.opacity = '';
        lbImg.style.transition = '';
      }, 240);
    };
    // 当前如果是缩放/拖拽过的，先归位再 flip
    if (sourceRect && Math.abs(scale - 1) < 0.01 && Math.abs(tx) < 0.5 && Math.abs(ty) < 0.5) {
      flipTo(sourceRect, finish);
    } else {
      finish();
    }
  };

  // 画廊图片点击 → 收集全部图片，按 data-order（视觉"从左到右、从上到下"）排序后打开
  // 注意：DOM 中是 col0 全部 → col1 全部 …（列优先），data-order 才是原 items 视觉顺序
  if (gallery) {
    gallery.addEventListener('click', (e) => {
      const img = e.target.closest('.pd-photo img');
      if (!img) return;
      e.preventDefault();
      const all = Array.from(gallery.querySelectorAll('.pd-photo img'))
        .sort((a, b) => (+a.dataset.order || 0) - (+b.dataset.order || 0));
      const items = all.map(el => ({ src: el.src, alt: el.alt || '' }));
      const startIndex = all.indexOf(img);
      open(items, startIndex >= 0 ? startIndex : 0, img);
    });
  }

  // 关闭：按钮 / 背景（点击 stage 但未点到 img 时不关，按要求点图片是缩放）
  lbClose.addEventListener('click', close);
  lb.addEventListener('click', (e) => {
    // 点遮罩层本身（不在 stage / toolbar / close 内）
    if (e.target === lb) close();
  });
  // 键盘：ESC 关闭 / + - 缩放 / 0 居中 / ← → 切换
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === '+' || e.key === '=') lbZoomIn.click();
    else if (e.key === '-' || e.key === '_') lbZoomOut.click();
    else if (e.key === '0') center();
    else if (e.key === 'ArrowLeft')  showAt(index - 1);
    else if (e.key === 'ArrowRight') showAt(index + 1);
  });

  // 工具栏 +/−（以图片中心为锚点，即视口中心）
  lbZoomIn.addEventListener('click', () => {
    const r = lbStage.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, scale + STEP);
  });
  lbZoomOut.addEventListener('click', () => {
    const r = lbStage.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, scale - STEP);
  });

  // 居中（仅平移归零，保留当前缩放）
  if (lbCenter) lbCenter.addEventListener('click', center);
  // 上一张 / 下一张（带循环）
  if (lbPrev) lbPrev.addEventListener('click', () => showAt(index - 1));
  if (lbNext) lbNext.addEventListener('click', () => showAt(index + 1));

  // 滚轮缩放（以鼠标为锚点）—— 阻止页面滚动
  lbStage.addEventListener('wheel', (e) => {
    e.preventDefault();
    // deltaY < 0 表示向上滚 → 放大；正负方向有时被触控板反转，统一以"向上=放大"
    const direction = e.deltaY < 0 ? 1 : -1;
    // 触控板细滑：用 deltaY 比例计算步长，避免一次跳太多
    const factor = Math.exp(direction * Math.min(Math.abs(e.deltaY), 50) * 0.005);
    zoomAt(e.clientX, e.clientY, scale * factor);
  }, { passive: false });

  // 拖拽平移
  let dragging = false, dragStartX = 0, dragStartY = 0, txStart = 0, tyStart = 0;
  lbStage.addEventListener('mousedown', (e) => {
    // 单击图片切换 1× ↔ 2× 在 mouseup 处理（区分拖拽和点击）
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    txStart = tx;
    tyStart = ty;
    lbStage.dataset.dragging = 'false'; // 暂未真正拖动
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (!lbStage.dataset.dragging || lbStage.dataset.dragging === 'false') {
      // 移动超过阈值才算拖拽
      if (Math.hypot(dx, dy) < 4) return;
      lbStage.dataset.dragging = 'true';
    }
    tx = txStart + dx;
    ty = tyStart + dy;
    apply();
  });
  window.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    const wasDragging = lbStage.dataset.dragging === 'true';
    dragging = false;
    lbStage.dataset.dragging = 'false';
    if (!wasDragging) {
      // 单击图片：1× ↔ 2× 切换
      const onImg = e.target === lbImg;
      if (onImg) {
        if (scale > 1.001) reset();
        else zoomAt(e.clientX, e.clientY, 2);
      }
    }
  });

  // 触摸：单指拖拽 + 双指捏合
  let touchMode = null; // 'pan' | 'pinch'
  let panStartX = 0, panStartY = 0, panTxStart = 0, panTyStart = 0;
  let pinchStartDist = 0, pinchStartScale = 1, pinchCx = 0, pinchCy = 0;
  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const mid  = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
  lbStage.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchMode = 'pan';
      panStartX = e.touches[0].clientX;
      panStartY = e.touches[0].clientY;
      panTxStart = tx; panTyStart = ty;
    } else if (e.touches.length === 2) {
      touchMode = 'pinch';
      pinchStartDist = dist(e.touches[0], e.touches[1]);
      pinchStartScale = scale;
      const m = mid(e.touches[0], e.touches[1]);
      pinchCx = m.x; pinchCy = m.y;
    }
  }, { passive: true });
  lbStage.addEventListener('touchmove', (e) => {
    if (touchMode === 'pan' && e.touches.length === 1) {
      tx = panTxStart + (e.touches[0].clientX - panStartX);
      ty = panTyStart + (e.touches[0].clientY - panStartY);
      apply();
      e.preventDefault();
    } else if (touchMode === 'pinch' && e.touches.length === 2) {
      const d = dist(e.touches[0], e.touches[1]);
      zoomAt(pinchCx, pinchCy, pinchStartScale * (d / pinchStartDist));
      e.preventDefault();
    }
  }, { passive: false });
  lbStage.addEventListener('touchend', () => { touchMode = null; });

  apply();
})();
