# Front Door + App Service rollout (inventory-aware)

Updated plan for `iharc.ca` using what already exists in **IHARC_public_apps**. Keep the Basic plan (B1) and scale to **B2** if headroom is needed; no VNet integration is required for this scenario.

## What exists today
- **Front Door**: profile `IHARC-FD` (Standard) with endpoint `iharc` → `iharc-hngcbedraxgtfggz.z03.azurefd.net`; single `default-route` to `default-origin-group` → origin `stevi.azurewebsites.net`; no custom domains on FD.
- **WAF**: security policy `IHARC-7ffb7f27` attached to the endpoint, but WAF policy `IHARC` has no managed rule set and is in Detection.
- **App Service**: plan `IHARC-Linux` (Basic B1, Canada Central) hosting two apps:
  - `STEVI` (custom domain `stevi.iharc.ca`, HTTPS only).
  - `IHARC-Login` (only default host).
  Access restrictions are open (`Allow all`).
- **DNS**: zone `iharc.ca` is in the same RG (`IHARC_public_apps`), so CNAMEs can be added via az CLI.

## Gaps to close
- Need three shells: login/client/ops on separate web apps & hostnames.
- Front Door needs three custom domains, origin groups, origins, and host-based routes; default route should be retired after cutover.
- App Services need custom domain bindings, HTTPS only, and access restrictions allowing only `AzureFrontDoor.Backend`.
- WAF needs a managed rule set (DefaultRuleSet + Bot) and Prevention mode after validation.
- CI/CD: publish profiles for the three apps (matrix deploy); current pipeline deploys only one app.

## Plan (keeping Basic; optional bump to B2)
1) **Compute**: stay on `IHARC-Linux` B1; if CPU/RAM sustain high utilization, scale to B2 (more CPU/RAM, still low cost).
2) **App layout**: reuse `STEVI` as `stevi-ops` (add host `ops.iharc.ca`; keep `stevi.iharc.ca` as optional redirect), create two new apps: `stevi-login` and `stevi-client` on the same plan.
3) **Front Door**: keep profile/endpoint; add three custom domains with managed certs; create origin groups/origins per app; create host-based routes with HTTPS redirect and `link-to-default-domain Disabled`; remove or disable `default-route` after new routes are healthy.
4) **Access restrictions**: allow `AzureFrontDoor.Backend` service tag on each app; then deny all. Optionally validate `X-Azure-FDID` header.
5) **WAF**: add DefaultRuleSet + Bot to policy `IHARC`, keep Detection during bake-in, then switch to Prevention.
6) **DNS**: add CNAMEs in Azure DNS for login/client/ops pointing to the FD endpoint.

## az CLI (concrete, idempotent-ish)
```bash
RG=IHARC_public_apps
PROFILE=IHARC-FD
ENDPOINT=iharc
PLAN=IHARC-Linux           # Basic B1 now; change to B2 if needed
LOCATION=canadacentral
ZONE=iharc.ca
FD_HOST=iharc-hngcbedraxgtfggz.z03.azurefd.net

# Optional: scale to B2 (2 cores / more RAM)
# az appservice plan update -g $RG -n $PLAN --sku B2

# 1) Create missing apps
az webapp create -g $RG -p $PLAN -n stevi-login     --runtime "NODE|24-lts" --https-only true
az webapp create -g $RG -p $PLAN -n stevi-client    --runtime "NODE|24-lts" --https-only true
# STEVI already exists; keep as ops app

# 2) App settings per shell (edit values to match secrets)
az webapp config appsettings set -g $RG -n stevi-login  --settings SHELL=login  NEXT_PUBLIC_SITE_URL=https://login.iharc.ca  AUTH_TRUST_HOST=login.iharc.ca
az webapp config appsettings set -g $RG -n stevi-client --settings SHELL=client NEXT_PUBLIC_SITE_URL=https://client.iharc.ca CLIENT_COOKIE_DOMAIN=client.iharc.ca WORKSPACE_COOKIE_DOMAIN=ops.iharc.ca AUTH_TRUST_HOST=login.iharc.ca
az webapp config appsettings set -g $RG -n STEVI        --settings SHELL=ops NEXT_PUBLIC_SITE_URL=https://ops.iharc.ca WORKSPACE_COOKIE_DOMAIN=ops.iharc.ca AUTH_TRUST_HOST=login.iharc.ca

# 3) Access restrictions: allow Front Door, then deny all
for APP in stevi-login stevi-client STEVI; do
  az webapp config access-restriction add -g $RG -n $APP \
    --priority 100 --action Allow --name Allow-FD \
    --service-tag AzureFrontDoor.Backend
  az webapp config access-restriction add -g $RG -n $APP \
    --priority 200 --action Deny --name Deny-All --ip-address 0.0.0.0/0
done

# 4) Front Door custom domains (after DNS CNAMEs exist)
az afd custom-domain create -g $RG --profile-name $PROFILE --hostname login.iharc.ca     --certificate-type ManagedCertificate --minimum-tls-version TLS1_2
az afd custom-domain create -g $RG --profile-name $PROFILE --hostname client.iharc.ca    --certificate-type ManagedCertificate --minimum-tls-version TLS1_2
az afd custom-domain create -g $RG --profile-name $PROFILE --hostname ops.iharc.ca --certificate-type ManagedCertificate --minimum-tls-version TLS1_2

# 5) Origin groups + origins
az afd origin-group create -g $RG --profile-name $PROFILE --afd-endpoint-name $ENDPOINT --name login-og     --probe-request-type GET --probe-interval-in-seconds 30 --sample-size 4 --successful-samples-required 3
az afd origin-group create -g $RG --profile-name $PROFILE --afd-endpoint-name $ENDPOINT --name client-og    --probe-request-type GET --probe-interval-in-seconds 30 --sample-size 4 --successful-samples-required 3
az afd origin-group create -g $RG --profile-name $PROFILE --afd-endpoint-name $ENDPOINT --name ops-og --probe-request-type GET --probe-interval-in-seconds 30 --sample-size 4 --successful-samples-required 3

az afd origin create -g $RG --profile-name $PROFILE --afd-endpoint-name $ENDPOINT --origin-group-name login-og     --name login-origin     --host-name stevi-login.azurewebsites.net  --origin-host-header stevi-login.azurewebsites.net  --http-port 80 --https-port 443
az afd origin create -g $RG --profile-name $PROFILE --afd-endpoint-name $ENDPOINT --origin-group-name client-og    --name client-origin    --host-name stevi-client.azurewebsites.net --origin-host-header stevi-client.azurewebsites.net --http-port 80 --https-port 443
az afd origin create -g $RG --profile-name $PROFILE --afd-endpoint-name $ENDPOINT --origin-group-name ops-og --name ops-origin --host-name stevi.azurewebsites.net         --origin-host-header stevi.azurewebsites.net         --http-port 80 --https-port 443

# 6) Routes (host-based)
az afd route create -g $RG --profile-name $PROFILE --afd-endpoint-name $ENDPOINT --name login-route \
  --origin-group login-og --https-redirect Enabled --forwarding-protocol MatchRequest \
  --supported-protocols Http Https --link-to-default-domain Disabled --patterns "/*" \
  --custom-domains login.iharc.ca

az afd route create -g $RG --profile-name $PROFILE --afd-endpoint-name $ENDPOINT --name client-route \
  --origin-group client-og --https-redirect Enabled --forwarding-protocol MatchRequest \
  --supported-protocols Http Https --link-to-default-domain Disabled --patterns "/*" \
  --custom-domains client.iharc.ca

az afd route create -g $RG --profile-name $PROFILE --afd-endpoint-name $ENDPOINT --name ops-route \
  --origin-group ops-og --https-redirect Enabled --forwarding-protocol MatchRequest \
  --supported-protocols Http Https --link-to-default-domain Disabled --patterns "/*" \
  --custom-domains ops.iharc.ca

# Optional: disable or remove the legacy default route after new ones are healthy
# az afd route delete -g $RG --profile-name $PROFILE --afd-endpoint-name $ENDPOINT --name default-route

# 7) DNS (Azure DNS zone already hosted in $RG)
az network dns record-set cname set-record -g $RG -z $ZONE -n login     -c $FD_HOST
az network dns record-set cname set-record -g $RG -z $ZONE -n client    -c $FD_HOST
az network dns record-set cname set-record -g $RG -z $ZONE -n ops -c $FD_HOST
# Optional: keep stevi.iharc.ca pointing to ops or 302-redirect it at the app level.

# 8) WAF hardening (policy IHARC)
az network front-door waf-policy managed-rules rule-set add -g $RG --policy-name IHARC \
  --type Microsoft_DefaultRuleSet --version 2.1
az network front-door waf-policy managed-rules rule-set add -g $RG --policy-name IHARC \
  --type BotManagerRuleSet --version 1.0
# After validation: az network front-door waf-policy update -g $RG -n IHARC --mode Prevention
```

## CI/CD notes
- Keep single build, deploy via matrix to three apps with publish-profile secrets:
  - `AZUREAPPSERVICE_PUBLISHPROFILE_LOGIN`
  - `AZUREAPPSERVICE_PUBLISHPROFILE_CLIENT`
  - `AZUREAPPSERVICE_PUBLISHPROFILE_WORKSPACE` (for `STEVI`/ops)
- Env-driven behavior via `SHELL`, `NEXT_PUBLIC_SITE_URL`, cookie domains, and `AUTH_TRUST_HOST`.

## Validation checklist
- FD custom domains show Managed TLS ready; origin health green for login/client/ops.
- Browsing each host serves the correct shell; wrong host rejected by middleware.
- Direct `*.azurewebsites.net` access is blocked after access restrictions.
- WAF rules applied and (after bake) in Prevention.
- DNS CNAMEs resolve to `iharc-hngcbedraxgtfggz.z03.azurefd.net`; HTTPS succeeds. 
