import os, re, json

used_keys = set()
for root, dirs, files in os.walk('internal'):
    for file in files:
        if file.endswith('.go'):
            with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                content = f.read()
                matches = re.findall(r'utils\.T\(\s*"([^"]+)"', content)
                for m in matches:
                    used_keys.add(m)

print('Used keys in Go code:')
for k in sorted(list(used_keys)):
    print(k)

# Check dynamic
for root, dirs, files in os.walk('internal'):
    for file in files:
        if file.endswith('.go'):
            with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                content = f.read()
                if re.search(r'utils\.T\([^")]', content):
                    print(f'Warning: dynamic utils.T found in {file}!')

with open('locales/VI/messages.json', 'r', encoding='utf-8') as f:
    vi_data = json.load(f)

print("Top level keys in vi:", vi_data.keys())

# We know that the following top-level keys in VI are NOT used by the backend at all:
# "app", "tabs", "rewrite", "create", "continue_tab", "projects", "settings", "about", "export"
# The backend only uses: "api_client", "file_parser", "config", "generator", "prompts", "messages", "templates" (maybe messages is used for errors?)

def get_keys(d, prefix=''):
    keys = []
    for k, v in d.items():
        if isinstance(v, dict):
            keys.extend(get_keys(v, prefix + k + '.'))
        else:
            keys.append(prefix + k)
    return set(keys)

all_json_keys = get_keys(vi_data)

unused = all_json_keys - used_keys
# Let's write them to a file so I can inspect.
with open('unused.txt', 'w', encoding='utf-8') as f:
    for k in sorted(list(unused)):
        f.write(k + '\n')
