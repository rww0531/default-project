'use strict';

/* ── 規則設定 ─────────────────────────────
   1. 石頭剋剪刀、剪刀剋布、布剋石頭
   2. 每張卡牌都有各自的傷害值
   3. 贏：對方扣掉「贏的那張牌」的傷害值
   4. 平手（同類型）：傷害較高者勝，扣掉「傷害差值」
   5. 血量歸零的一方輸，另一方獲勝
────────────────────────────────────────── */

const TYPES = {
  rock: { emoji: '✊', label: '石頭', beats: 'scissors' },
  paper: { emoji: '✋', label: '布', beats: 'rock' },
  scissors: { emoji: '✌️', label: '剪刀', beats: 'paper' },
};

// 所有可能出現的卡牌（每張都有各自的傷害值）
const BASE_DECK = [
  { type: 'rock', damage: 10, name: '小岩' },
  { type: 'rock', damage: 14, name: '岩石' },
  { type: 'rock', damage: 18, name: '巨岩' },
  { type: 'rock', damage: 22, name: '神岩' },
  { type: 'paper', damage: 8, name: '紙屑' },
  { type: 'paper', damage: 12, name: '紙板' },
  { type: 'paper', damage: 16, name: '厚紙' },
  { type: 'paper', damage: 20, name: '金布' },
  { type: 'scissors', damage: 9, name: '鈍剪' },
  { type: 'scissors', damage: 13, name: '剪刀' },
  { type: 'scissors', damage: 17, name: '銳剪' },
  { type: 'scissors', damage: 21, name: '神剪' },
];

const MAX_HP = 100;
const HAND_SIZE = 5;
const AI_COUNTER_CHANCE = 0.45; // 電腦模仿你上一手來剋制的機率

const state = {
  playerHP: MAX_HP,
  computerHP: MAX_HP,
  playerHand: [],
  computerHand: [],
  playerHistory: [],
  round: 1,
  busy: false,
  gameOver: false,
};

/* ── DOM ── */
const el = {
  playerHand: document.getElementById('player-hand'),
  computerHand: document.getElementById('computer-hand'),
  playerFill: document.getElementById('player-hp-fill'),
  computerFill: document.getElementById('computer-hp-fill'),
  playerText: document.getElementById('player-hp-text'),
  computerText: document.getElementById('computer-hp-text'),
  playerPlay: document.getElementById('player-play'),
  computerPlay: document.getElementById('computer-play'),
  resultText: document.getElementById('result-text'),
  roundNum: document.getElementById('round-num'),
  restartBtn: document.getElementById('restart-btn'),
  log: document.getElementById('log'),
  playerSide: document.getElementById('player-side'),
  computerSide: document.getElementById('computer-side'),
  soundBtn: document.getElementById('sound-btn'),
};

/* ── 音效（Web Audio API 合成，免外部音檔） ── */
const SFX = (() => {
  let ctx = null;
  let out = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.45;
      out.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return out;
  }

  // 低頻撞擊聲（攻擊 / 挨打）
  function thud(freq, sweep, gain, noiseGain, duration) {
    const dest = ensure();
    if (muted) return;
    const t0 = ctx.currentTime;

    const src = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * duration);
    src.buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = src.buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t0);
    filter.frequency.exponentialRampToValueAtTime(180, t0 + duration);

    const g = ctx.createGain();
    g.gain.setValueAtTime(noiseGain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(t0);
    src.stop(t0 + duration + 0.05);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + sweep), t0 + duration);

    const og = ctx.createGain();
    og.gain.setValueAtTime(gain, t0);
    og.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(og);
    og.connect(dest);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function tone(freq, dur, gain, type, delay) {
    const dest = ensure();
    if (muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    osc.type = type || 'square';
    osc.frequency.value = freq;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    playCard() { tone(520, 0.07, 0.12, 'triangle'); },
    attack() { thud(160, -80, 0.9, 0.5, 0.22); tone(200, 0.12, 0.25, 'sawtooth'); },
    damage() { thud(95, -40, 0.9, 0.55, 0.3); tone(130, 0.18, 0.3, 'sawtooth'); },
    tie() { tone(320, 0.08, 0.16, 'square'); tone(320, 0.08, 0.16, 'square', 0.13); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 0.24, 'triangle', i * 0.13)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 0.24, 'sawtooth', i * 0.17)); },
    setMuted(m) { muted = m; },
  };
})();

/* ── 工具 ── */
function drawHand() {
  const pool = [...BASE_DECK];
  const hand = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    hand.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return hand;
}

function rand(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ── 勝負判定 ── */
function resolve(pCard, cCard) {
  if (pCard.type === cCard.type) {
    const diff = Math.abs(pCard.damage - cCard.damage);
    if (diff === 0) return { kind: 'draw', damage: 0, winner: null };
    return {
      kind: 'tie-break',
      damage: diff,
      winner: pCard.damage > cCard.damage ? 'player' : 'computer',
    };
  }
  if (TYPES[pCard.type].beats === cCard.type) {
    return { kind: 'win', damage: pCard.damage, winner: 'player' };
  }
  return { kind: 'lose', damage: cCard.damage, winner: 'computer' };
}

/* ── 電腦 AI：五成機率模仿剋你上一手，否則隨機 ── */
function pickComputerCard() {
  const hand = state.computerHand;
  const last = state.playerHistory[state.playerHistory.length - 1];
  if (last && Math.random() < AI_COUNTER_CHANCE) {
    const counterType = Object.keys(TYPES).find((t) => TYPES[t].beats === last.type);
    const counters = hand.filter((c) => c.type === counterType);
    if (counters.length) return rand(counters);
  }
  return rand(hand);
}

/* ── 回合流程 ── */
function playRound(playerCard) {
  if (state.busy || state.gameOver) return;
  state.busy = true;
  SFX.playCard();

  const computerCard = pickComputerCard();

  state.playerHand = state.playerHand.filter((c) => c !== playerCard);
  state.computerHand = state.computerHand.filter((c) => c !== computerCard);
  state.playerHistory.push(playerCard);

  renderPlayerHand();
  renderComputerHand();

  revealPlay(el.playerPlay, playerCard);
  revealPlay(el.computerPlay, computerCard);

  const outcome = resolve(playerCard, computerCard);

  setTimeout(() => {
    const msg = buildMessage(outcome, playerCard, computerCard);
    el.resultText.textContent = msg;
    el.resultText.className =
      outcome.winner === 'player' ? 'win' : outcome.winner === 'computer' ? 'lose' : '';
    log(msg, outcome.winner === 'player' ? 'good' : outcome.winner === 'computer' ? 'bad' : 'draw');
  }, 350);

  setTimeout(() => {
    applyDamage(outcome);
  }, 950);

  setTimeout(() => {
    finishRound();
  }, 1550);
}

function revealPlay(target, card) {
  target.className = 'play-card ' + card.type;
  target.innerHTML =
    '<div class="card-emoji">' + TYPES[card.type].emoji + '</div>' +
    '<div class="card-name">' + card.name + '</div>' +
    '<div class="card-type">' + TYPES[card.type].label + '</div>' +
    '<div class="card-damage">⚔️ ' + card.damage + '</div>';
  target.classList.add('pop');
}

function buildMessage(o, pc, cc) {
  const pStr = pc.name + '(' + TYPES[pc.type].emoji + ' ' + pc.damage + ')';
  const cStr = cc.name + '(' + TYPES[cc.type].emoji + ' ' + cc.damage + ')';
  switch (o.kind) {
    case 'win':
      return '⚡ 你贏了！' + pStr + ' 勝過 ' + cStr + '，造成 ' + o.damage + ' 點傷害！';
    case 'lose':
      return '💥 你輸了！' + cStr + ' 勝過 ' + pStr + '，你受到 ' + o.damage + ' 點傷害。';
    case 'tie-break':
      return o.winner === 'player'
        ? '🤜 都是' + TYPES[pc.type].label + '！你的 ' + pStr + ' 傷害較高，造成 ' + o.damage + ' 點傷害！'
        : '🤛 都是' + TYPES[pc.type].label + '！電腦的 ' + cStr + ' 傷害較高，你受到 ' + o.damage + ' 點傷害。';
    case 'draw':
      return '😶 真平手！' + pStr + ' 與 ' + cStr + ' 傷害相同，雙方無傷。';
  }
}

function applyDamage(o) {
  if (o.winner === 'player' && o.damage > 0) {
    state.computerHP = Math.max(0, state.computerHP - o.damage);
    flashDamage(el.computerSide);
    SFX.attack();
  }
  if (o.winner === 'computer' && o.damage > 0) {
    state.playerHP = Math.max(0, state.playerHP - o.damage);
    flashDamage(el.playerSide);
    SFX.damage();
  }
  if (o.winner === null) SFX.tie();
  renderHP();
}

function flashDamage(side) {
  side.classList.add('hit');
  setTimeout(() => side.classList.remove('hit'), 500);
}

function finishRound() {
  if (state.playerHP <= 0) return endGame('computer');
  if (state.computerHP <= 0) return endGame('player');

  if (state.playerHand.length === 0) state.playerHand = drawHand();
  if (state.computerHand.length === 0) state.computerHand = drawHand();

  state.round += 1;
  el.roundNum.textContent = state.round;

  renderPlayerHand();
  renderComputerHand();
  resetTurns();
  state.busy = false;
}

function endGame(winner) {
  state.gameOver = true;
  el.roundNum.textContent = state.round;
  el.restartBtn.hidden = false;

  if (winner === 'player') {
    el.resultText.textContent = '🎉 你贏了！電腦血量歸零！';
    el.resultText.className = 'win';
    log('🏆 勝利！把電腦的血量打歸零了！', 'good');
    SFX.win();
  } else {
    el.resultText.textContent = '💀 你輸了…你的血量歸零了。';
    el.resultText.className = 'lose';
    log('❌ 敗北…你的血量歸零了。', 'bad');
    SFX.lose();
  }
}

function resetTurns() {
  el.playerPlay.className = 'play-card empty';
  el.computerPlay.className = 'play-card empty';
  el.playerPlay.innerHTML = '❓';
  el.computerPlay.innerHTML = '❓';
  el.resultText.textContent = '';
}

/* ── 渲染 ── */
function renderPlayerHand() {
  el.playerHand.innerHTML = '';
  state.playerHand.forEach((card) => {
    const btn = document.createElement('button');
    btn.className = 'card ' + card.type;
    btn.innerHTML =
      '<div class="card-emoji">' + TYPES[card.type].emoji + '</div>' +
      '<div class="card-name">' + card.name + '</div>' +
      '<div class="card-type">' + TYPES[card.type].label + '</div>' +
      '<div class="card-damage">⚔️ ' + card.damage + '</div>';
    btn.addEventListener('click', () => playRound(card));
    el.playerHand.appendChild(btn);
  });
}

function renderComputerHand() {
  el.computerHand.innerHTML = '';
  for (let i = 0; i < state.computerHand.length; i++) {
    const card = document.createElement('div');
    card.className = 'card card-back';
    card.textContent = '❓';
    el.computerHand.appendChild(card);
  }
}

function renderHP() {
  el.playerFill.style.width = (state.playerHP / MAX_HP) * 100 + '%';
  el.computerFill.style.width = (state.computerHP / MAX_HP) * 100 + '%';
  el.playerText.textContent = state.playerHP + ' / ' + MAX_HP;
  el.computerText.textContent = state.computerHP + ' / ' + MAX_HP;
}

function log(msg, cls) {
  const li = document.createElement('li');
  li.className = cls || '';
  li.textContent = '第 ' + state.round + ' 回合 ｜ ' + msg;
  el.log.prepend(li);
  while (el.log.children.length > 30) el.log.removeChild(el.log.lastChild);
}

/* ── 重新開始 ── */
el.restartBtn.addEventListener('click', restart);

/* ── 音效開關 ── */
let soundMuted = false;
el.soundBtn.addEventListener('click', () => {
  soundMuted = !soundMuted;
  SFX.setMuted(soundMuted);
  el.soundBtn.textContent = soundMuted ? '🔇' : '🔊';
});

function restart() {
  state.playerHP = MAX_HP;
  state.computerHP = MAX_HP;
  state.playerHand = drawHand();
  state.computerHand = drawHand();
  state.playerHistory = [];
  state.round = 1;
  state.busy = false;
  state.gameOver = false;

  el.roundNum.textContent = 1;
  el.log.innerHTML = '';
  el.restartBtn.hidden = true;

  renderHP();
  renderPlayerHand();
  renderComputerHand();
  resetTurns();
}

/* ── 啟動 ── */
function init() {
  state.playerHand = drawHand();
  state.computerHand = drawHand();
  renderHP();
  renderPlayerHand();
  renderComputerHand();
  resetTurns();
}

init();