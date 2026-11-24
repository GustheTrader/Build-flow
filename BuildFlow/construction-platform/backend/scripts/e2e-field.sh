#!/usr/bin/env bash
# End-to-end check of crew accounts and the field API against a running backend (use a scratch REDIS_DB).
#   BASE=http://localhost:3310 KEY=<BUILDFLOW_API_KEY> scripts/e2e-field.sh
set -euo pipefail
BASE=${BASE:-http://localhost:3310}
KEY=${KEY:?set KEY to the BUILDFLOW_API_KEY}
OFFICE=(-H "x-api-key: $KEY" -H "x-actor: e2e" -H 'content-type: application/json')
j() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }
office() { local m=$1 p=$2; shift 2; curl -s -X "$m" "${OFFICE[@]}" "$BASE/api/v1$p" "$@"; }
field() { local m=$1 p=$2 t=$3; shift 3; curl -s -X "$m" -H "authorization: Bearer $t" -H 'content-type: application/json' "$BASE/field/api$p" "$@"; }
pass() { echo "ok  - $1"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

# two jobs: A (assigned) and B (not assigned), with money on A
leadA=$(office POST /leads -d '{"name":"Alpha house","estimatedValue":500000}' | j 'd["lead"]["id"]')
estA=$(office POST /estimates -d "{\"leadId\":\"$leadA\",\"title\":\"Alpha\",\"sections\":[{\"name\":\"All\",\"lines\":[{\"description\":\"Build\",\"quantity\":1,\"unitCost\":400000,\"markupPct\":25}]}]}" | j 'd["estimate"]["id"]')
A=$(office POST /estimates/$estA/status -d '{"status":"accepted"}' | j 'd["estimate"]["projectId"]')
leadB=$(office POST /leads -d '{"name":"Beta house","estimatedValue":90000}' | j 'd["lead"]["id"]')
estB=$(office POST /estimates -d "{\"leadId\":\"$leadB\",\"title\":\"Beta\",\"sections\":[{\"name\":\"All\",\"lines\":[{\"description\":\"Build\",\"quantity\":1,\"unitCost\":1000,\"markupPct\":0}]}]}" | j 'd["estimate"]["id"]')
B=$(office POST /estimates/$estB/status -d '{"status":"accepted"}' | j 'd["estimate"]["projectId"]')
item=$(office POST /projects/$A/schedule -d '{"title":"Frame walls","startDate":"2020-01-01","endDate":"2099-12-31"}' | j 'd["item"]["id"]')
itemB=$(office POST /projects/$B/schedule -d '{"title":"Beta item","startDate":"2020-01-01","endDate":"2099-12-31"}' | j 'd["item"]["id"]')
pass "two jobs set up"

# create crew (office): invite shown once, no secrets listed
r=$(office POST /crew -d "{\"name\":\"Ana Ruiz\",\"email\":\"Ana@Example.com\",\"role\":\"crew\",\"jobIds\":[\"$A\"]}")
cid=$(echo "$r" | j 'd["crew"]["id"]'); inv=$(echo "$r" | j 'd["inviteToken"]')
[ ${#inv} -ge 30 ] && pass "crew member created with an invite link"
office GET /crew | j '"inviteHash" not in str(d) and "passwordHash" not in str(d) and d["crew"][0]["access"]=="invited"' | grep -q True && pass "the office list shows access state and no secrets"
office POST /crew -d '{"name":"Dup","email":"ana@example.com"}' | j 'd.get("error","")' | grep -q "already" && pass "duplicate email refused"
office POST /crew -d '{"name":"Bad","email":"nope"}' | j 'd.get("error","")' | grep -q "valid" && pass "bad email refused"
office POST /crew -d '{"name":"Ghost","email":"g@example.com","jobIds":["00000000-0000-0000-0000-000000000000"]}' | j 'd.get("error","")' | grep -q "does not exist" && pass "assigning a missing job refused"

# join with the invite
[ "$(code -X POST -H 'content-type: application/json' $BASE/field/api/join -d "{\"code\":\"$inv\",\"password\":\"short\"}")" = 400 ] && pass "short password refused"
t=$(curl -s -X POST -H 'content-type: application/json' $BASE/field/api/join -d "{\"code\":\"$inv\",\"password\":\"correct horse battery\"}" | j 'd["token"]')
[ -n "$t" ] && pass "invite accepted: signed in with a password of their own"
[ "$(code -X POST -H 'content-type: application/json' $BASE/field/api/join -d "{\"code\":\"$inv\",\"password\":\"another password\"}")" = 400 ] && pass "an invite link works only once"
[ "$(code -X POST -H 'content-type: application/json' $BASE/field/api/login -d '{"email":"ana@example.com","password":"wrong password"}')" = 401 ] && pass "wrong password refused"
t2=$(curl -s -X POST -H 'content-type: application/json' $BASE/field/api/login -d '{"email":"ANA@example.com","password":"correct horse battery"}' | j 'd["token"]')
[ -n "$t2" ] && pass "login works (email not case sensitive)"

# access rules
[ "$(code $BASE/field/api/jobs)" = 401 ] && pass "no token, no access"
[ "$(code -H "x-api-key: $KEY" $BASE/field/api/jobs)" = 401 ] && pass "the office key does not open the field API"
[ "$(code -H "authorization: Bearer $KEY" $BASE/api/v1/leads)" = 401 ] && pass "a crew token does not open the office API"
[ "$(code -H "authorization: Bearer $t" $BASE/api/v1/leads)" = 401 ] && pass "(crew token on office API refused)"
field GET /jobs "$t" | j 'len(d["jobs"])==1 and d["jobs"][0]["id"]=="'$A'" and d["jobs"][0]["number"].startswith("JOB-")' | grep -q True && pass "crew sees only the job assigned to them"
[ "$(code -H "authorization: Bearer $t" $BASE/field/api/jobs/$B)" = 403 ] && pass "another job is refused (403)"
fj=$(field GET /jobs/$A "$t")
echo "$fj" | j 'not any(k in str(d).lower() for k in ["budget","contract","unitcost","markup","estimate","price","400000","500000"])' | grep -q True && pass "no money anywhere in what the crew can see"

# schedule: start / finish, only their jobs
field PATCH /schedule/$item "$t" -d '{"status":"in_progress"}' | j 'd["item"]["status"]+" "+str(d["item"]["updatedBy"])' | grep -q "in_progress Ana Ruiz (field)" && pass "started an item (recorded under their name)"
field PATCH /schedule/$item "$t" -d '{"status":"complete"}' | j 'd["item"]["progress"]==100' | grep -q True && pass "finished an item (progress 100)"
[ "$(code -X PATCH -H "authorization: Bearer $t" -H 'content-type: application/json' $BASE/field/api/schedule/$itemB -d '{"status":"complete"}')" = 403 ] && pass "cannot touch another job's schedule"
field PATCH /schedule/$item "$t" -d '{"startDate":"2030-01-01"}' | j 'd["item"]["startDate"]=="2020-01-01"' | grep -q True && pass "crew cannot move dates"

# daily logs: retries do not duplicate, crew cannot share with the client
cl=$(python3 -c "import uuid; print(uuid.uuid4())")
l1=$(field POST /jobs/$A/daily-logs "$t" -d "{\"clientId\":\"$cl\",\"workPerformed\":\"Framed the north wall\",\"visibleToClient\":true,\"author\":\"Someone Else\",\"crew\":[{\"name\":\"Ana\",\"hours\":8}]}")
echo "$l1" | j 'd["log"]["author"]=="Ana Ruiz" and d["log"]["visibleToClient"]==False' | grep -q True && pass "log is by the signed-in person and is not shared with the client"
field POST /jobs/$A/daily-logs "$t" -d "{\"clientId\":\"$cl\",\"workPerformed\":\"Framed the north wall\"}" >/dev/null
office GET /projects/$A/daily-logs | j 'len(d["logs"])==1' | grep -q True && pass "sending the same log twice makes one log"
[ "$(code -X POST -H "authorization: Bearer $t" -H 'content-type: application/json' $BASE/field/api/jobs/$B/daily-logs -d '{"workPerformed":"x"}')" = 403 ] && pass "cannot log on another job"

# photos
python3 - <<'PY'
from PIL import Image; im=Image.new('RGB',(64,48),(180,60,70)); im.save('/tmp/e2e-field.jpg','JPEG',quality=80)
open('/tmp/e2e-notjpeg.jpg','wb').write(b'GIF89a'+b'0'*400)
PY
ph=$(curl -s -X POST -H "authorization: Bearer $t" -H 'content-type: image/jpeg' --data-binary @/tmp/e2e-field.jpg $BASE/field/api/photos | j 'd["url"]')
echo "$ph" | grep -qE '^/media/[a-f0-9]{32}\.jpg$' && pass "photo uploaded ($ph)"
[ "$(code $BASE$ph)" = 200 ] && [ "$(code $BASE/field$ph)" = 200 ] && pass "the photo can be opened (office and field addresses)"
curl -s -D - -o /dev/null $BASE$ph | grep -qi 'content-type: image/jpeg' && pass "served as an image"
[ "$(code -X POST -H "authorization: Bearer $t" -H 'content-type: image/jpeg' --data-binary @/tmp/e2e-notjpeg.jpg $BASE/field/api/photos)" = 400 ] && pass "a file that is not a JPEG is refused"
[ "$(code -X POST -H 'content-type: image/jpeg' --data-binary @/tmp/e2e-field.jpg $BASE/field/api/photos)" = 401 ] && pass "uploads need a sign-in"
[ "$(code $BASE/media/../../etc/passwd)" = 404 ] && [ "$(code $BASE/media/0000.jpg)" = 404 ] && pass "photo addresses cannot be used to read other files"
field POST /jobs/$A/daily-logs "$t" -d "{\"clientId\":\"$(python3 -c 'import uuid; print(uuid.uuid4())')\",\"workPerformed\":\"With a photo\",\"photos\":[{\"url\":\"$ph\"},{\"url\":\"javascript:alert(1)\"},{\"url\":\"/media/../x.jpg\"}]}" | j 'len(d["log"]["photos"])==1' | grep -q True && pass "only real photo addresses are kept on a log"

# punch list
pc=$(python3 -c "import uuid; print(uuid.uuid4())")
pi=$(field POST /jobs/$A/punch "$t" -d "{\"clientId\":\"$pc\",\"title\":\"Crack in header\",\"location\":\"Kitchen\",\"photos\":[{\"url\":\"$ph\"}]}" | j 'd["item"]["id"]')
field POST /jobs/$A/punch "$t" -d "{\"clientId\":\"$pc\",\"title\":\"Crack in header\"}" >/dev/null
office GET /projects/$A/punch | j 'len(d["items"])==1 and d["items"][0]["createdBy"]=="Ana Ruiz"' | grep -q True && pass "punch item raised once, under their name"
[ "$(code -X POST -H "authorization: Bearer $t" $BASE/field/api/punch/$pi/resolve)" = 403 ] && pass "a plain crew member cannot close punch items"
office PATCH /crew/$cid -d '{"role":"foreman"}' >/dev/null
field POST /punch/$pi/resolve "$t" | j 'd["item"]["status"]' | grep -q resolved && pass "a foreman can close it"
office POST /punch/$pi/status -d '{"status":"open"}' | j 'd["item"]["status"]' | grep -q open && pass "the office can reopen it"

# the office stays in control
office PATCH /crew/$cid -d '{"jobIds":[]}' >/dev/null
field GET /jobs "$t" | j 'len(d["jobs"])==0' | grep -q True && pass "taking a job away takes effect immediately"
office PATCH /crew/$cid -d '{"active":false}' >/dev/null
[ "$(code -H "authorization: Bearer $t" $BASE/field/api/jobs)" = 401 ] && pass "turning someone off signs them out everywhere at once"
[ "$(code -X POST -H 'content-type: application/json' $BASE/field/api/login -d '{"email":"ana@example.com","password":"correct horse battery"}')" = 401 ] && pass "a turned-off account cannot sign in"
r2=$(office POST /crew/$cid/reset); inv2=$(echo "$r2" | j 'd["inviteToken"]')
[ "$(code -X POST -H 'content-type: application/json' $BASE/field/api/login -d '{"email":"ana@example.com","password":"correct horse battery"}')" = 401 ] && pass "reset clears the old password"
t3=$(curl -s -X POST -H 'content-type: application/json' $BASE/field/api/join -d "{\"code\":\"$inv2\",\"password\":\"a brand new password\"}" | j 'd["token"]')
[ -n "$t3" ] && [ "$(code -H "authorization: Bearer $t2" $BASE/field/api/me)" = 401 ] && pass "a reset invite works; the old phone's sign-in does not"

# log redaction and brute force
for i in 1 2 3 4 5 6 7 8 9 10 11; do c=$(code -X POST -H 'content-type: application/json' $BASE/field/api/login -d '{"email":"brute@example.com","password":"nope"}'); done
[ "$c" = 429 ] && pass "repeated wrong passwords are slowed down (429)"
echo "done"
