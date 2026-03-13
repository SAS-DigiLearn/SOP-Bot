import fs from "fs";
import mammoth from "mammoth";
import pdf from "pdf-parse";

const dataDir = "./docs";
const output = "./data/knowledge.json";

let paragraphs = [];

/* ---------------- IMAGE MARKER SUPPORT ---------------- */

function extractImage(text) {
  const match = text.match(/\[image:(.*?)\]/i);
  if (!match) return null;
  return "images/" + match[1].trim();
}

function removeImageMarker(text) {
  return text.replace(/\[image:.*?\]/i, "").trim();
}

/* ---------------- DOCX EXTRACTION ---------------- */

async function extractDOCX(file) {

  const result = await mammoth.convertToHtml({ path: file });

  const html = result.value;

  const blocks = html.split(/(<table[\s\S]*?<\/table>)/g);

  let parsed = [];

  blocks.forEach(block => {

    if (block.startsWith("<table")) {

      parsed.push({
        type: "table",
        content: block
      });

    } else {

      const paras = block.split(/\n{2,}/);

      paras.forEach(p => {

        const clean = p.replace(/<\/?[^>]+(>|$)/g, "").trim();

        if (clean.length > 0) {

          const image = extractImage(clean);
          const text = removeImageMarker(clean);

          parsed.push({
            type: "text",
            content: text,
            image: image
          });

        }

      });

    }

  });

  return parsed;

}

/* ---------------- PDF EXTRACTION ---------------- */

async function extractPDF(file) {

  const dataBuffer = fs.readFileSync(file);
  const data = await pdf(dataBuffer);

  return data.text.split(/\n{2,}/).map(p => ({
    type: "text",
    content: p.trim()
  }));

}

/* ---------------- MAIN BUILD ---------------- */

async function run() {

  const files = fs.readdirSync(dataDir);

  for (const file of files) {

    const path = `${dataDir}/${file}`;
    let items = [];

    if (file.endsWith(".docx")) {
      items = await extractDOCX(path);
    }

    if (file.endsWith(".pdf")) {
      items = await extractPDF(path);
    }

    items.forEach((item, i) => {

      if (!item.content) return;

      const entry = {
        filename: file,
        paragraph: i + 1,
        type: item.type,
        content: item.content
      };

      if (item.image) {
        entry.image = item.image;
      }

      paragraphs.push(entry);

    });

  }

  fs.writeFileSync(output, JSON.stringify(paragraphs, null, 2));

  console.log("Knowledge base built:", paragraphs.length);

}

run();
