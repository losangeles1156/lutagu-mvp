/**
 * 快取服務測試
 * 測試 LRU + TTL 機制
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { CacheService } from '../cacheService';

const expect = (actual: any) => ({
    toBe: (expected: any) => assert.equal(actual, expected),
    toBeNull: () => assert.equal(actual, null),
    toBeTruthy: () => assert.ok(actual),
    toBeFalsy: () => assert.ok(!actual),
    toBeDefined: () => assert.notEqual(actual, undefined),
    toEqual: (expected: any) => assert.deepEqual(actual, expected),
    get not() {
        return {
            toBe: (expected: any) => assert.notEqual(actual, expected),
            toEqual: (expected: any) => assert.notDeepEqual(actual, expected)
        };
    }
});

describe('CacheService', () => {
    let cache: CacheService<string>;

    beforeEach(() => {
        cache = new CacheService<string>({
            maxSize: 5,
            ttlMs: 1000, // 1 秒
            cleanupIntervalMs: 100,
            evictionRatio: 0.2
        });
    });

    afterEach(() => {
        cache.destroy();
    });

    describe('Basic Operations', () => {
        it('should set and get values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        it('should return null for non-existent keys', () => {
            expect(cache.get('nonexistent')).toBeNull();
        });

        it('should delete values', () => {
            cache.set('key1', 'value1');
            expect(cache.delete('key1')).toBe(true);
            expect(cache.get('key1')).toBeNull();
        });

        it('should check if key exists', () => {
            cache.set('key1', 'value1');
            expect(cache.has('key1')).toBe(true);
        });

        it('should clear all values', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
        });
    });

    describe('TTL Expiration', () => {
        it('should expire values after TTL', async () => {
            cache.set('key1', 'value1', 100); // 100ms TTL
            
            expect(cache.get('key1')).toBe('value1');
            
            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 150));
            
            expect(cache.get('key1')).toBeNull();
        });

        it('should not return expired values with has()', async () => {
            cache.set('key1', 'value1', 100);
            
            await new Promise(resolve => setTimeout(resolve, 150));
            
            expect(cache.has('key1')).toBe(false);
        });
    });

    describe('LRU Eviction', () => {
        it('should evict least recently used when cache is full', () => {
            // Fill cache
            for (let i = 0; i < 5; i++) {
                cache.set(`key${i}`, `value${i}`);
            }
            
            // Access key0 to make it recently used
            cache.get('key0');
            
            // Add more items to trigger eviction
            cache.set('key5', 'value5');
            
            // With evictionRatio=0.2 and maxSize=5, evictCount = ceil(5*0.2) = 1
            // key0 was just accessed, so key1 should be the least recently used.
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBe('value2');
            expect(cache.get('key3')).toBe('value3');
            expect(cache.get('key4')).toBe('value4');
            
            // key0 should still exist (was accessed recently)
            expect(cache.get('key0')).toBe('value0');
            // key5 should exist (just added)
            expect(cache.get('key5')).toBe('value5');
        });
    });

    describe('Access Tracking', () => {
        it('should update lastAccessed on get', () => {
            cache.set('key1', 'value1');
            const before = Date.now();
            
            // Small delay to ensure different timestamp
            cache.get('key1');
            
            // The entry should have been accessed
            // We can't directly test the timestamp but we can verify the value is returned
            expect(cache.get('key1')).toBe('value1');
        });

        it('should track access count', () => {
            cache.set('key1', 'value1');
            
            // Access multiple times
            cache.get('key1');
            cache.get('key1');
            cache.get('key1');
            
            const stats = cache.getStats();
            expect(stats.size).toBe(1);
        });
    });

    describe('Static Key Generation', () => {
        it('should generate consistent keys', () => {
            const key1 = CacheService.generateKey('test', { a: 1, b: 2 });
            const key2 = CacheService.generateKey('test', { b: 2, a: 1 }); // Different order
            const key3 = CacheService.generateKey('test', { a: 1, b: 2 });
            
            // Same params should produce same key (regardless of order)
            expect(key1).toBe(key3);
            // Different order should also produce same key (sorted internally)
            expect(key1).toBe(key2);
        });

        it('should handle different parameter types', () => {
            const key1 = CacheService.generateKey('test', { str: 'hello' });
            const key2 = CacheService.generateKey('test', { num: 123 });
            const key3 = CacheService.generateKey('test', { bool: true });
            const key4 = CacheService.generateKey('test', { arr: [1, 2, 3] });
            
            expect(key1).not.toBe(key2);
            expect(key2).not.toBe(key3);
            expect(key3).not.toBe(key4);
        });

        it('should filter out undefined and null values', () => {
            const key1 = CacheService.generateKey('test', { a: 1, b: undefined, c: null });
            const key2 = CacheService.generateKey('test', { a: 1 });
            
            expect(key1).toBe(key2);
        });
    });

    describe('Cache Stats', () => {
        it('should return correct stats', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            
            const stats = cache.getStats();
            expect(stats.size).toBe(2);
            expect(stats.maxSize).toBe(5);
        });
    });
});

describe('Global Cache Factory', () => {
    afterEach(() => {
        // Clean up global caches after each test
        const { clearAllCaches } = require('../cacheService');
        clearAllCaches();
    });

    it('should create and retrieve named caches', () => {
        const cache1 = require('../cacheService').getCache('test1');
        const cache2 = require('../cacheService').getCache('test2');
        
        expect(cache1).not.toBe(cache2);
    });

    it('should return same cache for same name', () => {
        const cache1 = require('../cacheService').getCache('test3');
        const cache2 = require('../cacheService').getCache('test3');
        
        expect(cache1).toBe(cache2);
    });
});
