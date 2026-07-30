export type CsvRecord = {
  recordNumber: number;
  values: string[];
};

// Parses RFC-style quoted CSV records without adding a native or platform-specific dependency.
export function parseCsv(csvText: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let currentRecord: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  // Completes one CSV record while ignoring fully blank lines.
  const finishRecord = () => {
    currentRecord.push(currentValue);
    const isBlank = currentRecord.every((value) => value.trim() === "");
    if (!isBlank) {
      records.push({
        recordNumber: records.length + 1,
        values: currentRecord,
      });
    }
    currentRecord = [];
    currentValue = "";
  };

  for (let characterIndex = 0; characterIndex < csvText.length; characterIndex += 1) {
    const character = csvText[characterIndex];

    if (insideQuotes) {
      if (character === '"' && csvText[characterIndex + 1] === '"') {
        currentValue += '"';
        characterIndex += 1;
      } else if (character === '"') {
        insideQuotes = false;
      } else {
        currentValue += character;
      }
      continue;
    }

    if (character === '"') {
      if (currentValue !== "") {
        throw new Error("A quoted CSV value must start with a quote.");
      }
      insideQuotes = true;
    } else if (character === ",") {
      currentRecord.push(currentValue);
      currentValue = "";
    } else if (character === "\n") {
      finishRecord();
    } else if (character !== "\r") {
      currentValue += character;
    }
  }

  if (insideQuotes) {
    throw new Error("The CSV ends inside a quoted value.");
  }
  if (currentRecord.length > 0 || currentValue !== "") {
    finishRecord();
  }

  return records;
}