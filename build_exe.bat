@echo off
echo Installing PyInstaller...
pip install pyinstaller

echo.
echo Building PulseMusic.exe...
pyinstaller --noconfirm --onefile --windowed --icon "icon.ico" --add-data "templates;templates" --add-data "static;static" "app.py" --name "PulseMusic"

echo.
echo Build complete!
echo Your executable is located in the "dist" folder!
pause
