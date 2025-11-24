// utils/cache.js
const NodeCache = require('node-cache');

// In-memory cache as fallback (for development)
const memoryCache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60,
  useClones: false // Better performance
});

// Redis client (optional - for production with Upstash)
let redisClient = null;

// Initialize Redis if credentials available
try {
  if (process.env.UPSTASH_REDIS_URL) {
    const { Redis } = require('@upstash/redis');
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
    console.log('✅ Redis cache connected (Upstash)');
  } else {
    console.log('⚠️  Using in-memory cache (add Upstash Redis for production)');
  }
} catch (error) {
  console.log('⚠️  Redis not available, using in-memory cache');
}

/**
 * Get value from cache
 */
async function get(key) {
  try {
    if (redisClient) {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    }
    return memoryCache.get(key) || null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
async function set(key, value, ttlSeconds = 300) {
  try {
    if (redisClient) {
      await redisClient.set(key, JSON.stringify(value), { ex: ttlSeconds });
    } else {
      memoryCache.set(key, value, ttlSeconds);
    }
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
}

/**
 * Delete value from cache
 */
async function del(key) {
  try {
    if (redisClient) {
      await redisClient.del(key);
    } else {
      memoryCache.del(key);
    }
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
}

/**
 * Delete all keys matching pattern
 */
async function delPattern(pattern) {
  try {
    if (redisClient) {
      console.log('Pattern delete not fully supported in Upstash REST API');
    } else {
      const keys = memoryCache.keys();
      keys.forEach(key => {
        if (key.includes(pattern)) {
          memoryCache.del(key);
        }
      });
    }
    return true;
  } catch (error) {
    console.error('Cache pattern delete error:', error);
    return false;
  }
}

/**
 * Wrapper for caching function results
 */
async function wrap(key, fn, ttlSeconds = 300) {
  try {
    const cached = await get(key);
    if (cached !== null) {
      console.log(`✅ Cache HIT: ${key}`);
      return cached;
    }

    console.log(`❌ Cache MISS: ${key}`);
    const result = await fn();
    await set(key, result, ttlSeconds);
    return result;
  } catch (error) {
    console.error('Cache wrap error:', error);
    return await fn();
  }
}


module.exports = {
  get,
  set,
  del,
  delPattern,
  wrap
};