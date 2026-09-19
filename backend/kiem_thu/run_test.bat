@echo off
REM Script build và chạy test tích hợp
REM Dùng: run_test.bat
REM Chạy lệnh trên terminal: backend\kiem_thu\run_test.bat

cd /d "%~dp0"

echo [1/2] Đang biên dịch...
g++ -std=c++17 -O2 -I".." -I"..\thu_vien" -o test_tich_hop.exe test_tich_hop.cpp

if errorlevel 1 (
    echo Biên dịch THẤT BẠI!
    exit /b 1
)

echo [2/2] Đang chạy test...
cd /d "%~dp0..\.."
backend\kiem_thu\test_tich_hop.exe "backend\data\data_chinh"

exit /b %errorlevel%

