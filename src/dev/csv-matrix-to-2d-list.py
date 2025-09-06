import pandas as pd
import json
import sys

def csv_to_2d_list(csv_file_path):
    df = pd.read_csv(csv_file_path, header=None)
    return df.values.tolist()

def main():
    if len(sys.argv) != 3:
        print("Usage: python csv-matrix-to-2d-list.py input.csv output.json")
        sys.exit(1)

    csv_file = sys.argv[1]
    json_file = sys.argv[2]

    matrix = csv_to_2d_list(csv_file)

    with open(json_file, 'w') as f:
        json.dump(matrix, f)

if __name__ == "__main__":
    main()
