import sys, subprocess

try:
    import numpy as np
    print("Python: Numpy available")
except:
    try:
        subprocess.check_call([sys.executable, '-m', 'pip3', 'install', '--user', 'numpy'])
    except:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'numpy'])

try:
    import PIL
    print("Python: PIL available")
except:
    try:
        subprocess.check_call([sys.executable, '-m', 'pip3', 'install', '--user', 'pillow'])
    except:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'pillow'])