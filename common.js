/* الأسئلة وطريقة الحساب — مشتركة بين الاستبيان والتقرير */
(function () {
  const RATINGS = [
    { v: 4, label: 'ممتاز', color: '#016D3C' },
    { v: 3, label: 'جيد جداً', color: '#5FA77A' },
    { v: 2, label: 'جيد', color: '#CAA22A' },
    { v: 1, label: 'ضعيف', color: '#B5523B' }
  ];

  const SECTIONS = [
    {
      id: 'trainer',
      title: 'تقييم المدرب',
      hint: 'قيّم أداء المدرب خلال الدورة.',
      items: [
        { id: 'q1', text: 'إلمام المدرب بمحتوى الدورة' },
        { id: 'q2', text: 'مدى التزام المدرب بموعد الدورة' },
        { id: 'q3', text: 'الاستجابة للأسئلة' },
        { id: 'q4', text: 'التفاعل بين المدرب والمتدربين' },
        { id: 'q5', text: 'مدى تغطية الموضوع' },
        { id: 'q6', text: 'أسلوب عرض المادة العلمية' },
        { id: 'q7', text: 'تبسيط المادة العلمية وتقديمها بطريقة مناسبة' },
        { id: 'q8', text: 'قدرة المدرب على جذب الانتباه' },
        { id: 'q9', text: 'قدرة المدرب على إدارة وقت الدورة' }
      ]
    },
    {
      id: 'benefit',
      title: 'الاستفادة من الدورة',
      hint: 'كيف انعكست الدورة على علمك وعملك؟',
      items: [
        { id: 'q10', text: 'مدى استخدام المادة العلمية في مجال عملك' },
        { id: 'q11', text: 'مدى الاستفادة العلمية التي حققتها من الدورة' }
      ]
    }
  ];

  const RECOMMEND = {
    id: 'recommend',
    text: 'هل تنصح غيرك بهذه الدورة؟',
    options: [
      { v: 'yes', label: 'نعم، بكل تأكيد' },
      { v: 'maybe', label: 'ربما' },
      { v: 'no', label: 'لا' }
    ]
  };

  const OPEN = [
    { id: 'liked', label: 'ما أعجبني في الدبلوم', ph: 'اكتب ما أعجبك…' },
    { id: 'disliked', label: 'ما لم يعجبني في الدبلوم', ph: 'ملاحظاتك تساعدنا على التحسين…' },
    { id: 'courses', label: 'دورات ترى أنها مهمة لك ولمن حولك', ph: 'اقترح دورات…' },
    { id: 'advice', label: 'نصيحة للمشرفين على الدبلوم', ph: 'نصيحتك…' }
  ];

  const ITEMS = SECTIONS.flatMap(s => s.items.map(i => ({ ...i, section: s.id })));

  const ORDINALS = ['', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'];

  const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];

  function parseDate(s) {
    if (!s) return null;
    const m = String(s).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }

  function dateRange(from, to) {
    const a = parseDate(from), b = parseDate(to);
    if (!a) return '';
    if (!b) return `${a.d} ${MONTHS[a.m - 1]} ${a.y}`;
    if (a.y === b.y && a.m === b.m) return `من ${a.d} إلى ${b.d} ${MONTHS[a.m - 1]} ${a.y}`;
    return `من ${a.d} ${MONTHS[a.m - 1]} إلى ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  }

  function counts(responses, qid) {
    const c = { 4: 0, 3: 0, 2: 0, 1: 0 };
    responses.forEach(r => { const v = +r[qid]; if (c[v] !== undefined) c[v]++; });
    return c;
  }

  function score(c) {
    const n = c[4] + c[3] + c[2] + c[1];
    if (!n) return 0;
    return ((4 * c[4] + 3 * c[3] + 2 * c[2] + c[1]) / (4 * n)) * 100;
  }

  function grade(p) {
    if (p >= 87.5) return 'ممتاز';
    if (p >= 75) return 'جيد جداً';
    if (p >= 62.5) return 'جيد';
    return 'ضعيف';
  }

  function fmt(p) {
    const r = Math.round(p * 10) / 10;
    return (Number.isInteger(r) ? r : r.toFixed(1)) + '%';
  }

  function sumCounts(list) {
    return list.reduce((a, c) => ({ 4: a[4] + c[4], 3: a[3] + c[3], 2: a[2] + c[2], 1: a[1] + c[1] }), { 4: 0, 3: 0, 2: 0, 1: 0 });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function logoImg(cls) {
    const cfg = window.ALASR_CONFIG;
    return `<img class="${cls}" src="${esc(cfg.LOGO)}" alt="${esc(cfg.INSTITUTE)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'${cls} logo-fallback',textContent:'العصر'}))">`;
  }

  // سهم العصر: الصورة الأصلية للسهم مقصوصة من الشعار (assets/arrow.png)
  // ghost = نسخة باهتة كاملة، fill = النسخة الذهبية التي تظهر تدريجياً حسب --p
  function arrowImg(cls, ghost) {
    return `<span class="arrow ${cls}" dir="ltr" aria-hidden="true">${ghost ? '<img class="ar-ghost" src="assets/arrow.png" alt="">' : ''}<img class="ar-fill" src="assets/arrow.png" alt=""></span>`;
  }

  window.ALASR = { arrowImg, RATINGS, SECTIONS, RECOMMEND, OPEN, ITEMS, ORDINALS, MONTHS, dateRange, counts, score, grade, fmt, sumCounts, esc, logoImg };
})();
