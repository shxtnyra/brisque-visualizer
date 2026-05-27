import re
import yaml
from pathlib import Path


def opencv_matrix_constructor(loader, node):
    return loader.construct_mapping(node, deep=True)


yaml.add_constructor('tag:yaml.org,2002:opencv-matrix', opencv_matrix_constructor)
yaml.add_multi_constructor('!', lambda loader, suffix, node: loader.construct_sequence(node) if isinstance(node, yaml.SequenceNode) else loader.construct_mapping(node))


def load_svm_yaml(path: Path):
    content = path.read_text(encoding='utf-8')
    content = re.sub(r'^---.*$', '', content, flags=re.MULTILINE)
    return yaml.load(content, Loader=yaml.Loader)


def flatten_support_vectors(support_vectors):
    flat = []
    for sv in support_vectors:
        if isinstance(sv, dict) and 'data' in sv:
            flat.extend(sv['data'])
        else:
            flat.extend(sv)
    return flat


def write_libsvm_model(yaml_path: str, out_path: str):
    svm_data = load_svm_yaml(Path(yaml_path))
    svm_root = svm_data['opencv_ml_svm']

    gamma = svm_root['kernel']['gamma']
    dec = svm_root['decision_functions'][0]
    rho = dec['rho']
    alphas = dec['alpha']
    support_vectors = svm_root['support_vectors']

    flat_sv = flatten_support_vectors(support_vectors)
    num_sv = len(alphas)
    dim = int(len(flat_sv) / num_sv)

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('svm_type epsilon-svr\n')
        f.write('kernel_type rbf\n')
        f.write(f'gamma {gamma:.8e}\n')
        f.write('nr_class 2\n')
        f.write(f'total_sv {num_sv}\n')
        f.write(f'rho {rho:.8e}\n')
        f.write('SV\n')

        for i in range(num_sv):
            coef = alphas[i]
            sv = flat_sv[i * dim:(i + 1) * dim]
            parts = [f'{coef:.8e}']
            for j, v in enumerate(sv):
                # libsvm uses 1-based feature indices
                parts.append(f'{j+1}:{v:.8e}')
            f.write(' '.join(parts) + '\n')


if __name__ == '__main__':
    import argparse

    p = argparse.ArgumentParser(description='Export OpenCV SVM YAML to libsvm model text')
    p.add_argument('--yaml', default='brisque_model_live.yml')
    p.add_argument('--out', default='tests/libsvm_model.txt')
    args = p.parse_args()

    write_libsvm_model(args.yaml, args.out)
    print(f'Wrote libsvm model to {args.out}')
