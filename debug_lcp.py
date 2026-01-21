import json
import sys

try:
    with open(sys.argv[1]) as f:
        data = json.load(f)
    
    lcp_audit = data['audits']['largest-contentful-paint']
    fcp_audit = data['audits']['first-contentful-paint']
    
    print(f"FCP Numeric: {fcp_audit.get('numericValue')}")
    print(f"LCP Numeric: {lcp_audit.get('numericValue')}")
    
    # Look for the element audit specifically
    if 'audits' in data and 'largest-contentful-paint-element' in data['audits']:
        lcp_element_audit = data['audits']['largest-contentful-paint-element']
        if 'details' in lcp_element_audit and 'items' in lcp_element_audit['details']:
            print("LCP Element Details:")
            print(json.dumps(lcp_element_audit['details']['items'], indent=2))
        else:
             print("LCP Element audit found but no items.")
    else:
        print("largest-contentful-paint-element audit not found")

except Exception as e:
    print(f"Error: {e}")

