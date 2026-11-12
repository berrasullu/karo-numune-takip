from pathlib import Path
from PIL import Image

ROOT = Path('/home/ubuntu/karo-numune-takip')
SOURCE = Path('/home/ubuntu/webdev-static-assets/karo-numune-icon.png')
TARGETS = {
    ROOT / 'assets/images/icon.png': 768,
    ROOT / 'assets/images/splash-icon.png': 512,
    ROOT / 'assets/images/favicon.png': 256,
    ROOT / 'assets/images/android-icon-foreground.png': 432,
}

with Image.open(SOURCE) as image:
    image = image.convert('RGB')
    for path, size in TARGETS.items():
        resized = image.resize((size, size), Image.Resampling.LANCZOS)
        path.parent.mkdir(parents=True, exist_ok=True)
        resized.save(path, format='PNG', optimize=True, compress_level=9)
        print(f'{path}: {path.stat().st_size / 1024:.1f}KB')
