// utils/translateHtml.ts
import { parseDocument } from "htmlparser2";
import { DomSerializerOptions } from "dom-serializer";
import serialize from "dom-serializer";
import { translateText } from "./deepl";

export const translateHtmlContent = async (
  html: string,
  targetLang: "EN" | "KO"
): Promise<string> => {
  const dom = parseDocument(html);

  const translateNode = async (node: any) => {
    if (node.type === "text" && node.data.trim()) {
      const translated = await translateText(node.data, targetLang);
      node.data = translated;
    }

    if (node.children) {
      for (const child of node.children) {
        await translateNode(child);
      }
    }
  };

  for (const node of dom.children) {
    await translateNode(node);
  }

  return serialize(dom, { encodeEntities: "utf8" } as DomSerializerOptions);
};
