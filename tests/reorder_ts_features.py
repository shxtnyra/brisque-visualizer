import json
from pathlib import Path
p = Path('tests/ts_features.json')
arr = json.loads(p.read_text())
if len(arr) != 36:
    raise SystemExit('Unexpected length')
# For each scale (0 and 18), reorder each 4-block for AGGD from [a, Lvar, Rvar, eta]
# to [a, eta, Lvar, Rvar]
out = arr.copy()
for base in (0, 18):
    # MSCN a,var stay as is for base,base+1
    # AGGD blocks start at base+2 for 4 orientations
    for k in range(4):
        i = base + 2 + k*4
        a = arr[i]
        lvar = arr[i+1]
        rvar = arr[i+2]
        eta = arr[i+3]
        out[i]   = a
        out[i+1] = eta
        out[i+2] = lvar
        out[i+3] = rvar
Path('tests/ts_features_reordered.json').write_text(json.dumps(out))
print('Wrote tests/ts_features_reordered.json')
