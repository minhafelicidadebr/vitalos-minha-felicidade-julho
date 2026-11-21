# Adaptador PowerShell 5.1 da preparação do pacote de staging IVO.
#
# Uso (na raiz do repositório):
#   powershell -ExecutionPolicy Bypass -File scripts\ivo-staging\prepare.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\ivo-staging\prepare.ps1 -Command snapshot -OutDir D:\backups\ivo
#
# A chave pública de staging é lida por prompt OCULTO (nunca no chat, nunca em
# argumento, nunca no clipboard de outro comando). Ela vive só no ambiente
# deste processo enquanto o build roda; o valor anterior da variável é
# restaurado no finally, inclusive em falha. Para o snapshot, a URL do banco é
# lida do mesmo jeito.

param(
  [ValidateSet("build", "finalize", "snapshot")]
  [string]$Command = "build",
  [string]$Package = "",
  [string]$ProvisionManifest = "",
  [string]$OutDir = "",
  [string]$DockerNetwork = ""
)

$ErrorActionPreference = "Stop"

function Read-Hidden([string]$Prompt) {
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$names = @("IVO_STAGING_PUBLISHABLE_KEY", "STAGING_DB_URL")
$previous = @{}
foreach ($n in $names) { $previous[$n] = [Environment]::GetEnvironmentVariable($n, "Process") }

$exit = 1
try {
  $bunArgs = @("run", "scripts/ivo-staging-prepare.ts", $Command)
  if ($Command -eq "snapshot") {
    if (-not $OutDir) { throw "Informe -OutDir (diretório do host fora do repositório)." }
    if (-not $env:STAGING_DB_URL) { $env:STAGING_DB_URL = Read-Hidden "URL do banco de STAGING (oculta)" }
    $bunArgs += "--out-dir=$OutDir"
    if ($DockerNetwork) { $bunArgs += "--docker-network=$DockerNetwork" }
  } else {
    if (-not $env:IVO_STAGING_PUBLISHABLE_KEY) {
      $value = Read-Hidden "Publishable key do projeto de STAGING xttjkpzhxtjfwxjsxuab (oculta; Enter vazio = tentar Supabase CLI)"
      if ($value) { $env:IVO_STAGING_PUBLISHABLE_KEY = $value.Trim() }
      $value = $null
    }
    if ($Command -eq "finalize") { $bunArgs += "--package=$Package"; $bunArgs += "--provision-manifest=$ProvisionManifest" }
  }
  & bun @bunArgs
  $exit = $LASTEXITCODE
}
finally {
  foreach ($n in $names) { [Environment]::SetEnvironmentVariable($n, $previous[$n], "Process") }
}
exit $exit
