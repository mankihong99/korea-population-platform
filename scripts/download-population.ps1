$ErrorActionPreference = 'Stop'
$populationRoot = Split-Path -Parent $PSScriptRoot
$populationDirectory = Join-Path $populationRoot 'data-source'
New-Item -ItemType Directory -Force -Path $populationDirectory | Out-Null
# The public download UI limits annual queries to six years; use the same limit.
foreach ($populationStart in @(2008, 2014, 2020)) {
    $populationEnd = $populationStart + 5
    $populationBody = @{
        sltOrgType='1'; sltOrgLvl1='A'; sltOrgLvl2=''; sum='sum'; sltUndefType=''
        searchYearStart="$populationStart"; searchMonthStart='12'
        searchYearEnd="$populationEnd"; searchMonthEnd='12'
        sltOrderType='1'; sltOrderValue='ASC'
        sltArgTypes='10'; sltArgTypeA='0'; sltArgTypeB='100'; category='year'; state='2'
    }
    $populationFile = Join-Path $populationDirectory "population-$populationStart-$populationEnd.csv"
    Invoke-WebRequest -Uri 'https://jumin.mois.go.kr/downloadCsvAge.do?searchYearMonth=year&xlsStats=2' -Method Post -Body $populationBody -OutFile $populationFile -TimeoutSec 90
    Write-Output "Downloaded $populationStart-$populationEnd"
}
