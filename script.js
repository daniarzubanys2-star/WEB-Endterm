/* Calisthenics Hub: script.js (Endterm)
   Needs jQuery 3 and the Bootstrap 5 bundle, loaded before this file.
   Sections: 1 helpers, 2 form validation, 3 workout pet, 4 calculator, 5 articles. */
'use strict';

/* ---------- 1. Helpers ---------- */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ms = n => (reduceMotion ? 0 : n);   // no animation for users who ask for less motion

/* ---------- 2. Form validation ---------- */
// Every rule returns '' when the value is fine, or an error message.
const RULES = {
  required: v => (String(v).trim() ? '' : 'This field is required.'),
  name: v => (/^\p{L}[\p{L}\s'.-]+$/u.test(String(v).trim()) ? '' : 'Use letters only, at least 2 characters.'),
  email: v => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? '' : 'Enter a valid email, for example name@mail.com.'),
  phone: v => {
    const digits = String(v).replace(/\D/g, '');
    return /^\+?[\d\s()-]+$/.test(String(v).trim()) && digits.length >= 10 && digits.length <= 15
      ? '' : 'Enter 10 to 15 digits, for example +7 701 123 4567.';
  },
  min: (v, n) => (String(v).trim().length >= n ? '' : `Write at least ${n} characters.`),
  range: (v, lo, hi) => {
    const x = Number(v);
    return Number.isFinite(x) && x >= lo && x <= hi ? '' : `Enter a number between ${lo} and ${hi}.`;
  },
  checked: (v, n) => (Number(v) >= n ? '' : 'Choose at least one topic.')
};

// 'range:30,300' -> run RULES.range(value, 30, 300); stops at the first error
function runRules(list, value) {
  for (const item of list) {
    const [name, arg = ''] = item.split(':');
    const msg = RULES[name](value, ...(arg ? arg.split(',').map(Number) : []));
    if (msg) return msg;
  }
  return '';
}

const fieldsOf = ($form, name) => $form.find(`[name="${name}"]`);
const readValue = $f => ($f.is(':checkbox') ? $f.filter(':checked').length : String($f.val() ?? ''));

// Shows or clears the error text directly under the field (no alerts)
function showFieldState($form, name, message) {
  const $f = fieldsOf($form, name);
  const $anchor = $f.is(':checkbox') ? $f.first().closest('fieldset') : $f.last();
  let $err = $anchor.next('.field-error');
  if (!$err.length) {
    $err = $('<div class="field-error" role="alert"></div>')
      .attr('id', `${$form.attr('id')}-${name}-error`).insertAfter($anchor);
  }
  $err.text(message).prop('hidden', !message);
  $f.toggleClass('is-invalid', !!message)
    .attr('aria-invalid', message ? 'true' : 'false')
    .attr('aria-describedby', message ? $err.attr('id') : null);
}

// jQuery success banner: slides down, waits, slides up. stop(true, true) stops fast clicks from stacking.
function showSuccess($form, text) {
  let $b = $form.prev('.form-success');
  if (!$b.length) $b = $('<div class="form-success" role="status"></div>').hide().insertBefore($form);
  $b.stop(true, true).text(text).slideDown(ms(300)).delay(5000).slideUp(ms(300));
}

function initForm(selector, rules, { onValid, clear = true }) {
  const $form = $(selector);
  if (!$form.length) return;
  const touched = new Set();   // errors appear only after the visitor touched a field
  const check = name => {
    const msg = runRules(rules[name], readValue(fieldsOf($form, name)));
    showFieldState($form, name, msg);
    return msg === '';
  };

  $form.on('input change focusout', '[name]', function (e) {
    const name = this.name;
    if (!rules[name]) return;
    if (e.type === 'focusout' && $(this).is(':checkbox')) return;
    if (e.type !== 'input') touched.add(name);
    if (touched.has(name)) check(name);   // real-time: re-check on every key once touched
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    const allValid = Object.keys(rules).map(n => { touched.add(n); return check(n); }).every(Boolean);
    if (!allValid) { $form.find('.is-invalid').first().trigger('focus'); return; }
    onValid($form);
    if (clear) {
      this.reset();
      touched.clear();
      Object.keys(rules).forEach(n => showFieldState($form, n, ''));
    }
  });
}

function initForms() {
  initForm('#contactForm', {
    name: ['required', 'name'], email: ['required', 'email'], phone: ['required', 'phone'],
    level: ['required'], message: ['required', 'min:10']
  }, { onValid: $f => showSuccess($f, 'Thank you! Your message was sent. A coach will reply within 24 hours.') });

  initForm('#newsletterForm', {
    name: ['required', 'name'], email: ['required', 'email'], topics: ['checked:1']
  }, { onValid: $f => showSuccess($f, 'You are subscribed. Your first weekly guide arrives next week.') });
}

/* ---------- 3. Workout pet and rank system (index.html) ---------- */
const RANKS = [
  { rank: 'E',  title: 'Beginner Egg',        minXp: 0,    icon: '\u{1F95A}' },
  { rank: 'F',  title: 'Hatchling',           minXp: 100,  icon: '\u{1F423}' },
  { rank: 'C',  title: 'Fledgling',           minXp: 300,  icon: '\u{1F425}' },
  { rank: 'B',  title: 'Street Falcon',       minXp: 700,  icon: '\u{1F985}' },
  { rank: 'A',  title: 'Iron Phoenix',        minXp: 1500, icon: '\u{1F525}' },
  { rank: 'S',  title: 'Bar Dragon',          minXp: 3000, icon: '\u{1F409}' },
  { rank: 'SS', title: 'God of Calisthenics', minXp: 6000, icon: '\u{1F451}' }
];
const STATS = [
  { key: 'pushups', label: 'Push-ups', icon: '\u{1F4AA}', amount: 50,   xpPer: 1 },
  { key: 'steps',   label: 'Steps',    icon: '\u{1F463}', amount: 5000, xpPer: 0.01 },
  { key: 'pullups', label: 'Pull-ups', icon: '\u{1F9D7}', amount: 20,   xpPer: 3 },
  { key: 'squats',  label: 'Squats',   icon: '\u{1F3CB}', amount: 30,   xpPer: 1 }
];
const PET_KEY = 'calisthenicsHubPet';

function loadPet() {
  const state = { pushups: 0, steps: 0, pullups: 0, squats: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(PET_KEY));
    if (saved) Object.keys(state).forEach(k => { if (Number.isFinite(saved[k]) && saved[k] >= 0) state[k] = saved[k]; });
  } catch { /* storage blocked or corrupted: start from zero */ }
  return state;
}
const savePet = state => { try { localStorage.setItem(PET_KEY, JSON.stringify(state)); } catch { /* ignore */ } };
const calcXp = state => Math.floor(STATS.reduce((sum, s) => sum + state[s.key] * s.xpPer, 0));
const rankIndex = xp => RANKS.filter(r => xp >= r.minXp).length - 1;

function initPet() {
  if (!$('#petBtn').length) return;
  let state = loadPet();

  function render() {
    const xp = calcXp(state), i = rankIndex(xp), r = RANKS[i], next = RANKS[i + 1];
    let pct = 100, label = 'Maximum rank reached!';
    if (next) {
      pct = Math.round(((xp - r.minXp) / (next.minXp - r.minXp)) * 100);
      label = `${xp - r.minXp} / ${next.minXp - r.minXp} XP to rank ${next.rank}`;
    }
    $('#rankBadge').text(r.rank);
    $('#petTitle').text(r.title);
    $('#petIcon').text(r.icon);
    $('#petWidget').attr('data-rank', r.rank);
    $('#rankBar').css('width', pct + '%');
    $('#rankProgress').attr('aria-valuenow', pct);
    $('#xpLabel').text(label);
  }

  $('.pet-actions').on('click', '[data-stat]', function () {
    const stat = STATS.find(s => s.key === $(this).data('stat'));
    const before = rankIndex(calcXp(state));
    state[stat.key] += stat.amount;
    savePet(state);
    render();
    const after = rankIndex(calcXp(state));
    $('#petMsg').text(after > before
      ? `Rank up! You are now rank ${RANKS[after].rank}: ${RANKS[after].title}.`
      : `+${stat.amount.toLocaleString('en-US')} ${stat.label} logged.`);
  });

  $('#petReset').on('click', () => {
    state = { pushups: 0, steps: 0, pullups: 0, squats: 0 };
    savePet(state);
    render();
    $('#petMsg').text('Progress reset. A new egg is waiting.');
  });

  // Modal content is built from the STATS array with DOM manipulation
  function fillModal() {
    const r = RANKS[rankIndex(calcXp(state))];
    $('#modalRank').text(r.rank);
    $('#modalTitle').text(r.title);
    $('#statTiles').empty().append(STATS.map(s =>
      $('<div class="col-6"></div>').append(
        $('<div class="stat-tile"></div>').append(
          $('<span class="stat-icon" aria-hidden="true"></span>').text(s.icon),
          $('<strong></strong>').text(state[s.key].toLocaleString('en-US')),
          $('<span></span>').text(s.label)))));
  }

  // jQuery effect 1: the pet spins and grows, then the modal opens
  $('#petBtn').on('click', function () {
    const $icon = $('#petIcon');
    if ($icon.data('busy')) return;   // ignore fast repeated clicks
    $icon.data('busy', true);
    $({ deg: 0 }).animate({ deg: 360 }, {
      duration: ms(600),
      step(now) { $icon.css('transform', `rotate(${now}deg) scale(${1 + 0.4 * Math.sin((now * Math.PI) / 360)})`); },
      complete() {
        $icon.css('transform', '').data('busy', false);
        fillModal();
        bootstrap.Modal.getOrCreateInstance('#statsModal').show();
      }
    });
  });

  // jQuery effect 2: achievement tiles fade in one after another when the modal is shown
  document.getElementById('statsModal').addEventListener('shown.bs.modal', () => {
    $('#statTiles .stat-tile').stop(true).css('opacity', 0).each(function (i) {
      $(this).delay(ms(i * 90)).animate({ opacity: 1 }, ms(300));
    });
  });

  render();
}

/* ---------- 4. Nutrition calculator (blog.html) ---------- */
const ACTIVITY = { sedentary: 1.2, moderate: 1.55, active: 1.725 };
const GOALS = { cut: { mult: 0.85, protein: 2.2 }, maintain: { mult: 1, protein: 1.8 }, bulk: { mult: 1.1, protein: 1.8 } };
const MACROS = [
  { key: 'protein', label: 'Protein', kcalPerGram: 4 },
  { key: 'carbs',   label: 'Carbs',   kcalPerGram: 4 },
  { key: 'fat',     label: 'Fats',    kcalPerGram: 9 }
];

function calcPlan({ weight, height, age, sex, activity, goal }) {
  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);   // Mifflin-St Jeor
  const tdee = bmr * ACTIVITY[activity];
  const kcal = tdee * GOALS[goal].mult;
  const protein = weight * GOALS[goal].protein;
  const fat = (kcal * 0.25) / 9;                                  // 25% of calories from fat
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);  // the rest from carbs
  return { bmr, tdee, kcal, grams: { protein, carbs, fat } };
}

function renderPlan($form) {
  const v = Object.fromEntries($form.serializeArray().map(f => [f.name, f.value]));
  ['weight', 'height', 'age'].forEach(k => { v[k] = Number(v[k]); });
  const plan = calcPlan(v);

  $('#resKcal').text(Math.round(plan.kcal).toLocaleString('en-US'));
  $('#resBmr').text(Math.round(plan.bmr).toLocaleString('en-US'));
  $('#resTdee').text(Math.round(plan.tdee).toLocaleString('en-US'));

  $('#macroCards').empty().append(MACROS.map(m => {
    const grams = Math.round(plan.grams[m.key]);
    const pct = Math.round((plan.grams[m.key] * m.kcalPerGram / plan.kcal) * 100);
    return $('<div class="col"></div>').append(
      $('<div class="macro-card"></div>').append(
        $('<h4></h4>').text(m.label),
        $('<p class="macro-grams"></p>').text(`${grams} g`),
        $('<div class="progress" role="progressbar"></div>')
          .attr({ 'aria-label': `${m.label} share of calories`, 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 })
          .append($('<div class="progress-bar"></div>').css('width', pct + '%')),
        $('<small></small>').text(`${pct}% of calories`)));
  }));

  // jQuery effect 3: the result block fades in
  $('#calcEmpty').hide();
  $('#calcResult').stop(true, true).hide().prop('hidden', false).fadeIn(ms(400));
}

function initCalculator() {
  initForm('#calcForm', {
    weight: ['required', 'range:30,300'],
    height: ['required', 'range:100,250'],
    age: ['required', 'range:14,100']
  }, { onValid: renderPlan, clear: false });
}

/* ---------- 5. Articles: data array, search and filter (blog.html) ---------- */
const ARTICLES = [
  { title: 'How to fix wrist pain in handstands', category: 'Recovery', minutes: 5, img: 'images/photo-3.jpg', alt: 'Hands on the floor in a handstand preparation', text: 'Warm up the joint, spread the load across your fingers, and build wrist strength slowly.' },
  { title: 'Nutrition for bodyweight strength', category: 'Nutrition', minutes: 7, img: 'images/photo-4.jpg', alt: 'Healthy meal with chicken, rice and vegetables', text: 'How much protein you need, when to eat around training, and what to do on rest days.' },
  { title: '5 mistakes in strict pull-ups', category: 'Technique', minutes: 6, img: 'images/photo-5.jpg', alt: 'Athlete hanging from a pull-up bar', text: 'Kipping by accident, half reps, shrugged shoulders and three more habits to fix today.' },
  { title: 'Sleep and rest: where strength is built', category: 'Recovery', minutes: 4, img: 'images/photo-6.jpg', alt: 'Person stretching on a mat', text: 'A simple weekly structure so your tendons and muscles can keep up with your goals.' },
  { title: 'From bench dips to ring dips', category: 'Progression', minutes: 6, img: 'images/photo-7.jpg', alt: 'Athlete doing dips on parallel bars', text: 'Five steps that make your chest and shoulders ready for unstable work.' },
  { title: 'A 20-minute home routine with no equipment', category: 'Beginners', minutes: 3, img: 'images/photo-8.jpg', alt: 'Person doing push-ups at home', text: 'Push, pull, legs and core in one short session you can repeat three times a week.' },
  { title: 'Progressive overload without weights', category: 'Progression', minutes: 5, img: 'images/photo-9.jpg', alt: 'Athlete doing a harder push-up variation', text: 'Change leverage, tempo and range of motion to keep getting stronger using only your body.' },
  { title: 'Mobility routine for desk workers', category: 'Recovery', minutes: 4, img: 'images/photo-10.jpg', alt: 'Person stretching their hips next to a desk', text: 'Ten minutes for hips, shoulders and upper back to undo a day of sitting.' }
];

function buildCard(a) {
  return $('<div class="col"></div>').append(
    $('<article class="card blog-card h-100"></article>').append(
      $('<img class="card-img-top" loading="lazy">').attr({ src: a.img, alt: a.alt }),
      $('<div class="card-body"></div>').append(
        $('<span class="badge badge-accent mb-2"></span>').text(a.category),
        $('<h3 class="card-title"></h3>').text(a.title),
        $('<p class="card-text"></p>').text(a.text)),
      $('<div class="card-footer"></div>').text(`${a.minutes} min read`)));
}

function initArticles() {
  const $grid = $('#articleGrid');
  if (!$grid.length) return;
  [...new Set(ARTICLES.map(a => a.category))].forEach(c =>
    $('#articleCategory').append($('<option></option>').val(c).text(c)));

  function render() {
    const q = $('#articleSearch').val().trim().toLowerCase();
    const cat = $('#articleCategory').val();
    const list = ARTICLES.filter(a =>
      (cat === 'all' || a.category === cat) && `${a.title} ${a.text}`.toLowerCase().includes(q));
    $grid.empty().append(list.map(buildCard));
    $grid.children().hide().fadeIn(ms(200));
    $('#articleCount').text(`Showing ${list.length} of ${ARTICLES.length} articles`);
    $('#articleEmpty').prop('hidden', list.length > 0);
  }

  $('#articleSearch').on('input', render);
  $('#articleCategory').on('change', render);
  render();
}

/* ---------- Start ---------- */
$(function () {
  initForms();
  initPet();
  initCalculator();
  initArticles();
});
