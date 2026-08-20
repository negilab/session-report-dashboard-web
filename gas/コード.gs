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
