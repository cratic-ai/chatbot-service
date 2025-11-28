// utils/cacheManager.js
const Redis = require('ioredis');

class CacheManager {
    constructor() {
        this.redis = new Redis(process.env.REDIS_URL, {
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3
        });

        this.redis.on('error', (err) => {
            console.error('Redis error:', err);
        });

        this.redis.on('connect', () => {
            console.log('✅ Redis connected');
        });
    }

    /**
     * Cache with tags for strategic invalidation
     */
    async setWithTags(key, value, ttl, tags = []) {
        try {
            const pipeline = this.redis.pipeline();

            // Set main cache with expiry
            pipeline.setex(key, ttl, JSON.stringify(value));

            // Add key to tag sets for later invalidation
            tags.forEach(tag => {
                pipeline.sadd(`tag:${tag}`, key);
                pipeline.expire(`tag:${tag}`, ttl + 300); // Tag expires 5 min after cache
            });

            await pipeline.exec();
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    /**
     * Get cached value
     */
    async get(key) {
        try {
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Invalidate all keys with specific tag
     */
    async invalidateByTag(tag) {
        try {
            const keys = await this.redis.smembers(`tag:${tag}`);
            if (keys.length > 0) {
                const pipeline = this.redis.pipeline();
                keys.forEach(key => pipeline.del(key));
                pipeline.del(`tag:${tag}`);
                await pipeline.exec();
                console.log(`🗑️  Invalidated ${keys.length} keys for tag: ${tag}`);
            }
        } catch (error) {
            console.error('Cache invalidation error:', error);
        }
    }

    /**
     * Invalidate multiple tags at once
     */
    async invalidateByTags(tags) {
        await Promise.all(tags.map(tag => this.invalidateByTag(tag)));
    }

    /**
     * Cache with stale-while-revalidate pattern
     */
    async getOrSet(key, fetcher, ttl, staleTtl = null) {
        try {
            const cached = await this.get(key);

            if (cached) {
                // Check if stale
                if (staleTtl) {
                    const isStale = !(await this.redis.exists(`${key}:fresh`));

                    if (isStale) {
                        // Return stale data immediately, revalidate in background
                        this.revalidate(key, fetcher, ttl, staleTtl).catch(err => {
                            console.error('Background revalidation failed:', err);
                        });
                    }
                }

                return cached;
            }

            // No cache, fetch fresh data
            const data = await fetcher();
            await this.set(key, data, ttl, staleTtl);
            return data;
        } catch (error) {
            console.error('Cache getOrSet error:', error);
            // Fallback to fetcher if cache fails
            return await fetcher();
        }
    }

    /**
     * Set with optional stale marker
     */
    async set(key, data, ttl, staleTtl = null) {
        try {
            const pipeline = this.redis.pipeline();
            pipeline.setex(key, ttl, JSON.stringify(data));

            // Set fresh marker for stale-while-revalidate
            if (staleTtl && staleTtl < ttl) {
                pipeline.setex(`${key}:fresh`, staleTtl, '1');
            }

            await pipeline.exec();
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    /**
     * Background revalidation
     */
    async revalidate(key, fetcher, ttl, staleTtl) {
        const data = await fetcher();
        await this.set(key, data, ttl, staleTtl);
    }

    /**
     * Delete specific key
     */
    async del(key) {
        try {
            await this.redis.del(key);
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }

    /**
     * Delete multiple keys
     */
    async delMultiple(keys) {
        if (keys.length === 0) return;
        try {
            await this.redis.del(...keys);
        } catch (error) {
            console.error('Cache delete multiple error:', error);
        }
    }

    /**
     * Wrap function with caching (legacy compatibility)
     */
    async wrap(key, fetcher, ttl) {
        return this.getOrSet(key, fetcher, ttl);
    }

    /**
     * Close Redis connection
     */
    async close() {
        await this.redis.quit();
    }
}



module.exports = new CacheManager();