import sys, subprocess

try:
    import tensorflow
    print("Python: Tensorflow available")
except:
    try:
        subprocess.check_call([sys.executable, '-m', 'pip3', 'install', '--user', 'tensorflow'])
        print('Package newly installed: tensorflow (pip3)')
    except:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'tensorflow'])
            print('Package newly installed: tensorflow (pip)')
        except Exception as e:
            print('Failure - could not install Tensorflow!')
            print(e)