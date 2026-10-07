#!/usr/bin/env python3
"""Chạy từ bất kỳ thư mục: python backend/kiem_thu/run_test.py [--sanitize]."""
import os
from pathlib import Path
import subprocess
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

root = Path(__file__).resolve().parents[2]
build = root / 'backend/build/kiem_thu'
build.mkdir(parents=True, exist_ok=True)
tests = sorted((root / 'backend/members').glob('*/kiem_thu/*.cpp'))
tests = [p for p in tests if p.name != 'do_luong.cpp']
tests.append(root / 'backend/kiem_thu/test_tich_hop.cpp')
for index, source in enumerate(tests, 1):
    binary = build / (str(index) + ('.exe' if os.name == 'nt' else ''))
    command = [os.environ.get('CXX', 'g++'), '-std=c++17', '-O1', '-g',
               '-Wall', '-Wextra', '-Wpedantic', '-Ibackend', '-isystem',
               'backend/thu_vien', str(source), '-o', str(binary)]
    if '--sanitize' in sys.argv:
        command += ['-fsanitize=address,undefined', '-fno-omit-frame-pointer']
    print(f'[{index}/{len(tests)}] {source.relative_to(root)}', flush=True)
    for args in (command, [str(binary)]):
        result = subprocess.run(args, cwd=root)
        if result.returncode:
            sys.exit(result.returncode)
print(f'PASS: {len(tests)} chương trình kiểm thử.')
