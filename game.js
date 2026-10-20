(() => {
  // === СЛОВАРЬ (i18n) ===
  const i18n = {
    ru: {
      brandSub: "угадай песню быстрее всех", eyebrow: "Музыкальная дуэль",
      heroTitle: "Узнай хит.<br><span style='color:var(--coral)'>За 5 секунд.</span>",
      heroCopy: "Слушай короткий фрагмент, выбирай из четырёх вариантов и собирай <strong>огненный стрик</strong>. Чем дольше серия — тем больше очков.",
      startBtn: "Начать раунд <span aria-hidden='true'>→</span>", btn1v1: "⚔️ 1 на 1", btnCustom: "👑 С друзьями",
      miniNote: "В игре 30-секундные превью треков из музыкального каталога.",
      progTitle: "Твой прогресс", howToTitle: "Как играть", topTitle: "Сегодня в топе",
      record: "Рекорд", bestStreak: "Лучший стрик", roundsPlayed: "Сыграно раундов", inARow: "подряд",
      rule1: "Включи 5-секундный фрагмент настоящего трека.", rule2: "Выбери правильную песню из четырёх вариантов.", rule3: "Не ошибайся: стрик умножает награду.",
      loadingTop: "Загрузка топа...", whatTrack: "Что это за трек?", recognize: "Узнаёшь?",
      score: "ОЧКИ", lives: "ЖИЗНИ", oppScore: "ОЧКИ СОПЕРНИКОВ", formula: "ФОРМУЛА СТРИКА", catalog: "КАТАЛОГ",
      hintBtn: "💡 Подсказка <span style='opacity:.7'>· реклама</span>", quitBtn: "🚪 Выйти на главную",
      pointsWord: "очков", guessed: "угадано", bestStreakResult: "лучший стрик", multiplier: "множитель",
      playAgain: "Играть ещё <span aria-hidden='true'>→</span>", toHome: "На главную",
      createRoom: "+ Создать комнату", joinRoom: "Войти", roomCodeSpan: "Код комнаты:", startGame: "Начать игру", roomCodePlaceholder: "Код комнаты",

      catLoading: "Загрузка локальной базы...", catReady: "треков готовы", catDemo: "Демо-каталог", topEmpty: "Стань первым!", topAnon: "Пикабушник",
      mpTitleCustom: "Своя игра", mpTitle1v1: "Поиск 1 на 1...", mpSearchReady: "В лобби", mpPreparing: "Готовим треки...",
      errNet: "Сетевые функции недоступны", errServer: "Сервер перегружен или недоступен", errInput: "Введите 6 цифр", errNotFound: "Комната не найдена", errStarted: "Игра уже началась", errSync: "Сбой синхронизации",
      errCat: "Каталог ещё загружается", errAudio: "Нет аудиофайла", errFirst: "Сначала включи фрагмент",
      statusWait: "Ждём твоего ответа", statusDemo: "Демо-режим: нет аудио", statusReady: "Фрагмент готов — включай",
      btnPlay: "▶ Слушать 5 сек", btnPlaying: "♪ Играет…", statusListen: "Слушай внимательно",
      errTrackBreak: "Сбой трека. Угадывай!", btnBreak: "Сбой аудио", statusChoose: "Выбирай вариант", errReplace: "Сбой аудио — заменяем трек",
      statusTimeOut: "Время вышло! Ждём остальных...", statusEnd: "Фрагмент закончился — выбирай", btnListenAgain: "↻ Послушать ещё",
      correct: "Верно!", wrong: "Не угадал. Это", waitOthers: "Ждём остальных...", hintMsg: "Исполнитель —",
      titleNoLives: "Жизни закончились", titleRoundEnd: "Раунд окончен", titleMatchEnd: "Матч завершен",
      resNewRecord: "Новый личный рекорд!", resGood: "Неплохо. Следующий стрик может быть ещё длиннее.", resSum: "Подводим итоги...",
      modalHowTo: "Как играть", modalHowToText: "За раунд нужно угадать 10 песен. Правильные ответы увеличивают стрик. Ошибка отнимает жизнь.", modalOk: "Понятно",
      modalRevive: "Вторая попытка", modalReviveText: "Жизни кончились! Посмотри рекламу, чтобы получить +1 жизнь.", btnRevive: "🎥 Продолжить", btnGiveUp: "Сдаться",
      modalQuit: "Выход", modalQuitText: "Завершить раунд и выйти на главную?", btnQuitYes: "Выйти", btnQuitNo: "Продолжить",
      adDemo: "Демо-режим: реклама пропущена", adErr: "Реклама недоступна", meHost: "Хост", player: "Игрок",
      round: (r, t) => `РАУНД ${r} / ${t}`, streak: (s) => `Стрик ${s}`
    },
    en: {
      brandSub: "guess the song fastest", eyebrow: "Musical Duel", heroTitle: "Name that tune.<br><span style='color:var(--coral)'>In 5 seconds.</span>", heroCopy: "Listen to a short snippet, choose from four options and build a <strong>fire streak</strong>. The longer the streak, the more points.", startBtn: "Start Round <span aria-hidden='true'>→</span>", btn1v1: "⚔️ 1 vs 1", btnCustom: "👑 Play Friends", miniNote: "The game features 30-second previews from the music catalog.", progTitle: "Your Progress", howToTitle: "How to Play", topTitle: "Today's Top", record: "Highscore", bestStreak: "Best Streak", roundsPlayed: "Rounds Played", inARow: "in a row", rule1: "Play a 5-second snippet of a real track.", rule2: "Choose the correct song from four options.", rule3: "Don't make mistakes: streaks multiply the reward.", loadingTop: "Loading top...", whatTrack: "What track is this?", recognize: "Recognize it?", score: "SCORE", lives: "LIVES", oppScore: "OPPONENT SCORE", formula: "STREAK FORMULA", catalog: "CATALOG", hintBtn: "💡 Hint <span style='opacity:.7'>· ad</span>", quitBtn: "🚪 Quit to Menu", pointsWord: "points", guessed: "guessed", bestStreakResult: "best streak", multiplier: "multiplier", playAgain: "Play Again <span aria-hidden='true'>→</span>", toHome: "Main Menu", createRoom: "+ Create Room", joinRoom: "Join", roomCodeSpan: "Room Code:", startGame: "Start Game", roomCodePlaceholder: "Room Code", catLoading: "Loading database...", catReady: "tracks ready", catDemo: "Demo catalog", topEmpty: "Be the first!", topAnon: "Anonymous", mpTitleCustom: "Custom Game", mpTitle1v1: "Searching 1v1...", mpSearchReady: "In Lobby", mpPreparing: "Preparing tracks...", errNet: "Network unavailable", errServer: "Server overloaded or unavailable", errInput: "Enter 6 digits", errNotFound: "Room not found", errStarted: "Game already started", errSync: "Sync error", errCat: "Catalog is loading", errAudio: "No audio", errFirst: "Play snippet first", statusWait: "Waiting for answer", statusDemo: "Demo: no audio", statusReady: "Snippet ready — play", btnPlay: "▶ Listen (5s)", btnPlaying: "♪ Playing...", statusListen: "Listen carefully", errTrackBreak: "Track error. Guess randomly!", btnBreak: "Audio Error", statusChoose: "Choose an option", errReplace: "Audio error — replacing", statusTimeOut: "Time's up! Waiting...", statusEnd: "Snippet ended — choose", btnListenAgain: "↻ Listen again", correct: "Correct!", wrong: "Wrong. It's", waitOthers: "Waiting for others...", hintMsg: "Artist is", titleNoLives: "Out of Lives", titleRoundEnd: "Round Over", titleMatchEnd: "Match Over", resNewRecord: "New personal record!", resGood: "Not bad. The next streak could be longer.", resSum: "Calculating...", modalHowTo: "How to Play", modalHowToText: "Guess 10 songs per round. Correct answers increase your streak. A mistake costs a life.", modalOk: "Got it", modalRevive: "Second Chance", modalReviveText: "Out of lives! Watch an ad to get +1 life.", btnRevive: "🎥 Continue", btnGiveUp: "Give Up", modalQuit: "Quit", modalQuitText: "End the round and return to the menu?", btnQuitYes: "Quit", btnQuitNo: "Continue", adDemo: "Demo: ad skipped", adErr: "Ad unavailable", meHost: "Me (Host)", player: "Player", round: (r, t) => `ROUND ${r} / ${t}`, streak: (s) => `Streak ${s}`
    }
  };

  let currentLang = 'ru';
  function t(key, ...args) {
    const val = i18n[currentLang] && i18n[currentLang][key] !== undefined ? i18n[currentLang][key] : i18n['ru'][key];
    if (typeof val === 'function') return val(...args);
    return val;
  }
  function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
    updateHomeStats();
  }

  const CONFIG = { roundsPerGame: 10, clipSeconds: 5, maxLives: 3 };
  const demoTracks = [{ trackId: 'demo-1', trackName: 'Demo', artistName: 'Artist', previewUrl: '' }];
  const $ = id => document.getElementById(id);
  const state = {
    catalog: [], queue: [], current: null, options: [],
    round: 0, score: 0, streak: 0, bestStreak: 0, correct: 0,
    lives: CONFIG.maxLives, answered: false, clipStarted: false,
    timer: null, hintUsed: false, reviveUsed: false,
    psdk: null, usingDemo: false, preparingGame: false
  };
  let stats = { bestScore: 0, bestStreak: 0, roundsPlayed: 0 };

  try {
    const saved = localStorage.getItem('gs5_stats');
    if (saved) stats = JSON.parse(saved);
  } catch (e) { }

  const audio = $('audio');
  let lastVolume = 1;
  let pikabuPlayerName = null;

  // === 1. ИНИЦИАЛИЗАЦИЯ PIKABU SDK ===
  function getPikabuSDKInstance() {
    return window.PikabuSDK || window.PikabuGames || window.pikabuSDK || null;
  }

  function initPikabu() {
    applyLanguage();
    const sdk = getPikabuSDKInstance();

    if (!sdk || typeof sdk.init !== 'function') {
      loadCatalog();
      return;
    }

    sdk.init().then((_instance) => {
      state.psdk = _instance || sdk;

      // Попытка получить данные игрока из Pikabu SDK, если метод поддерживается
      if (state.psdk.player) {
        if (typeof state.psdk.player.getName === 'function') {
          pikabuPlayerName = state.psdk.player.getName();
        } else if (state.psdk.player.name) {
          pikabuPlayerName = state.psdk.player.name;
        }

        if (typeof state.psdk.player.getData === 'function') {
          state.psdk.player.getData(['bestScore', 'bestStreak', 'roundsPlayed']).then(data => {
            if (data && data.bestScore !== undefined) {
              stats.bestScore = Math.max(stats.bestScore, data.bestScore || 0);
              stats.bestStreak = Math.max(stats.bestStreak, data.bestStreak || 0);
              stats.roundsPlayed = Math.max(stats.roundsPlayed, data.roundsPlayed || 0);
              updateHomeStats();
            }
          }).catch(() => {});
        }
      } else if (state.psdk.storage && typeof state.psdk.storage.get === 'function') {
        state.psdk.storage.get(['bestScore', 'bestStreak', 'roundsPlayed']).then(data => {
          if (data && data.bestScore !== undefined) {
            stats.bestScore = Math.max(stats.bestScore, Number(data.bestScore) || 0);
            stats.bestStreak = Math.max(stats.bestStreak, Number(data.bestStreak) || 0);
            stats.roundsPlayed = Math.max(stats.roundsPlayed, Number(data.roundsPlayed) || 0);
            updateHomeStats();
          }
        }).catch(() => {});
      }

      // Подписка на события паузы/резюма от платформы Пикабу
      if (typeof state.psdk.on === 'function') {
        state.psdk.on('pause', sysPauseAudio);
        state.psdk.on('resume', sysResumeAudio);
        state.psdk.on('audioMute', () => { audio.muted = true; });
        state.psdk.on('audioUnmute', () => { audio.muted = false; });
      }

      loadCatalog();
    }).catch(() => {
      loadCatalog();
    });
  }

  // === 2. FIREBASE НАСТРОЙКИ ===
  let db = null;
  let myPlayerId = localStorage.getItem('gs5_uid') || Math.random().toString(36).substr(2, 9);
  try { localStorage.setItem('gs5_uid', myPlayerId); } catch (e) {}

  let currentRoomId = null;
  let isHost = false;
  let isMultiplayer = false;
  let inMultiplayerMatch = false;
  let mpRoomRef = null;

  try {
    const firebaseConfig = {
      apiKey: "AIzaSyAF_F3-LODFm7ZDCS5D0x-xq8XJ2e8Atl8",
      authDomain: "guessthesong-97155.firebaseapp.com",
      databaseURL: "https://guessthesong-97155-default-rtdb.firebaseio.com",
      projectId: "guessthesong-97155",
      storageBucket: "guessthesong-97155.firebasestorage.app",
      messagingSenderId: "163574999757",
      appId: "1:163574999757:web:c7d939c4d7a030dde25784",
      measurementId: "G-9YVHHLLX22"
    };
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      db = firebase.database();

      db.ref('.info/connected').on('value', snap => {
        const isConnected = snap.val() === true;
        $('btn1v1').disabled = !isConnected; $('btnCustom').disabled = !isConnected;
        $('btn1v1').style.opacity = isConnected ? '1' : '0.5'; $('btnCustom').style.opacity = isConnected ? '1' : '0.5';
        const tooltip = isConnected ? '' : t('errServer');
        $('btn1v1').title = tooltip; $('btnCustom').title = tooltip;
        if (isConnected) updateLeaderboardUI();
      });
    }
  } catch (e) {
    console.warn("Network disabled");
    $('btn1v1').disabled = true; $('btn1v1').style.opacity = '0.5';
    $('btnCustom').disabled = true; $('btnCustom').style.opacity = '0.5';
  }

  initPikabu();

  function sysPauseAudio() { if (!audio.paused && audio.src) { audio.dataset.sysPaused = '1'; audio.pause(); } }
  function sysResumeAudio() { if (audio.dataset.sysPaused === '1') { audio.play().catch(() => { }); audio.dataset.sysPaused = '0'; } }
  document.addEventListener('visibilitychange', () => { if (document.hidden) sysPauseAudio(); else sysResumeAudio(); });

  const sfx = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    play(freq, type, duration, vol) {
      if (!this.ctx || audio.volume === 0 || audio.muted) return;
      const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol * audio.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + duration);
    },
    click() { this.init(); this.play(600, 'sine', 0.1, 0.05); },
    correct() { this.init(); this.play(523.25, 'sine', 0.1, 0.1); setTimeout(() => this.play(659.25, 'sine', 0.2, 0.1), 100); },
    wrong() { this.init(); this.play(150, 'sawtooth', 0.2, 0.05); setTimeout(() => this.play(100, 'sawtooth', 0.3, 0.05), 150); }
  };

  document.body.addEventListener('click', e => { const btn = e.target.closest('button'); if (btn && !btn.classList.contains('answer-btn')) sfx.click(); });

  function setScreen(name) { document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.id === name + 'Screen')); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  function saveStats() {
    try { localStorage.setItem('gs5_stats', JSON.stringify(stats)); } catch (e) { }
    updateHomeStats();

    // Сохранение данных в Pikabu SDK (если поддерживается)
    if (state.psdk?.player && typeof state.psdk.player.setData === 'function') {
      state.psdk.player.setData(stats).catch(() => {});
    } else if (state.psdk?.storage && typeof state.psdk.storage.set === 'function') {
      state.psdk.storage.set(stats).catch(() => {});
    }

    // Сохранение рекорда в лидерборд (Pikabu SDK + Firebase для отображения топа в игре)
    if (stats.bestScore > 0 && !isMultiplayer) {
      if (state.psdk?.leaderboards && typeof state.psdk.leaderboards.setScore === 'function') {
        state.psdk.leaderboards.setScore('topplayers', stats.bestScore).catch(() => {});
      }
      if (db) {
        const displayName = pikabuPlayerName || `${t('topAnon')} #${myPlayerId.slice(0, 4)}`;
        db.ref('leaderboard/' + myPlayerId).set({
          name: displayName,
          score: stats.bestScore,
          updatedAt: Date.now()
        }).then(() => updateLeaderboardUI()).catch(() => {});
      }
    }
  }

  function updateHomeStats() {
    $('bestScore').textContent = stats.bestScore.toLocaleString();$('bestStreak').innerHTML = `${stats.bestStreak} <small data-i18n="inARow">${t('inARow')}</small>`;
    $('roundsPlayed').textContent = stats.roundsPlayed;
  }

  function toast(message) { const node = $('toast'); node.textContent = message; node.classList.add('show'); clearTimeout(node._timer); node._timer = setTimeout(() => node.classList.remove('show'), 2400); }
  function shuffle(list) { return [...list].sort(() => Math.random() - .5); }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
  function trackKey(t) { return `${t.trackName}::${t.artistName}`; }

  function renderCover(track) {
    const cover = $('cover');
    cover.style.background = 'transparent'; cover.style.border = 'none'; cover.style.boxShadow = 'none'; cover.style.borderRadius = '50%';
    const initials = (track.trackName || '♫').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
    cover.innerHTML = `<svg id="vinylSvg" viewBox="0 0 100 100" style="width:100%;height:100%;border-radius:50%;box-shadow:0 10px 30px rgba(0,0,0,0.6);"><circle cx="50" cy="50" r="50" fill="#111"/><circle cx="50" cy="50" r="46" fill="none" stroke="#222" stroke-width="1.5"/><circle cx="50" cy="50" r="41" fill="none" stroke="#1a1a1a" stroke-width="2"/><circle cx="50" cy="50" r="35" fill="none" stroke="#222" stroke-width="1"/><circle cx="50" cy="50" r="28" fill="none" stroke="#1a1a1a" stroke-width="2"/><circle cx="50" cy="50" r="20" fill="none" stroke="#222" stroke-width="1"/><circle cx="50" cy="50" r="14" fill="#a987ff"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#1a102b" font-size="8px" font-weight="900" font-family="sans-serif">${escapeHtml(initials)}</text><circle cx="50" cy="50" r="3" fill="#0d0b17"/></svg>`;
  }

  function setCatalogStatus(text, mode = '') { const node = $('catalogStatus'); node.textContent = text; node.className = `status-chip ${mode}`; }

  async function loadCatalog() {
    setCatalogStatus(t('catLoading'));
    try {
      const response = await fetch('catalog.json');
      if (!response.ok) throw new Error('File not found');
      const data = await response.json();
      if (!data || data.length < 4) throw new Error('Too few tracks');
      state.catalog = shuffle(data); state.usingDemo = false;
      setCatalogStatus(`${state.catalog.length} ${t('catReady')}`, 'online');
      $('catalogCount').textContent = `${state.catalog.length}`;
    } catch (error) {
      state.catalog = demoTracks; state.usingDemo = true;
      setCatalogStatus(t('catDemo'), 'warn');
      $('catalogCount').textContent = 'Demo';
    }

    // Сообщаем платформе Пикабу, что игра загружена и готова
    if (state.psdk) {
      if (typeof state.psdk.gameReady === 'function') state.psdk.gameReady();
      else if (state.psdk.game && typeof state.psdk.game.ready === 'function') state.psdk.game.ready();
      else if (state.psdk.features?.LoadingAPI?.ready) state.psdk.features.LoadingAPI.ready();
    }
  }

  function updateLeaderboardUI() {
    if (!db) return;
    db.ref('leaderboard').orderByChild('score').limitToLast(3).once('value', snap => {
      const entries = [];
      snap.forEach(child => {
        entries.push(child.val());
      });
      entries.sort((a, b) => b.score - a.score);

      let html = '';
      if (entries.length === 0) {
        html = `<div class="mini-leader"><span class="player" style="color:var(--muted)">${t('topEmpty')}</span></div>`;
      } else {
        entries.forEach((entry, idx) => {
          const rankNum = idx + 1;
          const rank = rankNum < 10 ? '0' + rankNum : rankNum;
          const name = entry.name || t('topAnon');
          html += `<div class="mini-leader"><span class="rank">#${rank}</span><span class="player">${escapeHtml(name)}</span><span class="score">${(entry.score || 0).toLocaleString()}</span></div>`;
        });
      }
      $('leaderboardContainer').innerHTML = html;
    }).catch(() => {});
  }

  // === 3. МОНЕТИЗАЦИЯ (РЕКЛАМА ПИКАБУ ИГР) ===
  function showFullscreenAd() {
    const sdk = state.psdk || getPikabuSDKInstance();
    if (!sdk) return;

    const adv = sdk.adv || sdk.ads || sdk;
    const showMethod = adv.showInterstitial || adv.showFullscreenAdv || adv.showInterstitialAd || sdk.showInterstitial || sdk.showAd;

    if (typeof showMethod === 'function') {
      sysPauseAudio();
      try {
        const result = showMethod.call(adv, {
          onOpen: sysPauseAudio,
          onClose: sysResumeAudio,
          onError: sysResumeAudio,
          callbacks: {
            onOpen: sysPauseAudio,
            onClose: sysResumeAudio,
            onError: sysResumeAudio,
            onOffline: sysResumeAudio
          }
        });
        if (result && typeof result.then === 'function') {
          result.then(sysResumeAudio).catch(sysResumeAudio);
        }
      } catch (e) {
        sysResumeAudio();
      }
    }
  }

  function showRewardedAd(onReward, onFail) {
    const sdk = state.psdk || getPikabuSDKInstance();
    const adv = sdk ? (sdk.adv || sdk.ads || sdk) : null;
    const showMethod = adv ? (adv.showRewarded || adv.showRewardedVideo || adv.showRewardedAd || sdk.showRewarded || sdk.showRewardedAd) : null;

    if (typeof showMethod !== 'function') {
      onReward();
      toast(t('adDemo'));
      return;
    }

    let rewarded = false;
    let handled = false;

    const handleOpen = () => {
      sysPauseAudio();
    };
    const handleReward = () => {
      if (!rewarded) {
        rewarded = true;
        onReward();
      }
    };
    const handleClose = () => {
      if (handled) return;
      handled = true;
      sysResumeAudio();
      if (!rewarded && onFail) onFail();
    };
    const handleError = () => {
      if (handled) return;
      handled = true;
      sysResumeAudio();
      toast(t('adErr'));
      if (onFail) onFail();
    };

    try {
      sysPauseAudio();
      const result = showMethod.call(adv, {
        onOpen: handleOpen,
        onRewarded: handleReward,
        onReward: handleReward,
        onClose: handleClose,
        onError: handleError,
        callbacks: {
          onOpen: handleOpen,
          onRewarded: handleReward,
          onClose: handleClose,
          onError: handleError
        }
      });

      // Если SDK Пикабу возвращает Promise
      if (result && typeof result.then === 'function') {
        result.then((res) => {
          if (!rewarded && (res === true || res?.rewarded !== false)) {
            handleReward();
          }
          handleClose();
        }).catch(() => {
          handleError();
        });
      }
    } catch (e) {
      handleError();
    }
  }

  // === СЕТЕВАЯ ЛОГИКА ===
  $('btn1v1').addEventListener('click', () => {
    if (!db) return toast(t('errNet'));
    showFullscreenAd(); startMatchmaking();
  });

  $('btnCustom').addEventListener('click', () => {
    if (!db) return toast(t('errNet'));
    showFullscreenAd(); showLobbyModal();
  });

  function showLobbyModal() {
    $('mpTitle').textContent = t('mpTitleCustom');$('mpSelection').style.display = 'block';
    $('mpLobby').style.display = 'none';$('mpModal').classList.add('open');
  }

  $('btnCreateRoom').addEventListener('click', () => {
    currentRoomId = Math.floor(100000 + Math.random() * 900000).toString();
    isHost = true; joinRoomFirebase(currentRoomId, 'custom');
  });

  $('btnJoinRoom').addEventListener('click', () => {
    const code = $('mpRoomInput').value.trim();
    if (code.length !== 6) return toast(t('errInput'));
    db.ref('rooms/' + code).once('value', snap => {
      if (!snap.exists()) return toast(t('errNotFound'));
      if (snap.val().state !== 'waiting') return toast(t('errStarted'));
      currentRoomId = code; isHost = false;
      joinRoomFirebase(currentRoomId, 'custom');
    });
  });

  function startMatchmaking() {
    $('mpTitle').textContent = t('mpTitle1v1');$('mpSelection').style.display = 'none'; $('mpLobby').style.display = 'block';$('mpCodeBlock').style.display = 'none'; $('btnStartMp').style.display = 'none';$('mpPlayersList').innerHTML = '<div style="text-align:center; margin:20px 0;"><div class="loading-dots" style="color:var(--violet); transform:scale(1.5);"><i></i><i></i><i></i></div></div>';
    $('mpModal').classList.add('open');

    db.ref('rooms').orderByChild('type').equalTo('1v1').once('value', snap => {
      let found = false;
      snap.forEach(child => {
        let room = child.val();
        if (room.state === 'waiting' && Object.keys(room.players || {}).length === 1) {
          currentRoomId = child.key; isHost = false; found = true;
          joinRoomFirebase(currentRoomId, '1v1'); return true;
        }
      });
      if (!found) {
        currentRoomId = Math.floor(100000 + Math.random() * 900000).toString(); isHost = true;
        joinRoomFirebase(currentRoomId, '1v1');
      }
    });
  }

  function joinRoomFirebase(roomId, roomType) {
    isMultiplayer = true; inMultiplayerMatch = false;
    $('mpSelection').style.display = 'none';$('mpLobby').style.display = 'block';
    if (roomType === 'custom') {
      $('mpCodeBlock').style.display = 'block';$('mpRoomCodeDisplay').textContent = roomId;
    }

    mpRoomRef = db.ref('rooms/' + roomId);

    const myRealName = pikabuPlayerName || null;

    if (isHost) {
      mpRoomRef.onDisconnect().remove();
      mpRoomRef.set({ type: roomType, state: 'waiting', host: myPlayerId, players: { [myPlayerId]: { name: myRealName || t('meHost'), score: 0, roundState: 0 } } });
      if (roomType === 'custom') $('btnStartMp').style.display = 'block';
    } else {
      mpRoomRef.child('players/' + myPlayerId).onDisconnect().remove();
      mpRoomRef.child('players/' + myPlayerId).set({ name: myRealName || t('player'), score: 0, roundState: 0 });
    }

    mpRoomRef.on('value', snap => {
      const data = snap.val();
      if (!data) return leaveLobby();
      const pl = data.players || {};

      if (data.state === 'waiting') {
        $('mpPlayersList').innerHTML = Object.keys(pl).map(id => `<div class="mp-player ready"><span>${escapeHtml(pl[id].name)}</span><span style="color:var(--green)">${t('mpSearchReady')}</span></div>`).join('');
        if (isHost && data.type === '1v1' && Object.keys(pl).length === 2) {
          generateAndStartMpGame();
        }
      }

      if (data.state === 'playing') {
        let opsHtml = '';
        for (let id in pl) {
          if (id !== myPlayerId) opsHtml += `<div class="mp-score-item"><span>${escapeHtml(pl[id].name)}</span><b>${pl[id].score}</b></div>`;
        }
        $('mpOpponentScores').innerHTML = opsHtml || '...';

        if (data.sharedQueue && !inMultiplayerMatch) {
          inMultiplayerMatch = true;
          $('mpModal').classList.remove('open');
          state.queue = data.sharedQueue;
          resetGameData();
          $('mpScoreBoard').style.display = 'block';
          $('formulaCard').style.display = 'none';$('catalogCard').style.display = 'none';
          setScreen('game');
          db.ref(`rooms/${currentRoomId}/players/${myPlayerId}`).update({ roundState: 0 });
          nextRound();
        }

        if (inMultiplayerMatch && state.answered) {
          const allAnswered = Object.keys(pl).length > 0 && Object.values(pl).every(p => (p.roundState || 0) >= state.round);
          if (allAnswered) {
            state.answered = false;
            setTimeout(() => nextRound(), 1500);
          }
        }
      }
    });
  }

  $('btnStartMp').addEventListener('click', generateAndStartMpGame);

  function generateAndStartMpGame() {
    if (!isHost || !mpRoomRef) return;
    $('btnStartMp').disabled = true; $('btnStartMp').textContent = t('mpPreparing');
    const queueToShare = shuffle(state.catalog).slice(0, CONFIG.roundsPerGame).map(t => ({
      trackName: t.trackName || '...', artistName: t.artistName || '...', previewUrl: t.previewUrl || ''
    }));
    mpRoomRef.update({ state: 'playing', sharedQueue: queueToShare }).catch(e => {
      toast(t('errNet'));
      $('btnStartMp').disabled = false; $('btnStartMp').textContent = t('startGame');
    });
  }

  $('mpModalClose').addEventListener('click', leaveLobby);
  function leaveLobby() {
    if (mpRoomRef) { mpRoomRef.child('players/' + myPlayerId).remove(); if (isHost) mpRoomRef.remove(); mpRoomRef.off(); }
    isMultiplayer = false; inMultiplayerMatch = false; mpRoomRef = null; currentRoomId = null; isHost = false;
    $('mpModal').classList.remove('open'); setScreen('home');
  }

  // === ОДИНОЧНАЯ ИГРА ===
  $('startBtn').addEventListener('click', startGameSolo);

  function startGameSolo() {
    if (state.catalog.length < 4) { toast(t('errCat')); return; }
    isMultiplayer = false; state.queue = shuffle(state.catalog).slice(0, CONFIG.roundsPerGame); resetGameData();
    $('mpScoreBoard').style.display = 'none'; $('formulaCard').style.display = 'block';$('catalogCard').style.display = 'block';
    setScreen('game'); nextRound();
  }

  function resetGameData() {
    state.round = 0; state.score = 0; state.streak = 0; state.bestStreak = 0; state.correct = 0; state.lives = CONFIG.maxLives; state.hintUsed = false; state.reviveUsed = false;
    $('scoreLabel').textContent = '0'; updateHearts();
  }

  function updateHearts() { $('hearts').innerHTML = Array.from({ length: CONFIG.maxLives }, (_, i) => `<span class="heart ${i < state.lives ? 'live' : ''}">♥</span>`).join(''); }

  function buildOptions(answer) {
    const others = shuffle(state.catalog.filter(t => trackKey(t) !== trackKey(answer))).slice(0, 3);
    state.options = shuffle([answer, ...others]);
    $('answerGrid').innerHTML = state.options.map((t, i) => `<button class="answer-btn" data-index="${i}" type="button"><span class="answer-letter">${String.fromCharCode(65 + i)}</span><span class="answer-text"><b>${escapeHtml(t.trackName)}</b><span>${escapeHtml(t.artistName)}</span></span></button>`).join('');
    document.querySelectorAll('.answer-btn').forEach(btn => btn.addEventListener('click', () => answerRound(Number(btn.dataset.index))));
  }

  function askRevive() {
    if (isMultiplayer) return finishGame();
    $('modalTitle').textContent = t('modalRevive'); $('modalText').textContent = t('modalReviveText');$('modalActions').innerHTML = `<button id="btnRevive" class="primary-btn" type="button">${t('btnRevive')}</button><button id="btnDie" class="secondary-btn" type="button">${t('btnGiveUp')}</button>`;
    $('modal').classList.add('open');
    $('btnRevive').onclick = () => {$('modal').classList.remove('open'); showRewardedAd(() => { state.reviveUsed = true; state.lives = 1; updateHearts(); nextRound(); }, () => finishGame()); };
    $('btnDie').onclick = () => {$('modal').classList.remove('open'); finishGame(); };
  }

  function askQuit() {
    $('modalTitle').textContent = t('modalQuit'); $('modalText').textContent = t('modalQuitText');$('modalActions').innerHTML = `<button id="btnConfirmQuit" class="primary-btn" type="button" style="background:var(--danger)">${t('btnQuitYes')}</button><button id="btnCancelQuit" class="secondary-btn" type="button">${t('btnQuitNo')}</button>`;
    $('modal').classList.add('open');
    $('btnConfirmQuit').onclick = () => { $('modal').classList.remove('open'); clearTimer(); try { audio.pause(); } catch (e) { } if (isMultiplayer) leaveLobby(); else setScreen('home'); };
    $('btnCancelQuit').onclick = () => { $('modal').classList.remove('open'); };
  }

  function nextRound() {
    clearTimer(); state.answered = false; state.clipStarted = false; state.hintUsed = false;
    if (state.lives <= 0 && !isMultiplayer) { if (!state.reviveUsed) return askRevive(); return finishGame(); }
    if (state.round >= CONFIG.roundsPerGame) return finishGame();

    state.current = state.queue[state.round]; state.round++;
    $('roundKicker').textContent = t('round', state.round, CONFIG.roundsPerGame); $('streakLabel').textContent = t('streak', state.streak);
    $('roundStatus').textContent = t('statusWait'); $('questionSub').textContent = state.usingDemo ? t('statusDemo') : t('statusReady');
    $('timeProgress').style.width = '0%'; $('playClipBtn').textContent = t('btnPlay');
    $('playClipBtn').disabled = false; $('hintBtn').disabled = isMultiplayer;

    renderCover(state.current); buildOptions(state.current);
    if (state.current.previewUrl) { audio.src = state.current.previewUrl; audio.load(); } else audio.removeAttribute('src');
  }

  function clearTimer() { clearInterval(state.timer); state.timer = null; $('soundWave').classList.remove('playing'); const vinyl = $('vinylSvg'); if (vinyl) vinyl.style.animation = 'none'; }

  function playClip() {
    if (state.timer || state.answered) return;
    if (isMultiplayer && state.round === 1 && audio.src) { audio.play().catch(() => { }); audio.pause(); }

    state.clipStarted = true; $('playClipBtn').disabled = true; $('playClipBtn').textContent = t('btnPlaying'); $('roundStatus').textContent = t('statusListen'); $('soundWave').classList.add('playing');
    const vinyl = $('vinylSvg'); if (vinyl) vinyl.style.animation = 'spin 2s linear infinite';

    if (audio.src) {
      audio.currentTime = 0;
      audio.play().catch((e) => {
        clearTimer(); state.clipStarted = false;
        if (isMultiplayer) {
          toast(t('errTrackBreak')); $('playClipBtn').textContent = t('btnBreak'); $('roundStatus').textContent = t('statusChoose');
        } else {
          toast(t('errReplace')); state.round--; state.queue.splice(state.round, 1); state.queue.push(state.catalog[Math.floor(Math.random() * state.catalog.length)]); nextRound(); setTimeout(playClip, 100);
        }
      });
    } else { toast(t('errAudio')); }

    const started = performance.now();
    state.timer = setInterval(() => {
      const pct = Math.min(100, ((performance.now() - started) / (CONFIG.clipSeconds * 1000)) * 100);
      $('timeProgress').style.width = `${pct}%`;
      if (pct >= 100) {
        clearTimer(); try { audio.pause(); } catch { }

        if (isMultiplayer && !state.answered) {
          state.answered = true;
          document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
          state.streak = 0;
          $('streakLabel').textContent = t('streak', state.streak); $('roundStatus').textContent = t('statusTimeOut');
          if (mpRoomRef) { mpRoomRef.child('players/' + myPlayerId).update({ score: state.score, roundState: state.round }); }
        } else if (!isMultiplayer) {
          $('roundStatus').textContent = t('statusEnd');
          $('playClipBtn').disabled = false; $('playClipBtn').textContent = t('btnListenAgain');
        }
      }
    }, 80);
  }

  function answerRound(index) {
    if (state.answered || !state.clipStarted) { if (!state.clipStarted) toast(t('errFirst')); return; }
    state.answered = true; clearTimer(); try { audio.pause(); } catch { }
    const chosen = state.options[index]; const correct = trackKey(chosen) === trackKey(state.current);
    document.querySelectorAll('.answer-btn').forEach((btn, i) => { btn.disabled = true; if (trackKey(state.options[i]) === trackKey(state.current)) btn.classList.add('correct'); });

    if (correct) {
      sfx.correct(); document.querySelectorAll('.answer-btn')[index].classList.add('correct');
      state.correct++; state.streak++; state.bestStreak = Math.max(state.bestStreak, state.streak);
      const mult = state.streak >= 5 ? 3 : state.streak >= 3 ? 2 : 1; const points = 100 * mult; state.score += points;
      $('roundStatus').textContent = `${t('correct')} +${points} ${t('pointsWord')}`; toast(`🔥 ${t('streak', state.streak)}!`);
    } else {
      sfx.wrong(); document.querySelectorAll('.answer-btn')[index].classList.add('wrong');
      if (!isMultiplayer) state.lives--;
      state.streak = 0; $('roundStatus').textContent = `${t('wrong')} «${state.current.trackName}»`; updateHearts();
    }

    $('scoreLabel').textContent = state.score.toLocaleString(); $('streakLabel').textContent = t('streak', state.streak); $('hintBtn').disabled = true;

    if (isMultiplayer && mpRoomRef) {
      mpRoomRef.child('players/' + myPlayerId).update({ score: state.score, roundState: state.round });
      $('roundStatus').textContent = t('waitOthers');
    } else {
      setTimeout(() => nextRound(), correct ? 900 : 1300);
    }
  }

  function useHint() {
    if (state.answered || state.hintUsed) return;
    showRewardedAd(() => {
      state.hintUsed = true; const buttons = [...document.querySelectorAll('.answer-btn')];
      buttons.forEach((btn, i) => { if (state.options[i].artistName !== state.current.artistName) { btn.disabled = true; btn.style.opacity = '.35'; } });
      $('hintBtn').disabled = true; toast(`${t('hintMsg')} ${state.current.artistName}`);
    });
  }
  $('hintBtn').addEventListener('click', useHint);

  function finishGame() {
    clearTimer();
    if (!isMultiplayer) {
      stats.bestScore = Math.max(stats.bestScore, state.score); stats.bestStreak = Math.max(stats.bestStreak, state.bestStreak); stats.roundsPlayed++; saveStats();
      $('finalScore').textContent = state.score.toLocaleString(); $('finalCorrect').textContent = `${state.correct}/${CONFIG.roundsPerGame}`; $('finalStreak').textContent = state.bestStreak; $('finalMultiplier').textContent = `×${state.bestStreak >= 5 ? 3 : state.bestStreak >= 3 ? 2 : 1}`;
      $('resultTitle').textContent = state.lives <= 0 ? t('titleNoLives') : t('titleRoundEnd');
      $('resultCopy').textContent = state.score > stats.bestScore - 1 ? t('resNewRecord') : t('resGood');
      setScreen('result'); if (stats.roundsPlayed % 3 === 0) setTimeout(showFullscreenAd, 350);
    } else {
      $('resultTitle').textContent = t('titleMatchEnd'); $('resultCopy').innerHTML = t('resSum');
      $('finalScore').textContent = state.score.toLocaleString(); $('finalCorrect').textContent = `${state.correct}/${CONFIG.roundsPerGame}`; $('finalStreak').textContent = '—'; $('finalMultiplier').textContent = '—';
      setScreen('result');
      if (mpRoomRef) {
        mpRoomRef.child('players').once('value', snap => {
          let players = []; snap.forEach(p => { players.push(p.val()); }); players.sort((a, b) => b.score - a.score);
          let rankHtml = players.map((p, i) => `<div style="font-size:18px; margin:10px 0;">#${i + 1} <b>${escapeHtml(p.name)}</b>: ${p.score}</div>`).join('');
          $('resultCopy').innerHTML = rankHtml;
        });
      }
      setTimeout(() => { leaveLobby(); }, 8000);
    }
  }

  $('playClipBtn').addEventListener('click', playClip);
  $('againBtn').addEventListener('click', () => { if (isMultiplayer) setScreen('home'); else startGameSolo(); }); $('homeBtn').addEventListener('click', () => setScreen('home'));
  $('helpBtn').addEventListener('click', () => { $('modalTitle').textContent = t('modalHowTo'); $('modalText').textContent = t('modalHowToText'); $('modalActions').innerHTML = `<button id="modalOk" class="primary-btn">${t('modalOk')}</button>`; $('modal').classList.add('open'); $('modalOk').onclick = () => $('modal').classList.remove('open'); }); $('modalClose').addEventListener('click', () => { $('modal').classList.remove('open'); }); $('volumeSlider').addEventListener('input', (e) => { const v = parseFloat(e.target.value); audio.volume = v; if (v > 0) lastVolume = v; $('soundToggle').textContent = v === 0 ? '🔇' : (v < 0.5 ? '🔉' : '🔊'); });
  $('soundToggle').textContent = '🔊'; $('soundToggle').addEventListener('click', () => { if (audio.volume > 0) { audio.volume = 0; $('volumeSlider').value = 0; $('soundToggle').textContent = '🔇'; } else { let v = lastVolume > 0 ? lastVolume : 1; audio.volume = v; $('volumeSlider').value = v; $('soundToggle').textContent = v < 0.5 ? '🔉' : '🔊'; } });
  $('quitGameBtn').addEventListener('click', askQuit);
  updateHomeStats();
})();