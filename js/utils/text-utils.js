// 半角カタカナ（濁点・半濁点の合成を含む）→ 全角カタカナの変換表
// 合成形（base + ﾞ/ﾟ）を単独形より先に並べ、正規表現の選択で優先的に一致させる
const HALF_TO_FULL_KATAKANA = {
  ｶﾞ: "ガ", ｷﾞ: "ギ", ｸﾞ: "グ", ｹﾞ: "ゲ", ｺﾞ: "ゴ",
  ｻﾞ: "ザ", ｼﾞ: "ジ", ｽﾞ: "ズ", ｾﾞ: "ゼ", ｿﾞ: "ゾ",
  ﾀﾞ: "ダ", ﾁﾞ: "ヂ", ﾂﾞ: "ヅ", ﾃﾞ: "デ", ﾄﾞ: "ド",
  ﾊﾞ: "バ", ﾋﾞ: "ビ", ﾌﾞ: "ブ", ﾍﾞ: "ベ", ﾎﾞ: "ボ",
  ﾊﾟ: "パ", ﾋﾟ: "ピ", ﾌﾟ: "プ", ﾍﾟ: "ペ", ﾎﾟ: "ポ",
  ｳﾞ: "ヴ", ﾜﾞ: "ヷ", ｦﾞ: "ヺ",
  ｱ: "ア", ｲ: "イ", ｳ: "ウ", ｴ: "エ", ｵ: "オ",
  ｶ: "カ", ｷ: "キ", ｸ: "ク", ｹ: "ケ", ｺ: "コ",
  ｻ: "サ", ｼ: "シ", ｽ: "ス", ｾ: "セ", ｿ: "ソ",
  ﾀ: "タ", ﾁ: "チ", ﾂ: "ツ", ﾃ: "テ", ﾄ: "ト",
  ﾅ: "ナ", ﾆ: "ニ", ﾇ: "ヌ", ﾈ: "ネ", ﾉ: "ノ",
  ﾊ: "ハ", ﾋ: "ヒ", ﾌ: "フ", ﾍ: "ヘ", ﾎ: "ホ",
  ﾏ: "マ", ﾐ: "ミ", ﾑ: "ム", ﾒ: "メ", ﾓ: "モ",
  ﾔ: "ヤ", ﾕ: "ユ", ﾖ: "ヨ",
  ﾗ: "ラ", ﾘ: "リ", ﾙ: "ル", ﾚ: "レ", ﾛ: "ロ",
  ﾜ: "ワ", ｦ: "ヲ", ﾝ: "ン",
  ｧ: "ァ", ｨ: "ィ", ｩ: "ゥ", ｪ: "ェ", ｫ: "ォ",
  ｬ: "ャ", ｭ: "ュ", ｮ: "ョ", ｯ: "ッ",
  ｰ: "ー", ﾞ: "゛", ﾟ: "゜", "｡": "。", "｢": "「", "｣": "」", "､": "、", "･": "・",
};

const HALF_TO_FULL_KATAKANA_REGEX = new RegExp(
  "(" + Object.keys(HALF_TO_FULL_KATAKANA).join("|") + ")",
  "g"
);

/**
 * 文字列を全角カタカナに変換する。
 * ・ひらがな → 全角カタカナ
 * ・半角カタカナ（濁点・半濁点の合成を含む）→ 全角カタカナ
 * その他の文字（漢字・英数字・正規表現記号など）はそのまま残す。
 * @param {string} str
 * @returns {string}
 */
export function toFullWidthKatakana(str) {
  if (!str) return str;

  // 半角カタカナ → 全角カタカナ
  let result = str.replace(
    HALF_TO_FULL_KATAKANA_REGEX,
    (match) => HALF_TO_FULL_KATAKANA[match]
  );

  // ひらがな（U+3041〜U+3096, U+309D〜U+309E）→ 全角カタカナ
  result = result.replace(/[ぁ-ゖゝ-ゞ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );

  return result;
}

export function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "&apos;");
}
