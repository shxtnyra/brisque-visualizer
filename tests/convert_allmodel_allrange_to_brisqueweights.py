from pathlib import Path
import re


def parse_allrange(path: Path, dim=36):
    mins = [0.0] * dim
    maxs = [0.0] * dim
    seen = {}

    for ln in path.read_text(encoding='utf-8').splitlines():
        s = ln.strip()
        if not s:
            continue
        parts = s.split()
        # Expect lines like: index min max
        if len(parts) >= 3 and re.match(r'^\d+$', parts[0]):
            idx = int(parts[0]) - 1
            try:
                mn = float(parts[1])
                mx = float(parts[2])
            except ValueError:
                continue
            if 0 <= idx < dim:
                mins[idx] = mn
                maxs[idx] = mx
                seen[idx] = True
    # Fill missing with zeros
    return mins, maxs


def parse_allmodel(path: Path, dim=36):
    lines = path.read_text(encoding='utf-8').splitlines()
    gamma = None
    rho = None
    sv_coefs = []
    sv_list = []
    in_sv = False

    for ln in lines:
        s = ln.strip()
        if not s:
            continue
        if not in_sv:
            if s.lower().startswith('gamma'):
                try:
                    gamma = float(s.split()[1])
                except Exception:
                    pass
            elif s.lower().startswith('rho'):
                try:
                    rho = float(s.split()[1])
                except Exception:
                    pass
            elif s == 'SV' or s == 'SV':
                in_sv = True
            continue

        # parse support vector line: coef idx:val idx:val ...
        parts = s.split()
        if len(parts) == 0:
            continue
        try:
            coef = float(parts[0])
        except ValueError:
            # sometimes coef may be prefixed, try to replace commas
            coef = float(parts[0].replace(',', '.'))
        vec = [0.0] * dim
        for token in parts[1:]:
            if ':' not in token:
                continue
            idx_s, val_s = token.split(':', 1)
            try:
                idx = int(idx_s) - 1
                val = float(val_s)
            except Exception:
                continue
            if 0 <= idx < dim:
                vec[idx] = val

        sv_coefs.append(coef)
        sv_list.append(vec)

    flat_sv = []
    for sv in sv_list:
        flat_sv.extend(sv)

    return gamma, rho, sv_coefs, flat_sv


def fmt_array_floats(arr, per_line=6):
    parts = []
    for i, v in enumerate(arr):
        parts.append(f"{v:.8e}")
    lines = []
    for i in range(0, len(parts), per_line):
        lines.append('    ' + ', '.join(parts[i:i+per_line]))
    return ',\n'.join(lines)


def write_brisque_weights(gamma, rho, mins, maxs, sv_coefs, flat_sv, out_path: Path):
    svcoefs_str = fmt_array_floats(sv_coefs, per_line=10)
    mins_str = fmt_array_floats(mins, per_line=6)
    maxs_str = fmt_array_floats(maxs, per_line=6)
    sv_flat_str = fmt_array_floats(flat_sv, per_line=6)

    content = f"""// Сгенерировано автоматически из allmodel/allrange. НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.
export const BRISQUE_WEIGHTS = {{
  gamma: {gamma:.8e},
  rho: {rho:.8e},
  scaleMin: new Float32Array([
{mins_str}
  ]),
  scaleMax: new Float32Array([
{maxs_str}
  ]),
  svCoef: new Float32Array([
{svcoefs_str}
  ]),
  // Плоский массив ({len(flat_sv)} элементов)
  supportVectorsFlat: new Float32Array([
{sv_flat_str}
  ])
}};
"""

    out_path.write_text(content, encoding='utf-8')


def main():
    allmodel = Path('C:\\Users\\shxtnyra\\Desktop\\brisque-visualizer\\BRISQUE_release\\allmodel')
    allrange = Path('C:\\Users\\shxtnyra\\Desktop\\brisque-visualizer\\BRISQUE_release\\allrange')
    out_ts = Path('src/renderer/src/core/brisque/BrisqueWeights.ts')

    if not allmodel.exists():
        print('Missing BRISQUE_release/allmodel')
        return
    if not allrange.exists():
        print('Missing BRISQUE_release/allrange')
        return

    mins, maxs = parse_allrange(allrange, dim=36)
    gamma, rho, sv_coefs, flat_sv = parse_allmodel(allmodel, dim=36)

    if gamma is None:
        gamma = 0.05
    if rho is None:
        rho = 0.0

    write_brisque_weights(gamma, rho, mins, maxs, sv_coefs, flat_sv, out_ts)
    print(f'Wrote {out_ts} with {len(sv_coefs)} support vectors')


if __name__ == '__main__':
    main()
