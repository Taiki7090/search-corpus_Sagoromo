export async function validateFiles(files) {
  if (!files || files.length === 0) {
    return {
      valid: false,
      error: "ファイルが選択されていません",
      showModal: false,
    };
  }

  const MAX_FILES = 250;
  const MAX_TOTAL_SIZE_MB = 100;
  const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;
  const ALLOWED_EXTENSIONS = ["txt", "tsv"];

  let errorMessages = [];
  let warningMessages = [];
  let validFiles = [];
  let totalSize = 0;

  if (files.length > MAX_FILES) {
    return {
      valid: false,
      error: `ファイル数上限 ${MAX_FILES} を超えています (${files.length} 個)`,
      showModal: false,
    };
  }

  for (const file of files) {
    const fileExtension = file.name?.split(".").pop()?.toLowerCase() || "";

    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      errorMessages.push(`不正な拡張子: ${file.name}`);
    } else {
      validFiles.push(file);
      totalSize += file.size;
    }
  }

  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    return {
      valid: false,
      error: `合計サイズ上限 ${MAX_TOTAL_SIZE_MB}MB を超えています (${(
        totalSize /
        (1024 * 1024)
      ).toFixed(1)}MB)`,
      showModal: false,
    };
  }

  if (errorMessages.length > 0) {
    return {
      valid: false,
      error: errorMessages.join("\n"),
      showModal: false,
    };
  }

  const MAX_PARALLEL_CHECKS = 5;
  const results = [];

  for (let i = 0; i < validFiles.length; i += MAX_PARALLEL_CHECKS) {
    const batch = validFiles.slice(i, i + MAX_PARALLEL_CHECKS);

    const batchPromises = batch.map(async (file) => {
      try {
        // check UTF-8
        const utf8Result = await isValidUTF8(file);
        if (!utf8Result.valid) {
          return {
            file: file.name,
            valid: false,
            error: utf8Result.error,
            errorType: "encoding",
          };
        }

        // check BOM
        if (utf8Result.hasBOM) {
          warningMessages.push(`${file.name}: UTF-8 BOMが検出されました`);
        }

        // check tab delimiter and field count (maxSampleLines=100)
        const formatResult = await checkFileFormat(file, 100);

        if (!formatResult.valid) {
          const isFieldCountError =
            formatResult.error &&
            (formatResult.error.includes(
              "フィールド数が13または14ではありません"
            ) ||
              formatResult.lineDetails);

          return {
            file: file.name,
            valid: false,
            error: formatResult.error,
            errorType: isFieldCountError ? "fieldCount" : "format",
            lineDetails: formatResult.lineDetails,
          };
        }

        // check LF
        if (
          !formatResult.valid &&
          (formatResult.hasCRLF || formatResult.hasCR)
        ) {
          return {
            valid: false,
            error: `${file.name}: ${formatResult.error}`,
            showModal: false,
          };
        }

        if (
          formatResult.warningMessages &&
          formatResult.warningMessages.length > 0
        ) {
          formatResult.warningMessages.forEach((msg) => {
            if (msg) {
              warningMessages.push(`${file.name}: ${msg}`);
            }
          });
        }

        return {
          file: file.name,
          valid: true,
          preview: formatResult.preview,
        };
      } catch (checkError) {
        console.error("[DEBUG] ファイル検証中にエラー:", file.name, checkError);
        return {
          file: file.name,
          valid: false,
          error: `検証中にエラーが発生しました: ${checkError.message}`,
          errorType: "other",
        };
      }
    });

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (batchError) {
      console.error("[DEBUG] バッチ処理中にエラー:", batchError);
      batch.forEach((file) => {
        results.push({
          file: file.name,
          valid: false,
          error: `バッチ処理中にエラーが発生しました: ${batchError.message}`,
          errorType: "other",
        });
      });
    }
  }

  const fileErrors = results.filter((r) => !r.valid);
  if (fileErrors.length > 0) {
    const fieldCountErrors = fileErrors.filter(
      (e) => e.errorType === "fieldCount"
    );
    const otherErrors = fileErrors.filter((e) => e.errorType !== "fieldCount");

    if (fieldCountErrors.length > 0) {
      const fieldCountErrorMessage = fieldCountErrors
        .map((e) => {
          const fileName = e.file;
          const errorText = e.error || "不明なエラー";

          if (
            errorText.includes(
              "次の行でフィールド数が13または14ではありません"
            )
          ) {
            return `${fileName}: ${errorText}`;
          }

          if (e.lineDetails && e.lineDetails.length > 0) {
            const problemLines = e.lineDetails
              .map(
                (line) => `${line.lineNumber}行目: ${line.fieldCount}フィールド`
              )
              .join("\n  ");

            return `${fileName}: 次の行でフィールド数が13または14ではありません:\n  ${problemLines}`;
          }

          return `${fileName}: ${errorText}`;
        })
        .filter(Boolean)
        .join("\n");

      // The modal window is used only for field count errors.
      return {
        valid: false,
        error: fieldCountErrorMessage,
        showModal: true,
      };
    }

    if (otherErrors.length > 0) {
      const otherErrorMessage = otherErrors
        .map((e) => `${e.file}: ${e.error || "不明なエラー"}`)
        .join("\n");
      return {
        valid: false,
        error: otherErrorMessage,
        showModal: false,
      };
    }
  }
  return {
    valid: true,
    warnings: warningMessages,
    validFiles: validFiles,
    showModal: false,
  };
}

export function isValidUTF8(file) {
  return new Promise((resolve, _reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = function (event) {
      try {
        const buffer = event.target.result;
        const dataView = new DataView(buffer);

        // check BOM
        const hasBOM =
          buffer.byteLength >= 3 &&
          dataView.getUint8(0) === 0xef &&
          dataView.getUint8(1) === 0xbb &&
          dataView.getUint8(2) === 0xbf;

        // decode as UTF-8
        const decoder = new TextDecoder("utf-8", { fatal: true });
        try {
          decoder.decode(buffer);
          resolve({
            valid: true,
            hasBOM: hasBOM,
          });
        } catch {
          resolve({
            valid: false,
            error: "ファイルはUTF-8エンコーディングではありません",
          });
        }
      } catch (error) {
        resolve({
          valid: false,
          error:
            "エンコーディングチェック中にエラーが発生しました: " +
            error.message,
        });
      }
    };

    reader.onerror = function () {
      resolve({
        valid: false,
        error: "ファイル読み込み中にエラーが発生しました",
      });
    };
  });
}

export function checkFileFormat(file, maxSampleLines = 50) {
  return new Promise((resolve, _reject) => {
    const reader = new FileReader();
    reader.readAsText(file);

    reader.onload = function (event) {
      try {
        const content = event.target.result;
        if (!content || content.trim() === "") {
          resolve({
            valid: false,
            error: "ファイルが空です",
          });
          return;
        }

        const lines = content.split(/\r?\n/);

        // check empty file
        if (lines.length === 0) {
          resolve({
            valid: false,
            error: "ファイルに有効な行がありません",
          });
          return;
        }

        // check long lines
        const MAX_LINE_LENGTH = 50000;
        for (let i = 0; i < Math.min(lines.length, maxSampleLines); i++) {
          if (lines[i].length > MAX_LINE_LENGTH) {
            resolve({
              valid: false,
              error: `${i + 1}行目が異常に長いです（${lines[i].length}文字）`,
            });
            return;
          }
        }

        // check LF
        const hasCRLF = content.includes("\r\n");
        const hasCR = !hasCRLF && content.includes("\r");

        if (hasCRLF || hasCR) {
          let errorMessage = "";
          if (hasCRLF) {
            errorMessage = "CRLF改行コード（Windows形式）が検出されました。";
          } else if (hasCR) {
            errorMessage = "CR改行コード（旧Mac形式）が検出されました。";
          }

          resolve({
            valid: false,
            error: `${errorMessage}LF改行コード（Unix形式）に変換してください。`,
          });
          return;
        }

        // check line count
        const WARN_LINE_COUNT = 100000;
        const lineCountWarning =
          lines.length > WARN_LINE_COUNT
            ? `警告: ファイルの行数が多いです (${lines.length.toLocaleString()}行)`
            : "";

        let hasTabDelimiter = false;
        let sampleLines = Math.min(lines.length, maxSampleLines);
        let fieldCountList = [];
        let invalidLines = [];

        for (let i = 0; i < sampleLines; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          if (line.includes("\t")) {
            hasTabDelimiter = true;

            const fields = line.split("\t");
            fieldCountList.push(fields.length);

            if (fields.length !== 13 && fields.length !== 14) {
              invalidLines.push({
                lineNumber: i + 1,
                fieldCount: fields.length,
              });
            }
          }
        }

        // check tab delimiter
        if (!hasTabDelimiter) {
          resolve({
            valid: false,
            error: "タブ区切りではないようです",
          });
          return;
        }

        // check field count
        if (invalidLines.length > 0) {
          const problemLines = invalidLines
            .map(
              (line) => `${line.lineNumber}行目: ${line.fieldCount}フィールド`
            )
            .join("\n  ");

          resolve({
            valid: false,
            error: `次の行でフィールド数が13または14ではありません:\n  ${problemLines}`,
            lineDetails: invalidLines,
          });
          return;
        }

        resolve({
          valid: true,
          hasCRLF: hasCRLF,
          hasTabDelimiter: hasTabDelimiter,
          fieldCounts: fieldCountList,
          warningMessages: [lineCountWarning].filter(Boolean),
          preview: lines.slice(0, 3).join("\n"),
        });
      } catch (error) {
        console.error(
          "[DEBUG] ファイル形式チェック中にエラー:",
          file.name,
          error
        );
        resolve({
          valid: false,
          error:
            "ファイル形式チェック中にエラーが発生しました: " + error.message,
        });
      }
    };

    reader.onerror = function (error) {
      console.error("[DEBUG] ファイル読み込みエラー:", file.name, error);
      resolve({
        valid: false,
        error: "ファイル読み込み中にエラーが発生しました",
      });
    };
  });
}
