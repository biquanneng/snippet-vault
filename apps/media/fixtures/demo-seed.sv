format: snippet-vault-export
formatVersion: 2
exportedAt: 2026-10-19T05:51:49.247Z
labels:
  - id: ak
    name: Access Key
    usageCount: 1
    createdAt: 2026-10-09T05:51:49.247Z
    updatedAt: 2026-10-19T05:51:49.247Z
  - id: sk
    name: Secret Key
    usageCount: 1
    createdAt: 2026-10-09T05:51:49.247Z
    updatedAt: 2026-10-19T05:51:49.247Z
  - id: api-key
    name: API Key
    usageCount: 1
    createdAt: 2026-10-09T05:51:49.247Z
    updatedAt: 2026-10-19T05:51:49.247Z
  - id: token
    name: Token
    usageCount: 2
    createdAt: 2026-10-09T05:51:49.247Z
    updatedAt: 2026-10-19T05:51:49.247Z
  - id: account-id
    name: Account ID
    usageCount: 0
    createdAt: 2026-10-09T05:51:49.247Z
    updatedAt: 2026-10-19T05:51:49.247Z
  - id: public-key
    name: Public Key
    usageCount: 0
    createdAt: 2026-10-09T05:51:49.247Z
    updatedAt: 2026-10-19T05:51:49.247Z
  - id: private-key
    name: Private Key
    usageCount: 0
    createdAt: 2026-10-09T05:51:49.247Z
    updatedAt: 2026-10-19T05:51:49.247Z
  - id: connection-string
    name: Connection String
    usageCount: 1
    createdAt: 2026-10-09T05:51:49.247Z
    updatedAt: 2026-10-19T05:51:49.247Z
items:
  - id: vault-aws-ak
    kind: vault
    labelIds:
      - ak
    pinned: true
    lastUsedAt: 2026-10-18T05:51:49.247Z
    source:
      title: AWS Security Credentials — IAM User Guide
      url: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
      domain: docs.aws.amazon.com
    createdAt: 2026-10-14T05:51:49.247Z
    updatedAt: 2026-10-17T05:51:49.247Z
    content: AKIAIOSFODNN7EXAMPLE
  - id: vault-aws-sk
    kind: vault
    labelIds:
      - sk
    pinned: false
    source:
      title: AWS Security Credentials — IAM User Guide
      url: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
      domain: docs.aws.amazon.com
    createdAt: 2026-10-14T05:51:49.247Z
    updatedAt: 2026-10-17T05:51:49.247Z
    content: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  - id: vault-github-pat
    kind: vault
    labelIds:
      - token
    pinned: true
    lastUsedAt: 2026-10-19T05:51:49.247Z
    source:
      title: Managing your personal access tokens — GitHub Docs
      url: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
      domain: docs.github.com
    createdAt: 2026-10-15T05:51:49.247Z
    updatedAt: 2026-10-18T05:51:49.247Z
    content: ghp_fakeTokenForDemoScreenshotOnly7xY9ZaBcDeFg
  - id: vault-postgres-conn
    kind: vault
    labelIds:
      - connection-string
    pinned: false
    source:
      title: Connecting to your database — Supabase Documentation
      url: https://supabase.com/docs/guides/database/connecting-to-postgres
      domain: supabase.com
    createdAt: 2026-10-16T05:51:49.247Z
    updatedAt: 2026-10-18T05:51:49.247Z
    content: postgresql://postgres:postgres_demo_pass@db.production.internal:5432/app_production?sslmode=require
  - id: vault-openai-api-key
    kind: vault
    labelIds:
      - api-key
    pinned: false
    source:
      title: API Keys — OpenAI Developer Platform
      url: https://platform.openai.com/api-keys
      domain: platform.openai.com
    createdAt: 2026-10-17T05:51:49.247Z
    updatedAt: 2026-10-18T05:51:49.247Z
    content: sk-proj-demoKeySnippetVaultScreenshotExampleOnly0000000000000000000
  - id: vault-tailwind-init
    kind: vault
    labelIds: []
    pinned: false
    source:
      title: Get started with Tailwind CSS v4 — Tailwind Docs
      url: https://tailwindcss.com/docs/installation
      domain: tailwindcss.com
    createdAt: 2026-10-18T05:51:49.247Z
    updatedAt: 2026-10-18T05:51:49.247Z
    content: pnpm add -D tailwindcss @tailwindcss/vite
  - id: workspace-staging-jwt
    kind: workspace
    labelIds:
      - token
    expiresAt: 2026-10-26T05:51:49.247Z
    source:
      title: Staging Auth Gateway — API Reference
      url: https://api.staging.example.com/v1/auth/token
      domain: api.staging.example.com
    createdAt: 2026-10-19T03:51:49.247Z
    updatedAt: 2026-10-19T03:51:49.247Z
    content: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRlbW8gVXNlciIsImlhdCI6MTc2MDg3NjgwMCwiZXhwIjoxNzYwOTYzMjAwfQ.demo_signature_for_test
  - id: workspace-ssh-tunnel
    kind: workspace
    labelIds: []
    expiresAt: 2026-10-22T05:51:49.247Z
    source:
      title: Bastion Host Access — Internal Runbooks
      url: https://wiki.example.internal/runbooks/database-tunnel
      domain: wiki.example.internal
    createdAt: 2026-10-19T01:51:49.247Z
    updatedAt: 2026-10-19T01:51:49.247Z
    content: ssh -N -L 5433:localhost:5432 -i ~/.ssh/staging_ed25519 deploy@bastion.staging.internal
  - id: workspace-debug-curl
    kind: workspace
    labelIds: []
    expiresAt: 2026-10-24T05:51:49.247Z
    source:
      title: Telemetry API — Staging Portal
      url: https://api.staging.example.com/docs
      domain: api.staging.example.com
    createdAt: 2026-10-18T23:51:49.247Z
    updatedAt: 2026-10-18T23:51:49.247Z
    content: "curl -s -X POST https://api.staging.example.com/v1/telemetry -H \"Content-Type: application/json\" -d '{\"debug\": true}'"
