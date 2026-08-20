/**
 * セッション報ダッシュボードの受け口。
 * スプレッドシート「セッション報」の 拡張機能 → Apps Script に、このまま貼ります。
 *
 * ここでやること
 *   合言葉が合っていれば、シートの中身をそのまま返す。合わなければ何も返さない。
 *
 * 貼ったあとの手順は gas/README_デプロイ手順.md にあります。
 */

/* ▼ ここだけ書き換えます ▼ */
var 合言葉 = 'ここに合言葉';      // 見る人に伝える言葉。半角英数がおすすめ
var シート名 = '';                // 空なら1枚目のシート。名前を入れるとそのシート
/* ▲ ここまで ▲ */

function doGet(e) {
  var params = (e && e.parameter) || {};
  var callback = params.callback;

  if (params.p !== 合言葉) {
    return 返す({ ok: false, error: '合言葉がちがいます' }, callback);
  }

  try {
    var book = SpreadsheetApp.getActiveSpreadsheet();   // このスクリプトが付いているシート
    var sheet = シート名 ? book.getSheetByName(シート名) : book.getSheets()[0];
    if (!sheet) return 返す({ ok: false, error: 'シートが見つかりません' }, callback);

    var values = sheet.getDataRange().getDisplayValues();
    return 返す({
      ok: true,
      updated: Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm'),
      sheet: sheet.getName(),
      values: values
    }, callback);
  } catch (err) {
    return 返す({ ok: false, error: String(err) }, callback);
  }
}


/**
 * 使用量の記録口。Chrome拡張が8時間ごとにここへ投げる。
 * 中身: {p:"合言葉", usage:{ /api/organizations/{org}/usage が返したもの }}
 * シート「使用量」に1行足す。
 */
function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return 返す({ ok: false, error: '中身が読めません' }); }

  if (!body || body.p !== 合言葉) return 返す({ ok: false, error: '合言葉がちがいます' });
  var u = body.usage;
  if (!u) return 返す({ ok: false, error: 'usage がありません' });

  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sh = book.getSheetByName('使用量');
  if (!sh) {
    sh = book.insertSheet('使用量');
    sh.appendRow(['記録した時刻', '5時間枠(%)', '5時間枠のリセット', '週・すべて(%)', '週・Fable(%)',
      '週のリセット', '追加クレジット(ドル)', '備考']);
  }

  var 探す = function (kind) {
    var a = u.limits || [];
    for (var i = 0; i < a.length; i++) if (a[i].kind === kind) return a[i];
    return {};
  };
  var 和 = function (iso) {
    if (!iso) return '';
    return Utilities.formatDate(new Date(iso), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
  };

  var 枠 = 探す('session'), 週 = 探す('weekly_all'), 週M = 探す('weekly_scoped');
  var クレジット = (u.spend && u.spend.used) ? u.spend.used.amount_minor / 100 : '';

  sh.appendRow([
    Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm'),
    枠.percent != null ? 枠.percent : '',
    和(枠.resets_at),
    週.percent != null ? 週.percent : '',
    週M.percent != null ? 週M.percent : '',
    和(週.resets_at),
    クレジット,
    (週M.scope && 週M.scope.model) ? '週の内訳は ' + 週M.scope.model.display_name : ''
  ]);

  return 返す({ ok: true, 行数: sh.getLastRow() });
}

function 返す(obj, callback) {
  var body = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}
