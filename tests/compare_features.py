import json
import numpy as np
import sys
from pathlib import Path


def load_features(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f'Missing file: {path}')
    data = json.loads(p.read_text())
    arr = np.asarray(data, dtype=np.float64)
    return arr


if len(sys.argv) != 3:
    print('Usage: python tests/compare_features.py reference_from_python.json features_from_ts.json')
    sys.exit(1)

ref = load_features(sys.argv[1])
ts = load_features(sys.argv[2])

if ref.shape != ts.shape:
    print('Shape mismatch:', ref.shape, ts.shape)
    sys.exit(2)

diff = ts - ref
abs_diff = np.abs(diff)
rmse = np.sqrt(np.mean(diff ** 2))
mae = np.mean(abs_diff)
max_abs = np.max(abs_diff)

print('N =', ref.size)
print('RMSE =', rmse)
print('MAE  =', mae)
print('MaxAbs =', max_abs)
print('First 10 ref:', np.round(ref[:10], 6))
print('First 10 ts :', np.round(ts[:10], 6))
print('First 10 diff:', np.round(diff[:10], 6))

print('\nIndices of largest differences:')
inds = np.argsort(-abs_diff)
for i in inds[:10]:
    print(i, 'ref=', ref[i], 'ts=', ts[i], 'diff=', diff[i])
import json
import numpy as np
import sys
from pathlib import Path

def load_features(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f'Missing file: {path}')
    data = json.loads(p.read_text())
    arr = np.asarray(data, dtype=np.float64)
    return arr

if len(sys.argv) != 3:
    print('Usage: python tests/compare_features.py reference_from_python.json features_from_ts.json')
    sys.exit(1)

ref = load_features(sys.argv[1])
ts = load_features(sys.argv[2])

if ref.shape != ts.shape:
    print('Shape mismatch:', ref.shape, ts.shape)
    sys.exit(2)

diff = ts - ref
abs_diff = np.abs(diff)
rmse = np.sqrt(np.mean(diff**2))
mae = np.mean(abs_diff)
max_abs = np.max(abs_diff)

print('N =', ref.size)
print('RMSE =', rmse)
print('MAE  =', mae)
print('MaxAbs =', max_abs)
print('First 10 ref:', np.round(ref[:10],6))
print('First 10 ts :', np.round(ts[:10],6))
print('First 10 diff:', np.round(diff[:10],6))
