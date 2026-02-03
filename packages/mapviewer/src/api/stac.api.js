import axios from 'axios'

const STAC_API_BASE = 'http://localhost:8000/api/stac/v1'

/**
 * Fetch all collections from STAC API
 * @returns {Promise<Array>} List of collections
 */
export async function fetchCollections() {
    try {
        const response = await axios.get(`${STAC_API_BASE}/collections`)
        return response.data.collections
    } catch (error) {
        console.error('Error fetching STAC collections:', error)
        return []
    }
}

/**
 * Fetch items for a specific collection
 * @param {String} collectionId Collection ID
 * @param {Number} limit Number of items to fetch (default: 100)
 * @returns {Promise<Array>} List of features (items)
 */
export async function fetchItems(collectionId, limit = 100) {
    try {
        const response = await axios.get(
            `${STAC_API_BASE}/collections/${collectionId}/items`,
            { params: { limit } }
        )
        return response.data.features
    } catch (error) {
        console.error(`Error fetching items for collection ${collectionId}:`, error)
        return []
    }
}

/**
 * Search for items using STAC Search endpoint
 * @param {Array<Number>} bbox Bounding box [minx, miny, maxx, maxy]
 * @param {String} datetime ISO8601 datetime or range (e.g. "2023-01-01/2023-12-31")
 * @returns {Promise<Array>} List of features (items)
 */
export async function searchItems(bbox, datetime) {
    try {
        const payload = {
            limit: 100
        }
        if (bbox) payload.bbox = bbox
        if (datetime) payload.datetime = datetime

        const response = await axios.post(`${STAC_API_BASE}/search`, payload)
        return response.data.features
    } catch (error) {
        console.error('Error searching STAC items:', error)
        return []
    }
}

/**
 * Get the COG asset URL from a STAC item
 * @param {Object} item STAC Item
 * @returns {String|null} Asset URL or null if not found
 */
export function getCogAssetUrl(item) {
    if (!item.assets) return null

    // Prefer 'data' asset, fallback to 'visual'
    if (item.assets.data && item.assets.data.href) {
        return item.assets.data.href
    }
    if (item.assets.visual && item.assets.visual.href) {
        return item.assets.visual.href
    }

    // Fallback: check for any asset with type geotiff
    for (const key in item.assets) {
        const asset = item.assets[key]
        if (asset.type && asset.type.includes('geotiff')) {
            return asset.href
        }
    }

    return null
}
