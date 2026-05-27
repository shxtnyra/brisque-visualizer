import json
from pathlib import Path


def write_libsvm_feature_vector(features_path: str, out_path: str):
    arr = json.loads(Path(features_path).read_text(encoding='utf-8'))
    # libsvm expects lines: <label> index:val ... ; for SVR label can be 0
    parts = ['0']
    for i, v in enumerate(arr):
        parts.append(f"{i+1}:{v:.8e}")

    Path(out_path).write_text(' '.join(parts) + '\n', encoding='utf-8')


if __name__ == '__main__':
    import argparse

    p = argparse.ArgumentParser(description='Export 36-d feature vector to libsvm data line')
    p.add_argument('--features', default='tests/ref_features.json')
    p.add_argument('--out', default='tests/libsvm_features.txt')
    args = p.parse_args()

    write_libsvm_feature_vector(args.features, args.out)
    print(f'Wrote libsvm features to {args.out}')
