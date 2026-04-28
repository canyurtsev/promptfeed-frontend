import os, re

html_dir = 'html'

script_re = re.compile(r'<script[^>]*>(?!.*src=)', re.IGNORECASE)
onclick_re = re.compile(r'onclick\s*=', re.IGNORECASE)
innerhtml_re = re.compile(r'\.innerHTML\s*=', re.IGNORECASE)

files_with_scripts = []
files_with_onclick = []
files_with_innerhtml = []

for root, dirs, files in os.walk(html_dir):
    for file in files:
        if file.endswith('.html'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    has_inline_script = False
                    for match in re.finditer(r'<script([^>]*)>(.*?)</script>', content, re.IGNORECASE | re.DOTALL):
                        attrs = match.group(1)
                        body = match.group(2).strip()
                        if 'src=' not in attrs.lower() and body:
                            has_inline_script = True
                            break
                    if has_inline_script:
                        files_with_scripts.append(file)
                    if onclick_re.search(content):
                        files_with_onclick.append(file)
                    if innerhtml_re.search(content):
                        files_with_innerhtml.append(file)
            except Exception as e:
                pass

print('--- Inline Scripts ---')
for f in sorted(files_with_scripts): print(f)
print('\n--- onclick Attributes ---')
for f in sorted(files_with_onclick): print(f)
print('\n--- innerHTML Usage ---')
for f in sorted(files_with_innerhtml): print(f)

