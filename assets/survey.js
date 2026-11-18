(function () {
  const cfg = window.ALASR_CONFIG;
  const A = window.ALASR;
  const $ = id => document.getElementById(id);
  const esc = A.esc;
  const DEMO = !cfg.API_URL;

  let course = null;
  let i = 0; // رقم الشاشة الحالية
  const answers = {};
  const open = {};

  // الشاشات: ترحيب ← ١١ سؤال تقييم ← سؤال النصيحة ← الأسئلة المفتوحة
  const SCREENS = [{ kind: 'welcome' }]
    .concat(A.SECTIONS.flatMap(s => s.items.map(it => ({ kind: 'rate', item: it, section: s }))))
    .concat([{ kind: 'recommend' }, { kind: 'open' }]);
  const TOTAL_Q = SCREENS.length - 1; // بدون شاشة الترحيب

  const ICON = {
    arrow: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    list: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    yes: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    maybe: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    no: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
  };

  /* ---------- أدوات ---------- */
  function deviceId() {
    try {
      let id = localStorage.getItem('alasr_device');
      if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
        localStorage.setItem('alasr_device', id);
      }
      return id;
    } catch (e) { return 'anon-' + Math.random().toString(36).slice(2); }
  }
  const doneKey = id => 'alasr_done_' + id;
  function alreadyDone(id) { try { return localStorage.getItem(doneKey(id)) === '1'; } catch (e) { return false; } }
  function markDone(id) { try { localStorage.setItem(doneKey(id), '1'); } catch (e) {} }

  function initials(name) {
    return String(name || '').replace(/^(د\.|أ\.|الشيخ|الدكتور|الأستاذ)\s*/, '').trim().charAt(0) || '؟';
  }

  async function loadCourse() {
    if (DEMO) return cfg.DEMO_COURSES.find(c => c.active) || cfg.DEMO_COURSES[0];
    const r = await fetch(cfg.API_URL + '?action=active');
    return (await r.json()).course || null;
  }

  /* ---------- لوحة الهوية ---------- */
  function renderPanel() {
    $('plate').innerHTML = A.logoImg('logo');
    $('panelMark').innerHTML = A.arrowImg('mark');
    $('growthSvg').innerHTML = A.arrowImg('growth-arrow', true);
    if (!course) {
      $('diploma').textContent = cfg.INSTITUTE;
      $('courseTitle').textContent = 'لا يوجد تقييم مفتوح حالياً';
      $('growth').hidden = true;
      return;
    }
    document.title = `تقييم ${course.title} | ${cfg.INSTITUTE_SHORT}`;
    $('diploma').textContent = course.diploma;
    $('courseTitle').textContent = course.title;
    $('courseNo').textContent = 'الدورة ' + (A.ORDINALS[course.number] || course.number || '');
    $('dates').textContent = A.dateRange(course.from, course.to);
    $('trainerName').textContent = course.trainer;
    $('trainerTitle').textContent = course.trainerTitle || '';
    $('trainerPhoto').innerHTML = course.photo
      ? `<img src="${esc(course.photo)}" alt="" onerror="this.parentNode.textContent='${esc(initials(course.trainer))}'">`
      : esc(initials(course.trainer));
    $('trainer').hidden = false;
  }

  // سهم النمو: يتقدّم مع كل إجابة
  function setGrowth(frac, label, count) {
    const ar = document.querySelector('.growth-arrow');
    if (ar) ar.style.setProperty('--p', (frac * 100).toFixed(1) + '%');
    $('growth').classList.toggle('full', frac >= 1);
    $('progLabel').textContent = label;
    $('progCount').textContent = count;
  }

  /* ---------- الشاشات ---------- */
  function welcome() {
    const n = A.ITEMS.length + 1;
    return `<p class="kicker">نموذج تقييم الدورة ${esc(A.ORDINALS[course.number] || '')}</p>
      <h2>رأيك اليوم يصنع دورة الغد</h2>
      <p class="lead">نقيس معك جودة الدورة وأثرها، لنطوّر الدبلوم خطوة بخطوة. لا نطلب اسمك، وإجاباتك تُستخدم لتطوير الدبلوم فقط.</p>
      <ul class="facts">
        <li>${ICON.list}${n} سؤالاً سريعاً</li>
        <li>${ICON.clock}أقل من ٣ دقائق</li>
        <li>${ICON.lock}بدون اسم</li>
      </ul>
      <button class="btn btn-primary" data-act="next">ابدأ التقييم ${ICON.arrow}</button>`;
  }

  function rate(s) {
    const it = s.item;
    const num = A.ITEMS.findIndex(x => x.id === it.id) + 1;
    const steps = A.RATINGS.map(r => `
      <button type="button" class="step" role="radio" data-v="${r.v}" aria-checked="${answers[it.id] === r.v}">
        <span class="s-label">${r.label}</span><span class="s-key">${r.v}</span>
      </button>`).join('');
    return `<div class="q-meta"><span class="q-num">السؤال <b>${num}</b> من ${TOTAL_Q - 1}</span><span class="q-sec">${esc(s.section.title)}</span></div>
      <h2 id="qt">${esc(it.text)}</h2>
      <div class="steps" role="radiogroup" aria-labelledby="qt">${steps}</div>
      <div class="nav">${backBtn()}<span class="q-num">اختر تقديرك للمتابعة</span></div>`;
  }

  function recommend() {
    const R = A.RECOMMEND;
    const opts = R.options.map(o => `
      <button type="button" class="choice" role="radio" data-v="${o.v}" aria-checked="${answers[R.id] === o.v}">
        <span class="c-ico">${ICON[o.v]}</span>${esc(o.label)}
      </button>`).join('');
    return `<div class="q-meta"><span class="q-num">السؤال <b>${TOTAL_Q - 1}</b> من ${TOTAL_Q - 1}</span><span class="q-sec">رأيك العام</span></div>
      <h2 id="qt">${esc(R.text)}</h2>
      <div class="choices" role="radiogroup" aria-labelledby="qt">${opts}</div>
      <div class="nav">${backBtn()}</div>`;
  }

  function openScreen() {
    const fields = A.OPEN.map(o => `
      <div class="field"><label for="${o.id}">${esc(o.label)} <span class="optional">(اختياري)</span></label>
      <textarea id="${o.id}" maxlength="1500" placeholder="${esc(o.ph)}">${esc(open[o.id] || '')}</textarea></div>`).join('');
    return `<p class="kicker">الخطوة الأخيرة</p>
      <h2>كلمة منك تصنع الفرق</h2>
      <p class="lead" style="margin-bottom:0">كل الأسئلة هنا اختيارية، اكتب ما تحب.</p>
      <div class="fields">${fields}</div>
      <p class="error-msg" id="err" role="alert"></p>
      <div class="nav">${backBtn()}<button class="btn btn-primary" data-act="submit">إرسال التقييم ${ICON.arrow}</button></div>`;
  }

  function backBtn() { return `<button type="button" class="btn btn-text" data-act="back">${ICON.back} السابق</button>`; }

  function show(n, instant) {
    i = Math.max(0, Math.min(SCREENS.length - 1, n));
    const s = SCREENS[i];
    const html = s.kind === 'welcome' ? welcome() : s.kind === 'rate' ? rate(s) : s.kind === 'recommend' ? recommend() : openScreen();
    const stage = $('stage');
    const old = stage.firstElementChild;
    const put = () => {
      stage.innerHTML = `<section class="screen">${html}</section>`;
      const h = stage.querySelector('h2');
      if (h && i > 0) { h.tabIndex = -1; h.style.outline = 'none'; h.focus({ preventScroll: true }); }
    };
    if (old && !instant) { old.classList.add('leaving'); setTimeout(put, 180); } else put();

    const answered = A.ITEMS.filter(it => answers[it.id]).length + (answers.recommend ? 1 : 0);
    const label = s.kind === 'welcome' ? 'البداية' : s.kind === 'open' ? 'الملاحظات' : (s.section ? s.section.title : 'رأيك العام');
    setGrowth(answered / TOTAL_Q, label, i === 0 ? `${TOTAL_Q - 1} سؤالاً` : `${answered} / ${TOTAL_Q - 1}`);
    if (window.matchMedia('(max-width: 899px)').matches && i > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function pick(btn) {
    const s = SCREENS[i];
    const id = s.kind === 'rate' ? s.item.id : A.RECOMMEND.id;
    const v = s.kind === 'rate' ? +btn.dataset.v : btn.dataset.v;
    answers[id] = v;
    btn.parentElement.querySelectorAll('[role=radio]').forEach(b => b.setAttribute('aria-checked', String(b === btn)));
    clearTimeout(pick.t);
    pick.t = setTimeout(() => show(i + 1), 380);
  }

  function saveOpen() {
    A.OPEN.forEach(o => { const el = $(o.id); if (el) open[o.id] = el.value.trim(); });
  }

  async function submit(btn) {
    saveOpen();
    const missing = A.ITEMS.findIndex(it => !answers[it.id]);
    if (missing >= 0) { show(missing + 1); return; }
    if (!answers.recommend) { show(SCREENS.findIndex(s => s.kind === 'recommend')); return; }
    btn.disabled = true; btn.innerHTML = 'جارٍ الإرسال…';
    const payload = { courseId: course.id, device: deviceId(), answers: {}, open: { ...open } };
    A.ITEMS.forEach(it => { payload.answers[it.id] = answers[it.id]; });
    payload.answers.recommend = answers.recommend;
    try {
      if (DEMO) await new Promise(r => setTimeout(r, 700));
      else {
        const r = await fetch(cfg.API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await r.json();
        if (!res.ok && res.error !== 'duplicate') throw new Error(res.error || 'failed');
      }
      markDone(course.id);
      thanks(false);
    } catch (e) {
      btn.disabled = false; btn.innerHTML = 'إرسال التقييم ' + ICON.arrow;
      $('err').textContent = 'تعذّر الإرسال. تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى.';
    }
  }

  function thanks(before) {
    setGrowth(1, 'اكتمل التقييم', '');
    $('stage').innerHTML = `<section class="screen">
      ${A.arrowImg('done-arrow')}
      <h2>${before ? 'سبق أن قيّمت هذه الدورة' : 'وصل تقييمك، شكراً لك'}</h2>
      <p class="lead">${before ? 'تم استلام تقييمك لهذه الدورة من قبل. نلقاك في الدورة القادمة بإذن الله.' : 'رأيك أمانة نعتزّ بها، وسيكون له أثر في تطوير الدورات القادمة من الدبلوم.'}</p>
      <p class="dua">جزاكم الله خيراً ونفع بكم</p>
      <p class="foot">${esc(cfg.INSTITUTE)}</p>
    </section>`;
  }

  /* ---------- الأحداث ---------- */
  $('stage').addEventListener('click', e => {
    const radio = e.target.closest('[role=radio]');
    if (radio) return pick(radio);
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'next') show(i + 1);
    if (act.dataset.act === 'back') { saveOpen(); show(i - 1); }
    if (act.dataset.act === 'submit') submit(act);
  });

  // لوحة المفاتيح: ١–٤ للتقييم
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'TEXTAREA' || !course) return;
    const s = SCREENS[i];
    if (s && s.kind === 'rate' && /^[1-4]$/.test(e.key)) {
      const b = $('stage').querySelector(`.step[data-v="${e.key}"]`);
      if (b) pick(b);
    }
  });

  (async function init() {
    if (DEMO) document.body.insertAdjacentHTML('beforeend', '<div class="demo-flag">وضع تجريبي</div>');
    try { course = await loadCourse(); } catch (e) { course = null; }
    renderPanel();
    if (!course) {
      $('stage').innerHTML = `<section class="screen"><h2>شكراً لاهتمامك</h2><p class="lead">لا يوجد نموذج تقييم مفتوح في الوقت الحالي. يُفتح التقييم مع نهاية كل دورة.</p></section>`;
      return;
    }
    if (!DEMO && alreadyDone(course.id)) return thanks(true);
    // معاينة شاشة معيّنة في الوضع التجريبي فقط، مثل: index.html#3
    const jump = DEMO ? parseInt(location.hash.slice(1), 10) : NaN;
    if (jump > 0) {
      A.ITEMS.slice(0, Math.min(jump - 1, A.ITEMS.length)).forEach((it, k) => { answers[it.id] = 4 - (k % 2); });
      if (jump === SCREENS.length - 1) answers.recommend = 'yes';
    }
    show(jump > 0 ? jump : 0, true);
  })();
})();
