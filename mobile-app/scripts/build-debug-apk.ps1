$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot '.android-tools'
$javaHome = Get-ChildItem -LiteralPath (Join-Path $toolsRoot 'jdk') -Directory | Select-Object -First 1
$androidHome = Join-Path $toolsRoot 'sdk'
if (-not $javaHome -or -not (Test-Path (Join-Path $androidHome 'platforms\android-36'))) { throw 'Missing portable JDK 21 or Android SDK 36.' }
$env:JAVA_HOME = $javaHome.FullName
$env:ANDROID_HOME = $androidHome
$normalizedSdkPath = $androidHome.Replace([char]92, [char]47)
$localProperties = "sdk.dir=$normalizedSdkPath`n"
Set-Content -LiteralPath (Join-Path $projectRoot 'android\local.properties') -Value $localProperties -NoNewline
Push-Location $projectRoot
try {
  npm run typecheck
  npm test
  npm run android:sync
  Push-Location 'android'
  $portableGradle = Join-Path $toolsRoot 'gradle\gradle-8.14.3\bin\gradle.bat'
  try {
    if (Test-Path -LiteralPath $portableGradle) { & $portableGradle assembleDebug }
    else { & '.\gradlew.bat' assembleDebug }
  }
  finally { Pop-Location }
} finally { Pop-Location }
$apk = Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path -LiteralPath $apk)) { throw 'Gradle did not produce an APK.' }
$releaseDir = Join-Path $projectRoot 'releases'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
$releaseApk = Join-Path $releaseDir 'brawl-bp-android-debug.apk'
Copy-Item -LiteralPath $apk -Destination $releaseApk -Force
$hash = (Get-FileHash -LiteralPath $releaseApk -Algorithm SHA256).Hash
Write-Host "APK: $releaseApk"
Write-Host "SHA256: $hash"
