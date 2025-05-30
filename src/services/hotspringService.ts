import axios from "axios";
import { parseStringPromise } from "xml2js";

export const fetchHotspringData = async () => {
  const url = "https://api.vworld.kr/req/data";

  const params: any = {
    service: "data",
    version: "2.0",
    request: "GetFeature",
    key: process.env.VWORLD_API_KEY,
    data: "LT_C_UJ401",
    domain: process.env.VWORLD_DOMAIN || "http://localhost:3000",
    format: "json",
    errorformat: "json",
    size: 1000,
    page: 1,
    geometry: true,
    attribute: true,
    columns: "uname,dnum,dyear,sido_name,sigg_name,ag_geom",
    crs: "EPSG:4326",
    geomFilter: "BOX(123.1,33.0,131.9,38.7)",
    attrFilter: "uname:LIKE:온천공보호구역",
  };

  try {
    const response = await axios.get(url, { params });
    const features =
      response.data?.response?.result?.featureCollection?.features;

    if (!features || features.length === 0) {
      throw new Error("No features found in the response");
    }

    return features.map((item: any) => ({
      properties: {
        uname: item.properties?.uname,
        dnum: item.properties?.dnum,
        dyear: item.properties?.dyear,
        sido_name: item.properties?.sido_name,
        sigg_name: item.properties?.sigg_name,
      },
      geometry: item.geometry,
    }));
  } catch (error) {
    console.error("Error fetching hotspring data:", error);
    throw error;
  }
};
