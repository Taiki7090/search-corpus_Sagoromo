export const columnOrderInternalKeys = [
  "ファイル名",
  "対校表番号",
  "開始文字位置",
  "終了文字位置",
  "文境界",
  "前文脈",
  "キー",
  "後文脈",
  "語彙素",
  "語彙素読み",
  "品詞",
  "活用型",
  "活用形",
  "発音形出現形",
  "語種",
  "原文文字列",
  "巻名",
  "伝本名",
  "page-lineBegining",
  "話者数",
  "話者ID",
  "年齢",
  "職業",
  "permalink",
];

export const columnDisplayNames = {
  // use this definition for both demo and upload data
  upload: {
    ファイル名: "ファイル名",
    開始文字位置: "開始文字位置",
    終了文字位置: "終了文字位置",
    文境界: "文境界",
    前文脈: "前文脈",
    キー: "キー",
    後文脈: "後文脈",
    語彙素: "語彙素",
    語彙素読み: "語彙素読み",
    品詞: "品詞",
    活用型: "活用型",
    活用形: "活用形",
    発音形出現形: "発音形出現形",
    語種: "語種",
    原文文字列: "原文KWIC",
    巻名: "巻名",
    "page-lineBegining": "丁数・行数",
    伝本名: "伝本名",
    対校表番号: "対校表番号",
    話者数: "話者数", // hidden
    話者ID: "話者ID", // hidden
    年齢: "年齢", // hidden
    職業: "職業", // hidden
    permalink: "permalink", // hidden
  },
};

// NDL corpus column name mapping
export const ndlColumnDisplayOverrides = {
  // ndl spoken (historical audio)
  "歴史的音源": {
    伝本名: "話者",
  },
  // ndl written (book)
  "図書(914.6)": {
  },
};

// return the column display name mapping based on collation id
export function getDynamicColumnDisplayNames(tokens) {
  const baseDisplayNames = { ...columnDisplayNames.upload };

  if (!tokens || tokens.length === 0) {
    return baseDisplayNames;
  }

  const firstValidToken = tokens.find(
    (token) => token && !token.isErrorToken && token["対校表番号"]
  );

  if (!firstValidToken) {
    return baseDisplayNames;
  }

  const collationId = firstValidToken["対校表番号"];

  if (ndlColumnDisplayOverrides[collationId]) {
    const overrides = ndlColumnDisplayOverrides[collationId];
    return { ...baseDisplayNames, ...overrides };
  }

  return baseDisplayNames;
}

export const columnNameToIdMap = {
  // Set the checkbox ID to match the HTML element's id
  ファイル名: "file-name",
  開始文字位置: "position",
  終了文字位置: "end-position",
  文境界: "bos",
  前文脈: "pre-context",
  キー: "key",
  後文脈: "post-context",
  語彙素: "lemma",
  語彙素読み: "lemma-reading",
  品詞: "pos",
  活用型: "conj-type",
  活用形: "conj-form",
  発音形出現形: "pronunciation",
  語種: "word-type",
  原文文字列: "original-text",
  巻名: "volume",
  "page-lineBegining": "page-lineBegining",
  伝本名: "speaker",
  対校表番号: "collation-id",
  話者数: "speaker-count",
  話者ID: "speaker-id",
  年齢: "age",
  職業: "occupation",
  permalink: "permalink",
};

export const uploadHiddenInternalKeys = [
  "話者数",
  "話者ID",
  "年齢",
  "職業",
  "permalink",
];
