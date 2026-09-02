#!/usr/bin/env bash
# Kiểm tra sức khoẻ toàn bộ link chương trình.
# Dùng: bash tools/check_links.sh > .linkcheck-results.tsv
# Cột: id <TAB> http_code <TAB> url_cuoi_cung <TAB> url_goc
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"

probe() {
  id="$1"; url="$2"
  # GET nhẹ (nhiều site đại học chặn HEAD), giới hạn 1 byte, tối đa 20s
  out=$(curl -sSL -o /dev/null -w '%{http_code}\t%{url_effective}' \
        --max-time 20 --connect-timeout 10 \
        -A "$UA" -H 'Accept-Language: en' \
        -r 0-0 "$url" 2>/dev/null)
  code="${out%%$'\t'*}"
  if [ -z "$code" ] || [ "$code" = "000" ]; then
    # thử lại không dùng range header
    out=$(curl -sSL -o /dev/null -w '%{http_code}\t%{url_effective}' \
          --max-time 25 --connect-timeout 10 -A "$UA" "$url" 2>/dev/null)
  fi
  printf '%s\t%s\t%s\n' "$id" "$out" "$url"
}
export -f probe
export UA

cut -f1,2 .linkcheck-urls.txt | while IFS=$'\t' read -r id url; do
  printf '%s\t%s\n' "$id" "$url"
done | xargs -P 12 -I{} bash -c 'IFS=$'"'"'\t'"'"' read -r a b <<< "{}"; probe "$a" "$b"'
