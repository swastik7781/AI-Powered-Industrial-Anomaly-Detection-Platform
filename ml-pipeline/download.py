import urllib.request
import tarfile
import os
import sys

def download_progress(count, block_size, total_size):
    percent = int(count * block_size * 100 / total_size)
    sys.stdout.write(f"\rDownloading... {percent}%")
    sys.stdout.flush()

url = "https://www.mydrive.ch/shares/38536/3830184030e49fe74747669442f0f282/download/420937370-1629951468/bottle.tar.xz"
target_path = "data/bottle.tar.xz"
extract_path = "data"

os.makedirs(extract_path, exist_ok=True)

print("Starting direct network fetch of Real MVTec AD Dataset (Bottle category, ~110MB).")
try:
    urllib.request.urlretrieve(url, target_path, reporthook=download_progress)
    print("\nDownload complete. Extracting high-resolution archive (this takes mathematical processing)...")
    with tarfile.open(target_path, "r:xz") as tar:
        tar.extractall(path=extract_path)
    print("Data extraction securely finalized. Nominal models are ready for extraction.")
    os.remove(target_path)
except Exception as e:
    print(f"\nFailed to fetch dataset block: {e}")
    sys.exit(1)
