import re
import yaml

# Настройка парсера, чтобы он игнорировал специфичные теги OpenCV (!!opencv-matrix)
def opencv_matrix_constructor(loader, node):
    mapping = loader.construct_mapping(node, deep=True)
    return mapping

yaml.add_constructor('tag:yaml.org,2002:opencv-matrix', opencv_matrix_constructor)
# На всякий случай игнорируем любые неизвестные теги
yaml.add_multi_constructor('!', lambda loader, suffix, node: loader.construct_sequence(node) if isinstance(node, yaml.SequenceNode) else loader.construct_mapping(node))

def convert():
    print("Шаг 1: Чтение и парсинг файлов...")

    # 1. Читаем файл с весами SVM
    with open('brisque_model_live.yml', 'r', encoding='utf-8') as f:
        # Регулярка убирает знак '---', который часто ломает парсинг многодокументных YAML в OpenCV
        content = f.read()
        content = re.sub(r'^---.*$', '', content, flags=re.MULTILINE)
        svm_data = yaml.load(content, Loader=yaml.Loader)

    # 2. Читаем файл с диапазонами признаков (Scale Limits)
    with open('brisque_range_live.yml', 'r', encoding='utf-8') as f:
        content = f.read()
        content = re.sub(r'^---.*$', '', content, flags=re.MULTILINE)
        range_data = yaml.load(content, Loader=yaml.Loader)

    print("Шаг 2: Извлечение параметров модели...")

    # Извлекаем данные из структуры OpenCV SVM
    svm_root = svm_data['opencv_ml_svm']
    gamma = svm_root['kernel']['gamma']

    dec_func = svm_root['decision_functions'][0]
    rho = dec_func['rho']
    alphas = dec_func['alpha']

    support_vectors = svm_root['support_vectors']

    # Извлекаем данные диапазонов (первые 36 - min, вторые 36 - max)
    range_raw = range_data['range']['data']
    scale_min = range_raw[0:36]
    scale_max = range_raw[36:72]

    print(r"Шаг 3: Генерация файла BrisqueWeights.ts...")

    # Форматируем массивы для красивой записи в TypeScript
    scale_min_str = ", ".join(f"{x:.8e}" for x in scale_min)
    scale_max_str = ", ".join(f"{x:.8e}" for x in scale_max)
    alphas_str = ", ".join(f"{x:.8e}" for x in alphas)

    # Схлопываем двумерный массив опорных векторов в один плоский список
    flat_sv = []
    for sv in support_vectors:
        # Бывает, что OpenCV записывает вектор как словарь с полем 'data'
        if isinstance(sv, dict) and 'data' in sv:
            flat_sv.extend(sv['data'])
        else:
            flat_sv.extend(sv)

    # Разбиваем текстовый вывод плоского массива по 36 элементов на строку для читаемости
    sv_lines = []
    for i in range(0, len(flat_sv), 36):
        chunk = flat_sv[i:i+36]
        sv_lines.append("    " + ", ".join(f"{x:.8e}" for x in chunk))
    flat_sv_str = ",\n".join(sv_lines)

    # Шаблон TypeScript файла
    ts_template = f"""// Сгенерировано автоматически с помощью convert_weights.py. НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.
export const BRISQUE_WEIGHTS = {{
  gamma: {gamma:.8e},
  rho: {rho:.8e},
  scaleMin: new Float32Array([
    {scale_min_str}
  ]),
  scaleMax: new Float32Array([
    {scale_max_str}
  ]),
  svCoef: new Float32Array([
    {alphas_str}
  ]),
  // Плоский массив (774 * 36 = 27864 элементов) для высокой производительности и кэш-локальности
  supportVectorsFlat: new Float32Array([
{flat_sv_str}
  ])
}};
"""

    # Запись в файл
    with open('BrisqueWeights.ts', 'w', encoding='utf-8') as f:
        f.write(ts_template)

    print(f"Успешно! Создан файл BrisqueWeights.ts")
    print(f"Всего опорных векторов: {len(support_vectors)}")
    print(f"Размер плоского массива: {len(flat_sv)} элементов")

if __name__ == "__main__":
    convert()
