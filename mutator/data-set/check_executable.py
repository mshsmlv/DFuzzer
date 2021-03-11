#!/usr/bin/env python3

import sys
import os
import subprocess

from progress.bar import IncrementalBar


def run(js_exe, js_file):
    command = js_exe + " " + js_file
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE)
    process.wait()
    return process.returncode

def list_dir(dir_path):
  return [os.path.join(dir_path, f) for f in os.listdir(dir_path)]


def run_data_set(js_exe, data_set_dir):
    files = list_dir(data_set_dir)
    ret_not_0 = []

    bar = IncrementalBar('Test Counter', max = len(files))

    for js_file in files:
        if run(js_exe, js_file) != 0:
            ret_not_0.append(js_file)
        bar.next()
    
    bar.finish()
    
    print("folowing scripts are failed:")
    for js_file in ret_not_0:
        print(js_file)
    print("Total: ", len(ret_not_0))

if __name__=="__main__":
    js_exe = sys.argv[1]
    if not os.path.isfile(js_exe):
        print("Error: js executable doesn't exist")
        sys.exit(-1)
    
    data_set_dir = sys.argv[2]
    if not os.path.isdir(data_set_dir):
        print("Error: data-set dir doesn't exist") 
        sys.exit(-1)

    run_data_set(js_exe, data_set_dir)
