#!/usr/bin/env bash
# End-to-end check of the builder modules against a running backend.
#   BASE=http://localhost:3310/api/v1 KEY=<BUILDFLOW_API_KEY> scripts/e2e-builder.sh
set -euo pipefail
BASE=${BASE:-http://localhost:3310/api/v1}
KEY=${KEY:?set KEY to the BUILDFLOW_API_KEY}
H=(-H "x-api-key: $KEY" -H "x-actor: e2e" -H 'content-type: application/json')
j() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }
call() { local m=$1 p=$2; shift 2; curl -s -X "$m" "${H[@]}" "$BASE$p" "$@"; }
pass() { echo "ok  - $1"; }

lead=$(call POST /leads -d '{"name":"Smith kitchen remodel","contactName":"Pat Smith","email":"pat@example.com","estimatedValue":80000,"confidence":60,"source":"Referral"}' | j 'd["lead"]["id"]'); pass "lead created"
est=$(call POST /estimates -d "{\"leadId\":\"$lead\",\"title\":\"Kitchen remodel\",\"taxRatePct\":8,\"sections\":[{\"name\":\"Demo\",\"lines\":[{\"costCode\":\"02-100\",\"description\":\"Demo cabinets\",\"quantity\":1,\"unit\":\"ls\",\"unitCost\":2000,\"markupPct\":20}]},{\"name\":\"Cabinets\",\"lines\":[{\"description\":\"Shaker cabinets\",\"quantity\":20,\"unit\":\"lf\",\"unitCost\":400,\"markupPct\":25}]}]}")
echo "$est" | j 'd["estimate"]["totals"]["total"] == 13392.0' | grep -q True && pass "estimate totals (cost 10000, price 12400, tax 992, total 13392)"
eid=$(echo "$est" | j 'd["estimate"]["id"]')
acc=$(call POST /estimates/$eid/status -d '{"status":"accepted"}'); pid=$(echo "$acc" | j 'd["estimate"]["projectId"]')
[ -n "$pid" ] && [ "$pid" != "None" ] && pass "accepting the estimate made a job"
call GET /leads/$lead | j 'd["lead"]["stage"]' | grep -q won && pass "lead is won"
num=$(call GET /jobs/$pid/summary | j 'd["job"]["number"]'); echo "$num" | grep -qE '^JOB-[0-9]+$' && pass "the job has a number ($num)"
digits=${num#JOB-}; call GET "/jobs/by-number/job%20$digits" | j 'd["job"]["id"]' | grep -q "$pid" && pass "the job is found by number, typed loosely"
call GET /jobs/by-number/JOB-999999 | j 'd.get("error","")' | grep -q "No job" && pass "an unknown job number is a clear error"

a=$(call POST /projects/$pid/schedule -d '{"title":"Demo","startDate":"2026-12-01","endDate":"2026-12-02"}' | j 'd["item"]["id"]')
b=$(call POST /projects/$pid/schedule -d "{\"title\":\"Cabinets\",\"startDate\":\"2026-12-01\",\"endDate\":\"2026-12-03\",\"predecessorIds\":[\"$a\"]}" | j 'd["item"]["startDate"]+" "+d["item"]["endDate"]')
[ "$b" = "2026-12-03 2026-12-05" ] && pass "dependent item starts after its predecessor (got $b)"
moved=$(call PATCH /schedule/$a -d '{"endDate":"2026-12-04"}' | j 'len(d["moved"])'); [ "$moved" = 1 ] && pass "moving the predecessor pushed the dependent item"
loop=$(call PATCH /schedule/$a -d "{\"predecessorIds\":[\"$(call GET /projects/$pid/schedule | j '[i["id"] for i in d["items"] if i["title"]=="Cabinets"][0]')\"]}" | j 'd.get("error","")'); echo "$loop" | grep -q loop && pass "loops are refused"

call POST /projects/$pid/daily-logs -d '{"date":"2026-12-01","workPerformed":"Demo done","crew":[{"name":"Ana","hours":8}],"weather":{"conditions":"Sunny","highF":60},"visibleToClient":true}' | j 'd["log"]["author"]' | grep -q e2e && pass "daily log records who wrote it"

co=$(call POST /projects/$pid/change-orders -d '{"title":"Add pantry","lines":[{"description":"Pantry cabinet","quantity":1,"unitCost":1000,"markupPct":20}],"scheduleImpactDays":2}' | j 'd["changeOrder"]["id"]+" "+d["changeOrder"]["number"]')
coid=${co% *}; [ "${co#* }" = "CO-0001" ] && pass "change order numbered CO-0001"
call POST /change-orders/$coid/status -d '{"status":"approved"}' | j 'd.get("error","")' | grep -q "cannot become" && pass "a draft cannot jump to approved"
call POST /change-orders/$coid/status -d '{"status":"pending_client"}' >/dev/null

sel=$(call POST /projects/$pid/selections -d '{"category":"Counters","title":"Kitchen countertop","allowance":3000,"options":[{"name":"Quartz","price":3500},{"name":"Laminate","price":1200}]}' | j 'd["selection"]["id"]+" "+d["selection"]["options"][0]["id"]')

tok=$(call POST /projects/$pid/portal-access -d '{"name":"Pat Smith","email":"pat@example.com"}' | j 'd["token"]')
ov=$(curl -s "$BASE/portal/$tok"); echo "$ov" | j 'len(d["changeOrders"])==1 and len(d["dailyLogs"])==1 and d["contract"]["pendingChangeOrders"]==1200' | grep -q True && pass "portal shows the pending change order and the client-visible log"
curl -s -X POST -H 'content-type: application/json' "$BASE/portal/$tok/change-orders/$coid/decision" -d '{"decision":"approve","signatureName":"Pat Smith"}' | j 'd["changeOrder"]["status"]' | grep -q approved && pass "client approved and signed the change order"
curl -s -X POST -H 'content-type: application/json' "$BASE/portal/$tok/selections/${sel% *}/choose" -d "{\"optionId\":\"${sel#* }\"}" | j 'd["selection"]["overage"]' | grep -q 500 && pass "client chose quartz: 500 over allowance"
call GET /projects/$pid/contract | j 'd["revised"]==13392+1200' | grep -q True && pass "revised contract = estimate + approved change order"
call GET /jobs/by-number/$num | j 'd["contract"]["revised"]==14592 and len(d["schedule"]["next"])==2 and d["lastDailyLog"]["date"]=="2026-12-01"' | grep -q True && pass "job summary by number: contract, next schedule items, last log"
curl -s -o /dev/null -w '%{http_code}' "$BASE/portal/not-a-real-token-xxxxxxxxxx" | grep -q 404 && pass "unknown portal link is refused"
curl -s -o /dev/null -w '%{http_code}' "$BASE/leads" | grep -q 401 && pass "API needs a key or sign-in"
echo "done"
