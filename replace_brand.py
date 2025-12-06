import pathlib
root = pathlib.Path('.')
targets = [
    ('AngkatAni','AngkatAni'),
    ('AngkatAni','AngkatAni'),
    ('ANGKATANI','ANGKATANI'),
]
skipped_ext = {'.pyc','.png','.jpg','.jpeg','.gif','.ico','.exe','.dll','.zip','.tar','.gz'}
for path in root.rglob('*'):
    if path.is_dir():
        continue
    if path.suffix.lower() in skipped_ext:
        continue
    try:
        data = path.read_text(encoding='utf-8')
    except Exception:
        continue
    new = data
    for old,new_val in targets:
        new = new.replace(old,new_val)
    if new != data:
        path.write_text(new, encoding='utf-8')
