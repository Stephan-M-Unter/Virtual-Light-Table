import sys, subprocess

try:
    import numpy as np
    print("Python: Numpy available")
except:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'numpy'])

try:
    import PIL
    print("Python: PIL available")
except:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'pillow'])