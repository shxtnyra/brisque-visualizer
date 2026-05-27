# BRISQUE Comparison Tests

This folder contains a Python script that uses the `imquality` library to compute BRISQUE intermediate values and 36 raw features from MSCN.

## Setup

Install the Python dependencies:

```bash
python -m pip install -r tests/requirements.txt
```

## Run

```bash
python tests/compare_brisque.py path/to/image.png
```

## Output

The script prints:

- MSCN summary statistics for scale 1 and scale 2
- pairwise product summaries for horizontal, vertical, diagonal and secondary diagonal
- raw 18 features for each scale (total 36 features)
- scaled final BRISQUE feature vector as used by the library
