#!/usr/bin/env bash
# Lists every .csproj under a folder with its UI framework and .NET version.
# Usage: ./detect-dotnet-ui.sh ~/path/to/repos
find "${1:-.}" -name "*.csproj" -not -path "*/bin/*" -not -path "*/obj/*" | while read -r f; do
  d=$(dirname "$f")
  if   grep -qE "UseWPF>true|PresentationFramework" "$f"; then ui="WPF"
  elif grep -qE "UseWindowsForms>true|System.Windows.Forms" "$f"; then ui="WinForms"
  elif grep -q "UseMaui>true" "$f"; then ui="MAUI"
  elif grep -qE "Sdk.Web|Sdk.BlazorWebAssembly" "$f"; then
    if find "$d" -name "*.razor" -not -path "*/bin/*" | grep -q .; then ui="Blazor (web)"; else ui="ASP.NET web"; fi
  else ui="no UI (library/service)"; fi
  ver=$(grep -oE "<TargetFrameworks?(Version)?>[^<]+" "$f" | head -1 | sed 's/.*>//')
  printf "%-24s %-18s %s\n" "$ui" "${ver:-?}" "$f"
done | sort
