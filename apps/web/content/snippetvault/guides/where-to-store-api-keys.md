---
title: "Where to Store API Keys: The Right Place for Every Environment"
description: Find out where to store API keys for local development, CI/CD, production servers, browser apps, mobile apps, and team access.
category: Security
primaryKeyword: where to store api keys
searchIntent: Informational
publishedAt: "2026-07-29"
updatedAt: "2026-07-29"
readingTime: 9 min read
order: 2
---

Where to store API keys depends on who needs the key and where it is used. Store production API keys in a managed secret store, CI/CD keys in your pipeline's encrypted secret storage, and local development keys in an ignored local environment file or operating-system credential store. Never place a private API key in browser code, a mobile package, source control, documentation, chat history, or an ordinary snippet library.

That is the direct answer. The rest of this guide explains the correct location for each environment and the limits of common alternatives.

## Where should API keys be stored?

Use this environment-by-environment rule:

- **Local development:** ignored `.env.local` file, development secret tool, or operating-system credential store.
- **GitHub Actions and other CI/CD systems:** encrypted repository, organization, or environment secrets.
- **Production applications:** cloud secret manager, vault, platform secret store, or workload identity system.
- **Serverless functions:** the platform's encrypted secret configuration or an integrated secret manager.
- **Docker and Kubernetes workloads:** runtime secret injection backed by an encrypted, access-controlled store.
- **Browser applications:** private keys must stay on a backend; the browser calls your backend.
- **Mobile and desktop applications:** private keys must stay on a backend because packaged applications can be inspected.
- **Team sharing:** password or secret manager with individual access, not chat or shared documents.
- **Code examples and documentation:** placeholders only.

The safest location is not simply the place with encryption at rest. It is the system that controls access, delivers the key to the right consumer, supports rotation, and records enough information to respond when the key is exposed.

## Where to store API keys for local development

For a single local project, an ignored `.env.local` file is a common starting point:

```text
THIRD_PARTY_API_KEY=your-development-key
```

Add the file to `.gitignore` before inserting the real value. Commit an `.env.example` containing only variable names and placeholders so other developers know what the application expects.

An ignored file is still plaintext on disk. If the key has meaningful privileges, consider an operating-system credential store, a development secret manager, or a CLI that retrieves the value when needed. Use a dedicated development key with lower privileges and separate quotas from production.

Do not reuse a production key locally. Local machines run unreviewed tools, browser extensions, shell history, debugging proxies, and development dependencies that would never be allowed inside a production environment.

## Where to store API keys in GitHub Actions and CI/CD

Use the secret storage built into the CI/CD platform. In GitHub Actions, that may be an organization, repository, or environment secret. Environment-level secrets are useful when production deployment requires narrower access or approval.

Reference the secret through the workflow's secret mechanism instead of placing it directly in YAML:

```yaml
env:
  SERVICE_API_KEY: ${{ secrets.SERVICE_API_KEY }}
```

Give the workflow credential only the permissions its job requires. Avoid workflows that print the environment, enable shell tracing around secret use, or pass secrets to untrusted pull-request code.

When the cloud platform supports OpenID Connect or workload federation, prefer exchanging the workflow identity for short-lived credentials instead of storing a long-lived cloud key in the CI system.

## Where to store API keys in production

Production API keys belong in a system designed for secrets. Common categories include:

- Cloud secret managers
- Vault products
- Encrypted platform secret stores
- Managed workload identity and short-lived credential systems

The application should receive the credential at runtime through the platform's supported delivery mechanism. Developers should not need to copy the production value into a deployment file, support ticket, or local terminal.

Evaluate whether the system supports:

- Role-based access and individual identities
- Audit records
- Secret versions and rotation
- Revocation
- Runtime integration
- High availability
- Backup and disaster recovery

For keys that protect important data or infrastructure, these operational controls matter more than convenient copying.

## Where to store API keys for serverless functions

Use the serverless provider's encrypted secret configuration or connect the function to a managed secret store. Do not expose the key through variables that the framework marks as public or includes in the client bundle.

Check the framework's naming conventions carefully. Prefixes such as `NEXT_PUBLIC_`, `VITE_`, and similar client-exposed variable patterns are designed to make values available to browser code. A private API key must not use a public prefix.

Limit the function's access to only the secrets it needs. Separate production and preview environment values so an untrusted preview deployment cannot read production credentials.

## Where to store API keys in Docker and Kubernetes

Do not bake API keys into a container image. Images are copied to registries, cached on build machines, and reused across environments.

Inject secrets when the container starts. In Kubernetes, treat the built-in Secret object as part of a wider security design: enable encryption for the storage backend, restrict access with RBAC, and consider integrating an external secret manager when the workload requires stronger lifecycle controls.

Avoid sharing one mounted secret volume across unrelated workloads. Each service should receive only the values it needs.

## Where to store API keys for browser applications

You cannot securely hide a private API key in frontend JavaScript. Users can inspect network requests, downloaded bundles, source maps, runtime memory, and browser storage.

The usual design is:

1. The browser authenticates to your backend.
2. The backend authorizes the requested operation.
3. The backend calls the external API using the private key.
4. The backend returns only the permitted result.

If a provider gives you a key intended for public browser use, restrict it by domain, allowed API, quota, and every other supported control. Treat it as public after deployment.

## Where to store API keys for mobile and desktop applications

Mobile and desktop packages can be unpacked and inspected. Obfuscation may slow extraction, but it does not turn an embedded private key into a secret.

Keep privileged operations on a backend. If the app must communicate directly with a provider, use a user-specific authorization flow or short-lived token designed for an untrusted client.

Platform keychains and secure enclaves help protect user-specific tokens after authentication. They do not make a single application-wide API key safe to distribute to every installation.

## Where to store API keys for team access

If humans must retrieve a credential, use a password or secret management system with individual accounts, access revocation, and audit history. Avoid sending keys through email, chat, tickets, spreadsheets, or shared documents.

Prefer separate credentials for each developer or application when the provider supports them. Shared credentials make it harder to identify misuse and force everyone to rotate when one person's access changes.

## Is it okay to store API keys in .env files?

An `.env` file can be appropriate for local development when it is ignored by source control and contains a low-privilege development key. It is not automatically secure merely because the file is named `.env`.

Avoid using plaintext `.env` files as the long-term production source of truth. A secret manager can still inject a value into an environment variable at runtime—the important difference is where the value is controlled before injection.

## Places you should not store private API keys

Do not store private API keys in:

- Git repositories or commit history
- Frontend JavaScript bundles
- Mobile or desktop application packages
- Container images
- Public build variables
- Wiki pages and ordinary documents
- Email, chat, issue trackers, or support tickets
- Browser local storage
- Shell history
- Logs, analytics events, or URLs
- Generic code snippet libraries

If a key has already appeared in one of these places, assume it may have been copied. Revoke or rotate it instead of only deleting the visible occurrence.

## Where does a developer snippet manager fit?

A developer snippet manager can store reusable commands, key names, placeholder-based request templates, setup notes, source links, and explicitly non-sensitive sandbox references. It should help a developer recover context, not become the authority for production credentials.

SnippetVault is currently pre-release and is being designed around browser-side retrieval for individual developers. It is not a production secret manager and should not be presented as one.

For the wider lifecycle—restrictions, least privilege, rotation, monitoring, and incident response—read [API Key Security Best Practices: A Practical Checklist for Developers](/snippetvault/guides/api-key-security-best-practices).

## Frequently asked questions

### What is the safest place to store an API key?

For production, a managed secret store or identity system integrated with the running workload is generally the safest default. The correct choice must also support your access, audit, rotation, availability, and compliance requirements.

### Can I store API keys in a database?

A database can store encrypted values, but then your application needs a separate key that can decrypt them. You must still solve access control, key management, rotation, audit, and incident response. Use a managed secret store unless you have a clear reason and the security expertise to build those controls.

### Can I store API keys in a password manager?

A password manager can be appropriate when a human needs to retrieve a credential. It is usually not the best runtime delivery system for production workloads. Use individual access, least privilege, and audit features where available.

### Should API keys be stored in environment variables?

Environment variables are commonly used to deliver secrets to a process, but they are not the source-of-truth security system. Control the value in a secret store and avoid leaking it through process dumps, logs, debugging output, or client-side bundling.

### Where should I store API keys in a Chrome extension?

A Chrome extension is client-side software and users can inspect its package and runtime. Do not embed a shared private API key. Put privileged API calls behind a backend or use an authorization flow that issues user-specific, limited, revocable credentials.

## Sources and further reading

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Google Cloud: Best practices for managing API keys](https://docs.cloud.google.com/docs/authentication/api-keys-best-practices)
- [GitHub Actions: Using secrets in workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [GitHub Actions: Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)

> **The practical boundary:** store private API keys in the system that owns their access and lifecycle. Store only non-sensitive context and placeholders in ordinary developer tools.
