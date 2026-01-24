
import re
import os

INPUT_FILE = 'src/data/stationWisdom.ts'
OUTPUT_DIR = 'dify_import'
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'station_wisdom_rag.txt')

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split content by Station Keys
    # Regex lookahead to find 'odpt:Station:...' keys
    # Pattern: 'odpt:Station:([\w\.-]+)':\s*{

    station_pattern = re.compile(r"'odpt:Station:([\w\.-]+)':\s*{(.*?)(?='odpt:Station:|$)", re.DOTALL)

    matches = station_pattern.findall(content)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        count = 0
        for station_id, body in matches:
            out.write(f"### Station Context: {station_id}\n")

            # Extract Traps
            # Look for content: '...' and advice: '...' inside traps: [...]
            # Simplification: Find all objects with type: '...' inside body?
            # Or just regex for content/advice strings loosely in the body.

            # Find Traps Section
            traps_section_match = re.search(r"traps:\s*\[(.*?)\]", body, re.DOTALL)
            if traps_section_match:
                traps_text = traps_section_match.group(1)
                # Find title, content, advice
                # Assuming single quotes for strings
                # title: '...'
                items = re.findall(r"title:\s*'(.*?)'.*?content:\s*'(.*?)'.*?advice:\s*'(.*?)'", traps_text, re.DOTALL)
                if items:
                    out.write("\n**Traps (Warnings & Pitfalls):**\n")
                    for title, content, advice in items:
                         out.write(f"- [Trap] {title}: {content} (Advice: {advice})\n")

            # Find Hacks Section
            hacks_section_match = re.search(r"hacks:\s*\[(.*?)\]", body, re.DOTALL)
            if hacks_section_match:
                hacks_text = hacks_section_match.group(1)
                # Matches simple strings in array
                # 'Hack String',
                hack_items = re.findall(r"'(.*?)'", hacks_text)
                if hack_items:
                    out.write("\n**Hacks (Tips & Shortcuts):**\n")
                    for hack in hack_items:
                        # Filter out short/junk strings if any
                        if len(hack) > 5:
                            out.write(f"- [Hack] {hack}\n")

            # Find L3 Facilities
            # This is harder with regex because of nested objects.
            # We'll try to find L3Facilities: [...] and extract key info
            l3_section_match = re.search(r"l3Facilities:\s*\[(.*?)\]", body, re.DOTALL)
            if l3_section_match:
                l3_text = l3_section_match.group(1)
                # Find type: '...' and location: ...
                # Location might be object or string.
                # Regex for type: '(\w+)'
                # And location: ({[^}]*}|'.*?')

                # Let's simplify: iterating over { ... } blocks
                fac_blocks = re.findall(r"{(.*?)}", l3_text, re.DOTALL)
                if fac_blocks:
                    out.write("\n**Facilities (L3 Services):**\n")
                    for block in fac_blocks:
                        type_m = re.search(r"type:\s*'(\w+)'", block)
                        loc_m_str = re.search(r"location:\s*'(.*?)'", block) # simple string location
                        loc_m_obj = re.search(r"location:\s*{.*?'zh':\s*'(.*?)'.*?}", block, re.DOTALL) # zh location

                        f_type = type_m.group(1) if type_m else "facility"
                        f_loc = "Unknown Location"
                        if loc_m_obj:
                            f_loc = loc_m_obj.group(1)
                        elif loc_m_str:
                            f_loc = loc_m_str.group(1)

                        # Attributes
                        attrs = []
                        if "wheelchair: true" in block: attrs.append("[Wheelchair]")
                        if "hasBabyRoom: true" in block: attrs.append("[BabyRoom]")

                        count_m = re.search(r"count:\s*(\d+)", block)
                        if count_m: attrs.append(f"[Cnt:{count_m.group(1)}]")

                        if f_type and f_loc != "Unknown Location":
                            out.write(f"- [{f_type}] {f_loc} {' '.join(attrs)}\n")

            out.write("\n---\n\n")
            count += 1

        print(f"Successfully processed {count} stations.")

if __name__ == "__main__":
    main()
