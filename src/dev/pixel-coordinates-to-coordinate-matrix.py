import pandas as pd
import json
import sys

def csv_to_matrix(csv_path, json_path):
    df = pd.read_csv(csv_path)
    df = df[['x', 'y']]
    if len(df) != 448:
        raise ValueError("CSV must have exactly 448 rows (excluding header).")
    data = df.values.tolist()
    # Group every 7 rows into one row of the matrix (64 rows, each with 7 [x, y] pairs)
    matrix = [data[i*7:(i+1)*7] for i in range(64)]
    with open(json_path, 'w') as f:
        json.dump(matrix, f)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pixel-coordinates-to-coordinate-matrix.py input.csv output.json")
        sys.exit(1)
    csv_to_matrix(sys.argv[1], sys.argv[2])
