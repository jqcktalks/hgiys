import yauzl from "yauzl";
import sax from "sax";

const TABLE_NS = "table:";
const MAX_REPEAT = 1024;

export type RowHandler = (sheet: string, row: string[], rowIndex: number) => void;

export class StopParsing extends Error {
  constructor() {
    super("StopParsing");
    this.name = "StopParsing";
  }
}

export function streamOds(path: string, onRow: RowHandler): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);

      zip.on("entry", (entry) => {
        if (entry.fileName !== "content.xml") {
          zip.readEntry();
          return;
        }

        zip.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr) return reject(streamErr);

          const parser = sax.createStream(true, { trim: false });

          let sheet = "";
          let rowIndex = 0;
          let row: string[] = [];
          let cellText = "";
          let cellRepeat = 1;
          let rowRepeat = 1;
          let inCell = false;
          let depthInCell = 0;
          let stopped = false;

          const finish = (error?: Error) => {
            if (stopped) return;
            stopped = true;
            readStream.destroy();
            if (error) reject(error);
            else resolve();
          };

          parser.on("opentag", (node) => {
            if (stopped) return;
            const name = node.name;

            if (name === TABLE_NS + "table") {
              sheet = String(node.attributes[TABLE_NS + "name"] ?? "");
              rowIndex = 0;
              return;
            }

            if (name === TABLE_NS + "table-row") {
              row = [];
              rowRepeat = clampRepeat(node.attributes[TABLE_NS + "number-rows-repeated"]);
              return;
            }

            if (name === TABLE_NS + "table-cell" || name === TABLE_NS + "covered-table-cell") {
              inCell = true;
              depthInCell = 0;
              cellText = "";
              cellRepeat = clampRepeat(node.attributes[TABLE_NS + "number-columns-repeated"]);
              return;
            }

            if (inCell) depthInCell++;
          });

          parser.on("text", (text) => {
            if (inCell) cellText += text;
          });
          parser.on("cdata", (text) => {
            if (inCell) cellText += text;
          });

          parser.on("closetag", (name) => {
            if (stopped) return;

            if (name === TABLE_NS + "table-cell" || name === TABLE_NS + "covered-table-cell") {
              inCell = false;
              const value = cellText.trim();
              const repeat = value === "" && cellRepeat > 64 ? 1 : cellRepeat;
              for (let i = 0; i < repeat; i++) row.push(value);
              cellText = "";
              return;
            }

            if (name === TABLE_NS + "table-row") {
              const emit = rowRepeat > 64 && row.every((c) => c === "") ? 1 : rowRepeat;
              try {
                for (let i = 0; i < emit; i++) onRow(sheet, row, rowIndex++);
              } catch (e) {
                if (e instanceof StopParsing) return finish();
                return finish(e as Error);
              }
              row = [];
              return;
            }

            if (inCell && depthInCell > 0) depthInCell--;
          });

          parser.on("error", (e) => finish(e));
          parser.on("end", () => finish());
          readStream.on("error", (e) => finish(e));

          readStream.pipe(parser);
        });
      });

      zip.on("error", reject);
      zip.on("end", () => resolve());
      zip.readEntry();
    });
  });
}

function clampRepeat(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_REPEAT);
}
