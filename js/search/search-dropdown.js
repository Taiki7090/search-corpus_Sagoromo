const orderedCategories = {
  pos: [
    "名詞",
    "代名詞",
    "形状詞",
    "連体詞",
    "副詞",
    "接続詞",
    "感動詞",
    "動詞",
    "形容詞",
    "助動詞",
    "助詞",
    "接頭辞",
    "接尾辞",
    "記号",
    "補助記号",
    "空白",
  ],

  conj_type: [
    "五段",
    "上一段",
    "下一段",
    "カ行変格",
    "サ行変格",
    "形容詞",
    "助動詞",
    "無変化型",
    "文語四段",
    "文語上一段",
    "文語上二段",
    "文語下一段",
    "文語下二段",
    "文語カ行変格",
    "文語サ行変格",
    "文語ナ行変格",
    "文語ラ行変格",
    "文語形容詞",
    "文語助動詞",
  ],

  conj_form: [
    "未然形",
    "連用形",
    "終止形",
    "連体形",
    "仮定形",
    "命令形",
    "已然形",
    "語幹",
    "ク語法",
    "ミ語法",
    "意志推量形",
  ],
};

let morphologyData = {
  pos: {
    pos_list: [],
    pos_hierarchy: {},
  },
  conj: {
    conj_type_list: [],
    conj_form_list: [],
  },
  posMajorCategories: [],
  conjTypeMajorCategories: [],
  conjFormMajorCategories: [],
};

export function createMorphologyDropdown(container, type) {
  if (!morphologyData) {
    console.error("形態素データが読み込まれていません");
    return;
  }

  let majorCategories = [];

  switch (type) {
    case "pos":
      majorCategories = orderedCategories.pos.filter((cat) =>
        morphologyData.posMajorCategories.includes(cat)
      );
      break;
    case "conj_type":
      majorCategories = orderedCategories.conj_type.filter((cat) =>
        morphologyData.conjTypeMajorCategories.includes(cat)
      );
      break;
    case "conj_form":
      majorCategories = orderedCategories.conj_form.filter((cat) =>
        morphologyData.conjFormMajorCategories.includes(cat)
      );
      break;
  }

  const majorSelect = document.createElement("select");
  majorSelect.className = "condition-value";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "-- 選択 --";
  majorSelect.appendChild(emptyOption);

  majorCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    majorSelect.appendChild(option);
  });

  majorSelect.addEventListener("change", function () {
    const selectedCategory = this.value;

    if (selectedCategory) {
      if (type === "pos") {
        majorSelect.setAttribute("data-value", `${selectedCategory}%`);
      } else {
        majorSelect.setAttribute("data-value", `${selectedCategory}%`);
      }
    } else {
      majorSelect.setAttribute("data-value", "");
    }
  });

  container.appendChild(majorSelect);
}

export function attachChangeEvent(select) {
  if (select.classList.contains("has-change-event")) {
    return;
  }

  select.addEventListener("change", function () {
    const selectedType = this.value;
    const conditionContainer = this.closest(
      ".search-condition, .short-unit-condition"
    );
    const inputContainer = conditionContainer.querySelector(
      ".search-condition-input"
    );

    if (!inputContainer) {
      console.error("入力コンテナが見つかりません");
      return;
    }

    inputContainer.innerHTML = "";

    if (selectedType === "品詞") {
      createMorphologyDropdown(inputContainer, "pos");
    } else if (selectedType === "活用型") {
      createMorphologyDropdown(inputContainer, "conj_type");
    } else if (selectedType === "活用形") {
      createMorphologyDropdown(inputContainer, "conj_form");
    } else {
      const inputField = document.createElement("input");
      inputField.type = "text";
      inputField.className = "condition-value";
      inputField.placeholder = "短単位の文字列を入力";
      inputContainer.appendChild(inputField);
    }
  });

  select.classList.add("has-change-event");

  if (["品詞", "活用型", "活用形"].includes(select.value)) {
    const event = new Event("change");
    select.dispatchEvent(event);
  }
}

function extractMajorCategories(fullList) {
  const categories = new Set();

  if (!fullList || !Array.isArray(fullList)) {
    console.error(
      "extractMajorCategoriesに無効なデータが渡されました",
      fullList
    );
    return [];
  }

  fullList.forEach((item) => {
    if (item && item.includes("-")) {
      const majorCategory = item.split("-")[0];
      categories.add(majorCategory);
    } else if (item) {
      categories.add(item);
    }
  });

  return Array.from(categories).sort();
}

function setupConditionTypeChangeEvents() {
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1 && node.querySelectorAll) {
            const newSelects = node.querySelectorAll(
              ".condition-type:not(.has-change-event)"
            );
            newSelects.forEach((select) => attachChangeEvent(select));
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  document
    .querySelectorAll(".condition-type:not(.has-change-event)")
    .forEach((select) => {
      attachChangeEvent(select);
    });
}

document.addEventListener("DOMContentLoaded", function () {
  Promise.all([
    fetch("resources/data/pos_info.json").then((response) => {
      if (!response.ok) {
        throw new Error(
          `JSON読み込みエラー: ${response.status} ${response.statusText}`
        );
      }
      return response.json();
    }),
    fetch("resources/data/conj_info.json").then((response) => {
      if (!response.ok) {
        throw new Error(
          `JSON読み込みエラー: ${response.status} ${response.statusText}`
        );
      }
      return response.json();
    }),
  ])
    .then(([posData, conjData]) => {
      morphologyData = {
        pos: posData,
        conj: conjData,
        posMajorCategories: extractMajorCategories(posData.pos_list),
        conjTypeMajorCategories: extractMajorCategories(
          conjData.conj_type_list
        ),
        conjFormMajorCategories: extractMajorCategories(
          conjData.conj_form_list
        ),
      };

      setupConditionTypeChangeEvents();
    })
    .catch((error) => {
      console.error("形態素情報の読み込みに失敗しました:", error);

      const posData = {
        pos_list: [
          "代名詞-*-*-*",
          "副詞-*-*-*",
          "助動詞-*-*-*",
          "助詞-係助詞-*-*",
          "助詞-副助詞-*-*",
          "名詞-一般-*-*",
          "名詞-固有名詞-人名-*",
          "名詞-固有名詞-地名-*",
          "動詞-一般-*-*",
          "形容詞-一般-*-*",
        ],
        pos_hierarchy: {
          名詞: ["一般", "固有名詞", "代名詞", "数詞"],
          動詞: ["一般", "非自立可能"],
          形容詞: ["一般", "非自立可能"],
          助詞: ["係助詞", "副助詞", "接続助詞", "格助詞", "終助詞"],
          助動詞: ["*"],
        },
      };

      const conjData = {
        conj_type_list: [
          "カ行変格",
          "サ行変格",
          "上一段-ア行",
          "助動詞-タ",
          "文語助動詞-キ",
          "五段-カ行",
          "五段-ガ行",
          "五段-サ行",
          "下一段-ア行",
          "形容詞-一般",
        ],
        conj_form_list: [
          "仮定形-一般",
          "命令形",
          "已然形-一般",
          "未然形-サ",
          "連用形-一般",
          "終止形-一般",
          "連体形-一般",
          "意志推量形",
        ],
      };

      morphologyData = {
        pos: posData,
        conj: conjData,
        posMajorCategories: extractMajorCategories(posData.pos_list),
        conjTypeMajorCategories: extractMajorCategories(
          conjData.conj_type_list
        ),
        conjFormMajorCategories: extractMajorCategories(
          conjData.conj_form_list
        ),
      };

      setupConditionTypeChangeEvents();
    });
});
