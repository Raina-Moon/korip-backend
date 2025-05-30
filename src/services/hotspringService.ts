import axios from "axios";
import { parseStringPromise } from "xml2js";

export const fetchHotspringData = async (lat: number, lng: number) => {
  const url = "https://api.vworld.kr/req/data";

  const params: any = {
    service: "data",
    version: "2.0",
    request: "GetFeature",
    key: process.env.VWORLD_API_KEY,
    data: "LT_C_UJ401",
    domain: process.env.VWORLD_DOMAIN || "http://localhost:3000",
    format: "xml",
    errorformat: "xml",
    size: 10,
    page: 1,
    geometry: true,
    attribute: true,
    columns: "uname,dnum,dyear,sido_name,sigg_name,ag_geom",
    crs: "EPSG:4326",
    geomFilter: `POINT(${lng} ${lat})`,
    attrFilter: "uname:LIKE:온천공보호구역",
  };

  try {
    const response = await axios.get(url, { params });
    const json = await parseStringPromise(response.data);
    console.log("Parsed XML to JSON:", JSON.stringify(json, null, 2));

    const status = json?.response?.status?.[0];

    if (status !== "OK") {
      throw new Error(`Error fetching data: ${status}`);
    }

    const featureMembers =
        json?.response?.result?.[0]?.["wfs:FeatureCollection"]?.[0]?.["gml:featureMember"];

    if (featureMembers) {
      return featureMembers.map((item:any) => {
        const raw = item["LT_C_UJ401"]?.[0];
        return {
          properties: {
            uname: raw?.uname?.[0],
            dnum: raw?.dnum?.[0],
            dyear: raw?.dyear?.[0],
            sido_name: raw?.sido_name?.[0],
            sigg_name: raw?.sigg_name?.[0],
          },
        };
      });
    } else {
      throw new Error("No featureMember data found");
    }
  } catch (error) {
    console.error("Error fetching hotspring data:", error);
    throw error;
  }
};
