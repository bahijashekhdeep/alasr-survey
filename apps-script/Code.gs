/**
 * الخادم المجاني للاستبيان — يعمل داخل Google Sheets عبر Apps Script.
 * التركيب: الإضافات ← Apps Script ← الصقي هذا الملف ← شغّلي الدالة setup مرة واحدة ← انشري كـ Web app.
 */

/** @OnlyCurrentDoc */
// السطر السابق يجعل الإذن لهذا الجدول فقط، لا لكل ملفات الحساب.

const SHEET_COURSES = 'الدورات';
const SHEET_RESP = 'الإجابات';

const COURSE_HEADERS = ['المعرّف', 'الدبلوم', 'رقم الدورة', 'عنوان الدورة', 'المدرب', 'صفة المدرب', 'من تاريخ', 'إلى تاريخ', 'رابط صورة المدرب', 'فعّالة'];

const ITEMS = [
  ['q1', 'إلمام المدرب بمحتوى الدورة'],
  ['q2', 'مدى التزام المدرب بموعد الدورة'],
  ['q3', 'الاستجابة للأسئلة'],
  ['q4', 'التفاعل بين المدرب والمتدربين'],
  ['q5', 'مدى تغطية الموضوع'],
  ['q6', 'أسلوب عرض المادة العلمية'],
  ['q7', 'تبسيط المادة العلمية وتقديمها بطريقة مناسبة'],
  ['q8', 'قدرة المدرب على جذب الانتباه'],
  ['q9', 'قدرة المدرب على إدارة وقت الدورة'],
  ['q10', 'مدى استخدام المادة العلمية في مجال عملك'],
  ['q11', 'مدى الاستفادة العلمية التي حققتها من الدورة']
];
const OPEN = [['liked', 'ما أعجبني'], ['disliked', 'ما لم يعجبني'], ['courses', 'دورات مقترحة'], ['advice', 'نصيحة للمشرفين']];
const LABELS = { 4: 'ممتاز', 3: 'جيد جداً', 2: 'جيد', 1: 'ضعيف' };
const VALUES = { 'ممتاز': 4, 'جيد جداً': 3, 'جيد': 2, 'ضعيف': 1 };
const REC_LABELS = { yes: 'نعم', maybe: 'ربما', no: 'لا' };
const REC_VALUES = { 'نعم': 'yes', 'ربما': 'maybe', 'لا': 'no' };

const RESP_HEADERS = ['الوقت', 'معرّف الدورة']
  .concat(ITEMS.map(i => i[1]))
  .concat(['هل تنصح بالدورة'])
  .concat(OPEN.map(o => o[1]))
  .concat(['الجهاز']);

/** شغّليها مرة واحدة من المحرر لإنشاء الأوراق وكلمة سر التقرير */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let c = ss.getSheetByName(SHEET_COURSES) || ss.insertSheet(SHEET_COURSES);
  if (c.getLastRow() === 0) {
    c.appendRow(COURSE_HEADERS);
    c.appendRow(['c1', 'دبلوم الاقتصاد الإسلامي والرقابة الشرعية', 1, 'عقود التمويل وقواعد المعايير الشرعية', 'د. فضل مراد', '', '2026-11-06', '2026-11-08', '', 'نعم']);
    c.getRange('G:H').setNumberFormat('@');
    styleHeader(c, COURSE_HEADERS.length);
  }
  let r = ss.getSheetByName(SHEET_RESP) || ss.insertSheet(SHEET_RESP);
  if (r.getLastRow() === 0) {
    r.appendRow(RESP_HEADERS);
    styleHeader(r, RESP_HEADERS.length);
  }
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_KEY')) {
    const key = Utilities.getUuid().slice(0, 8);
    props.setProperty('ADMIN_KEY', key);
  }
  Logger.log('كلمة سر التقرير: ' + props.getProperty('ADMIN_KEY'));
}

function styleHeader(sheet, n) {
  sheet.setRightToLeft(true);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#016D3C').setFontColor('#FFFFFF');
}

function doGet(e) {
  const action = (e.parameter.action || '').trim();
  if (action === 'active') {
    const course = readCourses().find(c => c.active) || null;
    return json({ course: course });
  }
  if (action === 'report') {
    const key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
    if (!key || e.parameter.key !== key) return json({ error: 'unauthorized' });
    return json({ courses: readCourses(), responses: readResponses() });
  }
  return json({ error: 'bad_request' });
}

function doPost(e) {
  let p;
  try { p = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'bad_json' }); }
  const courses = readCourses();
  const course = courses.find(c => c.id === p.courseId && c.active);
  if (!course) return json({ ok: false, error: 'closed' });
  const answers = p.answers || {};
  for (const [id] of ITEMS) {
    if (!LABELS[answers[id]]) return json({ ok: false, error: 'incomplete' });
  }
  if (!REC_LABELS[answers.recommend]) return json({ ok: false, error: 'incomplete' });
  const device = String(p.device || '').slice(0, 64);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RESP);
    const last = sheet.getLastRow();
    if (device && last > 1) {
      const rows = sheet.getRange(2, 1, last - 1, RESP_HEADERS.length).getValues();
      const devCol = RESP_HEADERS.length - 1;
      if (rows.some(r => String(r[1]) === course.id && String(r[devCol]) === device)) {
        return json({ ok: false, error: 'duplicate' });
      }
    }
    const open = p.open || {};
    const row = [new Date(), course.id]
      .concat(ITEMS.map(([id]) => LABELS[answers[id]]))
      .concat([REC_LABELS[answers.recommend]])
      .concat(OPEN.map(([id]) => clean(open[id])))
      .concat([device]);
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

function clean(s) {
  s = String(s || '').slice(0, 1500).trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s; // منع تنفيذ الصيغ داخل الجدول
}

function readCourses() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_COURSES);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, COURSE_HEADERS.length).getValues()
    .filter(r => r[0] !== '')
    .map(r => ({
      id: String(r[0]).trim(),
      diploma: String(r[1]),
      number: Number(r[2]) || r[2],
      title: String(r[3]),
      trainer: String(r[4]),
      trainerTitle: String(r[5]),
      from: asDate(r[6]),
      to: asDate(r[7]),
      photo: String(r[8]),
      active: /^(نعم|yes|true|1)$/i.test(String(r[9]).trim())
    }));
}

function readResponses() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RESP);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, RESP_HEADERS.length).getValues().map(r => {
    const o = { at: asDate(r[0]), courseId: String(r[1]) };
    ITEMS.forEach(([id], i) => { o[id] = VALUES[String(r[2 + i]).trim()] || 0; });
    o.recommend = REC_VALUES[String(r[2 + ITEMS.length]).trim()] || '';
    OPEN.forEach(([id], i) => { o[id] = String(r[3 + ITEMS.length + i] || ''); });
    return o;
  });
}

function asDate(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v || '');
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
