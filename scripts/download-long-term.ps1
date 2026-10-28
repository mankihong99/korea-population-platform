$ErrorActionPreference = 'Stop'
$longTermDirectory = Join-Path (Split-Path -Parent $PSScriptRoot) 'data-source/long-term'
New-Item -ItemType Directory -Force -Path $longTermDirectory | Out-Null
# Public KOSIS dashboard pages; Sejong's dashboard code is 27 (map code 29).
foreach ($areaCode in @('00','11','21','22','23','24','25','26','27','31','32','33','34','35','36','37','38','39')) {
    $queryCode = if ($areaCode -eq '00') { '' } else { $areaCode }
    $sourceUrl = "https://kosis.kr/visual/populationKorea/PopulationDashBoardDetail.do?listId=A_02&statJipyoId=3737&vStatJipyoId=5232&areaId=$queryCode"
    Invoke-WebRequest -Uri $sourceUrl -OutFile (Join-Path $longTermDirectory "$areaCode.html") -TimeoutSec 40
    Write-Output "Downloaded KOSIS area $areaCode"
}
