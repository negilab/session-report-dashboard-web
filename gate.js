/* 合言葉を受け取って、シートから明細を取ってくるところ。
   取れた明細を startDashboard(明細) に渡すと画面が立ち上がる。 */

(function () {
  const KEY = "セッション報_合言葉";
  const 自動更新の間隔 = 60 * 1000;   // 1分ごとに取り直す

  const gate = document.getElementById("gate");
  const form = document.getElementById("gate-form");
  const input = document.getElementById("gate-pass");
  const msg = document.getElementById("gate-msg");
  const board = document.getElementById("board");
  const stamp = document.getElementById("stamp");
  const reload = document.getElementById("reload");

  /* GASのウェブアプリはリダイレクトを挟むので、JSONPで取りにいく */
  function 取得(pass) {
    return new Promise((ok, ng) => {
      if (!window.CONFIG || !window.CONFIG.endpoint) {
        ng(new Error("つなぎ先がまだ設定されていません(config.js)"));
        return;
      }
      const name = "__cb" + Math.floor(Math.random() * 1e9);
      const s = document.createElement("script");
      const timer = setTimeout(() => { 片付け(); ng(new Error("応答がありません")); }, 20000);

      function 片付け() {
        clearTimeout(timer);
        delete window[name];
        if (s.parentNode) s.parentNode.removeChild(s);
      }

      window[name] = res => { 片付け(); ok(res); };
      s.onerror = () => { 片付け(); ng(new Error("つながりません")); };
      s.src = window.CONFIG.endpoint +
        (window.CONFIG.endpoint.indexOf("?") < 0 ? "?" : "&") +
        "p=" + encodeURIComponent(pass) + "&callback=" + name;
      document.body.appendChild(s);
    });
  }

  /* シートの見出し行から列の位置を決める。列名が変わっても拾えるように */
  function 並べ替え(values) {
    const head = values[0].map(h => String(h).trim());
    const 見つける = (...候補) => {
      for (const c of 候補) {
        const i = head.findIndex(h => h.indexOf(c) === 0);
        if (i >= 0) return i;
      }
      return -1;
    };
    const col = {
      session: 見つける("セッション名", "セッション"),
      time:    見つける("開始時刻", "時刻"),
      major:   見つける("大項目"),
      title:   見つける("題名", "中項目"),
      tokens:  見つける("トークン"),
      note:    見つける("備考"),
      minutes: 見つける("作業時間", "時間")
    };
    const 数 = v => Number(String(v).replace(/[, ]/g, "")) || 0;

    return values.slice(1)
      .filter(r => String(r[col.session]).trim() && String(r[col.major]).trim() !== "合計")
      .map(r => [
        String(r[col.session]).trim(),
        String(r[col.time]).trim(),
        String(r[col.major]).trim(),
        String(r[col.title]).trim(),
        数(r[col.tokens]),
        String(r[col.note] || "").trim(),
        数(r[col.minutes])
      ]);
  }

  let 合言葉 = sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || "";
  let 回している = null;

  async function 読み込む(pass, 初回) {
    const res = await 取得(pass);
    if (!res || !res.ok) throw new Error((res && res.error) || "取れませんでした");
    const rows = 並べ替え(res.values);
    if (!rows.length) throw new Error("明細が1行もありません");
    window.startDashboard(rows);
    stamp.textContent = "シート取得 " + res.updated;
    if (初回) {
      gate.hidden = true;
      board.hidden = false;
      document.body.classList.add("ready");
      localStorage.setItem(KEY, pass);
      if (!回している) 回している = setInterval(() => 読み込む(合言葉, false).catch(() => {}), 自動更新の間隔);
    }
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const pass = input.value.trim();
    if (!pass) return;
    msg.textContent = "つないでいます…";
    try {
      合言葉 = pass;
      await 読み込む(pass, true);
    } catch (err) {
      msg.textContent = err.message;
      localStorage.removeItem(KEY);
    }
  });

  reload.addEventListener("click", async () => {
    stamp.textContent = "取り直しています…";
    try { await 読み込む(合言葉, false); }
    catch (err) { stamp.textContent = err.message; }
  });

  document.getElementById("logout").addEventListener("click", () => {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    location.reload();
  });

  /* 前に入れた合言葉が残っていれば、そのまま出す */
  if (合言葉) {
    input.value = 合言葉;
    読み込む(合言葉, true).catch(err => { msg.textContent = err.message; });
  }
})();
