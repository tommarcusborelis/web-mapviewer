import axios from 'axios'
import log from '@geoadmin/log'
import { LayerAttribution } from '@/api/layers/AbstractLayer.class'
import GeoAdminGroupOfLayers from '@/api/layers/GeoAdminGroupOfLayers.class'
import CloudOptimizedGeoTIFFLayer from '@/api/layers/CloudOptimizedGeoTIFFLayer.class'
import { getCogAssetUrl } from '@/api/stac.api'

/**
 * Parser for STAC API capabilities (Collections and Items)
 */
export default class STACCapabilitiesParser {
    /**
     * @param {String} originUrl The STAC API base URL (e.g. http://localhost:8000/api/stac/v1)
     */
    constructor(originUrl) {
        this.originUrl = originUrl
    }

    /**
     * Fetches all collections and their items, converting them to a hierarchy of layers.
     * @param {Object} projection Current projection
     * @returns {Promise<Array<AbstractLayer>>} List of layers (collections as groups)
     */
    async getAllExternalLayerObjects(projection) {
        try {
            log.debug(`Fetching STAC collections from ${this.originUrl}/collections`)
            const collectionsResponse = await axios.get(`${this.originUrl}/collections`)
            const collections = collectionsResponse.data.collections || []

            const layerGroups = []

            for (const collection of collections) {
                log.debug(`Fetching STAC items for collection ${collection.id}`)
                const itemsResponse = await axios.get(`${this.originUrl}/collections/${collection.id}/items`, {
                    params: { limit: 100 }
                })
                const items = itemsResponse.data.features || []

                const cogLayers = items.map(item => {
                    const fileSource = getCogAssetUrl(item)
                    if (!fileSource) return null

                    try {
                        return new CloudOptimizedGeoTIFFLayer({
                            fileSource,
                            name: item.properties?.title || item.id,
                            visible: false,
                            opacity: 1.0,
                            extent: item.bbox ? [
                                [item.bbox[0], item.bbox[1]],
                                [item.bbox[2], item.bbox[3]]
                            ] : null
                        })
                    } catch (e) {
                        log.error(`Failed to create COG layer for item ${item.id}`, e)
                        return null
                    }
                }).filter(l => l !== null)

                if (cogLayers.length > 0) {
                    layerGroups.push(new GeoAdminGroupOfLayers({
                        id: `stac-${collection.id}`,
                        name: collection.title || collection.id,
                        layers: cogLayers
                    }))
                }
            }

            return layerGroups
        } catch (error) {
            log.error(`Failed to fetch STAC capabilities from ${this.originUrl}`, error)
            return []
        }
    }
}
