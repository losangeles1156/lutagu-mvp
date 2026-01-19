'use client';

import { logger } from '@/lib/utils/logger';

import { useEffect, useCallback, useState } from 'react';
import { useWardStore, Ward } from '@/lib/stores/wardStore';

interface WardDetectorProps {
    onWardDetected: (ward: Ward | null) => void;
    onError?: (error: string) => void;
    enabled?: boolean;
    children?: React.ReactNode;
}

export function WardDetector({
    onWardDetected,
    onError,
    enabled = true,
    children,
}: WardDetectorProps) {
    const [geoPermission, setGeoPermission] = useState<PermissionState | null>(null);
    const {
        detectWardByLocation,
        isDetecting,
        detectedWard,
        error,
        clearError,
    } = useWardStore();

    // Check geolocation permission on mount
    useEffect(() => {
        if (!enabled) return;

        navigator.permissions
            .query({ name: 'geolocation' })
            .then((permission) => {
                setGeoPermission(permission.state);

                // Listen for permission changes
                permission.addEventListener('change', () => {
                    setGeoPermission(permission.state);
                });
            })
            .catch(() => {
                setGeoPermission('denied');
            });
    }, [enabled]);

    // Detect ward when location changes
    const detectWard = useCallback(async (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;

        const ward = await detectWardByLocation(latitude, longitude);
        onWardDetected(ward);
    }, [detectWardByLocation, onWardDetected]);

    // Manual trigger function
    const manualDetect = useCallback(() => {
        if (!navigator.geolocation) {
            onError?.('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            detectWard,
            (error) => {
                const message = error.message || 'Failed to get location';
                onError?.(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes
            }
        );
    }, [detectWard, onError]);

    // Auto-detect on mount if permission granted
    useEffect(() => {
        if (!enabled || geoPermission !== 'granted') return;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                detectWard,
                (error) => {
                    // Silently fail - user can manually trigger
                    logger.log('Auto-detection failed:', error.message);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: 60000, // 1 minute
                }
            );
        }
    }, [enabled, geoPermission, detectWard]);

    // Report detected ward to parent
    useEffect(() => {
        if (detectedWard) {
            onWardDetected(detectedWard);
        }
    }, [detectedWard, onWardDetected]);

    // Report errors to parent
    useEffect(() => {
        if (error) {
            onError?.(error);
            clearError();
        }
    }, [error, onError, clearError]);

    // Render loading state
    if (isDetecting) {
        return (
            <div className="ward-detector-loading">
                {children || (
                    <div className="ward-loading-indicator">
                        <span className="ward-loading-spinner" />
                        <span className="ward-loading-text">檢測所在區域...</span>
                    </div>
                )}
            </div>
        );
    }

    // Render permission prompt if denied
    if (geoPermission === 'denied') {
        return (
            <div className="ward-detector-permission">
                {children || (
                    <div className="ward-permission-prompt">
                        <button
                            onClick={manualDetect}
                            className="ward-detect-button"
                        >
                            📍 手動選擇所在區域
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Render children
    return (
        <div className="ward-detector">
            {children}

            {/* Hidden helper for manual detection */}
            <button
                onClick={manualDetect}
                className="ward-detect-helper"
                style={{ display: 'none' }}
                aria-label="手動選擇所在區域"
            />
        </div>
    );
}

// Simplified hook version for inline usage
export function useWardDetection() {
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);

    const {
        detectWardByLocation,
        detectedWard,
        clearError,
    } = useWardStore();

    const detect = useCallback(async (lat: number, lng: number) => {
        setIsDetecting(true);
        setError(null);
        setLocation({ lat, lng });

        const ward = await detectWardByLocation(lat, lng);

        if (!ward) {
            setError('無法檢測所在區域');
        }

        setIsDetecting(false);
        return ward;
    }, [detectWardByLocation]);

    const detectFromGPS = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported');
            return;
        }

        setIsDetecting(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                detect(latitude, longitude);
            },
            (geoError) => {
                setError(geoError.message || 'Failed to get location');
                setIsDetecting(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            }
        );
    }, [detect]);

    return {
        detectedWard,
        location,
        error,
        isDetecting,
        detect,
        detectFromGPS,
        clearError: () => {
            setError(null);
            clearError();
        },
    };
}
