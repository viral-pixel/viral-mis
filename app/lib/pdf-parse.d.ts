declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  interface PdfTextItem {
    str: string;
    transform: number[];
  }
  interface PdfPageData {
    pageNumber: number;
    getTextContent(): Promise<{ items: PdfTextItem[] }>;
  }
  interface PdfParseOptions {
    // Custom per-page text renderer — return value becomes that page's
    // slice of `text`. Used to read positioned text items (x/y via
    // `transform`) instead of the flattened string pdf-parse builds by
    // default; see milanBillParser.ts.
    pagerender?: (pageData: PdfPageData) => Promise<string>;
    max?: number;
    version?: string;
  }
  function pdfParse(dataBuffer: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>;
  export default pdfParse;
}
