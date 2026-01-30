import http from 'k6/http';
import { check, sleep } from 'k6';

// K6 Load Test Configuration
// Target P4-2 Metric: P95 Response Time < 2s

export const options = {
    stages: [
        { duration: '30s', target: 5 },  // Ramp up to 5 users
        { duration: '1m', target: 20 },  // Stay at 20 users (Load)
        { duration: '30s', target: 0 },  // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'], // P95 must be < 2s
        http_req_failed: ['rate<0.01'],    // Error rate must be < 1%
    },
};

const BASE_URL = 'http://localhost:3000'; // Test against Next.js Proxy -> Go

export default function () {
    const payload = JSON.stringify({
        messages: [
            { role: 'user', content: '東京駅の近くのおすすめランチは？' }
        ],
        locale: 'ja'
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'x-k6-test': 'true',
        },
    };

    // Test the Chat API Endpoint
    const res = http.post(`${BASE_URL}/api/chat`, payload, params);

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response body has content': (r) => r.body && r.body.length > 0,
    });

    sleep(1);
}
