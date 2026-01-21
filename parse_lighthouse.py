import json
import sys

try:
    with open('./lighthouse-report.json') as f:
        data = json.load(f)

    categories = data['categories']
    audits = data['audits']

    print("--- Lighthouse Report Summary ---")
    print(f"Performance Score: {categories['performance']['score'] * 100:.0f}")
    print(f"First Contentful Paint (FCP): {audits['first-contentful-paint']['displayValue']}")
    print(f"Largest Contentful Paint (LCP): {audits['largest-contentful-paint']['displayValue']}")
    print(f"Total Blocking Time (TBT): {audits['total-blocking-time']['displayValue']}")
    print(f"Cumulative Layout Shift (CLS): {audits['cumulative-layout-shift']['displayValue']}")
    print(f"Speed Index: {audits['speed-index']['displayValue']}")
    
    # INP might not be present if no interaction happened, but let's try
    inp = audits.get('interaction-to-next-paint', {}).get('displayValue', 'N/A')
    print(f"Interaction to Next Paint (INP): {inp}")

except Exception as e:
    print(f"Error parsing report: {e}")
