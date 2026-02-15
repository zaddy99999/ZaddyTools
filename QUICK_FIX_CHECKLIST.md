# Quick Security Fix Checklist

## CRITICAL - Do First (24 hours)

### Credential Rotation
- [ ] Revoke Google service account key
- [ ] Regenerate Google service account
- [ ] Rotate all API keys (OpenSea, Groq, OpenAI, Replicate)
- [ ] Generate new ADMIN_KEY (min 32 chars, use: `openssl rand -base64 32`)
- [ ] Generate new CRON_SECRET (min 32 chars, use: `openssl rand -base64 32`)
- [ ] Update Vercel environment variables with new secrets
- [ ] Delete .env.local and .env.vercel from git history

### Quick Code Fixes
- [ ] Remove hardcoded `'zaddy-admin-2024'` fallback from `/src/app/api/admin/suggestions/route.ts`
- [ ] Remove client-side auth from `/src/app/admin/page.tsx` (localStorage check)
- [ ] Fix CRON validation in `/src/app/api/run/route.ts` (don't trust header alone)

---

## HIGH - Do This Week

### Add Rate Limiting
- [ ] Create `/src/lib/rateLimit.ts` with rate limiter
- [ ] Apply to `/api/suggest` - 10 requests/min
- [ ] Apply to `/api/tier-maker` - 10 requests/min
- [ ] Apply to `/api/admin/suggestions` - 30 requests/min
- [ ] Apply to `/api/run` (CRON) - 5 requests/min

### Add Input Validation
- [ ] Create `/src/lib/validation.ts` with validators
- [ ] Update `/api/admin/suggestions/route.ts` - validate URLs
- [ ] Update `/api/suggest/route.ts` - validate all inputs
- [ ] Update `/api/tier-maker/route.ts` - validate Twitter handles
- [ ] Add max length checks (projectName: 200 chars, notes: 5000 chars)

### Fix Authentication
- [ ] Replace `===` with `crypto.timingSafeEqual()` in auth checks
- [ ] Update CRON token validation to use timing-safe comparison
- [ ] Implement proper error handling for failed auth attempts

### Add CORS Headers
- [ ] Create or update `/src/middleware.ts` with CORS policy
- [ ] Define ALLOWED_ORIGINS list
- [ ] Test with OPTIONS requests

---

## MEDIUM - Do This Month

### Security Headers
- [ ] Update `/next.config.js` to add:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000`
  - `Referrer-Policy: strict-origin-when-cross-origin`

### Request Limits
- [ ] Add request body size limit (1MB) in middleware
- [ ] Verify all POST/PATCH endpoints respect limit
- [ ] Test with oversized payloads

### Logging & Monitoring
- [ ] Add console.log for failed auth attempts
- [ ] Log all admin operations with IP/timestamp
- [ ] Consider using Sentry or similar for error tracking

### Fetch Timeouts
- [ ] Create `fetchWithTimeout()` helper in `/src/lib/api.ts`
- [ ] Apply to all external API calls (5-10 second timeout)
- [ ] Test timeout handling

---

## LOW - Ongoing Maintenance

### Dependency Management
- [ ] Add `npm audit` to CI/CD
- [ ] Set up Snyk for continuous vulnerability scanning
- [ ] Review and update dependencies monthly
- [ ] Remove unused dependencies

### Code Quality
- [ ] Add ESLint security plugin
- [ ] Add pre-commit hooks for security checks
- [ ] Set up SonarQube or similar for code analysis

### Documentation
- [ ] Document authentication flow
- [ ] Create API security documentation
- [ ] Document rate limiting policies
- [ ] Create incident response plan

---

## Files to Modify

### CRITICAL
```
/src/app/api/admin/suggestions/route.ts  ← Remove hardcoded key
/src/app/admin/page.tsx                  ← Remove localStorage auth
/src/app/api/run/route.ts                ← Fix CRON auth
/src/lib/config.ts                       ← Fix cron validation
.env.local                               ← Rotate all secrets
.env.vercel                              ← Rotate all secrets
```

### HIGH
```
/src/app/api/tier-maker/route.ts         ← Add URL validation
/src/app/api/suggest/route.ts            ← Add input validation
/next.config.js                          ← Add security headers
/src/middleware.ts                       ← Add rate limiting + CORS
```

### CREATE NEW
```
/src/lib/validation.ts                   ← Input validation helpers
/src/lib/rateLimit.ts                    ← Rate limiting middleware
/src/lib/api.ts                          ← Fetch helpers
/.env.example                            ← Environment template
```

---

## Testing Checklist

### Unit Tests
- [ ] Test URL validation with valid/invalid inputs
- [ ] Test rate limiter with multiple requests
- [ ] Test timing-safe comparison with wrong passwords
- [ ] Test input sanitization

### Integration Tests
- [ ] Test admin endpoints with no credentials
- [ ] Test admin endpoints with wrong credentials
- [ ] Test admin endpoints with valid credentials
- [ ] Test rate limiting (send 100 requests, verify blocking)
- [ ] Test CORS with different origins

### Manual Testing
```bash
# Test authentication
curl -X GET http://localhost:3000/api/admin/suggestions \
  -H "x-admin-key: wrong-key"
# Should return 401

# Test URL validation
curl -X POST http://localhost:3000/api/suggest \
  -H "Content-Type: application/json" \
  -d '{"projectName":"Test","giphyUrl":"javascript:alert(1)","category":"web2"}'
# Should reject invalid URL

# Test rate limiting
for i in {1..100}; do curl http://localhost:3000/api/suggest; done
# Should see 429 errors after limit

# Test CORS
curl -H "Origin: http://attacker.com" -X OPTIONS http://localhost:3000/api/suggest
# Should NOT allow origin
```

---

## Deployment Checklist

### Before Deploying
- [ ] All critical fixes implemented
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing completed
- [ ] Code reviewed by another developer
- [ ] Security scan passing (npm audit, Snyk)

### Deployment Steps
1. [ ] Backup current production credentials
2. [ ] Update Vercel environment variables with new secrets
3. [ ] Deploy code changes to staging
4. [ ] Test on staging environment
5. [ ] Deploy to production
6. [ ] Verify all endpoints working
7. [ ] Monitor error logs for issues
8. [ ] Monitor API usage for anomalies

### Post-Deployment
- [ ] Verify rate limiting is working
- [ ] Verify authentication is required
- [ ] Verify security headers are present
- [ ] Monitor for suspicious activity
- [ ] Check error logs for issues

---

## Verification Commands

```bash
# Check node packages for vulnerabilities
npm audit
npm audit --json

# Check for hardcoded secrets
grep -r "zaddy-admin-2024" src/
grep -r "giphy-tracker-secret-2024" src/

# Verify no .env files in git
git ls-files | grep -E "\.env"

# Test security headers
curl -I https://zaddytools.vercel.app
# Should show X-Content-Type-Options, X-Frame-Options, etc.

# Test HTTPS redirect
curl -I http://zaddytools.vercel.app
# Should redirect to https://
```

---

## Security Headers Verification

Headers to verify (via curl or browser):
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY (or SAMEORIGIN)
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: (if applicable)
```

Browser tools to check:
- Firefox: Security tab in DevTools
- Chrome: Security tab in DevTools
- Online tools: https://securityheaders.com/

---

## Ongoing Security Tasks

### Weekly
- [ ] Review error logs for suspicious patterns
- [ ] Check for unusual API usage
- [ ] Verify rate limits working

### Monthly
- [ ] Run `npm audit` and update packages
- [ ] Review authentication logs
- [ ] Test backup/restore procedures
- [ ] Security awareness training

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Review and update security policies
- [ ] Dependency analysis

### Annually
- [ ] Professional penetration test
- [ ] Security certification renewal
- [ ] Architecture review
- [ ] Incident response drill

---

## Emergency Contacts

If you suspect a breach:
1. [ ] Stop all systems
2. [ ] Preserve logs
3. [ ] Document timeline
4. [ ] Notify affected users
5. [ ] Contact security team
6. [ ] Engage incident response

---

## Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Node.js Security: https://nodejs.org/en/docs/guides/security/
- Next.js Security: https://nextjs.org/docs/routing/protected-routes
- CWE Top 25: https://cwe.mitre.org/top25/
- Snyk: https://snyk.io/
- npm audit: https://docs.npmjs.com/cli/v8/commands/npm-audit

---

## Progress Tracking

```
CRITICAL (due: 24 hours)
[____] Rotate credentials
[____] Remove from git
[____] Fix hardcoded keys
[____] Update env vars

HIGH (due: 1 week)
[____] Add rate limiting
[____] Add input validation
[____] Fix auth timing
[____] Add CORS headers

MEDIUM (due: 1 month)
[____] Security headers
[____] Request limits
[____] Logging setup
[____] Fetch timeouts

LOW (due: ongoing)
[____] Dependency updates
[____] Code quality
[____] Documentation
[____] Monitoring
```

---

**Last Updated:** 2026-02-14
**Next Review:** 2026-05-14
**Status:** ACTIVE - Implementation in Progress
