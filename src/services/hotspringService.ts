import axios from "axios"

export const fetchHotspringData = async () => {
    const url =  "https://api.vworld.kr/req/data"

    const params: any = {
        service : "data",
        version : "2.0",
        request : "GetFeature",
        key : process.env.VWORLD_API_KEY,
        data : "LT_C_ADM_SECT_UMD",
        domain : process.env.VWORLD_DOMAIN || "http://localhost:3000",
        format : "json",
        crs: "EPSG:4326",
        size: 10,
        page:1,
        geometry: true,
        attribute : true,
        buffer : 0  
    }

    try {
        const response = await  axios.get(url, {params})
        if (response.data.response && response.data.response.result) {
            return response.data.response.result.features
        } else {
            throw new Error("Invalid response structure")
        }
    } catch (error) {
        console.error("Error fetching hotspring data:", error)
        throw error
    }
}