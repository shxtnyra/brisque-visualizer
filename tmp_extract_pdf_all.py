from pathlib import Path
import PyPDF2

path = Path('TIP BRISQUE_2.pdf')
reader = PyPDF2.PdfReader(str(path))
print('pages', len(reader.pages))
for i, page in enumerate(reader.pages[6:14], 7):
    text = page.extract_text() or ''
    print('=== PAGE', i, '===')
    print(text[:4000].replace('\n', '\\n'))
