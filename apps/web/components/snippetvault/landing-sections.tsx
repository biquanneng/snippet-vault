// SPDX-License-Identifier: MPL-2.0

import { ArrowRight, Check, Github, ShieldAlert } from "lucide-react";
import Link from "next/link";
import {
  comparisonRows,
  currentFeatures,
  principles,
  useCases,
} from "@/lib/snippetvault/content";
import { BIQN_X_URL, SNIPPETVAULT_GITHUB_URL } from "@/lib/snippetvault/seo";
import { SnippetVaultContainer } from "./container";

export function ComparisonSection() {
  return (
    <section id="why" className="sv-reveal scroll-mt-24 border-b py-20 sm:py-28">
      <SnippetVaultContainer>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            The value is not saving a string. It is finding the right one again.
          </h2>
          <p className="mt-5 text-pretty text-lg leading-8 text-muted-foreground">
            Files and saved chats already solve useful jobs. SnippetVault is
            the missing layer between them: a personal, cross-project lookup
            surface that lives in your browser.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th scope="col" className="p-5 font-semibold text-foreground w-1/4">
                    Dimension
                  </th>
                  <th scope="col" className="p-5 font-semibold text-foreground w-1/4">
                    .env files
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                      Project-native
                    </span>
                  </th>
                  <th scope="col" className="p-5 font-semibold text-foreground w-1/4">
                    Saved chats
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                      Conversation-native
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="p-5 font-semibold text-foreground w-1/4 bg-brand/10 border-l border-r border-brand/20 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lime-900 dark:text-foreground">SnippetVault</span>
                      <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                        Current
                      </span>
                    </div>
                    <span className="block text-xs font-medium text-lime-800 dark:text-brand mt-0.5">
                      Implemented workflow
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="transition-colors hover:bg-muted/20">
                    <th scope="row" className="p-5 font-semibold text-foreground align-top">
                      {row.label}
                    </th>
                    <td className="p-5 text-muted-foreground align-top leading-6">
                      {row.env}
                    </td>
                    <td className="p-5 text-muted-foreground align-top leading-6">
                      {row.chats}
                    </td>
                    <td className="p-5 font-medium text-foreground align-top leading-6 bg-brand/[0.04] border-l border-r border-brand/20">
                      <div className="flex items-start gap-2">
                        <Check className="mt-1 size-4 shrink-0 text-lime-700 dark:text-brand" aria-hidden="true" />
                        <span>{row.snippetVault}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SnippetVaultContainer>
    </section>
  );
}

export function CurrentFlowSection() {
  return (
    <section
      id="workflow"
      className="sv-reveal scroll-mt-24 border-b bg-secondary py-20 sm:py-28"
    >
      <SnippetVaultContainer>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Capture. Context. Search. Reuse.
          </h2>
          <p className="mt-5 text-pretty text-base leading-7 text-muted-foreground">
            A deliberately narrow workflow for the small pieces of development
            context that are annoying to recover.
          </p>
        </div>

        <div className="mt-12 border-t">
          {currentFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="sv-card-reveal grid gap-4 border-b py-7 sm:grid-cols-12 sm:items-center"
              >
                <div className="flex items-center gap-3 sm:col-span-4">
                  <Icon className="size-5 text-lime-700 dark:text-brand" aria-hidden="true" />
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:col-span-7">
                  {feature.body}
                </p>
                <span className="text-sm font-medium text-lime-700 dark:text-brand sm:col-span-1 sm:text-right">
                  Current
                </span>
              </article>
            );
          })}
        </div>
      </SnippetVaultContainer>
    </section>
  );
}

export function UseCasesSection() {
  return (
    <section
      id="use-cases"
      className="sv-reveal scroll-mt-24 border-b py-20 sm:py-28"
    >
      <SnippetVaultContainer>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Built around the moments that break your flow.
          </h2>
          <p className="mt-5 text-pretty text-lg leading-8 text-muted-foreground">
            Built for individual developers moving between projects,
            environments, docs, dashboards, and debugging sessions.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {useCases.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <article
                key={useCase.title}
                className="sv-card-reveal sv-card rounded-xl border bg-card p-6"
              >
                <Icon
                  className="size-6 shrink-0 text-lime-700 dark:text-brand"
                  aria-hidden="true"
                />
                <h3 className="mt-4 font-semibold">{useCase.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {useCase.body}
                </p>
              </article>
            );
          })}
        </div>
      </SnippetVaultContainer>
    </section>
  );
}

export function TrustSection() {
  return (
    <section className="sv-reveal border-b bg-secondary py-20 sm:py-28">
      <SnippetVaultContainer>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Open source, local-first, and transparent by default.
          </h2>
          <p className="mt-5 text-pretty text-lg leading-8 text-muted-foreground">
            The current build keeps records and search data in readable local
            browser storage. It has no account or cloud sync, and its narrow
            optional analytics is disabled by default.
          </p>
        </div>

        <ul className="mx-auto mt-12 grid max-w-2xl gap-3 sm:grid-cols-2">
          {principles.map((principle) => (
            <li
              key={principle}
              className="sv-card-reveal sv-card flex items-center gap-3 rounded-lg border bg-background px-5 py-4 text-sm font-semibold"
            >
              <Check className="size-4 shrink-0 text-lime-700 dark:text-brand" aria-hidden="true" />
              {principle}
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-lg border border-border bg-background p-5 text-sm leading-6 text-muted-foreground">
          <ShieldAlert
            className="mt-0.5 size-5 shrink-0 text-lime-700 dark:text-brand"
            aria-hidden="true"
          />
          SnippetVault is not designed to replace enterprise secret management,
          access controls, audit logs, or team permissions.
        </div>
      </SnippetVaultContainer>
    </section>
  );
}

export function ClosingSection() {
  return (
    <section className="sv-reveal bg-primary py-20 text-primary-foreground sm:py-28">
      <SnippetVaultContainer>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-sm font-semibold text-brand">Open source</p>
            <h2 className="mt-4 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Star the repo. Shape the product.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/60">
              SnippetVault is built in the open. Follow development on GitHub
              and X for build notes, scope decisions, and the official Chrome
              Web Store release.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:justify-end">
            <Link
              href={SNIPPETVAULT_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="sv-btn group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              <Github className="size-4" aria-hidden="true" />
              Star on GitHub
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              href={BIQN_X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="sv-btn group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-primary-foreground/20 px-6 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              Follow on X
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </SnippetVaultContainer>
    </section>
  );
}
