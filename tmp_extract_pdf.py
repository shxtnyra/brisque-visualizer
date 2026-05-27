from pathlib import Path
import PyPDF2

path = Path('TIP BRISQUE_2.pdf')
print('exists', path.exists(), 'size', path.stat().st_size)
reader = PyPDF2.PdfReader(str(path))
print('pages', len(reader.pages))
for i, page in enumerate(reader.pages[:6], 1):
    text = page.extract_text() or ''
    print('=== PAGE', i, '===')
    print(text[:2500].replace('\n', '\\n'))
