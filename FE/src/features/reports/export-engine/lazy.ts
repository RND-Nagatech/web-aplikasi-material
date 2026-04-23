type PdfEngine = typeof import("./pdf-engine");

let pdfEnginePromise: Promise<PdfEngine> | null = null;

export const getPdfEngine = (): Promise<PdfEngine> => {
  if (!pdfEnginePromise) {
    pdfEnginePromise = import("./pdf-engine");
  }
  return pdfEnginePromise;
};
