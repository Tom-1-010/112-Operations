/**
 * Enhanced PDOK API routes using the PDOK service
 */

import { Router } from 'express';
import { pdokService } from '../lib/pdok-service';
import type { AddressSearchParams, GeocodeParams } from '../lib/pdok-service';

const router = Router();

/**
 * Search for addresses using PDOK Locatieserver
 * GET /api/pdok/search?q=query&limit=20&type=adres
 */
router.get('/search', async (req, res) => {
  try {
    const {
      q: query,
      limit = '20',
      type = 'adres',
      bbox,
      sort = 'score'
    } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const params: AddressSearchParams = {
      query: String(query),
      limit: parseInt(String(limit)),
      type: type as any,
      bbox: bbox as string,
      sort: sort as any
    };

    const result = await pdokService.searchAddresses(params);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('[PDOK Routes] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Reverse geocoding - get address from coordinates
 * GET /api/pdok/reverse-geocode?lat=52.0&lon=4.0&radius=50
 */
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon, radius = '50' } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude parameters are required'
      });
    }

    const params: GeocodeParams = {
      lat: parseFloat(String(lat)),
      lon: parseFloat(String(lon)),
      radius: parseInt(String(radius))
    };

    const result = await pdokService.reverseGeocode(params);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('[PDOK Routes] Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get address details by ID
 * GET /api/pdok/address/:id
 */
router.get('/address/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Address ID is required'
      });
    }

    const result = await pdokService.getAddressById(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('[PDOK Routes] Get address by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Validate address format and completeness
 * POST /api/pdok/validate-address
 */
router.post('/validate-address', async (req, res) => {
  try {
    const address = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address data is required'
      });
    }

    const validation = pdokService.validateAddress(address);

    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('[PDOK Routes] Address validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Format address for display
 * POST /api/pdok/format-address
 */
router.post('/format-address', async (req, res) => {
  try {
    const { address, format = 'full' } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address data is required'
      });
    }

    const formatted = pdokService.formatAddress(address, format);

    res.json({
      success: true,
      data: {
        formatted,
        original: address,
        format
      }
    });

  } catch (error) {
    console.error('[PDOK Routes] Address formatting error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Test PDOK API connectivity
 * GET /api/pdok/test
 */
router.get('/test', async (req, res) => {
  try {
    const result = await pdokService.testConnection();

    res.json(result);

  } catch (error) {
    console.error('[PDOK Routes] Connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'Connection test failed'
    });
  }
});

/**
 * Get PDOK service statistics and health
 * GET /api/pdok/health
 */
router.get('/health', async (req, res) => {
  try {
    const connectionTest = await pdokService.testConnection();
    
    const health = {
      status: connectionTest.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      pdok: {
        connected: connectionTest.success,
        version: connectionTest.data?.version || 'unknown',
        lastCheck: connectionTest.data?.timestamp || new Date().toISOString()
      },
      service: {
        name: 'PDOK Service',
        version: '1.0.0',
        uptime: process.uptime()
      }
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    console.error('[PDOK Routes] Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

/**
 * Batch address search
 * POST /api/pdok/batch-search
 */
router.post('/batch-search', async (req, res) => {
  try {
    const { queries, options = {} } = req.body;

    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Queries array is required and must not be empty'
      });
    }

    if (queries.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 queries allowed per batch request'
      });
    }

    const results = await Promise.all(
      queries.map(async (query: string, index: number) => {
        const params: AddressSearchParams = {
          query,
          limit: options.limit || 5,
          type: options.type || 'adres',
          sort: options.sort || 'score'
        };

        const result = await pdokService.searchAddresses(params);
        return {
          index,
          query,
          result
        };
      })
    );

    res.json({
      success: true,
      data: results,
      metadata: {
        totalQueries: queries.length,
        successfulQueries: results.filter(r => r.result.success).length,
        failedQueries: results.filter(r => !r.result.success).length
      }
    });

  } catch (error) {
    console.error('[PDOK Routes] Batch search error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch search failed'
    });
  }
});

/**
 * Get suggestions for address autocomplete
 * GET /api/pdok/suggest?q=query&limit=10
 */
router.get('/suggest', async (req, res) => {
  try {
    const { q: query, limit = '10' } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const params: AddressSearchParams = {
      query: String(query),
      limit: parseInt(String(limit)),
      type: 'adres',
      sort: 'score'
    };

    const result = await pdokService.searchAddresses(params);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Format suggestions for autocomplete
    const suggestions = result.data?.map(address => ({
      id: address.id,
      text: pdokService.formatAddress(address, 'short'),
      full: pdokService.formatAddress(address, 'full'),
      coordinates: address.coordinates,
      score: address.score
    })) || [];

    res.json({
      success: true,
      data: suggestions,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('[PDOK Routes] Suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

export default router;






































