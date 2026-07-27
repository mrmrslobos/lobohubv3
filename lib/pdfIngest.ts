// Client-side PDF text extraction + chunking for the admin ingest flow.
// Runs entirely in the browser so the raw PDF never has to cross the network
// (Vercel functions cap request bodies well under most of these files' size) —
// only small batches of already-chunked text go to the server for embedding.
// pdfjs-dist is dynamically imported so it doesn't bloat the main bundle for
// elders who never touch the admin page.

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;

export interface PageChunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return chunks;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

export async function extractAndChunkPdf(
  file: File,
  onPageExtracted?: (pagesDone: number, pagesTotal: number) => void
): Promise<{ chunks: PageChunk[]; pageCount: number }> {
  const [pdfjsLib, workerUrl] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url').then((m) => m.default),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const chunks: PageChunk[] = [];
  let chunkIndex = 0;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    for (const content of chunkText(text)) {
      chunks.push({ content, pageNumber, chunkIndex: chunkIndex++ });
    }
    onPageExtracted?.(pageNumber, pdf.numPages);
  }

  return { chunks, pageCount: pdf.numPages };
}
