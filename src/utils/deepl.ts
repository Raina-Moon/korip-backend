import axios from "axios";

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
const DEEPL_API_KEY = process.env.DEEPL_API_KEY!;

export const translateText = async (
  text: string,
  targetLang: "EN" | "KO"
): Promise<string> => {
  const params = new URLSearchParams();
  params.append("auth_key", DEEPL_API_KEY);
  params.append("text", text);
  params.append("target_lang", targetLang);

  const response = await axios.post(DEEPL_API_URL, params);
  return response.data.translations[0].text;
};

export const detectLanguage = async (text: string): Promise<"EN" | "KO"> => {
  const koreanRegex = /[가-힣]/;
  return koreanRegex.test(text) ? "KO" : "EN";
};
