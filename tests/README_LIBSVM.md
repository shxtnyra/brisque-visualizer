How to debug BRISQUE predictions with libsvm tools

1) Export libsvm model text (compatible with svm-predict):

```powershell
python tests/export_libsvm_model.py --yaml brisque_model_live.yml --out tests/libsvm_model.txt
```

2) Export a single feature vector (from imquality reference):

```powershell
python tests/export_features_libsvm.py --features tests/ref_features.json --out tests/libsvm_features.txt
```

3) Scale features using `svm-scale.exe` and the original ranges file if needed. Example:

```powershell
svm-scale.exe -l tests/scale_lower.txt -u tests/scale_upper.txt tests/libsvm_features.txt > tests/libsvm_features_scaled.txt
```

If you don't have `scale_lower.txt`/`scale_upper.txt`, use the ranges from `brisque_range_live.yml` to build scaling bounds.

4) Predict with `svm-predict.exe`:

```powershell
svm-predict.exe tests/libsvm_features_scaled.txt tests/libsvm_model.txt tests/libsvm_out.txt
```

Notes:
- `svm-scale.exe` and `svm-predict.exe` are the original LIBSVM Windows binaries. Place them into your PATH or call with full path.
- The exporter writes a minimal libsvm model file; if `svm-predict.exe` rejects it, we can adapt formatting to exact libsvm expectations.
