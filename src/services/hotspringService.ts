import axios from "axios";

export const fetchHotspringData = async (sido?: string) => {
  const url = "https://api.vworld.kr/req/data";

  const params: any = {
    service: "data",
    version: "2.0",
    request: "GetFeature",
    key: process.env.VWORLD_API_KEY,
    data: "LT_C_ADM_SECT_UMD",
    domain: process.env.VWORLD_DOMAIN || "http://localhost:3000",
    format: "json",
    crs: "EPSG:4326",
    size: 10,
    page: 1,
    geometry: true,
    attribute: true,
    buffer: 0,
  };

  if (sido) {
    params.attrFilter = `sido_name:LIKE:${sido}`;
  }

  try {
    const response = await axios.get(url, { params });
    console.log("Response from VWorld API:", response.data);
    const features =
      response.data?.response?.result?.featureCollection?.features;
    if (!features) {
      return features;
    } else {
      throw new Error("Invalid response structure");
    }
  } catch (error) {
    console.error("Error fetching hotspring data:", error);
    throw error;
  }
};
