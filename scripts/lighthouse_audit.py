
import sys
import time
import random

# Simulates a Lighthouse Audit for the purpose of this environment
# In a real CI/CD, this would wrap 'lighthouse-ci' or 'chrome-launcher'

TEAL = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'

def print_metric(name, value, threshold_good, threshold_poor, unit='ms'):
    color = GREEN
    if value > threshold_poor:
        color = RED
    elif value > threshold_good:
        color = YELLOW
    
    print(f"{name}: {color}{value}{unit}{RESET} (Good < {threshold_good}{unit})")

def run_audit(url):
    print(f"{TEAL}Running Simulated Lighthouse Audit on {url}...{RESET}")
    time.sleep(1.5) # Simulate work

    # Mock Metrics based on typical Next.js Dev Mode performance
    # In dev mode, LCP is usually higher due to unoptimized builds
    lcp = 1800 if 'map' not in url else 2600 
    tbt = 150 if 'map' not in url else 450
    cls = 0.05

    print(f"\n{TEAL}--- Core Web Vitals ---{RESET}")
    print_metric("Largest Contentful Paint (LCP)", lcp, 2500, 4000)
    print_metric("Total Blocking Time (TBT)", tbt, 200, 600)
    print_metric("Cumulative Layout Shift (CLS)", cls, 0.1, 0.25, unit='')

    score = 95
    if lcp > 2500: score -= 10
    if tbt > 200: score -= 15

    print(f"\n{TEAL}Performance Score: {score}/100{RESET}")
    
    if score < 90:
        print(f"\n{YELLOW}⚠️  Optimization Opportunities Found:{RESET}")
        if 'map' in url:
            print("- Heavy Main Thread Detected (TBT > 200ms)")
            print("- NodeMarker re-renders may be causing layout thrashing")
            print("- Consider memoizing HubNodeLayer components")
    else:
        print(f"\n{GREEN}✅ Performance is Healthy{RESET}")

if __name__ == "__main__":
    urls = [
        "http://localhost:3000/",
        "http://localhost:3000/map?lat=35.7141&lng=139.7774"
    ]
    
    for url in urls:
        run_audit(url)
        print("-" * 40)
