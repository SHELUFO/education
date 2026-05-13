@echo off
cd /d "%~dp0"
set MYSQL_BIN=mysql
where mysql >nul 2>nul
if errorlevel 1 (
  if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
  ) else (
    echo MySQL client was not found. Please install MySQL 8 and add mysql.exe to PATH.
    pause
    exit /b 1
  )
)
if not exist "data\mysql\chem_web_mysql.sql" (
  echo data\mysql\chem_web_mysql.sql was not found.
  pause
  exit /b 1
)
set /p MYSQL_USER=MySQL user [root]: 
if "%MYSQL_USER%"=="" set MYSQL_USER=root
echo Importing database chem_web_internal. Please enter the MySQL password when prompted.
"%MYSQL_BIN%" --default-character-set=utf8mb4 -u %MYSQL_USER% -p < "data\mysql\chem_web_mysql.sql"
if errorlevel 1 (
  echo MySQL import failed.
  pause
  exit /b 1
)
echo MySQL database import completed.
pause
