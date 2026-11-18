(function () {
  const cfg = window.ALASR_CONFIG;
  const A = window.ALASR;
  const $ = id => document.getElementById(id);
  const esc = A.esc;
  const DEMO = !cfg.API_URL;
  let DATA = null;

  /* ---------- أدوات ---------- */
  const pad2 = n => String(n).padStart(2, '0');
  function countWord(n, one, two, few, many) {
    if (n === 1) return one;
    if (n === 2) return two;
    if (n >= 3 && n <= 10) return `${n} ${few}`;
    return `${n} ${many}`;
  }
  const raters = n => countWord(n, 'مشارك واحد', 'مشاركان', 'مشاركين', 'مشاركاً');
  const ordinal = c => A.ORDINALS[c.number] || c.number || '';
  function norm(s) {
    return String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }
  function today() { const d = new Date(); return `${d.getDate()} ${A.MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
  function qrSvg(text) {
    if (typeof qrcode !== 'function') return '';
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }
  const fullLogo = () => `<img src="${esc(cfg.LOGO_FULL || cfg.LOGO)}" alt="${esc(cfg.INSTITUTE)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'logo-fallback',textContent:'${esc(cfg.INSTITUTE_SHORT)}'}))">`;
  const swoosh = () => '<img src="assets/arrow.png" alt="">';
  const gradeCls = g => ({ 'ممتاز': 'g4', 'جيد جداً': 'g3', 'جيد': 'g2', 'ضعيف': 'g1' }[g]);

  function stats(responses) {
    const items = A.ITEMS.map(it => {
      const c = A.counts(responses, it.id);
      const p = A.score(c);
      return { ...it, c, p, g: A.grade(p) };
    });
    const total = A.sumCounts(items.map(i => i.c));
    const p = A.score(total);
    const groups = A.SECTIONS.map(s => {
      const its = items.filter(i => i.section === s.id);
      const t = A.sumCounts(its.map(i => i.c));
      return { ...s, items: its, total: t, p: A.score(t) };
    });
    const rec = { yes: 0, maybe: 0, no: 0 };
    responses.forEach(r => { if (rec[r.recommend] !== undefined) rec[r.recommend]++; });
    const recN = rec.yes + rec.maybe + rec.no;
    const sorted = [...items].sort((a, b) => b.p - a.p);
    const allN = total[4] + total[3] + total[2] + total[1];
    return {
      n: responses.length, items, groups, total, p, g: A.grade(p), sorted,
      top: sorted.slice(0, 3), low: sorted.slice(-3).reverse(),
      rec, recN, recP: recN ? rec.yes / recN * 100 : null,
      exc: allN ? total[4] / allN * 100 : 0
    };
  }

  /* ---------- قطع مشتركة ---------- */
  const page = (inner, cls) => `<section class="page${cls ? ' ' + cls : ''}"><div class="band"></div>${inner}</section>`;
  const sheet = (run, inner) => page(`<div class="sheet"><div class="run"><span>${esc(run)}</span>${fullLogo()}</div>${inner}</div>`);
  const secHead = (no, title, lead) => `<div class="sec-no">${pad2(no)}</div><h2>${esc(title)}</h2>${lead ? `<p class="lead-p">${lead}</p>` : ''}`;

  function cover(o) {
    const prep = cfg.PREPARED_BY ? `<span>إعداد: ${esc(cfg.PREPARED_BY)}</span>` : '';
    return page(`<div class="cover">
      <div class="cv-logo">${fullLogo()}</div>
      <div class="cv-kicker">${esc(o.kicker)}</div>
      <h1>${esc(o.title)}</h1>
      ${o.sub ? `<div class="cv-sub">${esc(o.sub)}</div>` : ''}
      <div class="cv-meta">${o.meta.map(m => `<div><span>${esc(m[0])}</span><strong>${esc(m[1])}</strong></div>`).join('')}</div>
      <div class="cv-swoosh">${swoosh()}</div>
      <div class="cv-foot">
        <div><span>تاريخ التقرير</span><b>${today()}</b>${prep}</div>
        <div class="cv-qr-wrap"><div><span>رابط التقييم</span><b dir="ltr">${esc(cfg.SITE_URL.replace(/^https?:\/\//, ''))}</b></div><div class="cv-qr">${qrSvg(cfg.SITE_URL)}</div></div>
      </div>
    </div>`, 'cover-page');
  }

  function hero(st, text, kps) {
    return `<div class="hero">
      <div class="big">
        <div class="big-top"><div class="big-n">${A.fmt(st.p)}</div><div class="big-sw">${swoosh()}</div></div>
        <span class="grade">${st.g}</span>
        <p>${text}</p>
      </div>
      <div class="kpis">${kps.map((k, i) => `<div class="kp${i === 0 && k.main ? ' main' : ''}"><span>${esc(k.l)}</span><b>${k.v}</b></div>`).join('')}</div>
    </div>`;
  }

  function ruler(items) {
    const pos = p => Math.max(0, Math.min(100, (p - 25) / 75 * 100)).toFixed(1);
    return `<div class="ruler-head"><span></span><div class="scale"><span>ضعيف</span><span>جيد</span><span>جيد جداً</span><span>ممتاز</span></div><span></span></div>
      ${items.map(i => `<div class="ruler-row"><span>${esc(i.text)}</span><div class="rl"><i style="width:${pos(i.p)}%"></i><em style="right:${pos(i.p)}%"></em></div><b>${A.fmt(i.p)}</b></div>`).join('')}`;
  }

  function duo(st) {
    const li = list => list.map(i => `<li><span>${esc(i.text)}</span><b>${A.fmt(i.p)}</b></li>`).join('');
    return `<div class="duo">
      <div class="pn"><h4>ما نعتزّ به</h4><ol>${li(st.top)}</ol></div>
      <div class="pn warm"><h4>ما نعمل على تطويره</h4><ol>${li(st.low)}</ol></div>
    </div>`;
  }

  function hist(c) {
    const max = Math.max(1, c[4], c[3], c[2], c[1]);
    return `<div class="hist">${A.RATINGS.map(r => `<div><i style="height:${Math.round(c[r.v] / max * 30) + 2}px;background:${r.color}"></i><span>${c[r.v]}</span></div>`).join('')}</div>`;
  }

  function itemsSection(st, no) {
    const key = `<div class="key">${A.RATINGS.map(r => `<span><i style="background:${r.color}"></i>${r.label}</span>`).join('')}</div>`;
    const groups = st.groups.map(g => `
      <div class="group-h"><strong>${esc(g.title)}</strong><span>${A.fmt(g.p)} · ${A.grade(g.p)}</span></div>
      <div class="items">${g.items.map(i => `
        <div class="item"><span class="item-t">${esc(i.text)}</span>${hist(i.c)}<span class="item-p">${A.fmt(i.p)}</span><span class="chip ${gradeCls(i.g)}">${i.g}</span></div>`).join('')}
      </div>`).join('');
    return `<div class="sec">${secHead(no, 'قراءة في البنود', 'كل بند مع توزيع الإجابات عليه من ممتاز إلى ضعيف، ونسبته وتقديره.')}${key}${groups}</div>`;
  }

  function recBox(st) {
    if (!st.recN) return '';
    const parts = [['yes', 'نعم', 'var(--green)'], ['maybe', 'ربما', 'var(--gold)'], ['no', 'لا', 'var(--danger)']];
    return `<div class="recbox"><strong>${esc(A.RECOMMEND.text)}</strong>
      <div class="recbar">${parts.map(([k, l, c]) => st.rec[k] ? `<span style="width:${st.rec[k] / st.recN * 100}%;background:${c}">${l} ${st.rec[k]}</span>` : '').join('')}</div></div>`;
  }

  const THEMES = [
    { name: 'المادة العلمية والمحتوى', k: ['ماده', 'محتوي', 'موضوع', 'معلومات', 'علمي', 'محاور', 'معايير', 'عقود', 'فقه', 'شرعي'] },
    { name: 'المدرب وطريقة العرض', k: ['مدرب', 'دكتور', 'استاذ', 'شيخ', 'اسلوب', 'شرح', 'تفاعل', 'القاء', 'عرض', 'تبسيط'] },
    { name: 'الوقت والتنظيم', k: ['وقت', 'توقيت', 'مده', 'موعد', 'استراحه', 'تنظيم', 'طول', 'ساع', 'قصير', 'طويل', 'جدول'] },
    { name: 'الجانب التطبيقي', k: ['تطبيق', 'عملي', 'امثله', 'مثال', 'حالات', 'واقع', 'تمارين', 'ورش'] }
  ];
  function uniq(texts) {
    const m = new Map();
    texts.forEach(t => { const k = norm(t).replace(/[\s.،,!؟?]+/g, ' ').trim(); const e = m.get(k); e ? e.n++ : m.set(k, { t, n: 1 }); });
    return [...m.values()].sort((a, b) => b.n - a.n);
  }
  const rep = n => n > 1 ? `<span class="rep">×${n}</span>` : '';
  function themed(texts) {
    const groups = THEMES.map(t => ({ ...t, items: [] }));
    const other = { name: 'ملاحظات عامة', items: [] };
    texts.forEach(t => { const n = norm(t); (groups.find(g => g.k.some(k => n.includes(k))) || other).items.push(t); });
    return groups.concat([other]).filter(g => g.items.length);
  }

  function voiceSection(responses, no, st) {
    const pick = id => responses.map(r => String(r[id] || '').trim()).filter(Boolean);
    const block = (title, texts, mode) => {
      if (!texts.length) return '';
      let body;
      if (mode === 'themes') body = `<div class="themes">${themed(texts).map(g => `<div class="theme"><h4>${esc(g.name)}<span>${g.items.length}</span></h4><ul>${uniq(g.items).map(x => `<li>${esc(x.t)}${rep(x.n)}</li>`).join('')}</ul></div>`).join('')}</div>`;
      else if (mode === 'tags') body = `<div class="tags">${uniq(texts).map(x => `<span class="tag">${esc(x.t)}${x.n > 1 ? `<b>×${x.n}</b>` : ''}</span>`).join('')}</div>`;
      else body = `<ul class="plain">${uniq(texts).map(x => `<li>${esc(x.t)}${rep(x.n)}</li>`).join('')}</ul>`;
      return `<div class="voice"><h3>${esc(title)} <span class="cnt">${texts.length}</span></h3>${body}</div>`;
    };
    const html = (st ? recBox(st) : '') + block('ما نعتزّ به بشهادة المشاركين', pick('liked'), 'themes')
      + block('ما يحتاج إلى تحسين', pick('disliked'), 'themes')
      + block('توجيهات للإدارة', pick('advice'), 'plain')
      + block('دورات يطلبها المشاركون', pick('courses'), 'tags');
    return html ? `<div class="sec">${secHead(no, 'صوت المشاركين', 'ما كتبه المشاركون بكلماتهم، مجمّعاً حسب الموضوع، والجمل المتكررة تظهر مرة واحدة مع عددها.')}${html}</div>` : '';
  }

  const ADVICE = {
    q1: 'تزويد المدرب بخطة الدورة ومحاورها مبكراً، وتنسيق المحتوى مع إدارة الدبلوم.',
    q2: 'تثبيت مواعيد البدء والانتهاء وإرسال تذكير قبل كل جلسة.',
    q3: 'تخصيص وقت ثابت للأسئلة في نهاية كل محور.',
    q4: 'إدخال أنشطة تفاعلية قصيرة: أسئلة مباشرة، ونقاش في مجموعات، واستطلاعات سريعة.',
    q5: 'مراجعة محاور الدورة مع المدرب لضمان تغطية الموضوع كاملاً.',
    q6: 'تنويع وسائل العرض بين الشرائح والأمثلة والحالات العملية.',
    q7: 'ربط المفاهيم بأمثلة من واقع المصارف والمؤسسات المالية الإسلامية.',
    q8: 'تقسيم الجلسات إلى مقاطع أقصر مع فواصل وأنشطة تجدد الانتباه.',
    q9: 'وضع جدول زمني لكل محور ومتابعته أثناء الجلسة.',
    q10: 'زيادة التطبيقات العملية ودراسات الحالة المرتبطة بمجال عمل المشاركين.',
    q11: 'إضافة ملخصات ومراجع للتوسع بعد الدورة.'
  };
  function stepsSection(st, no) {
    const weak = st.items.filter(i => i.p < 90).sort((a, b) => a.p - b.p).slice(0, 4);
    const list = (weak.length ? weak : st.low.slice(0, 2))
      .map(i => `<li><div><strong>${esc(i.text)}</strong><p>${esc(ADVICE[i.id])}</p></div><span class="sp">${A.fmt(i.p)}</span></li>`).join('');
    return `<div class="sec">${secHead(no, 'خطوات التطوير', 'مقترحات عملية تبدأ من البنود الأقل تقييماً.')}
      <ol class="steps-list">${list}</ol>
      <div class="closing"><div><p>شكراً للمشاركين على وقتهم وصدق آرائهم، ونسأل الله أن ينفع بهذا الدبلوم.</p><span>${esc(cfg.INSTITUTE)}</span></div><div class="cl-sw">${swoosh()}</div></div>
    </div>`;
  }

  function appendix(st, no) {
    const rows = st.items.map(i => `<tr><td class="t">${esc(i.text)}</td>${[4, 3, 2, 1].map(v => `<td>${i.c[v]}</td>`).join('')}<td><b>${A.fmt(i.p)}</b></td><td>${i.g}</td></tr>`).join('');
    return `<div class="sec">${secHead(no, 'ملحق: الأعداد التفصيلية', 'عدد الإجابات لكل تقدير. النسبة = مجموع النقاط (ممتاز 4، جيد جداً 3، جيد 2، ضعيف 1) ÷ أعلى مجموع ممكن.')}
      <table class="tbl"><thead><tr><th class="t">البند</th><th>ممتاز</th><th>جيد جداً</th><th>جيد</th><th>ضعيف</th><th>النسبة</th><th>التقدير</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td class="t">المجموع</td>${[4, 3, 2, 1].map(v => `<td>${st.total[v]}</td>`).join('')}<td>${A.fmt(st.p)}</td><td>${st.g}</td></tr></tfoot></table></div>`;
  }

  /* ---------- تقرير الدورة ---------- */
  function courseReport(c, responses) {
    const st = stats(responses);
    const run = `تقرير تقييم الدورة ${ordinal(c)} · ${c.title}`;
    const text = `قيّم ${raters(st.n)} دورة «${esc(c.title)}» مع ${esc(c.trainer)}، وجاءت النتيجة العامة بتقدير <b>${st.g}</b>. ` +
      `أبرز ما تميّزت به الدورة «${esc(st.top[0].text)}» بنسبة ${A.fmt(st.top[0].p)}، ويبقى «${esc(st.low[0].text)}» أوسع مساحة للتطوير.`;
    const kps = [];
    if (st.recP !== null) kps.push({ l: 'ينصحون غيرهم بالدورة', v: A.fmt(st.recP), main: true });
    st.groups.forEach(g => kps.push({ l: g.id === 'trainer' ? 'تقييم أداء المدرب' : g.title, v: A.fmt(g.p) }));
    kps.push({ l: 'نسبة تقدير «ممتاز»', v: A.fmt(st.exc) });
    return cover({
      kicker: `تقرير تقييم الدورة ${ordinal(c)}`,
      title: c.title, sub: c.diploma,
      meta: [['المدرب', c.trainer], ['مدة الدورة', A.dateRange(c.from, c.to).replace(/^من /, '')], ['عدد المقيّمين', String(st.n)]]
    })
      + sheet(run, `<div class="sec">${secHead(1, 'خلاصة التقييم')}${hero(st, text, kps)}</div>
          <div class="sec"><h3>موقع كل بند على المسطرة <small>من ضعيف (25%) إلى ممتاز (100%)</small></h3>${ruler(st.sorted)}${duo(st)}</div>`)
      + sheet(run, itemsSection(st, 2))
      + (voiceSection(responses, 3, st) ? sheet(run, voiceSection(responses, 3, st)) : '')
      + sheet(run, stepsSection(st, voiceSection(responses, 3, st) ? 4 : 3))
      + sheet(run, appendix(st, voiceSection(responses, 3, st) ? 5 : 4));
  }

  /* ---------- تقرير الدبلوم ---------- */
  function pathChart(per) {
    const W = 600, H = 210, padX = 50, top = 30, bottom = 160;
    const ys = p => bottom - (Math.max(60, Math.min(100, p)) - 60) / 40 * (bottom - top);
    const xs = i => per.length === 1 ? W / 2 : padX + i * (W - 2 * padX) / (per.length - 1);
    const pts = per.map((x, i) => [xs(i), ys(x.st.p)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${bottom} L${pts[0][0].toFixed(1)},${bottom} Z`;
    const grid = [70, 80, 90, 100].map(v => `<line x1="20" x2="${W - 10}" y1="${ys(v)}" y2="${ys(v)}" stroke="#EFE6CC" stroke-width="1"/><text x="${W - 6}" y="${ys(v) + 4}" font-size="10" fill="#6B7268" text-anchor="start">${v}%</text>`).join('');
    const dots = per.map((x, i) => `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="7" fill="#CAA22A" stroke="#fff" stroke-width="3"/>
      <text x="${pts[i][0]}" y="${pts[i][1] - 14}" font-size="13" font-weight="800" fill="#0B3B26" text-anchor="middle">${A.fmt(x.st.p)}</text>
      <text x="${pts[i][0]}" y="${bottom + 22}" font-size="12" font-weight="700" fill="#0B3B26" text-anchor="middle">الدورة ${esc(ordinal(x.c))}</text>
      <text x="${pts[i][0]}" y="${bottom + 38}" font-size="11" fill="#6B7268" text-anchor="middle">${esc(x.c.trainer)}</text>`).join('');
    return `<div class="path"><h3>مسار الدبلوم <small>النتيجة العامة لكل دورة بالترتيب</small></h3>
      <svg viewBox="0 0 ${W} ${H}" dir="ltr" font-family="Tajawal, sans-serif">${grid}<path d="${area}" fill="rgba(1,109,60,.07)"/><path d="${line}" fill="none" stroke="#016D3C" stroke-width="3" stroke-linejoin="round"/>${dots}</svg></div>`;
  }

  function diplomaReport(courses, responses) {
    const per = courses.map(c => ({ c, r: responses.filter(x => x.courseId === c.id) })).filter(x => x.r.length).map(x => ({ ...x, st: stats(x.r) }));
    const allR = responses.filter(r => per.some(p => p.c.id === r.courseId));
    const all = stats(allR);
    const ranked = [...per].sort((a, b) => b.st.p - a.st.p);
    const first = per[0].c;
    const run = `التقرير الشامل · ${first.diploma}`;
    const text = `جمع الدبلوم حتى الآن ${countWord(all.n, 'تقييماً واحداً', 'تقييمين', 'تقييمات', 'تقييماً')} في ${countWord(per.length, 'دورة واحدة', 'دورتين', 'دورات', 'دورة')}، بتقدير عام <b>${all.g}</b>. ` +
      `وكانت أعلى دورة تقييماً «${esc(ranked[0].c.title)}» مع ${esc(ranked[0].c.trainer)} بنسبة ${A.fmt(ranked[0].st.p)}.`;
    const kps = [];
    if (all.recP !== null) kps.push({ l: 'ينصحون غيرهم بالدبلوم', v: A.fmt(all.recP), main: true });
    kps.push({ l: 'عدد الدورات المقيّمة', v: String(per.length) }, { l: 'إجمالي التقييمات', v: String(all.n) }, { l: 'نسبة تقدير «ممتاز»', v: A.fmt(all.exc) });
    const rank = ranked.map((x, i) => `<div class="rank-row"><span class="rank-n">${pad2(i + 1)}</span>
      <div class="rank-info"><strong>${esc(x.c.trainer)}</strong><span>الدورة ${esc(ordinal(x.c))}: ${esc(x.c.title)} · ${raters(x.st.n)}</span></div>
      <div class="rl"><i style="width:${((x.st.p - 25) / 75 * 100).toFixed(1)}%"></i><em style="right:${((x.st.p - 25) / 75 * 100).toFixed(1)}%"></em></div><b>${A.fmt(x.st.p)}</b></div>`).join('');
    const heat = v => { const t = Math.max(0, Math.min(1, (v - 60) / 40)); return `background:rgba(1,109,60,${(0.08 + t * 0.82).toFixed(2)});color:${t > .55 ? '#fff' : 'var(--ink)'}`; };
    const matrix = `<table class="heat"><thead><tr><th class="t">البند</th>${per.map(p => `<th>${esc(p.c.trainer)}</th>`).join('')}<th>الدبلوم</th></tr></thead>
      <tbody>${A.ITEMS.map((it, k) => `<tr><td class="t">${esc(it.text)}</td>${per.map(p => `<td style="${heat(p.st.items[k].p)}">${A.fmt(p.st.items[k].p)}</td>`).join('')}<td style="background:var(--paper)">${A.fmt(all.items[k].p)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td class="t"><b>النتيجة العامة</b></td>${per.map(p => `<td>${A.fmt(p.st.p)}</td>`).join('')}<td>${A.fmt(all.p)}</td></tr></tfoot></table>
      <div class="heat-key"><span>أعلى</span><i></i><span>أقل</span></div>`;
    const appRows = per.map(x => `<tr><td class="t">الدورة ${esc(ordinal(x.c))}: ${esc(x.c.title)}</td><td>${esc(x.c.trainer)}</td><td>${x.st.n}</td><td>${x.st.recP === null ? '—' : A.fmt(x.st.recP)}</td><td><b>${A.fmt(x.st.p)}</b></td><td>${x.st.g}</td></tr>`).join('');
    return cover({
      kicker: 'التقرير الشامل للدبلوم', title: first.diploma,
      sub: `${countWord(per.length, 'دورة واحدة', 'دورتان', 'دورات', 'دورة')} حتى الآن`,
      meta: [['عدد الدورات', String(per.length)], ['إجمالي التقييمات', String(all.n)], ['النتيجة العامة', `${A.fmt(all.p)} · ${all.g}`]]
    })
      + sheet(run, `<div class="sec">${secHead(1, 'خلاصة الدبلوم')}${hero(all, text, kps)}${pathChart(per)}</div>`)
      + sheet(run, `<div class="sec">${secHead(2, 'المدربون والبنود', 'ترتيب الدورات، ثم كل بند عند كل مدرب: كلما كان اللون أغمق كان التقييم أعلى.')}<h3>ترتيب الدورات</h3>${rank}<h3 style="margin-top:8mm">البنود عند كل مدرب</h3>${matrix}</div>`)
      + (voiceSection(allR, 3, all) ? sheet(run, voiceSection(allR, 3, all)) : '')
      + sheet(run, stepsSection(all, 4))
      + sheet(run, `<div class="sec">${secHead(5, 'ملحق: ملخص الدورات')}<table class="tbl"><thead><tr><th class="t">الدورة</th><th>المدرب</th><th>المقيّمون</th><th>ينصحون</th><th>النتيجة</th><th>التقدير</th></tr></thead><tbody>${appRows}</tbody></table></div>`);
  }

  /* ---------- التشغيل ---------- */
  function render() {
    const v = $('scope').value;
    const doc = $('doc');
    if (v === 'all') {
      doc.innerHTML = diplomaReport(DATA.courses, DATA.responses);
      document.title = 'التقرير الشامل للدبلوم';
    } else {
      const c = DATA.courses.find(x => x.id === v);
      const r = DATA.responses.filter(x => x.courseId === v);
      doc.innerHTML = r.length ? courseReport(c, r) : page('<div class="sheet empty"><h2>لا توجد تقييمات لهذه الدورة بعد</h2></div>');
      document.title = `تقرير تقييم ${c.title} - ${c.trainer}`;
    }
  }

  function fillScope() {
    const withResp = DATA.courses.filter(c => DATA.responses.some(r => r.courseId === c.id));
    const opts = DATA.courses.map(c => {
      const n = DATA.responses.filter(r => r.courseId === c.id).length;
      return `<option value="${esc(c.id)}">الدورة ${esc(ordinal(c))}: ${esc(c.trainer)} (${n})</option>`;
    });
    if (withResp.length >= 2) opts.push('<option value="all">التقرير الشامل للدبلوم</option>');
    $('scope').innerHTML = opts.join('');
    const want = new URLSearchParams(location.search).get('scope');
    const pick = withResp.find(c => c.active) || [...withResp].pop();
    if (want && [...$('scope').options].some(o => o.value === want)) $('scope').value = want;
    else if (pick) $('scope').value = pick.id;
    $('scope').onchange = render;
  }

  async function fetchData(key) {
    const r = await fetch(`${cfg.API_URL}?action=report&key=${encodeURIComponent(key)}`);
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    return d;
  }

  function demoData() {
    let s = 20261106;
    const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const rating = b => { const x = rnd() + b; return x > .62 ? 4 : x > .38 ? 3 : x > .14 ? 2 : 1; };
    const liked = ['الإلمام الكبير بالمعايير الشرعية وربطها بالواقع', 'أسلوب الدكتور في الشرح وتبسيط العقود', 'الأمثلة العملية من المصارف الإسلامية', 'تنوع المحاور وغنى المادة العلمية', 'التنظيم والالتزام بالمواعيد', 'التفاعل والإجابة عن كل الأسئلة'];
    const disliked = ['قصر مدة الدورة مقارنة بحجم المحتوى', 'الاستراحات قصيرة', 'نحتاج تمارين تطبيقية أكثر', 'التوقيت لا يناسب بعض البلدان', 'سرعة العرض في بعض المحاور'];
    const advice = ['الاستمرار في هذا المستوى', 'إرسال المادة العلمية قبل الدورة', 'إضافة ورش عمل تطبيقية'];
    const courses = ['صناعة الفتوى في المعاملات المالية', 'التدقيق الشرعي في المصارف', 'الصكوك الإسلامية', 'محاسبة المؤسسات المالية الإسلامية'];
    const responses = [];
    cfg.DEMO_COURSES.forEach((c, ci) => {
      const n = ci === 0 ? 18 : 14;
      for (let k = 0; k < n; k++) {
        const o = { courseId: c.id };
        A.ITEMS.forEach((it, j) => { o[it.id] = rating(.18 - ci * .05 - (j === 7 || j === 8 ? .12 : 0)); });
        const x = rnd(); o.recommend = x < .86 - ci * .1 ? 'yes' : x < .95 ? 'maybe' : 'no';
        o.liked = rnd() < .6 ? liked[Math.floor(rnd() * liked.length)] : '';
        o.disliked = rnd() < .45 ? disliked[Math.floor(rnd() * disliked.length)] : '';
        o.advice = rnd() < .3 ? advice[Math.floor(rnd() * advice.length)] : '';
        o.courses = rnd() < .35 ? courses[Math.floor(rnd() * courses.length)] : '';
        responses.push(o);
      }
    });
    return { courses: cfg.DEMO_COURSES, responses };
  }

  function start(data) {
    DATA = data;
    $('login').hidden = true;
    $('toolbar').hidden = false;
    if (!DATA.courses.length) { $('doc').innerHTML = page('<div class="sheet empty"><h2>لا توجد دورات في الجدول بعد</h2></div>'); return; }
    fillScope();
    render();
  }

  $('printBtn').addEventListener('click', () => window.print());

  (async function init() {
    if (DEMO) {
      document.body.insertAdjacentHTML('beforeend', '<div class="demo-flag no-print">بيانات تجريبية</div>');
      start(demoData());
      return;
    }
    $('toolbar').hidden = true;
    $('loginLogo').innerHTML = fullLogo();
    let saved = '';
    try { saved = sessionStorage.getItem('alasr_key') || ''; } catch (e) {}
    const tryKey = async key => {
      try {
        const d = await fetchData(key);
        try { sessionStorage.setItem('alasr_key', key); } catch (e) {}
        start(d);
      } catch (e) {
        $('login').hidden = false;
        $('loginErr').textContent = e.message === 'unauthorized' ? 'كلمة السر غير صحيحة.' : (key ? 'تعذّر تحميل البيانات. تحققي من الاتصال.' : '');
      }
    };
    $('loginForm').addEventListener('submit', e => { e.preventDefault(); tryKey($('key').value.trim()); });
    if (saved) tryKey(saved); else $('login').hidden = false;
  })();
})();
