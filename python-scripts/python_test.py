import sys, subprocess
from sys import platform

import os
import os.path
import ssl
import stat
import subprocess
import sys


try:
    import numpy as np
    print("Python: Numpy available")
except:
    try:
        subprocess.check_call([sys.executable, '-m', 'pip3', 'install', '--user', 'numpy'])
        print('Package newly installed: numpy (pip3)')
    except:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'numpy'])
            print('Package newly installed: numpy (pip)')
        except Exception as e:
            print('Failure - could not install Numpy!')
            print(e)

try:
    import cv2
    print("Python: CV2 available")
except:
    try:
        subprocess.check_call([sys.executable, '-m', 'pip3', 'install', '--user', 'opencv-python'])
        print('Package newly installed: opencv-python (pip3)')
    except:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'opencv-python'])
            print('Package newly installed: opencv-python (pip)')
        except Exception as e:
            print('Failure - could not install CV2!')
            print(e)
try:
    import skimage
    print("Python: Scikit-Image available")
except:
    try:
        subprocess.check_call([sys.executable, '-m', 'pip3', 'install', '--user', 'scikit-image'])
        print('Package newly installed: scikit-image (pip3)')
    except:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'scikit-image'])
            print('Package newly installed: scikit-image (pip)')
        except Exception as e:
            print('Failure - could not install SciKit-Image!')
            print(e)

try:
    import PIL
    print("Python: PIL available")
except:
    try:
        subprocess.check_call([sys.executable, '-m', 'pip3', 'install', '--user', 'pillow'])
        print('Package newly installed: pillow (pip3)')
    except:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'pillow'])
            print('Package newly installed: pillow (pip)')
        except Exception as e:
            print('Failure - could not install Pillow')
            print(e)

if platform == "darwin":
    try:
        STAT_0o775 = ( stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR
                    | stat.S_IRGRP | stat.S_IWGRP | stat.S_IXGRP
                    | stat.S_IROTH |                stat.S_IXOTH )

        openssl_dir, openssl_cafile = os.path.split(
            ssl.get_default_verify_paths().openssl_cafile)

        print(" -- pip install --upgrade certifi")
        subprocess.check_call([sys.executable,
            "-E", "-s", "-m", "pip", "install", "--upgrade", "certifi"])

        import certifi

        # change working directory to the default SSL directory
        os.chdir(openssl_dir)
        relpath_to_certifi_cafile = os.path.relpath(certifi.where())
        print(" -- removing any existing file or link")
        try:
            os.remove(openssl_cafile)
        except FileNotFoundError:
            pass
        print(" -- creating symlink to certifi certificate bundle")
        os.symlink(relpath_to_certifi_cafile, openssl_cafile)
        print(" -- setting permissions")
        os.chmod(openssl_cafile, STAT_0o775)
        print(" -- update complete")
    except Exception as e:
        print("Failure - problem while installing certifi")
        print(e)