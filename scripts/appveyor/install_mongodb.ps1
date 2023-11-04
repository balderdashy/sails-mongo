# Example. Not yet being used
$msiPath = "$($env:USERPROFILE)\mongodb-win32-x86_64-2008plus-ssl-3.0.4-signed.msi"
(New-Object Net.WebClient).DownloadFile('https://fastdl.mongodb.org/win32/mongodb-win32-x86_64-2008plus-ssl-3.0.4-signed.msi', $msiPath)
cmd /c start /wait msiexec /q /i $msiPath INSTALLLOCATION=C:\mongodb ADDLOCAL="all"
del $msiPath

mkdir c:\mongodb\data\db | Out-Null
mkdir c:\mongodb\log | Out-Null

'systemLog:
    destination: file
    path: c:\mongodb\log\mongod.log
storage:
    dbPath: c:\mongodb\data\db' | Out-File C:\mongodb\mongod.cfg -Encoding utf8

cmd /c start /wait sc create MongoDB binPath= "C:\mongodb\bin\mongod.exe --service --config=C:\mongodb\mongod.cfg" DisplayName= "MongoDB" start= "demand"

& c:\mongodb\bin\mongod --version

Start-Service mongodb
