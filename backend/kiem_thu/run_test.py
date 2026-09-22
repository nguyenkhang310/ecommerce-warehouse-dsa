# chạy trên cả win và macOS: python backend/kiem_thu/run_test.py
#!/usr/bin/env python3
import os
import subprocess
import sys

script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

exe_name = "test_tich_hop.exe" if os.name == "nt" else "test_tich_hop"

print("[1/2] Đang biên dịch...")
compile_cmd = [
    "g++", "-std=c++17", "-O2",
    "-I..", "-I../thu_vien",
    "-o", exe_name,
    "test_tich_hop.cpp"
]

if subprocess.run(compile_cmd).returncode != 0:
    print("Biên dịch THẤT BẠI!")
    sys.exit(1)

print("[2/2] Đang chạy test...")
root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
os.chdir(root_dir)

exe_path = os.path.join("backend", "kiem_thu", exe_name)
data_path = os.path.join("backend", "data", "data_chinh")

sys.exit(subprocess.run([exe_path, data_path]).returncode)