#!/usr/bin/env bash
# Checks the office sign-up and sign-in rules. Starts its own scratch servers (never touches real data).
#   KEY=<any test key> scripts/e2e-auth.sh      (run from backend/, after `npm run build`)
set -uo pipefail
cd "$(dirname "$0")/.."
KEY=${KEY:-testkey-$(openssl rand -hex 8)}
REDIS_PORT=${REDIS_PORT:-6390}
pass() { echo "ok  - $1"; }
fail() { echo "FAIL - $1"; FAILED=1; }
check() { if eval "$2"; then pass "$1"; else fail "$1"; fi; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
j() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }
flush() { (exec 3<>/dev/tcp/127.0.0.1/$REDIS_PORT; printf "SELECT $1\r\nFLUSHDB\r\nQUIT\r\n" >&3; timeout 2 cat <&3) >/dev/null; }
start() { # port db extra-env...
  local port=$1 db=$2; shift 2
  flush "$db"
  env PORT=$port HOST=127.0.0.1 REDIS_PORT=$REDIS_PORT REDIS_DB=$db STORAGE_PATH=/tmp/bf-media-auth JWT_SECRET=test-$(openssl rand -hex 8) BUILDFLOW_API_KEY=$KEY "$@" node dist/server.js >/tmp/bf-auth-$port.log 2>&1 &
  echo $! > /tmp/bf-auth-$port.pid; sleep 6
}
stop() { kill "$(cat /tmp/bf-auth-$1.pid)" 2>/dev/null; sleep 1; }
post() { local url=$1 body=$2; shift 2; curl -s -X POST -H 'content-type: application/json' "$@" "$url" -d "$body"; }
FAILED=0

# ---------- normal install: sign-up needs office authority ----------
B=http://127.0.0.1:3311/api/v1/auth
start 3311 8
check "no sign-in, no account (401)" '[ "$(code -X POST -H "content-type: application/json" $B/register -d "{\"email\":\"a@example.com\",\"password\":\"long enough pw\",\"role\":\"admin\"}")" = 401 ]'
check "(and nothing was created)" '[ "$(post $B/login "{\"email\":\"a@example.com\",\"password\":\"long enough pw\"}" -o /dev/null -w "%{http_code}")" = 401 ]'
r=$(post $B/register '{"email":"Boss@Example.com","password":"long enough pw","role":"admin","firstName":"Boss"}' -H "x-api-key: $KEY")
check "the service key (Bot HQ) can create an admin" '[ "$(echo "$r" | j "d[\"user\"][\"role\"]")" = admin ]'
check "email is stored in lower case" '[ "$(echo "$r" | j "d[\"user\"][\"email\"]")" = boss@example.com ]'
check "no password in the answer" '! echo "$r" | grep -qi "password"'
adm=$(post $B/login '{"email":"BOSS@example.com","password":"long enough pw"}' | j 'd["token"]')
check "sign-in works (email not case sensitive)" '[ -n "$adm" ]'
check "an admin can create a project manager" '[ "$(post $B/register "{\"email\":\"pm@example.com\",\"password\":\"another long pw\",\"role\":\"project_manager\"}" -H "authorization: Bearer $adm" -o /dev/null -w "%{http_code}")" = 201 ]'
pm=$(post $B/login '{"email":"pm@example.com","password":"another long pw"}' | j 'd["token"]')
check "a project manager cannot create accounts (403)" '[ "$(post $B/register "{\"email\":\"x@example.com\",\"password\":\"long enough pw\",\"role\":\"admin\"}" -H "authorization: Bearer $pm" -o /dev/null -w "%{http_code}")" = 403 ]'
check "a made-up role is refused" '[ "$(post $B/register "{\"email\":\"y@example.com\",\"password\":\"long enough pw\",\"role\":\"superadmin\"}" -H "x-api-key: $KEY" -o /dev/null -w "%{http_code}")" = 400 ]'
check "a short password is refused" '[ "$(post $B/register "{\"email\":\"z@example.com\",\"password\":\"short\"}" -H "x-api-key: $KEY" -o /dev/null -w "%{http_code}")" = 400 ]'
check "a bad email is refused" '[ "$(post $B/register "{\"email\":\"nope\",\"password\":\"long enough pw\"}" -H "x-api-key: $KEY" -o /dev/null -w "%{http_code}")" = 400 ]'
check "a duplicate email is refused (any letter case)" '[ "$(post $B/register "{\"email\":\"BOSS@example.com\",\"password\":\"long enough pw\"}" -H "x-api-key: $KEY" -o /dev/null -w "%{http_code}")" = 400 ]'
check "a wrong password and an unknown email give the same answer" '[ "$(post $B/login "{\"email\":\"boss@example.com\",\"password\":\"wrong\"}")" = "$(post $B/login "{\"email\":\"nobody@example.com\",\"password\":\"wrong\"}")" ]'
# a crew token is not an office token
crew=$(curl -s -X POST -H "x-api-key: $KEY" -H 'content-type: application/json' http://127.0.0.1:3311/api/v1/crew -d '{"name":"Ana","email":"ana@example.com"}' | j 'd["inviteToken"]')
ct=$(curl -s -X POST -H 'content-type: application/json' http://127.0.0.1:3311/field/api/join -d "{\"code\":\"$crew\",\"password\":\"crew password\"}" | j 'd["token"]')
check "a crew token cannot create accounts (401)" '[ "$(post $B/register "{\"email\":\"w@example.com\",\"password\":\"long enough pw\"}" -H "authorization: Bearer $ct" -o /dev/null -w "%{http_code}")" = 401 ]'
# the brake on guessing
for i in $(seq 1 11); do c=$(post $B/login '{"email":"target@example.com","password":"guess"}' -o /dev/null -w '%{http_code}'); done
check "guessing a password is slowed down (429 after 10)" '[ "$c" = 429 ]'
check "(other people can still sign in)" '[ -n "$(post $B/login "{\"email\":\"boss@example.com\",\"password\":\"long enough pw\"}" | j "d.get(\"token\",\"\")")" ]'
stop 3311

# ---------- a brand-new install: only the first account, only when asked for ----------
B=http://127.0.0.1:3312/api/v1/auth
start 3312 7 BUILDFLOW_BOOTSTRAP=1
check "first-time setup: the first account needs no sign-in, and is always an admin" '[ "$(post $B/register "{\"email\":\"first@example.com\",\"password\":\"long enough pw\",\"role\":\"client\"}" | j "d[\"user\"][\"role\"]")" = admin ]'
check "...and then the door closes (401)" '[ "$(post $B/register "{\"email\":\"second@example.com\",\"password\":\"long enough pw\"}" -o /dev/null -w "%{http_code}")" = 401 ]'
stop 3312
flush 8; flush 7

# ---------- production needs its own signing key ----------
out=$(env NODE_ENV=production JWT_SECRET= PORT=3313 HOST=127.0.0.1 REDIS_PORT=$REDIS_PORT timeout 15 node dist/server.js 2>&1); rc=$?
check "production refuses to start without a signing key" '[ $rc -ne 0 ] && echo "$out" | grep -q "JWT_SECRET must be set"'
rm -rf /tmp/bf-media-auth
[ "$FAILED" = 0 ] && echo "done: all passed" || { echo "done: SOME FAILED"; exit 1; }
